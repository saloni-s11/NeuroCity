from fastapi import Query, APIRouter
from typing import List

from models.city import (
    InfraAsset,
    InfraForecastItem,
    InfraHotspot,
    InfraOverview,
    InfraRisk,
    InfraUtilities,
    MaintenanceItem,
)
from services.infrastructure_service import (
    get_infra_assets,
    get_infra_forecast,
    get_infra_hotspots,
    get_infra_maintenance,
    get_infra_overview,
    get_infra_risks,
    get_infra_utilities,
)

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])


@router.get("/overview", response_model=InfraOverview)
def infra_overview(city: str = Query("Mumbai")):
    """
    City-wide infrastructure summary: average health score, asset counts by
    status, maintenance task count, and predicted failures.
    """
    return get_infra_overview(city=city)


@router.get("/assets", response_model=List[InfraAsset])
def infra_assets(city: str = Query("Mumbai")):
    """
    Full asset list (25 assets) sorted Critical → Warning → Healthy.
    Covers Roads, Bridges, Power Grid, Water Network, Street Lights,
    Public Buildings, and Utilities.
    """
    return get_infra_assets(city=city)


@router.get("/hotspots", response_model=List[InfraHotspot])
def infra_hotspots(city: str = Query("Mumbai")):
    """
    Hotspot detection: assets with health_score < 70, sorted by health asc.
    Each includes a computed failure_risk_pct (0-100).
    """
    return get_infra_hotspots(city=city)


@router.get("/maintenance", response_model=List[MaintenanceItem])
def infra_maintenance(city: str = Query("Mumbai")):
    """
    Maintenance queue for all assets with health < 80.
    Priority rules: < 60 → Critical, 60-74 → High, 75-79 → Normal.
    ETA is auto-calculated based on priority and asset type.
    """
    return get_infra_maintenance(city=city)


@router.get("/utilities", response_model=InfraUtilities)
def infra_utilities(city: str = Query("Mumbai")):
    """
    Utility network metrics: Power Grid, Water Network, Street Lighting,
    Gas Network — load, utilization, outages, efficiency.
    """
    return get_infra_utilities(city=city)


@router.get("/risks", response_model=List[InfraRisk])
def infra_risks(city: str = Query("Mumbai")):
    """
    Infrastructure risk detection.
    Rules: health < 50 → Critical structural risk, health < 60 → High degradation,
    power load > 80 → High, water utilization > 95 → Critical.
    Sorted Critical → High.
    """
    return get_infra_risks(city=city)


@router.get("/forecast", response_model=List[InfraForecastItem])
def infra_forecast(city: str = Query("Mumbai")):
    """
    AI infrastructure forecasting: failure probability predictions for
    at-risk assets and utility network trend projections.
    """
    return get_infra_forecast(city=city)
