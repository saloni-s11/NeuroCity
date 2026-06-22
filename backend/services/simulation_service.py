"""
SimulationService
=================
Scenario simulation engine with 4 scenario types:
  1. Population Growth
  2. EV Adoption Impact
  3. Renewable Energy Expansion
  4. Climate Event Impact

Each scenario accepts parameters, computes projected impacts from
current city data, and generates an AI narrative.
"""

import json
import math
import os
from typing import List

from models.city import (
    Sector,
    SimulationImpact,
    SimulationPreset,
    SimulationResult,
)

_CITY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "city_state.json")
_POLLUTION_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "pollution_data.json")


from services.city_service import load_sectors as _load_sectors
from services.environment_service import load_pollution_raw as _load_pollution


def _avg(vals: List[float]) -> float:
    return round(sum(vals) / len(vals), 1) if vals else 0.0


# ─── Scenario Runners ────────────────────────────────────────────────────────

def _run_population_growth(params: dict, city: str) -> SimulationResult:
    sectors = _load_sectors(city)
    pollution = _load_pollution(city)

    growth_pct = params.get("growth_pct", 15)
    metro_km = params.get("metro_expansion_km", 20)
    infra_budget = params.get("infra_budget_cr", 50)

    avg_traffic = _avg([s.traffic for s in sectors])
    avg_aqi = _avg([s.aqi for s in sectors])
    total_energy = sum(s.energy_usage for s in sectors)
    total_pop = sum(s.population for s in sectors)
    avg_infra = _avg([s.infrastructure_health for s in sectors])

    # Compute impacts
    new_pop = total_pop * (1 + growth_pct / 100)
    traffic_delta = growth_pct * 0.8 - metro_km * 0.6
    traffic_new = round(min(100, max(0, avg_traffic + traffic_delta)), 1)
    aqi_delta = growth_pct * 0.5 - metro_km * 0.2
    aqi_new = round(max(0, avg_aqi + aqi_delta), 1)
    energy_new = round(total_energy * (1 + growth_pct / 100) * 1.02, 1)
    infra_delta = infra_budget * 0.12 - growth_pct * 0.3
    infra_new = round(min(100, max(0, avg_infra + infra_delta)), 1)
    stress = round(50 + growth_pct * 0.7 - metro_km * 0.3 - infra_budget * 0.1, 1)

    impacts = [
        SimulationImpact(label="Traffic Index", value=traffic_new, unit="",
                         delta_pct=round((traffic_new - avg_traffic) / avg_traffic * 100, 1),
                         tone="negative" if traffic_new > avg_traffic else "positive"),
        SimulationImpact(label="AQI", value=aqi_new, unit="µg/m³",
                         delta_pct=round((aqi_new - avg_aqi) / avg_aqi * 100, 1),
                         tone="negative" if aqi_new > avg_aqi else "positive"),
        SimulationImpact(label="Energy Demand", value=round(energy_new / 100, 1), unit="GW",
                         delta_pct=round((energy_new - total_energy) / total_energy * 100, 1),
                         tone="negative"),
        SimulationImpact(label="Infrastructure", value=infra_new, unit="%",
                         delta_pct=round((infra_new - avg_infra) / avg_infra * 100, 1),
                         tone="positive" if infra_new > avg_infra else "negative"),
        SimulationImpact(label="Population", value=round(new_pop / 1_000_000, 2), unit="M",
                         delta_pct=round(growth_pct, 1), tone="neutral"),
        SimulationImpact(label="Stress Index", value=round(stress, 1), unit="",
                         delta_pct=round(stress - 50, 1),
                         tone="negative" if stress > 65 else "neutral"),
    ]

    risk = "Critical" if stress > 80 else "High" if stress > 65 else "Medium" if stress > 50 else "Low"

    narrative = (
        f"With {growth_pct}% population growth, the city expands to {round(new_pop / 1_000_000, 2)}M residents. "
        f"Traffic is projected to {'worsen' if traffic_delta > 0 else 'remain stable'} at {traffic_new} index. "
        f"Metro expansion of {metro_km}km offsets {round(metro_km * 0.6, 1)} points of congestion pressure. "
        f"Energy demand rises to {round(energy_new / 100, 1)} GW. "
        f"Overall stress level: {'high — intervention required' if stress > 65 else 'manageable with current investment'}."
    )

    recommendations = []
    if traffic_new > 75:
        recommendations.append("Deploy adaptive signal timing and congestion pricing in peak corridors")
    if aqi_new > 130:
        recommendations.append("Activate sprinkler grid and issue public air quality advisory")
    if infra_new < 70:
        recommendations.append("Accelerate infrastructure maintenance schedule for degraded sectors")
    if stress > 65:
        recommendations.append("Consider phased development approach to manage growth-induced stress")
    if not recommendations:
        recommendations.append("Current trajectory is sustainable — maintain monitoring frequency")

    return SimulationResult(
        scenario="population_growth",
        scenario_label="Population Growth",
        params=params,
        impacts=impacts,
        narrative=narrative,
        risk_level=risk,
        confidence=min(95, 75 + growth_pct // 5),
        recommendations=recommendations,
    )


def _run_ev_adoption(params: dict, city: str) -> SimulationResult:
    sectors = _load_sectors(city)
    pollution = _load_pollution(city)
    poll_sectors = pollution["sectors"]

    ev_pct = params.get("adoption_pct", 35)
    subsidy_cr = params.get("subsidy_cr", 200)
    charging_stations = params.get("charging_stations", 500)

    avg_aqi = _avg([s.aqi for s in sectors])
    avg_co2 = _avg([s["co2"] for s in poll_sectors])
    total_energy = sum(s.energy_usage for s in sectors)
    avg_traffic = _avg([s.traffic for s in sectors])

    # EV adoption reduces emissions but increases electricity demand
    emission_reduction = round(ev_pct * 0.65, 1)
    aqi_improvement = round(ev_pct * 0.4, 1)
    aqi_new = round(max(20, avg_aqi - aqi_improvement), 1)
    co2_new = round(max(200, avg_co2 - ev_pct * 2.1), 1)
    energy_shift = round(total_energy * (1 + ev_pct * 0.003), 1)
    traffic_reduction = round(ev_pct * 0.12, 1)  # Slight improvement from smart routing
    carbon_saved = round(ev_pct * 1.8, 1)  # tonnes per 1000 vehicles

    impacts = [
        SimulationImpact(label="Emission Reduction", value=emission_reduction, unit="%",
                         delta_pct=-emission_reduction, tone="positive"),
        SimulationImpact(label="AQI Improvement", value=aqi_new, unit="",
                         delta_pct=round((aqi_new - avg_aqi) / avg_aqi * 100, 1), tone="positive"),
        SimulationImpact(label="CO₂ Level", value=co2_new, unit="ppm",
                         delta_pct=round((co2_new - avg_co2) / avg_co2 * 100, 1), tone="positive"),
        SimulationImpact(label="Grid Load", value=round(energy_shift / 100, 1), unit="GW",
                         delta_pct=round((energy_shift - total_energy) / total_energy * 100, 1), tone="negative"),
        SimulationImpact(label="Carbon Saved", value=carbon_saved, unit="kt/yr",
                         delta_pct=-carbon_saved, tone="positive"),
        SimulationImpact(label="Traffic Impact", value=round(avg_traffic - traffic_reduction, 1), unit="",
                         delta_pct=round(-traffic_reduction / avg_traffic * 100, 1), tone="positive"),
    ]

    risk = "Low" if ev_pct < 50 else "Medium" if ev_pct < 75 else "High"

    narrative = (
        f"At {ev_pct}% EV adoption, the city displaces {emission_reduction}% of fossil-fuel emissions. "
        f"AQI improves to {aqi_new} (down from {avg_aqi}), and CO₂ drops to {co2_new} ppm. "
        f"However, grid load increases by {round((energy_shift - total_energy) / total_energy * 100, 1)}% — "
        f"{'within capacity' if ev_pct < 60 else 'requiring grid reinforcement'}. "
        f"With ₹{subsidy_cr} Cr in subsidies and {charging_stations} charging stations, "
        f"the transition is projected to reach breakeven in {max(3, 8 - ev_pct // 15)} years."
    )

    recommendations = [
        f"Deploy {charging_stations} Level-3 fast chargers across high-density corridors",
    ]
    if ev_pct > 50:
        recommendations.append("Upgrade transformer capacity in residential sectors for overnight charging load")
    if ev_pct > 30:
        recommendations.append("Partner with ride-hailing platforms for fleet electrification")
    recommendations.append(f"Allocate ₹{subsidy_cr} Cr in purchase subsidies to accelerate adoption curve")

    return SimulationResult(
        scenario="ev_adoption",
        scenario_label="EV Adoption Impact",
        params=params,
        impacts=impacts,
        narrative=narrative,
        risk_level=risk,
        confidence=min(92, 70 + ev_pct // 4),
        recommendations=recommendations,
    )


def _run_renewable_energy(params: dict, city: str) -> SimulationResult:
    sectors = _load_sectors(city)
    pollution = _load_pollution(city)
    poll_sectors = pollution["sectors"]

    renewable_pct = params.get("renewable_pct", 40)
    solar_mw = params.get("solar_capacity_mw", 500)
    wind_mw = params.get("wind_capacity_mw", 200)

    avg_co2 = _avg([s["co2"] for s in poll_sectors])
    total_energy = sum(s.energy_usage for s in sectors)
    avg_aqi = _avg([s.aqi for s in sectors])

    carbon_reduction = round(renewable_pct * 1.4, 1)
    co2_new = round(max(280, avg_co2 - renewable_pct * 1.8), 1)
    grid_stability = round(min(98, 75 + renewable_pct * 0.3 + solar_mw * 0.01), 1)
    cost_saving = round(renewable_pct * 0.8 + solar_mw * 0.002, 1)
    total_capacity = solar_mw + wind_mw
    aqi_benefit = round(renewable_pct * 0.25, 1)
    aqi_new = round(max(25, avg_aqi - aqi_benefit), 1)

    impacts = [
        SimulationImpact(label="Carbon Reduction", value=carbon_reduction, unit="%",
                         delta_pct=-carbon_reduction, tone="positive"),
        SimulationImpact(label="CO₂ Level", value=co2_new, unit="ppm",
                         delta_pct=round((co2_new - avg_co2) / avg_co2 * 100, 1), tone="positive"),
        SimulationImpact(label="Grid Stability", value=grid_stability, unit="%",
                         delta_pct=round(grid_stability - 75, 1), tone="positive"),
        SimulationImpact(label="Cost Savings", value=cost_saving, unit="₹Cr/yr",
                         delta_pct=cost_saving, tone="positive"),
        SimulationImpact(label="Capacity Added", value=total_capacity, unit="MW",
                         delta_pct=0, tone="positive"),
        SimulationImpact(label="AQI Benefit", value=aqi_new, unit="",
                         delta_pct=round((aqi_new - avg_aqi) / avg_aqi * 100, 1), tone="positive"),
    ]

    risk = "Low" if renewable_pct < 60 else "Medium"

    narrative = (
        f"Expanding renewable energy to {renewable_pct}% of the grid with {solar_mw} MW solar "
        f"and {wind_mw} MW wind capacity reduces carbon emissions by {carbon_reduction}%. "
        f"CO₂ levels drop to {co2_new} ppm from {avg_co2} ppm. "
        f"Grid stability remains {'strong' if grid_stability > 90 else 'acceptable'} at {grid_stability}%. "
        f"Annual cost savings projected at ₹{cost_saving} Cr. ROI positive in "
        f"{max(4, 10 - renewable_pct // 10)} years."
    )

    recommendations = [
        f"Install {solar_mw} MW rooftop solar across commercial and industrial sectors",
        f"Commission {wind_mw} MW offshore/suburban wind farm",
    ]
    if renewable_pct > 50:
        recommendations.append("Deploy battery storage (200 MWh) to handle intermittency")
    recommendations.append("Implement smart grid demand-response protocols")

    return SimulationResult(
        scenario="renewable_energy",
        scenario_label="Renewable Energy Expansion",
        params=params,
        impacts=impacts,
        narrative=narrative,
        risk_level=risk,
        confidence=min(90, 72 + renewable_pct // 5),
        recommendations=recommendations,
    )


def _run_climate_event(params: dict, city: str) -> SimulationResult:
    sectors = _load_sectors(city)

    event_type = params.get("event_type", "flood")
    severity = params.get("severity", 60)
    duration_days = params.get("duration_days", 5)

    avg_infra = _avg([s.infrastructure_health for s in sectors])
    avg_traffic = _avg([s.traffic for s in sectors])
    total_pop = sum(s.population for s in sectors)

    event_labels = {
        "flood": "Flooding Event",
        "heatwave": "Heat Wave",
        "cyclone": "Cyclonic Storm",
        "drought": "Extended Drought",
    }

    # Impact multiplier based on severity and duration
    impact_mult = (severity / 100) * (1 + duration_days * 0.08)

    infra_damage = round(min(40, impact_mult * 18), 1)
    infra_new = round(max(30, avg_infra - infra_damage), 1)
    traffic_disruption = round(min(45, impact_mult * 22), 1)
    traffic_new = round(min(100, avg_traffic + traffic_disruption), 1)
    pop_displaced = round(total_pop * impact_mult * 0.04)
    service_disruption = round(min(80, impact_mult * 35), 1)
    economic_loss = round(impact_mult * 450, 0)
    recovery_days = round(duration_days * 2.5 + severity * 0.3, 0)

    impacts = [
        SimulationImpact(label="Infra Damage", value=infra_damage, unit="%",
                         delta_pct=-infra_damage, tone="negative"),
        SimulationImpact(label="Traffic Disruption", value=traffic_new, unit="",
                         delta_pct=round(traffic_disruption / avg_traffic * 100, 1), tone="negative"),
        SimulationImpact(label="Population Displaced", value=round(pop_displaced / 1000, 1), unit="K",
                         delta_pct=round(pop_displaced / total_pop * 100, 1), tone="negative"),
        SimulationImpact(label="Service Disruption", value=service_disruption, unit="%",
                         delta_pct=service_disruption, tone="negative"),
        SimulationImpact(label="Economic Loss", value=economic_loss, unit="₹Cr",
                         delta_pct=0, tone="negative"),
        SimulationImpact(label="Recovery Time", value=recovery_days, unit="days",
                         delta_pct=0, tone="negative"),
    ]

    risk = "Critical" if severity > 75 else "High" if severity > 50 else "Medium"

    event_name = event_labels.get(event_type, "Climate Event")
    narrative = (
        f"A {event_name.lower()} of severity {severity}/100 lasting {duration_days} days "
        f"would cause {infra_damage}% infrastructure damage, displacing approximately "
        f"{round(pop_displaced / 1000, 1)}K residents. Traffic disruption peaks at {traffic_new} index. "
        f"Essential services face {service_disruption}% disruption. "
        f"Estimated economic loss: ₹{int(economic_loss)} Cr. "
        f"Full recovery projected in {int(recovery_days)} days with emergency protocols active."
    )

    recommendations = [
        f"Pre-position emergency response teams for {event_name.lower()} scenarios",
        f"Reinforce infrastructure in sectors with health below 70%",
    ]
    if severity > 60:
        recommendations.append("Activate emergency evacuation corridors and shelter systems")
        recommendations.append("Deploy mobile power and water supply units to vulnerable sectors")
    if event_type == "flood":
        recommendations.append("Clear and upgrade stormwater drainage capacity in low-lying sectors")
    elif event_type == "heatwave":
        recommendations.append("Activate cooling centers and public hydration stations")

    return SimulationResult(
        scenario="climate_event",
        scenario_label=event_name,
        params=params,
        impacts=impacts,
        narrative=narrative,
        risk_level=risk,
        confidence=min(88, 65 + severity // 5),
        recommendations=recommendations,
    )


# ─── Public API ───────────────────────────────────────────────────────────────

_RUNNERS = {
    "population_growth": _run_population_growth,
    "ev_adoption": _run_ev_adoption,
    "renewable_energy": _run_renewable_energy,
    "climate_event": _run_climate_event,
}


def run_simulation(scenario: str, params: dict, city: str = "Mumbai") -> SimulationResult:
    runner = _RUNNERS.get(scenario)
    if not runner:
        raise ValueError(f"Unknown scenario: {scenario}. Valid: {list(_RUNNERS.keys())}")
    return runner(params, city)


def get_presets(city: str = "Mumbai") -> List[SimulationPreset]:
    return [
        SimulationPreset(
            id="green_2030", name="Green City 2030",
            description="Aggressive sustainability push — 60% renewables, 50% EV, 30km metro expansion",
            scenario="renewable_energy",
            params={"renewable_pct": 60, "solar_capacity_mw": 800, "wind_capacity_mw": 400},
            tags=["sustainability", "green"],
        ),
        SimulationPreset(
            id="mega_event", name="Mega-Event Surge",
            description="Model impact of hosting a global event with 25% population spike",
            scenario="population_growth",
            params={"growth_pct": 25, "metro_expansion_km": 10, "infra_budget_cr": 100},
            tags=["event", "population"],
        ),
        SimulationPreset(
            id="monsoon_resilience", name="Monsoon Resilience",
            description="Severe monsoon flooding scenario — 7-day event, severity 75",
            scenario="climate_event",
            params={"event_type": "flood", "severity": 75, "duration_days": 7},
            tags=["climate", "resilience"],
        ),
        SimulationPreset(
            id="ev_first", name="EV-First City",
            description="Rapid EV transition — 70% adoption with 2000 charging stations",
            scenario="ev_adoption",
            params={"adoption_pct": 70, "subsidy_cr": 500, "charging_stations": 2000},
            tags=["ev", "transport"],
        ),
        SimulationPreset(
            id="heatwave_extreme", name="Extreme Heatwave",
            description="Record-breaking heatwave — severity 85, lasting 10 days",
            scenario="climate_event",
            params={"event_type": "heatwave", "severity": 85, "duration_days": 10},
            tags=["climate", "emergency"],
        ),
        SimulationPreset(
            id="balanced_growth", name="Balanced Growth",
            description="Moderate 10% growth with proportional infrastructure investment",
            scenario="population_growth",
            params={"growth_pct": 10, "metro_expansion_km": 25, "infra_budget_cr": 80},
            tags=["growth", "balanced"],
        ),
    ]
