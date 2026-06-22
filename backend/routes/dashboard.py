from fastapi import Query, APIRouter
from typing import List

from models.city import (
    Alert,
    CityMetrics,
    DashboardResponse,
    DashboardSummary,
    Insight,
)
from services.city_service import (
    compute_metrics,
    compute_summary,
    generate_alerts,
    generate_insights,
    load_sectors,
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(city: str = Query("Mumbai")):
    sectors = load_sectors(city=city)
    return DashboardResponse(city=city, sectors=sectors)


@router.get("/metrics", response_model=CityMetrics)
def get_metrics(city: str = Query("Mumbai")):
    sectors = load_sectors(city=city)
    return compute_metrics(sectors)


@router.get("/alerts", response_model=List[Alert])
def get_alerts(city: str = Query("Mumbai")):
    sectors = load_sectors(city=city)
    return generate_alerts(sectors)


@router.get("/insights", response_model=List[Insight])
def get_insights(city: str = Query("Mumbai")):
    sectors = load_sectors(city=city)
    metrics = compute_metrics(sectors)
    return generate_insights(sectors, metrics)


@router.get("/summary", response_model=DashboardSummary)
def get_summary(city: str = Query("Mumbai")):
    sectors = load_sectors(city=city)
    metrics = compute_metrics(sectors)
    alerts = generate_alerts(sectors)
    insights = generate_insights(sectors, metrics)
    return compute_summary(metrics, alerts, insights, city=city)
