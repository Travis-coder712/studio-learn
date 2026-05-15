/**
 * Shared PDF-export sections used by WindValueAnalysis, SolarValueAnalysis
 * and BessValueAnalysis. Three sections:
 *
 *   <ProjectProfileSection projectMeta tech />
 *     Static facts from the project card (developer, suppliers, COD, grid
 *     services, offtakes, ownership, notable, stakeholder issues).
 *
 *   <ProjectEvolutionTimelineSection projectMeta />
 *     Chronological narrative built from timeline + COD history +
 *     ownership history + field-source provenance.
 *
 *   <NemSiteDataEssentialsSection tech projectMeta avgCfPct avgCapture avgVf
 *                                 dataFirstYear dataLastYear stateName />
 *     Tech-specific checklist of what AURES has measured vs what to look
 *     for elsewhere when comparing to other operating or prospective
 *     projects in the same peer group.
 *
 * All three render at 900 px wide (matches html2canvas capture width)
 * with light-mode styling suitable for direct rasterisation.
 */
import type { Project, FieldSourceEntry } from '../../lib/types'

export type ValueTech = 'wind' | 'solar' | 'bess'

// ============================================================
// 1. Project Profile
// ============================================================

export function ProjectProfileSection({
  projectMeta, tech,
}: { projectMeta: Project | null | undefined; tech: ValueTech }) {
  if (!projectMeta) return null

  const oem = projectMeta.suppliers?.find(s =>
    tech === 'wind' ? s.role === 'wind_oem' :
    tech === 'bess' ? s.role === 'bess_oem' :
    s.role === 'wind_oem' || s.role === 'bess_oem'  // fall-through (no panel role in schema)
  )
  const inverterSup = projectMeta.suppliers?.find(s => s.role === 'inverter')
  const epc = projectMeta.suppliers?.find(s => s.role === 'epc')
  const bop = projectMeta.suppliers?.find(s => s.role === 'bop')
  const syncon = projectMeta.suppliers?.find(s => s.role === 'syncon')
  const statcom = projectMeta.suppliers?.find(s => s.role === 'statcom')
  const ppaList = (projectMeta.offtakes ?? []).filter(o => o.type === 'PPA')
  const schemeList = projectMeta.scheme_contracts ?? []
  const codDisplay = projectMeta.cod_current
    ? new Date(projectMeta.cod_current).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
    : '–'
  const planningEvent = (projectMeta.timeline ?? []).find(t => t.event_type === 'planning_approved')
  const constructionEvent = (projectMeta.timeline ?? []).find(t => t.event_type === 'construction_start')
  const ownershipChanges = (projectMeta.timeline ?? []).filter(t => t.event_type === 'ownership_change')
  const gridEquip: string[] = []
  if (projectMeta.grid_forming) gridEquip.push('Grid-forming inverter')
  if (projectMeta.has_syncon || syncon) gridEquip.push(`Synchronous condenser${syncon?.supplier ? ` (${syncon.supplier})` : ''}`)
  if (projectMeta.has_statcom || statcom) gridEquip.push(`STATCOM${statcom?.supplier ? ` (${statcom.supplier})` : ''}`)
  if (projectMeta.has_harmonic_filter) gridEquip.push('Harmonic filter')
  if (projectMeta.has_sips) gridEquip.push('SIPS')

  // Tech-specific OEM label
  const oemLabel =
    tech === 'wind' ? 'Turbine OEM' :
    tech === 'solar' ? 'Module / inverter OEM' :
    'BESS OEM'

  const StatLine = ({ label, value, span }: { label: string; value: string | React.ReactNode; span?: number }) => (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 11, color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.4 }}>{value}</p>
    </div>
  )

  const isDerated = projectMeta.operational_capacity_mw != null
    && projectMeta.operational_capacity_mw < projectMeta.capacity_mw

  return (
    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>
        Project Profile · what AURES has on the project card
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
        <StatLine label="State / Region" value={`${projectMeta.state}${projectMeta.rez ? ` · ${projectMeta.rez}` : ''}`} />
        {projectMeta.lga && <StatLine label="Local Govt Area" value={projectMeta.lga} />}
        {projectMeta.coordinates && (
          <StatLine
            label="Coordinates"
            value={`${projectMeta.coordinates.lat.toFixed(3)}° ${projectMeta.coordinates.lng.toFixed(3)}°`}
          />
        )}
        <StatLine
          label={tech === 'bess' ? 'Power · Energy' : 'Capacity (MW)'}
          value={tech === 'bess' && projectMeta.storage_mwh
            ? `${projectMeta.capacity_mw} MW / ${projectMeta.storage_mwh} MWh (${(projectMeta.storage_mwh / projectMeta.capacity_mw).toFixed(1)}h)`
            : `${projectMeta.capacity_mw} MW`}
        />
        <StatLine label="COD" value={codDisplay} />
        {projectMeta.cod_original && projectMeta.cod_original !== projectMeta.cod_current && (
          <StatLine label="COD (original)" value={new Date(projectMeta.cod_original).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })} />
        )}
        {projectMeta.current_developer && <StatLine label="Developer / Owner" value={projectMeta.current_developer} span={2} />}
        {projectMeta.current_operator && <StatLine label="Operator" value={projectMeta.current_operator} span={2} />}
        {oem && (
          <StatLine
            label={oemLabel}
            value={`${oem.supplier}${oem.model ? ` · ${oem.model}` : ''}${oem.quantity ? ` (×${oem.quantity})` : ''}${oem.grid_forming ? ' · grid-forming' : ''}`}
            span={2}
          />
        )}
        {tech !== 'wind' && inverterSup && (
          <StatLine
            label="Inverter / PCS"
            value={`${inverterSup.supplier}${inverterSup.model ? ` · ${inverterSup.model}` : ''}${inverterSup.grid_forming ? ' · grid-forming' : ''}`}
            span={2}
          />
        )}
        {epc && <StatLine label="EPC" value={epc.supplier} />}
        {bop && <StatLine label="BOP" value={bop.supplier} />}
        {projectMeta.connection_nsp && <StatLine label="Network Service Provider" value={projectMeta.connection_nsp} />}
        {projectMeta.connection_status && <StatLine label="Connection status" value={projectMeta.connection_status} />}
        {gridEquip.length > 0 && (
          <StatLine label="Grid services equipment" value={gridEquip.join(' · ')} span={2} />
        )}
        {projectMeta.capex_aud_m != null && (
          <StatLine
            label="Capex (AUD)"
            value={`~$${projectMeta.capex_aud_m}M${projectMeta.capex_year ? ` (${projectMeta.capex_year} basis)` : ''}`}
          />
        )}
        {projectMeta.aemo_gen_info_id && (
          <StatLine label="AEMO Gen Info ID" value={projectMeta.aemo_gen_info_id} />
        )}
        <StatLine label="Data confidence" value={projectMeta.data_confidence ?? '–'} />
        {planningEvent && (
          <StatLine label="Planning approval" value={planningEvent.date} />
        )}
        {constructionEvent && (
          <StatLine label="Construction start" value={constructionEvent.date} />
        )}
        {isDerated && (
          <StatLine
            label="Operational status"
            value={`Derated to ${projectMeta.operational_capacity_mw} MW${projectMeta.operational_capacity_note ? ` — ${projectMeta.operational_capacity_note}` : ''}`}
            span={4}
          />
        )}
      </div>

      {/* Offtake & scheme contracts */}
      {(ppaList.length > 0 || schemeList.length > 0) && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginBottom: 8 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Offtake &amp; scheme contracts</p>
          {ppaList.map((p, i) => (
            <p key={i} style={{ fontSize: 10, color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.4 }}>
              • <strong>{p.party}</strong> — {p.type}{p.capacity_mw ? ` · ${p.capacity_mw} MW` : ''}{p.term_years ? ` · ${p.term_years}-year term` : ''}
            </p>
          ))}
          {schemeList.map((s, i) => (
            <p key={i} style={{ fontSize: 10, color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.4 }}>
              • <strong>{s.scheme}</strong> {s.round}{s.capacity_mw ? ` · ${s.capacity_mw} MW` : ''}{s.contract_type ? ` · ${s.contract_type}` : ''}
            </p>
          ))}
        </div>
      )}

      {/* Ownership history */}
      {ownershipChanges.length > 0 && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginBottom: 8 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Ownership history</p>
          {ownershipChanges.map((o, i) => (
            <p key={i} style={{ fontSize: 10, color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.4 }}>
              • <strong>{o.date}</strong> — {o.title}{o.detail ? `. ${o.detail}` : ''}
            </p>
          ))}
        </div>
      )}

      {/* Notable */}
      {projectMeta.notable && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Notable</p>
          <p style={{ fontSize: 10, color: '#0f172a', margin: 0, lineHeight: 1.5 }}>{projectMeta.notable}</p>
        </div>
      )}

      {/* Stakeholder issues */}
      {projectMeta.stakeholder_issues && projectMeta.stakeholder_issues.length > 0 && (
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 8 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Stakeholder / operational issues on file</p>
          {projectMeta.stakeholder_issues.map((s, i) => (
            <p key={i} style={{ fontSize: 10, color: '#92400e', margin: '2px 0 0 0', lineHeight: 1.5 }}>• {s}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 2. Project Evolution Timeline
// ============================================================

type EvoEvent = {
  date: string
  title: string
  detail: string
  source: string
  type: 'field_source' | 'timeline' | 'cod_change' | 'ownership'
  tier?: number
}

export function ProjectEvolutionTimelineSection({
  projectMeta,
}: { projectMeta: Project | null | undefined }) {
  if (!projectMeta) return null

  const events: EvoEvent[] = []

  if (projectMeta.field_sources) {
    for (const [field, entries] of Object.entries(projectMeta.field_sources)) {
      for (const entry of entries as FieldSourceEntry[]) {
        events.push({
          date: entry.date,
          title: `Data update · ${field}`,
          detail: `${entry.value}${entry.note ? ` — ${entry.note}` : ''}`,
          source: entry.source,
          type: 'field_source',
          tier: entry.tier,
        })
      }
    }
  }
  for (const ev of projectMeta.timeline ?? []) {
    events.push({
      date: ev.date,
      title: ev.title,
      detail: ev.detail ?? '',
      source: ev.sources?.[0]?.title ?? 'Project timeline',
      type: 'timeline',
    })
  }
  for (const c of projectMeta.cod_history ?? []) {
    events.push({
      date: c.date,
      title: 'COD change',
      detail: c.estimate,
      source: c.source,
      type: 'cod_change',
    })
  }
  for (const o of projectMeta.ownership_history ?? []) {
    events.push({
      date: o.period,
      title: 'Ownership change',
      detail: `${o.owner} — ${o.role}${o.transaction_structure ? ` (${o.transaction_structure})` : ''}`,
      source: o.source_url ?? 'Ownership tracking',
      type: 'ownership',
    })
  }

  if (events.length === 0) return null

  events.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  const TYPE_COLOURS: Record<EvoEvent['type'], string> = {
    field_source: '#10b981',
    timeline: '#3b82f6',
    cod_change: '#f59e0b',
    ownership: '#8b5cf6',
  }
  const TYPE_LABELS: Record<EvoEvent['type'], string> = {
    field_source: 'Data',
    timeline: 'Milestone',
    cod_change: 'COD',
    ownership: 'Owner',
  }

  const capped = events.length > 24 ? events.slice(-24) : events
  const truncated = events.length > 24
  const typesPresent = Array.from(new Set(capped.map(e => e.type)))

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
        Project Evolution Timeline
      </p>
      <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 10px 0', lineHeight: 1.5, fontStyle: 'italic' }}>
        Chronological history of milestones, ownership changes, COD revisions and data-source updates on file for this project. Same data as the Evolution tab on the project page.
        {truncated && ` Showing the most recent ${capped.length} of ${events.length} recorded events.`}
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        {typesPresent.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TYPE_COLOURS[t] }} />
            <span style={{ fontSize: 9, color: '#475569' }}>{TYPE_LABELS[t]}</span>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', paddingLeft: 18 }}>
        <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 1, backgroundColor: '#e2e8f0' }} />
        {capped.map((ev, i) => {
          const color = TYPE_COLOURS[ev.type]
          return (
            <div key={i} style={{ position: 'relative', marginBottom: 8 }}>
              <div style={{
                position: 'absolute',
                left: -16,
                top: 4,
                width: 11,
                height: 11,
                borderRadius: '50%',
                backgroundColor: color,
                border: '2px solid #ffffff',
                boxShadow: `0 0 0 1px ${color}`,
              }} />
              <div style={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontSize: 9, color: '#475569', fontFamily: 'ui-monospace, SFMono-Regular, monospace', whiteSpace: 'nowrap' }}>
                  {ev.date || '—'}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a' }}>{ev.title}</span>
                    <span style={{
                      fontSize: 8,
                      fontWeight: 600,
                      color: color,
                      backgroundColor: color + '20',
                      padding: '1px 5px',
                      borderRadius: 3,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {TYPE_LABELS[ev.type]}
                    </span>
                    {ev.tier && (
                      <span style={{
                        fontSize: 8,
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        padding: '0 4px',
                        borderRadius: 3,
                      }}>
                        T{ev.tier}
                      </span>
                    )}
                  </div>
                  {ev.detail && (
                    <p style={{ fontSize: 10, color: '#475569', margin: '2px 0 0 0', lineHeight: 1.4 }}>{ev.detail}</p>
                  )}
                  {ev.source && (
                    <p style={{ fontSize: 9, color: '#94a3b8', margin: '2px 0 0 0', fontStyle: 'italic' }}>{ev.source}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 3. NEM Lens · Site Data Essentials (tech-specific checklist)
// ============================================================

type EssentialRow = { topic: string; status: 'have' | 'partial' | 'gap'; note: string }

function essentialsForTech(args: {
  tech: ValueTech
  projectName: string
  stateName: string
  avgCfPct: number | null
  avgCapture: number | null
  avgVf: number | null
  dataFirstYear: number | null
  dataLastYear: number | null
}): EssentialRow[] {
  const { tech, stateName, avgCfPct, avgCapture, avgVf, dataFirstYear, dataLastYear } = args
  const cf = avgCfPct != null ? `${avgCfPct.toFixed(1)}%` : '—'
  const cap = avgCapture != null ? `$${avgCapture.toFixed(0)}/MWh` : '—'
  const vf = avgVf != null ? avgVf.toFixed(2) : '—'
  const period = dataFirstYear && dataLastYear ? `${dataFirstYear}-${dataLastYear}` : 'available history'

  // Shared rows (apply to all three technologies)
  const shared: EssentialRow[] = [
    { topic: 'Capacity factor / dispatch availability', status: 'have',
      note: `Annual CF history from AEMO dispatch (${period}); ${cf} lifetime average for this asset. ${
        tech === 'wind' ? `Benchmark: NSW operating wind sits ~30-38%; SA + VIC south coast ~38-44%; New England ridge sites typically 30-35%.` :
        tech === 'solar' ? `Benchmark: utility solar in QLD/NSW typically 22-28%, SA inland reaches 26-30%, VIC 20-25%.` :
        `For BESS, treat this as discharge availability rather than CF — typical operating BESS dispatches 250-330 full-equivalent cycles per year.`
      }` },
    { topic: 'Capture price · value factor', status: 'have',
      note: `VWAP capture price and VF measured from 2024+ AEMO MMSDM 5-min RRP. This asset: ${cap} capture, VF ${vf}.` },
    { topic: 'Fleet correlation / peer ranking', status: 'have',
      note: `${tech === 'bess' ? 'Spread vs state BESS fleet' : `Pearson R against ${stateName} ${tech} fleet measured monthly`}. ${tech === 'bess' ? 'Lower spread compression = higher revenue per cycle.' : 'Lower R = less cannibalisation exposure.'}` },
    { topic: 'Seasonal + diurnal shape', status: 'have',
      note: `Quarterly + monthly + hourly profiles derived from dispatch data. Used for ${tech === 'solar' ? 'duck-curve exposure analysis and shoulder-period economics' : tech === 'wind' ? 'solar correlation R and evening-peak alignment' : 'arbitrage window timing analysis'}.` },
  ]

  // Tech-specific rows
  if (tech === 'wind') {
    return [
      ...shared,
      { topic: 'Site wind resource (P50 / P90)', status: 'gap',
        note: 'AURES does not yet hold long-term modelled wind resource. For comparison work: ask for the project\'s P50 capacity-factor estimate from the wind resource consultant (DNV, K2, Garrad-Hassan, Vortex), and the P90 downside. Compare to operating CF — a 4-6 pp gap between P50 and measured CF is typical and indicates the project bid hub-height yield optimistically.' },
      { topic: 'Turbine model fit to site', status: 'partial',
        note: 'AURES records the OEM and turbine model where known. To compare: look up the IEC class (IA, IIA, IIIA) of the turbine vs the site\'s mean wind speed and turbulence intensity — a low-class turbine on a high-class site over-extracts and shortens life; a high-class turbine on a low-class site is over-engineered and capital-inefficient.' },
      { topic: 'Wake losses · array layout', status: 'gap',
        note: 'Not in AURES. Wake losses typically 6-12% depending on prevailing wind direction and inter-row spacing. Look for the wind resource assessment\'s gross-to-net derivation. New cluster build-out (other wind farms in the same valley) can add 2-4 pp of incremental wake loss over time.' },
      { topic: 'MLF trajectory (settlement)', status: 'gap',
        note: 'AURES reports gross capture price (pre-MLF). Settlement revenue = capture × MLF. NSW north and SA mid-north basins have seen MLF drift from 0.95-0.98 (commissioning) toward 0.80-0.88 (today). Source: AEMO Marginal Loss Factor publication, annual. A 0.10 MLF reduction equates to ~$8-12/MWh of lost settlement revenue at current spot prices.' },
      { topic: 'Curtailment (economic vs technical)', status: 'gap',
        note: 'Not separately attributed in AURES today. Technical curtailment (system strength, transmission constraint) shows up as missing CF; economic curtailment (negative-price avoidance) shows up as reduced capture price. For comparison, request the operator\'s curtailment log.' },
      { topic: 'PPA / offtake terms · tenor', status: 'partial',
        note: 'AURES captures offtake counter-parties and headline term (see Project Profile above), but not strike price, escalation, shape, or settlement reference. Identify whether the offtake is fixed-price ($/MWh), CFD, swap, or merchant — and the residual merchant exposure after the PPA expires. Most pre-2018 PPAs are now in their last 3-5 years.' },
      { topic: 'LGC revenue capture', status: 'gap',
        note: 'Not in AURES. Project should be LGC-accredited (most operating wind is); LGC spot price has collapsed from ~$90/MWh (2017) to ~$5/MWh (2026). Long-dated LGC contracts struck pre-2020 may still be earning $40-60/MWh. Ask whether LGCs are bundled or stripped from the PPA — stripped LGCs are now near-worthless.' },
      { topic: 'Capex / debt / WACC', status: 'partial',
        note: 'AURES holds headline capex where disclosed. What it does not have: actual debt-to-equity, debt tenor (typically 12-18 years for wind), DSCR covenants, refinancing schedule. Request the lender presentation or debt term sheet.' },
      { topic: 'O&M contract · OEM warranty', status: 'gap',
        note: 'Not in AURES. Typical structure: full-service OEM contract for 5-10 years (transferable), then negotiated extension. Availability guarantees are typically 96-98%. Compare the operator\'s actual availability vs the warranty — a 1 pp gap signals OEM service issues.' },
      { topic: 'Land lease · landowner agreements', status: 'gap',
        note: 'Not in AURES. Wind farms typically pay landowners $8-15k per turbine per year (production-share or fixed). Lease terms run 25-35 years with extension options. Comparison points: per-turbine landowner payment, total annual land cost as % of gross revenue (usually 2-4%), and renewal optionality.' },
      { topic: 'Community / stakeholder', status: 'partial',
        note: 'AURES records known stakeholder issues in project notes (see Project Profile). Items to investigate: community benefit fund $/turbine/year, ongoing complaints with NSW EPA / EnergyCo, planning conditions on operating hours or noise limits, neighbour buy-back arrangements.' },
      { topic: 'REZ access · transmission upgrade dependency', status: 'partial',
        note: 'AURES tags the REZ assignment where applicable. To compare: is this farm using a host transmission line that is fully subscribed, or does it have shared-access pending REZ network expansion?' },
      { topic: 'Approvals + EPBC status', status: 'partial',
        note: 'AURES timeline captures planning approval date where known. For comparison: was the project approved under NSW DPHI Part 4 vs Part 5? Were Commonwealth EPBC conditions imposed? Operating-era EPBC compliance is rarely public.' },
    ]
  }

  if (tech === 'solar') {
    return [
      ...shared,
      { topic: 'Site irradiance (GHI / DNI / POA)', status: 'gap',
        note: 'AURES does not yet hold long-term modelled irradiance. For comparison: ask for the project\'s P50 yield estimate from the resource consultant (Solargis, DNV, AWS Truepower), and the P90 downside. Compare to operating CF — a 2-4 pp gap between P50 and measured CF is typical for utility solar.' },
      { topic: 'Module technology + degradation', status: 'partial',
        note: 'AURES records the module OEM where known. To compare: module technology (Mono PERC vs TOPCon vs HJT), degradation guarantee (usually 0.4-0.55%/yr after year 1), and bifacial gain (5-15% on suitable sites). Long-tail degradation past Year 12 is the largest LCOE risk for early-2010s sites.' },
      { topic: 'Single-axis tracker vs fixed-tilt', status: 'gap',
        note: 'Not in AURES today. Tracker uplift is typically 12-22% on energy yield vs fixed-tilt. Ask for tracker technology (Nextracker, Array Technologies, PV Hardware) and the operator\'s reported availability — tracker faults are a leading O&M issue.' },
      { topic: 'DC:AC ratio · inverter clipping', status: 'gap',
        note: 'Australian utility solar typically uses DC:AC 1.30-1.50 ratios. Clipping (DC output exceeding AC inverter capacity) is typically 3-8% of annual generation — capturable by a DC-coupled BESS. Compare clipped energy estimate from the resource assessment vs the project\'s strategy for recovering it.' },
      { topic: 'Soiling losses', status: 'gap',
        note: 'Not in AURES. Outback / arid sites in QLD west and NSW far west can lose 4-8%/yr to soiling without cleaning. Coastal SA/VIC sites lose 1-2%. Ask for the soiling allowance in the energy yield model and the operator\'s cleaning schedule.' },
      { topic: 'MLF trajectory (settlement)', status: 'gap',
        note: 'AURES reports gross capture price (pre-MLF). Solar farms concentrated in NSW South West REZ, VIC north, QLD western corridors have seen the steepest MLF drift — from 0.95-0.98 to 0.75-0.85 in 5-8 years. Source: AEMO Marginal Loss Factor publication, annual.' },
      { topic: 'Curtailment (economic vs technical)', status: 'gap',
        note: 'For solar this is the central revenue risk — economic curtailment (negative-price avoidance during midday) plus technical curtailment (system strength constraints) can take 8-15% of annual generation. Compare to the dispatch CF gap implied by the resource model.' },
      { topic: 'PPA / offtake terms · tenor', status: 'partial',
        note: 'AURES captures offtake counter-parties and headline term. Investigate the strike price, whether PPA is bundled (energy + LGCs) or stripped, and the residual merchant exposure post-2030 when most pre-2020 PPAs expire.' },
      { topic: 'LGC revenue capture', status: 'gap',
        note: 'Not in AURES. LGC spot has collapsed from ~$90/MWh (2017) to ~$5/MWh (2026). Pre-2020 long-dated contracts may still earn $40-60/MWh. Important: most large solar farms generate ~50,000 LGCs/year per 50 MW — material if contracted.' },
      { topic: 'Capex / debt / WACC', status: 'partial',
        note: 'AURES holds headline capex. Not held: debt tenor (typically 15-22 years for solar), DSCR, refinancing schedule. Solar capex has fallen ~50% since 2018 — early-2010s projects refinancing now face lower benchmarks.' },
      { topic: 'O&M cost · panel cleaning · inverter replacement', status: 'gap',
        note: 'Typical solar O&M is $8-15/kW/yr. Inverter replacement at year 12-15 is the main lifecycle cost. Ask for the operator\'s actual O&M cost vs the budget, and inverter warranty status.' },
      { topic: 'Land lease · landowner agreements', status: 'gap',
        note: 'Not in AURES. Solar farms typically pay $250-1,500/hectare/yr (regional + production-share). 100 MW project occupies ~200-250 hectares. Lease terms run 30-40 years.' },
      { topic: 'REZ access · transmission upgrade dependency', status: 'partial',
        note: 'AURES tags REZ assignment. NSW South West, VIC Murray River and QLD Far North REZs have all seen connection constraints — the biggest single risk for solar farms in those regions is shared-access curtailment.' },
      { topic: 'Approvals + EPBC status', status: 'partial',
        note: 'AURES timeline captures planning approval date. Solar projects in QLD frequently require EPBC referrals for threatened-species habitat. Operating-era EPBC compliance reports are rarely public.' },
    ]
  }

  // BESS
  return [
    ...shared,
    { topic: 'Cell chemistry · power vs energy capability', status: 'partial',
      note: 'AURES records BESS OEM where known (see Project Profile). For comparison: cell chemistry (LFP vs NMC), C-rate capability, and discharge duration matter for revenue stack. LFP is the modern default for grid storage; NMC sites have higher energy density but greater fire-risk profile.' },
    { topic: 'DC architecture · grid-forming vs grid-following', status: 'partial',
      note: 'AURES flags grid-forming inverter status. Grid-forming BESS (Tesla Megapack 3, SMA, Sungrow) can provide system strength and inertia services not available from grid-following BESS — meaningful for revenue and for connection-asset cost amortisation.' },
    { topic: 'Augmentation strategy + warranty', status: 'gap',
      note: 'Not in AURES. BESS cells degrade ~2-3%/yr in cycle-heavy markets. Operators must either oversize cells at FID (e.g. 1.15x nameplate) or augment over years 3-10. Compare warranty terms (typically 10-12 years to 70% capacity) and augmentation budget.' },
    { topic: 'Cycle count · operating dispatch pattern', status: 'have',
      note: 'AURES tracks operating cycles per year from dispatch data. Benchmark: 4-hour BESS at strong-grid node typically does 250-330 full-equivalent cycles per year; 8-hour LDS does 150-220.' },
    { topic: 'Revenue stack (energy + FCAS + capacity)', status: 'partial',
      note: 'AURES captures energy arbitrage revenue from dispatch. NOT yet: FCAS market revenue per service (Raise/Lower 6s/60s/5min), capacity contract revenue (CISA / LTESA capacity payments). Typical NEM 2-hr BESS: ~50% energy / ~45% FCAS / ~5% capacity, shifting toward energy dominance as more BESS arrives.' },
    { topic: 'CIS / LTESA underwriting + revenue floor', status: 'partial',
      note: 'AURES captures scheme contract presence. To compare: ceiling/floor strike prices, term, capacity guarantee, and stranding risk if dispatch falls short. Most CIS/LTESA contracts are confidential — request the contract economics summary.' },
    { topic: 'Connection MLF · location value', status: 'gap',
      note: 'AURES tracks settlement gross of MLF. For BESS at load-centre nodes (Eraring, Waratah, Tarong), MLF stays near 1.0; at remote-REZ co-located sites, MLF can be 0.85-0.95. The MLF differential between charging and discharging directly compresses arbitrage.' },
    { topic: 'Fire safety · setback · DNV compliance', status: 'gap',
      note: 'Not in AURES. NSW fire-risk hazard zones have driven major BESS site design changes since 2021. Compare: cell-level thermal isolation, container spacing (minimum 3m), water suppression vs let-burn strategies, EFR (energy-flow rate) design margins.' },
    { topic: 'O&M cost · OEM service agreement', status: 'gap',
      note: 'Typical BESS O&M is $7-15/kW/yr including augmentation. Compare full-service OEM agreement terms (typically 10-15 years), availability guarantee (98%+), response time SLAs, and exit fees.' },
    { topic: 'Capex / debt / WACC', status: 'partial',
      note: 'AURES holds headline capex. Not held: debt tenor (typically 12-15 years for BESS), DSCR covenants, refinancing risk. BESS debt is more expensive than wind/solar — typical 6-7% all-in vs 4.5-5.5% for solar.' },
    { topic: 'Community / planning approvals', status: 'partial',
      note: 'AURES timeline captures planning approval date where known. BESS approvals in NSW have shifted to EnergyCo-coordinated process since 2023; QLD/VIC remain state planning. Fire risk and noise are the main community concerns.' },
    { topic: 'Spread compression risk · saturation outlook', status: 'have',
      note: 'AURES tracks NEM-wide BESS dispatch and spread evolution. Lesson 11 of the Solar+BESS module covers the saturation thesis. For comparison: this BESS\'s historical spread vs the state-fleet trajectory tells you how exposed it is to the next 3-5 years of BESS build-out.' },
  ]
}

export function NemSiteDataEssentialsSection(args: {
  tech: ValueTech
  projectMeta: Project | null | undefined
  projectName: string
  stateName: string
  avgCfPct: number | null
  avgCapture: number | null
  avgVf: number | null
  dataFirstYear: number | null
  dataLastYear: number | null
}) {
  const rows = essentialsForTech(args)
  return (
    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
        NEM Lens · Site Data Essentials
      </p>
      <p style={{ fontSize: 9, color: '#64748b', margin: '0 0 12px 0', lineHeight: 1.5, fontStyle: 'italic' }}>
        This section maps what AURES has measured for {args.projectName} against the site-essentials
        checklist you would normally complete for any {args.tech === 'bess' ? 'battery storage' : args.tech} acquisition, financing, or peer
        benchmarking assessment. Items marked <strong style={{ color: '#166534' }}>✓ in AURES</strong> are
        reflected in the metrics above. Items marked <strong style={{ color: '#92400e' }}>! gap</strong> are
        not in AURES today — for those, the third column suggests what to look for and how to compare to
        other operating or prospective {args.tech === 'bess' ? 'BESS projects' : `${args.tech} farms`} in
        the same peer group.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
            <th style={{ textAlign: 'left', padding: '6px 6px 6px 0', color: '#475569', fontWeight: 700, fontSize: 9, width: 145 }}>Topic</th>
            <th style={{ textAlign: 'left', padding: '6px', color: '#475569', fontWeight: 700, fontSize: 9, width: 70 }}>Status</th>
            <th style={{ textAlign: 'left', padding: '6px', color: '#475569', fontWeight: 700, fontSize: 9 }}>What AURES has · what to look for to compare</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const statusBg = r.status === 'have' ? '#dcfce7' : r.status === 'partial' ? '#fef3c7' : '#fee2e2'
            const statusColor = r.status === 'have' ? '#166534' : r.status === 'partial' ? '#92400e' : '#991b1b'
            const statusLabel = r.status === 'have' ? '✓ in AURES' : r.status === 'partial' ? '~ partial' : '! gap'
            return (
              <tr key={i} style={{ borderTop: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                <td style={{ padding: '6px 6px 6px 0', fontSize: 10, fontWeight: 600, color: '#0f172a' }}>{r.topic}</td>
                <td style={{ padding: '6px' }}>
                  <span style={{ backgroundColor: statusBg, color: statusColor, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{statusLabel}</span>
                </td>
                <td style={{ padding: '6px', fontSize: 10, color: '#0f172a', lineHeight: 1.5 }}>{r.note}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p style={{ fontSize: 9, color: '#64748b', margin: '12px 0 0 0', lineHeight: 1.5 }}>
        <strong style={{ color: '#0f172a' }}>How to use this list:</strong> the AURES analytical lens covers
        operating revenue economics. For acquisition due diligence, refinancing, or full peer benchmarking,
        the gaps marked above need to be populated from the project's own technical reports, lender
        information memoranda, or operator disclosures. The comparison framing in each row is designed to
        anchor against other operating {args.tech === 'bess' ? 'BESS' : args.tech} assets in the same state
        and against benchmark assumptions used in the NEM project finance community.
      </p>
    </div>
  )
}
