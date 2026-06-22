from fastapi import Query, APIRouter
from typing import List

from models.city import (
    EnvForecastItem,
    EnvHotspot,
    EnvOverview,
    EnvRisk,
    EnvTrendPoint,
)
from services.environment_service import (
    get_env_forecast,
    get_env_hotspots,
    get_env_overview,
    get_env_risks,
    get_env_trends,
)

router = APIRouter(prefix="/environment", tags=["environment"])


@router.get("/overview", response_model=EnvOverview)
def env_overview(city: str = Query("Mumbai")):
    """
    City-wide environmental averages: AQI, temperature, humidity, CO₂, PM2.5,
    PM10, noise level, and AQI classification status.

    data_source = "simulated" | future: "openaq" | "cpcb" | "iqair"
    """
    return get_env_overview(city=city)


@router.get("/hotspots", response_model=List[EnvHotspot])
def env_hotspots(city: str = Query("Mumbai")):
    """
    Pollution hotspot detection.
    Returns sectors with AQI > 120, sorted by AQI descending.
    Each includes a composite risk score (0-100).
    """
    return get_env_hotspots(city=city)


@router.get("/trends", response_model=List[EnvTrendPoint])
def env_trends(city: str = Query("Mumbai")):
    """
    14-day historical environmental trend data.
    City-wide daily averages for AQI, temperature, humidity, and CO₂.
    """
    return get_env_trends(city=city)


@router.get("/risks", response_model=List[EnvRisk])
def env_risks(city: str = Query("Mumbai")):
    """
    Environmental risk detection.
    Rules: temperature > 35 → Heat Wave, aqi > 150 → AQI Spike,
           co2 > 500 → Carbon, noise_level > 80 → Noise, pm25 > 75 → PM2.5.
    Sorted: Critical → High → Medium → Low, then by value descending.
    """
    return get_env_risks(city=city)


@router.get("/forecast", response_model=List[EnvForecastItem])
def env_forecast(city: str = Query("Mumbai")):
    """
    AI-generated environmental forecasts and opportunities.
    Rule-based simulation anchored to current sector data.
    Each item includes type (Risk|Opportunity), horizon, and confidence score.
    Future: replace service logic with ML pipeline.
    """
    return get_env_forecast(city=city)
