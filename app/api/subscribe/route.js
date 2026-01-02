import { NextResponse } from "next/server";
import { signToken } from "../../../lib/optin";

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

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = (body.email || "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }

  const secret = process.env.SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const headers = request.headers;
  const proto = headers.get("x-forwarded-proto") || "http";
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const baseUrl = process.env.APP_BASE_URL || `${proto}://${host}`;

  const token = signToken({ email, exp: Date.now() + TOKEN_TTL_MS }, secret);
  const confirmUrl = `${baseUrl}/confirm?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>Bevestig je inschrijving voor RateRadar</h2>
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
    await sendEmail({ to: email, subject: "Bevestig je inschrijving — RateRadar", html });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Email send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "Check je inbox om te bevestigen.", double_opt_in: true });
}

export function GET() {
  return NextResponse.json({ ok: true, status: "alive" });
}
