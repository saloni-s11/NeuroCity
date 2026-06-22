from fastapi import APIRouter, Query

from models.city import (
    TrafficForecast,
    TrafficHotspot,
    TrafficKPIs,
    TrafficOverview,
    RouteRecommendation,
)
from services.traffic_service import (
    get_traffic_forecast,
    get_traffic_hotspots,
    get_traffic_kpis,
    get_traffic_overview,
    get_route_recommendations,
)
from typing import List

router = APIRouter(prefix="/traffic", tags=["traffic"])


@router.get("", response_model=TrafficOverview)
def traffic_overview(city: str = Query("Mumbai")):
    """
    Full traffic snapshot: corridors with computed congestion metrics,
    24-hour flow data, and weekly trend.

    data_source field signals the provider: "simulated" | "tomtom" | "here"
    """
    return get_traffic_overview(city=city)


@router.get("/kpis", response_model=TrafficKPIs)
def traffic_kpis(city: str = Query("Mumbai")):
    """
    City-wide traffic KPIs: average speed, congestion index, commute time,
    active incidents, corridor severity counts, and network efficiency.
    """
    return get_traffic_kpis(city=city)


@router.get("/hotspots", response_model=List[TrafficHotspot])
def traffic_hotspots(city: str = Query("Mumbai")):
    """
    Congestion hotspot detection.
    Returns all corridors with Moderate / Heavy / Severe congestion,
    sorted by congestion index descending.
    Each hotspot includes an AI-generated operational recommendation.
    """
    return get_traffic_hotspots(city=city)


@router.get("/routes", response_model=List[RouteRecommendation])
def traffic_routes(city: str = Query("Mumbai")):
    """
    Route recommendation system.
    Compares congested corridors against lighter alternatives and returns
    ranked recommendations sorted by time saving (highest first).
    """
    return get_route_recommendations(city=city)


@router.get("/forecast", response_model=TrafficForecast)
def traffic_forecast(
    hours: int = Query(default=12, ge=1, le=24,
                       description="Forecast horizon in hours (1–24)")
):
    """
    Traffic forecast for the next N hours.
    Uses a wave-pattern model anchored to historical hourly flow data.
    model field indicates the forecasting engine used.
    """
    return get_traffic_forecast(horizon_hours=hours)
