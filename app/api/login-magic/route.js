import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = (body.email || "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, message: "Magic link verstuurd (placeholder)" });
}
