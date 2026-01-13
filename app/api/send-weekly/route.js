import { NextResponse } from "next/server";
import { buildRankings, fetchOffers } from "../../../lib/ratealert";
import { renderWeeklyEmail } from "../../../lib/weeklyEmail";
import { signToken } from "../../../lib/optin";

function requireAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function listContacts() {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    throw new Error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
  }
  const all = [];
  let after = null;
  let safety = 0;

  while (true) {
    const url =
      `https://api.resend.com/audiences/${audienceId}/contacts?limit=100` +
      (after ? `&after=${encodeURIComponent(after)}` : "");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Failed to list contacts");
    }
    const data = await res.json();
    const batch = Array.isArray(data?.data) ? data.data : [];
    all.push(...batch);

    const next =
      data?.next ||
      data?.after ||
      data?.cursor ||
      data?.pagination?.next ||
      data?.pagination?.after ||
      null;
    const hasMore = data?.has_more ?? data?.pagination?.has_more;

    if (!next || hasMore === false || batch.length === 0 || next === after) {
      break;
    }
    after = next;
    safety += 1;
    if (safety > 100) break;
  }

  return all;
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data?.message || "Email send failed");
    err.status = res.status;
    throw err;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request) {
  if (!requireAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let offers;
  try {
    offers = await fetchOffers();
  } catch (err) {
    return NextResponse.json({ error: "Upstream fetch failed", detail: err.message || String(err) }, { status: 502 });
  }

  const horizons = [90, 180, 365];
  const rankings = buildRankings(offers, 100000, horizons, 5);
  const checkedAt = new Date().toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  });
  const baseUrl = process.env.APP_BASE_URL;
  const secret = process.env.SIGNING_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let contacts;
  try {
    contacts = await listContacts();
  } catch (err) {
    return NextResponse.json({ error: err.message || "List failed" }, { status: 502 });
  }

  let sent = 0;
  const errors = [];
  const throttleMs = 1100;
  for (const contact of contacts) {
    try {
      const token = signToken(
        { email: contact.email, type: "unsubscribe", exp: Date.now() + 1000 * 60 * 60 * 24 * 30 },
        secret
      );
      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
      const html = renderWeeklyEmail({ rankings, checkedAt, unsubscribeUrl });
      try {
        await sendEmail({ to: contact.email, subject: "RenteOverzicht · Top 5 spaarrentes", html });
      } catch (err) {
        if (err.status === 429) {
          await sleep(throttleMs);
          await sendEmail({ to: contact.email, subject: "RenteOverzicht · Top 5 spaarrentes", html });
        } else {
          throw err;
        }
      }
      sent += 1;
      await sleep(throttleMs);
    } catch (err) {
      errors.push({ email: contact.email, error: err.message || String(err) });
      await sleep(throttleMs);
    }
  }

  return NextResponse.json({ ok: true, sent, errors });
}
