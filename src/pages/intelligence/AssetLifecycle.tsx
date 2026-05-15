import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from 'recharts'
import DataProvenance from '../../components/common/DataProvenance'
import DataTable from '../../components/common/DataTable'
import ChartFrame from '../../components/common/ChartFrame'
import { fetchAssetLifecycle } from '../../lib/dataService'

// =====================================================================
// Types (loose — exported JSON shape)
// =====================================================================

type TechKey = 'wind' | 'solar' | 'bess' | 'pumped_hydro' | 'hybrid'

interface AgeBuckets {
  '<5y'?: number
  '5-10y'?: number
  '10-15y'?: number
  '15-20y'?: number
  '20-25y'?: number
  '25y+'?: number
}

interface AgeDistBlock {
  count: number
  avg_age: number | null
  median_age: number | null
  oldest_age: number | null
  newest_age: number | null
  buckets: AgeBuckets
}

interface CodYearRow {
  year: number
  count: number
  total_mw: number
  by_tech: Partial<Record<TechKey, number>>
}

interface OperatingAsset {
  project_id: string
  name: string
  technology: string
  state: string
  rez: string | null
  capacity_mw: number | null
  storage_mwh: number | null
  developer: string | null
  operator: string | null
  cod_year: number | null
  age_years: number | null
  age_bucket: string | null
  primary_oem: string | null
  primary_model: string | null
  cf_latest: number | null
  cf_trend: number | null
  cf_gap_to_state_median: number | null
  refurb_score: number | null
  at_risk_oem: boolean
  latitude: number | null
  longitude: number | null
}

interface OemFleetAgeRow {
  oem: string
  project_count: number
  technologies: string[]
  avg_age: number | null
  median_age: number | null
  oldest: number | null
  newest: number | null
  pct_over_15yr: number | null
  at_risk: boolean
}

interface HistoricRepoweringRow {
  project_id: string
  name: string
  technology: string
  state: string
  capacity_mw: number | null
  cod_year: number | null
  age_years: number | null
  period: string | null
  owner: string | null
  role: string | null
  acquisition_value_aud: number | null
  transaction_structure: string | null
  source_url: string | null
}

interface ProjectedTurnoverRow {
  eol_year: number
  count: number
  total_mw: number
  by_tech: Partial<Record<TechKey, number>>
}

interface AssetLifecycleData {
  summary: {
    total_operating: number
    avg_age_years: number
    over_15_years: number
    over_20_years: number
    over_25_years: number
    refurb_score_50_plus: number
    total_mw_at_risk: number
    current_year: number
    at_risk_oems: string[]
  }
  age_distribution: Partial<Record<TechKey, AgeDistBlock>>
  by_cod_year: CodYearRow[]
  refurb_candidates: OperatingAsset[]
  oem_fleet_age: OemFleetAgeRow[]
  aging_oems_flagged: OemFleetAgeRow[]
  historic_repowering: HistoricRepoweringRow[]
  projected_turnover: ProjectedTurnoverRow[]
  all_operating_assets: OperatingAsset[]
  exported_at?: string
}

// =====================================================================
// Tabs
// =====================================================================

type TabId =
  | 'overview'
  | 'age-distribution'
  | 'refurb-candidates'
  | 'oem-fleet-ages'
  | 'turnover-forecast'
  | 'historic-deals'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'age-distribution', label: 'Age Distribution' },
  { id: 'refurb-candidates', label: 'Refurb Candidates' },
  { id: 'oem-fleet-ages', label: 'OEM Fleet Ages' },
  { id: 'turnover-forecast', label: 'Fleet Turnover Forecast' },
  { id: 'historic-deals', label: 'Historic Deals' },
]

// =====================================================================
// Constants / helpers
// =====================================================================

const TECH_COLORS: Record<string, string> = {
  wind: '#3b82f6',
  solar: '#f59e0b',
  bess: '#10b981',
  pumped_hydro: '#8b5cf6',
  hybrid: '#ec4899',
  offshore_wind: '#0ea5e9',
}

const TECH_LABEL: Record<string, string> = {
  wind: 'Wind',
  solar: 'Solar',
  bess: 'BESS',
  pumped_hydro: 'Pumped Hydro',
  hybrid: 'Hybrid',
  offshore_wind: 'Offshore Wind',
}

const BUCKET_ORDER: Array<keyof AgeBuckets> = ['<5y', '5-10y', '10-15y', '15-20y', '20-25y', '25y+']

// Green → red ramp as age increases.
const BUCKET_COLOR: Record<string, string> = {
  '<5y': '#10b981',
  '5-10y': '#84cc16',
  '10-15y': '#eab308',
  '15-20y': '#f59e0b',
  '20-25y': '#f97316',
  '25y+': '#ef4444',
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function TechPill({ tech }: { tech: string }) {
  const color = TECH_COLORS[tech] ?? '#6b7280'
  const label = TECH_LABEL[tech] ?? tech
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="text-xl font-bold mt-1 text-[var(--color-text)]">{value}</div>
      {sub && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
    </div>
  )
}

// =====================================================================
// Main component
// =====================================================================

export default function AssetLifecycle() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<AssetLifecycleData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssetLifecycle()
      .then((d) => setData(d as AssetLifecycleData | null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const tab = (searchParams.get('tab') as TabId) || 'overview'

  function setTab(next: TabId) {
    const sp = new URLSearchParams(searchParams)
    if (next === 'overview') sp.delete('tab')
    else sp.set('tab', next)
    setSearchParams(sp)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">
          Loading asset lifecycle…
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-2">
          Asset Lifecycle &amp; Repowering
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Lifecycle data not available. Run the exporter and refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)] mb-1">
          Asset Lifecycle &amp; Repowering
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          The operating fleet&apos;s age profile, repowering candidates, aging OEM exposure, and
          forecast capacity turnover through 2050.
        </p>
        <div className="mt-3">
          <DataProvenance page="asset-lifecycle" />
        </div>
      </div>

      {/* Tab strip */}
      <div className="mb-6 flex gap-2 flex-wrap border-b border-[var(--color-border)] pb-3">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                active
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 text-[var(--color-primary)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'age-distribution' && <AgeDistributionTab data={data} />}
      {tab === 'refurb-candidates' && <RefurbCandidatesTab data={data} />}
      {tab === 'oem-fleet-ages' && <OemFleetAgesTab data={data} />}
      {tab === 'turnover-forecast' && <TurnoverForecastTab data={data} />}
      {tab === 'historic-deals' && <HistoricDealsTab data={data} />}
    </div>
  )
}

// =====================================================================
// Overview tab
// =====================================================================

function OverviewTab({ data }: { data: AssetLifecycleData }) {
  const { summary, age_distribution, by_cod_year, aging_oems_flagged } = data

  const over15Pct = summary.total_operating
    ? ((summary.over_15_years / summary.total_operating) * 100).toFixed(0)
    : '0'

  const atRiskGw = (summary.total_mw_at_risk / 1000).toFixed(1)

  // Avg-age bar chart, one row per tech.
  const techAgeRows = useMemo(() => {
    return (Object.entries(age_distribution) as Array<[TechKey, AgeDistBlock]>)
      .filter(([, v]) => v && v.count > 0 && v.avg_age != null)
      .map(([tech, v]) => ({
        tech: TECH_LABEL[tech] ?? tech,
        techKey: tech,
        avg_age: v.avg_age as number,
        count: v.count,
      }))
      .sort((a, b) => b.avg_age - a.avg_age)
  }, [age_distribution])

  // COD year stacked bars by tech. Use a reasonable window — wind/solar/BESS start late,
  // but hydro goes back to 1926. Show 1990+ so the wind wave reads.
  const codRows = useMemo(() => {
    return by_cod_year
      .filter((r) => r.year >= 1990)
      .map((r) => ({
        year: r.year,
        wind: r.by_tech.wind ?? 0,
        solar: r.by_tech.solar ?? 0,
        bess: r.by_tech.bess ?? 0,
        pumped_hydro: r.by_tech.pumped_hydro ?? 0,
        hybrid: r.by_tech.hybrid ?? 0,
        total: r.count,
      }))
  }, [by_cod_year])

  // Aging OEM list — exclude pumped_hydro-only OEMs (hydro ages are normal).
  const agingFiltered = useMemo(() => {
    return aging_oems_flagged.filter((o) => {
      const techs = o.technologies ?? []
      // Keep any OEM that covers wind/solar/bess. Drop pumped-hydro-only OEMs.
      return techs.some((t) => t === 'wind' || t === 'solar' || t === 'bess')
    })
  }, [aging_oems_flagged])

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total operating"
          value={`${summary.total_operating}`}
          sub={`avg age ${summary.avg_age_years.toFixed(1)}y`}
        />
        <StatCard
          label="Avg age"
          value={`${summary.avg_age_years.toFixed(1)}y`}
          sub={`oldest fleet ${summary.over_25_years} over 25y`}
        />
        <StatCard
          label="≥15 years old"
          value={`${summary.over_15_years}`}
          sub={`${over15Pct}% of fleet`}
        />
        <StatCard
          label="Refurb candidates"
          value={`${summary.refurb_score_50_plus}`}
          sub={`${atRiskGw} GW total at risk`}
        />
      </div>

      {/* Fleet age by tech */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Fleet age by technology</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Average operating age by technology. Pumped hydro dominates the top end — those turbines are designed for 50+ year lifetimes.
          </p>
        </div>
        <ChartFrame
          title="Fleet age by technology"
          height={280}
          data={techAgeRows}
          csvFilename="fleet-age-by-technology"
          csvColumns={['tech', 'count', 'avg_age']}
        >
          <BarChart data={techAgeRows} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              type="number"
              stroke="#9ca3af"
              fontSize={11}
              label={{ value: 'Avg age (years)', position: 'insideBottom', offset: -2, fill: '#9ca3af', fontSize: 11 }}
            />
            <YAxis type="category" dataKey="tech" stroke="#9ca3af" fontSize={12} width={90} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 12,
              }}
              formatter={(value) => (typeof value === 'number' ? `${value.toFixed(1)} y` : value)}
            />
            <Bar dataKey="avg_age" radius={[0, 4, 4, 0]}>
              {techAgeRows.map((d, i) => (
                <Cell key={i} fill={TECH_COLORS[d.techKey] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
      </section>

      {/* COD year profile */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">COD year profile</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            The operating fleet&apos;s commissioning history (1990→). The wave of early-2000s SA/VIC wind commissioning shows up as a cluster — those are the first repowering candidates.
          </p>
        </div>
        <ChartFrame
          title="COD year profile"
          height={300}
          data={codRows}
          csvFilename="cod-year-profile"
          csvColumns={['year', 'wind', 'solar', 'bess', 'pumped_hydro', 'hybrid', 'total']}
        >
          <BarChart data={codRows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="year" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="wind" stackId="cod" fill={TECH_COLORS.wind} name="Wind" />
            <Bar dataKey="solar" stackId="cod" fill={TECH_COLORS.solar} name="Solar" />
            <Bar dataKey="bess" stackId="cod" fill={TECH_COLORS.bess} name="BESS" />
            <Bar dataKey="pumped_hydro" stackId="cod" fill={TECH_COLORS.pumped_hydro} name="Pumped Hydro" />
            <Bar dataKey="hybrid" stackId="cod" fill={TECH_COLORS.hybrid} name="Hybrid" />
          </BarChart>
        </ChartFrame>
      </section>

      {/* Aging OEM call-out */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          OEMs with significant aging exposure
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Wind, solar and BESS OEMs with majority-aging installed bases. Pumped-hydro OEMs are excluded — 50+ year hydro turbines get refurbished on-site, not repowered.
        </p>
        {agingFiltered.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No flagged OEMs after filtering.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {agingFiltered.map((o) => (
              <li key={o.oem} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/oems/${makeSlug(o.oem)}`}
                    className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                  >
                    {o.oem}
                  </Link>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {o.project_count} projects ·{' '}
                    {(o.technologies ?? []).map((t) => TECH_LABEL[t] ?? t).join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <div className="text-[var(--color-text-muted)]">
                    avg <span className="text-[var(--color-text)] font-medium">{o.avg_age != null ? `${o.avg_age.toFixed(1)}y` : '—'}</span>
                  </div>
                  {o.at_risk && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                    >
                      ⚠️ At risk
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// =====================================================================
// Age Distribution tab
// =====================================================================

function AgeDistributionTab({ data }: { data: AssetLifecycleData }) {
  const { age_distribution, all_operating_assets } = data

  const techCards = useMemo(() => {
    return (Object.entries(age_distribution) as Array<[TechKey, AgeDistBlock]>)
      .filter(([, v]) => v && v.count > 0)
      .sort((a, b) => (b[1].avg_age ?? 0) - (a[1].avg_age ?? 0))
  }, [age_distribution])

  return (
    <div className="space-y-6">
      {/* Per-tech mini bucket charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {techCards.map(([tech, block]) => {
          const bucketRows = BUCKET_ORDER.map((bk) => ({
            bucket: bk,
            count: block.buckets?.[bk] ?? 0,
          }))
          return (
            <div
              key={tech}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TechPill tech={tech} />
                  <span className="text-sm text-[var(--color-text-muted)]">{block.count} projects</span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  avg <span className="text-[var(--color-text)] font-medium">{block.avg_age != null ? `${block.avg_age.toFixed(1)}y` : '—'}</span>
                  {' · '}
                  median <span className="text-[var(--color-text)] font-medium">{block.median_age != null ? `${Number(block.median_age).toFixed(1)}y` : '—'}</span>
                </div>
              </div>
              <ChartFrame
                title={`${TECH_LABEL[tech] ?? tech} age buckets`}
                height={160}
                data={bucketRows}
              >
                <BarChart data={bucketRows} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={10} allowDecimals={false} />
                  <YAxis type="category" dataKey="bucket" stroke="#9ca3af" fontSize={10} width={50} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#f1f5f9',
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {bucketRows.map((d, i) => (
                      <Cell key={i} fill={BUCKET_COLOR[d.bucket] ?? '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartFrame>
            </div>
          )
        })}
      </div>

      {/* Full fleet table */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Operating fleet</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          All {all_operating_assets.length} operating assets — sortable by age, MW, or capacity factor.
        </p>
        <DataTable
          rows={all_operating_assets}
          columns={[
            {
              key: 'name',
              label: 'Project',
              render: (_v, row) => (
                <Link
                  to={`/projects/${row.project_id}`}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            {
              key: 'technology',
              label: 'Tech',
              render: (v) => <TechPill tech={String(v)} />,
            },
            { key: 'state', label: 'State' },
            { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'cod_year', label: 'COD Year', format: 'integer' },
            { key: 'age_years', label: 'Age', format: 'integer' },
            {
              key: 'primary_oem',
              label: 'OEM',
              render: (v) => <span>{truncate(v as string | null, 20)}</span>,
            },
            {
              key: 'cf_latest',
              label: 'CF Latest',
              format: 'percent1',
              hideOnMobile: true,
            },
            {
              key: 'cf_trend',
              label: 'CF Trend',
              hideOnMobile: true,
              render: (v) => {
                if (v === null || v === undefined) return <span>—</span>
                const n = Number(v)
                if (!Number.isFinite(n)) return <span>—</span>
                const color = n > 0 ? '#10b981' : n < 0 ? '#ef4444' : '#94a3b8'
                return <span style={{ color }}>{n.toFixed(1)}</span>
              },
            },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'capacity_mw', dir: 'desc' }}
          csvFilename="operating-fleet-ages"
          csvColumns={[
            'project_id',
            'name',
            'technology',
            'state',
            'capacity_mw',
            'cod_year',
            'age_years',
            'age_bucket',
            'primary_oem',
            'cf_latest',
            'cf_trend',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Refurb Candidates tab
// =====================================================================

function RefurbCandidatesTab({ data }: { data: AssetLifecycleData }) {
  const rows = data.refurb_candidates
  const count = rows.length

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        <strong className="text-[var(--color-text)]">{count} projects</strong> scored as repowering /
        refurbishment candidates — based on age (0-60 pts), OEM risk (0-25 pts for bankrupt or stressed
        manufacturers like Senvion, Suzlon), and capacity factor underperformance vs state median
        (0-15 pts). Higher score = stronger repowering signal.
      </div>

      <p className="text-xs italic text-[var(--color-text-muted)] leading-relaxed">
        Excludes pumped hydro — hydro turbines routinely refurbish in place, they don&apos;t repower
        like wind. OEM risk flags are conservative: a Senvion fleet with strong maintenance can still
        be delivering solid output today.
      </p>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'name',
              label: 'Project',
              render: (_v, row) => (
                <Link
                  to={`/projects/${row.project_id}`}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            {
              key: 'technology',
              label: 'Tech',
              hideOnMobile: true,
              render: (v) => <TechPill tech={String(v)} />,
            },
            { key: 'state', label: 'State' },
            { key: 'capacity_mw', label: 'MW', format: 'number0' },
            { key: 'cod_year', label: 'COD Year', format: 'integer' },
            { key: 'age_years', label: 'Age', format: 'integer' },
            {
              key: 'primary_oem',
              label: 'OEM',
              render: (v) => <span>{truncate(v as string | null, 20)}</span>,
            },
            {
              key: 'primary_model',
              label: 'OEM Model',
              hideOnMobile: true,
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            {
              key: 'at_risk_oem',
              label: 'At Risk OEM',
              render: (v) =>
                v ? (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                    title="OEM flagged as bankrupt or stressed"
                  >
                    ⚠️
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                ),
            },
            { key: 'cf_latest', label: 'CF Latest', format: 'percent1' },
            {
              key: 'cf_gap_to_state_median',
              label: 'CF vs Median',
              render: (v) => {
                if (v === null || v === undefined) return <span>—</span>
                const n = Number(v)
                if (!Number.isFinite(n)) return <span>—</span>
                // cf_gap = cf_latest - state_median
                // Positive gap = project performs ABOVE median → good → green
                // Negative gap = project performs BELOW median → bad → red
                const color = n > 0 ? '#10b981' : n < 0 ? '#ef4444' : '#94a3b8'
                const prefix = n > 0 ? '+' : ''
                return <span style={{ color }}>{prefix}{n.toFixed(1)}</span>
              },
            },
            {
              key: 'refurb_score',
              label: 'Refurb Score',
              render: (v) => {
                if (v === null || v === undefined) return <span>—</span>
                const n = Number(v)
                if (!Number.isFinite(n)) return <span>—</span>
                const color =
                  n >= 80 ? '#ef4444' : n >= 60 ? '#f59e0b' : n >= 40 ? '#eab308' : '#94a3b8'
                return <span style={{ color, fontWeight: 600 }}>{n.toFixed(1)}</span>
              },
            },
          ]}
          showRowNumbers
          defaultSort={{ key: 'refurb_score', dir: 'desc' }}
          csvFilename="refurb-candidates"
          csvColumns={[
            'project_id',
            'name',
            'technology',
            'state',
            'capacity_mw',
            'cod_year',
            'age_years',
            'age_bucket',
            'primary_oem',
            'primary_model',
            'at_risk_oem',
            'cf_latest',
            'cf_gap_to_state_median',
            'refurb_score',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// OEM Fleet Ages tab
// =====================================================================

function OemFleetAgesTab({ data }: { data: AssetLifecycleData }) {
  const rows = data.oem_fleet_age

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Per-OEM fleet age — surfaces which manufacturers have predominantly aging installed bases.
        Hydro OEMs (Fuji, Toshiba, Voith etc.) have naturally very old fleets because hydro turbines
        are designed for 50+ year lifetimes and refurbished in place rather than replaced. Wind OEM
        aging is the real repowering signal.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'oem',
              label: 'OEM',
              render: (_v, row) => (
                <Link
                  to={`/oems/${makeSlug(row.oem)}`}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {row.oem}
                </Link>
              ),
            },
            { key: 'project_count', label: 'Projects', format: 'integer' },
            {
              key: 'technologies',
              label: 'Technologies',
              hideOnMobile: true,
              sortable: false,
              render: (v) => {
                const arr = Array.isArray(v) ? v : []
                if (arr.length === 0) return <span className="text-[var(--color-text-muted)]">—</span>
                return <span>{arr.map((t) => TECH_LABEL[t] ?? t).join(', ')}</span>
              },
            },
            { key: 'avg_age', label: 'Avg Age', format: 'number1' },
            { key: 'median_age', label: 'Median', format: 'number1', hideOnMobile: true },
            { key: 'oldest', label: 'Oldest', format: 'integer', hideOnMobile: true },
            { key: 'pct_over_15yr', label: '% over 15y', format: 'percent0' },
            {
              key: 'at_risk',
              label: 'At Risk',
              render: (v) =>
                v ? (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
                  >
                    ⚠️
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                ),
            },
          ]}
          showRowNumbers
          defaultSort={{ key: 'project_count', dir: 'desc' }}
          csvFilename="oem-fleet-ages"
          csvColumns={[
            'oem',
            'project_count',
            'avg_age',
            'median_age',
            'oldest',
            'newest',
            'pct_over_15yr',
            'at_risk',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Fleet Turnover Forecast tab
// =====================================================================

function TurnoverForecastTab({ data }: { data: AssetLifecycleData }) {
  const rows = data.projected_turnover

  const chartRows = useMemo(
    () =>
      rows.map((r) => ({
        eol_year: r.eol_year,
        count: r.count,
        total_mw: r.total_mw,
      })),
    [rows],
  )

  const tableRows = useMemo(
    () =>
      rows.map((r) => ({
        eol_year: r.eol_year,
        count: r.count,
        total_mw: r.total_mw,
        wind: r.by_tech.wind ?? 0,
        solar: r.by_tech.solar ?? 0,
        bess: r.by_tech.bess ?? 0,
        pumped_hydro: r.by_tech.pumped_hydro ?? 0,
      })),
    [rows],
  )

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Forecast end-of-life timeline assuming a nominal 25-year operating life. Projects won&apos;t
        all retire exactly at 25 years — many will be repowered, refurbished, or operate for 30+
        years — but this shows the scale of upcoming replacement decisions.
      </div>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
          Forecast retirements by year
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Project count (bars) vs total MW reaching nominal end-of-life (line).
        </p>
        <ChartFrame
          title="Fleet turnover forecast"
          height={320}
          data={chartRows}
          csvFilename="fleet-turnover-chart"
          csvColumns={['eol_year', 'count', 'total_mw']}
        >
          <ComposedChart data={chartRows} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="eol_year" stroke="#9ca3af" fontSize={11} />
            <YAxis
              yAxisId="left"
              stroke="#9ca3af"
              fontSize={11}
              allowDecimals={false}
              label={{
                value: 'Projects',
                angle: -90,
                position: 'insideLeft',
                fill: '#9ca3af',
                fontSize: 11,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              fontSize={11}
              label={{
                value: 'Total MW',
                angle: 90,
                position: 'insideRight',
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#f1f5f9',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Projects" radius={[2, 2, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total_mw"
              name="Total MW"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ChartFrame>
      </section>

      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Year-by-year detail</h2>
        <DataTable
          rows={tableRows}
          columns={[
            { key: 'eol_year', label: 'EoL Year', format: 'integer' },
            { key: 'count', label: 'Count', format: 'integer', aggregator: 'sum' },
            { key: 'total_mw', label: 'Total MW', format: 'number0', aggregator: 'sum' },
            { key: 'wind', label: 'Wind', format: 'integer', aggregator: 'sum' },
            { key: 'solar', label: 'Solar', format: 'integer', aggregator: 'sum' },
            { key: 'bess', label: 'BESS', format: 'integer', aggregator: 'sum' },
            { key: 'pumped_hydro', label: 'Hydro', format: 'integer', aggregator: 'sum' },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'eol_year', dir: 'asc' }}
          csvFilename="fleet-turnover-forecast"
          csvColumns={[
            'eol_year',
            'count',
            'total_mw',
            'wind',
            'solar',
            'bess',
            'pumped_hydro',
          ]}
        />
      </section>
    </div>
  )
}

// =====================================================================
// Historic Deals tab
// =====================================================================

function HistoricDealsTab({ data }: { data: AssetLifecycleData }) {
  const rows = data.historic_repowering

  if (rows.length === 0) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 text-sm text-[var(--color-text-muted)] leading-relaxed">
        Historic repowering and aged-asset-acquisition deals will appear here as ownership_history
        records accumulate. Currently{' '}
        <strong className="text-[var(--color-text)]">{rows.length}</strong> records in the ownership
        history database cover projects ≥ 10 years old — a known data gap that future enrichment
        passes will close.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Historic repowering &amp; aged-asset deals
        </h2>
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'name',
              label: 'Project',
              render: (_v, row) => (
                <Link
                  to={`/projects/${row.project_id}`}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            {
              key: 'technology',
              label: 'Tech',
              render: (v) => <TechPill tech={String(v)} />,
            },
            { key: 'state', label: 'State' },
            { key: 'capacity_mw', label: 'MW', format: 'number0', aggregator: 'sum' },
            { key: 'cod_year', label: 'COD Year', format: 'integer' },
            { key: 'age_years', label: 'Age at Deal', format: 'integer' },
            { key: 'period', label: 'Period' },
            {
              key: 'owner',
              label: 'Owner',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            { key: 'role', label: 'Role' },
            {
              key: 'acquisition_value_aud',
              label: 'Value (AUD)',
              format: 'currency0',
            },
            {
              key: 'transaction_structure',
              label: 'Structure',
              render: (v) => <span>{truncate(v as string | null, 25)}</span>,
            },
            {
              key: 'source_url',
              label: 'Source',
              sortable: false,
              render: (v) => {
                const url = v as string | null
                if (!url) return <span className="text-[var(--color-text-muted)]">—</span>
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )
              },
            },
          ]}
          showRowNumbers
          showTotals
          defaultSort={{ key: 'cod_year', dir: 'asc' }}
          csvFilename="historic-repowering-deals"
          csvColumns={[
            'project_id',
            'name',
            'technology',
            'state',
            'capacity_mw',
            'cod_year',
            'age_years',
            'period',
            'owner',
            'role',
            'acquisition_value_aud',
            'transaction_structure',
            'source_url',
          ]}
        />
      </section>
    </div>
  )
}
