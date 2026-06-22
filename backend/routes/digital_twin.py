from fastapi import Query, APIRouter
from typing import List

from models.city import (
    DashboardResponse,
    DigitalTwinMetrics,
    Prediction,
)
from services.city_service import (
    compute_digital_twin_metrics,
    compute_metrics,
    generate_alerts,
    generate_predictions,
    load_sectors,
)

router = APIRouter(prefix="/digital-twin", tags=["digital-twin"])


@router.get("", response_model=DashboardResponse)
def get_digital_twin(city: str = Query("Mumbai")):
    """Full sector list — same data as /dashboard but scoped to digital-twin consumers."""
    sectors = load_sectors(city=city)
    return DashboardResponse(city=city, sectors=sectors)


@router.get("/metrics", response_model=DigitalTwinMetrics)
def get_digital_twin_metrics(city: str = Query("Mumbai")):
    """
    City health, alert count, and sector counts by status.
    Powers the Digital Twin page header.
    """
    sectors = load_sectors(city=city)
    metrics = compute_metrics(sectors)
    alerts = generate_alerts(sectors)
    return compute_digital_twin_metrics(sectors, alerts, metrics)


@router.get("/predictions", response_model=List[Prediction])
def get_predictions(city: str = Query("Mumbai")):
    """
    AI-generated time-horizoned operational predictions.
    Distinct from /insights (executive) — these are action-oriented.
    """
    sectors = load_sectors(city=city)
    metrics = compute_metrics(sectors)
    return generate_predictions(sectors, metrics)
