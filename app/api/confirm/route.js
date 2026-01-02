import { NextResponse } from "next/server";
import { verifyToken } from "../../../lib/optin";

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

  return NextResponse.json({ ok: true, email: payload.email });
}
