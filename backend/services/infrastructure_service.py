"""
InfrastructureService
=====================
All 7 infrastructure intelligence engines computed from infrastructure_data.json.
Provider-agnostic: load_infra_raw(city) is the only data-layer touchpoint.
Replace it with a live asset-management API for real data.
"""

import json
import os
from typing import List, Optional

from models.city import (
    InfraAsset,
    InfraForecastItem,
    InfraHotspot,
    InfraOverview,
    InfraRisk,
    InfraUtilities,
    MaintenanceItem,
    UtilityNetwork,
)

_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "infrastructure_data.json"
)

# ─── Data loader ─────────────────────────────────────────────────────────────

import random

def load_infra_raw(city: str = "Mumbai") -> dict:
    with open(_DATA_PATH, "r") as f:
        data = json.load(f)
    
    # Simulate dynamic data per city
    city_hash = hash(city) % 100
    random.seed(city_hash)
    
    for asset in data.get("assets", []):
        # Vary health score by +/- 15 based on city
        offset = random.randint(-15, 15)
        asset["health_score"] = max(10, min(100, asset["health_score"] + offset))
        
    utils = data.get("utilities", {})
    if "power" in utils:
        utils["power"]["current_load_pct"] = max(20, min(100, utils["power"]["current_load_pct"] + random.randint(-20, 20)))
    if "water" in utils:
        utils["water"]["utilization_pct"] = max(20, min(100, utils["water"]["utilization_pct"] + random.randint(-20, 20)))

    return data


def _build_asset(raw: dict) -> InfraAsset:
    return InfraAsset(
        asset_id=raw["asset_id"],
        asset_name=raw["asset_name"],
        type=raw["type"],
        sector=raw["sector"],
        health_score=raw["health_score"],
        status=raw["status"],
        risk_level=raw["risk_level"],
        last_inspection=raw["last_inspection"],
        issue=raw.get("issue"),
    )


# ─── 1. GET /infrastructure/overview ─────────────────────────────────────────

def get_infra_overview(city: str = "Mumbai") -> InfraOverview:
    raw    = load_infra_raw(city)
    assets = [_build_asset(a) for a in raw["assets"]]
    n      = len(assets)

    avg_health       = round(sum(a.health_score for a in assets) / n, 1)
    critical         = sum(1 for a in assets if a.health_score < 60)
    warning          = sum(1 for a in assets if 60 <= a.health_score < 75)
    healthy          = sum(1 for a in assets if a.health_score >= 75)
    maintenance_tasks = sum(1 for a in assets if a.health_score < 80)
    # Predicted failures: assets below 55 with an active issue
    predicted        = sum(1 for a in assets if a.health_score < 55 and a.issue)

    return InfraOverview(
        health_score=avg_health,
        critical_assets=critical,
        warning_assets=warning,
        healthy_assets=healthy,
        total_assets=n,
        maintenance_tasks=maintenance_tasks,
        predicted_failures=predicted,
    )


# ─── 2. GET /infrastructure/assets ───────────────────────────────────────────

def get_infra_assets(city: str = "Mumbai") -> List[InfraAsset]:
    raw = load_infra_raw(city)
    assets = [_build_asset(a) for a in raw["assets"]]
    # Sort: Critical first, then Warning, then Healthy; within tier by health asc
    order = {"Critical": 0, "Warning": 1, "Healthy": 2}
    assets.sort(key=lambda a: (order.get(a.status, 9), a.health_score))
    return assets


# ─── 3. GET /infrastructure/hotspots ─────────────────────────────────────────

def _failure_risk(health_score: float, has_issue: bool) -> float:
    """0-100 probability of failure within 30 days."""
    base  = max(0.0, (70.0 - health_score) / 70.0) * 80.0
    bonus = 15.0 if has_issue else 0.0
    return round(min(100.0, base + bonus), 1)


def get_infra_hotspots(city: str = "Mumbai") -> List[InfraHotspot]:
    raw    = load_infra_raw(city)
    assets = [_build_asset(a) for a in raw["assets"]]
    hotspots = sorted(
        [a for a in assets if a.health_score < 70],
        key=lambda a: a.health_score,
    )
    return [
        InfraHotspot(
            asset_id=a.asset_id,
            asset_name=a.asset_name,
            type=a.type,
            sector=a.sector,
            health_score=a.health_score,
            status=a.status,
            risk_level=a.risk_level,
            issue=a.issue,
            failure_risk_pct=_failure_risk(a.health_score, bool(a.issue)),
        )
        for a in hotspots
    ]


# ─── 4. GET /infrastructure/maintenance ──────────────────────────────────────

_ETA_MAP = {
    "Critical": "Within 24h",
    "High":     "Within 7 days",
    "Normal":   "Within 30 days",
}


def _maintenance_priority(health_score: float) -> str:
    if health_score < 60:  return "Critical"
    if health_score < 75:  return "High"
    return "Normal"


def _maintenance_eta(priority: str, asset_type: str) -> str:
    base = _ETA_MAP.get(priority, "Within 30 days")
    if priority == "Critical" and asset_type in ("Bridge", "Power Grid"):
        return "Immediate — <6h"
    return base


def get_infra_maintenance(city: str = "Mumbai") -> List[MaintenanceItem]:
    raw    = load_infra_raw(city)
    assets = [_build_asset(a) for a in raw["assets"]]
    # Include everything below health 80 (maintenance_tasks threshold)
    items = [a for a in assets if a.health_score < 80]
    items.sort(key=lambda a: a.health_score)

    result = []
    for a in items:
        priority = _maintenance_priority(a.health_score)
        eta      = _maintenance_eta(priority, a.type)
        result.append(MaintenanceItem(
            asset_id=a.asset_id,
            asset=a.asset_name,
            type=a.type,
            sector=a.sector,
            health_score=a.health_score,
            priority=priority,
            issue=a.issue or "Scheduled inspection due",
            eta=eta,
            last_inspection=a.last_inspection,
        ))
    return result


# ─── 5. GET /infrastructure/utilities ────────────────────────────────────────

def get_infra_utilities(city: str = "Mumbai") -> InfraUtilities:
    raw  = load_infra_raw(city)
    util = raw["utilities"]
    pw   = util["power"]
    wt   = util["water"]
    sl   = util["street_lights"]
    gs   = util["gas"]

    def _net(name, label, value, unit, outages, efficiency, detail, health) -> UtilityNetwork:
        return UtilityNetwork(
            name=name,
            health_pct=round(health, 1),
            primary_metric_label=label,
            primary_metric_value=value,
            primary_metric_unit=unit,
            outages=outages,
            efficiency_pct=efficiency,
            detail=detail,
        )

    # Power health: penalise load and outages
    pw_health  = max(0, 100 - (pw["current_load_pct"] - 60) * 0.8 - pw["outages"] * 3)
    wt_health  = max(0, 100 - (wt["utilization_pct"] - 50) * 0.5 - wt["outages"] * 4)
    sl_health  = sl["online_pct"]
    gs_health  = max(0, 100 - (gs["utilization_pct"] - 40) * 0.4 - gs["incidents"] * 5)

    networks = [
        _net("Power Grid",     "Load",        pw["current_load_pct"], "%",  pw["outages"], pw["efficiency_pct"],
             f"{pw['substations_online']}/{pw['substations_total']} substations online · {pw['active_load_mw']} MW", pw_health),
        _net("Water Network",  "Utilization", wt["utilization_pct"],  "%",  wt["outages"], round(100 - wt["leakage_pct"], 1),
             f"{wt['pump_stations_online']}/{wt['pump_stations_total']} pump stations · {wt['leakage_pct']}% leakage", wt_health),
        _net("Street Lighting","Online",      sl["online_pct"],       "%",  sl["faults"],  round(sl["online_pct"], 1),
             f"{sl['nodes_online']:,}/{sl['nodes_total']:,} nodes · {sl['energy_kwh_daily']} kWh/day", sl_health),
        _net("Gas Network",    "Utilization", gs["utilization_pct"],  "%",  gs["incidents"], round(100 - gs["utilization_pct"] * 0.1, 1),
             f"{gs['active_lines']}/{gs['distribution_lines']} lines · {gs['pressure_bar']} bar", gs_health),
    ]

    return InfraUtilities(
        networks=networks,
        power_load_pct=pw["current_load_pct"],
        water_utilization_pct=wt["utilization_pct"],
        streetlights_online_pct=sl["online_pct"],
        gas_utilization_pct=gs["utilization_pct"],
        total_outages=pw["outages"] + wt["outages"] + sl["faults"] + gs["incidents"],
    )


# ─── 6. GET /infrastructure/risks ────────────────────────────────────────────

_RISK_RULES = [
    # (title, rule_fn, severity, message_fn, value_fn, threshold)
    ("Power Grid Overload",
     lambda a, u: u["power"]["current_load_pct"] > 90,
     "Critical",
     lambda a, u: f"Power grid at {u['power']['current_load_pct']}% load. Substation capacity risk imminent.",
     lambda a, u: u["power"]["current_load_pct"], 90.0,
     "PW001", "Power Grid"),
    ("Water System Pressure Drop",
     lambda a, u: u["water"]["utilization_pct"] > 95,
     "Critical",
     lambda a, u: f"Water utilization at {u['water']['utilization_pct']}%. Supply disruption risk.",
     lambda a, u: u["water"]["utilization_pct"], 95.0,
     "WT001", "Water Network"),
]


def get_infra_risks(city: str = "Mumbai") -> List[InfraRisk]:
    raw    = load_infra_raw(city)
    assets = {a["asset_id"]: a for a in raw["assets"]}
    util   = raw["utilities"]
    risks: List[InfraRisk] = []

    # Asset-level risks from health scores
    for raw_asset in raw["assets"]:
        hs = raw_asset["health_score"]
        aname = raw_asset["asset_name"]
        atype = raw_asset["type"]
        aid   = raw_asset["asset_id"]
        issue = raw_asset.get("issue") or ""

        if hs < 50:
            risks.append(InfraRisk(
                severity="Critical",
                title=f"Structural failure risk: {aname}",
                message=f"{aname} ({atype}) at {hs}% health — imminent failure risk. {issue}",
                asset_id=aid, asset_name=aname, value=hs, threshold=50.0,
            ))
        elif hs < 60:
            risks.append(InfraRisk(
                severity="High",
                title=f"Asset degradation: {aname}",
                message=f"{aname} ({atype}) health {hs}% below safe threshold. Maintenance required. {issue}",
                asset_id=aid, asset_name=aname, value=hs, threshold=60.0,
            ))

    # Utility-level risks
    pw = util["power"]
    if pw["current_load_pct"] > 90:
        risks.append(InfraRisk(
            severity="Critical", title="Power Grid Overload",
            message=f"Grid load at {pw['current_load_pct']}% — {pw['outages']} outage(s) active. Substation capacity at risk.",
            asset_id="PW001", asset_name="Power Grid", value=pw["current_load_pct"], threshold=90.0,
        ))
    elif pw["current_load_pct"] > 80:
        risks.append(InfraRisk(
            severity="High", title="Power Grid High Load",
            message=f"Grid load at {pw['current_load_pct']}%. Approaching critical threshold (90%).",
            asset_id="PW001", asset_name="Power Grid", value=pw["current_load_pct"], threshold=80.0,
        ))

    wt = util["water"]
    if wt["utilization_pct"] > 95:
        risks.append(InfraRisk(
            severity="Critical", title="Water Network Capacity Risk",
            message=f"Water utilization at {wt['utilization_pct']}%. Supply disruption imminent.",
            asset_id="WT001", asset_name="Water Network", value=wt["utilization_pct"], threshold=95.0,
        ))

    # Sort: Critical → High → rest
    order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    risks.sort(key=lambda r: (order.get(r.severity, 9), -r.value))
    return risks


# ─── 7. GET /infrastructure/forecast ─────────────────────────────────────────

def get_infra_forecast(city: str = "Mumbai") -> List[InfraForecastItem]:
    raw    = load_infra_raw(city)
    assets = [_build_asset(a) for a in raw["assets"]]
    util   = raw["utilities"]
    items: List[InfraForecastItem] = []

    # Most at-risk assets get failure predictions
    at_risk = sorted([a for a in assets if a.health_score < 70], key=lambda a: a.health_score)

    for a in at_risk[:6]:   # top 6 worst assets
        pct  = round(_failure_risk(a.health_score, bool(a.issue)), 0)
        days = 7 if a.health_score < 50 else (14 if a.health_score < 60 else 30)
        conf = min(95, int(pct * 0.95))
        reco = (
            "Emergency inspection and repair required immediately."
            if a.health_score < 50 else
            f"Schedule maintenance within {days} days to prevent failure."
        )
        items.append(InfraForecastItem(
            asset_id=a.asset_id,
            asset=a.asset_name,
            type=a.type,
            sector=a.sector,
            prediction=f"{int(pct)}% probability of failure within {days} days. {a.issue or 'Degradation detected.'}",
            confidence=conf,
            horizon=f"Next {days} days",
            recommendation=reco,
        ))

    # Utility forecasts
    pw = util["power"]
    if pw["current_load_pct"] > 75:
        items.append(InfraForecastItem(
            asset_id="PW_SYS",
            asset="Power Grid (City-wide)",
            type="Power Grid",
            sector="City-wide",
            prediction=f"Grid load trending toward capacity ceiling. At {pw['current_load_pct']}% load, projected to hit 95% within 10 days at current growth rate.",
            confidence=82,
            horizon="Next 10 days",
            recommendation="Pre-activate demand-response protocols. Inspect Substation 7 and T-3 line immediately.",
        ))

    wt = util["water"]
    if wt["leakage_pct"] > 3.5:
        items.append(InfraForecastItem(
            asset_id="WT_SYS",
            asset="Water Network (City-wide)",
            type="Water Network",
            sector="City-wide",
            prediction=f"Network leakage at {wt['leakage_pct']}%. Without repair, projected to reach 7% within 60 days causing supply deficit.",
            confidence=76,
            horizon="Next 60 days",
            recommendation="Prioritise repair of Water Main WM-17 and Pump Station 12. Deploy leak detection survey.",
        ))

    return items
