import { NextResponse } from "next/server";
import { signToken } from "../../../lib/optin";
import { getEmailDomain, hashEmail, makeTraceId } from "../../../lib/funnelLog";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

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

async function contactExists(email) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    throw new Error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
  }
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts?email=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  if (!res.ok) {
    console.error("Resend contact lookup failed", {
      status: res.status,
      emailDomain: getEmailDomain(email),
      emailHashPrefix: hashEmail(email),
    });
    return null;
  }
  const data = await res.json().catch(() => ({}));
  const contacts = Array.isArray(data?.data) ? data.data : [];
  return contacts.some((c) => String(c.email || "").toLowerCase() === email.toLowerCase());
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = (body.email || "").trim();
  const traceId = makeTraceId();
  const ts = new Date().toISOString();
  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const emailDomain = getEmailDomain(email);
  const emailHashPrefix = hashEmail(email);
  const logEvent = (event, extra = {}) => {
    console.log(
      JSON.stringify({
        event,
        traceId,
        emailDomain,
        emailHashPrefix,
        userAgent,
        referer,
        ts,
        ...extra,
      })
    );
  };

  logEvent("subscribe_start");

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    logEvent("subscribe_fail", { errorCode: "invalid_email" });
    return NextResponse.json({ error: "Ongeldig e-mailadres", code: "invalid_email", traceId }, { status: 400 });
  }

  const secret = process.env.SIGNING_SECRET;
  if (!secret) {
    logEvent("subscribe_fail", { errorCode: "server_misconfigured" });
    return NextResponse.json({ error: "Server misconfigured", code: "server_misconfigured", traceId }, { status: 500 });
  }

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    logEvent("subscribe_fail", { errorCode: "missing_app_base_url" });
    return NextResponse.json({ error: "APP_BASE_URL ontbreekt", code: "missing_app_base_url", traceId }, { status: 500 });
  }
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  try {
    const exists = await contactExists(email);
    if (exists) {
      logEvent("subscribe_already");
      return NextResponse.json({
        ok: true,
        message: "Dit e-mailadres staat al ingeschreven.",
        already_subscribed: true,
        traceId,
      });
    }
  } catch (err) {
    console.error("Resend contact lookup error", {
      emailDomain,
      emailHashPrefix,
      error: err?.message || String(err),
    });
    // If lookup fails, continue with the confirmation flow.
  }

  const token = signToken({ email, exp: Date.now() + TOKEN_TTL_MS, traceId }, secret);
  const confirmUrl = `${cleanBaseUrl}/confirm?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>Bevestig je inschrijving voor RenteOverzicht</h2>
      <p>Klik op de knop hieronder om je e-mailadres te bevestigen.</p>
      <p style="margin:20px 0">
        <a href="${confirmUrl}" style="background:#1F7AE0;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;display:inline-block">
          Bevestig mijn e-mail
        </a>
      </p>
      <p>Geen spam. 1x per week. Opzeggen met 1 klik.</p>
      <p style="font-size:12px;color:#64748b">Geen financieel advies. Alleen informatie en vergelijking.</p>
    </div>
  `;

  try {
    await sendEmail({ to: email, subject: "Bevestig je inschrijving â€” RenteOverzicht", html });
  } catch (err) {
    logEvent("subscribe_send_fail", { errorCode: "email_send_failed" });
    return NextResponse.json(
      { error: err.message || "Email send failed", code: "email_send_failed", traceId },
      { status: 502 }
    );
  }

  logEvent("subscribe_confirm_sent");
  return NextResponse.json({
    ok: true,
    message: "Check je inbox (en spam/promoties) en klik op de bevestigingslink.",
    double_opt_in: true,
    traceId,
  });
}

export function GET() {
  return NextResponse.json({ ok: true, status: "alive" });
}
