import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, referral_link: "https://renteoverzicht.com/r/invite-demo" });
}
