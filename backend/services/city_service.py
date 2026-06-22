"""
CityService: computes all derived metrics, alerts, AI insights, predictions,
and digital-twin metrics from the raw sector data in city_state.json.
"""

import json
import os
from typing import List

from models.city import (
    Alert,
    CityMetrics,
    DashboardSummary,
    DigitalTwinMetrics,
    Insight,
    Prediction,
    Sector,
)

# Resolve the data file path relative to this service file
_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "city_state.json")


import random

def load_sectors(city: str = "Mumbai") -> List[Sector]:
    with open(_DATA_PATH, "r") as f:
        raw = json.load(f)
    
    # Stable pseudo-random offset based on city name
    city_hash = hash(city) % 100
    random.seed(city_hash)
    
    sectors = []
    for s in raw:
        s_copy = dict(s)
        # Vary metrics by stable offset per city
        traffic_offset = random.randint(-15, 15)
        aqi_offset = random.randint(-30, 30)
        infra_offset = random.randint(-10, 10)
        energy_offset = random.uniform(-10.0, 10.0)
        
        s_copy["traffic"] = min(100.0, max(10.0, s_copy["traffic"] + traffic_offset))
        s_copy["aqi"] = min(300.0, max(20.0, s_copy["aqi"] + aqi_offset))
        s_copy["infrastructure_health"] = min(100.0, max(45.0, s_copy["infrastructure_health"] + infra_offset))
        s_copy["energy_usage"] = min(150.0, max(10.0, s_copy["energy_usage"] + energy_offset))
        
        sectors.append(Sector(**s_copy))
    return sectors


# ---------------------------------------------------------------------------
# Sector status helpers (shared by multiple functions)
# ---------------------------------------------------------------------------

def sector_health_score(s: Sector) -> float:
    """
    Returns a 0-100 health score for a single sector.
    Healthy >= 80, Warning 60-79, Critical < 60.
    """
    traffic_score = max(0.0, 100.0 - s.traffic)
    aqi_score = max(0.0, 100.0 - (s.aqi / 3.0))
    return round(s.infrastructure_health * 0.45 + traffic_score * 0.30 + aqi_score * 0.25, 1)


def sector_status_label(s: Sector) -> str:
    """Returns 'Healthy', 'Warning', or 'Critical' for a sector."""
    # Per spec: Traffic < 70, AQI < 100, Infra > 80 → Healthy
    #           Traffic 70-85, AQI 100-150, Infra 60-80 → Warning
    #           Traffic > 85, AQI > 150, Infra < 60 → Critical
    if s.traffic > 85 or s.aqi > 150 or s.infrastructure_health < 60:
        return "Critical"
    if s.traffic > 70 or s.aqi > 100 or s.infrastructure_health < 80:
        return "Warning"
    return "Healthy"


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def compute_metrics(sectors: List[Sector]) -> CityMetrics:
    n = len(sectors)
    if n == 0:
        return CityMetrics(
            avg_traffic=0,
            avg_aqi=0,
            total_population=0,
            avg_infrastructure_health=0,
            total_energy_usage=0,
            city_health_score=0,
            sustainability_score=0,
        )

    avg_traffic = round(sum(s.traffic for s in sectors) / n, 1)
    avg_aqi = round(sum(s.aqi for s in sectors) / n, 1)
    total_population = sum(s.population for s in sectors)
    avg_infra = round(sum(s.infrastructure_health for s in sectors) / n, 1)
    total_energy = round(sum(s.energy_usage for s in sectors), 1)

    traffic_score = max(0.0, 100.0 - avg_traffic)
    aqi_score = max(0.0, 100.0 - (avg_aqi / 3.0))
    city_health = round(avg_infra * 0.45 + traffic_score * 0.30 + aqi_score * 0.25, 1)
    city_health = min(100.0, max(0.0, city_health))

    energy_score = max(0.0, 100.0 - (total_energy / (n * 1.2)))
    sustainability = round(energy_score * 0.50 + aqi_score * 0.30 + avg_infra * 0.20, 1)
    sustainability = min(100.0, max(0.0, sustainability))

    return CityMetrics(
        avg_traffic=avg_traffic,
        avg_aqi=avg_aqi,
        total_population=total_population,
        avg_infrastructure_health=avg_infra,
        total_energy_usage=total_energy,
        city_health_score=city_health,
        sustainability_score=sustainability,
    )


# ---------------------------------------------------------------------------
# Alerts  (Traffic > 80, AQI > 150, Infra < 70)
# ---------------------------------------------------------------------------

TRAFFIC_THRESHOLD = 80
AQI_THRESHOLD = 150
INFRA_THRESHOLD = 70


def generate_alerts(sectors: List[Sector]) -> List[Alert]:
    alerts: List[Alert] = []

    for s in sectors:
        if s.traffic > TRAFFIC_THRESHOLD:
            severity = "Critical" if s.traffic > 90 else "High"
            alerts.append(Alert(
                sector_id=s.sector_id,
                sector=s.sector_name,
                type="Traffic",
                severity=severity,
                message=f"Traffic congestion detected in {s.sector_name} (index: {s.traffic})",
            ))

        if s.aqi > AQI_THRESHOLD:
            severity = "Critical" if s.aqi > 200 else "High"
            alerts.append(Alert(
                sector_id=s.sector_id,
                sector=s.sector_name,
                type="Pollution",
                severity=severity,
                message=f"Air quality hazardous in {s.sector_name} (AQI: {s.aqi})",
            ))

        if s.infrastructure_health < INFRA_THRESHOLD:
            severity = "Critical" if s.infrastructure_health < 50 else "Medium"
            alerts.append(Alert(
                sector_id=s.sector_id,
                sector=s.sector_name,
                type="Infrastructure",
                severity=severity,
                message=f"Infrastructure degradation in {s.sector_name} (health: {s.infrastructure_health}%)",
            ))

    return alerts


# ---------------------------------------------------------------------------
# AI Insights  (dashboard executive summaries)
# ---------------------------------------------------------------------------

def generate_insights(sectors: List[Sector], metrics: CityMetrics) -> List[Insight]:
    insights: List[Insight] = []

    high_traffic = sorted(
        [s for s in sectors if s.traffic > 70], key=lambda x: x.traffic, reverse=True
    )
    if high_traffic:
        top = high_traffic[0]
        confidence = min(99, 70 + int(top.traffic / 5))
        insights.append(Insight(
            title=f"Traffic congestion projected to rise in {top.sector_name}",
            description=(
                f"Current traffic index of {top.traffic} in {top.sector_name} is above the "
                f"critical threshold. Peak-hour patterns suggest further deterioration. "
                f"Consider activating alternate routing protocols."
            ),
            confidence=confidence,
            tag="Traffic",
        ))

    poor_aqi = sorted(
        [s for s in sectors if s.aqi > 100], key=lambda x: x.aqi, reverse=True
    )
    if poor_aqi:
        top = poor_aqi[0]
        confidence = min(99, 65 + int(top.aqi / 10))
        insights.append(Insight(
            title=f"Air quality deterioration expected in {top.sector_name}",
            description=(
                f"AQI reading of {top.aqi} µg/m³ in {top.sector_name} exceeds safe limits. "
                f"PM2.5 forecast to worsen through peak hours. "
                f"Recommend activating sprinkler grid and issuing public advisory."
            ),
            confidence=confidence,
            tag="Environment",
        ))

    weak_infra = sorted(
        [s for s in sectors if s.infrastructure_health < 80],
        key=lambda x: x.infrastructure_health,
    )
    if weak_infra:
        bottom = weak_infra[0]
        confidence = min(99, 75 + int((100 - bottom.infrastructure_health) / 4))
        insights.append(Insight(
            title=f"Infrastructure maintenance recommended in {bottom.sector_name}",
            description=(
                f"Infrastructure health score of {bottom.infrastructure_health}% in "
                f"{bottom.sector_name} is below the maintenance threshold. "
                f"Preventive inspection and repair scheduling advised to avoid service disruption."
            ),
            confidence=confidence,
            tag="Infrastructure",
        ))

    high_energy = sorted(
        [s for s in sectors if s.energy_usage > 75], key=lambda x: x.energy_usage, reverse=True
    )
    if high_energy:
        top = high_energy[0]
        insights.append(Insight(
            title=f"Peak energy demand detected in {top.sector_name}",
            description=(
                f"Energy usage at {top.energy_usage} units in {top.sector_name} is approaching "
                f"grid capacity. Pre-cooling substations and demand-side load balancing "
                f"recommended before the next temperature peak."
            ),
            confidence=78,
            tag="Energy",
        ))

    if metrics.city_health_score < 75:
        insights.append(Insight(
            title="City health below optimal threshold — intervention required",
            description=(
                f"Overall city health score of {metrics.city_health_score}/100 indicates "
                f"systemic stress across multiple sectors. A coordinated response across "
                f"traffic, environment, and infrastructure teams is recommended."
            ),
            confidence=85,
            tag="City Health",
        ))

    return insights


# ---------------------------------------------------------------------------
# AI Predictions  (Digital Twin — operational, time-horizoned)
# ---------------------------------------------------------------------------

def generate_predictions(sectors: List[Sector], metrics: CityMetrics) -> List[Prediction]:
    predictions: List[Prediction] = []

    # Traffic predictions
    high_traffic = sorted(
        [s for s in sectors if s.traffic > 65], key=lambda x: x.traffic, reverse=True
    )
    if high_traffic:
        top = high_traffic[0]
        pct_increase = round(((top.traffic - 65) / 65) * 100 + 8, 0)
        confidence = min(97, 72 + int(top.traffic / 6))
        predictions.append(Prediction(
            title=f"Congestion likely to increase {int(pct_increase)}% in {top.sector_name}",
            description=(
                f"Traffic index currently at {top.traffic} in {top.sector_name}. "
                f"Historical evening-peak patterns and current density suggest a "
                f"{int(pct_increase)}% increase during the 17:00–19:30 window. "
                f"Pre-emptive signal timing adjustment advised."
            ),
            confidence=confidence,
            tag="Traffic",
            horizon="Next 2h",
        ))

    if len(high_traffic) > 1:
        second = high_traffic[1]
        predictions.append(Prediction(
            title=f"Secondary congestion spillover risk in {second.sector_name}",
            description=(
                f"If primary congestion in {high_traffic[0].sector_name} is not mitigated, "
                f"overflow traffic is projected to increase load in {second.sector_name} "
                f"by approximately 12% over the next 3 hours."
            ),
            confidence=74,
            tag="Traffic",
            horizon="Next 3h",
        ))

    # AQI / pollution predictions
    poor_aqi = sorted(
        [s for s in sectors if s.aqi > 100], key=lambda x: x.aqi, reverse=True
    )
    if poor_aqi:
        top = poor_aqi[0]
        confidence = min(96, 68 + int(top.aqi / 12))
        predictions.append(Prediction(
            title=f"AQI expected to worsen in {top.sector_name} tomorrow",
            description=(
                f"Current AQI of {top.aqi} in {top.sector_name} combined with forecast wind "
                f"patterns suggests PM2.5 concentration will rise 18–25% by tomorrow morning. "
                f"Issuing early advisory and activating water sprinkler grid recommended."
            ),
            confidence=confidence,
            tag="Environment",
            horizon="Tomorrow",
        ))

    # Infrastructure predictions
    weak_infra = sorted(
        [s for s in sectors if s.infrastructure_health < 75],
        key=lambda x: x.infrastructure_health,
    )
    if weak_infra:
        bottom = weak_infra[0]
        confidence = min(95, 76 + int((100 - bottom.infrastructure_health) / 5))
        predictions.append(Prediction(
            title=f"Infrastructure maintenance window required in {bottom.sector_name}",
            description=(
                f"Infrastructure health at {bottom.infrastructure_health}% in {bottom.sector_name}. "
                f"Predictive model indicates a 67% probability of service disruption within "
                f"7 days without preventive maintenance. Schedule inspection this week."
            ),
            confidence=confidence,
            tag="Infrastructure",
            horizon="This week",
        ))

    # Energy predictions
    high_energy = sorted(
        [s for s in sectors if s.energy_usage > 70], key=lambda x: x.energy_usage, reverse=True
    )
    if high_energy:
        top = high_energy[0]
        predictions.append(Prediction(
            title=f"Grid stress event probable in {top.sector_name}",
            description=(
                f"Energy usage at {top.energy_usage} units approaching distribution limit. "
                f"With forecast temperature rise, demand is projected to increase 8–11%. "
                f"Pre-cooling substations and activating demand-response protocols advised."
            ),
            confidence=81,
            tag="Energy",
            horizon="Next 6h",
        ))

    # City-wide summary prediction
    if metrics.city_health_score < 70:
        predictions.append(Prediction(
            title="Multi-sector stress event forecast — coordinated response needed",
            description=(
                f"City health at {metrics.city_health_score}/100 with concurrent traffic, "
                f"pollution, and infrastructure pressures. Simulation models indicate a "
                f"cascading risk if no intervention is applied within 24 hours."
            ),
            confidence=88,
            tag="City Health",
            horizon="Next 24h",
        ))

    return predictions


# ---------------------------------------------------------------------------
# Digital Twin Metrics
# ---------------------------------------------------------------------------

def compute_digital_twin_metrics(
    sectors: List[Sector],
    alerts: List[Alert],
    metrics: CityMetrics,
) -> DigitalTwinMetrics:
    statuses = [sector_status_label(s) for s in sectors]
    healthy = statuses.count("Healthy")
    warning = statuses.count("Warning")
    critical = statuses.count("Critical")

    return DigitalTwinMetrics(
        city_health=metrics.city_health_score,
        active_alerts=len(alerts),
        healthy_sectors=healthy,
        warning_sectors=warning,
        critical_sectors=critical,
        total_sectors=len(sectors),
    )


# ---------------------------------------------------------------------------
# Dashboard Summary
# ---------------------------------------------------------------------------

def compute_summary(
    metrics: CityMetrics,
    alerts: List[Alert],
    insights: List[Insight],
    city: str = "Mumbai",
) -> DashboardSummary:
    ai_confidence = (
        round(sum(i.confidence for i in insights) / len(insights), 1)
        if insights
        else 90.0
    )

    return DashboardSummary(
        city=city,
        city_health=metrics.city_health_score,
        sustainability=metrics.sustainability_score,
        active_alerts=len(alerts),
        ai_confidence=ai_confidence,
    )
