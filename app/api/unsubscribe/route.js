import { NextResponse } from "next/server";
import { verifyToken } from "../../../lib/optin";

async function findContactByEmail(email) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    throw new Error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
  }
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Failed to lookup contact");
  }
  const data = await res.json().catch(() => ({}));
  const contacts = Array.isArray(data?.data) ? data.data : [];
  const match = contacts.find((c) => String(c.email || "").toLowerCase() === email.toLowerCase());
  return match || null;
}

async function deleteContact(contactId) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    throw new Error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID");
  }
  const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts/${contactId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Failed to delete contact");
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
  if (!payload || payload.type !== "unsubscribe" || !payload.email) {
    return NextResponse.json({ error: "Ongeldige of verlopen token" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, email: payload.email });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = body.token;
  const reason = (body.reason || "").trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const secret = process.env.SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const payload = verifyToken(token, secret);
  if (!payload || payload.type !== "unsubscribe" || !payload.email) {
    return NextResponse.json({ error: "Ongeldige of verlopen token" }, { status: 400 });
  }

  let contact;
  try {
    contact = await findContactByEmail(payload.email);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Lookup failed" }, { status: 502 });
  }

  if (!contact) {
    return NextResponse.json({ ok: true, unsubscribed: false, message: "E-mailadres niet gevonden." });
  }

  try {
    await deleteContact(contact.id);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, unsubscribed: true, reason });
}
