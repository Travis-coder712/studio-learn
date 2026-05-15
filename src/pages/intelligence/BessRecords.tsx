import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import { fetchBessRecordsLeaderboard } from '../../lib/dataService'
import DataProvenance from '../../components/common/DataProvenance'

// ── Types ───────────────────────────────────────────────────────────────────

interface RevenueEstimate {
  avg_rrp: number
  peak_rrp: number
  p90_rrp: number
  estimated_revenue_aud: number
}

interface Battery {
  duid: string
  name: string
  region: string
  capacity_mwh: number | null
  days_active: number
  first_date: string
  last_date: string
  // Daily records
  peak_discharge_mwh: number
  peak_discharge_date: string
  peak_charge_mwh: number
  peak_charge_date: string
  total_discharge_mwh: number
  total_charge_mwh: number
  // Quarterly
  peak_quarter_discharge_mwh?: number | null
  peak_quarter_discharge_q?: string | null
  peak_quarter_charge_mwh?: number | null
  peak_quarter_charge_q?: string | null
  // 5-min peaks
  peak_discharge_mw?: number | null
  peak_discharge_mw_date?: string | null
  peak_discharge_mw_time?: string | null
  peak_charge_mw?: number | null
  peak_charge_mw_date?: string | null
  peak_charge_mw_time?: string | null
  // 30-min window
  peak_30min_mwh?: number | null
  peak_30min_date?: string | null
  peak_30min_start?: string | null
  peak_30min_charge_mwh?: number | null
  peak_30min_charge_date?: string | null
  // 1-hr window
  peak_1hr_mwh?: number | null
  peak_1hr_date?: string | null
  peak_1hr_start?: string | null
  peak_1hr_charge_mwh?: number | null
  peak_1hr_charge_date?: string | null
  // Revenue
  peak_discharge_revenue?: RevenueEstimate | null
}

interface FleetRecord {
  value_mwh?: number
  date?: string
  value_mw?: number
  time?: string
}

interface FleetRecords {
  fleet_peak_discharge_day: FleetRecord
  fleet_peak_charge_day: FleetRecord
  peak_5min_discharge_mw?: FleetRecord
  peak_5min_charge_mw?: FleetRecord
}

interface TimelineEvent {
  date: string
  value: number
  duid: string
  name: string
}

interface LeaderboardData {
  generated_at: string
  data_through: string
  total_batteries: number
  has_5min_data: boolean
  has_30min_data: boolean
  has_price_data: boolean
  batteries: Battery[]
  fleet_records: Record<string, FleetRecords>
  records_timeline: Record<string, {
    daily_discharge: TimelineEvent[]
    daily_charge: TimelineEvent[]
    '5min_discharge': TimelineEvent[]
  }>
  top_discharge: Record<string, Battery[]>
  top_charge: Record<string, Battery[]>
  top_discharge_5min: Record<string, Battery[]>
  top_30min: Record<string, Battery[]>
  top_1hr: Record<string, Battery[]>
}

type Period = '5min' | '30min' | '1hr' | 'daily' | 'quarterly'

// ── Constants ────────────────────────────────────────────────────────────────

const SCOPES = [
  { id: 'NEM', label: 'NEM', fullLabel: 'National (NEM)' },
  { id: 'NSW',  label: 'NSW', fullLabel: 'New South Wales' },
  { id: 'VIC',  label: 'VIC', fullLabel: 'Victoria' },
  { id: 'QLD',  label: 'QLD', fullLabel: 'Queensland' },
  { id: 'SA',   label: 'SA',  fullLabel: 'South Australia' },
]

const PERIODS: { id: Period; label: string; desc: string }[] = [
  { id: '5min',      label: '5-min',    desc: 'Peak MW in a single 5-min dispatch interval' },
  { id: '30min',     label: '30-min',   desc: 'Peak MWh in any 30-min window (6 intervals)' },
  { id: '1hr',       label: '1-hr',     desc: 'Peak MWh in any 1-hour window (12 intervals)' },
  { id: 'daily',     label: 'Daily',    desc: 'Peak MWh in a single calendar day (24 hours)' },
  { id: 'quarterly', label: 'Quarterly',desc: 'Peak MWh in a single calendar quarter (3 months)' },
]

const REGION_COLOR: Record<string, string> = {
  NSW:  '#3b82f6',
  VIC:  '#06b6d4',
  QLD:  '#f59e0b',
  SA:   '#f97316',
  TAS:  '#8b5cf6',
  NEM:  '#10b981',
}

const REGION_BG: Record<string, string> = {
  NSW:  'bg-blue-500/15 text-blue-300',
  VIC:  'bg-cyan-500/15 text-cyan-300',
  QLD:  'bg-amber-500/15 text-amber-300',
  SA:   'bg-orange-500/15 text-orange-300',
  TAS:  'bg-purple-500/15 text-purple-300',
}

const RANK_STYLE = [
  { bg: 'bg-amber-500/20', text: 'text-amber-300', icon: '🥇' },
  { bg: 'bg-slate-400/20', text: 'text-slate-300', icon: '🥈' },
  { bg: 'bg-orange-700/20', text: 'text-orange-400', icon: '🥉' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—'
  return n.toLocaleString('en-AU', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })
}

function fmtTime(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtAud(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(n).toLocaleString('en-AU')}`
}

/** Per-period discharge value and unit for a battery */
function periodValue(b: Battery, period: Period, side: 'discharge' | 'charge'): number | null | undefined {
  if (side === 'discharge') {
    if (period === '5min')      return b.peak_discharge_mw
    if (period === '30min')     return b.peak_30min_mwh
    if (period === '1hr')       return b.peak_1hr_mwh
    if (period === 'daily')     return b.peak_discharge_mwh
    if (period === 'quarterly') return b.peak_quarter_discharge_mwh
  } else {
    if (period === '5min')      return b.peak_charge_mw
    if (period === '30min')     return b.peak_30min_charge_mwh
    if (period === '1hr')       return b.peak_1hr_charge_mwh
    if (period === 'daily')     return b.peak_charge_mwh
    if (period === 'quarterly') return b.peak_quarter_charge_mwh
  }
}

function periodUnit(period: Period): string {
  return period === '5min' ? 'MW' : 'MWh'
}

function periodDateField(b: Battery, period: Period, side: 'discharge' | 'charge'): string | null | undefined {
  if (side === 'discharge') {
    if (period === '5min')      return b.peak_discharge_mw_date
    if (period === '30min')     return b.peak_30min_date
    if (period === '1hr')       return b.peak_1hr_date
    if (period === 'daily')     return b.peak_discharge_date
    if (period === 'quarterly') return b.peak_quarter_discharge_q
  } else {
    if (period === '5min')      return b.peak_charge_mw_date
    if (period === '30min')     return b.peak_30min_charge_date
    if (period === '1hr')       return b.peak_1hr_charge_date
    if (period === 'daily')     return b.peak_charge_date
    if (period === 'quarterly') return b.peak_quarter_charge_q
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function HeroRecord({
  label, value, unit, sub, color,
}: { label: string; value: string; unit: string; sub?: string; color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>{label}</span>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-3xl font-bold text-[var(--color-text)]">{value}</span>
        <span className="text-sm text-[var(--color-text-muted)]">{unit}</span>
      </div>
      {sub && <span className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</span>}
    </div>
  )
}

function RegionChip({ region }: { region: string }) {
  const short = region.replace('1', '')
  const cls = REGION_BG[short] || 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>
      {short}
    </span>
  )
}

function BarFill({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4
  return (
    <div className="flex-1 bg-[var(--color-bg)] rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function FleetRecordRow({ label, record, unit, color }: {
  label: string; record?: FleetRecord; unit: string; color: string
}) {
  if (!record?.value_mwh && !record?.value_mw) return null
  const value = record.value_mwh ?? record.value_mw ?? 0
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color }}>{fmt(value, 0)}</span>
        <span className="text-xs text-[var(--color-text-muted)] ml-1">{unit}</span>
        {record.date && (
          <span className="text-[10px] text-[var(--color-text-muted)] block">
            {fmtDate(record.date)}{record.time ? ` · ${fmtTime(record.time)}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

/** Staircase/step timeline chart showing when records were progressively broken. */
function RecordsTimeline({
  events, color, unit, title,
}: {
  events: TimelineEvent[]; color: string; unit: string; title: string
}) {
  if (!events || events.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-[var(--color-text-muted)]">
        Not enough records to plot a timeline for this scope.
      </div>
    )
  }

  // Build step chart: for each event, we emit two points to create a horizontal step
  // {date, value, duid, name} → flat step series
  const chartData: { date: string; value: number; name: string }[] = []
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]
    // If not first, carry previous value up to this date (creates the horizontal plateau)
    if (i > 0) {
      chartData.push({ date: ev.date, value: events[i - 1].value, name: events[i - 1].name })
    }
    chartData.push({ date: ev.date, value: ev.value, name: ev.name })
  }
  // Extend to today
  const today = new Date().toISOString().slice(0, 10)
  if (events.length > 0) {
    chartData.push({ date: today, value: events[events.length - 1].value, name: events[events.length - 1].name })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const p = payload[0]
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-2 text-xs shadow-lg">
        <p className="text-[var(--color-text-muted)]">{fmtDate(label)}</p>
        <p className="font-semibold" style={{ color }}>{fmt(p.value)} {unit}</p>
        <p className="text-[var(--color-text-muted)] max-w-[180px] truncate">{p.payload?.name}</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">{title}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
        {events.length} record{events.length !== 1 ? 's' : ''} set · {fmtDate(events[0].date)} → {fmtDate(events[events.length - 1].date)}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="tl-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                 tickFormatter={d => fmtDate(d)} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                 tickFormatter={v => fmt(v)} width={52} />
          <Tooltip content={<CustomTooltip />} />
          {events.map((ev, i) => (
            <ReferenceLine key={i} x={ev.date} stroke={color} strokeWidth={1}
                           strokeOpacity={0.35} strokeDasharray="2 2" />
          ))}
          <Area type="stepAfter" dataKey="value" stroke={color} strokeWidth={2}
                fill="url(#tl-grad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Record-setter labels */}
      <div className="mt-3 space-y-1">
        {events.slice(-5).reverse().map((ev, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="text-[var(--color-text-muted)] w-20 flex-shrink-0">{fmtDate(ev.date)}</span>
            <span className="font-semibold" style={{ color }}>{fmt(ev.value)} {unit}</span>
            <span className="text-[var(--color-text-muted)] truncate">{ev.name}</span>
          </div>
        ))}
        {events.length > 5 && (
          <p className="text-[10px] text-[var(--color-text-muted)]">…and {events.length - 5} earlier records</p>
        )}
      </div>
    </div>
  )
}

/** Revenue lens card for the #1 battery in the current scope. */
function RevenueLens({ battery }: { battery: Battery | undefined }) {
  if (!battery) return null
  const rev = battery.peak_discharge_revenue
  if (!rev) return null

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
        💰 Revenue Lens — {battery.name}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)]">Est. revenue on peak discharge day</p>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{fmtAud(rev.estimated_revenue_aud)}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">{fmtDate(battery.peak_discharge_date)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)]">Avg spot price that day</p>
          <p className="text-xl font-bold text-amber-400 mt-0.5">${fmt(rev.avg_rrp, 0)}/MWh</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">Regional reference price</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)]">Peak spot price that day</p>
          <p className="text-xl font-bold text-red-400 mt-0.5">${fmt(rev.peak_rrp, 0)}/MWh</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">Daily maximum RRP</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)]">P90 price (dispatch value)</p>
          <p className="text-xl font-bold text-blue-400 mt-0.5">${fmt(rev.p90_rrp, 0)}/MWh</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">90th-percentile RRP</p>
        </div>
      </div>
      <p className="text-[10px] text-[var(--color-text-muted)] mt-3 leading-relaxed">
        <span className="font-medium text-[var(--color-text)]">Methodology:</span> Revenue estimate =
        peak discharge MWh × P90 regional spot price. Actual revenue depends on battery's dispatch profile,
        FCAS participation, and bilateral contracts. Source: AEMO NEMWEB DISPATCHPRICE.
      </p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BessRecords() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState('NEM')
  const [tab, setTab] = useState<'discharge' | 'charge'>('discharge')
  const [period, setPeriod] = useState<Period>('daily')

  useEffect(() => {
    fetchBessRecordsLeaderboard().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--color-bg-card)] rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-[var(--color-bg-card)] rounded-xl" />)}
          </div>
          <div className="h-96 bg-[var(--color-bg-card)] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl">
        <p className="text-sm text-[var(--color-text-muted)]">
          Data unavailable. Run <code className="text-xs bg-[var(--color-bg-card)] px-1 rounded">python3 pipeline/exporters/export_json.py</code> to generate.
        </p>
      </div>
    )
  }

  const fr = data.fleet_records?.[scope] || data.fleet_records?.['NEM'] || {}
  const nemFr = data.fleet_records?.['NEM'] || {}
  const scopeLabel = SCOPES.find(s => s.id === scope)?.fullLabel || scope
  const accentDischarge = '#10b981'
  const accentCharge = '#8b5cf6'
  const unit = periodUnit(period)

  // Sorted battery list for current scope + period + tab
  const allBatteries = data.batteries || []
  const scopedBatteries = allBatteries
    .filter(b => scope === 'NEM' || b.region === scope)
    .filter(b => (periodValue(b, period, tab) ?? 0) > 0)
    .sort((a, b) => (periodValue(b, period, tab) ?? 0) - (periodValue(a, period, tab) ?? 0))

  // NEM hero stats (always NEM scope, daily period for heroes)
  const nemDischarge = data.top_discharge?.['NEM']?.[0]
  const nemCharge = data.top_charge?.['NEM']?.[0]
  const nemPeak5min = (data.top_discharge_5min?.['NEM'] || [])[0]

  // Timeline data for current scope
  const tlKey = scope === 'NEM' ? 'NEM' : scope
  const tl = data.records_timeline?.[tlKey] || { daily_discharge: [], daily_charge: [], '5min_discharge': [] }
  const tlEvents = tab === 'discharge'
    ? (period === '5min' ? tl['5min_discharge'] : tl.daily_discharge)
    : tl.daily_charge

  // Revenue lens: top battery in scope by daily discharge
  const topForRevenue = allBatteries
    .filter(b => scope === 'NEM' || b.region === scope)
    .sort((a, b) => (b.peak_discharge_mwh || 0) - (a.peak_discharge_mwh || 0))[0]

  // Period availability flags
  const has5min = data.has_5min_data
  const has30min = data.has_30min_data

  return (
    <div className="p-4 lg:p-8 max-w-6xl space-y-6">
      {/* Page header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mb-3">
          <Link to="/intelligence" className="hover:text-[var(--color-accent)]">Intelligence</Link>
          <span>/</span>
          <span className="text-[var(--color-text)]">BESS Records Leaderboard</span>
        </nav>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">BESS Records Leaderboard</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          All-time discharge and charge records across {data.total_batteries} grid-scale batteries in the NEM.
          Data from AEMO MMSDM DISPATCHLOAD · {data.data_through ? `Through ${fmtDate(data.data_through)}` : ''}.
        </p>
        <div className="mt-3">
          <DataProvenance sources={['nemweb_dispatchload', 'json_export']} />
        </div>
      </div>

      {/* NEM Hero records — always NEM scope, daily values */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
          NEM All-Time Records
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeroRecord
            label="Single Battery — Best Discharge Day"
            value={fmt(nemDischarge?.peak_discharge_mwh)}
            unit="MWh"
            sub={`${nemDischarge?.name ?? '—'} · ${fmtDate(nemDischarge?.peak_discharge_date)}`}
            color={accentDischarge}
          />
          <HeroRecord
            label="Single Battery — Best Charge Day"
            value={fmt(nemCharge?.peak_charge_mwh)}
            unit="MWh"
            sub={`${nemCharge?.name ?? '—'} · ${fmtDate(nemCharge?.peak_charge_date)}`}
            color={accentCharge}
          />
          <HeroRecord
            label="Fleet — Peak Discharge Day"
            value={fmt(nemFr.fleet_peak_discharge_day?.value_mwh)}
            unit="MWh"
            sub={`All NEM batteries · ${fmtDate(nemFr.fleet_peak_discharge_day?.date)}`}
            color="#f59e0b"
          />
          {nemFr.peak_5min_discharge_mw ? (
            <HeroRecord
              label="Fleet — Peak 5-min Output"
              value={fmt(nemFr.peak_5min_discharge_mw?.value_mw)}
              unit="MW"
              sub={`${fmtDate(nemFr.peak_5min_discharge_mw?.date)}${nemFr.peak_5min_discharge_mw?.time ? ` · ${fmtTime(nemFr.peak_5min_discharge_mw?.time)}` : ''}`}
              color="#ec4899"
            />
          ) : (
            <HeroRecord
              label="Single Battery — Best 5-min"
              value={fmt(nemPeak5min?.peak_discharge_mw)}
              unit="MW"
              sub={`${nemPeak5min?.name ?? '—'} · ${fmtDate(nemPeak5min?.peak_discharge_mw_date)}`}
              color="#ec4899"
            />
          )}
        </div>
      </div>

      {/* Controls row: scope · period · tab */}
      <div className="flex flex-col gap-3">
        {/* Scope pills */}
        <div className="flex gap-1.5 flex-wrap">
          {SCOPES.map(s => {
            const active = scope === s.id
            const color = REGION_COLOR[s.id] || REGION_COLOR['NEM']
            return (
              <button key={s.id} onClick={() => setScope(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'text-black'
                          : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                      }`}
                      style={active ? { background: color } : {}}>
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Period pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mr-1">Window:</span>
          {PERIODS.map(p => {
            const active = period === p.id
            const unavailable = (p.id === '5min' && !has5min) || (p.id === '30min' && !has30min) || (p.id === '1hr' && !has30min)
            return (
              <button key={p.id}
                      onClick={() => !unavailable && setPeriod(p.id)}
                      title={unavailable ? 'Data not yet available — run backfill' : p.desc}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        unavailable
                          ? 'opacity-40 cursor-not-allowed bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                          : active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                      }`}>
                {p.label}
                {unavailable && <span className="ml-1 text-[9px]">⏳</span>}
              </button>
            )
          })}
        </div>

        {/* Discharge / Charge tab */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)] self-start">
          <button onClick={() => setTab('discharge')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'discharge'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}>
            ⚡ Discharge
          </button>
          <button onClick={() => setTab('charge')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors border-l border-[var(--color-border)] ${
                    tab === 'charge'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}>
            🔋 Charge
          </button>
        </div>
      </div>

      {/* Period description strip */}
      {period !== 'daily' && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-300">
          <span className="font-semibold">{PERIODS.find(p => p.id === period)?.label}:</span>{' '}
          {PERIODS.find(p => p.id === period)?.desc}
        </div>
      )}

      {/* Scope fleet records strip */}
      {(fr.fleet_peak_discharge_day?.value_mwh || fr.peak_5min_discharge_mw?.value_mw) && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
            {scopeLabel} Fleet Records
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
            <FleetRecordRow label="Peak fleet discharge day"
              record={fr.fleet_peak_discharge_day} unit="MWh" color={accentDischarge} />
            <FleetRecordRow label="Peak fleet charge day"
              record={fr.fleet_peak_charge_day} unit="MWh" color={accentCharge} />
            <FleetRecordRow label="Peak 5-min discharge"
              record={fr.peak_5min_discharge_mw} unit="MW" color="#f59e0b" />
            <FleetRecordRow label="Peak 5-min charge"
              record={fr.peak_5min_charge_mw} unit="MW" color="#ec4899" />
          </div>
        </div>
      )}

      {/* Main leaderboard — dynamic per period + tab */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]"
             style={{ borderLeftWidth: 3, borderLeftColor: tab === 'discharge' ? accentDischarge : accentCharge }}>
          <span className="text-base">{tab === 'discharge' ? '⚡' : '🔋'}</span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {tab === 'discharge' ? 'Discharge' : 'Charge'} Records — {PERIODS.find(p => p.id === period)?.label} · {scopeLabel}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {scopedBatteries.length} batteries · ranked by {PERIODS.find(p => p.id === period)?.label} {unit}
            </p>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[var(--color-border)]">
          {scopedBatteries.length === 0 && (
            <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
              {period === '30min' || period === '1hr' ? (
                <span>No {period} window data yet. Run <code className="bg-[var(--color-bg)] px-1 rounded">import_bess_5min.py --months 2024-08 2026-03</code> to populate.</span>
              ) : (
                <span>No data for this scope.</span>
              )}
            </div>
          )}
          {scopedBatteries.map((b, i) => {
            const val = periodValue(b, period, tab) ?? 0
            const dateLabel = periodDateField(b, period, tab)
            const rs = RANK_STYLE[i] || null
            const color = REGION_COLOR[b.region] || '#64748b'
            const maxVal = periodValue(scopedBatteries[0], period, tab) || 1

            return (
              <div key={b.duid}
                   className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg)]/50 transition-colors">
                {/* Rank */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                                ${rs ? `${rs.bg} ${rs.text}` : 'text-[var(--color-text-muted)]'}`}>
                  {rs ? rs.icon : i + 1}
                </div>

                {/* Name + region + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-[var(--color-text)] truncate max-w-[180px]"
                          title={b.name}>
                      {b.name}
                    </span>
                    <RegionChip region={b.region} />
                    <span className="text-[9px] text-[var(--color-text-muted)]">{b.duid}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <BarFill value={val} max={maxVal} color={color} />
                    <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
                      {period === 'quarterly' ? dateLabel : fmtDate(dateLabel)}
                    </span>
                  </div>
                </div>

                {/* Value */}
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color }}>{fmt(val, unit === 'MWh' ? 0 : 1)}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] ml-0.5">{unit}</span>
                  {/* Revenue hint for daily discharge */}
                  {period === 'daily' && tab === 'discharge' && b.peak_discharge_revenue && (
                    <p className="text-[9px] text-emerald-400/70">
                      ~{fmtAud(b.peak_discharge_revenue.estimated_revenue_aud)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue Lens */}
      {data.has_price_data && tab === 'discharge' && (
        <RevenueLens battery={topForRevenue} />
      )}

      {/* Records Timeline */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-sm font-semibold text-[var(--color-text)] mb-1">Records Timeline</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-4">
          When was each new {scopeLabel} {tab} record first set? Each step = a new all-time high.
        </p>
        <RecordsTimeline
          events={tlEvents}
          color={tab === 'discharge' ? accentDischarge : accentCharge}
          unit={period === '5min' ? 'MW' : 'MWh'}
          title={`${scopeLabel} ${tab === 'discharge' ? 'Discharge' : 'Charge'} Record Progression`}
        />
      </div>

      {/* Full battery reference table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <p className="text-sm font-semibold text-[var(--color-text)]">All Batteries — Reference Table</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Daily peak discharge and charge (MWh) · all batteries in current scope · scroll horizontally for MW peaks
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]">
                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Battery</th>
                <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Region</th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Peak Day ⚡</th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-500 hidden md:table-cell">Date</th>
                {has5min && <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-yellow-400 hidden md:table-cell">5-min ⚡ MW</th>}
                {has30min && <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-lime-400 hidden lg:table-cell">30-min ⚡</th>}
                {has30min && <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-teal-400 hidden lg:table-cell">1-hr ⚡</th>}
                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-purple-400">Peak Day 🔋</th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-purple-400 hidden md:table-cell">Date</th>
                {has5min && <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-400 hidden md:table-cell">5-min 🔋 MW</th>}
                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hidden xl:table-cell">Total ⚡ MWh</th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hidden xl:table-cell">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {allBatteries
                .filter(b => scope === 'NEM' || b.region === scope)
                .sort((a, b) => (b.peak_discharge_mwh || 0) - (a.peak_discharge_mwh || 0))
                .map((b, i) => {
                  const color = REGION_COLOR[b.region] || '#64748b'
                  return (
                    <tr key={b.duid} className="hover:bg-[var(--color-bg)]/40 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--color-text-muted)] w-4 text-right">{i + 1}</span>
                          <div>
                            <span className="font-medium text-[var(--color-text)]">{b.name}</span>
                            <span className="text-[10px] text-[var(--color-text-muted)] ml-1.5">{b.duid}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <RegionChip region={b.region} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-semibold" style={{ color }}>{fmt(b.peak_discharge_mwh)}</span>
                        <span className="text-[var(--color-text-muted)] ml-0.5">MWh</span>
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--color-text-muted)] hidden md:table-cell">
                        {fmtDate(b.peak_discharge_date)}
                      </td>
                      {has5min && (
                        <td className="px-3 py-2 text-right hidden md:table-cell">
                          {b.peak_discharge_mw != null
                            ? <><span className="font-semibold text-yellow-400">{fmt(b.peak_discharge_mw, 1)}</span><span className="text-[var(--color-text-muted)] ml-0.5">MW</span></>
                            : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                      )}
                      {has30min && (
                        <td className="px-3 py-2 text-right hidden lg:table-cell">
                          {b.peak_30min_mwh != null
                            ? <><span className="font-semibold text-lime-400">{fmt(b.peak_30min_mwh, 0)}</span><span className="text-[var(--color-text-muted)] ml-0.5">MWh</span></>
                            : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                      )}
                      {has30min && (
                        <td className="px-3 py-2 text-right hidden lg:table-cell">
                          {b.peak_1hr_mwh != null
                            ? <><span className="font-semibold text-teal-400">{fmt(b.peak_1hr_mwh, 0)}</span><span className="text-[var(--color-text-muted)] ml-0.5">MWh</span></>
                            : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right">
                        <span className="font-semibold text-purple-400">{fmt(b.peak_charge_mwh)}</span>
                        <span className="text-[var(--color-text-muted)] ml-0.5">MWh</span>
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--color-text-muted)] hidden md:table-cell">
                        {fmtDate(b.peak_charge_date)}
                      </td>
                      {has5min && (
                        <td className="px-3 py-2 text-right hidden md:table-cell">
                          {b.peak_charge_mw != null
                            ? <><span className="font-semibold text-fuchsia-400">{fmt(b.peak_charge_mw, 1)}</span><span className="text-[var(--color-text-muted)] ml-0.5">MW</span></>
                            : <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right text-[var(--color-text-muted)] hidden xl:table-cell">
                        {fmt(b.total_discharge_mwh)} MWh
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--color-text-muted)] hidden xl:table-cell">
                        {b.days_active}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology note */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-xs text-[var(--color-text-muted)] leading-relaxed">
        <span className="font-medium text-[var(--color-text)]">Methodology: </span>
        Records sourced from AEMO NEMWEB MMSDM DISPATCHLOAD per DUID.{' '}
        <span className="font-medium text-[var(--color-text)]">Daily MWh</span> = sum of 5-min dispatch intervals per calendar day.{' '}
        <span className="font-medium text-[var(--color-text)]">5-min MW</span> = peak single-interval INITIALMW.{' '}
        <span className="font-medium text-[var(--color-text)]">30-min / 1-hr MWh</span> = maximum energy in any consecutive 6 / 12 interval window.{' '}
        <span className="font-medium text-[var(--color-text)]">Quarterly MWh</span> = calendar-quarter discharge total.{' '}
        Revenue estimates use AEMO DISPATCHPRICE P90 regional reference price × discharge MWh — approximate only.
        Fleet-level 5-min peaks sourced from OpenElectricity API.
      </div>
    </div>
  )
}
