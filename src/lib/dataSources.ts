/**
 * AURES data source registry — single source of truth for where every number
 * on a page comes from, how stale it is, and how to refresh it.
 *
 * The `metadata/data-sources.json` file is the *runtime* freshness feed — it
 * has `last_run` timestamps per source. This registry layers on everything
 * the runtime feed doesn't know about: a short chip label, the threshold at
 * which we flag the data as stale, the CLI command to refresh it, and which
 * pages/features depend on which sources.
 *
 * The `<DataProvenance>` component consumes both — takes a list of source IDs,
 * joins against the runtime feed for timestamps, and renders the compact chip
 * row (or the full expanded admin panel on /data-sources).
 */

export type SourceId =
  | 'aemo_generation_info'
  | 'openelectricity_performance'
  | 'openelectricity_metadata'
  | 'openelectricity_5min'
  | 'epbc_referrals'
  | 'offtake_research'
  | 'web_research'
  | 'nemweb_bids'
  | 'nemweb_dispatchload'
  | 'news_rss'
  | 'aemo_isp_rez'
  | 'market_prices'
  | 'json_export'

export type SourceCategory =
  | 'performance'
  | 'market'
  | 'registry'
  | 'grid'
  | 'research'
  | 'regulatory'

export interface SourceRegistryEntry {
  id: SourceId
  /** Long human-readable name. */
  label: string
  /** Short name for use inside the compact chip (3-4 words max). */
  shortLabel: string
  /** Short icon (emoji) that hints at the category. */
  icon: string
  /** What this source actually provides. */
  description: string
  /** Rough classification. */
  category: SourceCategory
  /** Days after last_run at which to flag amber. */
  staleAfterDays: number
  /** Days after last_run at which to flag red. */
  criticallyStaleAfterDays: number
  /** CLI command to refresh the source. Prefixed with `cd ~/aures-db &&`. */
  refreshCommand: string
  /** Human-readable note explaining what the command does / what it costs. */
  refreshNote: string
  /** Optional external source URL. */
  url?: string
}

export const SOURCE_REGISTRY: Record<SourceId, SourceRegistryEntry> = {
  openelectricity_performance: {
    id: 'openelectricity_performance',
    label: 'OpenElectricity Performance',
    shortLabel: 'OpenElectricity',
    icon: '⚡',
    description:
      'Monthly energy output, capacity factor, revenue, and curtailment per DUID — the backbone of the Performance league tables, Revenue Intelligence, and Wind/Solar Resource pages.',
    category: 'performance',
    staleAfterDays: 14,
    criticallyStaleAfterDays: 35,
    refreshCommand: `python3 pipeline/importers/import_openelectricity.py --year ${new Date().getFullYear()} --ytd`,
    refreshNote: 'YTD dispatch data (~10 API calls, ~2 min). Free plan allows 367-day lookback.',
    url: 'https://openelectricity.org.au',
  },
  openelectricity_5min: {
    id: 'openelectricity_5min',
    label: 'OpenElectricity 5-min Battery SCADA',
    shortLabel: 'OE 5-min Battery',
    icon: '🔋',
    description:
      '5-minute network-level battery power data from the OpenElectricity API (separate `battery_charging` and `battery_discharging` fueltechs). Aggregated daily per NEM region. Powers the Live & Records tab on BESS Portfolio.',
    category: 'market',
    staleAfterDays: 2,
    criticallyStaleAfterDays: 7,
    refreshCommand: 'python3 pipeline/importers/import_battery_scada.py --days 7',
    refreshNote: 'Last 7 days (1 API call per month of history — very efficient). First-run backfill: use --days 30 or --days 365.',
    url: 'https://openelectricity.org.au',
  },
  openelectricity_metadata: {
    id: 'openelectricity_metadata',
    label: 'OpenElectricity Facility Metadata',
    shortLabel: 'OE Metadata',
    icon: '📍',
    description:
      'Facility coordinates, commencement dates, and unit-level details used by the Map and Project detail pages.',
    category: 'registry',
    staleAfterDays: 120,
    criticallyStaleAfterDays: 365,
    refreshCommand: 'python3 pipeline/importers/harvest_facility_metadata.py',
    refreshNote: 'Refreshes coordinates and unit lists (~5 min). Only needed when new facilities register.',
    url: 'https://openelectricity.org.au',
  },
  nemweb_bids: {
    id: 'nemweb_bids',
    label: 'NEMWEB BESS Bids',
    shortLabel: 'NEMWEB Bids',
    icon: '📈',
    description:
      'AEMO NEMWEB daily bid data for the BESS fleet — 10 price bands × direction per DUID per settlement day. Powers the BESS Bidding intelligence page.',
    category: 'market',
    staleAfterDays: 3,
    criticallyStaleAfterDays: 10,
    refreshCommand: 'python3 pipeline/importers/import_nemweb_bids.py --days 7',
    refreshNote: 'Last 7 days of bid data (~3 min, no API limit — AEMO public data).',
    url: 'https://nemweb.com.au',
  },
  nemweb_dispatchload: {
    id: 'nemweb_dispatchload',
    label: 'NEMWEB Dispatch Load',
    shortLabel: 'NEMWEB Dispatch',
    icon: '⚙️',
    description:
      'AEMO NEMWEB 5-minute DISPATCHLOAD data — AVAILABILITY (MW offered) vs TOTALCLEARED (MW dispatched) per DUID. Lets us split coal MWh reductions into outage-driven (unit unavailable) vs dispatch-driven (unit offered but not taken — market displacement).',
    category: 'market',
    staleAfterDays: 2,
    criticallyStaleAfterDays: 7,
    refreshCommand: 'python3 pipeline/importers/import_dispatchload.py --days 7',
    refreshNote: 'Last 7 days of DISPATCHLOAD for the 44 coal DUIDs only. ~2 min, ~20 MB temporary download. For a full 12-month backfill use --month YYYY-MM per month.',
    url: 'https://nemweb.com.au',
  },
  aemo_generation_info: {
    id: 'aemo_generation_info',
    label: 'AEMO Generation Information',
    shortLabel: 'AEMO Gen Info',
    icon: '📋',
    description:
      'Monthly Excel from AEMO listing every registered and proposed NEM generator, capacity, state, and status. The core project registry.',
    category: 'registry',
    staleAfterDays: 35,
    criticallyStaleAfterDays: 60,
    refreshCommand: 'python3 pipeline/importers/import_aemo_gen_info.py',
    refreshNote: 'Downloads the monthly AEMO workbook and reconciles projects (~2 min).',
    url: 'https://www.aemo.com.au/energy-systems/electricity/national-electricity-market-nem/nem-forecasting-and-planning/forecasting-and-planning-data/generation-information',
  },
  aemo_isp_rez: {
    id: 'aemo_isp_rez',
    label: 'AEMO ISP REZ',
    shortLabel: 'AEMO ISP',
    icon: '🗺️',
    description:
      'Renewable Energy Zone hosting and connection capacity from the AEMO Integrated System Plan. Powers REZ comparison and grid-connection analysis.',
    category: 'grid',
    staleAfterDays: 400,
    criticallyStaleAfterDays: 800,
    refreshCommand: 'python3 pipeline/importers/import_aemo_isp.py',
    refreshNote: 'ISP is published annually. Only refresh when AEMO releases a new ISP draft or final report.',
    url: 'https://aemo.com.au/energy-systems/major-publications/integrated-system-plan-isp',
  },
  epbc_referrals: {
    id: 'epbc_referrals',
    label: 'EPBC Referrals',
    shortLabel: 'EPBC',
    icon: '🌿',
    description:
      'Environmental planning referrals from DCCEEW EPBC Act database. Surfaces regulatory risk and environmental approval status.',
    category: 'regulatory',
    staleAfterDays: 35,
    criticallyStaleAfterDays: 90,
    refreshCommand: 'python3 pipeline/importers/import_epbc.py',
    refreshNote: 'Scrapes the EPBC referrals database (~3 min).',
    url: 'https://epbcnotices.environment.gov.au/',
  },
  offtake_research: {
    id: 'offtake_research',
    label: 'Offtake / PPA Research',
    shortLabel: 'PPA Research',
    icon: '🤝',
    description:
      'Power purchase agreements and offtake contracts, hand-curated from public announcements. Feeds the Offtakers directory and Revenue Intelligence offtake comparison.',
    category: 'research',
    staleAfterDays: 90,
    criticallyStaleAfterDays: 180,
    refreshCommand: 'python3 pipeline/research/research_offtakes.py',
    refreshNote: 'Web-research run to find new PPA announcements (~15 min, uses web search).',
  },
  web_research: {
    id: 'web_research',
    label: 'Web Research',
    shortLabel: 'Web Research',
    icon: '🔎',
    description:
      'Timeline events, notable text, supplier data, and project details curated from RenewEconomy, PV Magazine, Energy Storage News, WattClarity, developer websites, and ASX disclosures.',
    category: 'research',
    staleAfterDays: 30,
    criticallyStaleAfterDays: 90,
    refreshCommand: 'python3 pipeline/research/web_research.py',
    refreshNote: 'Full web-research pass — suppliers, notable text, timeline events. Plan 15-30 min per run.',
    url: 'https://reneweconomy.com.au',
  },
  news_rss: {
    id: 'news_rss',
    label: 'News RSS',
    shortLabel: 'News RSS',
    icon: '📰',
    description:
      'Daily RSS from RenewEconomy, PV Magazine, and Energy Storage News. Feeds the News page and NEM Activities timeline.',
    category: 'research',
    staleAfterDays: 2,
    criticallyStaleAfterDays: 7,
    refreshCommand: 'python3 pipeline/importers/import_news_rss.py',
    refreshNote: 'Pulls latest RSS from three energy publications (~30 seconds).',
    url: 'https://reneweconomy.com.au',
  },
  market_prices: {
    id: 'market_prices',
    label: 'AEMO Market Prices',
    shortLabel: 'Market Prices',
    icon: '💲',
    description:
      'Regional reference prices from AEMO dispatch. Used as the revenue backstop when OpenElectricity data is incomplete.',
    category: 'market',
    staleAfterDays: 35,
    criticallyStaleAfterDays: 90,
    refreshCommand: 'python3 pipeline/importers/import_market_prices.py',
    refreshNote: 'AEMO dispatch regional reference prices (~2 min).',
    url: 'https://aemo.com.au',
  },
  json_export: {
    id: 'json_export',
    label: 'JSON Export',
    shortLabel: 'JSON Export',
    icon: '📦',
    description:
      'Regenerates all frontend JSON files from the SQLite database. Always run after importing new upstream data to surface it in the UI.',
    category: 'registry',
    staleAfterDays: 14,
    criticallyStaleAfterDays: 35,
    refreshCommand: 'python3 pipeline/exporters/export_json.py',
    refreshNote: 'Database → static JSON for the frontend (~1 min). No API calls.',
  },
}

/**
 * Which data sources feed each page / feature. The `<DataProvenance page="...">`
 * shorthand reads this map so pages don't have to repeat the same source list.
 * Order matters — first source is the primary one shown in the compact chip row.
 */
export const PAGE_SOURCES: Record<string, SourceId[]> = {
  // Performance & Revenue
  performance: ['openelectricity_performance', 'json_export'],
  'bess-bidding': ['nemweb_bids', 'json_export'],
  'revenue-intel': ['openelectricity_performance', 'market_prices', 'json_export'],

  // Pipeline & Delivery
  'scheme-tracker': ['web_research', 'aemo_generation_info', 'json_export'],
  'drift-analysis': ['aemo_generation_info', 'web_research', 'json_export'],
  'project-timeline': ['aemo_generation_info', 'web_research', 'json_export'],
  'nem-activities': ['news_rss', 'aemo_generation_info', 'json_export'],
  'developer-scores': ['aemo_generation_info', 'web_research', 'json_export'],

  // Equipment & Technology
  'wind-resource': ['openelectricity_performance', 'web_research', 'json_export'],
  'solar-resource': ['openelectricity_performance', 'aemo_generation_info', 'json_export'],
  dunkelflaute: ['openelectricity_performance', 'json_export'],
  'eis-technical': ['web_research', 'json_export'],
  'bess-capex': ['web_research', 'aemo_generation_info', 'json_export'],
  'bess-portfolio': ['aemo_generation_info', 'web_research', 'openelectricity_5min', 'json_export', 'offtake_research'],

  // Grid & Geography
  'transmission-infra': ['aemo_isp_rez', 'epbc_referrals', 'web_research', 'json_export'],
  rez: ['aemo_isp_rez', 'aemo_generation_info', 'web_research', 'json_export'],
  'energy-mix': ['nemweb_dispatchload', 'openelectricity_performance', 'aemo_generation_info', 'json_export'],

  // Entity directories
  oems: ['web_research', 'aemo_generation_info', 'json_export'],
  developers: ['aemo_generation_info', 'web_research', 'json_export'],
  contractors: ['web_research', 'aemo_generation_info', 'json_export'],
  offtakers: ['offtake_research', 'json_export'],

  // Entity detail pages share the same sources as their index
  'oem-detail': ['web_research', 'aemo_generation_info', 'json_export'],
  'developer-detail': ['aemo_generation_info', 'web_research', 'json_export'],

  // Lifecycle Quartile Matrix — state-of-the-nation by (tech × state × stage)
  'lifecycle-quartile': ['aemo_generation_info', 'openelectricity_performance', 'web_research', 'json_export'],

  // Asset Lifecycle & Repowering — age profile, refurb candidates, OEM fleet ages, turnover forecast
  'asset-lifecycle': ['aemo_generation_info', 'openelectricity_performance', 'web_research', 'json_export'],

  // Risk & Probability Signals — supply chain concentration (T3.I) + scheme win probability (T3.J)
  'risk-signals': ['aemo_generation_info', 'web_research', 'json_export'],

  // Core
  projects: ['aemo_generation_info', 'openelectricity_performance', 'web_research', 'json_export'],
  dashboard: ['aemo_generation_info', 'openelectricity_performance', 'json_export'],
  news: ['news_rss'],
  map: ['openelectricity_metadata', 'aemo_generation_info'],
}

// ---- Freshness helpers ----

export type FreshnessStatus = 'fresh' | 'stale' | 'critical' | 'unknown'

export interface SourceFreshness {
  id: SourceId
  registry: SourceRegistryEntry
  lastRun: string | null
  ageDays: number | null
  status: FreshnessStatus
  ageLabel: string
}

const STATUS_COLOURS: Record<FreshnessStatus, string> = {
  fresh: '#22c55e',
  stale: '#f59e0b',
  critical: '#ef4444',
  unknown: '#6b7280',
}

export function statusColour(status: FreshnessStatus): string {
  return STATUS_COLOURS[status]
}

/** Days between `dateStr` and now. Returns null if the date is unparseable. */
export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const diffMs = Date.now() - d.getTime()
  return Math.floor(diffMs / 86_400_000)
}

/** "2d ago" / "3wk ago" / "5mo ago" — compact relative age for chips. */
export function relativeAgeLabel(days: number | null): string {
  if (days === null) return 'never'
  if (days < 1) return 'today'
  if (days === 1) return '1d ago'
  if (days < 14) return `${days}d ago`
  if (days < 60) return `${Math.round(days / 7)}wk ago`
  if (days < 365) return `${Math.round(days / 30)}mo ago`
  return `${Math.round(days / 365)}y ago`
}

/** Classify a source's age against its registry thresholds. */
export function classifyFreshness(
  registry: SourceRegistryEntry,
  lastRun: string | null | undefined,
): FreshnessStatus {
  const days = daysSince(lastRun)
  if (days === null) return 'unknown'
  if (days >= registry.criticallyStaleAfterDays) return 'critical'
  if (days >= registry.staleAfterDays) return 'stale'
  return 'fresh'
}

/** Given a runtime data-sources.json feed, return the enriched freshness for the requested ids. */
export function freshnessFor(
  sourceIds: SourceId[],
  runtime: Record<string, { last_run?: string | null }> | null | undefined,
): SourceFreshness[] {
  return sourceIds.map((id) => {
    const registry = SOURCE_REGISTRY[id]
    const lastRun = runtime?.[id]?.last_run ?? null
    const ageDays = daysSince(lastRun)
    const status = classifyFreshness(registry, lastRun)
    return {
      id,
      registry,
      lastRun,
      ageDays,
      status,
      ageLabel: relativeAgeLabel(ageDays),
    }
  })
}

/** Look up the source list for a page by slug; returns empty array if unknown. */
export function sourcesForPage(page: string): SourceId[] {
  return PAGE_SOURCES[page] ?? []
}
