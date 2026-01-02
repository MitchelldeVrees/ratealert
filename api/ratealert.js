const { fetchOffers, buildRankings } = require("../lib/ratealert");

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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const principalRaw = req.query.principal ?? "100000";
  const horizonsRaw = req.query.horizons;
  const topNRaw = req.query.top_n ?? "10";

  let principal;
  try {
    principal = Number(principalRaw);
    if (!Number.isFinite(principal) || principal <= 0) throw new Error();
  } catch {
    res.status(400).json({ error: "principal must be a positive number" });
    return;
  }

  let horizons;
  try {
    horizons = parseHorizons(horizonsRaw);
  } catch (err) {
    res.status(400).json({ error: err.message || "invalid horizons" });
    return;
  }

  let topN;
  try {
    topN = Number.parseInt(topNRaw, 10);
    if (!Number.isFinite(topN) || topN <= 0) throw new Error();
  } catch {
    res.status(400).json({ error: "top_n must be a positive integer" });
    return;
  }

  let offers;
  try {
    offers = await fetchOffers();
  } catch (err) {
    res.status(502).json({ error: "Upstream fetch failed", detail: err.message || String(err) });
    return;
  }

  if (!offers.length) {
    res.status(502).json({ error: "No offers parsed from upstream response" });
    return;
  }

  const rankings = buildRankings(offers, principal, horizons, topN);

  res.status(200).json({
    principal,
    horizons,
    top_n: topN,
    offers_parsed: offers.length,
    rankings,
    source: "independer",
  });
};
