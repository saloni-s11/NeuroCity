"""
city_registry.py
================
Deterministic per-city simulated data generator.
Each city gets seeded, randomised-but-stable metric variations
so every city feels distinct without needing separate JSON files.

Usage:
    from data.city_registry import get_city_seed, scale_for_city

Any service that reads a JSON file should pipe values through scale_for_city()
to produce realistic per-city variation.
"""

from typing import Dict

# City profiles: (population_scale, traffic_bias, aqi_bias, infra_bias, temp_bias)
# All biases are additive offsets applied to the base dataset values.
CITY_PROFILES: Dict[str, Dict] = {
    "Mumbai": {
        "display": "Mumbai",
        "population_scale": 1.00,
        "traffic_offset":   0,
        "aqi_offset":       0,
        "infra_offset":     0,
        "temp_offset":      0,
        "co2_offset":       0,
        "energy_offset":    0,
        "seed":             42,
    },
    "Delhi": {
        "display": "Delhi",
        "population_scale": 1.45,
        "traffic_offset":  +12,
        "aqi_offset":      +55,   # Delhi is significantly more polluted
        "infra_offset":    -6,
        "temp_offset":     +3,
        "co2_offset":      +48,
        "energy_offset":   +14,
        "seed":            17,
    },
    "Bengaluru": {
        "display": "Bengaluru",
        "population_scale": 0.92,
        "traffic_offset":  +18,   # notorious traffic
        "aqi_offset":      +8,
        "infra_offset":    +4,
        "temp_offset":     -4,
        "co2_offset":      +10,
        "energy_offset":   +8,
        "seed":            91,
    },
    "Hyderabad": {
        "display": "Hyderabad",
        "population_scale": 0.80,
        "traffic_offset":  +6,
        "aqi_offset":      +12,
        "infra_offset":    +3,
        "temp_offset":     +2,
        "co2_offset":      +5,
        "energy_offset":   +2,
        "seed":            53,
    },
    "Chennai": {
        "display": "Chennai",
        "population_scale": 0.74,
        "traffic_offset":  +5,
        "aqi_offset":      +5,
        "infra_offset":    +2,
        "temp_offset":     +4,   # hot and humid
        "co2_offset":      +8,
        "energy_offset":   +5,
        "seed":            29,
    },
    "Pune": {
        "display": "Pune",
        "population_scale": 0.60,
        "traffic_offset":  +8,
        "aqi_offset":      -10,
        "infra_offset":    +5,
        "temp_offset":     -2,
        "co2_offset":      -5,
        "energy_offset":   -8,
        "seed":            66,
    },
    "Ahmedabad": {
        "display": "Ahmedabad",
        "population_scale": 0.68,
        "traffic_offset":  -4,
        "aqi_offset":      +20,
        "infra_offset":    -3,
        "temp_offset":     +5,   # very hot summers
        "co2_offset":      +18,
        "energy_offset":   +10,
        "seed":            38,
    },
    "Kolkata": {
        "display": "Kolkata",
        "population_scale": 0.88,
        "traffic_offset":  +3,
        "aqi_offset":      +28,
        "infra_offset":    -10,  # older infrastructure
        "temp_offset":     +2,
        "co2_offset":      +22,
        "energy_offset":   -2,
        "seed":            77,
    },
}

SUPPORTED_CITIES = list(CITY_PROFILES.keys())


def get_profile(city: str) -> Dict:
    """Return profile for city, falling back to Mumbai if unknown."""
    return CITY_PROFILES.get(city, CITY_PROFILES["Mumbai"])


def scale_sector(sector: dict, city: str) -> dict:
    """
    Apply per-city offsets to a sector dict.
    Returns a new dict — does not mutate the original.
    """
    p = get_profile(city)
    s = dict(sector)

    def clamp(v: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, v))

    if "traffic" in s:
        s["traffic"] = clamp(s["traffic"] + p["traffic_offset"], 5, 99)
    if "aqi" in s:
        s["aqi"] = clamp(s["aqi"] + p["aqi_offset"], 10, 500)
    if "infrastructure_health" in s:
        s["infrastructure_health"] = clamp(s["infrastructure_health"] + p["infra_offset"], 10, 99)
    if "energy_usage" in s:
        s["energy_usage"] = clamp(s["energy_usage"] + p["energy_offset"], 5, 150)
    if "population" in s:
        s["population"] = int(s["population"] * p["population_scale"])
    if "temperature" in s:
        s["temperature"] = clamp(s["temperature"] + p["temp_offset"], 10, 50)
    if "co2" in s:
        s["co2"] = clamp(s["co2"] + p["co2_offset"], 300, 700)
    if "pm25" in s:
        aqi_ratio = (s["aqi"] / 100.0) if "aqi" in s else 1.0
        s["pm25"] = clamp(s["pm25"] * (1 + p["aqi_offset"] / 200), 5, 300)
    if "pm10" in s:
        s["pm10"] = clamp(s["pm10"] * (1 + p["aqi_offset"] / 200), 10, 400)
    if "noise_level" in s:
        s["noise_level"] = clamp(s["noise_level"] + p["traffic_offset"] * 0.3, 20, 100)

    return s


def scale_infra_asset(asset: dict, city: str) -> dict:
    """Apply per-city offsets to an infrastructure asset."""
    p = get_profile(city)
    a = dict(asset)
    offset = p["infra_offset"]
    hs = a.get("health_score", 80)
    new_hs = max(10, min(99, hs + offset))
    a["health_score"] = new_hs

    # Re-derive status from new health score
    if new_hs >= 75:
        a["status"] = "Healthy"
        a["risk_level"] = "Low"
    elif new_hs >= 60:
        a["status"] = "Warning"
        a["risk_level"] = "Medium" if new_hs >= 67 else "High"
    else:
        a["status"] = "Critical"
        a["risk_level"] = "High"

    return a


def scale_historical(point: dict, city: str) -> dict:
    """Apply per-city offsets to a historical trend data point."""
    p = get_profile(city)
    pt = dict(point)
    if "aqi" in pt:
        pt["aqi"] = max(10, min(500, pt["aqi"] + p["aqi_offset"]))
    if "temperature" in pt:
        pt["temperature"] = max(10, min(50, pt["temperature"] + p["temp_offset"]))
    if "co2" in pt:
        pt["co2"] = max(300, min(700, pt["co2"] + p["co2_offset"]))
    return pt


def scale_traffic_corridor(corridor: dict, city: str) -> dict:
    """Apply per-city offsets to a traffic corridor."""
    p = get_profile(city)
    c = dict(corridor)
    offset = p["traffic_offset"]
    speed_factor = max(0.4, 1 - offset / 100)
    c["current_speed_kmh"] = max(5, round(c["current_speed_kmh"] * speed_factor, 1))
    vol_factor = 1 + offset / 150
    c["volume"] = min(c["capacity"], int(c["volume"] * vol_factor))
    if offset > 10:
        c["incidents"] = min(c["incidents"] + 2, 8)
    return c
