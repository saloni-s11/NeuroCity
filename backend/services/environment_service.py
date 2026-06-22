"""
EnvironmentService
==================
All environmental intelligence logic computed from pollution_data.json.

Architecture is provider-agnostic:
  load_pollution_raw() is the only function that touches the data file.
  To plug in a real sensor network / OpenAQ / CPCB API, replace
  load_pollution_raw() and every downstream endpoint gets live data.
"""

import json
import math
import os
from datetime import datetime
from typing import List

from models.city import (
    EnvForecastItem,
    EnvHotspot,
    EnvOverview,
    EnvRisk,
    EnvTrendPoint,
    PollutionSector,
)

_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "pollution_data.json"
)

# ─── Provider abstraction ─────────────────────────────────────────────────────

from services.api_clients import get_openweather_pollution, get_openweather_weather, get_sector_coords

def load_pollution_raw(city: str = "Mumbai") -> dict:
    """
    Load base pollution data and augment with OpenWeather live data.
    """
    with open(_DATA_PATH, "r") as f:
        data = json.load(f)

    for sector in data.get("sectors", []):
        s_id = sector.get("sector_id")
        coords = get_sector_coords(city, s_id)
        if coords:
            # Pollution
            pol_data = get_openweather_pollution(coords["lat"], coords["lon"])
            if pol_data and "list" in pol_data and len(pol_data["list"]) > 0:
                components = pol_data["list"][0]["components"]
                index = pol_data["list"][0]["main"]["aqi"]
                sector["aqi"] = index * 40 + int(components.get("pm2_5", 0)) # rough approximation for 0-500 scale
                sector["pm25"] = components.get("pm2_5", sector["pm25"])
                sector["pm10"] = components.get("pm10", sector["pm10"])
                sector["no2"] = components.get("no2", sector["no2"])
                sector["so2"] = components.get("so2", sector["so2"])
                sector["o3"] = components.get("o3", sector["o3"])
            
            # Weather
            weather_data = get_openweather_weather(coords["lat"], coords["lon"])
            if weather_data and "main" in weather_data:
                sector["temperature"] = weather_data["main"].get("temp", sector["temperature"])
                sector["humidity"] = weather_data["main"].get("humidity", sector["humidity"])
            if weather_data and "wind" in weather_data:
                wind_ms = weather_data["wind"].get("speed", sector["wind_speed_kmh"] / 3.6)
                sector["wind_speed_kmh"] = round(wind_ms * 3.6, 1)

    return data


# ─── AQI Classification Engine ────────────────────────────────────────────────

def aqi_status(aqi: float) -> str:
    """Returns WHO/EPA AQI classification string."""
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for Sensitive Groups"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"


def _build_sector(raw: dict) -> PollutionSector:
    return PollutionSector(
        sector_id=raw["sector_id"],
        sector_name=raw["sector_name"],
        aqi=raw["aqi"],
        pm25=raw["pm25"],
        pm10=raw["pm10"],
        co2=raw["co2"],
        no2=raw["no2"],
        so2=raw["so2"],
        o3=raw["o3"],
        temperature=raw["temperature"],
        humidity=raw["humidity"],
        noise_level=raw["noise_level"],
        wind_speed_kmh=raw["wind_speed_kmh"],
        aqi_status=aqi_status(raw["aqi"]),
    )


def _avg(values: List[float]) -> float:
    return round(sum(values) / len(values), 1) if values else 0.0


# ─── GET /environment/overview ────────────────────────────────────────────────

def get_env_overview(city: str = "Mumbai") -> EnvOverview:
    raw     = load_pollution_raw(city)
    sectors = [_build_sector(s) for s in raw["sectors"]]
    n       = len(sectors)

    avg_aqi  = _avg([s.aqi         for s in sectors])
    avg_temp = _avg([s.temperature for s in sectors])
    avg_hum  = _avg([s.humidity    for s in sectors])
    avg_co2  = _avg([s.co2         for s in sectors])
    avg_pm25 = _avg([s.pm25        for s in sectors])
    avg_pm10 = _avg([s.pm10        for s in sectors])
    avg_noise= _avg([s.noise_level for s in sectors])

    return EnvOverview(
        aqi=avg_aqi,
        temperature=avg_temp,
        humidity=avg_hum,
        co2=avg_co2,
        pm25=avg_pm25,
        pm10=avg_pm10,
        noise_level=avg_noise,
        aqi_status=aqi_status(avg_aqi),
        data_source="openweather",
    )


# ─── GET /environment/hotspots ────────────────────────────────────────────────

_HOTSPOT_THRESHOLD = 120  # AQI above this = hotspot


def _risk_score(s: PollutionSector) -> float:
    """
    Composite 0-100 risk score weighing AQI, CO2, temperature, and noise.
    """
    aqi_w   = min(1.0, s.aqi        / 300.0) * 50.0
    co2_w   = min(1.0, s.co2        / 600.0) * 20.0
    temp_w  = min(1.0, max(0.0, (s.temperature - 25.0) / 20.0)) * 15.0
    noise_w = min(1.0, s.noise_level / 100.0) * 15.0
    return round(aqi_w + co2_w + temp_w + noise_w, 1)


def get_env_hotspots(city: str = "Mumbai") -> List[EnvHotspot]:
    raw     = load_pollution_raw(city)
    sectors = [_build_sector(s) for s in raw["sectors"]]

    hotspots = sorted(
        [s for s in sectors if s.aqi > _HOTSPOT_THRESHOLD],
        key=lambda s: s.aqi,
        reverse=True,
    )

    return [
        EnvHotspot(
            sector_id=s.sector_id,
            sector=s.sector_name,
            aqi=s.aqi,
            pm25=s.pm25,
            co2=s.co2,
            temperature=s.temperature,
            aqi_status=s.aqi_status,
            risk_score=_risk_score(s),
        )
        for s in hotspots
    ]


# ─── GET /environment/trends ─────────────────────────────────────────────────

def get_env_trends(city: str = "Mumbai") -> List[EnvTrendPoint]:
    raw = load_pollution_raw(city)
    return [
        EnvTrendPoint(
            day=d["day"],
            aqi=d["aqi"],
            temperature=d["temperature"],
            humidity=d["humidity"],
            co2=d["co2"],
        )
        for d in raw["historical_14d"]
    ]


# ─── GET /environment/risks ───────────────────────────────────────────────────

# Rule thresholds
_RULES = [
    ("Heat Wave",   "temperature", 35.0,  "Critical", "Heat Wave Risk"),
    ("AQI Spike",   "aqi",        150.0,  "High",     "AQI Spike Risk"),
    ("Carbon",      "co2",        500.0,  "High",     "Carbon Risk"),
    ("Noise",       "noise_level", 80.0,  "Medium",   "Noise Pollution Risk"),
    ("PM2.5",       "pm25",        75.0,  "High",     "PM2.5 Risk"),
]

_RISK_MESSAGES = {
    "Heat Wave":  lambda s, v: f"Temperature {v}°C in {s.sector_name}. Elder advisory and cooling-centre activation recommended.",
    "AQI Spike":  lambda s, v: f"AQI {v} in {s.sector_name} exceeds safe limit ({int(v)} > 150). Outdoor activity advisory recommended.",
    "Carbon":     lambda s, v: f"CO₂ {v} ppm in {s.sector_name} exceeds 500 ppm. Ventilation and green-buffer review advised.",
    "Noise":      lambda s, v: f"Noise level {v} dB in {s.sector_name}. Residential noise barrier review recommended.",
    "PM2.5":      lambda s, v: f"PM2.5 {v} µg/m³ in {s.sector_name}. Air-purifier deployment and mask advisory recommended.",
}


def get_env_risks(city: str = "Mumbai") -> List[EnvRisk]:
    raw     = load_pollution_raw(city)
    sectors = [_build_sector(s) for s in raw["sectors"]]
    risks: List[EnvRisk] = []

    for s in sectors:
        for (risk_type, field, threshold, severity, _label) in _RULES:
            value = getattr(s, field)
            if value > threshold:
                msg_fn = _RISK_MESSAGES.get(risk_type)
                message = msg_fn(s, value) if msg_fn else f"{risk_type} risk in {s.sector_name}."
                risks.append(EnvRisk(
                    type=risk_type,
                    severity=severity,
                    sector=s.sector_name,
                    message=message,
                    value=value,
                    threshold=threshold,
                ))

    # Sort: Critical first, then High, Medium, Low; then by value desc
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    risks.sort(key=lambda r: (severity_order.get(r.severity, 9), -r.value))
    return risks


# ─── GET /environment/forecast ────────────────────────────────────────────────

def get_env_forecast(city: str = "Mumbai") -> List[EnvForecastItem]:
    """
    Generates AI-style environmental forecasts from current sector data.
    Model: rule-based simulation anchored to current readings.
    Future: replace with ML pipeline / weather service integration.
    """
    raw      = load_pollution_raw(city)
    sectors  = [_build_sector(s) for s in raw["sectors"]]
    overview = get_env_overview(city)
    items: List[EnvForecastItem] = []

    # AQI forecast
    worst_aqi_sector = max(sectors, key=lambda s: s.aqi)
    if worst_aqi_sector.aqi > 130:
        projected = round(worst_aqi_sector.aqi * 1.12, 0)
        items.append(EnvForecastItem(
            title=f"PM2.5 spike projected in {worst_aqi_sector.sector_name}",
            description=(
                f"Current AQI of {worst_aqi_sector.aqi} in {worst_aqi_sector.sector_name} is trending upward. "
                f"Model projects AQI reaching {int(projected)} by tomorrow afternoon under current wind patterns. "
                f"Recommend issuing public advisory and activating sprinkler grid."
            ),
            confidence=min(95, 70 + int(worst_aqi_sector.aqi / 8)),
            tag="AQI",
            horizon="Next 24h",
            type="Risk",
        ))

    # Temperature forecast
    hottest = max(sectors, key=lambda s: s.temperature)
    if hottest.temperature >= 33:
        items.append(EnvForecastItem(
            title=f"Heat advisory for {hottest.sector_name} this week",
            description=(
                f"Temperature at {hottest.temperature}°C in {hottest.sector_name}. "
                f"Forecast models indicate a 38-40°C peak over the next 3 days "
                f"if anticyclonic conditions persist. Elder and outdoor-worker advisory advised."
            ),
            confidence=82,
            tag="Temperature",
            horizon="Next 3 days",
            type="Risk",
        ))

    # CO2 forecast
    high_co2 = [s for s in sectors if s.co2 > 450]
    if high_co2:
        top_co2 = max(high_co2, key=lambda s: s.co2)
        items.append(EnvForecastItem(
            title=f"Carbon concentration trend in {top_co2.sector_name}",
            description=(
                f"CO₂ at {top_co2.co2} ppm in {top_co2.sector_name} is above the 450 ppm warning level. "
                f"Industrial activity forecast to sustain or increase this over the next 7 days. "
                f"Green buffer expansion and vehicle emission controls recommended."
            ),
            confidence=78,
            tag="CO2",
            horizon="Next 7 days",
            type="Risk",
        ))

    # Opportunity — clean sectors
    clean_sectors = [s for s in sectors if s.aqi < 60]
    if clean_sectors:
        best = min(clean_sectors, key=lambda s: s.aqi)
        items.append(EnvForecastItem(
            title=f"Air quality improvement opportunity in {best.sector_name}",
            description=(
                f"{best.sector_name} is maintaining AQI {best.aqi} — well within the Good category. "
                f"Sustained wind speed of {best.wind_speed_kmh} km/h is dispersing pollutants effectively. "
                f"Recommend scheduling outdoor events and maintenance work in this window."
            ),
            confidence=88,
            tag="AQI",
            horizon="Next 24h",
            type="Opportunity",
        ))

    # Humidity / rain opportunity
    high_humidity = [s for s in sectors if s.humidity > 80]
    if high_humidity:
        items.append(EnvForecastItem(
            title="Rain event forecast — expected AQI improvement city-wide",
            description=(
                f"Average humidity at {overview.humidity}% with rising trend. "
                f"Precipitation event projected within 3 days will wash PM2.5 particulates. "
                f"City AQI forecast to drop 15-20% post-event."
            ),
            confidence=74,
            tag="Humidity",
            horizon="Next 3 days",
            type="Opportunity",
        ))

    # Noise risk
    noisy = [s for s in sectors if s.noise_level > 75]
    if noisy:
        worst_noise = max(noisy, key=lambda s: s.noise_level)
        items.append(EnvForecastItem(
            title=f"Sustained noise exposure risk in {worst_noise.sector_name}",
            description=(
                f"Noise level at {worst_noise.noise_level} dB in {worst_noise.sector_name}. "
                f"Prolonged exposure above 75 dB correlates with elevated cardiovascular risk. "
                f"Sound barrier installation and nighttime construction moratorium advised."
            ),
            confidence=80,
            tag="PM2.5",
            horizon="Next 7 days",
            type="Risk",
        ))

    return items
