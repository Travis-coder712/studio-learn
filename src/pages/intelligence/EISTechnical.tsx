import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, Cell, ReferenceLine,
  PieChart, Pie,
} from 'recharts'
import { fetchEISAnalytics, fetchEISComparison, fetchEISCoverage, fetchEISPdfOpportunities } from '../../lib/dataService'
import type { EISPdfOpportunitiesData, EISPdfOpportunity } from '../../lib/dataService'
import type { EISAnalyticsData, EISWindProject, EISBESSProject, EISSolarProject, EISComparisonData, EISComparisonProject, EISCoverageData } from '../../lib/types'
import ScrollableTable from '../../components/common/ScrollableTable'
import { FINANCIAL_CLOSE_PROJECTS } from '../../data/financial-close-data'
import DataProvenance from '../../components/common/DataProvenance'

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const WindIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.788 0l7-3a1 1 0 000-1.838l-7-3.001z" />
    <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
  </svg>
)

const BatteryIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 4a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-1h1a1 1 0 001-1V8a1 1 0 00-1-1h-1V6a2 2 0 00-2-2H2zm14 2v8H2V6h14z" />
  </svg>
)

const ConnectionIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
)

const SolarIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
  </svg>
)

const CompareIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
)

const CoverageIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
  </svg>
)

const SortUpIcon = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 10 10" fill="currentColor">
    <path d="M5 2L9 8H1L5 2z" />
  </svg>
)

const SortDownIcon = () => (
  <svg className="w-3 h-3 inline" viewBox="0 0 10 10" fill="currentColor">
    <path d="M5 8L1 2H9L5 8z" />
  </svg>
)

// ============================================================
// Colour maps
// ============================================================

const STATE_COLOURS: Record<string, string> = {
  NSW: '#3b82f6', VIC: '#8b5cf6', QLD: '#f59e0b',
  SA: '#10b981', TAS: '#06b6d4', WA: '#ec4899',
}

const STATUS_COLOURS: Record<string, string> = {
  operating: '#10b981', commissioning: '#22d3ee', construction: '#f59e0b',
  development: '#8b5cf6', withdrawn: '#6b7280',
}

const CHEM_COLOURS: Record<string, string> = {
  LFP: '#10b981', NMC: '#f59e0b', 'Flow battery': '#3b82f6',
}

const PCS_COLOURS: Record<string, string> = {
  grid_forming: '#3b82f6', grid_following: '#f59e0b', both: '#8b5cf6',
}

const getStateColour = (s: string) => STATE_COLOURS[s] || '#636e72'
const getStatusColour = (s: string) => STATUS_COLOURS[s] || '#636e72'

// ============================================================
// Tabs
// ============================================================

type TabId = 'wind' | 'bess' | 'solar' | 'comparison' | 'coverage' | 'connection' | 'financial_close'

const FCIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'wind', label: 'Wind', icon: <WindIcon /> },
  { id: 'bess', label: 'BESS', icon: <BatteryIcon /> },
  { id: 'solar', label: 'Solar', icon: <SolarIcon /> },
  { id: 'comparison', label: 'EIS vs Actual', icon: <CompareIcon /> },
  { id: 'coverage', label: 'Coverage', icon: <CoverageIcon /> },
  { id: 'connection', label: 'Grid Connection', icon: <ConnectionIcon /> },
  { id: 'financial_close', label: 'Financial Close', icon: <FCIcon /> },
]

// ============================================================
// Formatters
// ============================================================

const fmt = (v: number | null | undefined, dec = 1) =>
  v != null ? v.toFixed(dec) : '—'
const fmtInt = (v: number | null | undefined) =>
  v != null ? Math.round(v).toLocaleString() : '—'

// Custom tooltip
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium text-[var(--color-text)] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p.value}
        </p>
      ))}
    </div>
  )
}

// Custom scatter tooltip
const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: { payload?: Record<string, unknown> }[] }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as Record<string, unknown> | undefined
  if (!d) return null
  return (
    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs max-w-[200px]">
      <p className="font-medium text-[var(--color-text)] mb-1 truncate">{d.name as string}</p>
      <p className="text-[var(--color-text-muted)]">{d.state as string} · {fmtInt(d.capacity_mw as number)} MW</p>
      {d.wind_speed_mean_ms != null && (
        <p className="text-[var(--color-text-muted)]">Wind: {fmt(d.wind_speed_mean_ms as number)} m/s</p>
      )}
      {d.assumed_capacity_factor_pct != null && (
        <p className="text-[var(--color-text-muted)]">CF: {fmt(d.assumed_capacity_factor_pct as number)}%</p>
      )}
      {d.hub_height_m != null && (
        <p className="text-[var(--color-text-muted)]">Hub: {fmt(d.hub_height_m as number, 0)}m</p>
      )}
    </div>
  )
}

// ============================================================
// Stats card
// ============================================================

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-lg font-bold text-[var(--color-text)]">
        {value}
        {unit && <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">{unit}</span>}
      </p>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function EISTechnical() {
  const [data, setData] = useState<EISAnalyticsData | null>(null)
  const [comparison, setComparison] = useState<EISComparisonData | null>(null)
  const [coverage, setCoverage] = useState<EISCoverageData | null>(null)
  const [pdfOpps, setPdfOpps] = useState<EISPdfOpportunitiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('wind')
  const [stateFilter, setStateFilter] = useState<string | null>(null)
  const [windSort, setWindSort] = useState<{ col: keyof EISWindProject; dir: 'asc' | 'desc' }>({ col: 'capacity_mw', dir: 'desc' })
  const [bessSort, setBessSort] = useState<{ col: keyof EISBESSProject; dir: 'asc' | 'desc' }>({ col: 'capacity_mw', dir: 'desc' })
  const [solarSort, setSolarSort] = useState<{ col: keyof EISSolarProject; dir: 'asc' | 'desc' }>({ col: 'capacity_mw', dir: 'desc' })
  const [compSort, setCompSort] = useState<{ col: keyof EISComparisonProject; dir: 'asc' | 'desc' }>({ col: 'cf_delta_pct', dir: 'asc' })

  useEffect(() => {
    Promise.all([fetchEISAnalytics(), fetchEISComparison(), fetchEISCoverage(), fetchEISPdfOpportunities()])
      .then(([d, comp, cov, pdf]) => { setData(d); setComparison(comp); setCoverage(cov); setPdfOpps(pdf); setLoading(false) })
  }, [])

  // Available states from data
  const availableStates = useMemo(() => {
    if (!data) return []
    const states = new Set<string>()
    data.wind_projects.forEach((p) => states.add(p.state))
    data.bess_projects.forEach((p) => states.add(p.state))
    ;(data.solar_projects ?? []).forEach((p) => states.add(p.state))
    return Array.from(states).sort()
  }, [data])

  // State-filtered project lists
  const filteredWindProjects = useMemo(() => {
    if (!data) return []
    return stateFilter ? data.wind_projects.filter((p) => p.state === stateFilter) : data.wind_projects
  }, [data, stateFilter])

  const filteredBessProjects = useMemo(() => {
    if (!data) return []
    return stateFilter ? data.bess_projects.filter((p) => p.state === stateFilter) : data.bess_projects
  }, [data, stateFilter])

  // ---- Wind derived data ----
  const windScatterData = useMemo(() => {
    return filteredWindProjects
      .filter((p) => p.wind_speed_mean_ms != null && p.assumed_capacity_factor_pct != null)
      .map((p) => ({ ...p }))
  }, [filteredWindProjects])

  const hubHeightData = useMemo(() => {
    const buckets: Record<string, number> = {}
    filteredWindProjects.forEach((p) => {
      if (p.hub_height_m != null) {
        const b = `${Math.floor(p.hub_height_m / 10) * 10}–${Math.floor(p.hub_height_m / 10) * 10 + 9}m`
        buckets[b] = (buckets[b] || 0) + 1
      }
    })
    return Object.entries(buckets)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([range, count]) => ({ range, count }))
  }, [filteredWindProjects])

  const rotorDiameterData = useMemo(() => {
    const buckets: Record<string, number> = {}
    filteredWindProjects.forEach((p) => {
      if (p.rotor_diameter_m != null) {
        const b = `${Math.floor(p.rotor_diameter_m / 10) * 10}–${Math.floor(p.rotor_diameter_m / 10) * 10 + 9}m`
        buckets[b] = (buckets[b] || 0) + 1
      }
    })
    return Object.entries(buckets)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([range, count]) => ({ range, count }))
  }, [filteredWindProjects])

  const turbineOEMData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredWindProjects.forEach((p) => {
      if (p.turbine_model) {
        const brand = p.turbine_model.split(' ')[0] || 'Unknown'
        counts[brand] = (counts[brand] || 0) + 1
      }
    })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }))
  }, [filteredWindProjects])

  const sortedWindProjects = useMemo(() => {
    return [...filteredWindProjects].sort((a, b) => {
      const av = a[windSort.col] ?? 0
      const bv = b[windSort.col] ?? 0
      if (typeof av === 'string' && typeof bv === 'string')
        return windSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return windSort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [filteredWindProjects, windSort])

  // ---- BESS derived data ----
  const chemistryData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredBessProjects.forEach((p) => {
      if (p.cell_chemistry) counts[p.cell_chemistry] = (counts[p.cell_chemistry] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredBessProjects])

  const pcsTypeData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredBessProjects.forEach((p) => {
      if (p.pcs_type) counts[p.pcs_type] = (counts[p.pcs_type] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({
        name: name === 'grid_forming' ? 'Grid Forming' : name === 'grid_following' ? 'Grid Following' : 'Both',
        value,
        key: name,
      }))
  }, [filteredBessProjects])

  const cellSupplierData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredBessProjects.forEach((p) => {
      if (p.cell_supplier) counts[p.cell_supplier] = (counts[p.cell_supplier] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, count, fullName: name }))
  }, [filteredBessProjects])

  const inverterSupplierData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredBessProjects.forEach((p) => {
      if (p.inverter_supplier) counts[p.inverter_supplier] = (counts[p.inverter_supplier] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, count, fullName: name }))
  }, [filteredBessProjects])

  const durationData = useMemo(() => {
    const buckets: Record<string, number> = {}
    filteredBessProjects.forEach((p) => {
      if (p.duration_hours != null) {
        const h = p.duration_hours
        const label = h <= 1 ? '≤1h' : h <= 2 ? '1–2h' : h <= 4 ? '2–4h' : h <= 8 ? '4–8h' : '>8h'
        buckets[label] = (buckets[label] || 0) + 1
      }
    })
    const order = ['≤1h', '1–2h', '2–4h', '4–8h', '>8h']
    return order.filter((l) => buckets[l]).map((label) => ({ label, count: buckets[label] }))
  }, [filteredBessProjects])

  const efficiencyData = useMemo(() => {
    return filteredBessProjects
      .filter((p) => p.round_trip_efficiency_pct != null || p.round_trip_efficiency_ac != null)
      .map((p) => ({
        name: p.name.length > 25 ? p.name.slice(0, 23) + '…' : p.name,
        dc: p.round_trip_efficiency_pct,
        ac: p.round_trip_efficiency_ac,
        id: p.id,
      }))
      .sort((a, b) => (b.dc ?? b.ac ?? 0) - (a.dc ?? a.ac ?? 0))
  }, [filteredBessProjects])

  const sortedBessProjects = useMemo(() => {
    return [...filteredBessProjects].sort((a, b) => {
      const av = a[bessSort.col] ?? 0
      const bv = b[bessSort.col] ?? 0
      if (typeof av === 'string' && typeof bv === 'string')
        return bessSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return bessSort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [filteredBessProjects, bessSort])

  // ---- Solar filtered ----
  const filteredSolarProjects = useMemo(() => {
    if (!data?.solar_projects) return []
    return stateFilter ? data.solar_projects.filter((p) => p.state === stateFilter) : data.solar_projects
  }, [data, stateFilter])

  // ---- Solar derived data ----
  const trackingTypeData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredSolarProjects.forEach((p) => {
      if (p.tracking_type) {
        const label = p.tracking_type === 'single_axis' ? 'Single-Axis' : p.tracking_type === 'fixed_tilt' ? 'Fixed Tilt' : p.tracking_type === 'dual_axis' ? 'Dual-Axis' : p.tracking_type
        counts[label] = (counts[label] || 0) + 1
      }
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredSolarProjects])

  const panelTypeData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredSolarProjects.forEach((p) => {
      if (p.panel_type) counts[p.panel_type] = (counts[p.panel_type] || 0) + 1
    })
    return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }))
  }, [filteredSolarProjects])

  const solarInverterTypeData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredSolarProjects.forEach((p) => {
      if (p.inverter_type) {
        const label = p.inverter_type === 'central' ? 'Central' : p.inverter_type === 'string' ? 'String' : p.inverter_type
        counts[label] = (counts[label] || 0) + 1
      }
    })
    return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }))
  }, [filteredSolarProjects])

  const solarInverterSupplierData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredSolarProjects.forEach((p) => {
      if (p.inverter_supplier) counts[p.inverter_supplier] = (counts[p.inverter_supplier] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, count, fullName: name }))
  }, [filteredSolarProjects])

  const trackingSupplierData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredSolarProjects.forEach((p) => {
      if (p.tracking_supplier) counts[p.tracking_supplier] = (counts[p.tracking_supplier] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, count, fullName: name }))
  }, [filteredSolarProjects])

  const solarCfData = useMemo(() => {
    return filteredSolarProjects
      .filter((p) => p.assumed_capacity_factor_pct != null)
      .map((p) => ({
        name: p.name.length > 25 ? p.name.slice(0, 23) + '…' : p.name,
        cf: p.assumed_capacity_factor_pct,
        id: p.id,
        state: p.state,
      }))
      .sort((a, b) => (b.cf ?? 0) - (a.cf ?? 0))
  }, [filteredSolarProjects])

  const sortedSolarProjects = useMemo(() => {
    return [...filteredSolarProjects].sort((a, b) => {
      const av = a[solarSort.col] ?? 0
      const bv = b[solarSort.col] ?? 0
      if (typeof av === 'string' && typeof bv === 'string')
        return solarSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return solarSort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [filteredSolarProjects, solarSort])

  // ---- Comparison derived data ----
  const comparisonBarData = useMemo(() => {
    if (!comparison) return []
    return [...comparison.projects]
      .sort((a, b) => a.cf_delta_pct - b.cf_delta_pct)
      .map((p) => ({
        name: p.name.length > 25 ? p.name.slice(0, 23) + '…' : p.name,
        fullName: p.name,
        id: p.id,
        eis_cf_pct: p.eis_cf_pct,
        avg_actual_cf_pct: p.avg_actual_cf_pct,
        cf_delta_pct: p.cf_delta_pct,
        state: p.state,
      }))
  }, [comparison])

  const comparisonScatterData = useMemo(() => {
    if (!comparison) return []
    return comparison.projects.map((p) => ({
      name: p.name,
      id: p.id,
      eis_cf: p.eis_cf_pct,
      actual_cf: p.avg_actual_cf_pct,
      state: p.state,
      capacity_mw: p.capacity_mw,
      years: p.annual_actuals.length,
    }))
  }, [comparison])

  const sortedComparisonProjects = useMemo(() => {
    if (!comparison) return []
    return [...comparison.projects].sort((a, b) => {
      const av = a[compSort.col] ?? 0
      const bv = b[compSort.col] ?? 0
      if (typeof av === 'string' && typeof bv === 'string')
        return compSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return compSort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [comparison, compSort])

  // ---- Connection derived data ----
  const allConnectionProjects = useMemo(() => {
    const solar = filteredSolarProjects as Array<{ connection_voltage_kv?: number; connection_distance_km?: number; connection_substation_name?: string; nsp?: string; connection_augmentation?: string; name: string; state: string; capacity_mw: number; id: string }>
    const ph = (data?.pumped_hydro_projects ?? []).filter((p) => !stateFilter || p.state === stateFilter) as typeof solar
    return [...filteredWindProjects, ...filteredBessProjects, ...solar, ...ph]
  }, [filteredWindProjects, filteredBessProjects, filteredSolarProjects, data, stateFilter])

  const [selectedVoltage, setSelectedVoltage] = useState<string | null>(null)

  const voltageData = useMemo(() => {
    const breakdown: Record<string, number> = {}
    allConnectionProjects.forEach((p) => {
      if (p.connection_voltage_kv) {
        const k = String(p.connection_voltage_kv)
        breakdown[k] = (breakdown[k] || 0) + 1
      }
    })
    return Object.entries(breakdown)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([voltage, count]) => ({ voltage, count }))
  }, [allConnectionProjects])

  const voltageProjects = useMemo(() => {
    if (!selectedVoltage) return []
    return allConnectionProjects
      .filter((p) => p.connection_voltage_kv != null && String(p.connection_voltage_kv) === selectedVoltage)
      .sort((a, b) => b.capacity_mw - a.capacity_mw)
      .map((p) => ({
        id: p.id,
        name: p.name,
        state: p.state,
        capacity_mw: p.capacity_mw,
        type: 'wind_speed_mean_ms' in p ? 'wind' : 'cell_chemistry' in p ? 'bess' : 'head_height_m' in p ? 'pumped hydro' : 'solar',
        substation: (p as Record<string, unknown>).connection_substation_name as string | undefined,
        distance_km: (p as Record<string, unknown>).connection_distance_km as number | undefined,
      }))
  }, [allConnectionProjects, selectedVoltage])

  const connectionDistanceData = useMemo(() => {
    return allConnectionProjects
      .filter((p) => p.connection_distance_km != null)
      .map((p) => ({
        name: p.name,
        distance: p.connection_distance_km!,
        capacity_mw: p.capacity_mw,
        state: p.state,
        type: 'wind_speed_mean_ms' in p ? 'Wind' : 'cell_chemistry' in p ? 'BESS' : 'head_height_m' in p ? 'Pumped Hydro' : 'Solar',
        id: p.id,
      }))
      .sort((a, b) => b.distance - a.distance)
  }, [allConnectionProjects])

  // ---- Wind sort toggle ----
  function toggleWindSort(col: keyof EISWindProject) {
    setWindSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    )
  }

  function toggleBessSort(col: keyof EISBESSProject) {
    setBessSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    )
  }

  function WindSortIcon({ col }: { col: keyof EISWindProject }) {
    if (windSort.col !== col) return null
    return windSort.dir === 'asc' ? <SortUpIcon /> : <SortDownIcon />
  }

  function BessSortIcon({ col }: { col: keyof EISBESSProject }) {
    if (bessSort.col !== col) return null
    return bessSort.dir === 'asc' ? <SortUpIcon /> : <SortDownIcon />
  }

  function toggleCompSort(col: keyof EISComparisonProject) {
    setCompSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    )
  }

  function CompSortIcon({ col }: { col: keyof EISComparisonProject }) {
    if (compSort.col !== col) return null
    return compSort.dir === 'asc' ? <SortUpIcon /> : <SortDownIcon />
  }

  // ---- Render ----
  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--color-bg-elevated)] rounded w-48" />
          <div className="h-4 bg-[var(--color-bg-elevated)] rounded w-96" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-[var(--color-bg-elevated)] rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-[var(--color-text)]">EIS Technical Specs</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">No EIS data available.</p>
      </div>
    )
  }

  const { summary } = data

  return (
    <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link to="/intelligence" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm">
            ← Intelligence
          </Link>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)]">
          EIS / EIA Technical Specs
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Technical parameters extracted from {summary.total_eis} Environmental Impact Statements.
          {summary.wind} wind · {summary.bess} BESS{summary.solar ? ` · ${summary.solar} solar` : ''} · {summary.pumped_hydro} pumped hydro projects.
        </p>
        <div className="mt-3">
          <DataProvenance page="eis-technical" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total EIS Projects" value={summary.total_eis.toString()} />
        <StatCard label="Avg Wind Speed" value={fmt(summary.wind_stats.avg_wind_speed)} unit="m/s" />
        <StatCard label="Avg Hub Height" value={fmt(summary.wind_stats.avg_hub_height, 0)} unit="m" />
        <StatCard label="Avg Capacity Factor" value={fmt(summary.wind_stats.avg_capacity_factor)} unit="%" />
        <StatCard label="Avg BESS Duration" value={fmt(summary.bess_stats.avg_duration)} unit="hrs" />
      </div>

      {/* Tab bar + State filter */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-[var(--color-border)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {t.icon}
              {t.label}
              <span className="text-xs opacity-60">
                ({t.id === 'wind' ? filteredWindProjects.length
                  : t.id === 'bess' ? filteredBessProjects.length
                  : t.id === 'solar' ? filteredSolarProjects.length
                  : t.id === 'comparison' ? (comparison?.projects.length ?? 0)
                  : t.id === 'coverage' ? (data ? data.wind_projects.length + data.bess_projects.length + (data.solar_projects?.length ?? 0) + (data.pumped_hydro_projects?.length ?? 0) : 0)
                  : filteredWindProjects.length + filteredBessProjects.length + filteredSolarProjects.length})
              </span>
            </button>
          ))}
        </div>

        {/* State filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mr-1">
            State
          </span>
          <button
            onClick={() => setStateFilter(null)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              !stateFilter
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
            }`}
          >
            All
          </button>
          {availableStates.map((s) => {
            const isActive = stateFilter === s
            const colour = getStateColour(s)
            return (
              <button
                key={s}
                onClick={() => setStateFilter(isActive ? null : s)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  isActive
                    ? 'border-transparent font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
                style={isActive ? { backgroundColor: `${colour}20`, color: colour } : undefined}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* WIND TAB */}
      {/* ============================================================ */}
      {tab === 'wind' && (
        <div className="space-y-6">
          {/* Wind scatter: wind speed vs capacity factor */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
              Wind Speed vs Capacity Factor
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number" dataKey="wind_speed_mean_ms" name="Wind Speed"
                  unit=" m/s" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  label={{ value: 'Mean Wind Speed (m/s)', position: 'bottom', offset: 5, style: { fontSize: 11, fill: 'var(--color-text-muted)' } }}
                />
                <YAxis
                  type="number" dataKey="assumed_capacity_factor_pct" name="Capacity Factor"
                  unit="%" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  label={{ value: 'CF %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--color-text-muted)' } }}
                />
                <Tooltip content={<ScatterTooltip />} />
                <Scatter data={windScatterData} fill="#3b82f6">
                  {windScatterData.map((d, i) => (
                    <Cell key={i} fill={getStateColour(d.state)} r={Math.max(4, Math.min(12, d.capacity_mw / 150))} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {Object.entries(STATE_COLOURS).map(([s, c]) => (
                <span key={s} className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c }} />
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Hub height + Rotor diameter bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Hub Height Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hubHeightData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Projects" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Rotor Diameter Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rotorDiameterData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Projects" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Turbine OEM breakdown */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Turbine OEM (from EIS)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={turbineOEMData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={55} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Projects" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Wind project table */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
              Wind Projects with EIS Data ({filteredWindProjects.length})
            </h3>
            <ScrollableTable>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {([
                      ['name', 'Project'],
                      ['state', 'State'],
                      ['capacity_mw', 'MW'],
                      ['status', 'Status'],
                      ['wind_speed_mean_ms', 'Wind m/s'],
                      ['hub_height_m', 'Hub m'],
                      ['rotor_diameter_m', 'Rotor m'],
                      ['assumed_capacity_factor_pct', 'CF %'],
                      ['turbine_model', 'Turbine'],
                      ['connection_distance_km', 'Conn km'],
                    ] as [keyof EISWindProject, string][]).map(([col, label]) => (
                      <th
                        key={col}
                        onClick={() => toggleWindSort(col)}
                        className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] whitespace-nowrap"
                      >
                        {label} <WindSortIcon col={col} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedWindProjects.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                      <td className="px-2 py-1.5">
                        <Link to={`/projects/${p.id}`} className="text-[var(--color-primary)] hover:underline whitespace-nowrap">
                          {p.name.length > 30 ? p.name.slice(0, 28) + '…' : p.name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getStateColour(p.state) }} />
                        {p.state}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmtInt(p.capacity_mw)}</td>
                      <td className="px-2 py-1.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: getStatusColour(p.status) + '20', color: getStatusColour(p.status) }}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(p.wind_speed_mean_ms)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(p.hub_height_m, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(p.rotor_diameter_m, 0)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(p.assumed_capacity_factor_pct)}</td>
                      <td className="px-2 py-1.5 text-[var(--color-text-muted)] whitespace-nowrap">{p.turbine_model ? (p.turbine_model.length > 20 ? p.turbine_model.slice(0, 18) + '…' : p.turbine_model) : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(p.connection_distance_km)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BESS TAB */}
      {/* ============================================================ */}
      {tab === 'bess' && (
        <div className="space-y-6">
          {/* BESS summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Avg Efficiency (DC)" value={fmt(summary.bess_stats.avg_efficiency_dc)} unit="%" />
            <StatCard label="Avg Efficiency (AC)" value={fmt(summary.bess_stats.avg_efficiency_ac)} unit="%" />
            <StatCard label="Avg Duration" value={fmt(summary.bess_stats.avg_duration)} unit="hrs" />
            <StatCard label="Avg Conn Distance" value={fmt(summary.bess_stats.avg_connection_distance)} unit="km" />
          </div>

          {/* Chemistry + PCS donut charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Cell Chemistry</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chemistryData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={{ stroke: 'var(--color-text-muted)' }}
                  >
                    {chemistryData.map((d, i) => (
                      <Cell key={i} fill={CHEM_COLOURS[d.name] || ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">PCS Type (Grid Forming vs Following)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pcsTypeData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={{ stroke: 'var(--color-text-muted)' }}
                  >
                    {pcsTypeData.map((d, i) => (
                      <Cell key={i} fill={PCS_COLOURS[d.key] || ['#3b82f6', '#f59e0b', '#8b5cf6'][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cell + Inverter supplier bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Cell Suppliers (EIS-sourced)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cellSupplierData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={95} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Projects" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Inverter / PCS Suppliers (EIS-sourced)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={inverterSupplierData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={95} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Projects" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Duration distribution + Efficiency comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Storage Duration Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={durationData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Projects" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Round-Trip Efficiency Comparison</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={efficiencyData.slice(0, 12)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'var(--color-text-muted)' }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[75, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="dc" name="DC Efficiency %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ac" name="AC Efficiency %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BESS project table */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
              BESS Projects with EIS Data ({filteredBessProjects.length})
            </h3>
            <ScrollableTable>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {([
                      ['name', 'Project'],
                      ['state', 'State'],
                      ['capacity_mw', 'MW'],
                      ['storage_mwh', 'MWh'],
                      ['duration_hours', 'Hrs'],
                      ['cell_chemistry', 'Chemistry'],
                      ['cell_supplier', 'Cell OEM'],
                      ['inverter_supplier', 'Inverter'],
                      ['pcs_type', 'PCS'],
                      ['round_trip_efficiency_pct', 'Eff DC%'],
                      ['connection_distance_km', 'Conn km'],
                    ] as [keyof EISBESSProject, string][]).map(([col, label]) => (
                      <th
                        key={col}
                        onClick={() => toggleBessSort(col)}
                        className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] whitespace-nowrap"
                      >
                        {label} <BessSortIcon col={col} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedBessProjects.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                      <td className="px-2 py-1.5">
                        <Link to={`/projects/${p.id}`} className="text-[var(--color-primary)] hover:underline whitespace-nowrap">
                          {p.name.length > 28 ? p.name.slice(0, 26) + '…' : p.name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getStateColour(p.state) }} />
                        {p.state}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmtInt(p.capacity_mw)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{p.storage_mwh ? fmtInt(p.storage_mwh) : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(p.duration_hours)}</td>
                      <td className="px-2 py-1.5">
                        {p.cell_chemistry ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: (CHEM_COLOURS[p.cell_chemistry] || '#6b7280') + '20', color: CHEM_COLOURS[p.cell_chemistry] || '#6b7280' }}>
                            {p.cell_chemistry}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--color-text-muted)] whitespace-nowrap">
                        {p.cell_supplier ? (p.cell_supplier.length > 16 ? p.cell_supplier.slice(0, 14) + '…' : p.cell_supplier) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--color-text-muted)] whitespace-nowrap">
                        {p.inverter_supplier ? (p.inverter_supplier.length > 16 ? p.inverter_supplier.slice(0, 14) + '…' : p.inverter_supplier) : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        {p.pcs_type ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: (PCS_COLOURS[p.pcs_type] || '#6b7280') + '20', color: PCS_COLOURS[p.pcs_type] || '#6b7280' }}>
                            {p.pcs_type === 'grid_forming' ? 'GFM' : p.pcs_type === 'grid_following' ? 'GFL' : 'Both'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(p.round_trip_efficiency_pct)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{fmt(p.connection_distance_km)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONNECTION TAB */}
      {/* ============================================================ */}
      {tab === 'connection' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard label="Avg Connection Distance" value={fmt(summary.connection.avg_distance)} unit="km" />
            <StatCard label="Wind Avg Distance" value={fmt(summary.wind_stats.avg_connection_distance)} unit="km" />
            <StatCard label="BESS Avg Distance" value={fmt(summary.bess_stats.avg_connection_distance)} unit="km" />
          </div>

          {/* Voltage breakdown */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Connection Voltage Distribution</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mb-3">Click a bar to see the projects at that voltage level.</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={voltageData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                onClick={(e) => { if (e?.activeLabel != null) { const label = String(e.activeLabel); setSelectedVoltage(selectedVoltage === label ? null : label) } }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="voltage" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} unit=" kV" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Projects" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  {voltageData.map((d, i) => (
                    <Cell key={i} fill={d.voltage === selectedVoltage ? '#ffffff' : ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#ef4444'][i % 7]} opacity={selectedVoltage && d.voltage !== selectedVoltage ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Voltage drill-down */}
            {selectedVoltage && voltageProjects.length > 0 && (
              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-[var(--color-text)]">
                    {selectedVoltage} kV — {voltageProjects.length} project{voltageProjects.length !== 1 ? 's' : ''}
                  </h4>
                  <button onClick={() => setSelectedVoltage(null)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Clear</button>
                </div>
                <ScrollableTable>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-muted)]">Project</th>
                        <th className="px-2 py-1.5 text-center font-medium text-[var(--color-text-muted)]">Tech</th>
                        <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-muted)]">State</th>
                        <th className="px-2 py-1.5 text-right font-medium text-[var(--color-text-muted)]">MW</th>
                        <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-muted)]">Substation</th>
                        <th className="px-2 py-1.5 text-right font-medium text-[var(--color-text-muted)]">Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voltageProjects.map((p) => {
                        const tc = TECH_COLOUR_MAP[p.type] ?? { bg: '#63727220', fg: '#637272' }
                        return (
                          <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                            <td className="px-2 py-1.5"><Link to={`/projects/${p.id}`} className="text-[var(--color-primary)] hover:underline">{p.name}</Link></td>
                            <td className="px-2 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded text-[9px] uppercase" style={{ backgroundColor: tc.bg, color: tc.fg }}>{p.type}</span></td>
                            <td className="px-2 py-1.5" style={{ color: getStateColour(p.state) }}>{p.state}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{fmtInt(p.capacity_mw)}</td>
                            <td className="px-2 py-1.5 text-[var(--color-text-muted)] truncate max-w-[200px]">{p.substation || '—'}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{p.distance_km != null ? `${p.distance_km} km` : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </ScrollableTable>
              </div>
            )}
          </div>

          {/* Connection distance ranked */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
              Connection Distance by Project (km)
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(300, connectionDistanceData.length * 22)}>
              <BarChart data={connectionDistanceData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} unit=" km" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                  width={115}
                  tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + '…' : v}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload as Record<string, unknown>
                    return (
                      <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
                        <p className="font-medium text-[var(--color-text)]">{d.name as string}</p>
                        <p className="text-[var(--color-text-muted)]">{d.state as string} · {d.type as string} · {fmtInt(d.capacity_mw as number)} MW</p>
                        <p className="text-[var(--color-text-muted)]">{fmt(d.distance as number)} km to connection</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="distance" name="Distance km" radius={[0, 4, 4, 0]}>
                  {connectionDistanceData.map((d, i) => (
                    <Cell key={i} fill={d.type === 'Wind' ? '#3b82f6' : d.type === 'BESS' ? '#10b981' : d.type === 'Solar' ? '#f59e0b' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              {[['Wind', '#3b82f6'], ['BESS', '#10b981'], ['Solar', '#f59e0b'], ['Pumped Hydro', '#8b5cf6']].map(([label, color]) => (
                <span key={label} className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* NSP breakdown table */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Network Service Providers</h3>
            <NSPTable data={data} />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SOLAR TAB */}
      {/* ============================================================ */}
      {tab === 'solar' && (
        <div className="space-y-6">
          {filteredSolarProjects.length === 0 ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
              <SolarIcon />
              <h3 className="text-sm font-semibold text-[var(--color-text)] mt-3 mb-2">No Solar EIS Data Extracted Yet</h3>
              <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto">
                Solar projects will appear here as EIS/EIA technical data is imported.
                Check the Coverage tab for projects where EIS documents are known to exist.
              </p>
            </div>
          ) : (
            <>
              {/* Solar summary stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard label="Solar Projects" value={filteredSolarProjects.length.toString()} />
                <StatCard label="Total Capacity" value={fmtInt(filteredSolarProjects.reduce((s, p) => s + p.capacity_mw, 0))} unit="MW" />
                <StatCard label="Avg Capacity Factor" value={fmt(data.summary.solar_stats?.avg_capacity_factor)} unit="%" />
                <StatCard label="Single-Axis Tracking" value={(trackingTypeData.find((t) => t.name === 'Single-Axis')?.value ?? 0).toString()} unit={`of ${filteredSolarProjects.length}`} />
                <StatCard label="Avg Panel Count" value={fmtInt(data.summary.solar_stats?.avg_panel_count)} />
              </div>

              {/* Charts row 1: Tracking Type pie + Panel Type bar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tracking type distribution */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Tracking Type Distribution</h3>
                  {trackingTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={trackingTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                          {trackingTypeData.map((_, i) => (
                            <Cell key={i} fill={['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'][i % 4]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-8">No tracking data available</p>
                  )}
                </div>

                {/* Panel type distribution */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Panel Technology</h3>
                  {panelTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={panelTypeData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="value" name="Projects" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-8">No panel type data available</p>
                  )}
                </div>
              </div>

              {/* Charts row 2: Inverter supplier + Tracking supplier */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Inverter type + supplier */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Inverter Configuration</h3>
                  {solarInverterTypeData.length > 0 && (
                    <div className="flex items-center gap-3 mb-2">
                      {solarInverterTypeData.map((t) => (
                        <span key={t.name} className="text-[10px] text-[var(--color-text-muted)]">
                          {t.name}: <span className="font-bold text-[var(--color-text)]">{t.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {solarInverterSupplierData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={solarInverterSupplierData} layout="vertical" margin={{ left: 80, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={75} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Projects" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-8">No inverter data available</p>
                  )}
                </div>

                {/* Tracking supplier */}
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Tracking Supplier</h3>
                  {trackingSupplierData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={trackingSupplierData} layout="vertical" margin={{ left: 80, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={75} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Projects" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-8">No tracking supplier data available</p>
                  )}
                </div>
              </div>

              {/* Capacity factor chart */}
              {solarCfData.length > 0 && (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">EIS Assumed Capacity Factor</h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, solarCfData.length * 28)}>
                    <BarChart data={solarCfData} layout="vertical" margin={{ left: 140, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis type="number" domain={[0, 35]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={135} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="cf" name="Capacity Factor %" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                        {solarCfData.map((d, i) => (
                          <Cell key={i} fill={getStateColour(d.state)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Full project table */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  Solar EIS Projects ({filteredSolarProjects.length})
                </h3>
                <ScrollableTable>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        {([
                          ['name', 'Project', 'left'],
                          ['state', 'State', 'left'],
                          ['capacity_mw', 'MW', 'right'],
                          ['status', 'Status', 'left'],
                          ['panel_type', 'Panel Type', 'left'],
                          ['tracking_type', 'Tracking', 'left'],
                          ['inverter_type', 'Inverter', 'left'],
                          ['assumed_capacity_factor_pct', 'CF %', 'right'],
                          ['assumed_annual_energy_gwh', 'GWh/yr', 'right'],
                          ['panel_count', 'Panels', 'right'],
                          ['connection_voltage_kv', 'kV', 'right'],
                        ] as [keyof EISSolarProject, string, string][]).map(([col, label, align]) => (
                          <th
                            key={col}
                            className={`px-2 py-2 text-${align} font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] select-none whitespace-nowrap`}
                            onClick={() => setSolarSort((prev) => ({ col, dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc' }))}
                          >
                            {label}{' '}
                            {solarSort.col === col ? (solarSort.dir === 'asc' ? <SortUpIcon /> : <SortDownIcon />) : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSolarProjects.map((p) => (
                        <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                          <td className="px-2 py-1.5">
                            <Link to={`/projects/${p.id}`} className="text-[var(--color-primary)] hover:underline whitespace-nowrap">{p.name}</Link>
                          </td>
                          <td className="px-2 py-1.5" style={{ color: getStateColour(p.state) }}>{p.state}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{fmtInt(p.capacity_mw)}</td>
                          <td className="px-2 py-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${getStatusColour(p.status)}20`, color: getStatusColour(p.status) }}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-[var(--color-text-muted)] whitespace-nowrap">{p.panel_type || '—'}</td>
                          <td className="px-2 py-1.5 text-[var(--color-text-muted)] whitespace-nowrap">
                            {p.tracking_type === 'single_axis' ? 'Single-Axis' : p.tracking_type === 'fixed_tilt' ? 'Fixed Tilt' : p.tracking_type || '—'}
                          </td>
                          <td className="px-2 py-1.5 text-[var(--color-text-muted)] whitespace-nowrap">
                            {p.inverter_type === 'central' ? 'Central' : p.inverter_type === 'string' ? 'String' : p.inverter_type || '—'}
                            {p.inverter_supplier ? ` (${p.inverter_supplier})` : ''}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">{fmt(p.assumed_capacity_factor_pct)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{fmt(p.assumed_annual_energy_gwh)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{p.panel_count ? fmtInt(p.panel_count) : '—'}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{p.connection_voltage_kv ? fmtInt(p.connection_voltage_kv) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* COMPARISON TAB — EIS vs Actual */}
      {/* ============================================================ */}
      {tab === 'comparison' && (
        <div className="space-y-6">
          {!comparison || comparison.projects.length === 0 ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">No EIS vs actual comparison data available.</p>
            </div>
          ) : (
            <>
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <StatCard label="Projects Matched" value={comparison.summary.total_matched.toString()} />
                <StatCard label="Avg EIS CF" value={fmt(comparison.summary.avg_eis_cf)} unit="%" />
                <StatCard label="Avg Actual CF" value={fmt(comparison.summary.avg_actual_cf)} unit="%" />
                <StatCard label="Avg Delta" value={`${comparison.summary.avg_delta > 0 ? '+' : ''}${fmt(comparison.summary.avg_delta)}`} unit="%" />
                <StatCard label="Above EIS" value={comparison.summary.projects_above_eis.toString()} />
                <StatCard label="Below EIS" value={comparison.summary.projects_below_eis.toString()} />
              </div>

              {/* Chart 1: Grouped bar — EIS vs Actual CF */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  EIS Predicted vs Actual Capacity Factor
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonBarData} margin={{ top: 5, right: 20, bottom: 80, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name" angle={-45} textAnchor="end" interval={0}
                      tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} height={90}
                    />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload as Record<string, unknown>
                        return (
                          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
                            <p className="font-medium text-[var(--color-text)] mb-1">{d.fullName as string}</p>
                            <p style={{ color: '#3b82f6' }}>EIS Predicted: {fmt(d.eis_cf_pct as number)}%</p>
                            <p style={{ color: '#10b981' }}>Actual (avg): {fmt(d.avg_actual_cf_pct as number)}%</p>
                            <p className="text-[var(--color-text-muted)]">Delta: {fmt(d.cf_delta_pct as number)}%</p>
                          </div>
                        )
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                    <Bar dataKey="eis_cf_pct" name="EIS Predicted CF" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avg_actual_cf_pct" name="Actual CF (avg)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Scatter — EIS CF vs Actual CF */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  EIS Predicted vs Actual (Scatter)
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
                  Points below the diagonal line indicate projects underperforming their EIS prediction.
                </p>
                <ResponsiveContainer width="100%" height={350}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      type="number" dataKey="eis_cf" name="EIS Predicted CF"
                      unit="%" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                      label={{ value: 'EIS Predicted CF (%)', position: 'bottom', offset: 10, style: { fontSize: 11, fill: 'var(--color-text-muted)' } }}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <YAxis
                      type="number" dataKey="actual_cf" name="Actual CF"
                      unit="%" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                      label={{ value: 'Actual CF (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--color-text-muted)' } }}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <ReferenceLine
                      segment={[{ x: 30, y: 30 }, { x: 50, y: 50 }]}
                      stroke="var(--color-text-muted)" strokeDasharray="5 5" strokeOpacity={0.5}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload as Record<string, unknown>
                        return (
                          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs max-w-[200px]">
                            <p className="font-medium text-[var(--color-text)] mb-1 truncate">{d.name as string}</p>
                            <p className="text-[var(--color-text-muted)]">{d.state as string} · {fmtInt(d.capacity_mw as number)} MW</p>
                            <p style={{ color: '#3b82f6' }}>EIS: {fmt(d.eis_cf as number)}%</p>
                            <p style={{ color: '#10b981' }}>Actual: {fmt(d.actual_cf as number)}%</p>
                            <p className="text-[var(--color-text-muted)]">{d.years as number} years of data</p>
                          </div>
                        )
                      }}
                    />
                    <Scatter data={comparisonScatterData}>
                      {comparisonScatterData.map((d, i) => (
                        <Cell key={i} fill={getStateColour(d.state)} r={6} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {Object.entries(STATE_COLOURS).map(([s, c]) => (
                    <span key={s} className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c }} />
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chart 3: Delta horizontal bar */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  CF Delta (Actual − EIS Predicted)
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(350, comparisonBarData.length * 24)}>
                  <BarChart data={comparisonBarData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 130 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                    <YAxis
                      type="category" dataKey="name" width={125}
                      tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload as Record<string, unknown>
                        return (
                          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
                            <p className="font-medium text-[var(--color-text)] mb-1">{d.fullName as string}</p>
                            <p className="text-[var(--color-text-muted)]">Delta: {fmt(d.cf_delta_pct as number)}%</p>
                            <p className="text-[var(--color-text-muted)]">EIS: {fmt(d.eis_cf_pct as number)}% → Actual: {fmt(d.avg_actual_cf_pct as number)}%</p>
                          </div>
                        )
                      }}
                    />
                    <ReferenceLine x={0} stroke="var(--color-text-muted)" strokeOpacity={0.5} />
                    <Bar dataKey="cf_delta_pct" name="CF Delta" radius={[0, 4, 4, 0]}>
                      {comparisonBarData.map((d, i) => (
                        <Cell key={i} fill={d.cf_delta_pct >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detail table */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Project Detail</h3>
                <ScrollableTable>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)] cursor-pointer" onClick={() => toggleCompSort('name')}>
                          Project <CompSortIcon col="name" />
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">State</th>
                        <th className="px-2 py-2 text-right font-medium text-[var(--color-text-muted)] cursor-pointer" onClick={() => toggleCompSort('capacity_mw')}>
                          MW <CompSortIcon col="capacity_mw" />
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-[var(--color-text-muted)] cursor-pointer" onClick={() => toggleCompSort('eis_cf_pct')}>
                          EIS CF% <CompSortIcon col="eis_cf_pct" />
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-[var(--color-text-muted)] cursor-pointer" onClick={() => toggleCompSort('avg_actual_cf_pct')}>
                          Actual CF% <CompSortIcon col="avg_actual_cf_pct" />
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-[var(--color-text-muted)] cursor-pointer" onClick={() => toggleCompSort('cf_delta_pct')}>
                          Delta <CompSortIcon col="cf_delta_pct" />
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-[var(--color-text-muted)]">Years</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedComparisonProjects.map((p) => (
                        <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                          <td className="px-2 py-1.5">
                            <Link to={`/projects/${p.id}`} className="text-[var(--color-primary)] hover:underline">{p.name}</Link>
                          </td>
                          <td className="px-2 py-1.5" style={{ color: getStateColour(p.state) }}>{p.state}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{fmtInt(p.capacity_mw)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{fmt(p.eis_cf_pct)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{fmt(p.avg_actual_cf_pct)}</td>
                          <td className="px-2 py-1.5 text-right font-mono" style={{ color: p.cf_delta_pct >= 0 ? '#10b981' : '#ef4444' }}>
                            {p.cf_delta_pct > 0 ? '+' : ''}{fmt(p.cf_delta_pct)}%
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">{p.annual_actuals.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* COVERAGE TAB */}
      {/* ============================================================ */}
      {tab === 'coverage' && (
        <CoverageTab data={data} coverage={coverage} pdfOpps={pdfOpps} />
      )}

      {/* Financial Close Tab */}
      {tab === 'financial_close' && <FinancialCloseTab />}

      {/* Footer */}
      <p className="text-[11px] text-[var(--color-text-muted)]/50 text-center pt-4">
        Data sourced from Environmental Impact Statements (EIS/EIA), project planning documents,
        developer press releases, and industry publications.
      </p>
    </div>
  )
}

// ============================================================
// Coverage Tab (extracted as component for sort state)
// ============================================================

const TECH_COLOUR_MAP: Record<string, { bg: string; fg: string }> = {
  wind: { bg: '#3b82f620', fg: '#3b82f6' },
  bess: { bg: '#10b98120', fg: '#10b981' },
  solar: { bg: '#f59e0b20', fg: '#f59e0b' },
  'pumped hydro': { bg: '#8b5cf620', fg: '#8b5cf6' },
}

type ExtractedProject = {
  id: string; name: string; technology: string; state: string; status: string
  capacity_mw: number; document_year?: number; document_title?: string; document_url?: string
}

type ExtractedSortCol = 'name' | 'technology' | 'state' | 'status' | 'capacity_mw' | 'document_year'

function CoverageTab({ data, coverage, pdfOpps }: { data: EISAnalyticsData; coverage: EISCoverageData | null; pdfOpps: EISPdfOpportunitiesData | null }) {
  const [sortCol, setSortCol] = useState<ExtractedSortCol>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Build a lookup map for PDF opportunities by project ID
  const pdfOppMap = useMemo(() => {
    const map = new Map<string, EISPdfOpportunity>()
    if (pdfOpps) {
      for (const o of pdfOpps.opportunities) map.set(o.id, o)
    }
    return map
  }, [pdfOpps])

  const allExtracted: ExtractedProject[] = useMemo(() => {
    const list: ExtractedProject[] = [
      ...data.wind_projects.map((p) => ({ id: p.id, name: p.name, technology: 'wind', state: p.state, status: p.status, capacity_mw: p.capacity_mw, document_year: p.document_year, document_title: p.document_title, document_url: p.document_url })),
      ...data.bess_projects.map((p) => ({ id: p.id, name: p.name, technology: 'bess', state: p.state, status: p.status, capacity_mw: p.capacity_mw, document_year: p.document_year, document_title: p.document_title, document_url: p.document_url })),
      ...(data.solar_projects ?? []).map((p) => ({ id: p.id, name: p.name, technology: 'solar', state: p.state, status: p.status, capacity_mw: p.capacity_mw, document_year: p.document_year, document_title: p.document_title, document_url: p.document_url })),
      ...(data.pumped_hydro_projects ?? []).map((p) => ({ id: p.id, name: p.name, technology: 'pumped hydro', state: p.state, status: p.status, capacity_mw: p.capacity_mw, document_year: p.document_year, document_title: p.document_title, document_url: p.document_url })),
    ]
    return list.sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [data, sortCol, sortDir])

  const handleSort = (col: ExtractedSortCol) => {
    setSortCol(col)
    setSortDir((prev) => (sortCol === col && prev === 'asc' ? 'desc' : 'asc'))
  }

  const extracted = allExtracted.length
  const gapCount = coverage?.coverage_gap?.length ?? 0
  const total = extracted + gapCount

  const thClass = 'px-2 py-2 font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] select-none whitespace-nowrap'

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="EIS Data Extracted" value={extracted.toString()} unit="projects" />
        <StatCard label="Pending Extraction" value={(coverage?.available_not_extracted.length ?? 0).toString()} unit="projects" />
        <StatCard label="Coverage Gap" value={gapCount.toString()} unit="eligible without EIS" />
        <StatCard label="PDF Opportunities" value={(pdfOpps?.summary.total_opportunities ?? 0).toString()} unit={`${pdfOpps?.summary.high_priority ?? 0} high priority`} />
        <StatCard
          label="Coverage Rate"
          value={total > 0 ? `${Math.round(extracted / total * 100)}%` : '—'}
          unit={`of ${total} eligible`}
        />
      </div>

      {/* Extracted projects table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          EIS Data Extracted ({extracted})
        </h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
          Projects with technical parameters extracted from EIS/EIA documents. Click any column header to sort.
        </p>
        <ScrollableTable>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {([
                  ['name', 'Project', 'text-left'],
                  ['technology', 'Technology', 'text-left'],
                  ['state', 'State', 'text-left'],
                  ['status', 'Status', 'text-left'],
                  ['capacity_mw', 'MW', 'text-right'],
                  ['document_year', 'Doc Year', 'text-right'],
                ] as [ExtractedSortCol, string, string][]).map(([col, label, align]) => (
                  <th key={col} className={`${thClass} ${align}`} onClick={() => handleSort(col)}>
                    {label}{' '}
                    {sortCol === col ? (sortDir === 'asc' ? <SortUpIcon /> : <SortDownIcon />) : null}
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-medium text-[var(--color-text-muted)]">Data Gaps</th>
                <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">Document</th>
              </tr>
            </thead>
            <tbody>
              {allExtracted.map((p) => {
                const tc = TECH_COLOUR_MAP[p.technology] ?? { bg: '#63727220', fg: '#637272' }
                const opp = pdfOppMap.get(p.id)
                return (
                  <tr key={`${p.id}-${p.technology}`} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                    <td className="px-2 py-1.5">
                      <Link to={`/projects/${p.id}`} className="text-[var(--color-primary)] hover:underline whitespace-nowrap">{p.name}</Link>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase" style={{ backgroundColor: tc.bg, color: tc.fg }}>
                        {p.technology}
                      </span>
                    </td>
                    <td className="px-2 py-1.5" style={{ color: getStateColour(p.state) }}>{p.state}</td>
                    <td className="px-2 py-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${getStatusColour(p.status)}20`, color: getStatusColour(p.status) }}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{fmtInt(p.capacity_mw)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{p.document_year ?? '—'}</td>
                    <td className="px-2 py-1.5 text-center">
                      {opp ? (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            opp.priority === 'high' ? 'bg-red-500/15 text-red-400' : opp.priority === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                          }`}
                          title={`Missing: ${opp.data_gaps.join(', ')}`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                          {opp.data_gaps.length}
                        </span>
                      ) : (
                        <span className="text-emerald-500 text-[9px]">Complete</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {p.document_url ? (
                        <a href={p.document_url} target="_blank" rel="noopener noreferrer"
                          className="text-[var(--color-primary)] hover:underline truncate block max-w-[200px]">
                          {p.document_title || 'View'}
                        </a>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">{p.document_title || '—'}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </ScrollableTable>
      </div>

      {/* Not yet extracted */}
      {coverage && coverage.available_not_extracted.length > 0 && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            EIS Available — Not Yet Extracted ({coverage.available_not_extracted.length})
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
            Projects where EIS/EIA documents are known to exist but technical data hasn&apos;t been imported yet.
          </p>
          <ScrollableTable>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">Project</th>
                  <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">Technology</th>
                  <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">State</th>
                  <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {coverage.available_not_extracted.map((p, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                    <td className="px-2 py-1.5 text-[var(--color-text)]">{p.name}</td>
                    <td className="px-2 py-1.5 text-[var(--color-text-muted)]">{p.technology}</td>
                    <td className="px-2 py-1.5" style={{ color: getStateColour(p.state) }}>{p.state}</td>
                    <td className="px-2 py-1.5 text-[var(--color-text-muted)]">
                      {p.eis_url ? (
                        <a href={p.eis_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
                          {p.notes || 'View EIS'}
                        </a>
                      ) : (
                        p.notes || '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      )}

      {/* Coverage Gap — eligible projects without EIS data */}
      {coverage?.coverage_gap && coverage.coverage_gap.length > 0 && (
        <CoverageGapTable gap={coverage.coverage_gap} pdfOppMap={pdfOppMap} />
      )}
    </div>
  )
}

// ============================================================
// Coverage Gap Table
// ============================================================

const TECH_COLORS: Record<string, string> = {
  wind: '#3b82f6', solar: '#f59e0b', bess: '#10b981',
}

const STATUS_COLORS: Record<string, string> = {
  operating: '#22c55e', commissioning: '#84cc16', construction: '#3b82f6',
  development: '#f59e0b',
}

type GapSortCol = 'name' | 'technology' | 'state' | 'capacity_mw' | 'status' | 'developer' | 'reason'

function CoverageGapTable({ gap, pdfOppMap }: { gap: Array<{ id: string; name: string; technology: string; status: string; capacity_mw: number; state: string; developer?: string; reason: string; scheme?: string }>; pdfOppMap: Map<string, EISPdfOpportunity> }) {
  const [techFilter, setTechFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortCol, setSortCol] = useState<GapSortCol>('capacity_mw')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (col: GapSortCol) => {
    setSortDir((prev) => (sortCol === col && prev === 'asc' ? 'desc' : 'asc'))
    setSortCol(col)
  }

  const filtered = useMemo(() => {
    let result = gap
    if (techFilter !== 'all') result = result.filter(p => p.technology === techFilter)
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter)
    return [...result].sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [gap, techFilter, statusFilter, sortCol, sortDir])

  // Tech breakdown
  const techBreakdown = useMemo(() => {
    const tb: Record<string, { count: number; mw: number }> = {}
    for (const p of gap) {
      if (!tb[p.technology]) tb[p.technology] = { count: 0, mw: 0 }
      tb[p.technology].count++
      tb[p.technology].mw += p.capacity_mw
    }
    return Object.entries(tb).sort((a, b) => b[1].mw - a[1].mw)
  }, [gap])

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const sb: Record<string, { count: number; mw: number }> = {}
    for (const p of gap) {
      if (!sb[p.status]) sb[p.status] = { count: 0, mw: 0 }
      sb[p.status].count++
      sb[p.status].mw += p.capacity_mw
    }
    return Object.entries(sb).sort((a, b) => b[1].count - a[1].count)
  }, [gap])

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          Coverage Gap — Eligible Projects Without EIS Data
        </h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
          Projects that are operating, commissioning, in construction, or have planning approval / CIS / LTESA — but no EIS/EIA technical data has been extracted.
        </p>
      </div>

      {/* Breakdown badges */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase">Tech:</span>
          <button onClick={() => setTechFilter('all')} className={`text-[10px] px-2 py-0.5 rounded-full ${techFilter === 'all' ? 'bg-white/10 text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
            All ({gap.length})
          </button>
          {techBreakdown.map(([tech, { count, mw }]) => (
            <button key={tech} onClick={() => setTechFilter(tech === techFilter ? 'all' : tech)} className={`text-[10px] px-2 py-0.5 rounded-full ${techFilter === tech ? 'bg-white/10 text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: TECH_COLORS[tech] || '#6b7280' }} />
              {tech === 'bess' ? 'BESS' : tech} ({count} · {mw >= 1000 ? `${(mw / 1000).toFixed(1)} GW` : `${Math.round(mw)} MW`})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase">Status:</span>
          {statusBreakdown.map(([status, { count }]) => (
            <button key={status} onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)} className={`text-[10px] px-2 py-0.5 rounded-full ${statusFilter === status ? 'bg-white/10 text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: STATUS_COLORS[status] || '#6b7280' }} />
              {status} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {([
                ['name', 'Project', 'text-left'],
                ['technology', 'Tech', 'text-center'],
                ['state', 'State', 'text-left'],
                ['capacity_mw', 'MW', 'text-right'],
                ['status', 'Status', 'text-center'],
                ['developer', 'Developer', 'text-left'],
                ['reason', 'Reason Eligible', 'text-left'],
              ] as [GapSortCol, string, string][]).map(([col, label, align]) => (
                <th key={col} className={`px-2 py-2 font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] select-none whitespace-nowrap ${align}`} onClick={() => handleSort(col)}>
                  {label}{' '}
                  {sortCol === col ? (sortDir === 'asc' ? <SortUpIcon /> : <SortDownIcon />) : null}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium text-[var(--color-text-muted)] whitespace-nowrap">EIS PDF</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const techColor = TECH_COLORS[p.technology] || '#6b7280'
              const statusColor = STATUS_COLORS[p.status] || '#6b7280'
              return (
                <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                  <td className="px-2 py-1.5">
                    <Link to={`/projects/${p.id}`} className="text-[var(--color-primary)] hover:underline font-medium truncate block max-w-[220px]">{p.name}</Link>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold" style={{ backgroundColor: `${techColor}20`, color: techColor }}>
                      {p.technology === 'bess' ? 'BESS' : p.technology}
                    </span>
                  </td>
                  <td className="px-2 py-1.5" style={{ color: getStateColour(p.state) }}>{p.state}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-[var(--color-text)]">{p.capacity_mw >= 1000 ? `${(p.capacity_mw / 1000).toFixed(1)}G` : Math.round(p.capacity_mw)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-[var(--color-text-muted)] truncate max-w-[140px]">{p.developer || '—'}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-muted)] text-[10px]">
                    {p.reason}
                    {p.scheme && <span className="ml-1 text-[var(--color-primary)]">({p.scheme})</span>}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {pdfOppMap.has(p.id) ? (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          pdfOppMap.get(p.id)!.priority === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                        }`}
                        title={`Priority: ${pdfOppMap.get(p.id)!.priority} — EIS PDF may be available for download`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        {pdfOppMap.get(p.id)!.priority}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]/30 text-[9px]">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScrollableTable>

      <div className="px-4 py-2 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
        Showing {filtered.length} of {gap.length} projects · {filtered.reduce((s, p) => s + p.capacity_mw, 0) >= 1000 ? `${(filtered.reduce((s, p) => s + p.capacity_mw, 0) / 1000).toFixed(1)} GW` : `${Math.round(filtered.reduce((s, p) => s + p.capacity_mw, 0))} MW`} total capacity
      </div>
    </div>
  )
}

// ============================================================
// Financial Close Tab
// ============================================================

const CURRENT_STATUS_COLORS: Record<string, string> = {
  operating: '#22c55e',
  commissioning: '#84cc16',
  construction: '#3b82f6',
  'pre-construction': '#8b5cf6',
  approved: '#f59e0b',
  development: '#ef4444',
}

function FinancialCloseTab() {
  const confirmed = FINANCIAL_CLOSE_PROJECTS.filter(p => p.fcStatus !== 'not_reached')
  const notReached = FINANCIAL_CLOSE_PROJECTS.filter(p => p.fcStatus === 'not_reached')
  const confirmedMW = confirmed.reduce((s, p) => s + p.capacityMW, 0)
  const notReachedMW = notReached.reduce((s, p) => s + p.capacityMW, 0)
  const totalInvestmentM = confirmed.reduce((s, p) => s + (p.fcValueM || 0), 0)

  // FC by year for the stacking chart
  const fcByYear = useMemo(() => {
    const years: Record<string, { year: string; count: number; mw: number; investmentM: number; projects: string[] }> = {}

    for (const p of confirmed) {
      const year = p.fcDate ? new Date(p.fcDate).getFullYear().toString() : p.constructionStartDate ? new Date(p.constructionStartDate).getFullYear().toString() : 'Unknown'
      if (!years[year]) years[year] = { year, count: 0, mw: 0, investmentM: 0, projects: [] }
      years[year].count++
      years[year].mw += p.capacityMW
      years[year].investmentM += p.fcValueM || 0
      years[year].projects.push(p.name)
    }

    return Object.values(years).sort((a, b) => a.year.localeCompare(b.year))
  }, [])

  // Cumulative MW over time
  const cumulativeData = useMemo(() => {
    let cumMW = 0
    let cumCount = 0
    return fcByYear.map(y => {
      cumMW += y.mw
      cumCount += y.count
      return { ...y, cumMW, cumCount }
    })
  }, [fcByYear])

  // FC by technology
  const fcByTech = useMemo(() => {
    const tech: Record<string, { count: number; mw: number }> = {}
    for (const p of confirmed) {
      const t = p.technology
      if (!tech[t]) tech[t] = { count: 0, mw: 0 }
      tech[t].count++
      tech[t].mw += p.capacityMW
    }
    return Object.entries(tech)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.mw - a.mw)
  }, [])

  const techColors: Record<string, string> = {
    bess: '#8b5cf6', wind: '#3b82f6', solar: '#f59e0b', hybrid: '#22c55e', pumped_hydro: '#06b6d4', caes: '#ec4899',
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="FC Confirmed" value={confirmed.length.toString()} unit="projects" />
        <StatCard label="Confirmed Capacity" value={confirmedMW >= 1000 ? `${(confirmedMW / 1000).toFixed(1)}` : confirmedMW.toString()} unit={confirmedMW >= 1000 ? 'GW' : 'MW'} />
        <StatCard label="Total Investment" value={totalInvestmentM > 0 ? `$${(totalInvestmentM / 1000).toFixed(1)}B` : '—'} unit="" />
        <StatCard label="Not Yet FC" value={notReached.length.toString()} unit={`projects (${notReachedMW >= 1000 ? `${(notReachedMW / 1000).toFixed(1)} GW` : `${notReachedMW} MW`})`} />
      </div>

      {/* FC by Year — bar chart */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[var(--color-text)] mb-1">Financial Close by Year</h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-3">New projects reaching FC each year — MW capacity entering the construction pipeline</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={cumulativeData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="mw" name="New MW reaching FC" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cumMW" name="Cumulative MW" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* FC by Technology */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-[var(--color-text)] mb-3">FC by Technology</h3>
        <div className="flex flex-wrap gap-3">
          {fcByTech.map(t => (
            <div key={t.name} className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: techColors[t.name] || '#636e72' }} />
              <div>
                <p className="text-xs font-medium text-[var(--color-text)] capitalize">{t.name === 'bess' ? 'BESS' : t.name === 'caes' ? 'A-CAES' : t.name}</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">{t.count} projects · {t.mw >= 1000 ? `${(t.mw / 1000).toFixed(1)} GW` : `${t.mw} MW`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* December 2025 flurry callout */}
      <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl p-4">
        <h3 className="text-xs font-bold text-[var(--color-text)] mb-1">The December 2025 FC Flurry</h3>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Four wind farms reached FC in the final weeks of 2025 — Palmer (288 MW), Carmody's Hill (256 MW),
          Waddi (108 MW), and Delburn (205 MW) — breaking a year-long wind investment drought.
          Palmer was the first CIS Tender 1 project to reach FC. Battery projects have consistently led the way,
          with BESS moving to FC faster than generation projects.
        </p>
      </div>

      {/* Confirmed FC projects table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-xs font-semibold text-[var(--color-text)]">Projects with Confirmed Financial Close</h3>
          <p className="text-[9px] text-[var(--color-text-muted)]">{confirmed.length} projects · {confirmedMW >= 1000 ? `${(confirmedMW / 1000).toFixed(1)} GW` : `${confirmedMW} MW`}</p>
        </div>
        <ScrollableTable>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Project</th>
                <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">Developer</th>
                <th className="px-2 py-2 text-center font-medium text-[var(--color-text-muted)]">Tech</th>
                <th className="px-2 py-2 text-right font-medium text-[var(--color-text-muted)]">MW</th>
                <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">FC Date</th>
                <th className="px-2 py-2 text-right font-medium text-[var(--color-text-muted)]">Investment</th>
                <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">Scheme</th>
                <th className="px-2 py-2 text-center font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">COD</th>
              </tr>
            </thead>
            <tbody>
              {confirmed
                .sort((a, b) => (b.fcDate || b.constructionStartDate || '').localeCompare(a.fcDate || a.constructionStartDate || ''))
                .map((p, i) => {
                  const statusColor = CURRENT_STATUS_COLORS[p.currentStatus] || '#636e72'
                  return (
                    <tr key={`${p.name}-${i}`} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
                      <td className="px-3 py-2">
                        {p.projectId ? (
                          <Link to={`/projects/${p.projectId}`} className="text-blue-400 hover:text-blue-300 font-medium">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="text-[var(--color-text)] font-medium">{p.name}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-[var(--color-text-muted)] max-w-[120px] truncate">{p.developer}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize" style={{ backgroundColor: `${techColors[p.technology] || '#636e72'}20`, color: techColors[p.technology] || '#636e72' }}>
                          {p.technology === 'bess' ? 'BESS' : p.technology}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[var(--color-text)]">{p.capacityMW.toLocaleString()}</td>
                      <td className="px-2 py-2 text-[var(--color-text-muted)] whitespace-nowrap font-mono">
                        {p.fcDate ? new Date(p.fcDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-2 py-2 text-right text-[var(--color-accent)] font-medium">
                        {p.fcValueM ? `$${p.fcValueM}M` : '—'}
                      </td>
                      <td className="px-2 py-2 text-[var(--color-text-muted)] text-[10px]">{p.round}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                          {p.currentStatus.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[var(--color-text-muted)] whitespace-nowrap font-mono text-[10px]">
                        {p.expectedCOD ? new Date(p.expectedCOD).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </ScrollableTable>
      </div>

      {/* Not yet reached FC */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-xs font-semibold text-[var(--color-text)]">CIS/LTESA Projects Not Yet at Financial Close</h3>
          <p className="text-[9px] text-[var(--color-text-muted)]">{notReached.length} projects · {notReachedMW >= 1000 ? `${(notReachedMW / 1000).toFixed(1)} GW` : `${notReachedMW} MW`} still in development</p>
        </div>
        <div className="divide-y divide-[var(--color-border)]/50">
          {notReached
            .sort((a, b) => b.capacityMW - a.capacityMW)
            .map((p, i) => {
              const statusColor = CURRENT_STATUS_COLORS[p.currentStatus] || '#636e72'
              return (
                <div key={`${p.name}-${i}`} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.projectId ? (
                          <Link to={`/projects/${p.projectId}`} className="text-xs font-medium text-blue-400 hover:text-blue-300">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="text-xs font-medium text-[var(--color-text)]">{p.name}</span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize" style={{ backgroundColor: `${techColors[p.technology] || '#636e72'}20`, color: techColors[p.technology] || '#636e72' }}>
                          {p.technology === 'bess' ? 'BESS' : p.technology}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                          {p.currentStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        <span>{p.developer}</span>
                        <span>·</span>
                        <span>{p.state}</span>
                        <span>·</span>
                        <span className="font-semibold">{p.capacityMW} MW</span>
                        <span>·</span>
                        <span>{p.round}</span>
                      </div>
                      {p.notes && (
                        <p className="text-[9px] text-[var(--color-text-muted)] mt-1 italic leading-relaxed">{p.notes}</p>
                      )}
                    </div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] shrink-0">
                      Not FC
                    </span>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Source note */}
      <div className="text-[10px] text-[var(--color-text-muted)] italic space-y-0.5">
        <p>
          Financial close data sourced from developer press releases, RenewEconomy, pv magazine Australia,
          Energy-Storage.News, ARENA, CEFC announcements, and legal adviser deal announcements. Research date: March 2026.
        </p>
        <p>
          "Effective FC" indicates projects where construction has commenced and EPC contracts signed, even if
          a formal FC press release was not issued.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// NSP summary sub-component
// ============================================================

type NSPSortCol = 'name' | 'wind' | 'solar' | 'bess' | 'hydro' | 'total_mw'

function NSPTable({ data }: { data: EISAnalyticsData }) {
  const [sortCol, setSortCol] = useState<NSPSortCol>('total_mw')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (col: NSPSortCol) => {
    setSortDir((prev) => (sortCol === col && prev === 'asc' ? 'desc' : 'asc'))
    setSortCol(col)
  }

  const nspCounts = useMemo(() => {
    const counts: Record<string, { wind: number; bess: number; solar: number; hydro: number; total_mw: number }> = {}
    const addProject = (p: { nsp?: string; capacity_mw: number }, type: 'wind' | 'bess' | 'solar' | 'hydro') => {
      if (!p.nsp) return
      if (!counts[p.nsp]) counts[p.nsp] = { wind: 0, bess: 0, solar: 0, hydro: 0, total_mw: 0 }
      counts[p.nsp][type]++
      counts[p.nsp].total_mw += p.capacity_mw
    }
    data.wind_projects.forEach((p) => addProject(p, 'wind'))
    data.bess_projects.forEach((p) => addProject(p, 'bess'))
    ;(data.solar_projects ?? []).forEach((p) => addProject(p, 'solar'))
    ;(data.pumped_hydro_projects ?? []).forEach((p) => addProject(p, 'hydro'))
    const list = Object.entries(counts).map(([name, v]) => ({ name, ...v }))
    return list.sort((a, b) => {
      const av = a[sortCol]
      const bv = b[sortCol]
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [data, sortCol, sortDir])

  const thClass = 'px-2 py-2 font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] select-none whitespace-nowrap'

  return (
    <ScrollableTable>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {([
              ['name', 'NSP', 'text-left'],
              ['wind', 'Wind', 'text-right'],
              ['solar', 'Solar', 'text-right'],
              ['bess', 'BESS', 'text-right'],
              ['hydro', 'Hydro', 'text-right'],
              ['total_mw', 'Total MW', 'text-right'],
            ] as [NSPSortCol, string, string][]).map(([col, label, align]) => (
              <th key={col} className={`${thClass} ${align}`} onClick={() => handleSort(col)}>
                {label}{' '}
                {sortCol === col ? (sortDir === 'asc' ? <SortUpIcon /> : <SortDownIcon />) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nspCounts.map((row) => (
            <tr key={row.name} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50">
              <td className="px-2 py-1.5 text-[var(--color-text)]">{row.name}</td>
              <td className="px-2 py-1.5 text-right font-mono">{row.wind || '—'}</td>
              <td className="px-2 py-1.5 text-right font-mono">{row.solar || '—'}</td>
              <td className="px-2 py-1.5 text-right font-mono">{row.bess || '—'}</td>
              <td className="px-2 py-1.5 text-right font-mono">{row.hydro || '—'}</td>
              <td className="px-2 py-1.5 text-right font-mono">{fmtInt(row.total_mw)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTable>
  )
}
