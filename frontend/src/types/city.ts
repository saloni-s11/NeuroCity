// ─── Sector status helpers ────────────────────────────────────────────────────
// Mirrors Python sector_status_label() logic exactly.

export type SectorStatus = "Healthy" | "Warning" | "Critical";

export function getSectorStatus(sector: Sector): SectorStatus {
  if (sector.traffic > 85 || sector.aqi > 150 || sector.infrastructure_health < 60)
    return "Critical";
  if (sector.traffic > 70 || sector.aqi > 100 || sector.infrastructure_health < 80)
    return "Warning";
  return "Healthy";
}

export const STATUS_COLORS: Record<SectorStatus, string> = {
  Healthy:  "var(--color-success)",
  Warning:  "var(--color-traffic)",
  Critical: "var(--color-risk)",
};

// ─── Sector ──────────────────────────────────────────────────────────────────

export interface Sector {
  sector_id: string;
  sector_name: string;
  traffic: number;
  aqi: number;
  energy_usage: number;
  population: number;
  infrastructure_health: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardResponse {
  city: string;
  sectors: Sector[];
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface CityMetrics {
  avg_traffic: number;
  avg_aqi: number;
  total_population: number;
  avg_infrastructure_health: number;
  total_energy_usage: number;
  city_health_score: number;
  sustainability_score: number;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
export type AlertType = "Traffic" | "Pollution" | "Infrastructure";

export interface CityAlert {
  sector_id: string;
  sector: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
}

// ─── Insights (Dashboard executive summaries) ────────────────────────────────

export type InsightTag =
  | "Traffic"
  | "Environment"
  | "Infrastructure"
  | "Energy"
  | "City Health"
  | "Scenario";

export interface CityInsight {
  title: string;
  description: string;
  confidence: number;
  tag: InsightTag;
}

// ─── Predictions (Digital Twin operational forecasts) ────────────────────────

export type PredictionTag =
  | "Traffic"
  | "Environment"
  | "Infrastructure"
  | "Energy"
  | "City Health";

export interface CityPrediction {
  title: string;
  description: string;
  confidence: number;
  tag: PredictionTag;
  horizon: string; // e.g. "Next 2h", "Tomorrow"
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  city: string;
  city_health: number;
  sustainability: number;
  active_alerts: number;
  ai_confidence: number;
}

// ─── Digital Twin Metrics ─────────────────────────────────────────────────────

export interface DigitalTwinMetrics {
  city_health: number;
  active_alerts: number;
  healthy_sectors: number;
  warning_sectors: number;
  critical_sectors: number;
  total_sectors: number;
}

// ─── Traffic Intelligence ─────────────────────────────────────────────────────

export type CongestionLevel = "Free" | "Moderate" | "Heavy" | "Severe";

export interface TrafficCorridor {
  id: string;
  name: string;
  from_: string;
  to: string;
  sector_id: string;
  current_speed_kmh: number;
  free_flow_speed_kmh: number;
  volume: number;
  capacity: number;
  incidents: number;
  signal_count: number;
  congestion_index: number;
  congestion_level: CongestionLevel;
  delay_minutes: number;
}

export interface HourlyFlow {
  hour: string;
  volume: number;
  avg_speed: number;
}

export interface WeeklyTrend {
  day: string;
  avg_index: number;
  peak_hour: string;
  incidents: number;
}

export interface TrafficOverview {
  corridors: TrafficCorridor[];
  hourly_flow: HourlyFlow[];
  weekly_trend: WeeklyTrend[];
  data_source: string;
}

export interface TrafficKPIs {
  avg_speed_kmh: number;
  congestion_index: number;
  avg_commute_minutes: number;
  active_incidents: number;
  corridors_severe: number;
  corridors_heavy: number;
  network_efficiency_pct: number;
}

export interface TrafficHotspot {
  corridor_id: string;
  corridor_name: string;
  sector_id: string;
  congestion_index: number;
  severity: CongestionLevel;
  delay_minutes: number;
  volume_to_capacity: number;
  incidents: number;
  recommendation: string;
}

export interface RouteRecommendation {
  id: string;
  origin: string;
  destination: string;
  current_route: string;
  current_duration_min: number;
  recommended_route: string;
  recommended_duration_min: number;
  time_saving_min: number;
  reason: string;
  valid_until: string;
}

export interface ForecastPoint {
  hour: string;
  predicted_volume: number;
  predicted_speed: number;
  congestion_index: number;
  confidence: number;
}

export interface TrafficForecast {
  generated_at: string;
  horizon_hours: number;
  points: ForecastPoint[];
  peak_hour: string;
  peak_congestion_index: number;
  model: string;
}

// ─── Environment Intelligence ─────────────────────────────────────────────────

export type AqiStatus =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive Groups"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

export interface PollutionSector {
  sector_id: string;
  sector_name: string;
  aqi: number;
  pm25: number;
  pm10: number;
  co2: number;
  no2: number;
  so2: number;
  o3: number;
  temperature: number;
  humidity: number;
  noise_level: number;
  wind_speed_kmh: number;
  aqi_status: AqiStatus;
}

export interface EnvOverview {
  aqi: number;
  temperature: number;
  humidity: number;
  co2: number;
  pm25: number;
  pm10: number;
  noise_level: number;
  aqi_status: AqiStatus;
  data_source: string;
}

export interface EnvHotspot {
  sector_id: string;
  sector: string;
  aqi: number;
  pm25: number;
  co2: number;
  temperature: number;
  aqi_status: AqiStatus;
  risk_score: number;
}

export interface EnvTrendPoint {
  day: string;
  aqi: number;
  temperature: number;
  humidity: number;
  co2: number;
}

export interface EnvRisk {
  type: string;
  severity: string;
  sector: string;
  message: string;
  value: number;
  threshold: number;
}

export interface EnvForecastItem {
  title: string;
  description: string;
  confidence: number;
  tag: string;
  horizon: string;
  type: "Risk" | "Opportunity";
}

// ─── Sustainability ──────────────────────────────────────────────────────────

export interface SectorHealthDetail {
  sector_id: string;
  sector_name: string;
  health_score: number;
  traffic_score: number;
  aqi_score: number;
  infra_score: number;
  energy_score: number;
  status: SectorStatus;
}

export interface SustainabilityHealthScore {
  overall_score: number;
  grade: string;
  description: string;
  sector_details: SectorHealthDetail[];
  components: {
    infrastructure: number;
    traffic: number;
    air_quality: number;
    energy_efficiency: number;
  };
}

export interface EnvironmentalMetrics {
  renewable_mix_pct: number;
  carbon_footprint: number;
  carbon_target: number;
  water_efficiency_pct: number;
  waste_diversion_pct: number;
  green_cover_pct: number;
  ev_penetration_pct: number;
  energy_per_capita: number;
  aqi_avg: number;
  sustainability_index: number;
}

export interface MonthlyTrend {
  month: string;
  sustainability_score: number;
  environmental: number;
  mobility: number;
  resource_efficiency: number;
  infrastructure: number;
}

export interface PillarScore {
  name: string;
  score: number;
  benchmark: number;
  delta: number;
  trend: "improving" | "stable" | "declining";
}

export interface PeerCity {
  name: string;
  score: number;
  rank: number;
}

export interface SustainabilityPerformance {
  overall_score: number;
  trend_12m: MonthlyTrend[];
  pillars: PillarScore[];
  peer_comparison: PeerCity[];
  narrative: string;
}

// ─── Simulation ──────────────────────────────────────────────────────────────

export type SimulationScenario = "population_growth" | "ev_adoption" | "renewable_energy" | "climate_event";

export interface SimulationRequest {
  scenario: SimulationScenario;
  params: Record<string, any>;
}

export interface SimulationImpact {
  label: string;
  value: number;
  unit: string;
  delta_pct: number;
  tone: "positive" | "negative" | "neutral";
}

export interface SimulationResult {
  scenario: string;
  scenario_label: string;
  params: Record<string, any>;
  impacts: SimulationImpact[];
  narrative: string;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  recommendations: string[];
}

export interface SimulationPreset {
  id: string;
  name: string;
  description: string;
  scenario: SimulationScenario;
  params: Record<string, any>;
  tags: string[];
}

// ─── Narration ───────────────────────────────────────────────────────────────

export interface TrendExplanation {
  metric: string;
  direction: "rising" | "falling" | "stable";
  value: number;
  explanation: string;
  icon_hint: "up" | "down" | "neutral";
}

export interface NarrationBriefing {
  executive_summary: string;
  city_health: number;
  timestamp: string;
  trends: TrendExplanation[];
  key_risks: string[];
  opportunities: string[];
}

export interface NarrationRecommendation {
  id: string;
  title: string;
  body: string;
  priority: "Critical" | "High" | "Strategic" | "Policy";
  impact: number;
  confidence: number;
  category: "Traffic" | "Environment" | "Infrastructure" | "Energy";
  action_type: "immediate" | "short_term" | "long_term";
  estimated_benefit: string;
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export interface YearData {
  year: number;
  population_m: number;
  infra_score: number;
  traffic_index: number;
  pollution_index: number;
  energy_gw: number;
  sustainability_score: number;
  ev_pct: number;
  renewable_pct: number;
  green_cover_pct: number;
}

export interface TimelineProjection {
  start_year: number;
  end_year: number;
  data: YearData[];
  narrative: string;
}

export interface Scenario {
  name: string;
  description: string;
  color: string;
  data: YearData[];
}

export interface ScenarioComparison {
  scenarios: Scenario[];
  analysis: string;
}

export interface Milestone {
  year: number;
  title: string;
  description: string;
  category: string;
  impact: "positive" | "negative" | "neutral";
  icon_hint: string;
}

// ─── Infrastructure Intelligence ──────────────────────────────────────────────

export interface InfraAsset {
  asset_id: string;
  asset_name: string;
  type: string;
  sector: string;
  health_score: number;
  status: "Healthy" | "Warning" | "Critical";
  risk_level: "Low" | "Medium" | "High";
  last_inspection: string;
  issue: string | null;
}

export interface InfraOverview {
  health_score: number;
  critical_assets: number;
  warning_assets: number;
  healthy_assets: number;
  total_assets: number;
  maintenance_tasks: number;
  predicted_failures: number;
}

export interface InfraHotspot {
  asset_id: string;
  asset_name: string;
  type: string;
  sector: string;
  health_score: number;
  status: string;
  risk_level: string;
  issue: string | null;
  failure_risk_pct: number;
}

export interface MaintenanceItem {
  asset_id: string;
  asset: string;
  type: string;
  sector: string;
  health_score: number;
  priority: "Critical" | "High" | "Normal";
  issue: string | null;
  eta: string;
  last_inspection: string;
}

export interface UtilityNetwork {
  name: string;
  health_pct: number;
  primary_metric_label: string;
  primary_metric_value: number;
  primary_metric_unit: string;
  outages: number;
  efficiency_pct: number;
  detail: string;
}

export interface InfraUtilities {
  networks: UtilityNetwork[];
  power_load_pct: number;
  water_utilization_pct: number;
  streetlights_online_pct: number;
  gas_utilization_pct: number;
  total_outages: number;
}

export interface InfraRisk {
  severity: string;
  title: string;
  message: string;
  asset_id: string;
  asset_name: string;
  value: number;
  threshold: number;
}

export interface InfraForecastItem {
  asset_id: string;
  asset: string;
  type: string;
  sector: string;
  prediction: string;
  confidence: number;
  horizon: string;
  recommendation: string;
}
