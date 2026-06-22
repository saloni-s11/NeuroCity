"""
TimelineService
===============
Timeline projection engine:
  - Year-by-year projections (2026–2040) for 10 city metrics
  - Three scenario trajectories: Baseline, Green Investment, Climate Stress
  - Auto-generated milestone events

All projections are anchored to current city data from city_state.json.
"""

import json
import math
import os
from typing import List

from models.city import (
    Milestone,
    Scenario,
    ScenarioComparison,
    Sector,
    TimelineProjection,
    YearData,
)

_CITY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "city_state.json")
_POLLUTION_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "pollution_data.json")

START_YEAR = 2026
END_YEAR = 2040
YEARS = list(range(START_YEAR, END_YEAR + 1))


from services.city_service import load_sectors as _load_sectors
from services.environment_service import load_pollution_raw as _load_pollution


def _avg(vals: List[float]) -> float:
    return round(sum(vals) / len(vals), 1) if vals else 0.0


# ─── Projection Generators ───────────────────────────────────────────────────

def _baseline_projection(sectors: List[Sector], pollution: dict) -> List[YearData]:
    """Moderate organic growth — no major interventions."""
    poll_sectors = pollution["sectors"]
    n = len(sectors)

    base_pop = sum(s.population for s in sectors) / 1_000_000
    base_infra = _avg([s.infrastructure_health for s in sectors])
    base_traffic = _avg([s.traffic for s in sectors])
    base_aqi = _avg([s.aqi for s in sectors])
    base_energy = sum(s.energy_usage for s in sectors) / 100  # GW
    base_co2 = _avg([s["co2"] for s in poll_sectors])

    data = []
    for year in YEARS:
        t = (year - START_YEAR) / (END_YEAR - START_YEAR)

        pop = round(base_pop + t * 6.8 + t * t * 1.2, 2)
        infra = round(min(95, base_infra + t * 12 - t * t * 4), 1)
        traffic = round(min(95, base_traffic + t * 14 - t * t * 8), 1)
        pollution_idx = round(max(40, base_aqi - t * 20 + t * t * 8), 1)
        energy = round(base_energy + t * 2.8 + t * t * 0.6, 1)
        ev = round(min(55, 12 + t * 45), 1)
        renew = round(min(50, 18 + t * 35), 1)
        green = round(min(35, 15 + t * 18), 1)
        sust = round(min(85, 65 + t * 20 - t * t * 3), 1)

        data.append(YearData(
            year=year,
            population_m=pop,
            infra_score=infra,
            traffic_index=traffic,
            pollution_index=pollution_idx,
            energy_gw=energy,
            sustainability_score=sust,
            ev_pct=ev,
            renewable_pct=renew,
            green_cover_pct=green,
        ))
    return data


def _green_projection(sectors: List[Sector], pollution: dict) -> List[YearData]:
    """Aggressive green investment scenario."""
    poll_sectors = pollution["sectors"]

    base_pop = sum(s.population for s in sectors) / 1_000_000
    base_infra = _avg([s.infrastructure_health for s in sectors])
    base_traffic = _avg([s.traffic for s in sectors])
    base_aqi = _avg([s.aqi for s in sectors])
    base_energy = sum(s.energy_usage for s in sectors) / 100

    data = []
    for year in YEARS:
        t = (year - START_YEAR) / (END_YEAR - START_YEAR)

        pop = round(base_pop + t * 5.5, 2)  # Slower growth (planned)
        infra = round(min(98, base_infra + t * 22), 1)  # Heavy investment
        traffic = round(max(30, base_traffic - t * 25), 1)  # Metro + EV reduces
        pollution_idx = round(max(25, base_aqi - t * 55), 1)  # Aggressive cleanup
        energy = round(base_energy + t * 1.5, 1)  # Efficiency gains
        ev = round(min(85, 12 + t * 78), 1)  # Aggressive EV push
        renew = round(min(90, 18 + t * 75), 1)  # Massive renewable build
        green = round(min(55, 15 + t * 42), 1)  # Urban greening
        sust = round(min(96, 65 + t * 32), 1)

        data.append(YearData(
            year=year,
            population_m=pop,
            infra_score=infra,
            traffic_index=traffic,
            pollution_index=pollution_idx,
            energy_gw=energy,
            sustainability_score=sust,
            ev_pct=ev,
            renewable_pct=renew,
            green_cover_pct=green,
        ))
    return data


def _climate_stress_projection(sectors: List[Sector], pollution: dict) -> List[YearData]:
    """Climate stress scenario — more extreme weather, less investment."""
    poll_sectors = pollution["sectors"]

    base_pop = sum(s.population for s in sectors) / 1_000_000
    base_infra = _avg([s.infrastructure_health for s in sectors])
    base_traffic = _avg([s.traffic for s in sectors])
    base_aqi = _avg([s.aqi for s in sectors])
    base_energy = sum(s.energy_usage for s in sectors) / 100

    data = []
    for year in YEARS:
        t = (year - START_YEAR) / (END_YEAR - START_YEAR)

        pop = round(base_pop + t * 8.2, 2)  # Rapid unplanned growth
        infra = round(max(45, base_infra - t * 15 + t * t * 3), 1)  # Degradation
        traffic = round(min(98, base_traffic + t * 22), 1)  # Worsening
        pollution_idx = round(min(250, base_aqi + t * 40), 1)  # Deteriorating
        energy = round(base_energy + t * 4.5, 1)  # Surging demand
        ev = round(min(25, 12 + t * 15), 1)  # Slow adoption
        renew = round(min(25, 18 + t * 8), 1)  # Minimal progress
        green = round(max(8, 15 - t * 8), 1)  # Urban sprawl
        sust = round(max(30, 65 - t * 28), 1)

        data.append(YearData(
            year=year,
            population_m=pop,
            infra_score=infra,
            traffic_index=traffic,
            pollution_index=pollution_idx,
            energy_gw=energy,
            sustainability_score=sust,
            ev_pct=ev,
            renewable_pct=renew,
            green_cover_pct=green,
        ))
    return data


# ─── Public API ───────────────────────────────────────────────────────────────

def get_projections(city: str = "Mumbai") -> TimelineProjection:
    sectors = _load_sectors(city)
    pollution = _load_pollution(city)
    data = _baseline_projection(sectors, pollution)

    last = data[-1]
    first = data[0]
    narrative = (
        f"Under baseline projections, NeuroCity grows from {first.population_m}M to {last.population_m}M residents "
        f"by {END_YEAR}. Infrastructure score improves from {first.infra_score} to {last.infra_score}. "
        f"Traffic peaks mid-decade before stabilizing as metro expansion and EV adoption ({last.ev_pct}%) take effect. "
        f"Pollution index drops from {first.pollution_index} to {last.pollution_index} with renewable energy reaching {last.renewable_pct}% of the grid. "
        f"Overall sustainability score trends from {first.sustainability_score} to {last.sustainability_score}."
    )

    return TimelineProjection(
        start_year=START_YEAR,
        end_year=END_YEAR,
        data=data,
        narrative=narrative,
    )


def get_scenarios(city: str = "Mumbai") -> ScenarioComparison:
    sectors = _load_sectors(city)
    pollution = _load_pollution(city)

    baseline = _baseline_projection(sectors, pollution)
    green = _green_projection(sectors, pollution)
    climate = _climate_stress_projection(sectors, pollution)

    scenarios = [
        Scenario(
            name="Baseline",
            description="Moderate organic growth with incremental improvements. Current policy trajectory.",
            color="var(--color-info)",
            data=baseline,
        ),
        Scenario(
            name="Green Investment",
            description="Aggressive sustainability push — heavy renewable, EV, and infrastructure investment.",
            color="var(--color-success)",
            data=green,
        ),
        Scenario(
            name="Climate Stress",
            description="Rapid unplanned growth under climate pressure with minimal green investment.",
            color="var(--color-risk)",
            data=climate,
        ),
    ]

    b_last = baseline[-1]
    g_last = green[-1]
    c_last = climate[-1]

    analysis = (
        f"By {END_YEAR}, the three scenarios diverge significantly. "
        f"Green Investment achieves sustainability {g_last.sustainability_score}/100 vs "
        f"Baseline {b_last.sustainability_score}/100 vs Climate Stress {c_last.sustainability_score}/100. "
        f"The pollution gap is dramatic: Green reaches {g_last.pollution_index} AQI "
        f"while Climate Stress hits {c_last.pollution_index}. "
        f"Infrastructure difference: Green {g_last.infra_score}% vs Climate Stress {c_last.infra_score}%. "
        f"The Green Investment pathway requires ~40% more capex but delivers 3x better outcomes."
    )

    return ScenarioComparison(scenarios=scenarios, analysis=analysis)


def get_milestones(city: str = "Mumbai") -> List[Milestone]:
    sectors = _load_sectors(city)
    pollution = _load_pollution(city)
    data = _baseline_projection(sectors, pollution)

    milestones: List[Milestone] = []

    for yd in data:
        # Population milestones
        if yd.population_m >= 25 and not any(m.title.startswith("Population crosses 25M") for m in milestones):
            milestones.append(Milestone(
                year=yd.year,
                title="Population crosses 25M",
                description=f"City population reaches {yd.population_m}M, triggering expanded public service requirements.",
                category="population",
                impact="neutral",
                icon_hint="users",
            ))

        # EV milestone
        if yd.ev_pct >= 30 and not any(m.title.startswith("EV adoption hits 30%") for m in milestones):
            milestones.append(Milestone(
                year=yd.year,
                title="EV adoption hits 30%",
                description=f"Electric vehicles reach {yd.ev_pct}% market share, significantly reducing transport emissions.",
                category="environment",
                impact="positive",
                icon_hint="zap",
            ))

        if yd.ev_pct >= 50 and not any(m.title.startswith("EV majority") for m in milestones):
            milestones.append(Milestone(
                year=yd.year,
                title="EV majority reached",
                description=f"Electric vehicles surpass 50% market share at {yd.ev_pct}%.",
                category="environment",
                impact="positive",
                icon_hint="zap",
            ))

        # Renewable milestone
        if yd.renewable_pct >= 35 and not any(m.title.startswith("Renewable energy hits 35%") for m in milestones):
            milestones.append(Milestone(
                year=yd.year,
                title="Renewable energy hits 35%",
                description=f"Renewable sources reach {yd.renewable_pct}% of grid capacity.",
                category="energy",
                impact="positive",
                icon_hint="sun",
            ))

        # Infrastructure milestone
        if yd.infra_score >= 90 and not any(m.title.startswith("Infrastructure excellence") for m in milestones):
            milestones.append(Milestone(
                year=yd.year,
                title="Infrastructure excellence achieved",
                description=f"City-wide infrastructure score reaches {yd.infra_score}%, entering premium tier.",
                category="infrastructure",
                impact="positive",
                icon_hint="building",
            ))

        # Sustainability milestone
        if yd.sustainability_score >= 80 and not any(m.title.startswith("Sustainability target met") for m in milestones):
            milestones.append(Milestone(
                year=yd.year,
                title="Sustainability target met",
                description=f"City sustainability score of {yd.sustainability_score} meets the 2030 UN SDG benchmark.",
                category="environment",
                impact="positive",
                icon_hint="leaf",
            ))

        # Green cover milestone
        if yd.green_cover_pct >= 25 and not any(m.title.startswith("Green cover target") for m in milestones):
            milestones.append(Milestone(
                year=yd.year,
                title="Green cover target reached",
                description=f"Urban green cover at {yd.green_cover_pct}%, meeting WHO recommended minimum.",
                category="environment",
                impact="positive",
                icon_hint="tree",
            ))

    # Always add a few narrative milestones
    milestones.append(Milestone(
        year=2027,
        title="Smart Grid Phase 1 deployed",
        description="AI-powered grid management system activated across all 6 sectors, enabling demand-response protocols.",
        category="energy",
        impact="positive",
        icon_hint="cpu",
    ))

    milestones.append(Milestone(
        year=2029,
        title="Metro Phase 3 completion",
        description="15 km metro extension connects eastern corridors, reducing commute times by 22%.",
        category="infrastructure",
        impact="positive",
        icon_hint="train",
    ))

    milestones.sort(key=lambda m: m.year)
    return milestones
