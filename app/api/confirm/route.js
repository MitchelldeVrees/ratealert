import { NextResponse } from "next/server";
import { buildRankings, fetchOffers } from "../../../lib/ratealert";
import { signToken, verifyToken } from "../../../lib/optin";
import { renderWeeklyEmail } from "../../../lib/weeklyEmail";
import { getEmailDomain, hashEmail, makeTraceId } from "../../../lib/funnelLog";

const RESEND_COOKIE_TTL_MS = 1000 * 60 * 10;

function redirectWithStatus(request, status) {
  const url = new URL("/bevestigd", request.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
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
  const ts = new Date().toISOString();
  let traceId = makeTraceId();
  let emailDomain = "unknown";
  let emailHashPrefix = "";
  const logEvent = (event, extra = {}) => {
    console.log(
      JSON.stringify({
        event,
        traceId,
        emailDomain,
        emailHashPrefix,
        ts,
        ...extra,
      })
    );
  };

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    logEvent("confirm_start", { hasToken: false });
    logEvent("confirm_invalid_token", { reason: "missing" });
    logEvent("confirm_redirect_status", { status: "missing" });
    return redirectWithStatus(request, "missing");
  }

  const signingSecret = process.env.SIGNING_SECRET;
  if (!signingSecret) {
    logEvent("confirm_start", { hasToken: true });
    logEvent("confirm_redirect_status", { status: "error" });
    return redirectWithStatus(request, "error");
  }

  const payload = verifyToken(token, signingSecret);
  if (!payload || !payload.email) {
    logEvent("confirm_start", { hasToken: true });
    logEvent("confirm_invalid_token", { reason: "invalid" });
    logEvent("confirm_redirect_status", { status: "invalid" });
    return redirectWithStatus(request, "invalid");
  }

  traceId = payload.traceId || traceId;
  emailDomain = getEmailDomain(payload.email);
  emailHashPrefix = hashEmail(payload.email);
  logEvent("confirm_start", { hasToken: true });

  try {
    await addToAudience(payload.email);
  } catch (err) {
    logEvent("confirm_redirect_status", { status: "error" });
    return redirectWithStatus(request, "error");
  }
  logEvent("confirm_audience_ok");

  let offers;
  try {
    offers = await fetchOffers();
  } catch (err) {
    logEvent("confirm_redirect_status", { status: "error" });
    return redirectWithStatus(request, "error");
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
    logEvent("confirm_redirect_status", { status: "error" });
    return redirectWithStatus(request, "error");
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
    logEvent("confirm_welcome_sent");
  } catch (err) {
    logEvent("confirm_welcome_fail");
    logEvent("confirm_redirect_status", { status: "sent" });
    const res = redirectWithStatus(request, "sent");
    setConfirmCookie(res, payload.email, signingSecret);
    return res;
  }

  logEvent("confirm_redirect_status", { status: "sent" });
  const res = redirectWithStatus(request, "sent");
  setConfirmCookie(res, payload.email, signingSecret);
  return res;
}
