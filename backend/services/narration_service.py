"""
NarrationService
================
AI narration engine — now powered by Groq LLM with rule-based fallback.

Primary path  : Groq (llama-3.3-70b-versatile) generates rich human-readable
                briefings and recommendations from live city metrics.
Fallback path : Rule-based generation if GROQ_API_KEY is unset or the call fails.

All outputs are structured for direct UI rendering.
"""

import json
import os
from datetime import datetime
from typing import List

from models.city import (
    NarrationBriefing,
    NarrationRecommendation,
    Sector,
    TrendExplanation,
)

_CITY_PATH      = os.path.join(os.path.dirname(__file__), "..", "data", "city_state.json")
_POLLUTION_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "pollution_data.json")


def _load_sectors(city: str) -> List[Sector]:
    from services.city_service import load_sectors
    return load_sectors(city=city)


def _load_pollution(city: str) -> dict:
    from services.environment_service import load_pollution_raw
    return load_pollution_raw(city=city)


def _avg(vals: List[float]) -> float:
    return round(sum(vals) / len(vals), 1) if vals else 0.0


# ─── Groq client (lazy init) ─────────────────────────────────────────────────

_groq_client = None

def _get_groq():
    global _groq_client
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return None
    if _groq_client is None:
        try:
            from groq import Groq
            _groq_client = Groq(api_key=api_key)
        except Exception:
            return None
    return _groq_client


def _groq_chat(prompt: str, system: str, model: str = "llama-3.3-70b-versatile") -> str | None:
    """Call Groq and return the text content, or None if unavailable."""
    client = _get_groq()
    if client is None:
        return None
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.4,
            max_tokens=1024,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Groq] call failed: {e}")
        return None


# ─── Context builder (shared by both endpoints) ──────────────────────────────

def _build_context(city: str) -> dict:
    sectors     = _load_sectors(city)
    pollution   = _load_pollution(city)
    poll_s      = pollution["sectors"]
    hist        = pollution["historical_14d"]

    avg_traffic = _avg([s.traffic for s in sectors])
    avg_aqi     = _avg([s.aqi for s in sectors])
    avg_infra   = _avg([s.infrastructure_health for s in sectors])
    total_energy = sum(s.energy_usage for s in sectors)
    total_pop   = sum(s.population for s in sectors)
    avg_co2     = _avg([s["co2"] for s in poll_s])
    avg_temp    = _avg([s["temperature"] for s in poll_s])

    traffic_score = max(0, 100 - avg_traffic)
    aqi_score     = max(0, 100 - avg_aqi / 3)
    city_health   = round(avg_infra * 0.45 + traffic_score * 0.30 + aqi_score * 0.25, 1)
    city_health   = min(100, max(0, city_health))

    critical = [s for s in sectors if s.traffic > 85 or s.aqi > 150 or s.infrastructure_health < 60]
    warning  = [s for s in sectors if not (s.traffic > 85 or s.aqi > 150 or s.infrastructure_health < 60)
                and (s.traffic > 70 or s.aqi > 100 or s.infrastructure_health < 80)]

    return dict(
        city=city, sectors=sectors, poll_s=poll_s, hist=hist,
        avg_traffic=avg_traffic, avg_aqi=avg_aqi, avg_infra=avg_infra,
        total_energy=total_energy, total_pop=total_pop,
        avg_co2=avg_co2, avg_temp=avg_temp, city_health=city_health,
        critical=critical, warning=warning,
    )


# ─── Groq-powered briefing ────────────────────────────────────────────────────

def _groq_briefing(ctx: dict) -> str | None:
    city = ctx["city"]
    system = (
        "You are NeuroCity AI, an urban intelligence system. "
        "Write concise, data-driven executive briefings for city administrators. "
        "Be factual, direct, and professional. 3-4 sentences max."
    )
    prompt = (
        f"Generate an executive briefing for {city}.\n"
        f"City health score: {ctx['city_health']}/100\n"
        f"Traffic index: {ctx['avg_traffic']} | AQI: {ctx['avg_aqi']} | "
        f"Infrastructure health: {ctx['avg_infra']}%\n"
        f"Temperature: {ctx['avg_temp']}°C | CO₂: {ctx['avg_co2']} ppm | "
        f"Energy demand: {round(ctx['total_energy'], 1)} units\n"
        f"Population: {round(ctx['total_pop']/1_000_000, 2)}M\n"
        f"Critical sectors: {len(ctx['critical'])} | Warning sectors: {len(ctx['warning'])}\n"
        f"Write a 3-4 sentence executive briefing summarising city status, "
        f"key risks, and recommended focus areas."
    )
    return _groq_chat(prompt, system)


def _groq_recommendations(ctx: dict) -> list[dict] | None:
    """Ask Groq to generate 4-6 ranked recommendations as JSON."""
    city = ctx["city"]
    system = (
        "You are NeuroCity AI. Generate ranked, actionable infrastructure recommendations "
        "for city administrators as a JSON array. Each item must have: "
        "id (string), title (string), body (string, 2 sentences), priority (Critical|High|Strategic|Policy), "
        "impact (0-100 int), confidence (0-100 int), category (Traffic|Environment|Infrastructure|Energy), "
        "action_type (immediate|short_term|long_term), estimated_benefit (string). "
        "Return ONLY valid JSON, no markdown."
    )
    prompt = (
        f"City: {city} | Health: {ctx['city_health']}/100\n"
        f"Traffic index: {ctx['avg_traffic']} | AQI: {ctx['avg_aqi']} | "
        f"Infra health: {ctx['avg_infra']}% | Energy: {round(ctx['total_energy'],1)} units\n"
        f"Temp: {ctx['avg_temp']}°C | CO₂: {ctx['avg_co2']} ppm\n"
        f"Generate 5 ranked recommendations for {city}. Return only JSON array."
    )
    raw = _groq_chat(prompt, system)
    if not raw:
        return None
    try:
        # Strip markdown fences if model adds them
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        print(f"[Groq] JSON parse failed: {e}")
        return None


# ─── Rule-based fallback ──────────────────────────────────────────────────────

def _rule_based_summary(ctx: dict) -> str:
    c = ctx
    time_greeting = "morning" if datetime.now().hour < 12 else "afternoon" if datetime.now().hour < 17 else "evening"
    parts = [f"Good {time_greeting}. {c['city']} is operating at {c['city_health']}/100 health score. "]
    if c["critical"]:
        names = ", ".join(s.sector_name for s in c["critical"][:3])
        parts.append(f"{len(c['critical'])} sector(s) ({names}) are in critical status. ")
    if c["avg_traffic"] > 75:
        parts.append(f"City-wide traffic congestion is elevated at index {c['avg_traffic']}. ")
    if c["avg_aqi"] > 120:
        parts.append(f"Air quality requires attention — average AQI of {c['avg_aqi']}. ")
    if c["avg_infra"] < 80:
        parts.append(f"Infrastructure health at {c['avg_infra']}% warrants accelerated maintenance. ")
    parts.append(f"Total energy demand: {round(c['total_energy'],1)} units, {round(c['total_pop']/1_000_000,2)}M residents.")
    return "".join(parts)


# ─── GET /narration/briefing ──────────────────────────────────────────────────

def get_briefing(city: str = "Mumbai") -> NarrationBriefing:
    ctx     = _build_context(city)
    sectors = ctx["sectors"]
    hist    = ctx["hist"]

    # Try Groq for executive summary
    groq_summary = _groq_briefing(ctx)
    executive_summary = groq_summary if groq_summary else _rule_based_summary(ctx)

    # Trends (always rule-based for structure)
    trends: List[TrendExplanation] = []

    traffic_dir = "rising" if ctx["avg_traffic"] > 70 else "stable" if ctx["avg_traffic"] > 50 else "falling"
    trends.append(TrendExplanation(
        metric="Traffic Congestion", direction=traffic_dir, value=ctx["avg_traffic"],
        explanation=(
            f"{city} city-wide traffic index at {ctx['avg_traffic']}. "
            f"{'Peak-hour congestion above critical levels. Signal optimisation recommended.' if ctx['avg_traffic'] > 75 else 'Traffic within manageable range.'}"
        ),
        icon_hint="up" if traffic_dir == "rising" else "down" if traffic_dir == "falling" else "neutral",
    ))

    recent_aqi = [d["aqi"] for d in hist[-7:]]
    older_aqi  = [d["aqi"] for d in hist[:7]]
    aqi_dir    = "rising" if _avg(recent_aqi) > _avg(older_aqi) + 5 else "falling" if _avg(recent_aqi) < _avg(older_aqi) - 5 else "stable"
    trends.append(TrendExplanation(
        metric="Air Quality (AQI)", direction=aqi_dir, value=ctx["avg_aqi"],
        explanation=(
            f"Average AQI in {city} is {ctx['avg_aqi']}. "
            f"14-day trend is {'deteriorating' if aqi_dir == 'rising' else 'improving' if aqi_dir == 'falling' else 'fluctuating'}. "
            f"{'Public advisory consideration required.' if ctx['avg_aqi'] > 150 else 'Within manageable limits.'}"
        ),
        icon_hint="up" if aqi_dir == "rising" else "down" if aqi_dir == "falling" else "neutral",
    ))

    infra_dir = "stable" if ctx["avg_infra"] >= 78 else "falling"
    trends.append(TrendExplanation(
        metric="Infrastructure Health", direction=infra_dir, value=ctx["avg_infra"],
        explanation=(
            f"Average infrastructure health in {city}: {ctx['avg_infra']}%. "
            f"{'All sectors within thresholds.' if ctx['avg_infra'] >= 80 else 'Maintenance acceleration recommended.'}"
        ),
        icon_hint="neutral" if infra_dir == "stable" else "down",
    ))

    n = len(sectors)
    energy_dir = "rising" if ctx["total_energy"] > n * 70 else "stable"
    trends.append(TrendExplanation(
        metric="Energy Consumption", direction=energy_dir, value=round(ctx["total_energy"], 1),
        explanation=(
            f"Total energy usage in {city}: {round(ctx['total_energy'],1)} units. "
            f"{'High-consumption sectors approaching grid capacity.' if ctx['total_energy'] > n * 75 else 'Within distribution capacity.'}"
        ),
        icon_hint="up" if energy_dir == "rising" else "neutral",
    ))

    recent_temp = [d["temperature"] for d in hist[-5:]]
    temp_dir = "rising" if _avg(recent_temp) > 33 else "stable" if _avg(recent_temp) > 30 else "falling"
    trends.append(TrendExplanation(
        metric="Temperature", direction=temp_dir, value=ctx["avg_temp"],
        explanation=(
            f"Average temperature in {city}: {ctx['avg_temp']}°C. "
            f"{'Heat stress protocols advised for outdoor workers.' if ctx['avg_temp'] > 34 else 'Conditions normal.'}"
        ),
        icon_hint="up" if temp_dir == "rising" else "neutral",
    ))

    # Key risks and opportunities
    key_risks: List[str] = []
    if ctx["avg_aqi"] > 150:
        key_risks.append(f"Critical air quality in {len([s for s in sectors if s.aqi > 150])} sectors — advisory recommended")
    if ctx["avg_traffic"] > 80:
        key_risks.append(f"Severe congestion — {len([s for s in sectors if s.traffic > 80])} corridors above threshold")
    worst_infra = min(sectors, key=lambda s: s.infrastructure_health)
    if worst_infra.infrastructure_health < 70:
        key_risks.append(f"Infrastructure degradation in {worst_infra.sector_name} ({worst_infra.infrastructure_health}%)")
    if ctx["avg_temp"] > 35:
        key_risks.append(f"Heat wave conditions in {city} — elder advisory recommended")
    if not key_risks:
        key_risks.append("No critical risks — all systems within normal parameters")

    opportunities: List[str] = []
    clean = [s for s in sectors if s.aqi < 80]
    if clean:
        opportunities.append(f"{len(clean)} sector(s) with good air quality — ideal for outdoor maintenance")
    if ctx["avg_infra"] > 85:
        opportunities.append("Strong infrastructure foundation enables smart-city deployments")
    low_t = [s for s in sectors if s.traffic < 50]
    if low_t:
        opportunities.append(f"{len(low_t)} sector(s) with low congestion — consider re-routing")

    return NarrationBriefing(
        executive_summary=executive_summary,
        city_health=ctx["city_health"],
        timestamp=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        trends=trends,
        key_risks=key_risks,
        opportunities=opportunities,
    )


# ─── GET /narration/recommendations ──────────────────────────────────────────

def get_recommendations(city: str = "Mumbai") -> List[NarrationRecommendation]:
    ctx     = _build_context(city)
    sectors = ctx["sectors"]

    # Try Groq
    groq_data = _groq_recommendations(ctx)
    if groq_data:
        recs = []
        for i, item in enumerate(groq_data[:6]):
            try:
                recs.append(NarrationRecommendation(
                    id=item.get("id", f"REC-{i+1:03d}"),
                    title=item.get("title", "Recommendation"),
                    body=item.get("body", ""),
                    priority=item.get("priority", "High"),
                    impact=int(item.get("impact", 70)),
                    confidence=int(item.get("confidence", 75)),
                    category=item.get("category", "Infrastructure"),
                    action_type=item.get("action_type", "short_term"),
                    estimated_benefit=item.get("estimated_benefit", ""),
                ))
            except Exception:
                continue
        if recs:
            recs.sort(key=lambda r: r.impact * r.confidence / 100, reverse=True)
            return recs

    # Rule-based fallback
    recs: List[NarrationRecommendation] = []
    poll_s = ctx["poll_s"]

    high_aqi = sorted([s for s in poll_s if s["aqi"] > 130], key=lambda s: s["aqi"], reverse=True)
    if high_aqi:
        worst = high_aqi[0]
        recs.append(NarrationRecommendation(
            id="REC-001", title=f"Activate sprinkler grid in {worst['sector_name']}",
            body=(f"PM2.5 forecast to exceed safe limits in {worst['sector_name']} ({city}). "
                  f"Sprinkler activation reduces particulate exposure by 38%. AQI: {worst['aqi']}."),
            priority="Critical", impact=92, confidence=94, category="Environment",
            action_type="immediate", estimated_benefit="38% PM2.5 reduction in 4 hours",
        ))

    high_energy = sorted(sectors, key=lambda s: s.energy_usage, reverse=True)
    if high_energy and high_energy[0].energy_usage > 75:
        top = high_energy[0]
        recs.append(NarrationRecommendation(
            id="REC-002", title=f"Pre-cool transformers in {top.sector_name}",
            body=(f"Energy at {top.energy_usage} units in {top.sector_name}, {city}. "
                  f"Forecast heat peak. Pre-cooling prevents 2.1% load shedding."),
            priority="High", impact=78, confidence=88, category="Energy",
            action_type="immediate", estimated_benefit="Prevents load shedding",
        ))

    congested = sorted([s for s in sectors if s.traffic > 75], key=lambda s: s.traffic, reverse=True)
    if congested:
        top = congested[0]
        recs.append(NarrationRecommendation(
            id="REC-003", title=f"Deploy adaptive signals in {top.sector_name}",
            body=(f"Traffic index {top.traffic} in {top.sector_name}, {city}. "
                  f"Adaptive signal optimisation reduces delay by 22%."),
            priority="High", impact=74, confidence=86, category="Traffic",
            action_type="short_term", estimated_benefit="22% delay reduction",
        ))

    weak = sorted(sectors, key=lambda s: s.infrastructure_health)
    if weak[0].infrastructure_health < 80:
        b = weak[0]
        recs.append(NarrationRecommendation(
            id="REC-004", title=f"Schedule maintenance in {b.sector_name}",
            body=(f"Infrastructure at {b.infrastructure_health}% in {b.sector_name}, {city}. "
                  f"67% disruption probability within 7 days without intervention."),
            priority="Strategic", impact=86, confidence=81, category="Infrastructure",
            action_type="short_term", estimated_benefit="Prevents service disruption",
        ))

    recs.append(NarrationRecommendation(
        id="REC-005", title=f"Subsidise rooftop solar in {city}",
        body=(f"High-energy sectors in {city} can offset demand via rooftop solar. "
              f"220 MW capacity by 2028, ROI in 6 years."),
        priority="Policy", impact=70, confidence=79, category="Energy",
        action_type="long_term", estimated_benefit="220 MW added, 4.8% carbon cut",
    ))

    if ctx["avg_traffic"] > 65:
        recs.append(NarrationRecommendation(
            id="REC-006", title=f"Extend metro network in {city}",
            body=(f"Traffic index {ctx['avg_traffic']} in {city}. Metro extension reduces peak load by 11.2%. "
                  f"Capex ₹2,400 Cr, 4.2-year payback."),
            priority="Strategic", impact=82, confidence=77, category="Traffic",
            action_type="long_term", estimated_benefit="11.2% traffic reduction",
        ))

    recs.sort(key=lambda r: r.impact * r.confidence / 100, reverse=True)
    return recs
