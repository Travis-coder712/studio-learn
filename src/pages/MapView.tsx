import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useMapData } from '../hooks/useMapData'
import { TECHNOLOGY_CONFIG, STATUS_CONFIG } from '../lib/types'
import type { Technology, ProjectStatus, MapProject } from '../lib/types'

const AUSTRALIA_CENTER: [number, number] = [-25.5, 134]
const DEFAULT_ZOOM = 4

function markerRadius(capacity_mw: number): number {
  if (capacity_mw >= 1000) return 10
  if (capacity_mw >= 500) return 8
  if (capacity_mw >= 100) return 6
  return 4
}

export default function MapView() {
  const { projects, loading } = useMapData()
  const [techFilter, setTechFilter] = useState<Technology | null>(null)
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null)

  const filtered = useMemo(() => {
    let result = projects
    if (techFilter) result = result.filter((p) => p.technology === techFilter)
    if (statusFilter) result = result.filter((p) => p.status === statusFilter)
    return result
  }, [projects, techFilter, statusFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading map data...</div>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] lg:h-dvh">
      {/* Filter overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
        <div className="pointer-events-auto inline-flex flex-col gap-2 bg-[var(--color-bg-card)]/95 backdrop-blur-lg rounded-xl border border-[var(--color-border)] p-3 max-w-full">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['wind', 'solar', 'bess', 'hybrid', 'offshore_wind', 'pumped_hydro'] as const).map((tech) => {
              const config = TECHNOLOGY_CONFIG[tech]
              const isActive = techFilter === tech
              return (
                <button
                  key={tech}
                  onClick={() => setTechFilter(isActive ? null : tech)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    isActive
                      ? 'border-transparent font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: `${config.color}20`, color: config.color }
                      : undefined
                  }
                >
                  {config.icon} {config.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['operating', 'construction', 'development'] as const).map((status) => {
              const config = STATUS_CONFIG[status]
              const isActive = statusFilter === status
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(isActive ? null : status)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    isActive
                      ? 'border-transparent font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: `${config.color}20`, color: config.color }
                      : undefined
                  }
                >
                  {config.label}
                </button>
              )
            })}
            <span className="text-[10px] text-[var(--color-text-muted)] ml-1">
              {filtered.length} projects
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
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
        {filtered.map((project) => (
          <ProjectMarker key={project.id} project={project} />
        ))}
      </MapContainer>
    </div>
  )
}

function ProjectMarker({ project }: { project: MapProject }) {
  const techConfig = TECHNOLOGY_CONFIG[project.technology]
  const statusConfig = STATUS_CONFIG[project.status]
  const radius = markerRadius(project.capacity_mw)

  return (
    <CircleMarker
      center={[project.lat, project.lng]}
      radius={radius}
      pathOptions={{
        color: techConfig.color,
        fillColor: techConfig.color,
        fillOpacity: 0.6,
        weight: 1.5,
        opacity: 0.8,
      }}
    >
      <Popup>
        <div className="min-w-[180px]" style={{ color: '#f1f5f9' }}>
          <div className="font-semibold text-sm mb-1" style={{ color: '#f1f5f9' }}>
            {project.name}
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${techConfig.color}20`, color: techConfig.color }}
            >
              {techConfig.icon} {techConfig.label}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
          </div>
          <div className="text-xs space-y-0.5" style={{ color: '#94a3b8' }}>
            <div>{project.capacity_mw >= 1000 ? `${(project.capacity_mw / 1000).toFixed(1)} GW` : `${project.capacity_mw} MW`} · {project.state}</div>
            {project.storage_mwh && (
              <div>{project.storage_mwh >= 1000 ? `${(project.storage_mwh / 1000).toFixed(1)} GWh` : `${project.storage_mwh} MWh`} storage</div>
            )}
            {project.developer && <div className="truncate">{project.developer}</div>}
          </div>
          <Link
            to={`/projects/${project.id}`}
            className="inline-block mt-2 text-xs font-medium"
            style={{ color: '#0ea5e9' }}
          >
            View details →
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  )
}
