import { NextResponse } from "next/server";
import { buildRankings, fetchOffers } from "../../../lib/ratealert";

function parseHorizons(raw) {
  if (!raw) return [90, 180, 365];
  const horizons = [];
  for (const token of raw.split(",")) {
    const t = token.trim();
    if (!t) continue;
    const val = Number.parseInt(t, 10);
    if (!Number.isFinite(val) || val <= 0) {
      throw new Error(`Invalid horizon '${t}'`);
    }
    horizons.push(val);
  }
  if (!horizons.length) throw new Error("No valid horizons provided");
  return horizons;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const principalRaw = searchParams.get("principal") ?? "100000";
  const horizonsRaw = searchParams.get("horizons");
  const topNRaw = searchParams.get("top_n") ?? "10";

  let principal;
  try {
    principal = Number(principalRaw);
    if (!Number.isFinite(principal) || principal <= 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "principal must be a positive number" }, { status: 400 });
  }

  let horizons;
  try {
    horizons = parseHorizons(horizonsRaw);
  } catch (err) {
    return NextResponse.json({ error: err.message || "invalid horizons" }, { status: 400 });
  }

  let topN;
  try {
    topN = Number.parseInt(topNRaw, 10);
    if (!Number.isFinite(topN) || topN <= 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "top_n must be a positive integer" }, { status: 400 });
  }

  let offers;
  try {
    offers = await fetchOffers();
  } catch (err) {
    return NextResponse.json(
      { error: "Upstream fetch failed", detail: err.message || String(err) },
      { status: 502 }
    );
  }

  if (!offers.length) {
    return NextResponse.json({ error: "No offers parsed from upstream response" }, { status: 502 });
  }

  const rankings = buildRankings(offers, principal, horizons, topN);

  return NextResponse.json({
    principal,
    horizons,
    top_n: topN,
    offers_parsed: offers.length,
    rankings,
    source: "independer",
  });
}
