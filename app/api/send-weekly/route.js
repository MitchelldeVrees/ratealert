import { NextResponse } from "next/server";
import { buildRankings, fetchOffers } from "../../../lib/ratealert";
import { renderWeeklyEmail } from "../../../lib/weeklyEmail";

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
  const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts?limit=100`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Failed to list contacts");
  }
  const data = await res.json();
  return Array.isArray(data?.data) ? data.data : [];
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
    throw new Error(data?.message || "Email send failed");
  }
}

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
  const html = renderWeeklyEmail({ rankings, checkedAt });

  let contacts;
  try {
    contacts = await listContacts();
  } catch (err) {
    return NextResponse.json({ error: err.message || "List failed" }, { status: 502 });
  }

  let sent = 0;
  const errors = [];
  for (const contact of contacts) {
    try {
      await sendEmail({ to: contact.email, subject: "RenteOverzicht · Top 5 spaarrentes", html });
      sent += 1;
    } catch (err) {
      errors.push({ email: contact.email, error: err.message || String(err) });
    }
  }

  return NextResponse.json({ ok: true, sent, errors });
}
