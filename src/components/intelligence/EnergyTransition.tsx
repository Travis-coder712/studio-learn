import { useState, useEffect, useMemo } from 'react'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line, ComposedChart,
} from 'recharts'
import { fetchEnergyTransition } from '../../lib/dataService'

// Shapes matching pipeline/exporters/export_json.py export_energy_transition()
interface FuelYearRec {
  ytd_gwh: number
  full_gwh: number
  ytd_days: number
  full_days: number
  ytd_charge_gwh?: number
  full_charge_gwh?: number
  roundtrip_pct?: number
}

interface DemandYearRec {
  ytd_gwh: number
  full_gwh: number
  ytd_peak_mw: number
  full_peak_mw: number
  ytd_days: number
  full_days: number
}

interface ScopeYearRow {
  year: number
  coal?: FuelYearRec
  wind?: FuelYearRec
  solar?: FuelYearRec
  bess?: FuelYearRec
  demand?: DemandYearRec
}

interface RecordEntry {
  mw?: number
  gwh?: number
  date?: string
  settlement_date?: string
  note?: string
}

interface Storyline {
  fuel: string
  first_year: number
  last_year: number
  first_gwh: number
  last_gwh: number
  change_pct: number
}

interface EnergyTransitionData {
  has_data: boolean
  cutoff_date: string | null
  cutoff_date_label: string | null
  cutoff_year: number | null
  cutoff_doy: number | null
  years_present: number[]
  scope_order: string[]
  fuel_techs: string[]
  by_scope: Record<string, {
    label: string
    coal_capacity_mw: number
    years: ScopeYearRow[]
  }>
  storylines: Record<string, Storyline[]>
  records: {
    coal_lowest_5min?: Record<string, RecordEntry>
    coal_lowest_daily?: Record<string, RecordEntry>
    solar_highest_daily?: Record<string, RecordEntry>
    wind_highest_daily?: Record<string, RecordEntry>
    renewables_highest_daily?: Record<string, RecordEntry>
    bess_highest_daily?: Record<string, RecordEntry>
    demand_peak_mw?: Record<string, RecordEntry>
  }
  source_note: string
}

type Window = 'ytd' | 'full'

const FUEL_COLOUR: Record<string, string> = {
  coal: '#ef4444',
  wind: '#3b82f6',
  solar: '#f59e0b',
  bess: '#10b981',
}

const FUEL_LABEL: Record<string, string> = {
  coal: 'Coal',
  wind: 'Wind',
  solar: 'Solar',
  bess: 'BESS discharge',
}

function formatGWh(gwh: number): string {
  if (!Number.isFinite(gwh)) return '—'
  if (Math.abs(gwh) >= 1000) return `${(gwh / 1000).toFixed(1)} TWh`
  return `${Math.round(gwh).toLocaleString()} GWh`
}

export default function EnergyTransition() {
  const [data, setData] = useState<EnergyTransitionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<string>('NEM')
  const [windowMode, setWindowMode] = useState<Window>('ytd')

  useEffect(() => {
    fetchEnergyTransition().then(d => { setData(d as EnergyTransitionData | null); setLoading(false) })
  }, [])

  const scopeData = data?.by_scope[scope]

  const chartData = useMemo(() => {
    if (!scopeData) return []
    const genKey = windowMode === 'ytd' ? 'ytd_gwh' : 'full_gwh'
    return scopeData.years.map(y => {
      const row: Record<string, number | string> = { year: String(y.year) }
      for (const f of ['coal', 'wind', 'solar', 'bess'] as const) {
        const rec = y[f]
        if (rec) row[f] = rec[genKey] ?? 0
      }
      if (y.demand) {
        row.demand = y.demand[genKey] ?? 0
      }
      return row
    })
  }, [scopeData, windowMode])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#10b981' }} />
      </div>
    )
  }

  if (!data || !data.has_data) {
    return (
      <div className="rounded-lg p-6" style={{ background: '#2c2416', border: '1px solid #f59e0b40' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: '#fbbf24' }}>Scoreboard data not yet populated</h3>
        <p className="text-xs" style={{ color: '#cbd5e1' }}>
          {data?.source_note ?? 'Run the coal backfill + generation_daily importer to populate.'}
        </p>
      </div>
    )
  }

  const storylines = data.storylines[scope] ?? []
  const cutoffLabel = data.cutoff_date_label

  return (
    <div className="space-y-6">
      {/* Explainer banner */}
      <div className="rounded-lg p-5" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #1e293b 100%)', border: '1px solid #334155' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#f1f5f9' }}>
          Australia's Energy Transition — Scoreboard
        </h3>
        <p className="text-sm" style={{ color: '#cbd5e1' }}>
          Year-over-year generation by fuel tech at the same calendar window. Coal should decline as
          solar, wind, and BESS discharge climb. YTD window: <strong style={{ color: '#f1f5f9' }}>Jan 1 → {cutoffLabel}</strong>{' '}
          (day {data.cutoff_doy}). Prior years restricted to the same window for apples-to-apples comparison.
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>Scope</span>
            <div className="flex flex-wrap gap-2">
              {data.scope_order.map(s => {
                const label = data.by_scope[s]?.label ?? s
                const has = (data.by_scope[s]?.years?.length ?? 0) > 0
                return (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    disabled={!has}
                    className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-40"
                    style={{
                      background: scope === s ? '#10b98120' : '#0f172a',
                      color: scope === s ? '#10b981' : '#94a3b8',
                      border: `1px solid ${scope === s ? '#10b98140' : '#334155'}`,
                    }}
                  >{label}</button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>Window</span>
            <div className="flex gap-2">
              {(['ytd', 'full'] as Window[]).map(m => (
                <button
                  key={m}
                  onClick={() => setWindowMode(m)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: windowMode === m ? '#3b82f620' : '#0f172a',
                    color: windowMode === m ? '#60a5fa' : '#94a3b8',
                    border: `1px solid ${windowMode === m ? '#3b82f640' : '#334155'}`,
                  }}
                >
                  {m === 'ytd' ? `YTD (to ${cutoffLabel})` : 'Full calendar year'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Storyline chips */}
      {storylines.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {storylines.map(chip => {
            const colour = FUEL_COLOUR[chip.fuel] ?? '#94a3b8'
            const trending = chip.change_pct >= 0
            return (
              <div key={chip.fuel} className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>
                  {FUEL_LABEL[chip.fuel] ?? chip.fuel}
                </p>
                <p className="text-2xl font-bold" style={{ color: colour }}>
                  {trending ? '+' : ''}{chip.change_pct.toFixed(1)}%
                </p>
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                  {formatGWh(chip.first_gwh)} ({chip.first_year}) → {formatGWh(chip.last_gwh)} ({chip.last_year})
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Stacked YoY bar chart */}
      <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>
          {scopeData?.label ?? scope} generation by fuel tech — {windowMode === 'ytd' ? `YTD through ${cutoffLabel}` : 'full calendar year'}
        </h3>
        <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>
          Prior years restricted to the same day-of-year window. Gaps indicate years where that fuel tech had insufficient data in the archive.
        </p>
        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#334155" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" tickFormatter={(v) => formatGWh(v as number)} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                formatter={(value, name) => {
                  const label = name === 'demand' ? 'Demand' : (FUEL_LABEL[String(name)] ?? String(name))
                  return [formatGWh(value as number), label]
                }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                formatter={(v) => v === 'demand' ? 'Demand' : (FUEL_LABEL[String(v)] ?? String(v))} />
              <Bar dataKey="coal" stackId="fuel" fill={FUEL_COLOUR.coal} />
              <Bar dataKey="wind" stackId="fuel" fill={FUEL_COLOUR.wind} />
              <Bar dataKey="solar" stackId="fuel" fill={FUEL_COLOUR.solar} />
              <Bar dataKey="bess" stackId="fuel" fill={FUEL_COLOUR.bess} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="demand" stroke="#cbd5e1" strokeWidth={2}
                strokeDasharray="4 4" dot={{ r: 4, fill: '#cbd5e1' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>
          Dashed line = total regional demand (scheduled + semi-scheduled load served). If demand is flat while supply flips from coal to renewables+BESS, the transition is doing the work — not load reduction.
        </p>
      </div>

      {/* Records board */}
      <RecordsBoard records={data.records} scope={scope} scopeLabel={scopeData?.label ?? scope} />

      {/* Year-by-year table */}
      <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#f1f5f9' }}>
          Year-by-year — {scopeData?.label ?? scope}, {windowMode === 'ytd' ? `YTD (Jan 1 → ${cutoffLabel})` : 'full calendar year'}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Year', 'Coal', 'Wind', 'Solar', 'BESS', 'Demand', 'Peak MW', 'Days'].map(h => (
                  <th key={h} style={{
                    color: '#94a3b8', fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: '0.05em', padding: '8px 12px',
                    borderBottom: '1px solid #334155',
                    textAlign: h === 'Year' ? 'left' : 'right',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(scopeData?.years ?? [])].sort((a, b) => b.year - a.year).map(y => {
                const dayKey = windowMode === 'ytd' ? 'ytd_days' : 'full_days'
                const genKey = windowMode === 'ytd' ? 'ytd_gwh' : 'full_gwh'
                const isCurrent = y.year === data.cutoff_year
                const days = Math.max(
                  y.coal?.[dayKey] ?? 0,
                  y.wind?.[dayKey] ?? 0,
                  y.solar?.[dayKey] ?? 0,
                  y.bess?.[dayKey] ?? 0,
                )
                return (
                  <tr key={y.year} style={{ background: isCurrent ? '#10b98115' : '#1e293b' }}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', color: '#f1f5f9', fontSize: 13, fontWeight: isCurrent ? 600 : 400 }}>
                      {y.year}
                      {isCurrent && <span style={{ color: '#10b981', fontSize: 10, marginLeft: 4 }}>(current)</span>}
                    </td>
                    {(['coal', 'wind', 'solar', 'bess'] as const).map(f => (
                      <td key={f} style={{
                        padding: '8px 12px', borderBottom: '1px solid #0f172a',
                        color: FUEL_COLOUR[f], fontSize: 13, textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {y[f] ? formatGWh((y[f] as FuelYearRec)[genKey]) : '—'}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', color: '#cbd5e1', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {y.demand ? formatGWh(y.demand[genKey]) : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', color: '#94a3b8', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {y.demand ? `${Math.round(y.demand[windowMode === 'ytd' ? 'ytd_peak_mw' : 'full_peak_mw']).toLocaleString()} MW` : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', color: '#94a3b8', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {days || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source note */}
      <div className="rounded-lg p-3" style={{ background: '#0f172a', border: '1px solid #334155' }}>
        <p className="text-xs" style={{ color: '#94a3b8' }}>{data.source_note}</p>
      </div>
    </div>
  )
}

// =====================================================================
// Records board — coal lows + renewable highs for the selected scope
// =====================================================================

function RecordsBoard({
  records, scope, scopeLabel,
}: {
  records: EnergyTransitionData['records']
  scope: string
  scopeLabel: string
}) {
  const pick = (map: Record<string, RecordEntry> | undefined): RecordEntry | undefined =>
    map?.[scope]

  const formatDate = (s?: string): string => {
    if (!s) return '—'
    const d = s.length > 10 ? s.slice(0, 10).replace(/\//g, '-') : s
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const cards: Array<{
    key: string
    title: string
    value: string
    sub: string
    colour: string
    direction: '↓' | '↑'
  }> = []

  const coalLow5 = pick(records.coal_lowest_5min)
  if (coalLow5?.mw != null) {
    cards.push({
      key: 'coal-5min',
      title: 'Coal — lowest 5-min dispatch',
      value: `${Math.round(coalLow5.mw).toLocaleString()} MW`,
      sub: formatDate(coalLow5.settlement_date ?? coalLow5.date),
      colour: FUEL_COLOUR.coal,
      direction: '↓',
    })
  }
  const coalLowDaily = pick(records.coal_lowest_daily)
  if (coalLowDaily?.gwh != null) {
    cards.push({
      key: 'coal-daily',
      title: 'Coal — lowest daily dispatch',
      value: `${coalLowDaily.gwh.toFixed(2)} GWh`,
      sub: formatDate(coalLowDaily.date),
      colour: FUEL_COLOUR.coal,
      direction: '↓',
    })
  }
  const windHigh = pick(records.wind_highest_daily)
  if (windHigh?.gwh != null) {
    cards.push({
      key: 'wind-daily',
      title: 'Wind — highest daily output',
      value: formatGWh(windHigh.gwh),
      sub: formatDate(windHigh.date),
      colour: FUEL_COLOUR.wind,
      direction: '↑',
    })
  }
  const solarHigh = pick(records.solar_highest_daily)
  if (solarHigh?.gwh != null) {
    cards.push({
      key: 'solar-daily',
      title: 'Solar — highest daily output',
      value: formatGWh(solarHigh.gwh),
      sub: formatDate(solarHigh.date),
      colour: FUEL_COLOUR.solar,
      direction: '↑',
    })
  }
  const renewHigh = pick(records.renewables_highest_daily)
  if (renewHigh?.gwh != null) {
    cards.push({
      key: 'renew-daily',
      title: 'Solar+wind+BESS — highest day',
      value: formatGWh(renewHigh.gwh),
      sub: formatDate(renewHigh.date),
      colour: '#22d3ee',
      direction: '↑',
    })
  }
  const bessHigh = pick(records.bess_highest_daily)
  if (bessHigh?.gwh != null) {
    cards.push({
      key: 'bess-daily',
      title: 'BESS — highest daily discharge',
      value: formatGWh(bessHigh.gwh),
      sub: formatDate(bessHigh.date),
      colour: FUEL_COLOUR.bess,
      direction: '↑',
    })
  }
  const demandPeak = pick(records.demand_peak_mw)
  if (demandPeak?.mw != null) {
    cards.push({
      key: 'demand-peak',
      title: 'Demand — peak 5-min MW',
      value: `${Math.round(demandPeak.mw).toLocaleString()} MW`,
      sub: `${formatDate(demandPeak.date)}${demandPeak.note ? ' · ' + demandPeak.note : ''}`,
      colour: '#cbd5e1',
      direction: '↑',
    })
  }

  if (!cards.length) {
    return (
      <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: '#f1f5f9' }}>Records board — {scopeLabel}</h3>
        <p className="text-xs" style={{ color: '#94a3b8' }}>No records available at this scope yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
          Records board — {scopeLabel}
        </h3>
        <span className="text-xs" style={{ color: '#94a3b8' }}>
          All-time since Jan 2021
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.key} className="rounded p-3" style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>{c.title}</p>
            <div className="flex items-baseline gap-1">
              <p className="text-lg font-bold" style={{ color: c.colour }}>{c.value}</p>
              <span className="text-xs" style={{ color: c.colour, opacity: 0.7 }}>{c.direction}</span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
