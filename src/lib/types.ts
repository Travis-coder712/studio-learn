// ============================================================
// AURES Core Type Definitions
// ============================================================

export type Technology = 'wind' | 'solar' | 'bess' | 'hybrid' | 'pumped_hydro' | 'offshore_wind' | 'gas'
export type ProjectStatus = 'operating' | 'commissioning' | 'construction' | 'development' | 'withdrawn'
export type State = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT'
export type Confidence = 'high' | 'good' | 'medium' | 'low' | 'unverified'
export type DevelopmentStage = 'epbc_approved' | 'epbc_submitted' | 'planning_submitted' | 'early_stage'

export type TimelineEventType =
  | 'conceived' | 'planning_submitted' | 'planning_approved' | 'planning_rejected'
  | 'planning_modified' | 'ownership_change' | 'offtake_signed' | 'rez_access'
  | 'connection_milestone' | 'fid' | 'construction_start' | 'equipment_order'
  | 'energisation' | 'commissioning' | 'cod' | 'expansion'
  | 'cod_change' | 'cost_change' | 'capacity_change' | 'stakeholder_issue' | 'notable'

export interface SourceReference {
  title: string
  url: string
  date?: string
  source_tier?: 1 | 2 | 3 | 4 | 5
}

export interface TimelineEvent {
  date: string
  date_precision: 'day' | 'month' | 'quarter' | 'year'
  event_type: TimelineEventType
  title: string
  detail?: string
  sources: SourceReference[]
}

export interface OwnershipRecord {
  period: string
  owner: string
  role: string
  acquisition_value_aud?: number
  transaction_structure?: string
  source_url?: string
}

export interface CODHistoryEntry {
  date: string
  estimate: string
  source: string
  source_url?: string
}

export interface SupplierRecord {
  role: 'wind_oem' | 'bess_oem' | 'inverter' | 'bop' | 'epc' | 'syncon' | 'statcom' | 'harmonic_filter'
  supplier: string
  model?: string
  quantity?: number
  grid_forming?: boolean
  source_url?: string
}

export interface OfftakeRecord {
  party: string
  type: 'PPA' | 'CIS' | 'LTESA' | 'SIPS' | 'FCAS' | 'other'
  term_years?: number
  capacity_mw?: number
  source_url?: string
}

export interface SchemeContract {
  scheme: 'CIS' | 'LTESA'
  round: string
  capacity_mw?: number
  storage_mwh?: number
  contract_type?: string
  source_url?: string
}

export interface FieldSourceEntry {
  value: string | number
  source: string
  date: string
  tier?: number
  note?: string
}

export interface ProjectStage {
  stage: number
  name: string
  capacity_mw: number
  storage_mwh?: number
  status: ProjectStatus
  cod?: string
  cod_original?: string
  capex_aud_m?: number
  capex_source?: string
  oem?: string
  oem_model?: string
  grid_forming?: boolean
  notes?: string
}

export interface MultiSourceValue {
  value: string
  source: string
  source_url?: string
  date: string
  context?: string
  what_this_covers?: string
}

// ============================================================
// EIS / EIA Technical Specifications (Part 3, Section 3)
// ============================================================

export interface EISTechnicalSpec {
  // Document reference
  document_title: string
  document_url?: string
  document_year?: number

  // Wind farm specs
  turbine_model?: string
  turbine_count?: number
  turbine_rated_power_mw?: number
  hub_height_m?: number
  hub_height_note?: string
  rotor_diameter_m?: number

  // Wind resource (from EIS energy yield assessment)
  wind_speed_mean_ms?: number
  wind_speed_height_m?: number
  wind_speed_period?: string

  // Energy yield
  assumed_capacity_factor_pct?: number
  assumed_annual_energy_gwh?: number
  energy_yield_method?: string

  // Environmental
  noise_limit_dba?: number
  minimum_setback_m?: number

  // BESS specs
  cell_chemistry?: string               // "LFP", "NMC"
  cell_chemistry_full?: string          // "Lithium Iron Phosphate (LiFePO4)"
  cell_supplier?: string
  cell_country_of_manufacture?: string

  inverter_supplier?: string
  inverter_model?: string
  inverter_country_of_manufacture?: string
  inverter_rated_power_kw?: number
  inverter_count?: number

  pcs_type?: 'grid_forming' | 'grid_following' | 'both'
  round_trip_efficiency_pct?: number    // DC-DC
  round_trip_efficiency_ac?: number     // AC-AC
  duration_hours?: number

  // Grid connection
  connection_voltage_kv?: number
  transformer_mva?: number

  // Network connection point (drives transmission line capex)
  network_service_provider?: string         // e.g. "TransGrid", "AusNet", "ElectraNet", "Powerlink"
  connection_substation_name?: string       // e.g. "Eraring 330 kV substation"
  connection_substation_capacity_mva?: number
  connection_distance_km?: number           // km from project boundary to connection point
  connection_distance_note?: string         // e.g. "On-site — former power station substation reused"
  connection_augmentation?: string          // description of required network augmentation

  notes?: string
}

export interface Project {
  id: string
  name: string
  technology: Technology
  status: ProjectStatus
  capacity_mw: number
  storage_mwh?: number | null
  state: State
  rez?: string | null
  lga?: string
  coordinates?: { lat: number; lng: number }

  // Current ownership
  current_developer?: string
  current_operator?: string

  // History
  timeline: TimelineEvent[]
  ownership_history: OwnershipRecord[]
  cod_history: CODHistoryEntry[]

  // Current estimates
  cod_current?: string
  cod_original?: string
  cost_aud_million?: number
  cost_sources?: MultiSourceValue[]

  // Suppliers & equipment
  suppliers: SupplierRecord[]

  // Offtakes & contracts
  offtakes: OfftakeRecord[]
  scheme_contracts: SchemeContract[]

  // Grid connection
  connection_status?: string
  connection_nsp?: string
  grid_forming?: boolean
  has_sips?: boolean
  has_syncon?: boolean
  has_statcom?: boolean
  has_harmonic_filter?: boolean

  // Scores (pre-computed)
  development_score?: number
  performance_score?: number

  // Development sub-stage
  development_stage?: DevelopmentStage

  // Notable
  notable?: string
  stakeholder_issues?: string[]

  // EIS / EIA Technical Specifications (Part 3, Section 3)
  eis_specs?: EISTechnicalSpec

  // Capex
  capex_aud_m?: number
  capex_source?: string
  capex_year?: number

  // Per-field source provenance (multi-source tracking)
  field_sources?: Record<string, FieldSourceEntry[]>

  // Staged projects (e.g. Eraring Battery — multiple build stages)
  stages?: ProjectStage[]

  // Derated/partial operations (e.g. Waratah Super Battery — transformer failure)
  operational_capacity_mw?: number
  operational_capacity_note?: string

  // Metadata
  sources: SourceReference[]
  data_confidence: Confidence
  last_updated: string
  last_verified: string
  aemo_gen_info_id?: string
  first_seen?: string
}

// Performance data (Phase 3 preview — sample data)
export interface AnnualPerformance {
  year: number
  // Wind/Solar/Hybrid
  energy_price_received?: number  // $/MWh volume-weighted average
  curtailment_pct?: number        // % of potential generation curtailed
  capacity_factor_pct?: number    // % capacity utilisation
  // BESS
  avg_charge_price?: number       // $/MWh
  avg_discharge_price?: number    // $/MWh
  utilisation_pct?: number        // % of hours actively cycling
  cycles?: number                 // charge/discharge cycles
}

export interface ProjectPerformance {
  project_id: string
  ytd_price?: number              // $/MWh year-to-date (wind/solar)
  ytd_charge_price?: number       // $/MWh year-to-date (BESS)
  ytd_discharge_price?: number    // $/MWh year-to-date (BESS)
  ytd_period: string              // e.g. "Jan–Mar 2026"
  annual: AnnualPerformance[]
}

// Monthly performance data (per-project, from OpenElectricity)
export interface MonthlyPerformanceEntry {
  year: number
  month: number
  // Wind/Solar/Hybrid
  capacity_factor_pct?: number
  energy_mwh?: number
  revenue_aud?: number
  energy_price_received?: number
  curtailment_pct?: number
  // BESS / Pumped Hydro
  energy_discharged_mwh?: number
  energy_charged_mwh?: number
  avg_charge_price?: number
  avg_discharge_price?: number
  utilisation_pct?: number
  cycles?: number
}

export interface ProjectMonthlyPerformance {
  project_id: string
  name: string
  technology: string
  capacity_mw: number
  state: string
  monthly: MonthlyPerformanceEntry[]
}

// Summary type for list views (lightweight)
export interface ProjectSummary {
  id: string
  name: string
  technology: Technology
  status: ProjectStatus
  capacity_mw: number
  storage_mwh?: number | null
  state: State
  current_developer?: string
  rez?: string | null
  development_score?: number
  performance_score?: number
  data_confidence: Confidence
  confidence_score?: number
  development_stage?: DevelopmentStage
  current_operator?: string
  capex_aud_m?: number
  capex_year?: number
  notable?: string
  first_seen?: string
  has_eis_data?: boolean    // true when eis_specs are populated (planning document sourced)
  zombie_flag?: 'zombie_stale' | 'zombie_minimal' | null  // stale or minimal-data projects
  has_scheme_contract?: boolean  // true when project has CIS or LTESA contract
  has_stages?: boolean  // true when project has multi-stage build-out
  user_override?: 'include' | 'exclude'  // manual curation override
}

// CIS/LTESA types
export interface CISRound {
  id: string
  name: string
  type: 'generation' | 'dispatchable'
  market: 'NEM' | 'WEM'
  announced_date: string
  total_capacity_mw: number
  total_storage_mwh?: number
  num_projects: number
  project_ids: string[]
  description: string
  key_changes?: string
  sources: SourceReference[]
}

export interface LTESARound {
  id: string
  name: string
  type: 'generation' | 'firming' | 'lds' | 'mixed'
  announced_date: string
  total_capacity_mw: number
  total_storage_mwh?: number
  num_projects: number
  project_ids: string[]
  description: string
  sources: SourceReference[]
}

export interface REZ {
  id: string
  name: string
  state: State
  target_capacity_gw: number
  status: string
  transmission_provider?: string
  project_ids: string[]
  description: string
  sources: SourceReference[]
}

// League Table types (Phase 3)
export type LeagueTechnology = 'wind' | 'solar' | 'bess' | 'pumped_hydro'

export interface LeagueTableEntry {
  project_id: string
  name: string
  technology: Technology
  capacity_mw: number
  storage_mwh?: number | null
  state: State

  // Performance metrics
  energy_mwh?: number
  capacity_factor_pct?: number
  curtailment_pct?: number
  energy_price_received?: number
  revenue_aud?: number
  revenue_per_mw?: number
  market_value_aud?: number

  // BESS metrics
  energy_charged_mwh?: number
  energy_discharged_mwh?: number
  avg_charge_price?: number
  avg_discharge_price?: number
  utilisation_pct?: number
  cycles?: number

  // Data provenance
  data_source?: 'openelectricity' | 'openelectricity_ytd' | 'sample'

  // All-years mode
  years_of_data?: number

  // Rankings
  rank_composite: number
  rank_capacity_factor?: number
  rank_revenue_per_mw?: number
  rank_curtailment?: number
  quartile: 1 | 2 | 3 | 4
  composite_score: number
  percentile_capacity_factor?: number
  percentile_revenue_per_mw?: number
}

export interface LeagueTable {
  year: number
  technology: LeagueTechnology
  data_source?: 'openelectricity' | 'openelectricity_ytd' | 'sample' | 'mixed'
  fleet_avg: {
    capacity_factor_pct?: number
    revenue_per_mw?: number
    curtailment_pct?: number
    count: number
  }
  projects: LeagueTableEntry[]
}

export interface LeagueTableIndex {
  available_years: number[]
  technologies: LeagueTechnology[]
  tables: { year: number; technology: string; count: number }[]
  last_updated: string
}

export interface QuartileBenchmarks {
  year: number
  technology: LeagueTechnology
  benchmarks: {
    capacity_factor: { q1: number; median: number; q3: number }
    revenue_per_mw: { q1: number; median: number; q3: number }
  }
}

// OEM & Contractor profile types (Phase 5)
export type OEMRole = 'wind_oem' | 'solar_oem' | 'bess_oem' | 'hydro_oem' | 'inverter'
export type ContractorRole = 'epc' | 'bop'

export interface OEMDetailBreakdown {
  count: number
  capacity_mw: number
  storage_mwh: number
}

export interface OEMProfile {
  slug: string
  name: string
  project_count: number
  total_capacity_mw: number
  total_storage_mwh: number
  roles: OEMRole[]
  models: string[]
  by_technology: Partial<Record<Technology, number>>
  by_status: Partial<Record<ProjectStatus, number>>
  by_state: Partial<Record<State, number>>
  states: State[]
  project_ids: string[]
  status_detail: Partial<Record<ProjectStatus, OEMDetailBreakdown>>
  state_detail: Partial<Record<State, OEMDetailBreakdown>>
}

export interface OEMIndex {
  oems: OEMProfile[]
  total: number
}

export interface ContractorProfile {
  slug: string
  name: string
  project_count: number
  total_capacity_mw: number
  roles: ContractorRole[]
  by_technology: Partial<Record<Technology, number>>
  by_status: Partial<Record<ProjectStatus, number>>
  states: State[]
  project_ids: string[]
}

export interface ContractorIndex {
  contractors: ContractorProfile[]
  total: number
}

export type OfftakeType = 'PPA' | 'corporate_ppa' | 'government_ppa' | 'tolling' | 'merchant' | 'CIS' | 'LTESA' | 'SIPS' | 'FCAS' | 'other'

export interface OfftakerProfile {
  slug: string
  name: string
  project_count: number
  total_capacity_mw: number
  types: OfftakeType[]
  by_technology: Partial<Record<Technology, number>>
  by_status: Partial<Record<ProjectStatus, number>>
  states: State[]
  project_ids: string[]
}

export interface OfftakerIndex {
  offtakers: OfftakerProfile[]
  total: number
}

export const OFFTAKE_TYPE_CONFIG: Record<OfftakeType, { label: string; color: string }> = {
  PPA: { label: 'PPA', color: '#3b82f6' },
  corporate_ppa: { label: 'Corporate PPA', color: '#8b5cf6' },
  government_ppa: { label: 'Government PPA', color: '#22c55e' },
  tolling: { label: 'Tolling', color: '#f59e0b' },
  merchant: { label: 'Merchant', color: '#6b7280' },
  CIS: { label: 'CIS', color: '#14b8a6' },
  LTESA: { label: 'LTESA', color: '#06b6d4' },
  SIPS: { label: 'SIPS', color: '#ec4899' },
  FCAS: { label: 'FCAS', color: '#f97316' },
  other: { label: 'Other', color: '#6b7280' },
}

export const OEM_ROLE_CONFIG: Record<OEMRole, { label: string; color: string }> = {
  wind_oem: { label: 'Wind OEM', color: '#3b82f6' },
  solar_oem: { label: 'Solar OEM', color: '#facc15' },
  bess_oem: { label: 'BESS OEM', color: '#8b5cf6' },
  hydro_oem: { label: 'Hydro OEM', color: '#14b8a6' },
  inverter: { label: 'Inverter', color: '#f59e0b' },
}

export const CONTRACTOR_ROLE_CONFIG: Record<ContractorRole, { label: string; color: string }> = {
  epc: { label: 'EPC', color: '#ef4444' },
  bop: { label: 'BoP', color: '#f97316' },
}

// Developer profile types (Phase 4)
export interface DeveloperProfile {
  slug: string
  name: string
  aliases?: string[]
  project_count: number
  total_capacity_mw: number
  total_storage_mwh: number
  by_technology: Partial<Record<Technology, number>>
  by_status: Partial<Record<ProjectStatus, number>>
  states: State[]
  avg_confidence: Confidence
  project_ids: string[]
}

export interface DeveloperIndex {
  developers: DeveloperProfile[]
  total_developers: number
  grouped_developers: DeveloperProfile[]
  total_grouped: number
  top_developers: { slug: string; name: string; project_count: number }[]
}

// Map data types (Phase 4)
export interface MapProject {
  id: string
  name: string
  technology: Technology
  status: ProjectStatus
  capacity_mw: number
  storage_mwh?: number | null
  state: State
  lat: number
  lng: number
  developer?: string
}

// COD Drift types (Phase 4)
export interface CODDriftProject {
  id: string
  name: string
  technology: Technology
  status: ProjectStatus
  capacity_mw: number
  state: State
  original: string
  current: string
  drift_months: number
}

export interface CODDriftData {
  projects_with_drift: number
  avg_drift_months: Partial<Record<Technology, number>>
  by_project: CODDriftProject[]
  cod_histories: Record<string, { date: string; estimate: string; source?: string }[]>
}

// Technology display helpers
export const TECHNOLOGY_CONFIG: Record<Technology, { label: string; color: string; icon: string }> = {
  wind: { label: 'Wind', color: '#3b82f6', icon: '💨' },
  solar: { label: 'Solar', color: '#f59e0b', icon: '☀️' },
  bess: { label: 'BESS', color: '#8b5cf6', icon: '🔋' },
  hybrid: { label: 'Hybrid', color: '#06b6d4', icon: '⚡' },
  pumped_hydro: { label: 'Pumped Hydro', color: '#14b8a6', icon: '💧' },
  offshore_wind: { label: 'Offshore Wind', color: '#0ea5e9', icon: '🌊' },
  gas: { label: 'Gas', color: '#ef4444', icon: '🔥' },
}

export const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: string }> = {
  operating: { label: 'Operating', color: '#22c55e', icon: '🟢' },
  commissioning: { label: 'Commissioning', color: '#84cc16', icon: '🟡' },
  construction: { label: 'Construction', color: '#f59e0b', icon: '🏗️' },
  development: { label: 'Development', color: '#3b82f6', icon: '📋' },
  withdrawn: { label: 'Withdrawn', color: '#6b7280', icon: '⬜' },
}

export const CONFIDENCE_CONFIG: Record<Confidence, { label: string; dots: string; color: string }> = {
  high: { label: 'High Confidence', dots: '●●●●', color: '#22c55e' },
  good: { label: 'Good Confidence', dots: '●●●○', color: '#84cc16' },
  medium: { label: 'Medium Confidence', dots: '●●○○', color: '#f59e0b' },
  low: { label: 'Low Confidence', dots: '●○○○', color: '#ef4444' },
  unverified: { label: 'Unverified', dots: '○○○○', color: '#6b7280' },
}

export const DEVELOPMENT_STAGE_CONFIG: Record<DevelopmentStage, { label: string; color: string; icon: string }> = {
  epbc_approved: { label: 'EPBC Approved', color: '#22c55e', icon: '✓' },
  epbc_submitted: { label: 'EPBC Submitted', color: '#10b981', icon: '◐' },
  planning_submitted: { label: 'AEMO Announced', color: '#f59e0b', icon: '◐' },
  early_stage: { label: 'Early Stage', color: '#6b7280', icon: '○' },
}

// Data Sources (admin/status page)
export type DataSourceFrequency = 'monthly' | 'quarterly' | 'ad_hoc'

export interface DataSourceInfo {
  id: string
  name: string
  description: string
  url: string
  frequency: DataSourceFrequency
  script: string
  last_run: string | null
  last_status: 'completed' | 'failed' | 'running' | 'never'
  records_imported: number
  records_updated: number
  records_new: number
  error: string | null
}

// BESS Capex Analytics
export interface BESSCapexProject {
  id: string
  name: string
  status: string
  capacity_mw: number
  storage_mwh: number
  capex_aud_m: number
  capex_year: number
  capex_source: string
  capex_source_url?: string
  state: string
  current_developer: string
  current_operator: string
  bess_oem: string
  bess_model: string
  capex_per_mw: number
  capex_per_mwh: number
  duration_hours: number
  // Multi-stage project scope
  capex_scope_note?: string
  capex_scope_mw?: number
  capex_scope_mwh?: number
  stages?: Array<{
    stage: string; name?: string; capacity_mw?: number; storage_mwh?: number
    status?: string; capex_aud_m?: number
  }>
}

export interface BESSCapexYearSummary {
  count: number
  total_mw: number
  total_capex_m: number
  avg_capex_per_mw: number | null
  avg_capex_per_mwh: number | null
}

export interface BESSCapexOEMSummary {
  count: number
  total_mw: number
  avg_capex_per_mw: number | null
  avg_capex_per_mwh: number | null
}

export interface BESSCapexData {
  projects: BESSCapexProject[]
  by_year: Record<string, BESSCapexYearSummary>
  by_oem: Record<string, BESSCapexOEMSummary>
  exported_at: string
}

// Project Timeline Analytics
export interface TimelineProject {
  id: string
  name: string
  technology: Technology
  status: ProjectStatus
  capacity_mw: number
  storage_mwh?: number
  state: State
  current_developer?: string
  first_seen?: string
  first_seen_year?: number
  development_stage?: DevelopmentStage
  zombie_flag?: 'zombie_stale' | 'zombie_minimal' | null
  has_scheme_contract?: boolean
  data_confidence?: Confidence
  user_override?: 'include' | 'exclude'
}

export interface TimelineYearBreakdown {
  count: number
  total_mw: number
  by_technology: Record<string, { count: number; capacity_mw: number }>
  by_state: Record<string, { count: number; capacity_mw: number }>
  by_status: Record<string, { count: number; capacity_mw: number }>
}

export interface ProjectTimelineData {
  projects: TimelineProject[]
  by_year: Record<string, TimelineYearBreakdown>
  by_technology: Record<string, { count: number; total_mw: number; with_date: number }>
  by_state: Record<string, { count: number; total_mw: number }>
  total_with_date: number
  total_without_date: number
  exported_at: string
}

export interface DataSourcesIndex {
  sources: DataSourceInfo[]
  database_stats: {
    total_projects: number
    total_offtakes: number
    total_oems_contractors: number
    operating_projects: number
  }
  exported_at: string
}

// ============================================================
// Intelligence Layer Types
// ============================================================

export type MilestoneStage = 'operating' | 'commissioning' | 'construction' | 'planning_approved' | 'development' | 'unknown'

export interface SchemeAnnotation {
  flag: string
  reason: string
  severity: 'high' | 'medium' | 'low'
}

export interface SchemeTrackerProject {
  name: string
  project_id: string | null
  developer: string
  technology: string
  capacity_mw: number
  storage_mwh: number | null
  state: string
  status: string
  stage: MilestoneStage
  fid_date: string | null
  construction_start: string | null
  cod_current: string | null
  /** Pre-computed "why isn't this building yet" headline plus supporting
   * annotations (v2.31.0). `dev_status` is always present — "FID reached",
   * "construction", "planning approved", "on track", or the highest-severity
   * annotation flag. */
  dev_status?: string
  annotations?: SchemeAnnotation[]
  developer_grade?: string
  /** Date the project's primary planning consent was granted. Sparse — only
   * populated for a curated set of NSW wind/CIS projects in v2.60. ISO-8601 or
   * null if not yet approved. */
  planning_approval_date?: string | null
  planning_authority?: string
  planning_note?: string
}

export interface SchemeTrackerRound {
  id: string
  scheme: string
  round: string
  type: string
  announced_date: string
  months_since_announced: number
  total_capacity_mw: number
  total_storage_mwh: number
  num_projects: number
  by_stage: Record<string, number>
  by_state: Record<string, number>
  projects: SchemeTrackerProject[]
}

export interface SchemeTrackerData {
  rounds: SchemeTrackerRound[]
  summary: {
    total_projects: number
    total_mw: number
    by_stage: Record<string, { count: number; mw: number }>
  }
}

export type REZAccessMap = Record<string, { title: string; date: string }>

export interface DriftGroup { count: number; mean: number; median: number; p25: number; p75: number }
export interface DriftProject {
  project_id: string; name: string; technology: string; status: string;
  state: string; capacity_mw: number; drift_months: number;
  cod_current: string | null; cod_original: string | null; developer: string;
}
export interface DeveloperDrift {
  developer: string; count: number; mean: number; median: number; p25: number; p75: number; on_time_pct: number;
}
export interface DriftYearTrend { year: number; count: number; mean: number; median: number; p25: number; p75: number }
export interface DriftAnalysisData {
  projects: DriftProject[];
  by_technology: Record<string, DriftGroup>;
  by_state: Record<string, DriftGroup>;
  by_capacity_band: Record<string, DriftGroup>;
  developer_ranking: DeveloperDrift[];
  year_trend: DriftYearTrend[];
  total_projects: number;
  overall: DriftGroup;
}

export interface WindResourceFarm {
  project_id: string; name: string; state: string; capacity_mw: number;
  latitude: number; longitude: number; capacity_factor_pct: number;
  energy_price: number; revenue_per_mw: number; resource_rating: string;
}
export interface WindResourceDev {
  project_id: string; name: string; state: string; capacity_mw: number;
  latitude: number | null; longitude: number | null;
  predicted_cf_pct: number; predicted_rating: string; basis: string;
}
export interface WindResourceData {
  operating_farms: WindResourceFarm[];
  state_benchmarks: Record<string, { count: number; mean: number; median: number; p25: number; p75: number; rating: string }>;
  rez_benchmarks: Record<string, { count: number; mean: number; median: number; p25: number; p75: number; rating: string }>;
  development_projects: WindResourceDev[];
  total_operating: number; total_development: number;
}

export interface StateYearPerformance {
  state: string; year: number; wind_cf_pct: number; solar_cf_pct: number;
  combined_cf_pct: number; wind_mw: number; solar_mw: number;
}
export interface SeasonalMonthly {
  state: string; year: number; month: number;
  wind_cf: number; solar_cf: number; combined_cf: number | null;
  wind_mw: number; solar_mw: number;
}
export interface DunkelflaunteData {
  state_year_performance: StateYearPerformance[];
  lowest_cf_periods: StateYearPerformance[];
  bess_coverage: Record<string, { bess_count: number; bess_mw: number; bess_mwh: number; peak_demand_mw_est: number; coverage_hours: number; coverage_rating: string }>;
  bess_pipeline: Record<string, { count: number; mw: number; mwh: number }>;
  peak_demand_estimates: Record<string, number>;
  seasonal_monthly?: SeasonalMonthly[];
}

export interface EnergyMixData {
  current_mix: Record<string, Record<string, { count: number; mw: number; mwh?: number }>>;
  state_totals: Record<string, { operating_mw: number; technologies: Record<string, { count: number; mw: number }> }>;
  pipeline: Array<{ state: string; technology: string; status: string; cod_year: string; count: number; mw: number }>;
  projection: Record<string, Record<string, number>>;
}

export interface GenerationSeasonProfile {
  key: string
  label: string
  year: number
  season: 'summer' | 'autumn' | 'winter' | 'spring'
  period: string
  profiles: Record<string, number[]>  // fuel type → 24 hourly values (MW)
  demand: number[]                     // 24 hourly values (MW)
  price: number[]                      // 24 hourly values ($/MWh)
}

export interface GenerationProfileRegion {
  name: string
  seasons: GenerationSeasonProfile[]
}

export interface GenerationProfileData {
  generated_at: string
  regions: Record<string, GenerationProfileRegion>
  stack_order: string[]
  colours: Record<string, string>
  labels: Record<string, string>
}

// ============================================================
// Battery Watch
// ============================================================

export interface BatteryWatchPhase {
  label: string; mw: number; date: string; status: string
}

export interface BatteryWatchProject {
  name: string; id: string; developer: string
  capacity_mw: number; available_mw?: number; storage_mwh: number
  duration_hours: number; status: string; cod: string
  phases?: BatteryWatchPhase[]; note?: string; milestone?: string
}

export interface BatteryWatchMilestone {
  date: string; label: string; cumulative_mw: number; event?: string
}

export interface BatteryWatchStateData {
  mw: number; mwh: number; projects: number
}

export interface BatteryWatchProjectedPoint {
  date: string; mw: number; label: string
}

export interface BatteryWatchKeyQuestion {
  question: string; answer: string
}

export interface BatteryWatchDemandContext {
  max_demand_mw: number; avg_demand_mw: number; bess_pct_max: number
  seasonal: Array<{ season: string; max_demand_mw: number; avg_demand_mw: number }>
}

export interface BatteryWatchStateFocus {
  total_operating_mw: number; total_operating_mwh: number
  total_construction_mw: number; total_construction_mwh: number
  projects: BatteryWatchProject[]
  timeline_milestones: BatteryWatchMilestone[]
  demand_context?: BatteryWatchDemandContext
}

export interface BatteryWatchData {
  generated_at: string
  nsw_focus: {
    total_operating_mw: number; total_operating_mwh: number
    total_construction_mw: number; total_construction_mwh: number
    projects: BatteryWatchProject[]
    timeline_milestones: BatteryWatchMilestone[]
  }
  qld_focus?: BatteryWatchStateFocus
  vic_focus?: BatteryWatchStateFocus
  sa_focus?: BatteryWatchStateFocus
  nem_wide: {
    operating: { total_mw: number; total_mwh: number; by_state: Record<string, BatteryWatchStateData> }
    construction: { total_mw: number; total_mwh: number; by_state: Record<string, BatteryWatchStateData> }
    projected_capacity_mw: BatteryWatchProjectedPoint[]
  }
  displacement_context: {
    nem_evening_peak_demand_mw: number; nem_average_demand_mw: number
    battery_share_evening_peak_pct: number; battery_share_evening_peak_sa_pct: number
    negative_price_intervals_pct: number
    solar_curtailment_2025_twh: number; wind_curtailment_2025_twh: number
    total_curtailment_2025_twh: number
    nsw_gas_generation_avg_mw: number; nsw_coal_generation_avg_mw: number
    insights: string[]
    key_questions: BatteryWatchKeyQuestion[]
  }
  sources: { name: string; url: string }[]
}

// ============================================================
// Capacity Watch (Wind / Solar)
// ============================================================

export interface CapacityWatchProject {
  name: string; id: string; developer: string
  capacity_mw: number; status: string; state: string
  cod: string; source: string; note?: string
}

export interface CapacityWatchMilestone {
  date: string; label: string; cumulative_mw: number; event?: string
}

export interface CapacityWatchStateData {
  mw: number; projects: number
}

export interface CapacityWatchData {
  generated_at: string
  technology: string
  display_name: string
  colour: string
  summary: {
    total_operating_mw: number; total_operating_projects: number
    total_construction_mw: number; total_construction_projects: number
    total_development_mw: number; total_development_projects: number
  }
  projects: CapacityWatchProject[]
  timeline_milestones: CapacityWatchMilestone[]
  by_state: {
    operating: Record<string, CapacityWatchStateData>
    construction: Record<string, CapacityWatchStateData>
  }
}

// ============================================================
// Coal Watch
// ============================================================

export interface CoalAnnualData {
  year: number; generation_gwh: number; capacity_factor_pct: number
  est_revenue_m_aud: number; avg_price_aud_mwh: number; note?: string
}

export interface CoalSeasonalData {
  year: number; season: 'summer' | 'autumn' | 'winter' | 'spring'
  generation_gwh: number; avg_price_aud_mwh: number; note?: string
}

export interface CoalPlant {
  name: string; facility_code: string; owner: string
  capacity_mw: number; units: number; unit_size_mw: number
  fuel: string; commissioned: number
  closure_date: string; closure_note: string
  battery_replacement: string | null
  duids: string[]
  annual_data: CoalAnnualData[]
  seasonal_data: CoalSeasonalData[]
}

export interface CoalClosureEntry {
  name: string; state: string; mw: number; owner: string
  closed?: string; closing?: string
}

export interface CoalShareEntry { year: number; pct: number }

export interface CoalFleetTotal {
  year: number; generation_twh: number; est_revenue_b_aud: number
  avg_price_aud_mwh: number; note?: string
}

export interface CoalWatchData {
  generated_at: string; data_source: string; note: string
  nsw_coal_plants: CoalPlant[]
  nem_coal_summary: {
    total_capacity_mw: number; nsw_capacity_mw: number; nsw_share_pct: number
    coal_share_nem_generation_pct: CoalShareEntry[]
    closure_timeline: CoalClosureEntry[]
  }
  battery_vs_coal_context: {
    nsw_bess_operating_mw: number; nsw_bess_by_end_2027_mw: number
    nsw_coal_operating_mw: number
    bess_as_pct_of_coal_2026: number; bess_as_pct_of_coal_2027: number
    key_dynamics: string[]
  }
  revenue_watch: {
    note: string; nsw_fleet_total: CoalFleetTotal[]
    seasonal_revenue?: Array<{ year: number; season: string; est_revenue_m_aud: number; generation_gwh: number }>
  }
  insights: string[]
  sources: { name: string; url: string; note?: string }[]
}

export interface ScoredDeveloper {
  developer: string; project_count: number; total_mw: number; technologies: string[];
  operating: number; withdrawn: number; completion_rate: number;
  avg_drift_months: number; on_time_pct: number;
  execution_score: number; grade: string;
  drift_stats: { count: number; mean: number; median: number };
}
export interface DeveloperScoreData {
  developers: ScoredDeveloper[];
  industry_averages: { avg_drift_months: number; avg_on_time_pct: number; developer_count: number };
  grade_distribution: Record<string, number>;
  total_developers: number;
}

export interface MetricStats { count: number; mean: number; median: number; p25: number; p75: number }
export interface TechYearRevenue {
  technology: string; year: number;
  revenue_per_mw: MetricStats; energy_price: MetricStats; capacity_factor: MetricStats;
  bess_spread?: MetricStats; discharge_price?: MetricStats; charge_price?: MetricStats;
}
export interface RevenueProjectRanking {
  project_id: string; name: string; technology?: string; state?: string
  capacity_mw: number; revenue_per_mw: number; capacity_factor_pct?: number
  yoy_change_pct?: number; latest_year?: number
  prev_revenue_per_mw?: number; latest_revenue_per_mw?: number
}

export interface RevenueMagnitudeEntry {
  year: number; total_revenue_m_aud: number; project_count: number; mean_per_project_aud: number
}

export interface RevenueIntelData {
  by_technology_year: TechYearRevenue[];
  yoy_trends: Record<string, Array<{ year: number; revenue_per_mw: number; energy_price: number; cf: number }>>;
  technology_comparison_2024: Record<string, { revenue_per_mw: MetricStats; energy_price: MetricStats; capacity_factor: MetricStats }>;
  offtake_comparison: { year: number; with_offtake: { count: number; revenue_per_mw: MetricStats; energy_price: MetricStats }; without_offtake: { count: number; revenue_per_mw: MetricStats; energy_price: MetricStats } };
  top_10_by_state?: Record<string, Record<string, RevenueProjectRanking[]>>;
  projects_in_trouble?: RevenueProjectRanking[];
  revenue_magnitude_trends?: Record<string, RevenueMagnitudeEntry[]>;
}

// ============================================================
// NEM Activities Timeline
// ============================================================

export interface NemActivityEvent {
  project_id: string; project_name: string; technology: string; state: string
  capacity_mw: number; event_type: string; title: string; detail?: string; date: string
}

export interface NemActivitiesMonth {
  month: string
  sections: {
    development: NemActivityEvent[]; govt_programs: NemActivityEvent[]
    rez_progress: NemActivityEvent[]; construction: NemActivityEvent[]
    operational: NemActivityEvent[]
  }
}

export interface NemActivitiesData {
  generated_at: string; months: NemActivitiesMonth[]
  section_counts: Record<string, number>
}

// ============================================================
// BESS Bidding Intelligence
// ============================================================

export interface BessBiddingProfile {
  project_id: string; project_name: string; capacity_mw: number | null; storage_mwh: number | null
  state: string | null; participant_id: string | null
  first_date: string; last_date: string
  total_bids: number; energy_bids: number; fcas_bids: number; fcas_services: number
  rebid_pct: number
  gen_pricebands: (number | null)[]; load_pricebands: (number | null)[]
  load_strategy: 'defensive' | 'moderate' | 'aggressive'
  target_spread: number
}

export interface BessBiddingMonthlyTrend {
  month: string; active_duids: number; total_bids: number
  avg_gen_mid: number | null; avg_load_mid: number | null
  avg_gen_cap: number | null; avg_gen_floor: number | null
  max_cap: number | null; rebid_pct: number; target_spread: number
}

export interface BessBiddingQuarterlyEntry {
  quarter: string; gen_mid: number | null; load_mid: number | null
  gen_cap: number | null; load_cap: number | null
  target_spread: number; rebid_pct: number
}

export interface BessBiddingRebidReason {
  reason: string; count: number; projects: number
}

export interface BessBiddingInsights {
  mpc_shift: { first_new_mpc_date: string | null; old_mpc_approx: number | null; new_mpc_approx: number | null }
  most_active_rebidders: Array<{ project_id: string; rebid_pct: number }>
  least_active_rebidders: Array<{ project_id: string; rebid_pct: number }>
  participant_changes: Array<{ project_id: string; changes: Array<{ participant_id: string; first_seen: string; last_seen: string }> }>
  strategy_counts: { defensive: number; moderate: number; aggressive: number }
  fcas_only_energy: string[]; fcas_full_stack: string[]
}

export interface BessBiddingData {
  generated_at: string
  data_range: { first_date: string | null; last_date: string | null; total_bids: number; total_projects: number }
  profiles: BessBiddingProfile[]
  monthly_trends: BessBiddingMonthlyTrend[]
  quarterly_evolution: Record<string, BessBiddingQuarterlyEntry[]>
  rebid_reasons: BessBiddingRebidReason[]
  insights: BessBiddingInsights
}

export interface REZSummary {
  rez: string; total_mw: number; operating_mw: number; pipeline_mw: number;
  project_count: number; congestion_score: number; congestion_level: string;
  technologies: Record<string, Record<string, { count: number; mw: number }>>;
}
export interface GridConnectionData {
  rez_summaries: REZSummary[];
  state_summary: Record<string, { rez_count: number; total_mw: number; pipeline_mw: number; rezs: string[] }>;
  connection_status_overall: Record<string, { count: number; mw: number }>;
  total_rez_zones: number;
}

// News
export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  published_date: string;
  summary: string;
  matched_project_ids: string[];
  project_data_updated?: string[];  // project IDs whose data was updated based on this article
}

export interface NewsData {
  articles: NewsArticle[];
  source_counts: Record<string, number>;
  total_articles: number;
}

// EIS/EIA Technical Analytics
export interface EISWindProject {
  id: string; name: string; state: State; capacity_mw: number; status: string; developer?: string
  storage_mwh?: number
  turbine_model?: string; turbine_count?: number; turbine_rated_power_mw?: number
  hub_height_m?: number; rotor_diameter_m?: number
  wind_speed_mean_ms?: number; assumed_capacity_factor_pct?: number; assumed_annual_energy_gwh?: number
  noise_limit_dba?: number; minimum_setback_m?: number
  connection_voltage_kv?: number; connection_distance_km?: number
  connection_substation_name?: string; nsp?: string; connection_augmentation?: string
  document_title?: string; document_url?: string; document_year?: number
}

export interface EISBESSProject {
  id: string; name: string; state: State; capacity_mw: number; status: string; developer?: string
  storage_mwh?: number
  cell_chemistry?: string; cell_supplier?: string
  inverter_supplier?: string; inverter_model?: string
  pcs_type?: 'grid_forming' | 'grid_following' | 'both'
  round_trip_efficiency_pct?: number; round_trip_efficiency_ac?: number
  duration_hours?: number; transformer_mva?: number
  connection_voltage_kv?: number; connection_distance_km?: number
  connection_substation_name?: string; nsp?: string; connection_augmentation?: string
  document_title?: string; document_url?: string; document_year?: number
}

export interface EISSolarProject {
  id: string; name: string; state: State; capacity_mw: number; status: string; developer?: string
  // Panel specifications
  panel_model?: string; panel_supplier?: string; panel_wattage_w?: number
  panel_count?: number; panel_type?: string  // mono-PERC, bifacial, HJT, TOPCon
  // Array configuration
  tracking_type?: string  // single_axis | fixed_tilt | dual_axis
  tracking_supplier?: string
  tilt_angle_deg?: number; azimuth_deg?: number
  array_area_ha?: number
  // Inverter specifications
  inverter_type?: string  // string | central
  inverter_supplier?: string; inverter_model?: string
  inverter_count?: number; inverter_rated_power_kw?: number
  // Performance assumptions
  assumed_capacity_factor_pct?: number; assumed_annual_energy_gwh?: number
  energy_yield_method?: string  // PVsyst, etc.
  degradation_rate_pct?: number  // annual panel degradation
  performance_ratio_pct?: number
  // Grid connection
  connection_voltage_kv?: number; connection_distance_km?: number
  connection_substation_name?: string; nsp?: string; connection_augmentation?: string
  // Document reference
  document_title?: string; document_url?: string; document_year?: number
}

export interface EISPumpedHydroProject {
  id: string; name: string; state: string; capacity_mw: number; status: string; developer?: string
  storage_mwh?: number; storage_hours?: number
  upper_reservoir?: string; lower_reservoir?: string
  head_height_m?: number; tunnel_length_km?: number
  turbine_type?: string; turbine_count?: number; turbine_rated_power_mw?: number
  generation_capacity_mw?: number; round_trip_efficiency_pct?: number | null
  connection_voltage_kv?: number; connection_distance_km?: number
  connection_substation_name?: string; nsp?: string; connection_augmentation?: string
  document_title?: string; document_url?: string; document_year?: number
}

export interface EISAnalyticsData {
  wind_projects: EISWindProject[]
  bess_projects: EISBESSProject[]
  solar_projects: EISSolarProject[]
  pumped_hydro_projects?: EISPumpedHydroProject[]
  summary: {
    total_eis: number; wind: number; bess: number; solar: number; pumped_hydro: number
    wind_stats: {
      avg_wind_speed: number | null; avg_hub_height: number | null
      avg_rotor_diameter: number | null; avg_capacity_factor: number | null
      avg_connection_distance: number | null
    }
    bess_stats: {
      chemistry_breakdown: Record<string, number>
      pcs_type_breakdown: Record<string, number>
      avg_efficiency_dc: number | null; avg_efficiency_ac: number | null
      avg_duration: number | null; avg_connection_distance: number | null
      top_cell_suppliers: Record<string, number>
      top_inverter_suppliers: Record<string, number>
    }
    solar_stats?: {
      avg_capacity_factor: number | null
      avg_connection_distance: number | null
      avg_panel_count: number | null
      tracking_sat: number
      tracking_fixed: number
    }
    connection: {
      avg_distance: number | null
      voltage_breakdown: Record<string, number>
    }
  }
}

// EIS vs Actual comparison
export interface EISComparisonActual { year: number; cf_pct: number; energy_mwh: number | null }

export interface EISComparisonProject {
  id: string; name: string; technology: string; state: string; capacity_mw: number
  eis_cf_pct: number; eis_energy_gwh: number | null
  annual_actuals: EISComparisonActual[]
  avg_actual_cf_pct: number; cf_delta_pct: number
}

export interface EISComparisonData {
  projects: EISComparisonProject[]
  summary: {
    total_matched: number; avg_eis_cf: number; avg_actual_cf: number
    avg_delta: number; projects_above_eis: number; projects_below_eis: number
  }
  exported_at: string
}

// EIS coverage tracking
export interface EISCoverageEntry {
  name: string; technology: string; state: string; eis_url?: string; notes?: string
}

export interface EISCoverageGapEntry {
  id: string; name: string; technology: string; status: string; planning_status?: string
  capacity_mw: number; state: string; developer?: string
  reason: string  // why eligible: operating, construction, dev/approved, CIS/LTESA
  scheme?: string
}

export interface EISCoverageData {
  available_not_extracted: EISCoverageEntry[]
  coverage_gap: EISCoverageGapEntry[]
  last_updated: string
}

// ============================================================
// Wind Value Analytics
// ============================================================

export interface WindMonthlyDataPoint {
  year: number
  month: number
  cf_pct: number | null
  capture_price: number | null
  energy_mwh: number | null
  revenue_aud: number | null
  pool_price: number | null
  value_factor: number | null
}

export interface WindAnnualDataPoint {
  year: number
  months: number
  cf_pct: number
  capture_price: number | null
  energy_mwh: number
  revenue_aud: number
  revenue_per_mw: number | null
}

export interface WindSeasonalAvg {
  months: number[]
  avg_cf_pct: number | null
  avg_capture_price: number | null
  avg_value_factor: number | null
  pct_of_annual_energy: number | null
}

export interface WindMonthlyAvg {
  label: string
  avg_cf_pct: number | null
  avg_capture_price: number | null
  avg_value_factor: number | null
}

export interface WindValueSummary {
  avg_cf_pct: number | null
  avg_capture_price: number | null
  avg_value_factor: number | null
  cf_trend: 'improving' | 'declining' | 'stable'
  best_capture_month: number | null
  worst_capture_month: number | null
  best_cf_month: number | null
  annual_cf_variability: number | null
  latest_revenue_per_mw: number | null
  data_years: number
  data_first_year: number | null
  data_last_year: number | null
  // Data completeness metadata
  commissioning_year: number | null
  data_months_available: number
  data_years_clean: number
  ramp_year: number | null
  ramp_year_cf_pct: number | null
  avg_cf_excl_ramp: number | null
  data_completeness_pct: number
  years_since_cod: number
  data_confidence: 'high' | 'medium' | 'low'
}

export interface WindHourlyShape {
  annual: (number | null)[]       // 24 values, CF% by hour 0-23 AEST
  months: Record<string, (number | null)[]>  // "1"–"12"
  seasons: Record<string, (number | null)[]> // summer/autumn/winter/spring
  data_period: string
}

export interface WindStateRank {
  cf_rank: number
  cf_total: number
  cf_percentile: number
  capture_price_rank: number
  capture_price_total: number
  capture_price_percentile: number
  revenue_per_mw_rank: number
  revenue_per_mw_total: number
}

export interface WindProsCons {
  pros: string[]
  cons: string[]
  score: number
  grade: string
}

export interface PriceBandMonthEntry {
  label: string
  band_min: number
  band_max: number
  gen_mwh: number
  gen_pct: number
  avg_price: number | null
}

export interface WindPriceBandData {
  source: '5min_nemweb'
  coverage_start: string   // YYYY-MM
  coverage_end: string     // YYYY-MM
  monthly: Record<string, PriceBandMonthEntry[]>  // YYYY-MM -> bands
}

export interface WindValueProject {
  id: string
  name: string
  state: string
  capacity_mw: number
  cod: string | null
  monthly_data: WindMonthlyDataPoint[]
  annual_data: WindAnnualDataPoint[]
  seasonal_averages: Record<string, WindSeasonalAvg>
  monthly_averages: Record<string, WindMonthlyAvg>
  value_summary: WindValueSummary
  price_band_data: WindPriceBandData | null
  hourly_shape: WindHourlyShape | null
  state_rank: WindStateRank | null
  pros_cons: WindProsCons | null
}

export interface WindStateAverage {
  wind_count: number
  avg_cf_pct: number | null
  median_cf_pct: number | null
  avg_capture_price: number | null
  avg_value_factor: number | null
  avg_revenue_per_mw: number | null
}

export interface WindValueData {
  generated_at: string
  data_note: string
  pool_prices: Record<string, Record<string, number>>
  state_averages: Record<string, WindStateAverage>
  projects: Record<string, WindValueProject>
}
