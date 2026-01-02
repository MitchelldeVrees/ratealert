from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple

API_URL = "https://www.independer.nl/api/spaarrekening/zoekresultaat/getzoekresultaat?v=61"

DAYS_IN_YEAR = 365.0


# ----------------------------
# Domain model (offers + segments)
# ----------------------------
@dataclass(frozen=True)
class RateSegment:
    annual_rate: float              # 0.0275 for 2.75% p.a.
    days: Optional[int] = None      # None = infinite
    cap: Optional[float] = None     # None = no cap


@dataclass(frozen=True)
class Offer:
    name: str
    bank: str
    url: str
    guarantee_country: Optional[str]
    guarantee_amount: Optional[float]
    min_deposit: Optional[float]
    max_deposit: Optional[float]
    segments: List[RateSegment]
    compounding: str = "monthly"    # MVP assumption


# ----------------------------
# Helpers
# ----------------------------
def _fetch_json(url: str) -> dict:
    """
    Fetch JSON using requests if available, otherwise urllib.
    """
    try:
        import requests  # type: ignore
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        return resp.json()
    except ModuleNotFoundError:
        from urllib.request import urlopen, Request
        req = Request(url, headers={"User-Agent": "RateRadar-MVP/0.1"})
        with urlopen(req, timeout=20) as r:
            data = r.read().decode("utf-8")
        return json.loads(data)


def _monthly_boundaries(total_days: int) -> set[int]:
    # MVP approximation: 30-day months
    boundaries = set()
    d = 30
    while d <= total_days:
        boundaries.add(d)
        d += 30
    return boundaries


def simulate_interest(offer: Offer, principal: float, horizon_days: int) -> Dict[str, float]:
    if principal <= 0:
        raise ValueError("principal must be > 0")
    if horizon_days <= 0:
        raise ValueError("horizon_days must be > 0")
    if not offer.segments:
        raise ValueError(f"Offer '{offer.name}' has no segments")

    balance = principal
    seg_idx = 0
    seg_day_left = offer.segments[0].days

    month_boundaries = _monthly_boundaries(horizon_days) if offer.compounding in ("monthly", "none") else set()
    interest_bucket = 0.0  # used when we choose to not compound daily

    for day in range(1, horizon_days + 1):
        # Move to next segment if needed
        while seg_idx < len(offer.segments):
            seg = offer.segments[seg_idx]
            if seg_day_left is None:
                break
            if seg_day_left > 0:
                break
            seg_idx += 1
            if seg_idx < len(offer.segments):
                seg_day_left = offer.segments[seg_idx].days
            else:
                seg_day_left = None

        if seg_idx >= len(offer.segments):
            raise ValueError(f"Offer '{offer.name}' has no segment covering day {day}")

        seg = offer.segments[seg_idx]

        eligible = balance
        if seg.cap is not None:
            eligible = min(balance, seg.cap)

        daily_interest = eligible * (seg.annual_rate / DAYS_IN_YEAR)

        # MVP compounding model:
        # - "monthly": compound daily (simple, close enough for MVP)
        # - "none": keep in bucket, compound monthly (still no “score”)
        if offer.compounding == "monthly":
            balance += daily_interest
        else:
            interest_bucket += daily_interest
            if day in month_boundaries:
                balance += interest_bucket
                interest_bucket = 0.0

        if seg_day_left is not None:
            seg_day_left -= 1

    if offer.compounding != "monthly":
        balance += interest_bucket

    interest_earned = balance - principal
    eff_annual = (balance / principal) ** (DAYS_IN_YEAR / horizon_days) - 1.0

    return {
        "final_balance": balance,
        "interest_earned": interest_earned,
        "effective_annual_rate": eff_annual,
    }


def fmt_eur(x: float) -> str:
    return f"€{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_pct(x: float) -> str:
    return f"{x*100:.2f}%".replace(".", ",")


def parse_promo_months(text: str) -> Optional[int]:
    """
    Parse Dutch promo text like:
    '... alleen gedurende de eerste 3 maanden ...'
    '... gedurende de eerste 6 maanden ...'
    """
    if not text:
        return None
    t = " ".join(text.lower().split())
    m = re.search(r"eerste\s+(\d+)\s+maanden", t)
    if m:
        return int(m.group(1))
    m = re.search(r"gedurende\s+(\d+)\s+maanden", t)
    if m:
        return int(m.group(1))
    return None


def product_to_offer(p: dict) -> Optional[Offer]:
    # Basic filters: only items in search results and productType 1 (=spaarrekening in your sample)
    if not p.get("isInZoekresultaat", False):
        return None
    if p.get("productType") not in (1,):
        return None

    product_name = (p.get("productnaam") or "Spaarrekening").strip()
    bank = (p.get("maatschappij", {}).get("naam") or "Onbekend").strip()
    name = f"{bank} — {product_name}"

    url = (p.get("url") or "").strip()

    garantiestelsel = p.get("maatschappij", {}).get("garantiestelsel") or {}
    guarantee_country = garantiestelsel.get("afkorting")
    guarantee_amount = garantiestelsel.get("bedrag")

    min_deposit = p.get("minimumInleg")
    max_deposit = p.get("maximumInleg")

    # Rates come as percentages in the API (e.g. 2.75)
    rente_total_pct = p.get("rente")
    rente_opslaag_pct = p.get("renteOpslag") or 0.0

    if rente_total_pct is None:
        return None

    promo_months = parse_promo_months(p.get("bijzonderheden") or "")

    total_rate = float(rente_total_pct) / 100.0
    promo_bonus = float(rente_opslaag_pct) / 100.0

    # MVP assumption: base = total - opslag (if opslag>0)
    base_rate = total_rate
    promo_rate = None
    if promo_bonus > 0:
        base_rate = max(0.0, total_rate - promo_bonus)
        promo_rate = total_rate

    segments: List[RateSegment] = []

    # Cap: use max_deposit as a cap (account max). Not perfect, but safe.
    cap = float(max_deposit) if isinstance(max_deposit, (int, float)) and max_deposit is not None else None

    if promo_rate is not None and promo_months is not None:
        promo_days = int(promo_months * 30)  # MVP: 30-day months
        segments.append(RateSegment(annual_rate=promo_rate, days=promo_days, cap=cap))
        segments.append(RateSegment(annual_rate=base_rate, days=None, cap=cap))
    else:
        segments.append(RateSegment(annual_rate=total_rate, days=None, cap=cap))

    return Offer(
        name=name,
        bank=bank,
        url=url,
        guarantee_country=guarantee_country,
        guarantee_amount=float(guarantee_amount) if isinstance(guarantee_amount, (int, float)) else None,
        min_deposit=float(min_deposit) if isinstance(min_deposit, (int, float)) and min_deposit is not None else None,
        max_deposit=float(max_deposit) if isinstance(max_deposit, (int, float)) and max_deposit is not None else None,
        segments=segments,
        compounding="monthly",
    )


def rank_offers(offers: List[Offer], principal: float, horizon_days: int) -> List[Tuple[Offer, Dict[str, float]]]:
    rows: List[Tuple[Offer, Dict[str, float]]] = []
    for o in offers:
        r = simulate_interest(o, principal, horizon_days)
        rows.append((o, r))
    rows.sort(key=lambda x: x[1]["interest_earned"], reverse=True)
    return rows


# ----------------------------
# MVP CLI
# ----------------------------
if __name__ == "__main__":
    data = _fetch_json(API_URL)
    producten = data.get("producten", [])

    offers: List[Offer] = []
    for p in producten:
        o = product_to_offer(p)
        if o:
            offers.append(o)

    if not offers:
        raise SystemExit("No offers parsed from API response.")

    # ---- Configure your MVP run here ----
    principal = 100_000.0
    horizons = [
        ("3m", 90),
        ("6m", 180),
        ("12m", 365),
    ]
    top_n = 10

    print(f"\nRateRadar MVP — Independer feed")
    print(f"Offers parsed: {len(offers)}")
    print(f"Principal: {fmt_eur(principal)}")
    print("-" * 110)

    for label, days in horizons:
        ranked = rank_offers(offers, principal, days)[:top_n]
        print(f"\nTop {top_n} after {label} ({days} days):")
        for i, (o, r) in enumerate(ranked, 1):
            g = f"{o.guarantee_country or '-'} {fmt_eur(o.guarantee_amount) if o.guarantee_amount else ''}".strip()
            promo_info = ""
            if len(o.segments) >= 2 and o.segments[0].days is not None:
                promo_info = f" | promo {fmt_pct(o.segments[0].annual_rate)} for ~{int(o.segments[0].days/30)}m, then {fmt_pct(o.segments[1].annual_rate)}"
            else:
                promo_info = f" | rate {fmt_pct(o.segments[0].annual_rate)}"

            print(
                f"  {i:>2}. {o.name}\n"
                f"      interest: {fmt_eur(r['interest_earned'])} | final: {fmt_eur(r['final_balance'])} | eff annual: {fmt_pct(r['effective_annual_rate'])}\n"
                f"      guarantee: {g}{promo_info}\n"
                f"      url: {o.url or '-'}"
            )

    # Optional: dump normalized offers to JSON for later pipeline usage
    out = []
    for o in offers:
        out.append({
            "name": o.name,
            "bank": o.bank,
            "url": o.url,
            "guarantee_country": o.guarantee_country,
            "guarantee_amount": o.guarantee_amount,
            "min_deposit": o.min_deposit,
            "max_deposit": o.max_deposit,
            "segments": [
                {"annual_rate": s.annual_rate, "days": s.days, "cap": s.cap}
                for s in o.segments
            ],
        })
    with open("offers_normalized.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print("\nSaved: offers_normalized.json")
