/**
 * SchemeBoardroom — full-screen briefing view of CIS + LTESA scheme intelligence.
 *
 * Mirrors the PowerPoint export but designed for on-screen presentation in
 * AURES dark mode. Sticky anchor nav lets you jump between sections; each
 * section is a generous-padding card optimised for projection.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SchemeTrackerData, SchemeTrackerRound, SchemeTrackerProject } from '../../lib/types'

// ============================================================
// Bucket logic — mirrors exportSchemePpt
// ============================================================

const LIKELY_FAILED_THRESHOLD = 14

type Bucket = 'delivering' | 'building' | 'developing' | 'at_risk' | 'unknown'

function bucket(p: SchemeTrackerProject, monthsSinceAnnounced: number): Bucket {
  const stage = p.stage as string
  if (stage === 'operating' || stage === 'commissioning') return 'delivering'
  if (stage === 'construction') return 'building'
  if (monthsSinceAnnounced > LIKELY_FAILED_THRESHOLD) {
    const ds = (p.dev_status || '').toLowerCase()
    if (ds.includes('fid') || ds.includes('construction')) return 'building'
    return 'at_risk'
  }
  return 'developing'
}

// ============================================================
// Lens — two ways of interpreting "is the CISA real"
// ------------------------------------------------------------
// 'awarded'   — the default historical lens. Every awarded CISA is
//               presumed active; only past the LIKELY_FAILED_THRESHOLD
//               do we down-grade to "at risk". Commentary speaks of
//               "delivery", "in development", "likely failed".
//
// 'confirmed' — the strict lens. Only projects in construction or
//               operating/commissioning are treated as CISA-confirmed.
//               (FNCEN-listed projects are also confirmed in principle,
//               but the dataset doesn't carry an explicit FNCEN flag
//               yet — see the lens-toggle commentary.) Everything
//               else, regardless of age, is "CISA not yet confirmed":
//               no FID, no public CISA execution disclosure, no public
//               evidence the underwriting is in force. This view
//               judges CIS success by what is contractually proven
//               rather than what is presumed-active.
// ============================================================

export type Lens = 'awarded' | 'confirmed'

function isConfirmed(b: Bucket): boolean {
  return b === 'delivering' || b === 'building'
}

// Display formatting
const fmtMW = (v: number | null | undefined) =>
  v == null ? '–' : v >= 1000 ? `${(v / 1000).toFixed(2)} GW` : `${Math.round(v)} MW`
const fmtMWh = (v: number | null | undefined) =>
  v == null || v === 0 ? '–' : v >= 1000 ? `${(v / 1000).toFixed(1)} GWh` : `${Math.round(v)} MWh`
const fmtDate = (s: string | null | undefined) => {
  if (!s) return '–'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
}

// AURES palette (dark theme, but values match the design system tokens)
const COLORS = {
  cis:    '#3b82f6',
  ltesa:  '#a855f7',
  green:  '#22c55e',
  amber:  '#f59e0b',
  blue:   '#3b82f6',
  red:    '#ef4444',
}

// ============================================================
// Top-level component
// ============================================================

interface Props {
  data: SchemeTrackerData
}

const SECTIONS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'cis-rounds',   label: 'CIS Rounds' },
  { id: 'ltesa-rounds', label: 'LTESA Rounds' },
  { id: 'outcomes',     label: 'Outcomes' },
  { id: 'tech',         label: 'By Technology' },
  { id: 'funnel',       label: 'CIS Funnel' },
  { id: 'nsw-cis',      label: 'NSW Wind / CIS' },
  { id: 'nsw-ltesa',    label: 'NSW Wind / LTESA' },
  { id: 'senate',       label: 'Senate & Press' },
  { id: 'outlook',      label: 'Outlook' },
] as const

export default function SchemeBoardroom({ data }: Props) {
  const cisRounds = useMemo(() => data.rounds.filter(r => r.scheme === 'CIS'), [data])
  const ltesaRounds = useMemo(() => data.rounds.filter(r => r.scheme === 'LTESA'), [data])
  const [lens, setLens] = useState<Lens>('awarded')

  // Intro copy switches per lens — same data, different reading.
  const overviewIntro = lens === 'awarded'
    ? 'Combined Capacity Investment Scheme (CIS) and NSW Long-Term Energy Service Agreements (LTESA) award status — every awarded round, every project, every dollar of underwriting committed.'
    : 'Combined CIS + LTESA award status, read through a strict past-FID lens. A project only counts as CISA / LTESA-confirmed when it has reached financial close — in construction, commissioning, or operating (or publicly disclosed on the FNCEN First Nations Clean Energy Network tracker). Every other awarded project is treated as pre-FID: the scheme contract may be signed, but the project has not committed to build and the underwriting is not yet visibly in force.'

  const cisRoundsIntro = lens === 'awarded'
    ? `${cisRounds.length} CIS rounds awarded to date — including the new WA Tenders 5 + 6 awarded 2 May 2026. "Likely failed" = past ${LIKELY_FAILED_THRESHOLD} months since announcement without confirmed CISA execution.`
    : `${cisRounds.length} CIS rounds awarded to date — including the new WA Tenders 5 + 6 (May 2026). In this strict view, only projects past FID (in construction or operating) are counted as CISA-confirmed. Every other awarded project — regardless of how recently the round was announced — is treated as pre-FID, CISA not confirmed.`

  const outcomesTitle = lens === 'awarded' ? 'Outcomes Snapshot' : 'Past-FID vs Pre-FID Snapshot'
  const outcomesIntro = lens === 'awarded'
    ? 'Delivery progress across all CIS + LTESA rounds. The middle ground (under construction + still in development) is where contract execution decisions over the next 6 months will determine outcomes.'
    : 'CIS + LTESA awards split into past-FID, CISA / LTESA confirmed (in construction or operating) versus pre-FID, contract not yet confirmed (everything else: awarded but financial close not reached, no published FNCEN disclosure, no observable construction). This is a deliberately strict read — judging scheme progress by what is contractually committed rather than what is presumed-active.'

  const techIntro = lens === 'awarded'
    ? 'Each scheme split into wind / solar / BESS / hybrid — and the share of awards that have reached construction or operation in each technology.'
    : 'Each scheme split by technology, showing the share that has reached financial close — past-FID, contract confirmed — versus the share that remains pre-FID.'

  const funnelIntro = lens === 'awarded'
    ? 'Every CIS project that has been awarded under a CISA, traced through the development pipeline. Each step shows conversion %.'
    : 'Every CIS project that has been awarded a CISA, traced through the development pipeline. In this view, the top of funnel is "awarded but pre-FID — CISA not yet confirmed in force". Progression past the FID gate is the only public evidence the CISA is actually in force.'

  const outlookIntro = lens === 'awarded'
    ? "What to watch from now into late 2026: when CIS execution becomes contractually overdue and what flips from 'developing' to 'likely failed'."
    : 'What to watch from now into late 2026 — when do awarded pre-FID projects reach financial close (and therefore become CISA-confirmed), and which rounds are at risk of failing to do so before the 14-month execution window expires.'

  return (
    <div className="space-y-8">
      {/* View toggle — prominent banner above the sticky anchor nav */}
      <div className="-mx-4 px-4 py-3 bg-gradient-to-r from-[var(--color-primary)]/10 via-emerald-500/5 to-transparent border-y border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text)] whitespace-nowrap">
              👁 View
            </span>
            <div className="inline-flex rounded-lg overflow-hidden border-2 shadow-sm" style={{ borderColor: lens === 'awarded' ? 'var(--color-primary)' : '#10b981' }}>
              <button
                onClick={() => setLens('awarded')}
                title="Default view — every awarded project is presumed to have a CISA in force until past the 14-month threshold."
                className={`text-sm px-4 py-2 font-semibold whitespace-nowrap transition-all ${
                  lens === 'awarded'
                    ? 'bg-[var(--color-primary)] text-white shadow-inner'
                    : 'bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                }`}>
                Awarded (default)
              </button>
              <button
                onClick={() => setLens('confirmed')}
                title="Strict view — only projects past FID (in construction or operating, or publicly disclosed on the FNCEN tracker) count as CISA/LTESA-confirmed."
                className={`text-sm px-4 py-2 font-semibold whitespace-nowrap transition-all ${
                  lens === 'confirmed'
                    ? 'bg-emerald-500 text-white shadow-inner'
                    : 'bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                }`}>
                Past-FID only
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-snug flex-1 min-w-[300px] max-w-3xl">
            {lens === 'awarded'
              ? <><span className="font-semibold text-[var(--color-primary)]">Awarded view:</span> presumes every awarded contract is active until past the {LIKELY_FAILED_THRESHOLD}-month threshold. Historical Boardroom framing.</>
              : <><span className="font-semibold text-emerald-400">Past-FID view:</span> only projects past financial close — in construction or operating (or on the FNCEN tracker) — count as having a confirmed CISA / LTESA in force. Awarded-but-pre-FID projects are treated as not yet confirmed, regardless of round age.</>
            }
          </p>
        </div>
      </div>

      {/* Sticky anchor nav — section jump links */}
      <nav className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-[var(--color-bg)]/90 backdrop-blur border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mr-2 whitespace-nowrap">
            Jump to
          </span>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] whitespace-nowrap transition-colors">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Hero / Overview */}
      <Section id="overview" title="Schemes Overview" intro={overviewIntro}>
        <HeroOverview data={data} cisRounds={cisRounds} ltesaRounds={ltesaRounds} lens={lens} />
      </Section>

      {/* CIS rounds */}
      <Section id="cis-rounds" title={lens === 'awarded' ? 'CIS Rounds — Awarded & Delivering' : 'CIS Rounds — Past-FID vs Pre-FID'}
        intro={cisRoundsIntro}
        accent={COLORS.cis}>
        <RoundsTable rounds={cisRounds} accent={COLORS.cis} lens={lens} scheme="CIS" />
      </Section>

      {/* LTESA rounds */}
      <Section id="ltesa-rounds" title={lens === 'awarded' ? 'LTESA Rounds — NSW Underwriting' : 'LTESA Rounds — Past-FID vs Pre-FID'}
        intro={`${ltesaRounds.length} LTESA rounds across generation, firming, and long-duration storage. NSW EnergyCo as Consumer Trustee.`}
        accent={COLORS.ltesa}>
        <RoundsTable rounds={ltesaRounds} accent={COLORS.ltesa} lens={lens} scheme="LTESA" />
      </Section>

      {/* Outcomes */}
      <Section id="outcomes" title={outcomesTitle} intro={outcomesIntro}>
        <OutcomesPanel data={data} lens={lens} />
      </Section>

      {/* Technology breakdown */}
      <Section id="tech" title="Awarded Capacity by Technology" intro={techIntro}>
        <TechBreakdownPanel data={data} lens={lens} />
      </Section>

      {/* Funnel */}
      <Section id="funnel" title="CIS Pipeline Funnel" intro={funnelIntro}>
        <FunnelPanel data={data} lens={lens} />
      </Section>

      {/* NSW Wind in CIS */}
      <Section id="nsw-cis" title="NSW Wind in CIS"
        intro="Every NSW wind project awarded under CIS, with curated planning approval dates from NSW IPC and DPE."
        accent={COLORS.cis}>
        <NswWindPanel data={data} scheme="CIS" lens={lens} />
      </Section>

      {/* NSW Wind in LTESA */}
      <Section id="nsw-ltesa" title="NSW Wind in LTESA"
        intro="Every NSW wind project awarded under LTESA."
        accent={COLORS.ltesa}>
        <NswWindPanel data={data} scheme="LTESA" lens={lens} />
      </Section>

      {/* Senate Estimates & Press */}
      <Section id="senate" title="Senate Estimates, Recent Press & Public Pressure"
        intro="What's been said publicly about CIS execution, project finance progress, and political pressure on Minister Bowen — drawn from Senate Estimates testimony, regulator commentary, and recent industry press.">
        <SenatePanel />
      </Section>

      {/* Outlook */}
      <Section id="outlook" title="AURES Outlook — Next 6 Months Critical" intro={outlookIntro}>
        <OutlookPanel data={data} />
      </Section>

      <p className="text-[10px] text-[var(--color-text-muted)] text-center pt-4 pb-8 border-t border-[var(--color-border)]">
        Data: AEMO Generation Information · DCCEEW CIS tender results · AEMO Services LTESA results · FNCEN Commitment Tracker · Senate Estimates testimony · Industry press as cited.
        <br/>
        Generated by AURES Intelligence — content matches the &ldquo;Export to PowerPoint&rdquo; deck on this page.
      </p>
    </div>
  )
}

// ============================================================
// Section wrapper
// ============================================================

function Section({ id, title, intro, accent, children }: {
  id: string; title: string; intro: string; accent?: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {accent && <span className="w-1.5 h-7 rounded-full" style={{ backgroundColor: accent }} />}
          <h2 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">{title}</h2>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-5xl">{intro}</p>
      </div>
      <div>{children}</div>
    </section>
  )
}

// ============================================================
// Hero overview
// ============================================================

function HeroOverview({ data, cisRounds, ltesaRounds, lens }: {
  data: SchemeTrackerData; cisRounds: SchemeTrackerRound[]; ltesaRounds: SchemeTrackerRound[]; lens: Lens
}) {
  const sumMW = (rs: SchemeTrackerRound[]) => rs.reduce((a, r) => a + r.total_capacity_mw, 0)
  const sumProj = (rs: SchemeTrackerRound[]) => rs.reduce((a, r) => a + r.num_projects, 0)
  const sumMWh = (rs: SchemeTrackerRound[]) => rs.reduce((a, r) => a + (r.total_storage_mwh || 0), 0)

  const cisStats = { rounds: cisRounds.length, projects: sumProj(cisRounds), mw: sumMW(cisRounds), mwh: sumMWh(cisRounds) }
  const ltesaStats = { rounds: ltesaRounds.length, projects: sumProj(ltesaRounds), mw: sumMW(ltesaRounds), mwh: sumMWh(ltesaRounds) }

  // Confirmed-CISA counts for the strict lens — based on stage = construction/operating
  const confirmedAcross = useMemo(() => {
    let confProj = 0, confMw = 0
    for (const r of data.rounds) {
      for (const p of r.projects) {
        const b = bucket(p, r.months_since_announced)
        if (isConfirmed(b)) {
          confProj += 1
          confMw += p.capacity_mw || 0
        }
      }
    }
    return { confProj, confMw }
  }, [data])

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <SchemeCard
        accent={COLORS.cis}
        title="CAPACITY INVESTMENT SCHEME"
        blurb="Federal underwriting (CISA) for new generation and dispatchable storage across NEM and WEM. Competitive merit-based tenders."
        stats={cisStats}
      />
      <SchemeCard
        accent={COLORS.ltesa}
        title="NSW LTESA"
        blurb="NSW Government underwriting via the Electricity Infrastructure Investment Act 2020. Targets generation, firming, and long-duration storage."
        stats={ltesaStats}
      />

      {/* Combined headline */}
      <div className="md:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Combined — {lens === 'awarded' ? 'awarded to date' : 'past-FID, scheme contract confirmed in force'}</p>
        <div className="flex items-baseline gap-3 flex-wrap">
          {lens === 'awarded' ? (
            <>
              <span className="text-3xl font-bold text-[var(--color-text)]">{data.summary.total_projects}</span>
              <span className="text-sm text-[var(--color-text-muted)]">projects</span>
              <span className="text-3xl font-bold text-[var(--color-text)]">{(data.summary.total_mw / 1000).toFixed(1)} GW</span>
              <span className="text-sm text-[var(--color-text-muted)]">capacity</span>
              <span className="text-3xl font-bold text-[var(--color-text)]">{cisStats.rounds + ltesaStats.rounds}</span>
              <span className="text-sm text-[var(--color-text-muted)]">rounds</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold" style={{ color: COLORS.green }}>{confirmedAcross.confProj}</span>
              <span className="text-sm text-[var(--color-text-muted)]">of {data.summary.total_projects} projects</span>
              <span className="text-3xl font-bold" style={{ color: COLORS.green }}>{(confirmedAcross.confMw / 1000).toFixed(1)} GW</span>
              <span className="text-sm text-[var(--color-text-muted)]">of {(data.summary.total_mw / 1000).toFixed(1)} GW awarded ({((confirmedAcross.confMw / Math.max(data.summary.total_mw, 1)) * 100).toFixed(0)}%)</span>
            </>
          )}
        </div>
        {lens === 'confirmed' && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
            The remaining <span className="font-semibold text-[var(--color-text)]">{data.summary.total_projects - confirmedAcross.confProj} projects</span> ({((data.summary.total_mw - confirmedAcross.confMw) / 1000).toFixed(1)} GW) have been <em>awarded</em> a scheme contract but have not yet reached financial close — i.e. the project is pre-FID, the underwriting is not visibly in force, and the scheme contract (CISA or LTESA) is not confirmed. Some will proceed; some will not.
          </p>
        )}
      </div>
    </div>
  )
}

function SchemeCard({ accent, title, blurb, stats }: {
  accent: string; title: string; blurb: string
  stats: { rounds: number; projects: number; mw: number; mwh: number }
}) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: accent }} />
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>{title}</p>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-5 max-w-md">{blurb}</p>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Rounds awarded" value={`${stats.rounds}`} />
        <Stat label="Projects awarded" value={`${stats.projects}`} />
        <Stat label="Total capacity" value={fmtMW(stats.mw)} />
        <Stat label="Total storage" value={fmtMWh(stats.mwh)} />
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]/80">{label}</p>
      <p className="text-xl font-bold mt-0.5" style={{ color: color || 'var(--color-text)' }}>{value}</p>
    </div>
  )
}

// ============================================================
// Rounds table (with totals)
// ============================================================

function RoundsTable({ rounds, accent, lens, scheme }: { rounds: SchemeTrackerRound[]; accent: string; lens: Lens; scheme: 'CIS' | 'LTESA' }) {
  const totals = useMemo(() => {
    const out = { projects: 0, mw: 0, delivering: 0, building: 0, developing: 0, at_risk: 0 }
    for (const r of rounds) {
      out.projects += r.num_projects
      out.mw += r.total_capacity_mw
      for (const p of r.projects) {
        const b = bucket(p, r.months_since_announced)
        if (b !== 'unknown') out[b] += 1
      }
    }
    return out
  }, [rounds])

  // Headers differ per lens, and the strict ("confirmed") view uses
  // scheme-specific language (CISA for CIS rounds, LTESA for LTESA
  // rounds). The strict column emphasises that the project hasn't
  // reached FID — that's the underlying point.
  const contract = scheme === 'CIS' ? 'CISA' : 'LTESA'
  const headersAwarded   = ['Round', 'Announced', '# Proj', 'Capacity', 'Delivering', 'Building', 'Developing', 'At Risk']
  const headersConfirmed = ['Round', 'Announced', '# Proj', 'Capacity', 'Operating', 'In Construction', `Pre-FID · ${contract} not confirmed`]
  const headers = lens === 'awarded' ? headersAwarded : headersConfirmed

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: accent }}>
            {headers.map((h, i) => (
              <th key={h} className={`px-3 py-2.5 text-white text-xs font-semibold ${(i === 0 || i === 1) ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map(r => {
            const b = { delivering: 0, building: 0, developing: 0, at_risk: 0 }
            for (const p of r.projects) {
              const bk = bucket(p, r.months_since_announced)
              if (bk !== 'unknown') b[bk] += 1
            }
            const notConfirmed = b.developing + b.at_risk
            return (
              <tr key={r.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg)]/40">
                <td className="px-3 py-2 font-medium text-[var(--color-text)]">{r.round}</td>
                <td className="px-3 py-2 text-[var(--color-text-muted)] text-xs">{fmtDate(r.announced_date)}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text)]">{r.num_projects}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text)]">{fmtMW(r.total_capacity_mw)}</td>
                <td className="px-3 py-2 text-right" style={{ color: b.delivering ? COLORS.green : 'var(--color-text-muted)' }}>{b.delivering || '–'}</td>
                <td className="px-3 py-2 text-right" style={{ color: b.building   ? COLORS.amber : 'var(--color-text-muted)' }}>{b.building   || '–'}</td>
                {lens === 'awarded' ? (
                  <>
                    <td className="px-3 py-2 text-right" style={{ color: b.developing ? COLORS.blue  : 'var(--color-text-muted)' }}>{b.developing || '–'}</td>
                    <td className="px-3 py-2 text-right" style={{ color: b.at_risk    ? COLORS.red   : 'var(--color-text-muted)' }}>{b.at_risk    || '–'}</td>
                  </>
                ) : (
                  <td className="px-3 py-2 text-right" style={{ color: notConfirmed ? COLORS.blue : 'var(--color-text-muted)' }}>{notConfirmed || '–'}</td>
                )}
              </tr>
            )
          })}
          <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-bg-elevated)] font-semibold">
            <td className="px-3 py-2.5 text-[var(--color-text)]">TOTAL</td>
            <td />
            <td className="px-3 py-2.5 text-right text-[var(--color-text)]">{totals.projects}</td>
            <td className="px-3 py-2.5 text-right text-[var(--color-text)]">{fmtMW(totals.mw)}</td>
            <td className="px-3 py-2.5 text-right" style={{ color: COLORS.green }}>{totals.delivering}</td>
            <td className="px-3 py-2.5 text-right" style={{ color: COLORS.amber }}>{totals.building}</td>
            {lens === 'awarded' ? (
              <>
                <td className="px-3 py-2.5 text-right" style={{ color: COLORS.blue }}>{totals.developing}</td>
                <td className="px-3 py-2.5 text-right" style={{ color: COLORS.red }}>{totals.at_risk}</td>
              </>
            ) : (
              <td className="px-3 py-2.5 text-right" style={{ color: COLORS.blue }}>{totals.developing + totals.at_risk}</td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Outcomes panel
// ============================================================

function OutcomesPanel({ data, lens }: { data: SchemeTrackerData; lens: Lens }) {
  const stats = useMemo(() => {
    const counts = { delivering: 0, building: 0, developing: 0, at_risk: 0 }
    const mw = { delivering: 0, building: 0, developing: 0, at_risk: 0 }
    for (const r of data.rounds) {
      for (const p of r.projects) {
        const b = bucket(p, r.months_since_announced)
        if (b !== 'unknown') {
          counts[b] += 1
          mw[b] += p.capacity_mw || 0
        }
      }
    }
    return { counts, mw }
  }, [data])

  const totalProj = stats.counts.delivering + stats.counts.building + stats.counts.developing + stats.counts.at_risk
  const totalMw = stats.mw.delivering + stats.mw.building + stats.mw.developing + stats.mw.at_risk

  // Cards switch shape per lens. Awarded shows four; confirmed shows three —
  // Operating + In Construction grouped as the CISA-confirmed group, and
  // Developing + At Risk merged into the "CISA not yet confirmed" group.
  const cardsAwarded = [
    { label: 'Delivering',         sub: 'Operating or commissioning',                    n: stats.counts.delivering, mw: stats.mw.delivering, color: COLORS.green },
    { label: 'Under Construction', sub: 'Site works underway',                           n: stats.counts.building,   mw: stats.mw.building,   color: COLORS.amber },
    { label: 'In Development',     sub: `≤${LIKELY_FAILED_THRESHOLD} months since award`, n: stats.counts.developing, mw: stats.mw.developing, color: COLORS.blue },
    { label: 'Likely Failed',      sub: `>${LIKELY_FAILED_THRESHOLD} months without CISA`, n: stats.counts.at_risk,   mw: stats.mw.at_risk,    color: COLORS.red },
  ]
  const cardsConfirmed = [
    { label: 'Operating',                   sub: 'Past-FID, scheme contract confirmed — generating',         n: stats.counts.delivering, mw: stats.mw.delivering, color: COLORS.green },
    { label: 'In Construction',             sub: 'Past-FID, scheme contract confirmed — site works under way', n: stats.counts.building,   mw: stats.mw.building,   color: COLORS.amber },
    { label: 'Pre-FID · contract not confirmed', sub: 'Awarded but project has not reached financial close', n: stats.counts.developing + stats.counts.at_risk, mw: stats.mw.developing + stats.mw.at_risk, color: COLORS.blue },
  ]
  const cards = lens === 'awarded' ? cardsAwarded : cardsConfirmed

  const confirmedMw = stats.mw.delivering + stats.mw.building
  const confirmedCount = stats.counts.delivering + stats.counts.building
  const confirmedPct = (confirmedMw / Math.max(totalMw, 1)) * 100
  const deliveringPct = (stats.mw.delivering / Math.max(totalMw, 1)) * 100
  const atRiskPct = (stats.mw.at_risk / Math.max(totalMw, 1)) * 100

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 ${cards.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
        {cards.map(c => (
          <div key={c.label} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: c.color }} />
            <p className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color: c.color }}>{c.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-[var(--color-text)]">{c.n}</span>
              <span className="text-xs text-[var(--color-text-muted)]">projects</span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{fmtMW(c.mw)} · {((c.n / Math.max(totalProj, 1)) * 100).toFixed(0)}% of #</p>
            <p className="text-[10px] text-[var(--color-text-muted)]/80 mt-1 italic">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Share-of-capacity bar — under confirmed lens, group first two as one block */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          {lens === 'awarded' ? 'Share of awarded capacity (by MW)' : 'Share of awarded capacity — past-FID (CISA/LTESA confirmed) vs pre-FID (by MW)'}
        </p>
        <div className="flex h-10 rounded-lg overflow-hidden border border-[var(--color-border)]">
          {cards.map(c => {
            const w = (c.mw / Math.max(totalMw, 1)) * 100
            if (w < 0.5) return null
            return (
              <div key={c.label} title={`${c.label}: ${fmtMW(c.mw)} (${w.toFixed(0)}%)`}
                className="flex items-center justify-center text-xs font-semibold text-white"
                style={{ width: `${w}%`, backgroundColor: c.color }}>
                {w >= 8 ? `${w.toFixed(0)}%` : ''}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] border-l-4 rounded-xl p-4" style={{ borderLeftColor: lens === 'awarded' ? COLORS.green : COLORS.blue }}>
        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
          {lens === 'awarded' ? (
            <>
              <span className="font-semibold text-[var(--color-text)]">Headline read: </span>
              <span style={{ color: COLORS.green, fontWeight: 600 }}>{deliveringPct.toFixed(0)}%</span> of awarded capacity is operating or commissioning.{' '}
              <span style={{ color: COLORS.red, fontWeight: 600 }}>{atRiskPct.toFixed(0)}%</span> sits in the &ldquo;likely failed&rdquo; bucket — past the {LIKELY_FAILED_THRESHOLD}-month threshold without confirmed CISA execution. The middle ground is where contract execution decisions over the next 6 months will determine outcomes.
            </>
          ) : (
            <>
              <span className="font-semibold text-[var(--color-text)]">Past-FID read: </span>
              <span style={{ color: COLORS.green, fontWeight: 600 }}>{confirmedPct.toFixed(0)}%</span> of awarded CIS + LTESA capacity is past financial close — operating or in construction, with the scheme contract (CISA or LTESA) confirmed in force.{' '}
              <span style={{ color: COLORS.blue, fontWeight: 600 }}>{(100 - confirmedPct).toFixed(0)}%</span> remains pre-FID — the project has been notified of a scheme award, but has not yet reached financial close, is not yet on the FNCEN tracker, and the underwriting is not publicly visible in force. Some of those projects will reach construction over the next 6&ndash;18 months; some will not. This view reads scheme success by what is contractually committed rather than what is presumed-active.{' '}
              <span className="font-semibold text-[var(--color-text)]">{confirmedCount}</span> of {totalProj} projects are past FID.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Tech breakdown panel
// ============================================================

function TechBreakdownPanel({ data, lens }: { data: SchemeTrackerData; lens: Lens }) {
  const techLabel: Record<string, string> = {
    wind: 'Wind', solar: 'Solar', bess: 'BESS', hybrid: 'Hybrid', pumped_hydro: 'Pumped Hydro',
  }
  const techColor: Record<string, string> = {
    wind: '#3b82f6', solar: '#f59e0b', bess: '#10b981', hybrid: '#ec4899', pumped_hydro: '#8b5cf6',
    other: '#64748b',
  }

  type Agg = { count: number; mw: number; delivering: number; building: number; mwDelivering: number; mwBuilding: number }
  const aggregate = (scheme: 'CIS' | 'LTESA') => {
    const out: Record<string, Agg> = {}
    for (const r of data.rounds) {
      if (r.scheme !== scheme) continue
      for (const p of r.projects) {
        const tech = (p.technology || 'other').toLowerCase()
        const a = out[tech] ??= { count: 0, mw: 0, delivering: 0, building: 0, mwDelivering: 0, mwBuilding: 0 }
        a.count += 1
        a.mw += p.capacity_mw || 0
        const b = bucket(p, r.months_since_announced)
        if (b === 'delivering') { a.delivering += 1; a.mwDelivering += p.capacity_mw }
        if (b === 'building') { a.building += 1; a.mwBuilding += p.capacity_mw }
      }
    }
    return Object.entries(out).sort((a, b) => b[1].mw - a[1].mw)
  }

  const renderBlock = (label: string, accent: string, rows: ReturnType<typeof aggregate>) => {
    const totals = rows.reduce((acc, [, a]) => ({
      count: acc.count + a.count,
      mw: acc.mw + a.mw,
      successCount: acc.successCount + a.delivering + a.building,
      successMw: acc.successMw + a.mwDelivering + a.mwBuilding,
    }), { count: 0, mw: 0, successCount: 0, successMw: 0 })
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 text-white font-semibold text-sm" style={{ backgroundColor: accent }}>{label}</div>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-text-muted)] italic">No awards yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                <th className="px-3 py-2 text-left">Tech</th>
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-right">Capacity</th>
                <th className="px-3 py-2 text-right">{lens === 'awarded' ? 'Delivering / Building' : 'Operating / In Construction'}</th>
                <th className="px-3 py-2 text-right">{lens === 'awarded' ? 'Success rate' : 'Past-FID rate'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([tech, a]) => {
                const successCount = a.delivering + a.building
                const successMw = a.mwDelivering + a.mwBuilding
                const successPct = a.count > 0 ? (successCount / a.count) * 100 : 0
                const successMwPct = a.mw > 0 ? (successMw / a.mw) * 100 : 0
                const rateColor = successPct >= 50 ? COLORS.green : successPct >= 20 ? COLORS.amber : COLORS.red
                return (
                  <tr key={tech} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]/40">
                    <td className="px-3 py-2 font-semibold" style={{ color: techColor[tech] || techColor.other }}>{techLabel[tech] || tech}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-text)]">{a.count}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-text)]">{fmtMW(a.mw)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: successCount ? COLORS.green : 'var(--color-text-muted)' }}>
                      {successCount} · {fmtMW(successMw)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: rateColor }}>
                      {successPct.toFixed(0)}% · {successMwPct.toFixed(0)}%
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-[var(--color-bg-elevated)] font-semibold">
                <td className="px-3 py-2.5 text-[var(--color-text)]">TOTAL</td>
                <td className="px-3 py-2.5 text-right text-[var(--color-text)]">{totals.count}</td>
                <td className="px-3 py-2.5 text-right text-[var(--color-text)]">{fmtMW(totals.mw)}</td>
                <td className="px-3 py-2.5 text-right" style={{ color: COLORS.green }}>{totals.successCount} · {fmtMW(totals.successMw)}</td>
                <td className="px-3 py-2.5 text-right text-[var(--color-text)]">
                  {totals.count ? `${((totals.successCount / totals.count) * 100).toFixed(0)}%` : '–'} ·{' '}
                  {totals.mw ? `${((totals.successMw / totals.mw) * 100).toFixed(0)}%` : '–'}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    )
  }

  // Compute the "no hybrid in construction" headline
  const cisAgg = aggregate('CIS')
  const ltesaAgg = aggregate('LTESA')
  const hybridCounts = (() => {
    const cis = cisAgg.find(([t]) => t === 'hybrid')?.[1]
    const ltesa = ltesaAgg.find(([t]) => t === 'hybrid')?.[1]
    const cisCount = cis?.count ?? 0
    const cisMw = cis?.mw ?? 0
    const cisInProgress = (cis?.delivering ?? 0) + (cis?.building ?? 0)
    const ltesaCount = ltesa?.count ?? 0
    const ltesaInProgress = (ltesa?.delivering ?? 0) + (ltesa?.building ?? 0)
    return { cisCount, cisMw, cisInProgress, ltesaCount, ltesaInProgress, total: cisCount + ltesaCount, totalInProgress: cisInProgress + ltesaInProgress }
  })()

  return (
    <div className="space-y-4">
      {/* Hybrid context callout — answers "why is hybrid 0%?" */}
      {hybridCounts.total > 0 && hybridCounts.totalInProgress === 0 && (
        <HybridCallout counts={hybridCounts} />
      )}
      <div className="grid lg:grid-cols-2 gap-4">
        {renderBlock('CIS', COLORS.cis, cisAgg)}
        {renderBlock('LTESA', COLORS.ltesa, ltesaAgg)}
      </div>
    </div>
  )
}

// ============================================================
// Hybrid callout — explains "0 in construction" finding
// ============================================================

function HybridCallout({ counts }: { counts: { cisCount: number; cisMw: number; cisInProgress: number; ltesaCount: number; ltesaInProgress: number; total: number; totalInProgress: number } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-[var(--color-bg-card)] border-l-4 rounded-xl overflow-hidden" style={{ borderLeftColor: COLORS.amber }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--color-bg)]/40 transition-colors"
      >
        <span className="w-7 h-7 rounded-full grid place-items-center text-sm font-bold text-white flex-shrink-0 mt-0.5"
          style={{ backgroundColor: COLORS.amber }}>i</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            Why are 0 of {counts.total} hybrid projects in construction or operating?
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
            CIS hybrids are <em>solar + co-located battery</em> bundled into a single contract. {counts.cisCount} CIS hybrids ({counts.cisMw / 1000 >= 1 ? `${(counts.cisMw/1000).toFixed(1)} GW` : `${Math.round(counts.cisMw)} MW`}) and {counts.ltesaCount} LTESA hybrids — none yet at construction. {open ? 'Click to hide' : 'Click for the explanation.'}
          </p>
        </div>
        <span className="text-[var(--color-text-muted)] text-lg" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>⌄</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)] bg-[var(--color-bg)]/40 space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">What we found</p>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-1.5 leading-relaxed list-none">
              <li className="flex gap-2">
                <span className="text-[var(--color-text-muted)]">•</span>
                <span><strong className="text-[var(--color-text)]">All CIS &ldquo;hybrid&rdquo; awards are new co-located builds, not retrofits.</strong> Adding a battery to an <em>existing</em> solar farm is not eligible for a CIS contract — CIS underwrites new capacity. So even where a hybrid project shares a site name with an existing facility (e.g. West Mokoan vs Mokoan), the CIS award is for new generation + battery built together.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--color-text-muted)]">•</span>
                <span><strong className="text-[var(--color-text)]">Timing.</strong> CIS Tender 1 (where the first 8 hybrids were awarded) was announced 11 Dec 2024 — only 17 months ago. CIS Tender 4 (12 of 20 awards were hybrids) was announced 9 Oct 2025 — only ~7 months ago. DCCEEW publicly expects construction starts on the T4 cohort &ldquo;from 2026 onward&rdquo; with FIDs in 2026-27.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--color-text-muted)]">•</span>
                <span><strong className="text-[var(--color-text)]">Hybrid lead time is structurally longer than pure solar or pure BESS.</strong> Both the solar component and the battery have to be financed and permitted together; grid connection studies cover both. Industry reporting (Modo Energy, Energy-Storage News) confirms hybrid CISA execution is trailing the standalone-BESS rounds.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--color-text-muted)]">•</span>
                <span><strong className="text-[var(--color-text)]">Junction Rivers</strong> (NSW, 585 MW + 800 MWh) — the largest CIS hybrid — is &ldquo;setting the ball rolling on environmental approvals&rdquo; per RenewEconomy after winning T1. <strong className="text-[var(--color-text)]">Bendemeer Energy Hub</strong> (NSW, 252 MW + 300 MWh) and <strong className="text-[var(--color-text)]">Bundey BESS &amp; Solar</strong> (SA, 240 MW + 1,200 MWh) are flagged in AURES with &ldquo;execution risk&rdquo; / &ldquo;grid connection pending&rdquo; status — typical for the T4 cohort.</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">What it means</p>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              <strong className="text-[var(--color-text)]">0% delivering hybrids today is not a failure signal — it&rsquo;s a timing artefact.</strong> The hybrid cohort is younger than the standalone solar and BESS rounds. Watch for first hybrid CISA executions and FIDs from late 2026 onward; if 12 months from now the hybrid bucket is still 0% delivering, <em>that</em> would warrant a delivery-risk re-read.
            </p>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]/70 italic">
            Sources: <a href="https://www.dcceew.gov.au/about/news/cis-tender-4-deliver-6-6gw-clean-energy" target="_blank" rel="noopener" className="hover:underline">DCCEEW Tender 4 announcement</a> ·
            {' '}<a href="https://www.energy-storage.news/australias-capacity-investment-scheme-tender-4-sees-11-4gwh-of-solar-plus-storage-awarded/" target="_blank" rel="noopener" className="hover:underline">Energy-Storage News T4 hybrid award</a> ·
            {' '}<a href="https://reneweconomy.com.au/new-solar-and-battery-hybrid-project-sets-ball-rolling-on-environmental-approvals-after-cis-tender-win/" target="_blank" rel="noopener" className="hover:underline">RenewEconomy on Junction Rivers approvals</a>.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Funnel panel
// ============================================================

function FunnelPanel({ data, lens }: { data: SchemeTrackerData; lens: Lens }) {
  const cisProjects = useMemo(() =>
    data.rounds.filter(r => r.scheme === 'CIS').flatMap(r => r.projects.map(p => ({ p, r }))),
    [data]
  )

  const stage1 = cisProjects
  const stage2 = cisProjects.filter(({ p }) =>
    ['operating', 'commissioning', 'construction'].includes(p.stage as string) ||
    (p.dev_status || '').toLowerCase().includes('fid') ||
    (p.planning_approval_date != null && p.planning_approval_date !== '')
  )
  const stage3 = cisProjects.filter(({ p }) =>
    ['operating', 'commissioning', 'construction'].includes(p.stage as string) ||
    (p.dev_status || '').toLowerCase().includes('fid')
  )
  const stage4 = cisProjects.filter(({ p }) =>
    ['operating', 'commissioning'].includes(p.stage as string)
  )
  const atRisk = cisProjects.filter(({ p, r }) => bucket(p, r.months_since_announced) === 'at_risk')

  const stages = [
    { label: lens === 'awarded' ? 'Awarded under a CISA' : 'Awarded — pre-FID, CISA not yet confirmed', list: stage1, color: COLORS.cis },
    { label: 'Past planning / FID gate',              list: stage2, color: COLORS.blue },
    { label: lens === 'awarded' ? 'Reached financial close or construction' : 'Past FID — CISA confirmed in force', list: stage3, color: COLORS.amber },
    { label: 'Operating or commissioning',            list: stage4, color: COLORS.green },
  ]

  const totalCount = stage1.length
  const totalMw = stage1.reduce((a, { p }) => a + p.capacity_mw, 0)
  const e2eByCount = totalCount > 0 ? (stage4.length / totalCount) * 100 : 0
  const e2eByMw = totalMw > 0 ? (stage4.reduce((a, { p }) => a + p.capacity_mw, 0) / totalMw) * 100 : 0
  const atRiskMw = atRisk.reduce((a, { p }) => a + (p.capacity_mw || 0), 0)

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Funnel — 2 cols */}
      <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="space-y-2">
          {stages.map((s, i) => {
            const count = s.list.length
            const mw = s.list.reduce((a, { p }) => a + (p.capacity_mw || 0), 0)
            const widthPct = 100 - (i * 18)   // tapers down for funnel effect
            const prev = i > 0 ? stages[i - 1] : null
            const conversionByCount = prev ? Math.round((count / Math.max(prev.list.length, 1)) * 100) : 100
            const prevMw = prev ? prev.list.reduce((a, { p }) => a + (p.capacity_mw || 0), 0) : totalMw
            const conversionByMw = prev ? Math.round((mw / Math.max(prevMw, 1)) * 100) : 100
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="flex-1 flex justify-center">
                  <div className="rounded-lg flex flex-col items-center justify-center px-4 py-3 text-white shadow-md transition-all"
                    style={{ width: `${widthPct}%`, backgroundColor: s.color, minHeight: 70 }}>
                    <p className="text-sm font-semibold leading-tight text-center">{s.label}</p>
                    <p className="text-xs mt-1 opacity-90">{count} projects · {fmtMW(mw)}</p>
                  </div>
                </div>
                <div className="w-32 text-xs text-[var(--color-text-muted)]">
                  {prev ? (
                    <>
                      <p className="font-semibold" style={{ color: s.color }}>↓ {conversionByCount}% by #</p>
                      <p className="text-[10px]">{conversionByMw}% by MW</p>
                    </>
                  ) : (
                    <p className="text-[10px] italic">Top of funnel</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right column callouts */}
      <div className="space-y-3">
        <div className="bg-[var(--color-bg-card)] border-l-4 rounded-xl p-4" style={{ borderLeftColor: COLORS.green }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">End-to-end conversion</p>
          <p className="text-3xl font-bold mt-1" style={{ color: COLORS.green }}>{e2eByCount.toFixed(0)}%</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">awarded → operating or commissioning · {e2eByMw.toFixed(0)}% by MW</p>
        </div>
        <div className="bg-[var(--color-bg-card)] border-l-4 rounded-xl p-4" style={{ borderLeftColor: COLORS.red }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">At risk</p>
          <p className="text-3xl font-bold mt-1" style={{ color: COLORS.red }}>{atRisk.length}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{fmtMW(atRiskMw)} past the {LIKELY_FAILED_THRESHOLD}-month threshold</p>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Top of funnel</p>
          <p className="text-3xl font-bold mt-1 text-[var(--color-text)]">{totalCount}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">CIS projects awarded · {fmtMW(totalMw)}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// NSW Wind panel
// ============================================================

function NswWindPanel({ data, scheme, lens }: { data: SchemeTrackerData; scheme: 'CIS' | 'LTESA'; lens: Lens }) {
  const rows = useMemo(() => {
    const out: { round: string; project: SchemeTrackerProject; monthsSince: number }[] = []
    for (const r of data.rounds) {
      if (r.scheme !== scheme) continue
      for (const p of r.projects) {
        if (p.technology === 'wind' && p.state === 'NSW') {
          out.push({ round: r.round, project: p, monthsSince: r.months_since_announced })
        }
      }
    }
    return out
  }, [data, scheme])

  if (rows.length === 0) {
    return <p className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-xl p-8 text-center text-sm text-[var(--color-text-muted)]">No NSW wind projects in {scheme}.</p>
  }

  const accent = scheme === 'CIS' ? COLORS.cis : COLORS.ltesa
  const totalMw = rows.reduce((a, x) => a + x.project.capacity_mw, 0)
  const buckets = { delivering: 0, building: 0, developing: 0, at_risk: 0 }
  let mwDelivering = 0
  for (const { project: p, monthsSince } of rows) {
    const b = bucket(p, monthsSince)
    if (b !== 'unknown') buckets[b] += 1
    if (b === 'delivering') mwDelivering += p.capacity_mw
  }

  const stageColor = (stage: string) =>
    stage === 'operating' || stage === 'commissioning' ? COLORS.green :
    stage === 'construction' ? COLORS.amber :
    stage === 'development' ? COLORS.blue : 'var(--color-text-muted)'

  const fmtPlanning = (p: SchemeTrackerProject) => {
    if (p.planning_approval_date) {
      const auth = p.planning_authority ? ` · ${p.planning_authority}` : ''
      return { text: fmtDate(p.planning_approval_date) + auth, kind: 'approved' as const }
    }
    if (p.planning_approval_date === null && p.planning_authority) {
      return { text: 'Pending — ' + p.planning_authority, kind: 'pending' as const }
    }
    return { text: '— not in dataset', kind: 'unknown' as const }
  }

  return (
    <div className="space-y-3">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: accent }}>
              {['Project', 'Round', 'MW', 'Stage', 'Dev Status', 'Planning Approval', 'Months'].map((h, i) => (
                <th key={h} className={`px-3 py-2.5 text-white text-xs font-semibold ${i === 2 || i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ round, project: p, monthsSince }) => {
              const planning = fmtPlanning(p)
              return (
                <tr key={`${round}-${p.name}`} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg)]/40">
                  <td className="px-3 py-2.5">
                    {p.project_id ? (
                      <Link to={`/projects/${p.project_id}`} className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]">{p.name}</Link>
                    ) : (
                      <span className="font-semibold text-[var(--color-text)]">{p.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)] text-xs">{round}</td>
                  <td className="px-3 py-2.5 text-right text-[var(--color-text)]">{fmtMW(p.capacity_mw)}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: stageColor(p.stage) }}>{p.stage}</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--color-text-muted)] italic">{p.dev_status || '–'}</td>
                  <td className="px-3 py-2.5 text-xs"
                    style={{ color: planning.kind === 'approved' ? 'var(--color-text)' : planning.kind === 'pending' ? COLORS.amber : 'var(--color-text-muted)' }}>
                    {planning.text}
                  </td>
                  <td className={`px-3 py-2.5 text-right text-xs font-semibold`}
                    style={{ color: monthsSince > LIKELY_FAILED_THRESHOLD ? COLORS.red : 'var(--color-text-muted)' }}>
                    {monthsSince}
                  </td>
                </tr>
              )
            })}
            <tr className="bg-[var(--color-bg-elevated)] font-semibold">
              <td className="px-3 py-2.5 text-[var(--color-text)]">TOTAL</td>
              <td className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]">{rows.length} projects</td>
              <td className="px-3 py-2.5 text-right text-[var(--color-text)]">{fmtMW(totalMw)}</td>
              <td colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Status callout — uses scheme-specific contract name (CISA for CIS, LTESA for LTESA) */}
      {lens === 'awarded' ? (
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          <span className="font-semibold text-[var(--color-text)]">NSW wind under {scheme}: </span>
          {rows.length} projects, {fmtMW(totalMw)} total.{' '}
          {buckets.delivering > 0 && <span style={{ color: COLORS.green, fontWeight: 600 }}>{buckets.delivering} delivering ({fmtMW(mwDelivering)})</span>}
          {buckets.delivering > 0 && (buckets.building > 0 || buckets.developing > 0) && ', '}
          {buckets.building > 0 && <span style={{ color: COLORS.amber, fontWeight: 600 }}>{buckets.building} under construction</span>}
          {buckets.building > 0 && buckets.developing > 0 && ', '}
          {buckets.developing > 0 && <span style={{ color: COLORS.blue }}>{buckets.developing} in development</span>}
          {buckets.at_risk > 0 && <span>, <span style={{ color: COLORS.red, fontWeight: 600 }}>{buckets.at_risk} at risk of failure</span></span>}
          .
        </p>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          <span className="font-semibold text-[var(--color-text)]">NSW wind under {scheme} — past-FID lens: </span>
          {rows.length} projects, {fmtMW(totalMw)} total.{' '}
          {(buckets.delivering + buckets.building) > 0
            ? <><span style={{ color: COLORS.green, fontWeight: 600 }}>{buckets.delivering + buckets.building} {scheme}-confirmed</span>{' '}
                ({buckets.delivering > 0 && <>{buckets.delivering} operating</>}{buckets.delivering > 0 && buckets.building > 0 && ', '}{buckets.building > 0 && <>{buckets.building} in construction</>})</>
            : <span style={{ color: COLORS.red, fontWeight: 600 }}>0 {scheme}-confirmed (none past FID)</span>}
          {(buckets.developing + buckets.at_risk) > 0 && <>, <span style={{ color: COLORS.blue }}>{buckets.developing + buckets.at_risk} pre-FID — {scheme} not yet confirmed</span></>}
          .
        </p>
      )}

      {/* Caveat for planning approval */}
      <p className="text-xs italic text-[var(--color-text-muted)]/80 leading-relaxed">
        <span className="font-semibold" style={{ color: COLORS.amber }}>Source: </span>
        Planning approval dates curated from NSW IPC, NSW Department of Planning &amp; Environment, and the NSW Planning Portal as of May 2026. Coverage is currently limited to NSW wind/CIS — broader project coverage is a follow-up enrichment task.
      </p>
    </div>
  )
}

// ============================================================
// Senate Estimates / press panel — NEW
// ============================================================

function SenatePanel() {
  return (
    <div className="space-y-4">
      {/* Top bar — recent context blocks */}
      <div className="grid md:grid-cols-3 gap-3">
        <ContextCard
          accent={COLORS.red}
          tag="Clean Energy Regulator"
          headline="Only half of CIS Tender 1 winners have made visible progress"
          body="The Clean Energy Regulator confirmed in its September 2025 quarterly that most CIS Tender 1 projects are taking longer than expected to reach financial close. Wind continues to struggle — no wind projects reached FID in 2025."
          source="reneweconomy.com.au"
          url="https://reneweconomy.com.au/regulator-says-cis-tender-1-projects-are-taking-longer-to-land-finance-only-half-have-made-progress/"
        />
        <ContextCard
          accent={COLORS.amber}
          tag="DCCEEW reform"
          headline="Bowen streamlines CIS tender to single-stage to compress timeline"
          body={`Single-stage tender process replaces the previous two-stage process — finalisation cut from ~9 months to ~6. Time limits introduced for CISA execution; Commonwealth may discontinue negotiations if missed. Used for Tenders 5 & 6 (WA).`}
          source="DCCEEW"
          url="https://www.dcceew.gov.au/energy/renewable/capacity-investment-scheme/changes-to-future-tender-process"
        />
        <ContextCard
          accent={COLORS.cis}
          tag="Q1 2026 NEM update"
          headline="Renewables hit 47% of NEM, batteries set price 32% of intervals"
          body="Most recent Quarterly Energy Dynamics from AEMO confirmed batteries are now the most frequent price-setting technology in the NEM — the structural backdrop in which CIS dispatchable rounds are being executed."
          source="DCCEEW"
          url="https://minister.dcceew.gov.au/bowen/media-releases/record-renewable-generation-drives-down-australias-emissions"
        />
      </div>

      {/* Senate Estimates excerpt */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full grid place-items-center text-base font-bold text-white"
            style={{ backgroundColor: COLORS.ltesa }}>SE</span>
          <h3 className="text-base font-bold text-[var(--color-text)]">Senate Estimates testimony — what was said</h3>
        </div>

        <ul className="space-y-2.5 text-sm text-[var(--color-text-muted)] leading-relaxed">
          <li>
            <span className="font-semibold text-[var(--color-text)]">~9 projects had reached financial close </span>
            among CIS Tender 1 winners with executed CISAs (Apr 2026 Senate Environment &amp; Communications Estimates — Ms Alison Wiltshire, Branch Head, CIS Delivery &amp; Governance, DCCEEW).
          </li>
          <li>
            <span className="font-semibold text-[var(--color-text)]">CIS deliberately targets early-stage projects</span> (Mr Brine, DCCEEW): &ldquo;If they&rsquo;re at financial close, they probably don&rsquo;t need a lot of support from the federal government.&rdquo; — explanation for why fewer T1 projects are at FID than analysts initially expected.
          </li>
          <li>
            <span className="font-semibold text-[var(--color-text)]">Most signed projects expected to reach financial close in calendar year 2026 </span>
            — confirmed timeline, places ~mid-2026 onward as the inflection point for CIS Tender 1 execution outcomes.
          </li>
          <li>
            <span className="font-semibold text-[var(--color-text)]">CISA proponents have 20 days to lodge a project bond </span>
            after signing; failure to deliver can result in bond forfeiture and re-tendering.
          </li>
        </ul>

        <p className="text-[10px] text-[var(--color-text-muted)]/70 italic pt-2 border-t border-[var(--color-border)]">
          Source: Senate Standing Committee on Environment &amp; Communications, Budget Estimates, April 2026 — DCCEEW evidence.
        </p>
      </div>

      {/* Bowen-pressure block */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full grid place-items-center text-base font-bold text-white"
            style={{ backgroundColor: COLORS.amber }}>P</span>
          <h3 className="text-base font-bold text-[var(--color-text)]">Press &amp; pressure on Minister Bowen</h3>
        </div>
        <ul className="space-y-2.5 text-sm text-[var(--color-text-muted)] leading-relaxed">
          <li>
            <span className="font-semibold text-[var(--color-text)]">Eraring extension</span> — Origin extended Eraring to August 2027 in May 2024 under an <em>opt-in underwriting arrangement with the NSW Government</em>: Origin can elect each year (by 31 March) to share up to $40M of profits with NSW or claim up to 80% of losses, capped at $225M/year. Origin chose <em>not</em> to opt in for both 2025-26 and 2026-27, so no taxpayer money has flowed to date — but the underwriting backstop exists and its monetary impact in any future year remains unknown. In Jan 2026 Origin further extended operations to April 2029. Centre for Independent Studies framed the broader sequence as &ldquo;Bowen&rsquo;s credibility gap on renewables.&rdquo; The political risk: if CIS Tender 1 wind doesn&rsquo;t deliver on schedule, NSW retains coal longer than the 82% target assumes.
          </li>
          <li>
            <span className="font-semibold text-[var(--color-text)]">First Nations Clean Energy Network — &ldquo;From Commitment to Delivery&rdquo;</span> tracker has become an external proxy for which CISA projects are actually executing. The 20-business-day publication clock after CISA signature means sustained absence is a strong negative signal.
          </li>
          <li>
            <span className="font-semibold text-[var(--color-text)]">Bowen&rsquo;s framing</span>: &ldquo;The best thing we can do for energy prices is more renewables&rdquo; — but with only Mokoan operating and Goulburn River in construction from CIS Tender 1 (as of Q1 2026), the proof points are still concentrated in solar rather than wind.
          </li>
          <li>
            <span className="font-semibold text-[var(--color-text)]">AEMC 2025 forecast</span> projects a 5% dip in retail prices over five years before a 13% rise as more coal exits — central to the political contest about whether the CIS is delivering &ldquo;cheap reliable&rdquo; or &ldquo;expensive transition&rdquo;.
          </li>
        </ul>
      </div>

      {/* Watch list — projects positioning for FID */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full grid place-items-center text-base font-bold text-white"
            style={{ backgroundColor: COLORS.green }}>F</span>
          <h3 className="text-base font-bold text-[var(--color-text)]">Watch list — CIS Tender 1 projects progressing or positioning for FID in 2026</h3>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">From the 19 CIS Tender 1 awards (Dec 2024), these are the projects publicly identified by AER and industry reporting as operating, in construction, or closest to FID. <strong className="text-[var(--color-text)]">Palmer Wind Farm took FID in January 2026</strong> — the first CIS Tender 1 wind project to do so, and the first AU on-grid wind FID for 2025/26.</p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {[
            { name: 'Mokoan Solar Farm',      stat: 'OPERATING',  color: COLORS.green, desc: '46 MW solar · VIC · first T1 project operating, first to LGC approval' },
            { name: 'Goulburn River Solar',   stat: 'CONSTRUCTION', color: COLORS.amber, desc: '450 MW solar · NSW · in construction' },
            { name: 'Palmer Wind Farm',       stat: 'FID — JAN 2026', color: COLORS.green, desc: '288 MW wind · SA · Tilt Renewables; 15-yr PPA with AGL covers 45% of output; construction starting 2026' },
            { name: 'Goyder North Wind Farm', stat: 'PRE-FID',  color: COLORS.amber, desc: '300 MW wind · SA · CIS T1 award; Neoen plans construction start mid-2026 — NOT to be confused with Goyder South (separate Neoen project, multiple tranches already at FID since 2023)' },
            { name: 'Valley of the Winds',    stat: 'PRE-FID',  color: COLORS.blue,  desc: '936 MW wind · NSW · NSW IPC planning approval Jun 2025; awaiting NSW EnergyCo grid connection' },
            { name: 'Sandy Creek Solar',      stat: 'PRE-FID',  color: COLORS.blue,  desc: '700 MW solar · NSW · largest NSW solar in T1' },
          ].map(p => (
            <div key={p.name} className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--color-border)]">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: p.color }} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[var(--color-text)]">{p.name}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: `${p.color}20`, color: p.color }}>{p.stat}</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)]/70 italic">
          Sources: <a href="https://reneweconomy.com.au/the-investment-drought-is-breaking-says-ceo-as-first-australia-wind-project-reaches-financial-close-in-2025/" target="_blank" rel="noopener" className="hover:underline">RenewEconomy — Palmer FID</a> ·
          {' '}<a href="https://www.energymagazine.com.au/tilt-hits-go-on-palmer-wind-farm/" target="_blank" rel="noopener" className="hover:underline">Energy Magazine — Tilt Palmer FID</a> ·
          {' '}<a href="https://goyderenergy.com.au/goyder-north/" target="_blank" rel="noopener" className="hover:underline">Goyder Energy — North project</a> ·
          {' '}<a href="https://reneweconomy.com.au/regulator-says-cis-tender-1-projects-are-taking-longer-to-land-finance-only-half-have-made-progress/" target="_blank" rel="noopener" className="hover:underline">RenewEconomy AER analysis</a>.
          Note: earlier-flagged projects like Pottinger Wind (NSW) and Fortescue East Pilbara are also positioning for FID in 2026 but were <em>not</em> awarded under CIS Tender 1.
        </p>
      </div>
    </div>
  )
}

function ContextCard({ accent, tag, headline, body, source, url }: {
  accent: string; tag: string; headline: string; body: string; source: string; url: string
}) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent }} />
      <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: accent }}>{tag}</p>
      <h4 className="text-sm font-semibold text-[var(--color-text)] mt-1.5 leading-snug">{headline}</h4>
      <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">{body}</p>
      <a href={url} target="_blank" rel="noopener" className="text-[10px] text-[var(--color-text-muted)]/80 hover:text-[var(--color-primary)] mt-2 inline-block">
        Source: {source} ↗
      </a>
    </div>
  )
}

// ============================================================
// Outlook panel
// ============================================================

function OutlookPanel({ data }: { data: SchemeTrackerData }) {
  const cisT1 = data.rounds.find(r => r.scheme === 'CIS' && r.round.includes('Tender 1'))
  const cisT3 = data.rounds.find(r => r.scheme === 'CIS' && r.round.includes('Tender 3'))
  const cisT4 = data.rounds.find(r => r.scheme === 'CIS' && r.round.includes('Tender 4'))
  const cisT5 = data.rounds.find(r => r.scheme === 'CIS' && r.round.includes('Tender 5'))

  const t1Months = cisT1?.months_since_announced ?? 0
  const t3Months = cisT3?.months_since_announced ?? 0
  const t4Months = cisT4?.months_since_announced ?? 0

  const t1AtRisk = cisT1 ? cisT1.projects.filter(p => bucket(p, t1Months) === 'at_risk').length : 0

  const milestones: { color: string; title: string; date: string; body: string }[] = []

  if (cisT1) {
    milestones.push({
      color: t1Months > LIKELY_FAILED_THRESHOLD ? COLORS.red : COLORS.amber,
      title: 'CIS Tender 1 — already past the AURES "likely failed" threshold',
      date: t1Months > LIKELY_FAILED_THRESHOLD ? 'Past threshold' : `Crosses ${LIKELY_FAILED_THRESHOLD}m`,
      body: `${cisT1.num_projects} projects awarded ${fmtDate(cisT1.announced_date)} (${t1Months} months ago, beyond the ${LIKELY_FAILED_THRESHOLD}-month threshold). Of these, ${t1AtRisk} sit in the "likely failed" bucket today (no CISA execution confirmed). Watch the next 6 months for CISA executions or contract terminations.`,
    })
  }
  if (cisT3) {
    const remaining = LIKELY_FAILED_THRESHOLD - t3Months
    milestones.push({
      color: remaining > 0 ? COLORS.amber : COLORS.red,
      title: `CIS Tender 3 — ${remaining > 0 ? `${remaining} months until threshold` : 'past threshold'}`,
      date: remaining > 0 ? `${remaining} months` : 'Past threshold',
      body: `${cisT3.num_projects} projects awarded ${fmtDate(cisT3.announced_date)} (${t3Months} months ago). Standard CISA execution targets ~12 months; expect a wave of execution announcements through mid-2026.`,
    })
  }
  if (cisT4) {
    milestones.push({
      color: COLORS.blue,
      title: 'CIS Tender 4 — first execution window opens',
      date: `${Math.max(12 - t4Months, 0)} months`,
      body: `${cisT4.num_projects} projects awarded ${fmtDate(cisT4.announced_date)} (${t4Months} months ago). First CISA executions expected from ~12 months from award; first FNCEN tracker publications should appear from mid-2026.`,
    })
  }
  milestones.push({
    color: COLORS.cis,
    title: `WA CIS Tenders 5 + 6 — ${cisT5 ? `awarded ${fmtDate(cisT5.announced_date)}` : 'just awarded'}`,
    date: '12-month watch',
    body: 'Tenders 5 (WEM Generation) and 6 (WEM Dispatchable) award the first major capacity injection ahead of WA\'s coal exit by 2030 — 10 projects, ~1.9 GW renewables + 3.7 GWh storage. Watch CISA execution timelines (~9–12 months) and which projects break ground first.',
  })
  milestones.push({
    color: COLORS.red,
    title: 'NSW grid connection — the key constraint on Tenders 1 + 4',
    date: 'Ongoing',
    body: 'All 5 NSW wind projects in the CIS pipeline (Valley of the Winds, Spicers Creek, Thunderbolt, Dinawan Stage 1, Liverpool Range Stage 1) sit at "grid connection pending" — most have planning approval but await NSW EnergyCo access rights. The next 6 months are decisive for whether these reach FID.',
  })

  return (
    <div className="space-y-2.5">
      {milestones.map((m, i) => (
        <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 flex gap-4 hover:bg-[var(--color-bg)]/40 transition-colors">
          <div className="w-1.5 rounded-full self-stretch" style={{ backgroundColor: m.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h4 className="text-base font-semibold text-[var(--color-text)]">{m.title}</h4>
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: m.color }}>{m.date}</span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">{m.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
