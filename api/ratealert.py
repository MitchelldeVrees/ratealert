from __future__ import annotations

import json
from typing import Any, Dict, List, Mapping, Union

from ratealert_core import build_rankings, fetch_offers

try:
    from werkzeug.wrappers import Response  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - fallback for local runs without werkzeug
    Response = None  # type: ignore


def _json_response(payload: Dict[str, Any], status: int = 200) -> Union[Dict[str, Any], Any]:
    body = json.dumps(payload, ensure_ascii=False)
    if Response:
        return Response(body, status=status, mimetype="application/json")
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": body,
    }


def _query_args(request: Any) -> Mapping[str, Any]:
    if hasattr(request, "args") and isinstance(request.args, Mapping):
        return request.args
    if hasattr(request, "query_params") and isinstance(request.query_params, Mapping):
        return request.query_params
    if hasattr(request, "query") and isinstance(request.query, Mapping):
        return request.query
    return {}


def _parse_horizons(raw: str | None) -> List[int]:
    if not raw:
        return [90, 180, 365]
    horizons: List[int] = []
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        try:
            val = int(token)
        except ValueError:
            raise ValueError(f"Invalid horizon '{token}'") from None
        if val <= 0:
            raise ValueError("Horizons must be positive integers (days)")
        horizons.append(val)
    if not horizons:
        raise ValueError("No valid horizons provided")
    return horizons


def handler(request: Any) -> Any:
    method = getattr(request, "method", "GET") or "GET"
    if method.upper() != "GET":
        return _json_response({"error": "Method not allowed"}, status=405)

    args = _query_args(request)

    # Inputs
    principal_raw = args.get("principal", 100_000)
    horizons_raw = args.get("horizons")
    top_n_raw = args.get("top_n", 10)

    try:
        principal = float(principal_raw)
        if principal <= 0:
            raise ValueError
    except Exception:
        return _json_response({"error": "principal must be a positive number"}, status=400)

    try:
        horizons = _parse_horizons(horizons_raw)
    except ValueError as exc:
        return _json_response({"error": str(exc)}, status=400)

    try:
        top_n = int(top_n_raw)
        if top_n <= 0:
            raise ValueError
    except Exception:
        return _json_response({"error": "top_n must be a positive integer"}, status=400)

    try:
        offers = fetch_offers()
    except Exception as exc:  # noqa: BLE001 - surface upstream errors to the client
        return _json_response({"error": "Upstream fetch failed", "detail": str(exc)}, status=502)

    if not offers:
        return _json_response({"error": "No offers parsed from upstream response"}, status=502)

    rankings = build_rankings(offers, principal, horizons, top_n)

    payload = {
        "principal": principal,
        "horizons": horizons,
        "top_n": top_n,
        "offers_parsed": len(offers),
        "rankings": rankings,
        "source": "independer",
    }
    return _json_response(payload)
