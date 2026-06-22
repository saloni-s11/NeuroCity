"""
TrafficService
==============
All traffic intelligence logic computed from traffic_data.json.

Architecture is deliberately provider-agnostic:
  load_traffic_raw()  ← only function that touches the file system.
  To plug in TomTom/HERE: replace load_traffic_raw() with an HTTP client
  and every endpoint downstream gets live data automatically.
"""

import json
import math
import os
from datetime import datetime
from typing import List, Dict

from models.city import (
    ForecastPoint,
    HourlyFlow,
    RouteRecommendation,
    TrafficCorridor,
    TrafficForecast,
    TrafficHotspot,
    TrafficKPIs,
    TrafficOverview,
    WeeklyTrend,
)

_TRAFFIC_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "traffic_data.json"
)

# ─── Provider abstraction (swap this for TomTom/HERE later) ──────────────────

from services.api_clients import get_tomtom_flow, get_corridor_coords

def load_traffic_raw(city: str = "Mumbai") -> dict:
    """
    Load base traffic data and augment with TomTom live traffic data.
    """
    with open(_TRAFFIC_PATH, "r") as f:
        data = json.load(f)

    for corridor in data.get("corridors", []):
        c_id = corridor.get("id")
        coords = get_corridor_coords(city, c_id)
        if coords:
            live_data = get_tomtom_flow(coords["lat"], coords["lon"])
            if live_data and "flowSegmentData" in live_data:
                flow = live_data["flowSegmentData"]
                corridor["current_speed_kmh"] = flow.get("currentSpeed", corridor["current_speed_kmh"])
                corridor["free_flow_speed_kmh"] = flow.get("freeFlowSpeed", corridor["free_flow_speed_kmh"])
                
    return data


# ─── Derived congestion helpers ───────────────────────────────────────────────

def _congestion_index(current_speed: float, free_flow: float) -> float:
    """0 = free-flow, 100 = complete standstill."""
    if free_flow <= 0:
        return 0.0
    ratio = current_speed / free_flow
    return round(min(100.0, max(0.0, (1.0 - ratio) * 100.0)), 1)


def _congestion_level(index: float) -> str:
    if index < 25:  return "Free"
    if index < 50:  return "Moderate"
    if index < 75:  return "Heavy"
    return "Severe"


def _delay_minutes(current_speed: float, free_flow: float,
                   road_length_km: float = 10.0) -> float:
    """Extra travel time vs free-flow over a nominal road length."""
    if current_speed <= 0 or free_flow <= 0:
        return 0.0
    actual   = (road_length_km / current_speed) * 60.0
    baseline = (road_length_km / free_flow) * 60.0
    return round(max(0.0, actual - baseline), 1)


def _build_corridor(raw: dict) -> TrafficCorridor:
    ci    = _congestion_index(raw["current_speed_kmh"], raw["free_flow_speed_kmh"])
    level = _congestion_level(ci)
    delay = _delay_minutes(raw["current_speed_kmh"], raw["free_flow_speed_kmh"])
    return TrafficCorridor(
        id=raw["id"],
        name=raw["name"],
        from_=raw["from"],
        to=raw["to"],
        sector_id=raw["sector_id"],
        current_speed_kmh=raw["current_speed_kmh"],
        free_flow_speed_kmh=raw["free_flow_speed_kmh"],
        volume=raw["volume"],
        capacity=raw["capacity"],
        incidents=raw["incidents"],
        signal_count=raw["signal_count"],
        congestion_index=ci,
        congestion_level=level,
        delay_minutes=delay,
    )


# ─── GET /traffic ─────────────────────────────────────────────────────────────

def get_traffic_overview(city: str = "Mumbai") -> TrafficOverview:
    raw = load_traffic_raw(city)
    corridors = [_build_corridor(c) for c in raw["corridors"]]
    hourly    = [HourlyFlow(**h) for h in raw["hourly_flow"]]
    weekly    = [WeeklyTrend(**w) for w in raw["weekly_trend"]]
    return TrafficOverview(
        corridors=corridors,
        hourly_flow=hourly,
        weekly_trend=weekly,
        data_source="tomtom",
    )


def get_traffic_kpis(city: str = "Mumbai") -> TrafficKPIs:
    raw       = load_traffic_raw(city)
    corridors = [_build_corridor(c) for c in raw["corridors"]]
    n         = len(corridors)

    avg_speed  = round(sum(c.current_speed_kmh for c in corridors) / n, 1)
    avg_ci     = round(sum(c.congestion_index   for c in corridors) / n, 1)
    incidents  = sum(c.incidents for c in corridors)
    severe     = sum(1 for c in corridors if c.congestion_level == "Severe")
    heavy      = sum(1 for c in corridors if c.congestion_level == "Heavy")

    # Commute estimate: 20 km average journey at current mean speed
    avg_commute = round((20.0 / avg_speed) * 60.0, 1) if avg_speed > 0 else 0.0

    # Network efficiency: actual throughput vs max theoretical capacity
    total_vol = sum(c.volume   for c in corridors)
    total_cap = sum(c.capacity for c in corridors)
    efficiency = round((total_vol / total_cap) * 100.0, 1) if total_cap > 0 else 0.0

    return TrafficKPIs(
        avg_speed_kmh=avg_speed,
        congestion_index=avg_ci,
        avg_commute_minutes=avg_commute,
        active_incidents=incidents,
        corridors_severe=severe,
        corridors_heavy=heavy,
        network_efficiency_pct=efficiency,
    )


# ─── GET /traffic/hotspots ────────────────────────────────────────────────────

_RECO: Dict[str, str] = {
    "Severe":   "Deploy traffic officers. Activate alternate signal plan. Issue real-time reroute advisory.",
    "Heavy":    "Adjust signal timing cycle. Monitor for incident spillover. Prepare reroute advisory.",
    "Moderate": "Monitor for deterioration. No immediate action required.",
    "Free":     "Normal operations.",
}


def get_traffic_hotspots(city: str = "Mumbai") -> List[TrafficHotspot]:
    raw       = load_traffic_raw(city)
    corridors = [_build_corridor(c) for c in raw["corridors"]]

    # Return all non-Free corridors, sorted by congestion index desc
    hotspots = sorted(
        [c for c in corridors if c.congestion_level != "Free"],
        key=lambda c: c.congestion_index,
        reverse=True,
    )

    return [
        TrafficHotspot(
            corridor_id=c.id,
            corridor_name=c.name,
            sector_id=c.sector_id,
            congestion_index=c.congestion_index,
            severity=c.congestion_level,
            delay_minutes=c.delay_minutes,
            volume_to_capacity=round(c.volume / c.capacity, 3) if c.capacity > 0 else 0.0,
            incidents=c.incidents,
            recommendation=_RECO.get(c.congestion_level, "Monitor."),
        )
        for c in hotspots
    ]


# ─── GET /traffic/routes ──────────────────────────────────────────────────────

def get_route_recommendations(city: str = "Mumbai") -> List[RouteRecommendation]:
    raw        = load_traffic_raw(city)
    by_id      = {c["id"]: _build_corridor(c) for c in raw["corridors"]}

    def _travel_min(corridor: TrafficCorridor, km: float = 15.0) -> float:
        """Journey time (min) for `km` kilometres at corridor's current speed."""
        speed = max(5.0, corridor.current_speed_kmh)
        return round((km / speed) * 60.0, 1)

    # Route templates — current_corridor is the congested one being avoided
    templates = [
        dict(id="R01", origin="Andheri",  destination="BKC",
             current="C04", alternate="C03",
             alt_label="via SV Road → Bandra Reclamation", valid="Next 45 min"),
        dict(id="R02", origin="Dahisar",  destination="Lower Parel",
             current="C01", alternate="C02",
             alt_label="via Eastern Freeway → Parel", valid="Next 60 min"),
        dict(id="R03", origin="Ghatkopar", destination="Fort",
             current="C06", alternate="C02",
             alt_label="via Eastern Freeway direct", valid="Next 30 min"),
        dict(id="R04", origin="Bandra",   destination="Powai",
             current="C01", alternate="C03",
             alt_label="via JVLR inner road → Powai Lake Road", valid="Next 45 min"),
    ]

    results = []
    for t in templates:
        cur = by_id.get(t["current"])
        alt = by_id.get(t["alternate"])
        if not cur or not alt:
            continue

        cur_dur = _travel_min(cur)
        alt_dur = _travel_min(alt)
        saving  = round(max(0.0, cur_dur - alt_dur), 1)

        reason = (
            f"{cur.name} is showing {cur.congestion_level.lower()} congestion "
            f"(index {cur.congestion_index}, {cur.incidents} incident(s)). "
            f"{alt.name} is {alt.congestion_level.lower()} "
            f"and saves ~{saving} min."
        )

        results.append(RouteRecommendation(
            id=t["id"],
            origin=t["origin"],
            destination=t["destination"],
            current_route=f"{cur.name} ({cur.from_} → {cur.to})",
            current_duration_min=cur_dur,
            recommended_route=t["alt_label"],
            recommended_duration_min=alt_dur,
            time_saving_min=saving,
            reason=reason,
            valid_until=t["valid"],
        ))

    results.sort(key=lambda r: r.time_saving_min, reverse=True)
    return results


# ─── GET /traffic/forecast ────────────────────────────────────────────────────

def get_traffic_forecast(horizon_hours: int = 12, city: str = "Mumbai") -> TrafficForecast:
    """
    Wave-pattern forecast anchored to historical hourly_flow data.
    model tag = "simulated_wave"
    Future: replace body with ML pipeline call and set model = "ml_v1".
    """
    raw    = load_traffic_raw(city)
    hourly = raw["hourly_flow"]   # 24 reference data points
    now_h  = datetime.now().hour

    points: List[ForecastPoint] = []

    for offset in range(horizon_hours):
        fh    = (now_h + offset) % 24
        base  = hourly[fh]

        # Confidence decays linearly with forecast distance
        confidence = round(max(0.50, 0.96 - offset * 0.04), 2)

        # Small deterministic noise (±5 %) so adjacent runs produce stable numbers
        nv = 1.0 + math.sin(fh * 1.7 + 0.3) * 0.05
        ns = 1.0 + math.sin(fh * 1.3 + 0.8) * 0.04

        pred_vol   = max(0, round(base["volume"]    * nv))
        pred_speed = max(5.0, round(base["avg_speed"] * ns, 1))
        ci         = _congestion_index(pred_speed, 65.0)

        points.append(ForecastPoint(
            hour=f"{fh:02d}:00",
            predicted_volume=pred_vol,
            predicted_speed=pred_speed,
            congestion_index=ci,
            confidence=confidence,
        ))

    peak = max(points, key=lambda p: p.congestion_index)

    return TrafficForecast(
        generated_at=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        horizon_hours=horizon_hours,
        points=points,
        peak_hour=peak.hour,
        peak_congestion_index=peak.congestion_index,
        model="simulated_wave",
    )
