import os
import math
import httpx
from fastapi import APIRouter
from app.schemas import RouteCalculateRequest, RouteCalculateResponse

router = APIRouter(prefix="/route", tags=["route"])

ORS_API_KEY = os.environ.get("ORS_API_KEY", "")
ORS_BASE = "https://api.openrouteservice.org"
DEFAULT_LOCATION = "Softwarepark 32a, 4232 Hagenberg"


async def geocode(address: str, api_key: str) -> tuple[float, float] | None:
    """Returns (lon, lat) for a given address string."""
    url = f"{ORS_BASE}/geocode/search"
    params = {
        "api_key": api_key,
        "text": address,
        "size": 1,
        "boundary.country": "AT",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(url, params=params)
            r.raise_for_status()
            features = r.json().get("features", [])
            if not features:
                # Retry without country boundary for international destinations
                params.pop("boundary.country")
                r = await client.get(url, params=params)
                r.raise_for_status()
                features = r.json().get("features", [])
            if features:
                coords = features[0]["geometry"]["coordinates"]
                return (coords[0], coords[1])
        except Exception:
            pass
    return None


@router.post("/calculate", response_model=RouteCalculateResponse)
async def calculate_route(body: RouteCalculateRequest):
    if not ORS_API_KEY:
        return RouteCalculateResponse(error="no_api_key")

    origin_coords = await geocode(body.origin, ORS_API_KEY)
    dest_coords = await geocode(body.destination, ORS_API_KEY)

    if not origin_coords or not dest_coords:
        return RouteCalculateResponse(error="geocode_failed")

    url = f"{ORS_BASE}/v2/directions/driving-car"
    payload = {
        "coordinates": [list(origin_coords), list(dest_coords)],
    }
    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()
            summary = data["routes"][0]["summary"]
            distance_km = round(summary["distance"] / 1000, 2)
            duration_min = math.ceil(summary["duration"] / 60)
            return RouteCalculateResponse(
                distance_km=distance_km,
                duration_min=duration_min,
            )
        except Exception as e:
            return RouteCalculateResponse(error=f"routing_failed: {str(e)[:80]}")
