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
    const msg = String(data?.message || "Contact add failed");
    const normalized = msg.toLowerCase();
    if (normalized.includes("already") && normalized.includes("exist")) return;
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
    return NextResponse.redirect(new URL("/bevestigd?status=missing", request.url));
  }

  const signingSecret = process.env.SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.redirect(new URL("/bevestigd?status=error", request.url));
  }

  const payload = verifyToken(token, signingSecret);
  if (!payload || !payload.email) {
    return NextResponse.redirect(new URL("/bevestigd?status=invalid", request.url));
  }

  try {
    await addToAudience(payload.email);
  } catch (err) {
    return NextResponse.redirect(new URL("/bevestigd?status=error", request.url));
  }

  getAmsterdamWeekday();

  let offers;
  try {
    offers = await fetchOffers();
  } catch (err) {
    return NextResponse.redirect(new URL("/bevestigd?status=error", request.url));
  }

  const horizons = [90, 180, 365];
  const rankings = buildRankings(offers, 100000, horizons, 5);
  const checkedAt = new Date().toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  });
  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    return NextResponse.redirect(new URL("/bevestigd?status=error", request.url));
  }
  const unsubscribeToken = signToken(
    { email: payload.email, type: "unsubscribe", exp: Date.now() + 1000 * 60 * 60 * 24 * 30 },
    signingSecret
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
    return NextResponse.redirect(new URL("/bevestigd?status=error", request.url));
  }

  return NextResponse.redirect(new URL("/bevestigd?status=sent", request.url));
}
