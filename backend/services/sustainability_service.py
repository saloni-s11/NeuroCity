"""
SustainabilityService
=====================
Computes city health scores, environmental metrics, and sustainability
performance from existing sector and pollution data.

All derived — no new data files required.
"""

import json
import math
import os
from typing import List

from models.city import (
    EnvironmentalMetrics,
    MonthlyTrend,
    PeerCity,
    PillarScore,
    Sector,
    SectorHealthDetail,
    SustainabilityHealthScore,
    SustainabilityPerformance,
)

_CITY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "city_state.json")
_POLLUTION_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "pollution_data.json")


from services.city_service import load_sectors as _load_sectors
from services.environment_service import load_pollution_raw as _load_pollution


def _avg(vals: List[float]) -> float:
    return round(sum(vals) / len(vals), 1) if vals else 0.0


# ─── Health Score ─────────────────────────────────────────────────────────────

def _sector_health(s: Sector) -> SectorHealthDetail:
    """Compute per-sector health with weighted components."""
    traffic_score = round(max(0, 100 - s.traffic), 1)
    aqi_score = round(max(0, 100 - (s.aqi / 3.0)), 1)
    infra_score = round(s.infrastructure_health, 1)
    energy_score = round(max(0, 100 - (s.energy_usage / 1.2)), 1)

    health = round(
        infra_score * 0.30 + traffic_score * 0.25 + aqi_score * 0.25 + energy_score * 0.20,
        1,
    )
    health = min(100, max(0, health))

    if health >= 80:
        status = "Healthy"
    elif health >= 60:
        status = "Warning"
    else:
        status = "Critical"

    return SectorHealthDetail(
        sector_id=s.sector_id,
        sector_name=s.sector_name,
        health_score=health,
        traffic_score=traffic_score,
        aqi_score=aqi_score,
        infra_score=infra_score,
        energy_score=energy_score,
        status=status,
    )


def _grade(score: float) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"


def get_health_score(city: str = "Mumbai") -> SustainabilityHealthScore:
    sectors = _load_sectors(city)
    details = [_sector_health(s) for s in sectors]
    overall = round(_avg([d.health_score for d in details]), 1)

    components = {
        "infrastructure": round(_avg([d.infra_score for d in details]), 1),
        "traffic": round(_avg([d.traffic_score for d in details]), 1),
        "air_quality": round(_avg([d.aqi_score for d in details]), 1),
        "energy_efficiency": round(_avg([d.energy_score for d in details]), 1),
    }

    healthy = sum(1 for d in details if d.status == "Healthy")
    warning = sum(1 for d in details if d.status == "Warning")
    critical = sum(1 for d in details if d.status == "Critical")
    grade = _grade(overall)

    desc = (
        f"NeuroCity scores {overall}/100 ({grade} grade) with "
        f"{healthy} healthy, {warning} warning, and {critical} critical sectors. "
    )
    if overall >= 80:
        desc += "The city is operating at optimal sustainability levels."
    elif overall >= 65:
        desc += "Performance is acceptable but targeted interventions are recommended in lower-scoring sectors."
    else:
        desc += "Urgent attention required across multiple domains to prevent systemic degradation."

    return SustainabilityHealthScore(
        overall_score=overall,
        grade=grade,
        description=desc,
        sector_details=details,
        components=components,
    )


# ─── Environmental Metrics ────────────────────────────────────────────────────

def get_environmental_metrics(city: str = "Mumbai") -> EnvironmentalMetrics:
    sectors = _load_sectors(city)
    pollution = _load_pollution(city)
    poll_sectors = pollution["sectors"]

    n = len(sectors)
    avg_energy = _avg([s.energy_usage for s in sectors])
    avg_aqi = _avg([s.aqi for s in sectors])
    total_pop = sum(s.population for s in sectors)
    total_energy = sum(s.energy_usage for s in sectors)

    # Derive metrics from existing data
    # Renewable mix: inversely correlated with energy usage intensity
    renewable_mix = round(max(10, min(85, 100 - (avg_energy * 0.7))), 1)

    # Carbon footprint: derived from CO2 readings in pollution data
    avg_co2 = _avg([s["co2"] for s in poll_sectors])
    carbon_footprint = round(avg_co2 * total_pop / 1_000_000, 1)  # tonnes equivalent
    carbon_target = round(carbon_footprint * 0.7, 1)  # 30% reduction target

    # Water efficiency: derived from humidity + infrastructure health
    avg_humidity = _avg([s["humidity"] for s in poll_sectors])
    avg_infra = _avg([s.infrastructure_health for s in sectors])
    water_eff = round(min(95, avg_humidity * 0.6 + avg_infra * 0.35), 1)

    # Waste diversion: correlated with infrastructure health
    waste_div = round(min(90, avg_infra * 0.65 + 10), 1)

    # Green cover: inversely related to AQI (cleaner air = more green)
    green_cover = round(max(8, min(45, 50 - avg_aqi * 0.12)), 1)

    # EV penetration: inversely related to avg traffic congestion
    ev_pct = round(max(5, min(60, 65 - avg_energy * 0.35)), 1)

    energy_per_cap = round(total_energy / (total_pop / 1000), 2) if total_pop > 0 else 0

    # Sustainability index: composite
    sust_index = round(
        renewable_mix * 0.25 + (100 - avg_aqi / 3) * 0.20 +
        water_eff * 0.15 + waste_div * 0.15 + green_cover * 0.10 +
        ev_pct * 0.15,
        1,
    )

    return EnvironmentalMetrics(
        renewable_mix_pct=renewable_mix,
        carbon_footprint=carbon_footprint,
        carbon_target=carbon_target,
        water_efficiency_pct=water_eff,
        waste_diversion_pct=waste_div,
        green_cover_pct=green_cover,
        ev_penetration_pct=ev_pct,
        energy_per_capita=energy_per_cap,
        aqi_avg=avg_aqi,
        sustainability_index=sust_index,
    )


# ─── Performance Tracking ────────────────────────────────────────────────────

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def get_sustainability_performance(city: str = "Mumbai") -> SustainabilityPerformance:
    sectors = _load_sectors(city)
    details = [_sector_health(s) for s in sectors]
    overall = round(_avg([d.health_score for d in details]), 1)

    # Generate 12-month simulated trend anchored to current score
    trend_12m = []
    for i, month in enumerate(_MONTHS):
        t = i / 11.0
        # Slight upward trend with seasonal variation
        base = overall - 8 + t * 8
        env = round(base + math.sin(t * 3.14 * 2) * 3 + 2, 1)
        mob = round(base - 4 + math.sin(t * 3.14 * 2 + 1) * 4, 1)
        res = round(base + 1 + math.sin(t * 3.14 * 2 + 2) * 2.5, 1)
        inf = round(base + 6 + math.sin(t * 3.14 * 2 + 0.5) * 2, 1)
        sust = round((env + mob + res + inf) / 4, 1)
        trend_12m.append(MonthlyTrend(
            month=month,
            sustainability_score=sust,
            environmental=env,
            mobility=mob,
            resource_efficiency=res,
            infrastructure=inf,
        ))

    # Pillar scores
    avg_traffic_score = _avg([d.traffic_score for d in details])
    avg_aqi_score = _avg([d.aqi_score for d in details])
    avg_infra_score = _avg([d.infra_score for d in details])
    avg_energy_score = _avg([d.energy_score for d in details])

    pillars = [
        PillarScore(
            name="Environmental",
            score=round(avg_aqi_score * 0.6 + avg_energy_score * 0.4, 1),
            benchmark=78.0,
            delta=round(avg_aqi_score * 0.6 + avg_energy_score * 0.4 - 78, 1),
            trend="improving" if avg_aqi_score > 70 else "declining",
        ),
        PillarScore(
            name="Mobility",
            score=round(avg_traffic_score, 1),
            benchmark=75.0,
            delta=round(avg_traffic_score - 75, 1),
            trend="stable" if abs(avg_traffic_score - 75) < 5 else ("improving" if avg_traffic_score > 75 else "declining"),
        ),
        PillarScore(
            name="Resource Efficiency",
            score=round(avg_energy_score * 0.7 + avg_aqi_score * 0.3, 1),
            benchmark=72.0,
            delta=round(avg_energy_score * 0.7 + avg_aqi_score * 0.3 - 72, 1),
            trend="improving",
        ),
        PillarScore(
            name="Infrastructure",
            score=round(avg_infra_score, 1),
            benchmark=80.0,
            delta=round(avg_infra_score - 80, 1),
            trend="stable" if avg_infra_score >= 78 else "declining",
        ),
    ]

    # Peer comparison
    peers = [
        PeerCity(name="NeuroCity", score=overall, rank=3),
        PeerCity(name="Singapore", score=91.0, rank=1),
        PeerCity(name="Copenhagen", score=88.0, rank=2),
        PeerCity(name="Bengaluru", score=74.0, rank=4),
        PeerCity(name="Delhi", score=61.0, rank=5),
        PeerCity(name="Jakarta", score=58.0, rank=6),
    ]
    # Re-rank with actual NeuroCity score
    peers.sort(key=lambda p: p.score, reverse=True)
    for i, p in enumerate(peers):
        p.rank = i + 1

    narrative = (
        f"NeuroCity's sustainability performance stands at {overall}/100, "
        f"ranking #{next(p.rank for p in peers if p.name == 'NeuroCity')} among comparable megacities. "
        f"Infrastructure ({round(avg_infra_score, 0)}) is the strongest pillar, "
        f"while mobility ({round(avg_traffic_score, 0)}) presents the greatest opportunity for improvement. "
        f"Year-over-year trend shows {'positive' if overall > 72 else 'mixed'} momentum."
    )

    return SustainabilityPerformance(
        overall_score=overall,
        trend_12m=trend_12m,
        pillars=pillars,
        peer_comparison=peers,
        narrative=narrative,
    )
