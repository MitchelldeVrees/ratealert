export const API_URL = "https://www.independer.nl/api/spaarrekening/zoekresultaat/getzoekresultaat?v=61";
const DAYS_IN_YEAR = 365.0;

function parsePromoMonths(text) {
  if (!text) return null;
  const t = text.toLowerCase().split(/\s+/).join(" ");
  let m = t.match(/eerste\s+(\d+)\s+maanden/);
  if (m) return parseInt(m[1], 10);
  m = t.match(/gedurende\s+(\d+)\s+maanden/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function monthlyBoundaries(totalDays) {
  const boundaries = new Set();
  let d = 30;
  while (d <= totalDays) {
    boundaries.add(d);
    d += 30;
  }
  return boundaries;
}

function simulateInterest(offer, principal, horizonDays) {
  if (principal <= 0) throw new Error("principal must be > 0");
  if (horizonDays <= 0) throw new Error("horizon_days must be > 0");
  if (!offer.segments?.length) throw new Error(`Offer '${offer.name}' has no segments`);

  let balance = principal;
  let segIdx = 0;
  let segDayLeft = offer.segments[0].days;

  const monthBoundaries =
    offer.compounding === "monthly" || offer.compounding === "none"
      ? monthlyBoundaries(horizonDays)
      : new Set();
  let interestBucket = 0;

  for (let day = 1; day <= horizonDays; day++) {
    while (segIdx < offer.segments.length) {
      const seg = offer.segments[segIdx];
      if (segDayLeft === null || segDayLeft === undefined) break;
      if (segDayLeft > 0) break;
      segIdx += 1;
      if (segIdx < offer.segments.length) {
        segDayLeft = offer.segments[segIdx].days;
      } else {
        segDayLeft = null;
      }
    }

    if (segIdx >= offer.segments.length) {
      throw new Error(`Offer '${offer.name}' has no segment covering day ${day}`);
    }

    const seg = offer.segments[segIdx];
    const eligible = seg.cap !== null && seg.cap !== undefined ? Math.min(balance, seg.cap) : balance;
    const dailyInterest = eligible * (seg.annual_rate / DAYS_IN_YEAR);

    if (offer.compounding === "monthly") {
      balance += dailyInterest;
    } else {
      interestBucket += dailyInterest;
      if (monthBoundaries.has(day)) {
        balance += interestBucket;
        interestBucket = 0;
      }
    }

    if (segDayLeft !== null && segDayLeft !== undefined) {
      segDayLeft -= 1;
    }
  }

  if (offer.compounding !== "monthly") {
    balance += interestBucket;
  }

  const interestEarned = balance - principal;
  const effAnnual = Math.pow(balance / principal, DAYS_IN_YEAR / horizonDays) - 1;

  return {
    final_balance: balance,
    interest_earned: interestEarned,
    effective_annual_rate: effAnnual,
  };
}

function productToOffer(p) {
  if (!p?.isInZoekresultaat) return null;
  if (![1].includes(p.productType)) return null;

  const productName = (p.productnaam || "Spaarrekening").trim();
  const bank = (p.maatschappij?.naam || "Onbekend").trim();
  const name = `${bank} - ${productName}`;

  const url = (p.url || "").trim();
  const garantiestelsel = p.maatschappij?.garantiestelsel || {};
  const guaranteeCountry = garantiestelsel.afkorting || null;
  const guaranteeAmount = typeof garantiestelsel.bedrag === "number" ? garantiestelsel.bedrag : null;

  const minDeposit = typeof p.minimumInleg === "number" ? p.minimumInleg : null;
  const maxDeposit = typeof p.maximumInleg === "number" ? p.maximumInleg : null;

  const renteTotalPct = p.rente;
  const renteOpslagPct = p.renteOpslag || 0;
  if (renteTotalPct === null || renteTotalPct === undefined) return null;

  const promoMonths = parsePromoMonths(p.bijzonderheden || "");
  const totalRate = Number(renteTotalPct) / 100.0;
  const promoBonus = Number(renteOpslagPct) / 100.0;

  let baseRate = totalRate;
  let promoRate = null;
  if (promoBonus > 0) {
    baseRate = Math.max(0, totalRate - promoBonus);
    promoRate = totalRate;
  }

  const cap = typeof maxDeposit === "number" ? maxDeposit : null;
  const segments = [];
  if (promoRate !== null && promoMonths !== null) {
    const promoDays = promoMonths * 30; // MVP: 30-day months
    segments.push({ annual_rate: promoRate, days: promoDays, cap });
    segments.push({ annual_rate: baseRate, days: null, cap });
  } else {
    segments.push({ annual_rate: totalRate, days: null, cap });
  }

  return {
    name,
    bank,
    url,
    guarantee_country: guaranteeCountry,
    guarantee_amount: guaranteeAmount,
    min_deposit: minDeposit,
    max_deposit: maxDeposit,
    segments,
    compounding: "monthly",
  };
}

export async function fetchOffers(apiUrl = API_URL) {
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "RenteOverzicht/0.2" },
  });
  if (!res.ok) {
    throw new Error(`Upstream responded with ${res.status}`);
  }
  const data = await res.json();
  const producten = Array.isArray(data.producten) ? data.producten : [];
  const offers = [];
  for (const p of producten) {
    const o = productToOffer(p);
    if (o) offers.push(o);
  }
  return offers;
}

export function buildRankings(offers, principal, horizons, topN) {
  const rankings = {};
  for (const days of horizons) {
    const rows = offers.map((o) => {
      const r = simulateInterest(o, principal, days);
      return { offer: o, results: r };
    });
    rows.sort((a, b) => b.results.interest_earned - a.results.interest_earned);
    rankings[days] = rows.slice(0, topN).map((row, idx) => ({
      rank: idx + 1,
      offer: row.offer,
      results: row.results,
    }));
  }
  return rankings;
}

export function normalizeOffers(offers) {
  return offers.map((o) => ({
    name: o.name,
    bank: o.bank,
    url: o.url,
    guarantee_country: o.guarantee_country,
    guarantee_amount: o.guarantee_amount,
    min_deposit: o.min_deposit,
    max_deposit: o.max_deposit,
    segments: o.segments.map((s) => ({
      annual_rate: s.annual_rate,
      days: s.days,
      cap: s.cap,
    })),
  }));
}

export default {
  API_URL,
  fetchOffers,
  buildRankings,
  normalizeOffers,
};
