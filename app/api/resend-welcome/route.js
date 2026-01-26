import { NextResponse } from "next/server";
import { buildRankings, fetchOffers } from "../../../lib/ratealert";
import { signToken, verifyToken } from "../../../lib/optin";
import { renderWeeklyEmail } from "../../../lib/weeklyEmail";

const RATE_LIMIT_MS = 60_000;
const RESEND_COOKIE_TTL_MS = 1000 * 60 * 10;

const memoryRateLimit = new Map();

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

function setConfirmCookie(res, email, secret) {
  const token = signToken({ email, type: "resend", exp: Date.now() + RESEND_COOKIE_TTL_MS }, secret);
  res.cookies.set("ro_confirm", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(RESEND_COOKIE_TTL_MS / 1000),
  });
}

export async function POST(request) {
  const signingSecret = process.env.SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const cookie = request.cookies.get("ro_confirm")?.value;
  if (!cookie) {
    return NextResponse.json(
      { error: "Resend link verlopen. Vraag opnieuw aan via inschrijven." },
      { status: 400 }
    );
  }

  const payload = verifyToken(cookie, signingSecret);
  if (!payload?.email || payload.type !== "resend") {
    return NextResponse.json(
      { error: "Resend link verlopen. Vraag opnieuw aan via inschrijven." },
      { status: 400 }
    );
  }

  const key = payload.email.toLowerCase();
  const now = Date.now();
  const last = memoryRateLimit.get(key) || 0;
  if (now - last < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "Even wachten... probeer over 1 minuut opnieuw." }, { status: 429 });
  }
  memoryRateLimit.set(key, now);

  let offers;
  try {
    offers = await fetchOffers();
  } catch (err) {
    return NextResponse.json(
      { error: "Tijdelijk probleem. Probeer het later opnieuw." },
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
  if (!baseUrl) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const unsubscribeToken = signToken(
    { email: payload.email, type: "unsubscribe", exp: Date.now() + 1000 * 60 * 60 * 24 * 30 },
    signingSecret
  );
  const unsubscribeUrl = `${cleanBaseUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const html = renderWeeklyEmail({ rankings, checkedAt, unsubscribeUrl });

  try {
    await sendEmail({
      to: payload.email,
      subject: "RenteOverzicht · Je eerste Top 5 spaarrentes",
      html,
    });
  } catch (err) {
    const res = NextResponse.json({
      ok: true,
      message: "Verzonden (kan een paar minuten duren). Check spam/promoties.",
    });
    setConfirmCookie(res, payload.email, signingSecret);
    return res;
  }

  const res = NextResponse.json({ ok: true, message: "Verzonden! Check ook spam/promoties." });
  setConfirmCookie(res, payload.email, signingSecret);
  return res;
}
