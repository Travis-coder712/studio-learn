import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Tooltip as LTooltip } from 'react-leaflet'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { fetchGridConnection, fetchEISAnalytics } from '../../lib/dataService'
import type { GridConnectionData, EISAnalyticsData, EISWindProject, EISBESSProject, REZSummary } from '../../lib/types'
import {
  TRANSMISSION_PROJECTS,
  TRANSMISSION_STATUS_COLOURS,
  TRANSMISSION_STATUS_LABELS,
  TOTAL_TRANSMISSION_INVESTMENT,
  TOTAL_TRANSMISSION_CAPACITY_MW,
} from '../../data/transmission-projects'
import type { TransmissionStatus } from '../../data/transmission-projects'
import { REZ_ZONES } from '../../data/rez-zones'
import DataTable from '../../components/common/DataTable'
import type { Column } from '../../components/common/DataTable'
import DataProvenance from '../../components/common/DataProvenance'

// ============================================================
// Icons — defined BEFORE const arrays per project pattern
// ============================================================

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
)

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
)

// ============================================================
// Colours
// ============================================================

const CONGESTION_COLOURS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
}

const TECH_COLOURS: Record<string, string> = {
  wind: '#3b82f6',
  solar: '#f59e0b',
  bess: '#10b981',
  pumped_hydro: '#8b5cf6',
  hybrid: '#ec4899',
}

const VOLTAGE_COLOURS: Record<string, string> = {
  '132': '#10b981',
  '220': '#3b82f6',
  '275': '#f59e0b',
  '330': '#ef4444',
  '500': '#8b5cf6',
}

const SUBSTATION_ICON: Record<string, { fill: string; stroke: string; label: string }> = {
  new: { fill: '#3b82f6', stroke: '#60a5fa', label: 'New' },
  existing: { fill: '#64748b', stroke: '#94a3b8', label: 'Existing' },
  upgraded: { fill: '#f59e0b', stroke: '#fbbf24', label: 'Upgraded' },
}

// ============================================================
// Map constants
// ============================================================

const AUSTRALIA_CENTER: [number, number] = [-30.5, 143.0]
const DEFAULT_ZOOM = 5

// ============================================================
// Helpers
// ============================================================

function formatREZName(rez: string): string {
  const withoutState = rez.replace(/^[a-z]{2,3}-/, '')
  return withoutState
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Format technology key for display */
function formatTech(tech: string): string {
  return tech.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Collect all unique technologies across all REZ summaries */
function getAllTechnologies(summaries: REZSummary[]): string[] {
  const techs = new Set<string>()
  for (const rez of summaries) {
    for (const tech of Object.keys(rez.technologies)) {
      techs.add(tech)
    }
  }
  return Array.from(techs).sort()
}

// Stat card component
function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)] text-center">
      <div className="text-2xl md:text-3xl font-bold" style={{ color: color || 'var(--color-text)' }}>
        {value}{unit && <span className="text-lg ml-0.5">{unit}</span>}
      </div>
      <div className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">{label}</div>
    </div>
  )
}

// Status badge
function StatusBadge({ status }: { status: TransmissionStatus }) {
  const colour = TRANSMISSION_STATUS_COLOURS[status]
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${colour}20`, color: colour }}
    >
      {TRANSMISSION_STATUS_LABELS[status]}
    </span>
  )
}

// ============================================================
// Tabs
// ============================================================

type TabId = 'map' | 'analytics' | 'projects' | 'rez'

const TABS: { id: TabId; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'analytics', label: 'Connection Analytics' },
  { id: 'projects', label: 'Transmission Projects' },
  { id: 'rez', label: 'REZ Congestion' },
]

// ============================================================
// Component
// ============================================================

export default function TransmissionInfra() {
  const [activeTab, setActiveTab] = useState<TabId>('map')
  const [gridData, setGridData] = useState<GridConnectionData | null>(null)
  const [eisData, setEISData] = useState<EISAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchGridConnection(), fetchEISAnalytics()]).then(([g, e]) => {
      setGridData(g)
      setEISData(e)
      setLoading(false)
    })
  }, [])

  // EIS projects with connection data (used for future map overlay)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const eisConnectionProjects = useMemo(() => {
    if (!eisData) return []
    const projects: Array<(EISWindProject | EISBESSProject) & { tech: 'wind' | 'bess' }> = []
    for (const p of eisData.wind_projects) {
      if (p.connection_voltage_kv || p.connection_distance_km) {
        projects.push({ ...p, tech: 'wind' })
      }
    }
    for (const p of eisData.bess_projects) {
      if (p.connection_voltage_kv || p.connection_distance_km) {
        projects.push({ ...p, tech: 'bess' })
      }
    }
    return projects
  }, [eisData])
  void eisConnectionProjects

  // Voltage distribution from EIS data
  const voltageData = useMemo(() => {
    if (!eisData) return []
    const breakdown = eisData.summary.connection.voltage_breakdown
    return Object.entries(breakdown)
      .map(([voltage, count]) => ({ voltage: `${voltage} kV`, count, raw: voltage }))
      .sort((a, b) => Number(a.raw) - Number(b.raw))
  }, [eisData])

  // NSP summary from EIS data
  const nspData = useMemo(() => {
    if (!eisData) return []
    const nspMap: Record<string, { count: number; total_mw: number }> = {}
    const allProjects = [...eisData.wind_projects, ...eisData.bess_projects]
    for (const p of allProjects) {
      if (p.nsp) {
        if (!nspMap[p.nsp]) nspMap[p.nsp] = { count: 0, total_mw: 0 }
        nspMap[p.nsp].count++
        nspMap[p.nsp].total_mw += p.capacity_mw
      }
    }
    return Object.entries(nspMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.total_mw - a.total_mw)
  }, [eisData])

  // Connection distance data (sorted, with tech type)
  const connectionDistanceData = useMemo(() => {
    if (!eisData) return []
    const items: Array<{ name: string; distance: number; tech: string; mw: number }> = []
    for (const p of eisData.wind_projects) {
      if (p.connection_distance_km) {
        items.push({ name: p.name, distance: p.connection_distance_km, tech: 'wind', mw: p.capacity_mw })
      }
    }
    for (const p of eisData.bess_projects) {
      if (p.connection_distance_km) {
        items.push({ name: p.name, distance: p.connection_distance_km, tech: 'bess', mw: p.capacity_mw })
      }
    }
    return items.sort((a, b) => b.distance - a.distance)
  }, [eisData])

  // REZ congestion data from grid connection
  const congestionData = useMemo(() => {
    if (!gridData) return []
    return [...gridData.rez_summaries]
      .sort((a, b) => b.total_mw - a.total_mw)
      .map(r => ({
        name: formatREZName(r.rez),
        rez: r.rez,
        total_mw: r.total_mw,
        operating_mw: r.operating_mw,
        pipeline_mw: r.pipeline_mw,
        congestion_level: r.congestion_level,
        congestion_score: r.congestion_score,
        project_count: r.project_count,
      }))
  }, [gridData])

  // Connection status pie data
  const connectionPieData = useMemo(() => {
    if (!gridData) return []
    const statusColours: Record<string, string> = {
      Connected: '#10b981',
      'In progress': '#3b82f6',
      'Pre-application': '#f59e0b',
    }
    return Object.entries(gridData.connection_status_overall).map(([status, info]) => ({
      name: status,
      value: info.mw,
      count: info.count,
      fill: statusColours[status] || '#636e72',
    }))
  }, [gridData])

  // REZ zones with transmission info
  const rezTransmissionInfo = useMemo(() => {
    return REZ_ZONES.filter(z => z.transmission_project).map(z => ({
      ...z,
      statusColour: z.transmission_status ? (TRANSMISSION_STATUS_COLOURS[z.transmission_status as TransmissionStatus] ?? '#636e72') : '#636e72',
    }))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-text)]">
          Transmission Infrastructure
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Major NEM transmission upgrades, grid connection analytics, and REZ congestion analysis
        </p>
        <div className="mt-3">
          <DataProvenance page="transmission-infra" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Transmission Projects" value={TRANSMISSION_PROJECTS.length} color="#3b82f6" />
        <StatCard label="Total Investment" value={`$${TOTAL_TRANSMISSION_INVESTMENT.toFixed(1)}B`} color="#10b981" />
        <StatCard label="New Capacity" value={(TOTAL_TRANSMISSION_CAPACITY_MW / 1000).toFixed(1)} unit="GW" color="#f59e0b" />
        <StatCard label="REZ Zones" value={REZ_ZONES.length} color="#8b5cf6" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'map' && <MapTab />}
      {activeTab === 'analytics' && (
        <AnalyticsTab
          eisData={eisData}
          gridData={gridData}
          voltageData={voltageData}
          nspData={nspData}
          connectionDistanceData={connectionDistanceData}
          connectionPieData={connectionPieData}
        />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab
          expandedProject={expandedProject}
          setExpandedProject={setExpandedProject}
          rezTransmissionInfo={rezTransmissionInfo}
        />
      )}
      {activeTab === 'rez' && (
        <REZTab
          gridData={gridData}
          congestionData={congestionData}
        />
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]/50 text-center">
        Transmission data sourced from AEMO ISP 2024, Transgrid, AusNet, ElectraNet, TasNetworks, and project EIS documents.
      </p>
    </div>
  )
}

// ============================================================
// Map Tab
// ============================================================

function MapTab() {
  const [showSubstations, setShowSubstations] = useState(true)
  const [showREZ, setShowREZ] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // Approximate REZ centre coordinates
  const rezCentres: Record<string, [number, number]> = {
    'nsw-central-west-orana': [-32.1, 149.3],
    'nsw-new-england': [-30.3, 151.4],
    'nsw-south-west': [-34.5, 145.8],
    'nsw-hunter-central-coast': [-32.8, 151.5],
    'nsw-illawarra': [-34.4, 150.8],
    'vic-western': [-36.8, 143.0],
    'vic-gippsland-offshore': [-38.5, 146.8],
    'vic-south-west': [-38.2, 142.5],
    'vic-gippsland-onshore': [-38.2, 146.0],
    'vic-north-west': [-35.8, 142.5],
    'qld-southern-downs': [-28.2, 151.8],
    'qld-callide': [-24.5, 150.5],
    'qld-darling-downs': [-27.5, 151.0],
    'qld-isaac': [-22.0, 148.5],
    'sa-mid-north': [-32.5, 138.5],
    'sa-south-east': [-37.0, 140.5],
    'sa-eastern-eyre': [-33.5, 137.0],
    'tas-north-west': [-41.2, 145.5],
  }

  const filteredProjects = selectedProject
    ? TRANSMISSION_PROJECTS.filter(p => p.id === selectedProject)
    : TRANSMISSION_PROJECTS

  return (
    <div className="space-y-4">
      {/* Map controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status legend */}
        {(Object.entries(TRANSMISSION_STATUS_COLOURS) as [TransmissionStatus, string][]).map(([status, colour]) => (
          <span key={status} className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <span className="inline-block w-6 h-1 rounded" style={{ backgroundColor: colour }} />
            {TRANSMISSION_STATUS_LABELS[status]}
          </span>
        ))}
        <span className="mx-2 text-[var(--color-border)]">|</span>
        <label className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] cursor-pointer">
          <input type="checkbox" checked={showSubstations} onChange={e => setShowSubstations(e.target.checked)} className="rounded" />
          Substations
        </label>
        <label className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] cursor-pointer">
          <input type="checkbox" checked={showREZ} onChange={e => setShowREZ(e.target.checked)} className="rounded" />
          REZ Zones
        </label>
      </div>

      {/* Project filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedProject(null)}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
            !selectedProject
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30'
              : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
          }`}
        >
          All Projects
        </button>
        {TRANSMISSION_PROJECTS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(selectedProject === p.id ? null : p.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              selectedProject === p.id
                ? 'border-transparent font-medium'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
            }`}
            style={
              selectedProject === p.id
                ? { backgroundColor: `${p.color}20`, color: p.color }
                : undefined
            }
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-[var(--color-border)]" style={{ height: '550px' }}>
        <MapContainer
          center={AUSTRALIA_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          style={{ background: '#0f172a' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Transmission route polylines */}
          {filteredProjects.map(project => (
            <Polyline
              key={project.id}
              positions={project.route}
              pathOptions={{
                color: project.color,
                weight: project.status === 'operating' ? 4 : 3,
                opacity: 0.85,
                dashArray: project.status === 'planning' ? '8 6' : undefined,
              }}
            >
              <Popup>
                <div style={{ color: '#f1f5f9', minWidth: 200 }}>
                  <div className="font-semibold text-sm mb-1">{project.name}</div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${TRANSMISSION_STATUS_COLOURS[project.status]}20`, color: TRANSMISSION_STATUS_COLOURS[project.status] }}>
                      {TRANSMISSION_STATUS_LABELS[project.status]}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                      {project.voltage_kv}
                    </span>
                  </div>
                  <div className="text-xs space-y-0.5" style={{ color: '#94a3b8' }}>
                    <div>{project.capacity_mw >= 1000 ? `${(project.capacity_mw / 1000).toFixed(1)} GW` : `${project.capacity_mw} MW`} capacity</div>
                    <div>${project.cost_billion}B investment</div>
                    <div>Expected: {project.expected_completion}</div>
                    <div className="text-[10px] mt-1">{project.owner}</div>
                  </div>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Substation markers */}
          {showSubstations && filteredProjects.flatMap(project =>
            project.substations.map(sub => {
              const icon = SUBSTATION_ICON[sub.type]
              return (
                <CircleMarker
                  key={`${project.id}-${sub.name}`}
                  center={[sub.lat, sub.lng]}
                  radius={6}
                  pathOptions={{
                    color: icon.stroke,
                    fillColor: icon.fill,
                    fillOpacity: 0.8,
                    weight: 2,
                  }}
                >
                  <LTooltip direction="top" offset={[0, -8]}>
                    <span style={{ color: '#f1f5f9', fontSize: 11 }}>
                      {sub.name} ({icon.label})
                    </span>
                  </LTooltip>
                  <Popup>
                    <div style={{ color: '#f1f5f9' }}>
                      <div className="font-semibold text-sm">{sub.name}</div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>
                        <div>Type: {icon.label} substation</div>
                        <div>Project: {project.name}</div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })
          )}

          {/* REZ zone markers */}
          {showREZ && REZ_ZONES.map(rez => {
            const centre = rezCentres[rez.id]
            if (!centre) return null
            const statusColour = rez.transmission_status
              ? (TRANSMISSION_STATUS_COLOURS[rez.transmission_status as TransmissionStatus] ?? '#636e72')
              : '#636e72'
            return (
              <CircleMarker
                key={rez.id}
                center={centre}
                radius={14}
                pathOptions={{
                  color: statusColour,
                  fillColor: statusColour,
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '4 3',
                }}
              >
                <LTooltip direction="top" offset={[0, -14]}>
                  <span style={{ color: '#f1f5f9', fontSize: 11 }}>
                    {rez.name} REZ ({rez.state})
                  </span>
                </LTooltip>
                <Popup>
                  <div style={{ color: '#f1f5f9', minWidth: 180 }}>
                    <div className="font-semibold text-sm mb-1">{rez.name} REZ</div>
                    <div className="text-xs space-y-0.5" style={{ color: '#94a3b8' }}>
                      <div>{rez.state} &middot; {rez.status}</div>
                      {rez.target_capacity_gw && <div>{rez.target_capacity_gw} GW target</div>}
                      {rez.transmission_project && <div className="mt-1">{rez.transmission_project}</div>}
                    </div>
                    <Link to={`/rez/${rez.id}`} className="inline-block mt-2 text-xs font-medium" style={{ color: '#0ea5e9' }}>
                      View REZ details →
                    </Link>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Quick project list below map */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {TRANSMISSION_PROJECTS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(selectedProject === p.id ? null : p.id)}
            className={`text-left p-3 rounded-lg border transition-all ${
              selectedProject === p.id
                ? 'border-[var(--color-primary)]/50 bg-[var(--color-bg-elevated)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)]/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: p.color, display: 'inline-block' }} />
              <span className="text-xs font-semibold text-[var(--color-text)] truncate">{p.name}</span>
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)]">
              {p.voltage_kv} &middot; {p.capacity_mw >= 1000 ? `${(p.capacity_mw / 1000).toFixed(1)} GW` : `${p.capacity_mw} MW`} &middot; {p.expected_completion}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Analytics Tab
// ============================================================

interface AnalyticsTabProps {
  eisData: EISAnalyticsData | null
  gridData: GridConnectionData | null
  voltageData: Array<{ voltage: string; count: number; raw: string }>
  nspData: Array<{ name: string; count: number; total_mw: number }>
  connectionDistanceData: Array<{ name: string; distance: number; tech: string; mw: number }>
  connectionPieData: Array<{ name: string; value: number; count: number; fill: string }>
}

function AnalyticsTab({ eisData, gridData: _gridData, voltageData, nspData, connectionDistanceData, connectionPieData }: AnalyticsTabProps) {
  const avgDistance = eisData?.summary.connection.avg_distance

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Investment"
          value={`$${TOTAL_TRANSMISSION_INVESTMENT.toFixed(1)}B`}
          color="#10b981"
        />
        <StatCard
          label="Avg Connection Distance"
          value={avgDistance ? `${avgDistance.toFixed(1)}` : 'N/A'}
          unit={avgDistance ? 'km' : undefined}
          color="#3b82f6"
        />
        <StatCard
          label="EIS Projects with Grid Data"
          value={eisData ? eisData.wind_projects.filter(p => p.connection_voltage_kv).length + eisData.bess_projects.filter(p => p.connection_voltage_kv).length : 0}
          color="#f59e0b"
        />
        <StatCard
          label="Network Service Providers"
          value={nspData.length}
          color="#8b5cf6"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Connection Status */}
        {connectionPieData.length > 0 && (
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">Connection Status (REZ Pipeline)</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">MW by connection stage across tracked REZ zones</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={connectionPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={35}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {connectionPieData.map((entry, i) => (
                    <Cell key={`pie-${i}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  formatter={(value) => [`${Number(value).toLocaleString()} MW`, 'Capacity']}
                />
                <Legend formatter={(value) => <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Voltage Distribution */}
        {voltageData.length > 0 && (
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">Connection Voltage Distribution</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">EIS projects by grid connection voltage level</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={voltageData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="voltage" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  formatter={(value) => [`${value} projects`, 'Count']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {voltageData.map((entry, i) => (
                    <Cell key={i} fill={VOLTAGE_COLOURS[entry.raw] || '#636e72'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* NSP Portfolio */}
      {nspData.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">Network Service Provider Portfolio</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Projects and total MW per NSP (from EIS data)</p>
          <ResponsiveContainer width="100%" height={Math.max(nspData.length * 40, 150)}>
            <BarChart data={nspData} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--color-text)' }}
                formatter={(value, name) => [
                  name === 'total_mw' ? `${Number(value).toLocaleString()} MW` : `${value} projects`,
                  name === 'total_mw' ? 'Total MW' : 'Projects',
                ]}
              />
              <Bar dataKey="total_mw" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Connection Distance */}
      {connectionDistanceData.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-1">Connection Distance by Project</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Distance to grid connection point (km) — wind vs BESS</p>
          <ResponsiveContainer width="100%" height={Math.max(connectionDistanceData.length * 32, 200)}>
            <BarChart data={connectionDistanceData} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} unit=" km" />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                formatter={(value, _name, props) => {
                  const payload = props?.payload as { tech: string; mw: number } | undefined
                  return [
                    `${value} km (${payload?.mw?.toLocaleString() ?? '?'} MW ${payload?.tech ?? ''})`,
                    'Distance',
                  ]
                }}
              />
              <Bar dataKey="distance" radius={[0, 4, 4, 0]}>
                {connectionDistanceData.map((entry, i) => (
                  <Cell key={i} fill={entry.tech === 'wind' ? '#3b82f6' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} /> Wind
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} /> BESS
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Projects Tab
// ============================================================

interface ProjectsTabProps {
  expandedProject: string | null
  setExpandedProject: (id: string | null) => void
  rezTransmissionInfo: Array<ReturnType<typeof REZ_ZONES extends (infer T)[] ? () => T & { statusColour: string } : never>>
}

function ProjectsTab({ expandedProject, setExpandedProject }: ProjectsTabProps) {
  return (
    <div className="space-y-4">
      {TRANSMISSION_PROJECTS.map(project => {
        const isExpanded = expandedProject === project.id
        return (
          <div key={project.id} className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setExpandedProject(isExpanded ? null : project.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-bg)]/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-4 h-2 rounded shrink-0" style={{ backgroundColor: project.color, display: 'inline-block' }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--color-text)]">{project.name}</span>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {project.voltage_kv} &middot; {project.capacity_mw >= 1000 ? `${(project.capacity_mw / 1000).toFixed(1)} GW` : `${project.capacity_mw} MW`} &middot; ${project.cost_billion}B
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-[var(--color-text-muted)] hidden sm:block">{project.expected_completion}</span>
                <span className="text-[var(--color-text-muted)]">
                  {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-[var(--color-border)] p-4 space-y-3">
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {project.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-semibold text-[var(--color-text)]">{project.voltage_kv}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Voltage</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--color-text)]">
                      {project.capacity_mw >= 1000 ? `${(project.capacity_mw / 1000).toFixed(1)} GW` : `${project.capacity_mw} MW`}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Capacity</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-400">${project.cost_billion}B</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Investment</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--color-text)]">{project.expected_completion}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Expected Completion</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-[var(--color-text)] mb-1.5">Key Substations</div>
                  <div className="flex flex-wrap gap-2">
                    {project.substations.map(sub => {
                      const icon = SUBSTATION_ICON[sub.type]
                      return (
                        <span
                          key={sub.name}
                          className="text-[11px] px-2 py-1 rounded-full"
                          style={{ backgroundColor: `${icon.fill}20`, color: icon.fill }}
                        >
                          {sub.name} ({icon.label})
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div className="text-xs text-[var(--color-text-muted)]">
                  Owner: {project.owner}
                </div>

                <a
                  href={project.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-[var(--color-primary)] hover:underline"
                >
                  View source →
                </a>
              </div>
            )}
          </div>
        )
      })}

      {/* REZ Transmission Status Summary */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">REZ Transmission Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 pr-4 text-[var(--color-text-muted)] font-medium">REZ</th>
                <th className="text-left py-2 pr-4 text-[var(--color-text-muted)] font-medium">State</th>
                <th className="text-left py-2 pr-4 text-[var(--color-text-muted)] font-medium">Target</th>
                <th className="text-left py-2 pr-4 text-[var(--color-text-muted)] font-medium">Transmission Project</th>
                <th className="text-center py-2 text-[var(--color-text-muted)] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {REZ_ZONES.filter(z => z.transmission_project).map(rez => {
                const statusColour = rez.transmission_status
                  ? (TRANSMISSION_STATUS_COLOURS[rez.transmission_status as TransmissionStatus] ?? '#636e72')
                  : '#636e72'
                return (
                  <tr key={rez.id} className="border-b border-[var(--color-border)]/50">
                    <td className="py-2 pr-4">
                      <Link to={`/rez/${rez.id}`} className="text-[var(--color-primary)] hover:underline font-medium text-xs">
                        {rez.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-xs text-[var(--color-text-muted)]">{rez.state}</td>
                    <td className="py-2 pr-4 text-xs text-[var(--color-text)]">
                      {rez.target_capacity_gw ? `${rez.target_capacity_gw} GW` : 'TBD'}
                    </td>
                    <td className="py-2 pr-4 text-xs text-[var(--color-text)]">{rez.transmission_project}</td>
                    <td className="py-2 text-center">
                      {rez.transmission_status && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                          style={{ backgroundColor: `${statusColour}20`, color: statusColour }}
                        >
                          {rez.transmission_status}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// REZ Congestion Tab
// ============================================================

interface REZTabProps {
  gridData: GridConnectionData | null
  congestionData: Array<{
    name: string; rez: string; total_mw: number; operating_mw: number
    pipeline_mw: number; congestion_level: string; congestion_score: number; project_count: number
  }>
}

function REZTab({ gridData, congestionData }: REZTabProps) {
  const [expandedREZ, setExpandedREZ] = useState<string | null>(null)

  // Connection status pie data (moved into REZ tab from GridConnection)
  const connectionPieData = useMemo(() => {
    if (!gridData) return []
    const statusColours: Record<string, string> = {
      Connected: '#10b981',
      'In progress': '#3b82f6',
      'Pre-application': '#f59e0b',
    }
    return Object.entries(gridData.connection_status_overall).map(([status, info]) => ({
      name: status,
      value: info.mw,
      count: info.count,
      fill: statusColours[status] || '#636e72',
    }))
  }, [gridData])

  // Technology stacked bar data per REZ (ported from GridConnection)
  const techStackData = useMemo(() => {
    if (!gridData) return { chartData: [] as Record<string, unknown>[], techs: [] as string[] }
    const techs = getAllTechnologies(gridData.rez_summaries)
    const chartData = [...gridData.rez_summaries]
      .sort((a, b) => b.total_mw - a.total_mw)
      .map(r => {
        const row: Record<string, unknown> = { name: formatREZName(r.rez) }
        for (const tech of techs) {
          const statuses = r.technologies[tech]
          if (statuses) {
            row[tech] = Object.values(statuses).reduce((sum, s) => sum + s.mw, 0)
          } else {
            row[tech] = 0
          }
        }
        return row
      })
    return { chartData, techs }
  }, [gridData])

  // REZ Comparison table rows (for DataTable)
  const comparisonRows = useMemo(() => {
    if (!gridData) return []
    return gridData.rez_summaries.map(r => ({
      rez: r.rez,
      name: formatREZName(r.rez),
      total_mw: r.total_mw,
      operating_mw: r.operating_mw,
      pipeline_mw: r.pipeline_mw,
      congestion_level: r.congestion_level,
      congestion_score: r.congestion_score,
      project_count: r.project_count,
    }))
  }, [gridData])

  type ComparisonRow = (typeof comparisonRows)[number]

  const comparisonColumns: Column<ComparisonRow>[] = [
    {
      key: 'name',
      label: 'REZ Zone',
      render: (_v, row) => (
        <Link to={`/rez/${row.rez}`} className="text-[var(--color-primary)] hover:underline font-medium">
          {row.name}
        </Link>
      ),
    },
    { key: 'total_mw', label: 'Total MW', format: 'number0', aggregator: 'sum' },
    { key: 'operating_mw', label: 'Operating MW', format: 'number0', aggregator: 'sum', hideOnMobile: true, cellClassName: 'text-green-400' },
    { key: 'pipeline_mw', label: 'Pipeline MW', format: 'number0', aggregator: 'sum', hideOnMobile: true, cellClassName: 'text-amber-400' },
    {
      key: 'congestion_level',
      label: 'Congestion',
      align: 'center',
      render: (v) => {
        const level = String(v)
        const colour = CONGESTION_COLOURS[level] || '#636e72'
        return (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
            style={{ backgroundColor: `${colour}20`, color: colour }}
          >
            {level}
          </span>
        )
      },
    },
    {
      key: 'congestion_score',
      label: 'Score',
      align: 'center',
      hideOnMobile: true,
      render: (v, row) => {
        const colour = CONGESTION_COLOURS[row.congestion_level] || '#636e72'
        return (
          <span className="font-semibold" style={{ color: colour }}>
            {Number(v).toFixed(1)}
          </span>
        )
      },
    },
    { key: 'project_count', label: 'Projects', format: 'number0', aggregator: 'sum' },
  ]

  if (!gridData || congestionData.length === 0) {
    return (
      <div className="text-center text-[var(--color-text-muted)] py-12">
        <p>No REZ congestion data available. This data covers NSW REZs with published connection queue information.</p>
      </div>
    )
  }

  const totalPipelineMW = gridData.rez_summaries.reduce((s, r) => s + r.pipeline_mw, 0)
  const totalOperatingMW = gridData.rez_summaries.reduce((s, r) => s + r.operating_mw, 0)

  return (
    <div className="space-y-5">
      {/* Rationale — fuller 4-paragraph version ported from GridConnection */}
      <details className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <summary className="text-sm font-medium text-[var(--color-text)] cursor-pointer">Understanding REZ congestion</summary>
        <div className="mt-3 text-xs text-[var(--color-text-muted)] space-y-2">
          <p><strong>Congestion score (0-10)</strong> indicates how much pipeline capacity is competing for limited grid connection in each Renewable Energy Zone. Higher scores mean more projects competing for limited connection capacity, resulting in higher risk of delays.</p>
          <p><strong>How it is calculated:</strong> The score is based on the ratio of pipeline MW to existing grid hosting capacity within each REZ. A zone with 5,000 MW of pipeline competing for 1,000 MW of available capacity will score much higher than a zone with headroom.</p>
          <p><strong>Connection status</strong> shows how many projects have secured grid connection (Connected) versus those still in progress or at the pre-application stage. This breakdown helps gauge how congested the queue actually is.</p>
          <p><strong>Why this matters:</strong> REZ congestion is a key risk factor for new projects. Heavily congested zones may face multi-year connection delays, increased curtailment risk, and potential requirements for system strength remediation — all of which affect project economics and timelines.</p>
        </div>
      </details>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="REZ Zones" value={gridData.total_rez_zones} color="#3b82f6" />
        <StatCard label="Total MW" value={(totalOperatingMW + totalPipelineMW).toLocaleString()} />
        <StatCard label="Operating" value={totalOperatingMW.toLocaleString()} unit="MW" color="#10b981" />
        <StatCard label="Pipeline" value={totalPipelineMW.toLocaleString()} unit="MW" color="#f59e0b" />
      </div>

      {/* Connection Status pie + REZ Congestion bar (side-by-side) */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Connection Status PieChart */}
        {connectionPieData.length > 0 && (
          <div className="md:col-span-2 bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Connection Status</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Overall MW by connection stage
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={connectionPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {connectionPieData.map((entry, i) => (
                    <Cell key={`pie-${i}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--color-text)' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                  formatter={(value) => [`${Number(value).toLocaleString()} MW`, 'Capacity']}
                />
                <Legend
                  formatter={(value) => <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Per-status count strip */}
            <div className="flex justify-center gap-4 mt-2">
              {connectionPieData.map(s => (
                <div key={s.name} className="text-center">
                  <div className="text-sm font-semibold" style={{ color: s.fill }}>
                    {s.count} projects
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">{s.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Congestion bar chart */}
        <div className={`${connectionPieData.length > 0 ? 'md:col-span-3' : 'md:col-span-5'} bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]`}>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">REZ Congestion</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Total capacity by REZ zone. Colour indicates congestion level.
          </p>
          <ResponsiveContainer width="100%" height={Math.max(congestionData.length * 70, 200)}>
            <BarChart data={congestionData} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                formatter={(value, name) => {
                  const label = name === 'operating_mw' ? 'Operating' : 'Pipeline'
                  return [`${Number(value).toLocaleString()} MW`, label]
                }}
              />
              <Bar dataKey="operating_mw" stackId="cap" name="operating_mw" radius={[0, 0, 0, 0]}>
                {congestionData.map((entry, i) => (
                  <Cell key={`op-${i}`} fill={CONGESTION_COLOURS[entry.congestion_level] || '#636e72'} fillOpacity={0.9} />
                ))}
              </Bar>
              <Bar dataKey="pipeline_mw" stackId="cap" name="pipeline_mw" radius={[0, 4, 4, 0]}>
                {congestionData.map((entry, i) => (
                  <Cell key={`pip-${i}`} fill={CONGESTION_COLOURS[entry.congestion_level] || '#636e72'} fillOpacity={0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#636e72', opacity: 0.9 }} /> Operating
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#636e72', opacity: 0.4 }} /> Pipeline
            </span>
            {Object.entries(CONGESTION_COLOURS).map(([level, colour]) => (
              <span key={level} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: colour }} /> {level.charAt(0).toUpperCase() + level.slice(1)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Technology Breakdown per REZ — Stacked bar (ported from GridConnection) */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Technology Breakdown by REZ</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Capacity (MW) by technology within each Renewable Energy Zone
        </p>
        <ResponsiveContainer width="100%" height={Math.max(techStackData.chartData.length * 70, 200)}>
          <BarChart
            data={techStackData.chartData}
            layout="vertical"
            margin={{ top: 5, right: 60, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
              labelStyle={{ color: 'var(--color-text)' }}
              itemStyle={{ color: 'var(--color-text)' }}
              formatter={(value, name) => [`${Number(value).toLocaleString()} MW`, formatTech(String(name))]}
            />
            {techStackData.techs.map(tech => (
              <Bar
                key={tech}
                dataKey={tech}
                stackId="tech"
                name={tech}
                fill={TECH_COLOURS[tech] || '#636e72'}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 justify-center mt-3 text-xs text-[var(--color-text-muted)]">
          {techStackData.techs.map(tech => (
            <span key={tech} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: TECH_COLOURS[tech] || '#636e72' }} />
              {formatTech(tech)}
            </span>
          ))}
        </div>
      </div>

      {/* REZ detail cards */}
      <div className="space-y-3">
        {congestionData.map(rez => {
          const isExpanded = expandedREZ === rez.rez
          const congestionColour = CONGESTION_COLOURS[rez.congestion_level] || '#636e72'
          const fullData = gridData.rez_summaries.find(r => r.rez === rez.rez)
          return (
            <div key={rez.rez} className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={() => setExpandedREZ(isExpanded ? null : rez.rez)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-bg)]/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0"
                    style={{ backgroundColor: `${congestionColour}20`, color: congestionColour }}
                  >
                    {rez.congestion_level}
                  </span>
                  <div className="min-w-0">
                    <Link to={`/rez/${rez.rez}`} onClick={(e) => e.stopPropagation()} className="text-[var(--color-primary)] hover:underline font-semibold truncate block">
                      {rez.name}
                    </Link>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {rez.project_count} projects &middot; {rez.total_mw.toLocaleString()} MW total
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm text-green-400">{rez.operating_mw.toLocaleString()} MW operating</div>
                    <div className="text-sm text-amber-400">{rez.pipeline_mw.toLocaleString()} MW pipeline</div>
                  </div>
                  <span className="text-[var(--color-text-muted)]">
                    {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </span>
                </div>
              </button>

              {isExpanded && fullData && (
                <div className="border-t border-[var(--color-border)] p-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                      <span>Congestion Score</span>
                      <span className="font-semibold" style={{ color: congestionColour }}>
                        {rez.congestion_score.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--color-bg)] rounded-full">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(rez.congestion_score * 10, 100)}%`,
                          backgroundColor: congestionColour,
                        }}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left py-2 pr-4 text-[var(--color-text-muted)] font-medium">Technology</th>
                          <th className="text-left py-2 pr-4 text-[var(--color-text-muted)] font-medium">Status</th>
                          <th className="text-right py-2 pr-4 text-[var(--color-text-muted)] font-medium">Projects</th>
                          <th className="text-right py-2 text-[var(--color-text-muted)] font-medium">MW</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(fullData.technologies).map(([tech, statuses]) =>
                          Object.entries(statuses).map(([status, info]) => (
                            <tr key={`${tech}-${status}`} className="border-b border-[var(--color-border)]/50">
                              <td className="py-1.5 pr-4">
                                <span className="flex items-center gap-1.5">
                                  <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: TECH_COLOURS[tech] || '#636e72' }} />
                                  <span className="text-[var(--color-text)]">{formatTech(tech)}</span>
                                </span>
                              </td>
                              <td className="py-1.5 pr-4 text-[var(--color-text-muted)] capitalize">{status}</td>
                              <td className="py-1.5 pr-4 text-right text-[var(--color-text)]">{info.count}</td>
                              <td className="py-1.5 text-right text-[var(--color-text)]">{info.mw.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* REZ Comparison Table (ported from GridConnection — uses shared DataTable) */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">REZ Comparison</h2>
        </div>
        <div className="p-3">
          <DataTable
            rows={comparisonRows}
            columns={comparisonColumns}
            showRowNumbers
            showTotals
            defaultSort={{ key: 'total_mw', dir: 'desc' }}
            csvFilename="rez-comparison"
          />
        </div>
      </div>

      {/* Source note (ported from GridConnection) */}
      <p className="text-xs text-[var(--color-text-muted)] italic">
        Grid connection data sourced from AEMO connection registers, REZ access scheme disclosures, and developer announcements.
        Congestion scores reflect pipeline-to-capacity ratios and known curtailment patterns.
      </p>
    </div>
  )
}
