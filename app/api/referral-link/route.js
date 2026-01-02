import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, referral_link: "https://rateradar.app/r/invite-demo" });
}
