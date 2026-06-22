from pydantic import BaseModel
from typing import List, Optional


class Sector(BaseModel):
    sector_id: str
    sector_name: str
    traffic: float
    aqi: float
    energy_usage: float
    population: int
    infrastructure_health: float


class DashboardResponse(BaseModel):
    city: str
    sectors: List[Sector]


class CityMetrics(BaseModel):
    avg_traffic: float
    avg_aqi: float
    total_population: int
    avg_infrastructure_health: float
    total_energy_usage: float
    city_health_score: float
    sustainability_score: float


class Alert(BaseModel):
    sector_id: str
    sector: str
    type: str
    severity: str
    message: str


class Insight(BaseModel):
    title: str
    description: str
    confidence: int
    tag: str


class DashboardSummary(BaseModel):
    city_health: float
    sustainability: float
    active_alerts: int
    ai_confidence: float
    city: str


# ─── Digital Twin models ──────────────────────────────────────────────────────

class Prediction(BaseModel):
    title: str
    description: str
    confidence: int
    tag: str
    horizon: str


class DigitalTwinMetrics(BaseModel):
    city_health: float
    active_alerts: int
    healthy_sectors: int
    warning_sectors: int
    critical_sectors: int
    total_sectors: int


# ─── Traffic Intelligence models ─────────────────────────────────────────────

class TrafficCorridor(BaseModel):
    id: str
    name: str
    from_: str
    to: str
    sector_id: str
    current_speed_kmh: float
    free_flow_speed_kmh: float
    volume: int
    capacity: int
    incidents: int
    signal_count: int
    congestion_index: float
    congestion_level: str
    delay_minutes: float


class HourlyFlow(BaseModel):
    hour: str
    volume: int
    avg_speed: float


class WeeklyTrend(BaseModel):
    day: str
    avg_index: float
    peak_hour: str
    incidents: int


class TrafficOverview(BaseModel):
    corridors: List[TrafficCorridor]
    hourly_flow: List[HourlyFlow]
    weekly_trend: List[WeeklyTrend]
    data_source: str


class TrafficKPIs(BaseModel):
    avg_speed_kmh: float
    congestion_index: float
    avg_commute_minutes: float
    active_incidents: int
    corridors_severe: int
    corridors_heavy: int
    network_efficiency_pct: float


class TrafficHotspot(BaseModel):
    corridor_id: str
    corridor_name: str
    sector_id: str
    congestion_index: float
    severity: str
    delay_minutes: float
    volume_to_capacity: float
    incidents: int
    recommendation: str


class RouteRecommendation(BaseModel):
    id: str
    origin: str
    destination: str
    current_route: str
    current_duration_min: float
    recommended_route: str
    recommended_duration_min: float
    time_saving_min: float
    reason: str
    valid_until: str


class ForecastPoint(BaseModel):
    hour: str
    predicted_volume: int
    predicted_speed: float
    congestion_index: float
    confidence: float


class TrafficForecast(BaseModel):
    generated_at: str
    horizon_hours: int
    points: List[ForecastPoint]
    peak_hour: str
    peak_congestion_index: float
    model: str


# ─── Environment Intelligence models ─────────────────────────────────────────

class PollutionSector(BaseModel):
    sector_id: str
    sector_name: str
    aqi: float
    pm25: float
    pm10: float
    co2: float
    no2: float
    so2: float
    o3: float
    temperature: float
    humidity: float
    noise_level: float
    wind_speed_kmh: float
    aqi_status: str


class EnvOverview(BaseModel):
    aqi: float
    temperature: float
    humidity: float
    co2: float
    pm25: float
    pm10: float
    noise_level: float
    aqi_status: str
    data_source: str


class EnvHotspot(BaseModel):
    sector_id: str
    sector: str
    aqi: float
    pm25: float
    co2: float
    temperature: float
    aqi_status: str
    risk_score: float


class EnvTrendPoint(BaseModel):
    day: str
    aqi: float
    temperature: float
    humidity: float
    co2: float


class EnvRisk(BaseModel):
    type: str
    severity: str
    sector: str
    message: str
    value: float
    threshold: float


class EnvForecastItem(BaseModel):
    title: str
    description: str
    confidence: int
    tag: str
    horizon: str
    type: str


# ─── Infrastructure Intelligence models ──────────────────────────────────────

class InfraAsset(BaseModel):
    asset_id: str
    asset_name: str
    type: str
    sector: str
    health_score: float
    status: str
    risk_level: str
    last_inspection: str
    issue: Optional[str] = None


class InfraOverview(BaseModel):
    health_score: float
    critical_assets: int
    warning_assets: int
    healthy_assets: int
    total_assets: int
    maintenance_tasks: int
    predicted_failures: int


class InfraHotspot(BaseModel):
    asset_id: str
    asset_name: str
    type: str
    sector: str
    health_score: float
    status: str
    risk_level: str
    issue: Optional[str]
    failure_risk_pct: float


class MaintenanceItem(BaseModel):
    asset_id: str
    asset: str
    type: str
    sector: str
    health_score: float
    priority: str
    issue: Optional[str]
    eta: str
    last_inspection: str


class UtilityNetwork(BaseModel):
    name: str
    health_pct: float
    primary_metric_label: str
    primary_metric_value: float
    primary_metric_unit: str
    outages: int
    efficiency_pct: float
    detail: str


class InfraUtilities(BaseModel):
    networks: List[UtilityNetwork]
    power_load_pct: float
    water_utilization_pct: float
    streetlights_online_pct: float
    gas_utilization_pct: float
    total_outages: int


class InfraRisk(BaseModel):
    severity: str
    title: str
    message: str
    asset_id: str
    asset_name: str
    value: float
    threshold: float


class InfraForecastItem(BaseModel):
    asset_id: str
    asset: str
    type: str
    sector: str
    prediction: str
    confidence: int
    horizon: str
    recommendation: str


# ─── Sustainability models ────────────────────────────────────────────────────

class SectorHealthDetail(BaseModel):
    sector_id: str
    sector_name: str
    health_score: float
    traffic_score: float
    aqi_score: float
    infra_score: float
    energy_score: float
    status: str


class SustainabilityHealthScore(BaseModel):
    overall_score: float
    grade: str
    description: str
    sector_details: List[SectorHealthDetail]
    components: dict


class EnvironmentalMetrics(BaseModel):
    renewable_mix_pct: float
    carbon_footprint: float
    carbon_target: float
    water_efficiency_pct: float
    waste_diversion_pct: float
    green_cover_pct: float
    ev_penetration_pct: float
    energy_per_capita: float
    aqi_avg: float
    sustainability_index: float


class MonthlyTrend(BaseModel):
    month: str
    sustainability_score: float
    environmental: float
    mobility: float
    resource_efficiency: float
    infrastructure: float


class PillarScore(BaseModel):
    name: str
    score: float
    benchmark: float
    delta: float
    trend: str


class PeerCity(BaseModel):
    name: str
    score: float
    rank: int


class SustainabilityPerformance(BaseModel):
    overall_score: float
    trend_12m: List[MonthlyTrend]
    pillars: List[PillarScore]
    peer_comparison: List[PeerCity]
    narrative: str


# ─── Simulation models ───────────────────────────────────────────────────────

class SimulationRequest(BaseModel):
    scenario: str
    params: dict


class SimulationImpact(BaseModel):
    label: str
    value: float
    unit: str
    delta_pct: float
    tone: str


class SimulationResult(BaseModel):
    scenario: str
    scenario_label: str
    params: dict
    impacts: List[SimulationImpact]
    narrative: str
    risk_level: str
    confidence: int
    recommendations: List[str]


class SimulationPreset(BaseModel):
    id: str
    name: str
    description: str
    scenario: str
    params: dict
    tags: List[str]


# ─── Narration models ────────────────────────────────────────────────────────

class TrendExplanation(BaseModel):
    metric: str
    direction: str
    value: float
    explanation: str
    icon_hint: str


class NarrationBriefing(BaseModel):
    executive_summary: str
    city_health: float
    timestamp: str
    trends: List[TrendExplanation]
    key_risks: List[str]
    opportunities: List[str]


class NarrationRecommendation(BaseModel):
    id: str
    title: str
    body: str
    priority: str
    impact: int
    confidence: int
    category: str
    action_type: str
    estimated_benefit: str


# ─── Timeline models ─────────────────────────────────────────────────────────

class YearData(BaseModel):
    year: int
    population_m: float
    infra_score: float
    traffic_index: float
    pollution_index: float
    energy_gw: float
    sustainability_score: float
    ev_pct: float
    renewable_pct: float
    green_cover_pct: float


class TimelineProjection(BaseModel):
    start_year: int
    end_year: int
    data: List[YearData]
    narrative: str


class Scenario(BaseModel):
    name: str
    description: str
    color: str
    data: List[YearData]


class ScenarioComparison(BaseModel):
    scenarios: List[Scenario]
    analysis: str


class Milestone(BaseModel):
    year: int
    title: str
    description: str
    category: str
    impact: str
    icon_hint: str
