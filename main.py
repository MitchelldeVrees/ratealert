from __future__ import annotations

import json
from typing import List, Tuple

from ratealert_core import (
    build_rankings,
    fetch_offers,
    fmt_eur,
    fmt_pct,
    normalize_offers,
)


def main() -> None:
    offers = fetch_offers()
    if not offers:
        raise SystemExit("No offers parsed from API response.")

    # ---- Configure your MVP run here ----
    principal = 100_000.0
    horizons: List[Tuple[str, int]] = [
        ("3m", 90),
        ("6m", 180),
        ("12m", 365),
    ]
    top_n = 10

    print("\nRateRadar MVP - Independer feed")
    print(f"Offers parsed: {len(offers)}")
    print(f"Principal: {fmt_eur(principal)}")
    print("-" * 110)

    for label, days in horizons:
        ranked = build_rankings(offers, principal, [days], top_n)[days]
        print(f"\nTop {top_n} after {label} ({days} days):")
        for row in ranked:
            o = row["offer"]
            r = row["results"]
            promo_info = ""
            segments = o["segments"]
            if len(segments) >= 2 and segments[0]["days"] is not None:
                promo_info = (
                    f" | promo {fmt_pct(segments[0]['annual_rate'])} for ~{int(segments[0]['days']/30)}m, "
                    f"then {fmt_pct(segments[1]['annual_rate'])}"
                )
            else:
                promo_info = f" | rate {fmt_pct(segments[0]['annual_rate'])}"

            guarantee = f"{o['guarantee_country'] or '-'}"
            if o["guarantee_amount"]:
                guarantee += f" {fmt_eur(o['guarantee_amount'])}"

            print(
                f"  {row['rank']:>2}. {o['name']}\n"
                f"      interest: {fmt_eur(r['interest_earned'])} | final: {fmt_eur(r['final_balance'])} | eff annual: {fmt_pct(r['effective_annual_rate'])}\n"
                f"      guarantee: {guarantee}{promo_info}\n"
                f"      url: {o['url'] or '-'}"
            )

    # Optional: dump normalized offers to JSON for later pipeline usage
    normalized = normalize_offers(offers)
    with open("offers_normalized.json", "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)

    print("\nSaved: offers_normalized.json")


if __name__ == "__main__":
    main()
