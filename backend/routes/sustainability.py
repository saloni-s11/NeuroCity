from fastapi import Query, APIRouter
from typing import List

from models.city import (
    EnvironmentalMetrics,
    SustainabilityHealthScore,
    SustainabilityPerformance,
)
from services.sustainability_service import (
    get_environmental_metrics,
    get_health_score,
    get_sustainability_performance,
)

router = APIRouter(prefix="/sustainability", tags=["sustainability"])


@router.get("/health-score", response_model=SustainabilityHealthScore)
def sustainability_health_score(city: str = Query("Mumbai")):
    """
    City-wide health score with weighted composite scoring,
    per-sector breakdown, and letter grade.
    """
    return get_health_score(city=city)


@router.get("/environmental-metrics", response_model=EnvironmentalMetrics)
def sustainability_environmental_metrics(city: str = Query("Mumbai")):
    """
    Environmental metrics dashboard: renewable mix, carbon footprint,
    water efficiency, waste diversion, green cover, EV penetration.
    """
    return get_environmental_metrics(city=city)


@router.get("/performance", response_model=SustainabilityPerformance)
def sustainability_performance(city: str = Query("Mumbai")):
    """
    12-month sustainability performance tracking with pillar scores,
    peer city comparison, and AI narrative.
    """
    return get_sustainability_performance(city=city)
