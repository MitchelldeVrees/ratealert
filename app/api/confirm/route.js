import { NextResponse } from "next/server";
import { buildRankings, fetchOffers } from "../../../lib/ratealert";
import { signToken, verifyToken } from "../../../lib/optin";
import { renderWeeklyEmail } from "../../../lib/weeklyEmail";

async function addToAudience(email) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    throw new Error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
  }
  const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data?.message || "Contact add failed";
    if (msg.includes("already exists")) return;
    throw new Error(msg);
  }
}

function getAmsterdamWeekday() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Europe/Amsterdam" })
    .format(new Date())
    .toLowerCase();
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const secret = process.env.SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const payload = verifyToken(token, secret);
  if (!payload || !payload.email) {
    return NextResponse.json({ error: "Ongeldige of verlopen token" }, { status: 400 });
  }

  try {
    await addToAudience(payload.email);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Confirm failed" }, { status: 502 });
  }

  const weekday = getAmsterdamWeekday();
  if (weekday === "friday") {
    return NextResponse.json({
      ok: true,
      email: payload.email,
      first_weekly_sent: false,
      next_send:
        "Het is vrijdag. Je eerste Top 5 ontvang je vanmiddag. Daarna elke vrijdag.",
    });
  }

  let offers;
  try {
    offers = await fetchOffers();
  } catch (err) {
    return NextResponse.json(
      { error: "Upstream fetch failed", detail: err.message || String(err) },
      { status: 502 }
    );
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
  const unsubscribeToken = signToken(
    { email: payload.email, type: "unsubscribe", exp: Date.now() + 1000 * 60 * 60 * 24 * 30 },
    secret
  );
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const html = renderWeeklyEmail({ rankings, checkedAt, unsubscribeUrl });

  try {
    await sendEmail({
      to: payload.email,
      subject: "RenteOverzicht · Je eerste Top 5 spaarrentes",
      html,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Email send failed" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    email: payload.email,
    first_weekly_sent: true,
    next_send: "We hebben je nu alvast een email gestuurd met de beste rente. Volgende keer ontvang je deze email elke vrijdag middag.",
  });
}
