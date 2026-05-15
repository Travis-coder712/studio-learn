/**
 * Valuing Renewable Projects — Top-Quartile Analysis — AURES Learning Module
 *
 * 14-lesson framework for assessing the quality of a renewable energy
 * project — operational or in-development — against fundamentals, leading
 * to a top-quartile score per technology cohort.
 *
 * Part A (lessons 1-6, v2.95.0): operational valuation
 *   1. The asset-manager's job — why operational valuation is distinct
 *   2. What data you actually need (Australian context)
 *   3. Operational metrics that matter — by technology
 *   4. Peer comparison — defining "top quartile" for operating assets
 *   5. Forward valuation from operational data
 *   6. Presenting it — boardroom-ready outputs
 *
 * Part B (lessons 7-12, v2.96.0): development-stage valuation
 * Part C (lessons 13-14, v2.97.0): scoring framework + interactive tool
 */
import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-valuing-projects-progress'

function loadProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

function saveProgress(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

// ============================================================
// Lesson metadata
// ============================================================

interface LessonMeta {
  id: string
  number: number
  title: string
  subtitle: string
  readingTime: string
  built: boolean
}

const LESSONS: LessonMeta[] = [
  // Part A — Operational valuation (v2.95.0)
  { id: 'asset-manager-job',  number: 1, title: "The asset-manager's job — why operational valuation is distinct", subtitle: 'Lifecycle stages, use cases, and how operational valuation differs from development', readingTime: '11 min', built: true },
  { id: 'data-layer',         number: 2, title: 'What data you actually need (Australian context)',                 subtitle: 'AEMO MMSDM, OpenElectricity, AER, ASIC, NEM Connection Register — what is reliable, what is gappy', readingTime: '13 min', built: true },
  { id: 'metrics-by-tech',    number: 3, title: 'Operational metrics that matter — by technology',                  subtitle: 'Wind, solar, BESS, hybrid — the metric stack for each',                                           readingTime: '14 min', built: true },
  { id: 'peer-comparison',    number: 4, title: 'Peer comparison — defining "top quartile" for operating assets',   subtitle: 'Cohort construction, vintage adjustment, deserves-vs-achieves',                                  readingTime: '12 min', built: true },
  { id: 'forward-valuation',  number: 5, title: 'Forward valuation from operational data',                          subtitle: 'Capture-price trajectory, MLF degradation, value-factor convergence, the discount rate',         readingTime: '13 min', built: true },
  { id: 'presenting',         number: 6, title: 'Presenting it — boardroom-ready outputs',                          subtitle: 'Scorecards, pros/cons, peer comparison, the AURES Wind Value Analysis as worked example',        readingTime: '11 min', built: true },
  // Part B — Development valuation (v2.96.0)
  { id: 'dev-stages',         number: 7, title: 'Stages of a renewable project — typical $/MW step-ups',            subtitle: 'From land-tied-up through FID to COD — value at each milestone',                                  readingTime: '12 min', built: true },
  { id: 'fundamentals',       number: 8, title: 'The five fundamental categories that drive value',                 subtitle: 'Resource, connection, offtake, developer, constructability + community',                          readingTime: '11 min', built: true },
  { id: 'resource-quality',   number: 9, title: 'Resource quality — the foundational fundamental',                  subtitle: 'Wind/solar/BESS — what data exists, what you must estimate',                                      readingTime: '13 min', built: true },
  { id: 'connection',        number: 10, title: 'Connection quality — the value-killer category',                   subtitle: 'MLF history, future-congestion, DNSP vs TNSP, curtailment — interactive tool',                  readingTime: '15 min', built: true },
  { id: 'other-fundamentals', number: 11, title: 'Constructability, community, offtake, developer',                  subtitle: 'The four softer categories — how to weight them with limited data',                              readingTime: '12 min', built: true },
  { id: 'scoring-framework', number: 12, title: 'The scoring framework — weights, anchors, quartile output',         subtitle: 'The unified 25/25/20/15/15 rubric',                                                              readingTime: '11 min', built: true },
  // Part C — Synthesis (v2.97.0)
  { id: 'interactive-tool',  number: 13, title: 'The interactive valuation tool',                                    subtitle: 'Apply the framework to any operational or development project',                                  readingTime: '12 min', built: true },
  { id: 'future-shifts',     number: 14, title: 'How this changes — ESEM, 24/7 CFE, data centre surge',              subtitle: 'Forward-looking adjustments to the framework',                                                    readingTime: '11 min', built: true },
]

// ============================================================
// Shared UI primitives
// ============================================================

function Callout({ type, children }: { type: 'info' | 'warn' | 'key' | 'numbers' | 'source'; children: React.ReactNode }) {
  const styles = {
    info:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    label: 'Note' },
    warn:    { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   label: 'Important' },
    key:     { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Key Concept' },
    numbers: { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  label: 'Worked example' },
    source:  { bg: 'bg-slate-800/40',   border: 'border-slate-600/40',   text: 'text-slate-300',   label: 'Sources' },
  }
  const s = styles[type]
  return (
    <div className={`${s.bg} border ${s.border} rounded-xl p-4 my-4`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${s.text} mb-2`}>{s.label}</p>
      <div className="text-sm text-[var(--color-text)] leading-relaxed">{children}</div>
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-[var(--color-text)] mt-8 mb-3 flex items-center gap-2">{children}</h2>
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-[var(--color-text)] mt-5 mb-2">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">{children}</p>
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--color-text)] font-semibold">{children}</span>
}

function Table({ headers, rows, emphasizeFirst = false }: { headers: string[]; rows: (string | React.ReactNode)[][]; emphasizeFirst?: boolean }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border border-[var(--color-border)] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[var(--color-bg-elevated)]">
            {headers.map((h, i) => (
              <th key={i} className="text-left p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]/30">
              {row.map((cell, j) => (
                <td key={j} className={`p-3 text-xs leading-relaxed ${emphasizeFirst && j === 0 ? 'text-[var(--color-text)] font-semibold' : 'text-[var(--color-text-muted)]'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Lesson 1 — The asset-manager's job
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>Why operational valuation is a distinct discipline</H2>
      <P>
        Valuing a renewable project that's already running is a fundamentally different exercise from
        valuing one that's still on paper. The development-stage analyst is forecasting from external
        proxies — wind atlas data, generic capacity factors, vendor curves. The operational analyst
        starts from the asset's own performance record. What it has actually generated, captured, and
        earned over months or years of operation. The question shifts from <Em>&ldquo;will this work?&rdquo;</Em>
        to <Em>&ldquo;how is it actually working, and is that better or worse than peers?&rdquo;</Em>
      </P>
      <P>
        That data advantage is also a data trap. Operational data ages — a wind farm that captured
        $85/MWh in 2022 may capture $45/MWh in 2026 because the region around it has filled with
        cannibalising solar. The metrics that mattered most at FID may not be the metrics that matter
        most at refinance.
      </P>

      <H2>The lifecycle — five stages of operational life</H2>
      <Table
        emphasizeFirst
        headers={['Stage', 'Years post-COD', 'What changes', 'Valuation question']}
        rows={[
          ['Commissioning', '0 – 1', 'Partial capacity online, ramp-up disclosures, first MLF settlement', 'Are we hitting nameplate? Any defect or vendor-warranty trigger?'],
          ['Ramp / proving', '1 – 3', 'First full operating year(s); P50/P90 vs actual; first refinancing window', 'Does the resource match the development-stage forecast?'],
          ['Steady-state', '3 – 10', 'Stable CF, stable MLF, full revenue stack visible', 'Is this still top-quartile vs the as-built peer cohort?'],
          ['Mid-life', '10 – 17', 'Capture price compression bites; major overhaul (turbine retrofit, inverter replacement); refinancing window 2', 'What is the remaining-life NPV — and does that justify the capex of mid-life upgrades?'],
          ['End-of-life', '17 – 25+', 'Repowering decision; decommissioning bond execution; planning re-approvals', 'Sell, repower, or decommission?'],
        ]}
      />
      <Callout type="info">
        BESS lifecycle is compressed: design life ~15 years, degradation steepest in years 8–12,
        end-of-life often by year 14 (vs wind/solar 25–30). The "mid-life" stage for BESS arrives
        around year 7-9. Hybrid projects effectively run two lifecycles in parallel — the solar/wind
        component ageing slowly, the BESS component ageing faster.
      </Callout>

      <H2>Why the question is asked — five real use cases</H2>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Refinancing.</Em> The original project debt (mini-perm, 5–7 years) is being rolled.
          The new lender needs a current view of CF, capture price, MLF trajectory, and forward
          revenue. The valuation is the input to the DSCR sizing for the refinanced debt.</li>
        <li><Em>M&A — secondary asset sale.</Em> Tilt selling Snowtown to Powerlink; Genex selling
          Kidston Stage 1 to Macquarie. The buyer's diligence is operational valuation. The seller's
          asking price is operational valuation. The gap is where the deal is.</li>
        <li><Em>Portfolio rebalancing.</Em> A super fund holding 12 operating wind/solar assets
          decides annually which to keep, which to sell. The rank order is operational valuation.</li>
        <li><Em>Dividend recapture.</Em> The sponsor refinances debt upward — releasing equity that
          was tied up at FID. The valuation determines the size of the recap.</li>
        <li><Em>Insurance — business interruption claims.</Em> When a wind farm is offline for a
          cyclone event, the BI insurer pays out the lost revenue. That payout is operational
          valuation applied to a hypothetical operating period.</li>
      </ul>

      <H2>How operational valuation differs from development</H2>
      <Table
        emphasizeFirst
        headers={['Dimension', 'Development valuation', 'Operational valuation']}
        rows={[
          ['Primary data', 'Wind atlas, GHI maps, vendor curves, generic CF', 'AEMO half-hourly dispatch, real capture, registered MLF'],
          ['Confidence', 'Wide P50/P90 bands; risk-adjusted', 'Empirical; tight bands on past data, wider on future'],
          ['Time horizon', 'Forecast 25-year cash flow', 'Forecast remaining 15-25-year cash flow + look-back'],
          ['Key risks', 'Construction, planning, connection', 'Capture price erosion, MLF degradation, ageing equipment'],
          ['Discount rate', 'Higher (typically 8–10% real for renewable PF)', 'Lower (5–7% real once construction risk eliminated)'],
          ['Peer comparison', 'Often impossible — bespoke project', 'Required — every operational asset has peers'],
          ['Optionality', 'Significant — design changes still possible', 'Limited — asset is committed'],
        ]}
      />

      <H2>The mid-life pivot — when valuation gets interesting</H2>
      <P>
        Most operational valuation is straightforward in stages 1–3. The asset is performing roughly
        as expected; the metrics confirm or deny the original investment thesis. The hard valuation
        work starts at mid-life, when three things converge: the original PPA expiring or
        re-pricing, capture-price compression eroding merchant revenue, and the asset needing
        capital expenditure (turbine blades, inverter replacements, BESS augmentation). The mid-life
        question is whether the project's <Em>remaining</Em> economics justify the upgrade capex —
        or whether it's better to repower (replace) or run-to-failure.
      </P>
      <Callout type="key">
        Top-quartile at FID does not mean top-quartile at year 10. A NSW wind farm built in 2018
        with high CF and 0.95 value factor may have median CF and 0.72 value factor in 2026 as the
        REZ around it filled with same-shape generation. Operational valuation needs to look both
        backward (track record) and forward (peer-cohort dynamics) to avoid mis-pricing.
      </Callout>

      <H2>The AURES operational valuation framework</H2>
      <P>
        The remaining lessons in Part A build out the practical framework: what data you need
        (Lesson 2), what metrics matter per technology (Lesson 3), how to construct a peer cohort
        and define top-quartile (Lesson 4), how to project forward from operational data (Lesson 5),
        and how to present the result in a way that survives boardroom scrutiny (Lesson 6). Part B
        then extends the same framework to development-stage projects, where the data is thinner
        but the underlying fundamentals categories are identical.
      </P>

      <Callout type="source">
        Sources: AGL, Origin, Tilt Renewables annual reports · CEFC investment principles ·
        Norton Rose Fulbright <em>Renewable asset M&A</em> 2024 · Allens <em>Refinancing renewable
        debt</em> · BloombergNEF <em>Australia Asset Valuation Models</em> · ASIC half-yearly
        financials for ASX-listed asset owners · AFR project finance coverage.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — What data you actually need
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>The Australian operational data layer — what's free, what's not</H2>
      <P>
        Australia has one of the world's better operational-data environments for renewable assets.
        Almost everything you need for a first-pass valuation is publicly available; only the
        sharpest forward-looking inputs (capture-price forecasts, asset-specific PPA terms) sit
        behind paywalls. The trick is knowing which dataset answers which question.
      </P>

      <H2>The five free public datasets that matter</H2>

      <H3>1. AEMO MMSDM — the foundational layer</H3>
      <P>
        The AEMO Market Management System Data Model is the underlying record of every dispatch
        interval in the NEM. Key tables for operational valuation:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>DISPATCH_UNIT_SCADA</Em> — 5-minute generation by DUID</li>
        <li><Em>DISPATCHPRICE</Em> — 5-minute RRP by region</li>
        <li><Em>DISPATCHLOAD</Em> — 5-minute output target + availability per DUID</li>
        <li><Em>NETWORK_LOSS_FACTORS</Em> — annual MLF and DLF per DUID</li>
        <li><Em>DUDETAILSUMMARY</Em> — DUID metadata (region, fuel type, registered capacity)</li>
        <li><Em>DISPATCHCONSTRAINT</Em> — every constraint equation that bound dispatch</li>
      </ul>
      <P>
        Access patterns: bulk CSV via AEMO's monthly archives, or programmatically via NEMOSIS
        (Python). AURES uses both — half-hourly aggregations are stored in the AURES DB and surfaced
        via the per-project Performance and Value Analysis pages.
      </P>

      <H3>2. OpenElectricity API — the developer-friendly front-end</H3>
      <P>
        OpenElectricity ingests AEMO data and exposes it via a clean REST API. The free tier
        provides 367 days of look-back, ~500 calls/day, with the response format already
        aggregated to hourly and daily resolution. Key endpoints:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>/facilities/</Em> — facility list with unit codes, fuel tech, registered capacity</li>
        <li><Em>/data/facilities/NEM</Em> — facility-level dispatch metrics by metric and interval</li>
        <li><Em>/data/network/NEM</Em> — network-level dispatch summaries</li>
      </ul>
      <P>
        AURES uses OpenElectricity for the hourly_shape data behind the Wind Value Analysis &gt;
        Daily Shape tab. The same API can feed solar diurnal curves and BESS dispatch profiles.
      </P>

      <H3>3. AER quarterly performance reports</H3>
      <P>
        The Australian Energy Regulator publishes a quarterly <Em>Wholesale Markets Performance
        Report</Em> with operational data on every utility-scale plant — CF, dispatched energy,
        revenue-equivalent metrics, and (since 2024) curtailment statistics. The reports also
        include cohort-level statistics (state averages, technology averages) useful for peer
        comparison.
      </P>

      <H3>4. ASIC half-yearly financials (ASX-listed asset owners)</H3>
      <P>
        Project-level financials are commercially sensitive, but where the asset sits inside a
        listed entity (AGL, Origin, Tilt, Genex, Mercury, ContactEnergy NZ, NEXTGEN, Akaysha
        backed by BlackRock with ASX-listed parent disclosures), the half-yearly accounts often
        disclose:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Revenue and EBITDA per asset segment</li>
        <li>Capex on operational assets (vs growth capex)</li>
        <li>Refinancing transactions and the implied valuation</li>
        <li>Mark-to-market changes on PPA derivatives (AASB 9)</li>
      </ul>
      <P>
        Asset-level granularity varies — Tilt and Genex disclose per-project; AGL discloses by
        portfolio bucket. The signal is consistent enough to triangulate operational valuation.
      </P>

      <H3>5. NEM Connection Register + AEMO Generation Information</H3>
      <P>
        Connection-side data:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>NEM Connection Register</Em> — every DUID with its connection point (TNI), TNSP,
          status (operating / connecting / withdrawn)</li>
        <li><Em>AEMO Generation Information</Em> — the monthly snapshot of registered capacity,
          status, and project owners — feeds the AURES Scheme Tracker</li>
      </ul>

      <H2>What private data adds — and whether you need it</H2>
      <Table
        emphasizeFirst
        headers={['Source', 'What it adds', 'Subscription cost', 'When you need it']}
        rows={[
          ['Wood Mackenzie / Aurora Energy Research', 'Forward capture-price forecasts, cannibalisation curves', '$50-150k/yr', 'For refinancing or M&A diligence beyond ~3 years forward'],
          ['BloombergNEF Australia ETO', 'Asset valuations, deal benchmarks, LCOE trajectories', '$30-80k/yr', 'For market-wide context, not asset-specific'],
          ['Inframation Group / IJ Global', 'Deal data, secondary-sale prices, refinancing terms', '$25-50k/yr', 'For M&A pricing or refinancing benchmarks'],
          ['Cornwall Insight Australia', 'Capture-price index, value-factor forecasts', '$20-40k/yr', 'Lower-cost alternative to Aurora; less granular'],
          ['Modo Energy Australia', 'BESS-focused — FCAS revenue stacks, arbitrage benchmarks', '$15-30k/yr', 'For BESS-heavy portfolios specifically'],
        ]}
      />
      <Callout type="info">
        For first-pass operational valuation of any single asset, the public data is sufficient. The
        private subscriptions become necessary when you need to defend a forward forecast in a
        diligence room or refinancing memorandum where the counterparty also has them.
      </Callout>

      <H2>What AURES has built on top — and where it stops</H2>
      <P>
        AURES Intelligence integrates the public data into per-project workflows:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Wind / Solar / BESS Value Analyses</Em> — multi-tab per-project pages with CF, capture
          price, value factor, MLF trend, curtailment indicators, peer ranking, daily shape, price
          band capture, and exportable PDF summaries.</li>
        <li><Em>Scheme Tracker</Em> — CIS / LTESA / VRET / ACT auction outcomes mapped to live
          project status.</li>
        <li><Em>Performance tab</Em> — for any operating project, year-on-year CF heatmap with
          partial-month scaling and commissioning toggle.</li>
        <li><Em>Curtailment & MLF Indicators</Em> — the Wind Value Analysis Trend tab surfaces
          basin-level MLF erosion and constraint-attributable curtailment hours.</li>
      </ul>
      <P>
        Where AURES doesn't yet have data:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Pre-2018 monthly performance data for older facilities (the AEMO MMSDM goes back
          further but ingestion is selective)</li>
        <li>FCAS revenue split by service (Reg vs Contingency vs Cap) — aggregate FCAS available,
          breakdown coming</li>
        <li>Curtailment forecasts at specific connection points — depends on AEMO load-flow
          modelling that isn't publicly published</li>
        <li>Community sentiment / social licence scoring</li>
      </ul>

      <Callout type="key">
        For operational valuation, AURES Intelligence + AEMO MMSDM + AER quarterlies is enough for
        80% of decisions. The remaining 20% needs Aurora / WoodMac forward curves and (for M&A)
        Inframation deal data. AURES is built to be the working-day layer, not the diligence-room
        layer — but the diligence-room outputs can be reconstructed from AURES base data and
        external forecasts.
      </Callout>

      <Callout type="source">
        Sources: AEMO MMSDM Data Model documentation · OpenElectricity API docs ·{' '}
        <a className="text-[var(--color-primary)] hover:underline" href="https://www.aer.gov.au" target="_blank" rel="noopener">AER Wholesale Markets Performance</a>{' '}·
        ASX-listed company half-yearly reports · NEMOSIS Python library ·
        AURES{' '}
        <Link to="/projects" className="text-[var(--color-primary)] hover:underline">Project pages</Link>
        {' '}and per-project Value Analyses.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — Operational metrics by technology
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>The metric stack — one for every technology</H2>
      <P>
        Each technology has its own panel of operational metrics. Some translate cleanly across
        technologies (capture price, MLF, availability); others are tech-specific (round-trip
        efficiency for BESS; performance ratio for solar; wind speed for wind). A good operational
        valuation looks at every metric the technology supports — gaps tell you where the data
        layer is incomplete, not that the metric doesn't matter.
      </P>

      <H2>Wind — the metric stack</H2>
      <Table
        emphasizeFirst
        headers={['Metric', 'Target range', 'What it tells you', 'Watch-outs']}
        rows={[
          ['Capacity Factor (annual)', '30-42% (NSW/VIC), 35-45% (TAS/SA)', 'Resource quality + operational uptime', 'Compare to project P50; ramp-up year can mislead'],
          ['Capacity Factor variance year-over-year', '±2-4pp typical', 'Volatility of revenue base', 'High variance increases financing margin'],
          ['Capture Price ($/MWh)', '$50-90 (NSW), $35-60 (VIC), $40-80 (SA)', 'Realised revenue per MWh dispatched', 'Falling capture price = cannibalisation arriving'],
          ['Value Factor (capture / pool)', '0.85-0.98', 'Time-of-generation alignment with pool prices', 'Sub-0.80 signals deep cannibalisation; rising VF unusual'],
          ['MLF (current vs registered)', 'Stable or improving', 'Network-side losses + intra-regional position', 'Falling MLF = REZ congestion; CISA doesn\'t cover'],
          ['Curtailment % (network)', '<5% typical, >10% concerning', 'Constraint-attributable lost output', 'Rising = REZ getting saturated'],
          ['Curtailment % (economic)', 'Project-dependent', 'Voluntary non-dispatch in negative prices', 'Reveals dispatch strategy'],
          ['Availability factor', '≥95%', '% of operational hours not under maintenance/fault', '<92% suggests turbine age or supplier issue'],
          ['FCAS revenue / MW', '$1-5k/yr typical', 'Ancillary revenue stack', 'Limited for wind; growing under fast-frequency reform'],
        ]}
      />
      <Callout type="numbers">
        <strong>Worked example — White Rock Wind Farm Stage 1.</strong> Operating data shows:
        CF ~32% (right at NSW state median), capture price ~$95/MWh (top quartile for 2025),
        value factor 0.94 (top decile), MLF 0.83 (declining from 0.92 at COD due to local
        congestion). The capture price advantage offsets the MLF erosion in P50 NPV terms —
        but the trend is what matters: extrapolating MLF decline, White Rock's effective
        $/MWh drops $3-5 per MWh per year of operation.
      </Callout>

      <H2>Solar — the metric stack</H2>
      <Table
        emphasizeFirst
        headers={['Metric', 'Target range', 'What it tells you', 'Watch-outs']}
        rows={[
          ['Capacity Factor (annual)', '22-28% (NSW/VIC), 25-32% (QLD/SA)', 'GHI quality + tracking + losses', 'Lower than wind but more predictable'],
          ['Performance Ratio (PR)', '78-85%', 'Actual / theoretical based on irradiance', 'Below 75% = soiling, inverter, or shading issue'],
          ['Degradation rate (% per yr)', '0.5-0.7% standard', 'Module power loss over time', '>1% = LID, PID, or supplier defect'],
          ['Soiling rate (% per yr)', '1-4% region-dependent', 'Dust accumulation losses', 'Higher in NW NSW, central QLD'],
          ['Capture Price ($/MWh)', '$25-50 (NSW), $20-40 (QLD)', 'Realised solar-hours revenue', 'Falling fastest of all techs due to cannibalisation'],
          ['Value Factor', '0.50-0.75', 'Time-of-generation = midday low-price hours', 'Below 0.55 means structural problem'],
          ['MLF', 'Stable or improving', 'As wind', 'Solar MLFs falling fastest in QLD'],
          ['Curtailment % (network + economic combined)', '5-15%', 'Combined for solar — economic dominates in negative-price hours', 'Rising at ~2pp per year in solar-heavy regions'],
          ['Inverter availability', '≥98%', 'Inverter is the lifecycle weak point', 'Falling toward 95% suggests overdue replacement'],
          ['Tracking system uptime (if applicable)', '≥99%', 'Single-axis tracker maintenance', 'Tracker downtime costs ~10% generation'],
        ]}
      />

      <H2>BESS — the metric stack</H2>
      <Table
        emphasizeFirst
        headers={['Metric', 'Target range', 'What it tells you', 'Watch-outs']}
        rows={[
          ['Round-trip efficiency (RTE)', '85-90% (Li-ion 2024-2026)', 'Energy in vs energy out across full cycle', '<82% signals battery degradation arriving'],
          ['Cycles per year', '250-365', 'How aggressively the BESS is being worked', '>365 = aggressive bidding; <200 = under-utilised'],
          ['FCAS revenue / MW / yr', '$30-80k', 'Ancillary services market participation', 'Saturating in NSW/VIC; still strong in QLD/SA'],
          ['Energy arbitrage revenue / MW / yr', '$80-200k', 'Spread × cycles × MLF', 'The dominant revenue stream'],
          ['Capacity revenue (if CISA)', '$50-150k / MW / yr', 'Dispatchable CISA floor', 'Only for CIS-backed projects'],
          ['Availability factor', '≥97%', '% time available for dispatch', '<94% = control system or thermal issue'],
          ['Peak power held during scarcity events', '85-100% of nominal', 'How much MW the BESS can hold during 5/30/60 min events', '<80% = battery in degraded state or thermal de-rating'],
          ['SOC discipline (% time in operational band)', '85-95%', 'Battery managed sustainably between 15-90% SOC', '<80% suggests dispatch optimiser is over-stressing the asset'],
          ['Augmentation cadence', 'First augmentation year 7-9', 'When BESS capacity is topped up', 'Earlier than year 6 = unexpected degradation'],
        ]}
      />
      <Callout type="info">
        BESS metrics are evolving fastest. Modo Energy publishes Australian BESS revenue stacks
        weekly. The 2024-2026 split is roughly: 50-60% energy arbitrage, 20-30% FCAS, 10-15%
        capacity (CISA only), 0-5% reactive support / SRAS. Expect FCAS share to fall as more
        BESS comes online in NSW/VIC; capacity share to rise as ESEM firming contracts arrive.
      </Callout>

      <H2>Hybrid — blended metrics + revenue stack visibility</H2>
      <P>
        A hybrid's operational data must separate the generation component (solar/wind) from the
        storage component (BESS) — because the components age differently, generate revenue at
        different times, and have different peer cohorts. The key hybrid-specific metrics:
      </P>
      <Table
        emphasizeFirst
        headers={['Metric', 'Watch for', 'Why it matters']}
        rows={[
          ['Revenue stack split (energy gen / arbitrage / FCAS / PPA)', 'Stack should be 30-50% generation, 35-50% storage', 'A heavily generation-skewed stack means BESS is under-utilised'],
          ['BESS:Solar capacity ratio', 'Industry trending toward 0.3-0.5 MW BESS per MW solar', 'Lower = mostly solar with arbitrage upside; higher = firming product'],
          ['Co-curtailment behaviour', '% solar curtailment captured by BESS charging', 'Higher = better economic optimisation of free solar'],
          ['Combined value factor', 'Should be higher than solar-only', 'Hybrid effect lifts the blended value factor — quantify this'],
          ['Daily-shape post-firming', 'Evening export should be 30-50% of total', 'Confirms BESS is firming generation to higher-priced hours'],
        ]}
      />

      <Callout type="key">
        The metric stack tells you what the asset is doing. Peer comparison (Lesson 4) tells you
        whether it's doing it well. Always anchor metrics to a peer cohort — a 28% CF wind farm
        in NSW is poor; the same 28% CF wind farm in TAS is excellent. Absolute numbers without
        cohort context mislead.
      </Callout>

      <Callout type="source">
        Sources: AURES per-project Wind / Solar / BESS Value Analysis pages · AER quarterly
        Wholesale Markets Performance Reports · OpenElectricity public datasets · Modo Energy{' '}
        <em>Australia BESS Performance Reports</em> · CSIRO GenCost · DNV <em>Renewable Asset
        Performance Benchmarks</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — Peer comparison and top quartile
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>"Top quartile" only makes sense relative to a peer cohort</H2>
      <P>
        A 32% capacity factor is excellent for a NSW wind farm and mediocre for a TAS one. A $48/MWh
        capture price is brilliant for a 2025 solar farm and merely average for a 2018 vintage. The
        first job of operational valuation is constructing the right peer cohort — then the
        metrics within that cohort tell you where the asset sits.
      </P>

      <H2>Cohort construction — four axes</H2>
      <Table
        emphasizeFirst
        headers={['Axis', 'Why it matters', 'Practical rule']}
        rows={[
          ['Technology', 'CFs, capture prices, value factors differ structurally', 'Wind / Solar / BESS / Hybrid — never mix'],
          ['Region or REZ', 'MLF, capture, congestion, resource quality all region-locked', 'NEM region at minimum; REZ if available'],
          ['Vintage (COD year)', 'Newer assets benefit from technology improvements + lower cannibalisation history', 'Group within ±2 years'],
          ['Capacity bucket', 'Scale economies for BESS; constructability for wind', 'Bands: 50-150 MW, 150-300 MW, 300+ MW'],
        ]}
      />
      <P>
        A clean cohort: NSW wind farms, 2019-2021 COD, 150-300 MW. That's typically 5-9 projects in
        the AURES universe — enough for quartile statistics, small enough to be genuinely
        comparable. The 80 operating wind farms in the NEM split into ~8-12 such cohorts.
      </P>

      <H2>The vintage adjustment problem</H2>
      <P>
        Comparing a 2017 wind farm against a 2024 one is unfair to the 2017 vintage on multiple
        dimensions:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Newer turbines have higher hub heights → higher CF for the same resource</li>
        <li>Newer projects benefit from improved O&M practices → higher availability</li>
        <li>Newer projects entered service when capture prices were already cannibalised → their
          P50 was set lower, but they're achieving their P50 more reliably</li>
        <li>Older projects accumulated MLF erosion that newer projects haven't yet experienced</li>
      </ul>
      <P>
        Two ways to handle this:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Cohort by vintage</Em> — split 2017-2019 from 2020-2022 from 2023+ and rank within.
          Cleanest but reduces cohort size.</li>
        <li><Em>Adjusted metrics</Em> — normalise CF by hub height; normalise capture price by the
          year's regional median. Allows wider cohorts but introduces assumptions.</li>
      </ol>
      <P>
        AURES generally uses cohort-by-vintage at the per-project page, with the option to broaden
        the cohort manually. The Wind / Solar Value Analysis pages display state-cohort rankings by
        default, with vintage-adjusted views available.
      </P>

      <H2>Deserves vs achieves — the two-axis framework</H2>
      <P>
        Within a cohort, there are two related but distinct questions:
      </P>
      <Table
        emphasizeFirst
        headers={['Axis', 'Question', 'How to measure']}
        rows={[
          ['Deserves', 'Given the resource and location, what should this project be achieving?', 'Resource-adjusted CF (using nearby met masts or reanalysis); peer-cohort median'],
          ['Achieves', 'What is the project actually delivering?', 'Raw CF, capture price, value factor over the operational record'],
        ]}
      />
      <P>
        Plotting these on two axes gives four quadrants:
      </P>
      <Table
        emphasizeFirst
        headers={['Quadrant', 'Interpretation', 'Implication for valuation']}
        rows={[
          ['High deserves, high achieves', 'Excellent location AND excellent operations', 'True top quartile — valuation premium'],
          ['High deserves, low achieves', 'Excellent location, poor operations', 'Operations upside — pays for itself if management improves'],
          ['Low deserves, high achieves', 'Mediocre location, well-run', 'Limited upside; current performance unsustainable'],
          ['Low deserves, low achieves', 'Mediocre location, poorly run', 'Discount to cohort median; investigate viability'],
        ]}
      />
      <Callout type="key">
        Top quartile is best framed as <Em>top quartile in achieves AND top quartile in
        deserves</Em>. A project that's top quartile in achieves but only middle-cohort in
        deserves is at risk of regression — the operational outperformance may not be sustainable.
        The deserves axis is the structural ceiling.
      </Callout>

      <H2>The single-metric trap</H2>
      <P>
        Industry analysis often ranks operational projects by a single headline — usually CF or
        revenue per MW. This is misleading:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>A wind farm with high CF and low value factor is exporting heavily at low-price times
          — a high revenue-per-MW number masks the structural problem</li>
        <li>A solar farm with low CF but high capture price (because it sits in a less-cannibalised
          spot) may have better NPV than the high-CF peer</li>
        <li>A BESS with high cycles/year may be deploying capacity wastefully if cycle revenue is
          falling — high cycles do not mean high IRR</li>
      </ul>
      <P>
        A defensible top-quartile ranking uses a <Em>composite</Em> of at least three metrics,
        weighted to the relevant valuation question:
      </P>

      <Table
        emphasizeFirst
        headers={['Valuation question', 'Composite weighting (for wind, illustrative)']}
        rows={[
          ['Refinancing — stable cash flow', '40% CF stability + 30% capture price level + 30% value factor'],
          ['M&A — forward earnings', '30% capture price trajectory + 30% value factor + 25% MLF stability + 15% CF level'],
          ['Sale of operational asset', '35% revenue per MW + 25% capture price + 20% MLF + 20% CF'],
        ]}
      />

      <Callout type="numbers">
        <strong>Worked example — NSW 2019-2021 wind cohort ranking (illustrative).</strong>
        <br /><br />
        Cohort: 6 wind farms, 150-300 MW, 2019-2021 COD. Metrics over the 2024 calendar year:
        <br /><br />
        Project A: CF 33%, capture $92/MWh, VF 0.97, MLF 0.91 → composite top-quartile<br />
        Project B: CF 31%, capture $76/MWh, VF 0.86, MLF 0.86 → median<br />
        Project C: CF 35%, capture $58/MWh, VF 0.72, MLF 0.83 → bottom (despite high CF, structural cannibalisation)<br />
        Project D: CF 32%, capture $84/MWh, VF 0.91, MLF 0.94 → upper quartile<br />
        Project E: CF 28%, capture $89/MWh, VF 0.95, MLF 0.89 → median<br />
        Project F: CF 30%, capture $65/MWh, VF 0.80, MLF 0.87 → bottom<br />
        <br />
        Ranked by raw CF, Project C is best. Ranked by composite (with capture and VF weighted),
        Project A is best. The two rankings produce different M&A pricing.
      </Callout>

      <Callout type="source">
        Sources: AURES per-project pages and Peer Comparison tab · AEMO MMSDM ·{' '}
        OpenElectricity facility data · Modo Energy <em>Australia Asset Performance Benchmarks</em>{' '}
        · DNV <em>Wind Resource Assessment Benchmarks</em> · BloombergNEF asset valuation methodology.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — Forward valuation from operational data
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>From history to forecast — the projection layer</H2>
      <P>
        Operational data tells you what happened. Valuation needs to extend that into the future —
        15 to 25 years of remaining cash flow. Three structural questions shape every forward
        projection: capture price, MLF, and the discount rate. Each has well-trodden modelling
        conventions and well-known pitfalls.
      </P>

      <H2>Projecting capture price — three approaches</H2>

      <H3>1. Cohort median trajectory</H3>
      <P>
        The default for first-pass analysis. Take the project's current capture price as a delta
        to the cohort median, assume that delta persists, project the cohort median using AEMO ISP
        2024 step-change. This works well for projects with stable operational records and
        relatively low cannibalisation risk.
      </P>

      <H3>2. Value-factor convergence</H3>
      <P>
        High-value-factor projects (currently capturing premium prices) face structural pressure
        toward mean: as more same-shape generation enters their region, their value factor must
        fall. The convergence rate depends on local penetration. Wind in saturated REZs has
        converged 4-7 percentage points per year of operation. Solar has converged 8-12 pp/year
        in heavily-solar regions.
      </P>
      <P>
        A useful rule: a project currently at VF 0.95 with steeply rising local penetration will
        likely be at 0.85 in 3-5 years, 0.78 in 7-10 years. Below 0.78 the cannibalisation
        plateaus because economic curtailment kicks in.
      </P>

      <H3>3. Vendor capture-price forecasts</H3>
      <P>
        Aurora Energy Research, Wood Mackenzie, and Cornwall Insight publish region-specific
        capture-price forecasts by technology vintage. These are paywalled but defensible for
        diligence. They typically blend cohort statistics with bespoke load-flow modelling for the
        specific connection point.
      </P>

      <H2>Projecting MLF — the asymmetric risk</H2>
      <P>
        MLF erosion is one-directional: it falls more often than it rises. A wind or solar farm
        with current MLF of 0.92 might be at 0.85 in 5 years; rarely climbs back to 0.95. The
        forward modelling needs to bake this in.
      </P>
      <Table
        emphasizeFirst
        headers={['MLF trend pattern', 'Likely cause', 'Projection rule']}
        rows={[
          ['Stable (±1pp / yr)', 'Strong-grid site; minimal local additions', 'Hold flat'],
          ['Falling 1-3pp / yr', 'REZ filling with same-tech generation', 'Continue at half the historic rate for 5 years, then plateau'],
          ['Falling 3-7pp / yr', 'Heavily-saturated REZ', 'Project will reach floor (~0.75) in 3-5 years'],
          ['Rising', 'Network upgrade in progress; nearby project retiring', 'Verify the cause; sustainable improvement rare'],
        ]}
      />
      <Callout type="warn">
        Remember — the CISA does <em>not</em> cover MLF erosion. A project with 0.92 MLF
        decreasing to 0.83 over 8 years loses ~10% of revenue, and the CISA's floor make-up
        calculation (against RRP, not capture price) doesn't compensate. This is the largest single
        forward risk for many operational renewable projects in declining REZs.
      </Callout>

      <H2>The discount rate — what changes after construction</H2>
      <P>
        Pre-FID renewable projects typically discount at 8-10% real for equity. Once operating
        for 2-3 years with stable metrics, the same project can be discounted at 5-7% real because
        construction risk is gone, operational risk is empirically bounded, and revenue
        predictability is established. Three categories:
      </P>
      <Table
        emphasizeFirst
        headers={['Discount rate tier', 'Real % (2026)', 'Asset profile']}
        rows={[
          ['Premium operational', '4.5-5.5%', 'CISA / LTESA-backed; super fund equity; long-tenor PPA'],
          ['Standard operational', '5.5-6.5%', 'Merchant + corporate PPA; established sponsor'],
          ['Operational with risk', '7-9%', 'Heavily merchant; falling MLF; near end of original PPA'],
          ['Mid-life with capex', '8-11%', 'Major overhaul required (turbine, inverter, BESS augmentation)'],
        ]}
      />
      <P>
        The discount-rate compression on transition from construction-phase to operational-phase
        is one of the largest single drivers of equity value. A $100M project worth $40M as
        pre-FID equity is often worth $55-65M once operating for 24 months at expectation.
      </P>

      <H2>Refinancing economics</H2>
      <P>
        The 5-7 year mark is when most renewable project debt is refinanced. The original
        construction debt (mini-perm) was sized to a conservative downside; the refinanced debt
        is sized to demonstrated operational performance. Three outcomes:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Term-out refinance</Em> — same gearing, longer tenor, modestly lower coupon. The
          conservative choice; protects existing equity returns.</li>
        <li><Em>Cash-out refinance (recap)</Em> — raise gearing back to 75% on a demonstrated
          revenue base, releasing cash to equity sponsors. Typical recap distribution: $50-150M
          for a 200 MW operating renewable asset.</li>
        <li><Em>Hold-and-amortise</Em> — keep amortising the original debt to maturity. Rare for
          standalone projects, common for portfolio-financed assets where the lender treats the
          asset as one of many.</li>
      </ol>

      <H2>The terminal value question</H2>
      <P>
        At years 18-22 (depending on technology), forward valuation needs to model end-of-life
        options:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Repower</Em> — replace turbines with modern equipment, extend life 20+ years.
          Typical capex 60-70% of original; output uplift 30-50% from larger turbines.</li>
        <li><Em>Refurbish</Em> — replace blades, gearboxes; extend life 10-15 years. Capex 20-30%
          of original; modest output recovery.</li>
        <li><Em>Run-to-failure</Em> — minimise opex through year 25, decommission per bond.</li>
        <li><Em>Convert to hybrid</Em> — add BESS at existing connection; extends revenue runway
          and may justify keeping the generator into year 25+.</li>
      </ul>

      <Callout type="numbers">
        <strong>Worked example — NSW wind farm at year 10, considering refinancing.</strong>
        <br /><br />
        100 MW asset, 32% CF, $80/MWh blended (PPA + merchant). Current debt: $80M at 5.5% with
        7 years remaining amortisation. Operational EBITDA: $22M/yr. Forward 15-yr NPV at 6.5%
        real: ~$185M.
        <br /><br />
        <strong>Refinance options:</strong><br />
        Hold-and-amortise: equity dividend ~$13M/yr.<br />
        Term-out: refinance to 65% gearing (vs current ~55%), $100M debt at 5.0%, additional $20M
        released. Annual dividend rises to $14M.<br />
        Recap to 75%: $140M debt, $50M cash to equity. Dividend $11M/yr after higher service. The
        equity IRR rises from 9% to 12% on the recap path.
      </Callout>

      <Callout type="source">
        Sources: BloombergNEF asset valuation methodology · Macquarie infrastructure investor
        materials · Norton Rose Fulbright <em>Renewable refinancing practice notes</em> ·
        Aurora Energy Research <em>NEM Capture Price Outlook 2026</em> ·
        AURES Wind / Solar / BESS Value Analyses (forward views) ·
        AEMO ISP 2024 step-change scenario.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — Presenting it — boardroom-ready outputs
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>The audience determines the format</H2>
      <P>
        Operational valuation outputs land in three different rooms, and each room reads them
        differently. The same underlying analysis needs three different presentations:
      </P>
      <Table
        emphasizeFirst
        headers={['Audience', 'Their question', 'What they want to see']}
        rows={[
          ['Sponsor board', 'Hold, sell, or recapitalise?', 'Single-page scorecard with quartile ranking, peer chart, forward NPV range, 3-5 bullet thesis'],
          ['Refinancing lenders', 'Can we size higher debt against this?', 'P50/P90 cash flow projection, DSCR table under multiple price scenarios, covenants compliance history'],
          ['M&A buyers', 'What is this worth, and what are the hidden risks?', 'Detailed metric stack, peer ranking, forward risk matrix, MLF/curtailment trajectory analysis'],
        ]}
      />

      <H2>The single-page scorecard — what works</H2>
      <P>
        The boardroom version compresses operational valuation to a single page. The components
        that earn their space:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Headline grade</Em> — A+ to D, with sub-grade explanation. Lets the reader
          calibrate instantly.</li>
        <li><Em>Three or four primary metrics</Em> with percentile bars showing where the asset
          sits in cohort. CF, capture price, value factor, MLF.</li>
        <li><Em>Forward trajectory</Em> — a single sparkline of expected $/MWh over the next 10
          years, with the cohort median overlay.</li>
        <li><Em>Top 3 pros / Top 3 cons</Em> — written in plain English, each tied to a number.</li>
        <li><Em>Data confidence</Em> — how many years of data, completeness, ramp-year flag.</li>
      </ul>
      <P>
        Things to leave off the scorecard: full data tables (put in appendix), forward-curve
        methodology (put in appendix), every metric (only the 3-4 that matter for the audience).
      </P>

      <H2>The AURES per-project Value Analysis — worked example</H2>
      <P>
        The AURES Wind Value Analysis page (visit any operating wind farm, scroll to the Wind Value
        Analysis section) implements this pattern:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Top-of-page header includes the data confidence badge and grade chip (A-D).</li>
        <li>The Valuation tab shows the pros/cons narrative with quantitative anchors.</li>
        <li>The Peers tab plots this project against state cohort on multiple axes.</li>
        <li>The Trend tab surfaces forward indicators — MLF erosion, capture price trajectory,
          curtailment hours.</li>
        <li>The export-to-PDF button generates a boardroom-ready single-page summary that includes
          project profile, value tables, NEM lens, and the curtailment & MLF indicators section.</li>
      </ul>
      <P>
        This pattern is technology-portable. The Solar and BESS Value Analyses use the same tab
        structure with technology-specific metric stacks (Solar adds Performance Ratio and
        degradation; BESS adds round-trip efficiency, cycle revenue split, and discharge
        spread analysis).
      </P>

      <H2>Pros and cons — writing them so they survive review</H2>
      <P>
        The pros/cons paragraph is the most-read part of the scorecard. Three rules:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Every claim is tied to a number.</Em> "Strong capacity factor" is weak; "33% CF in
          a state cohort averaging 29% — top quartile" is defensible.</li>
        <li><Em>Forward-looking risks earn space.</Em> Don't only describe what is good — describe
          what is most likely to deteriorate, and on what timescale.</li>
        <li><Em>Concede the cons.</Em> A scorecard with five pros and no cons reads as marketing,
          not analysis. Every operating asset has at least two real cons.</li>
      </ol>
      <Callout type="numbers">
        <strong>Example — well-written pro/con pair for a NSW wind farm:</strong>
        <br /><br />
        <Em>Pro:</Em> "Above-average capacity factor (33% vs NSW cohort 29%, percentile 78). The
        site sits on a long ridgeline with consistent SW winds. Production has been stable
        ±1.5pp year over the operating record."
        <br /><br />
        <Em>Con:</Em> "MLF declined from 0.94 at COD (2019) to 0.86 in 2025, a 0.8pp/year erosion
        attributable to ~700 MW of new wind connecting at neighbouring TNIs since 2021. Forward
        modelling implies 0.82 by 2028; the CISA does not compensate for MLF erosion."
      </Callout>

      <H2>Side-by-side peer comparison — visualising the cohort</H2>
      <P>
        The peer chart is often the most decision-influencing visual. Three patterns that work:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Bar chart with project highlighted</Em> — single metric across cohort, with the
          subject project coloured. Clean for senior audiences.</li>
        <li><Em>Two-axis scatter</Em> — e.g. CF (x) vs capture price (y). The deserves-vs-achieves
          plot from Lesson 4 fits here. Shows which quadrant the asset sits in.</li>
        <li><Em>Radar / spider chart</Em> — 5-6 metrics, each scaled 0-100 within cohort, project
          plotted vs cohort median. Visualises overall balance.</li>
      </ul>

      <H2>What boards actually look at</H2>
      <P>
        From the AURES analysis of board materials filed in ASX-listed asset M&A processes and
        public refinancing memos:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The headline grade or quartile sits in the first 20 seconds of review</li>
        <li>The forward NPV range gets the most challenge — "why is the upper bound that high?"</li>
        <li>Cons are read more carefully than pros</li>
        <li>The data confidence flag determines whether the analysis is taken at face value or
          re-modelled</li>
        <li>Peer comparison earns 60-80% of the discussion time when the result is contested</li>
      </ul>

      <Callout type="key">
        Operational valuation is reverse-engineering: the headline (grade, NPV, recommendation)
        sits on top of the metric stack, which sits on top of the data layer. A reader walks
        downward from headline to detail when they need to challenge or confirm. A scorecard
        that supports this walk-down — with each layer transparently linked to the one above —
        wins.
      </Callout>

      <Callout type="source">
        Sources: AURES per-project Value Analysis pages (Wind, Solar, BESS) and exportable PDFs ·
        ASX-listed asset M&A materials · BloombergNEF asset valuation report templates ·
        Norton Rose Fulbright project finance practice notes · Macquarie Infrastructure investor
        day materials.
      </Callout>

      <Callout type="info">
        <strong>End of Part A.</strong> Lessons 7-12 (Part B) cover development-stage valuation —
        how the same framework adapts when you have no operational record and must value from
        fundamentals (resource, connection, offtake, developer, constructability + community).
        Lessons 13-14 (Part C) close the loop with an interactive top-quartile scoring tool
        applicable to operating or development projects.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — Stages of a renewable project + $/MW step-ups
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>The development pipeline — eight stages, eight valuation step-ups</H2>
      <P>
        A development-stage renewable project moves through eight roughly-sequential gates between
        first land option and commercial operation. Each gate de-risks a specific category of
        uncertainty, which in turn lifts the project's $/MW market value. Understanding the typical
        step-up at each gate lets you both price a project at any stage and identify which
        development companies are creating value vs. paying themselves for time.
      </P>

      <H2>The eight stages</H2>
      <Table
        emphasizeFirst
        headers={['Stage', 'What it means', 'Key risk eliminated']}
        rows={[
          ['1. Origination', 'Site identified, initial owner contact', 'None yet — pure option'],
          ['2. Land tied up', 'Exclusive option / lease executed over the site', 'Site control'],
          ['3. Resource validated', 'Met-mast / pyranometer / battery-spread data collected', 'Resource quality'],
          ['4. Planning lodged', 'EPBC + state planning application submitted', 'Planning timeline starts'],
          ['5. Planning approved', 'Development consent issued (state + EPBC)', 'Planning risk eliminated'],
          ['6. AEMO connection — R1 cleared', 'GPS submission, system modelling complete', 'Technical-connection feasibility'],
          ['7. AEMO connection — R2 + connection agreement', 'Final negotiated connection agreement with NSP', 'Connection cost crystallised'],
          ['8. FID — financial close', 'Debt + equity locked, EPC signed, offtake executed', 'Capital + construction risk'],
        ]}
      />
      <P>
        Beyond Stage 8 the project is under construction; valuation moves from "development-stage"
        to "construction-stage" with different dynamics. COD (commercial operation date) marks the
        transition to the operational valuation framework covered in Part A.
      </P>

      <H2>Typical $/MW value at each stage — by technology (2026 Australian context)</H2>
      <Callout type="warn">
        These ranges are indicative — derived from public M&A coverage (AFR, Inframation,
        IJ Global, listed-company asset sale disclosures) and a small sample of confidential
        diligence outputs that have been published in court filings or shareholder materials.
        Real transactions vary widely with site quality, capital structure, and counterparty
        dynamics. Use these as a starting benchmark, not a settlement price.
      </Callout>

      <Table
        emphasizeFirst
        headers={['Stage', 'Solar ($/MW)', 'Wind ($/MW)', 'BESS ($/MW)', 'Hybrid ($/MW)']}
        rows={[
          ['1. Origination', '$5–15k', '$10–25k', '$3–10k', '$8–20k'],
          ['2. Land tied up', '$15–40k', '$25–60k', '$10–25k', '$20–50k'],
          ['3. Resource validated', '$30–70k', '$60–150k', '$15–35k', '$40–100k'],
          ['4. Planning lodged', '$50–120k', '$100–200k', '$25–60k', '$75–150k'],
          ['5. Planning approved', '$100–250k', '$200–400k', '$50–120k', '$150–300k'],
          ['6. R1 cleared', '$180–400k', '$300–550k', '$80–180k', '$250–450k'],
          ['7. Connection agreement', '$300–600k', '$450–800k', '$150–300k', '$400–700k'],
          ['8. FID', '$800k–1.5M', '$1.2–2M', '$300–500k', '$1.0–1.8M'],
        ]}
      />

      <H2>The step-up pattern — where value is created</H2>
      <P>
        The largest single $/MW step-up is typically <Em>planning approved → R1 cleared</Em>: a
        well-located solar project with state development consent might be worth $200k/MW, the
        same project with AEMO R1 sign-off worth $400k/MW. This is the gate that turns a "paper
        project" into a "buildable project". The second-largest step-up is <Em>connection
        agreement → FID</Em> — the difference between a project that has a costed connection
        offer and one that has executed debt + equity + EPC + offtake on the back of it.
      </P>
      <P>
        Three smaller-but-meaningful step-ups: resource validation (~$30-50k/MW for wind),
        planning lodgement (signals that the developer is serious about timeline), and R2 with
        an executed connection agreement (the connection cost stops being a range and becomes a
        number).
      </P>
      <Callout type="numbers">
        <strong>Worked example — a 200 MW NSW solar project's $/MW journey.</strong>
        <br /><br />
        Year 1 (Origination): site identified in Central-West REZ. Value at this stage:{' '}
        <Em>$10k/MW × 200 = $2.0M</Em>. Investors call this "deal-flow value" — paid only by other
        developers looking to expand pipeline.
        <br /><br />
        Year 2 (Land tied up, resource validated): 5 ground-mounted pyranometers running 12 months;
        landowner option executed for 80% of needed footprint. Value: <Em>$60k/MW × 200 = $12M</Em>.
        Typical buyers: developer-platforms (Lightsource bp, Octopus, Akaysha).
        <br /><br />
        Year 3 (Planning lodged): SSD application with NSW EPA. Value: <Em>$90k/MW × 200 = $18M</Em>.
        <br /><br />
        Year 4 (Planning approved, R1 in progress): IPC determination favourable; EPBC tick;
        AEMO modelling phase underway. Value: <Em>$220k/MW × 200 = $44M</Em>.
        <br /><br />
        Year 5 (R1 cleared, connection agreement executed): negotiated TUOS / NUOS settled with
        TransGrid. Value: <Em>$450k/MW × 200 = $90M</Em>. This is the typical "exit" stage for
        platform-style developers who don't take projects to construction.
        <br /><br />
        Year 6 (FID): debt + equity + EPC + offtake signed. Value: <Em>$1.1M/MW × 200 = $220M</Em>.
        That figure is the project's full enterprise value — what the construction-stage owner has
        paid in cumulative project costs to date.
      </Callout>

      <H2>Where the data comes from</H2>
      <P>
        Public sources for $/MW benchmarks at development stages:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>AFR / Renewable Press</Em> — deal-by-deal commentary, often with implied $/MW</li>
        <li><Em>Inframation Group / IJ Global</Em> — paywalled but the most comprehensive deal database</li>
        <li><Em>Tilt Renewables, Genex Power, Mercury NZ, RES</Em> — listed-company asset-sale disclosures (the cleanest signal)</li>
        <li><Em>CEFC investment reports</Em> — co-investment disclosures with implied valuations</li>
        <li><Em>Norton Rose, Allens, KWM</Em> — published case studies and league tables</li>
        <li><Em>AURES Scheme Tracker</Em> — implied valuations on CISA awards (some inferred from public assumptions)</li>
      </ul>

      <Callout type="key">
        $/MW values are not absolute — they are <Em>relative</Em> to comparable projects in the
        same technology, region, and stage. The benchmark table above is a starting point;
        defensible valuation always references at least 3-5 directly comparable transactions.
        The next lessons (8-12) cover what makes one project's $/MW genuinely higher than its
        peers' — the fundamentals.
      </Callout>

      <Callout type="source">
        Sources: Tilt Renewables sale disclosures (2021–2023) · Genex Power Kidston transactions ·
        Mercury NZ acquisition documents · RES asset sale notes · AFR deal coverage 2024–2026 ·
        Inframation Group renewables deal data · CEFC annual reports · ASX-listed renewable
        company half-yearly accounts.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 8 — The five fundamental categories
// ============================================================

function Lesson8() {
  return (
    <div>
      <H2>Five categories, every renewable project</H2>
      <P>
        Every development-stage valuation conversation eventually reduces to five questions about
        the project's fundamentals. The technology and stage shift the relative weights, but the
        five categories themselves are universal: a 600 MW solar farm in Central-West NSW and a
        50 MW BESS at a substation in suburban Melbourne are scored on the same five axes.
      </P>

      <H2>The five categories</H2>
      <Table
        emphasizeFirst
        headers={['#', 'Category', 'Default weight', 'The question it answers']}
        rows={[
          ['1', 'Resource quality',           '25%', 'How much energy will this site generate (or absorb), and how predictably?'],
          ['2', 'Connection quality',         '25%', 'How much of that energy will the network let out, and at what marginal-loss factor — now and through the asset\'s life?'],
          ['3', 'Offtake availability',       '20%', 'Who will pay for the output, on what terms, and for how long?'],
          ['4', 'Developer track record',     '15%', 'Will this team actually deliver this project, on this timeline, at the budgeted cost?'],
          ['5', 'Constructability + community','15%', "What's the build risk, and is the social licence stable?"],
        ]}
      />

      <Callout type="key">
        The AURES default weights — 25/25/20/15/15 — reflect two empirical patterns observed in
        Australian project failure modes since 2018: (i) projects with weak resource and projects
        with weak connection fail in roughly equal proportions, so these two categories share the
        top weight; (ii) offtake risk dominates pre-FID failure but is partly addressable
        post-award via stacking, so it sits at 20%; (iii) developer + constructability + community
        are typically discovered late in diligence and tend to be issue-flags rather than
        absolute disqualifiers.
      </Callout>

      <H2>Why this taxonomy — and what it excludes</H2>
      <P>
        Some categories that other frameworks include separately are <Em>folded into</Em> the AURES
        five:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Capital availability</Em> — covered under Developer (a well-capitalised developer with track record can fund slower or weaker projects)</li>
        <li><Em>Regulatory / planning</Em> — split between Connection (where the regulator is the NSP/AEMC), Community (where it's the planning authority), and Developer (track record of navigating regulators)</li>
        <li><Em>MLF risk</Em> — folded into Connection quality</li>
        <li><Em>Curtailment risk</Em> — folded into Connection quality</li>
        <li><Em>Equipment-supply risk</Em> — folded into Constructability</li>
        <li><Em>Market price risk</Em> — folded into Offtake (with or without a PPA / CISA)</li>
      </ul>
      <P>
        Two genuinely-separate concerns that don't fit cleanly into the five and should be flagged
        separately when material: <Em>force majeure exposure</Em> (cyclone-prone QLD coast, fire-prone
        SA hills) and <Em>technology-specific obsolescence risk</Em> (e.g. a 1-hour BESS in a market
        where the firming definition shifts to 4-hour minimum). These show up as deductions in the
        final score, not as a sixth category.
      </P>

      <H2>How weights shift by technology</H2>
      <Table
        emphasizeFirst
        headers={['Category', 'Wind weight', 'Solar weight', 'BESS weight', 'Hybrid weight']}
        rows={[
          ['Resource quality',          '30%', '20%', '15%', '22%'],
          ['Connection quality',        '20%', '30%', '30%', '25%'],
          ['Offtake availability',      '20%', '20%', '25%', '23%'],
          ['Developer track record',    '15%', '15%', '15%', '15%'],
          ['Constructability + community','15%','15%','15%','15%'],
        ]}
      />
      <P>
        The shifts reflect technology-specific failure modes:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Wind</Em>: resource variability is the dominant driver — a 1pp wind-speed
          mis-estimate at the long-term mean is a ~3pp CF error</li>
        <li><Em>Solar</Em>: resource is well-characterised globally (GHI maps are mature);
          connection quality determines whether the asset delivers value — solar suffers most
          from cannibalisation and MLF erosion</li>
        <li><Em>BESS</Em>: resource is "the market" (the local spread), which connection
          quality also determines; offtake matters more because BESS depends on scheme-backed
          revenue more than wind/solar</li>
        <li><Em>Hybrid</Em>: weighted average of solar (2/3 weight) and BESS (1/3 weight) for a
          typical 200 MW solar + 100 MW BESS configuration</li>
      </ul>

      <Callout type="key">
        Apply the technology-specific weights in detailed valuation; use the default 25/25/20/15/15
        for cross-technology portfolio scoring (where you want to compare a wind project's score
        to a BESS project's score on the same scale).
      </Callout>

      <H2>What gets scored vs what gets noted</H2>
      <P>
        Each of the five categories produces a score from 1 to 5:
      </P>
      <Table
        emphasizeFirst
        headers={['Score', 'Label', 'What it means']}
        rows={[
          ['5', 'Best-in-class', 'Top 10% of comparable projects'],
          ['4', 'Above average', 'Top 25% — 75th percentile'],
          ['3', 'Median', '~50th percentile of comparable projects'],
          ['2', 'Below average', '25th–50th percentile'],
          ['1', 'Bottom tier', 'Bottom 25% — material issue'],
        ]}
      />
      <P>
        The composite weighted score then maps to a quartile rank: above 4.0 = top quartile;
        3.0–4.0 = upper-middle; 2.0–3.0 = lower-middle; below 2.0 = bottom. This rubric is fleshed
        out fully in Lesson 12.
      </P>

      <Callout type="info">
        The next three lessons (9, 10, 11) take each category in turn, explain the sub-metrics,
        how to score it from public data, and where you must estimate from proxies.
      </Callout>

      <Callout type="source">
        Sources: AURES framework (this module) · Norton Rose Fulbright development risk practice
        notes · BloombergNEF asset valuation methodology · CEFC investment principles ·
        Clean Energy Investor Group submissions on CIS bid evaluation.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 9 — Resource quality (the foundational fundamental)
// ============================================================

function Lesson9() {
  return (
    <div>
      <H2>Resource quality — what cannot be undone</H2>
      <P>
        Resource is the only fundamental that's permanent. A weak grid connection can be upgraded;
        a developer can sell to a stronger sponsor; an offtake can be re-bid. Wind speed at the
        site is what it is. The first development-stage check on any project is: <Em>is the
        resource sufficient to support a top-quartile capacity factor for this technology in this
        region?</Em>
      </P>

      <H2>Wind — the resource stack</H2>

      <H3>Primary data sources (in order of confidence)</H3>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>On-site met-mast data</Em> — 12+ months at hub height. Gold standard; required for FID-grade bankability.</li>
        <li><Em>DNV / TÜV / ArcVera energy assessment</Em> — produced from met-mast data plus near-surface reanalysis. The bankability-grade output.</li>
        <li><Em>MERRA-2 reanalysis (NASA, free)</Em> — 1980–present, 50 km grid, hourly. The best free option for development-stage screening.</li>
        <li><Em>Vortex / 3TIER / Cleanergy modelling</Em> — paid services with finer-grained mesoscale modelling (1–3 km).</li>
        <li><Em>Australian Wind Atlas</Em> — Bureau of Meteorology + Geoscience Australia, free, useful for first-screening only.</li>
      </ul>

      <H3>The key metrics</H3>
      <Table
        emphasizeFirst
        headers={['Metric', 'Target range', 'Why it matters']}
        rows={[
          ['Mean wind speed at hub height', '6.5–8.5 m/s (NSW/VIC), 7.5–9.5 (TAS/SA)', 'Cubic relationship to power — small changes compound'],
          ['Weibull k parameter', '1.8–2.5', 'Distribution shape — lower k = more high-wind hours'],
          ['Turbulence intensity', '<12% at hub height', 'Higher TI = more fatigue, lower availability'],
          ['Wind shear (alpha)', '0.10–0.25', 'How much speed increases with height — informs hub-height optimisation'],
          ['Annual energy production (AEP) P50', 'Gives CF directly', 'The bottom-line output expectation'],
          ['AEP uncertainty (P90/P50 ratio)', '>0.85 ideal', 'Higher ratio = lender will accept stronger gearing'],
        ]}
      />
      <Callout type="numbers">
        <strong>The cube-law sensitivity.</strong> Wind power scales with the cube of wind speed.
        A site with mean 8.0 m/s produces approximately (8.0/7.5)³ = 21% more energy than a site
        with mean 7.5 m/s — a 0.5 m/s mis-estimate at the long-term mean is a 21% AEP swing. This
        is why on-site measurement is non-negotiable for FID and why reanalysis-only resource
        assessment is sufficient only for early-stage screening.
      </Callout>

      <H2>Solar — the resource stack</H2>

      <H3>Primary data sources</H3>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>On-site pyranometer data</Em> — 12+ months. Required for FID.</li>
        <li><Em>NREL SAM / PVsyst project assessment</Em> — energy production simulator, takes pyranometer + module specs + degradation curves.</li>
        <li><Em>NASA POWER / Solcast / Solargis</Em> — satellite-derived GHI / DNI / DHI at hourly resolution. Free (NASA POWER) to paid (Solcast).</li>
        <li><Em>Bureau of Meteorology Solar Radiation Atlas</Em> — free, useful for development-stage screening.</li>
      </ul>

      <H3>The key metrics</H3>
      <Table
        emphasizeFirst
        headers={['Metric', 'Target range', 'Why it matters']}
        rows={[
          ['Annual GHI (Global Horizontal Irradiance)', '1,700–2,100 kWh/m²/yr (QLD/SA), 1,400–1,800 (VIC/NSW)', 'Direct + diffuse — drives total energy harvestable'],
          ['DNI fraction', '0.55–0.70', 'Higher DNI = better fit for tracking systems'],
          ['Soiling rate', '<3%/yr ideal', 'Arid/dusty regions lose more output between cleanings'],
          ['Latitude / tilt optimisation gain', '5–12% over horizontal', 'Determines optimal panel tilt or tracking strategy'],
          ['Tracking system uplift (1-axis)', '+15–25% AEP', 'Single-axis tracking is now standard above $20–30M projects'],
          ['Temperature-coefficient losses', '~0.4%/°C above 25°C', 'Hot sites (Western NSW, central QLD) lose 8–12% to temp'],
        ]}
      />

      <H2>BESS — "resource" is the local market spread</H2>
      <P>
        For BESS, resource quality is a market construct rather than a physical one. The "resource"
        is the daily intraday spread between low-price hours (when the battery charges) and
        high-price hours (when it discharges). Spread potential varies by region, by season, and
        by year — and is being structurally re-shaped by the renewable + storage build-out itself.
      </P>

      <H3>The key BESS resource metrics</H3>
      <Table
        emphasizeFirst
        headers={['Metric', 'Target range (NSW, 2025–2026)', 'Why it matters']}
        rows={[
          ['Daily peak–trough spread', '$80–$140 (1-yr median)', 'The basic arbitrage opportunity'],
          ['Cycles per year (economic)', '300–365', 'How many times the spread is captured'],
          ['Duration that captures most of the spread', '2–4 hr (today), 4–8 hr (2028+)', 'Drives MWh sizing relative to MW'],
          ['Spread volatility (std dev)', '$30–$60/MWh', 'Higher volatility = more option value'],
          ['Capture price during scarcity (95th percentile)', '$400–$8,000/MWh', 'The tail-revenue source — when the spread spikes'],
          ['FCAS revenue potential', '$30–80k/MW/yr', 'Mature but compressing as more BESS comes online'],
        ]}
      />
      <Callout type="info">
        For BESS development valuation, the "resource" assessment is really a forward market-modelling
        exercise. Aurora Energy Research, Modo Energy, and Cornwall Insight publish region-specific
        spread forecasts that are the foundational input. The development-stage equivalent of a wind
        met-mast is a <Em>spread forecast purchased from a reputable forecaster</Em>.
      </Callout>

      <H2>Hybrid — complementarity is the resource</H2>
      <P>
        For a solar + BESS hybrid, the resource consists of three components:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The solar resource (as above)</li>
        <li>The local market spread (as above)</li>
        <li>The <Em>complementarity</Em> — how much of the solar output falls into low-price hours
          that the BESS can shift to high-price hours</li>
      </ol>
      <P>
        Strong hybrid complementarity exists when the local market has deep negative-price midday
        events (so the solar would otherwise curtail) and large evening price peaks (so the BESS
        discharge captures premium prices). NSW Central-West and SA Mid-North are currently
        best-in-class hybrid sites by this measure. QLD has weaker complementarity because evening
        peak prices have been compressed by Government-Owned Corporations.
      </P>

      <Callout type="key">
        Resource is the only fundamental category where data confidence at the development stage
        can approach the operational-data standard — provided you have on-site measurement.
        Without on-site measurement (i.e. relying on reanalysis or atlas data), development-stage
        resource assessment has wide uncertainty bands, and lender DSCR sizing reflects that. The
        single highest-value pre-FID spend on any project is met-mast or pyranometer instrumentation.
      </Callout>

      <Callout type="source">
        Sources: DNV <em>Wind Resource Assessment Best Practice</em> · NREL System Advisor Model
        (SAM) documentation · NASA POWER project · BoM Solar Radiation Atlas ·
        Aurora Energy Research <em>NEM Spread Outlook</em> · Modo Energy
        <em>Australia BESS Revenue Stack</em> · Cornwall Insight Australia.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 10 — Connection quality (heavyweight, with interactive tool)
// ============================================================

// Curated illustrative dataset of representative NEM connection points.
// MLF trajectories drawn from public AEMO MLF tables; pipeline figures
// representative of well-known REZ development clusters. Use as
// illustrative — actual values vary year-to-year and the future-MLF
// heuristic (-0.4pp per GW added) is a rough rule of thumb.
interface ConnectionPoint {
  name: string
  region: string
  rezOrArea: string
  currentMlf: number
  history: { year: number; mlf: number }[]
  operatingProjectsMw: number
  pipelineProjectsMw: number
  pipelineCount: number
  tnspVsDnsp: 'TNSP' | 'DNSP'
  notes: string
}

const CONNECTION_POINTS: ConnectionPoint[] = [
  {
    name: 'Sapphire / Glen Innes 132 kV (NSW)',
    region: 'NSW1', rezOrArea: 'New England REZ',
    currentMlf: 0.84,
    history: [
      { year: 2019, mlf: 0.95 }, { year: 2020, mlf: 0.93 }, { year: 2021, mlf: 0.90 },
      { year: 2022, mlf: 0.88 }, { year: 2023, mlf: 0.86 }, { year: 2024, mlf: 0.85 }, { year: 2025, mlf: 0.84 },
    ],
    operatingProjectsMw: 720, pipelineProjectsMw: 1800, pipelineCount: 6, tnspVsDnsp: 'TNSP',
    notes: 'Saturated wind cluster; ~11pp MLF erosion 2019-2025. Pipeline adds 2.5x current capacity.',
  },
  {
    name: 'Wollar 330 kV (NSW)',
    region: 'NSW1', rezOrArea: 'Central-West REZ',
    currentMlf: 0.92,
    history: [
      { year: 2020, mlf: 0.96 }, { year: 2021, mlf: 0.95 }, { year: 2022, mlf: 0.94 },
      { year: 2023, mlf: 0.93 }, { year: 2024, mlf: 0.93 }, { year: 2025, mlf: 0.92 },
    ],
    operatingProjectsMw: 280, pipelineProjectsMw: 2400, pipelineCount: 9, tnspVsDnsp: 'TNSP',
    notes: 'Currently strong MLF; large pipeline + Project EnergyConnect will reshape — watch closely.',
  },
  {
    name: 'Stockyard Hill 220 kV (VIC)',
    region: 'VIC1', rezOrArea: 'Western Victoria REZ',
    currentMlf: 0.87,
    history: [
      { year: 2018, mlf: 0.97 }, { year: 2019, mlf: 0.95 }, { year: 2020, mlf: 0.92 },
      { year: 2021, mlf: 0.90 }, { year: 2022, mlf: 0.89 }, { year: 2023, mlf: 0.88 }, { year: 2024, mlf: 0.87 }, { year: 2025, mlf: 0.87 },
    ],
    operatingProjectsMw: 1100, pipelineProjectsMw: 600, pipelineCount: 3, tnspVsDnsp: 'TNSP',
    notes: 'Mature wind cluster; MLF stabilising as VNI West progresses.',
  },
  {
    name: 'Western Downs 275 kV (QLD)',
    region: 'QLD1', rezOrArea: 'Darling Downs',
    currentMlf: 0.79,
    history: [
      { year: 2019, mlf: 0.94 }, { year: 2020, mlf: 0.90 }, { year: 2021, mlf: 0.86 },
      { year: 2022, mlf: 0.83 }, { year: 2023, mlf: 0.81 }, { year: 2024, mlf: 0.80 }, { year: 2025, mlf: 0.79 },
    ],
    operatingProjectsMw: 1900, pipelineProjectsMw: 1500, pipelineCount: 7, tnspVsDnsp: 'TNSP',
    notes: 'Worst MLF erosion in NEM — solar+wind saturation. Pipeline cohort smaller now as developers avoid.',
  },
  {
    name: 'Robertstown 275 kV (SA)',
    region: 'SA1', rezOrArea: 'Mid-North',
    currentMlf: 0.91,
    history: [
      { year: 2019, mlf: 0.93 }, { year: 2020, mlf: 0.92 }, { year: 2021, mlf: 0.91 },
      { year: 2022, mlf: 0.91 }, { year: 2023, mlf: 0.91 }, { year: 2024, mlf: 0.91 }, { year: 2025, mlf: 0.91 },
    ],
    operatingProjectsMw: 600, pipelineProjectsMw: 800, pipelineCount: 4, tnspVsDnsp: 'TNSP',
    notes: 'Project EnergyConnect terminus — MLF stable + likely improvement once interconnect operational.',
  },
  {
    name: 'Hay 132 kV (NSW)',
    region: 'NSW1', rezOrArea: 'South West REZ',
    currentMlf: 0.88,
    history: [
      { year: 2020, mlf: 0.92 }, { year: 2021, mlf: 0.91 }, { year: 2022, mlf: 0.90 },
      { year: 2023, mlf: 0.89 }, { year: 2024, mlf: 0.88 }, { year: 2025, mlf: 0.88 },
    ],
    operatingProjectsMw: 400, pipelineProjectsMw: 1100, pipelineCount: 5, tnspVsDnsp: 'TNSP',
    notes: 'EnergyConnect adjacent; potential beneficiary but pipeline is heavy.',
  },
  {
    name: 'Tarwin Lower / Latrobe 220 kV (VIC)',
    region: 'VIC1', rezOrArea: 'Gippsland REZ',
    currentMlf: 0.93,
    history: [
      { year: 2022, mlf: 0.95 }, { year: 2023, mlf: 0.94 }, { year: 2024, mlf: 0.94 }, { year: 2025, mlf: 0.93 },
    ],
    operatingProjectsMw: 280, pipelineProjectsMw: 4500, pipelineCount: 8, tnspVsDnsp: 'TNSP',
    notes: 'Offshore wind landing zone — pipeline includes 9+ GW of offshore projects.',
  },
  {
    name: 'Springvale (Vic-NSW border) 22 kV (DNSP)',
    region: 'VIC1', rezOrArea: 'Distribution-connected BESS',
    currentMlf: 0.96,
    history: [
      { year: 2023, mlf: 0.97 }, { year: 2024, mlf: 0.96 }, { year: 2025, mlf: 0.96 },
    ],
    operatingProjectsMw: 8, pipelineProjectsMw: 25, pipelineCount: 3, tnspVsDnsp: 'DNSP',
    notes: 'Representative DNSP-connected BESS site — higher MLF, lower connection capex, but smaller scale ceiling.',
  },
]

function ConnectionPointInteractive() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showPipeline, setShowPipeline] = useState(false)

  const point = CONNECTION_POINTS[selectedIdx]

  // Heuristic for projected MLF after pipeline connects: -0.4pp per GW added,
  // floored at 0.70. Real impacts depend on power-flow analysis the public
  // domain does not include, but the heuristic captures the directional signal.
  const projectedMlf = useMemo(() => {
    const addedGw = point.pipelineProjectsMw / 1000
    const projected = Math.max(0.70, point.currentMlf - 0.004 * point.pipelineProjectsMw)
    return { addedGw, projected }
  }, [point])

  // Build chart data: history + projection point if pipeline toggle on
  const chartData = useMemo(() => {
    const lastYear = point.history[point.history.length - 1].year
    const base = point.history.map(h => ({
      year: String(h.year),
      mlf: Number((h.mlf * 100).toFixed(1)),
      projected: null as number | null,
    }))
    if (showPipeline) {
      base.push({
        year: `${lastYear + 3}*`,
        mlf: Number((point.currentMlf * 100).toFixed(1)),
        projected: Number((projectedMlf.projected * 100).toFixed(1)),
      })
    }
    return base
  }, [point, showPipeline, projectedMlf])

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 my-4 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          Connection point explorer · pick a representative NEM node
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] italic mb-3">
          Illustrative dataset — MLF history drawn from public AEMO MLF tables; pipeline counts
          from AEMO Generation Information snapshots. The "projected" MLF uses a -0.4pp per GW
          heuristic that AURES finds directionally consistent with observed history; not a
          power-flow output.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CONNECTION_POINTS.map((p, i) => (
            <button
              key={p.name}
              onClick={() => setSelectedIdx(i)}
              className={`text-[10px] px-2 py-1.5 rounded-lg border transition-colors text-left ${
                i === selectedIdx
                  ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-text)]'
                  : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <span className="block font-semibold">{p.name.split(' (')[0]}</span>
              <span className="block opacity-60">{p.rezOrArea} · {p.tnspVsDnsp}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[var(--color-border)]">
        <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Current MLF</p>
          <p className="text-base font-bold text-[var(--color-text)]">{point.currentMlf.toFixed(2)}</p>
        </div>
        <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Operating cap.</p>
          <p className="text-base font-bold text-[var(--color-text)]">{(point.operatingProjectsMw / 1000).toFixed(1)} GW</p>
        </div>
        <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Pipeline ({point.pipelineCount})</p>
          <p className="text-base font-bold text-[var(--color-text)]">{(point.pipelineProjectsMw / 1000).toFixed(1)} GW</p>
        </div>
        <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Network</p>
          <p className="text-base font-bold text-[var(--color-text)]">{point.tnspVsDnsp}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="show-pipeline"
          checked={showPipeline}
          onChange={(e) => setShowPipeline(e.target.checked)}
          className="cursor-pointer accent-[var(--color-primary)]"
        />
        <label htmlFor="show-pipeline" className="text-xs text-[var(--color-text)] cursor-pointer">
          Project pipeline impact ({projectedMlf.addedGw.toFixed(1)} GW added → projected MLF{' '}
          <span className="font-mono font-semibold">{projectedMlf.projected.toFixed(2)}</span>,{' '}
          <span className={projectedMlf.projected < point.currentMlf ? 'text-red-400' : 'text-emerald-400'}>
            {((projectedMlf.projected - point.currentMlf) * 100).toFixed(1)} pp
          </span> change)
        </label>
      </div>

      <div className="bg-[var(--color-bg-elevated)]/40 rounded-lg p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          MLF history · {point.name}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickFormatter={v => `${v}%`}
              domain={[70, 100]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgb(15,23,42)', border: '1px solid rgb(51,65,85)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: 'rgb(241,245,249)', fontWeight: 600 }}
              formatter={(value, name) => [`${(value as number).toFixed(1)}%`, name === 'mlf' ? 'MLF' : 'Projected (with pipeline)']}
            />
            <ReferenceLine y={100} stroke="var(--color-border)" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="mlf"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#3b82f6' }}
              connectNulls
              name="mlf"
            />
            {showPipeline && (
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 4, fill: '#ef4444' }}
                connectNulls
                name="projected"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] italic leading-relaxed">
        {point.notes}
      </p>
    </div>
  )
}

function Lesson10() {
  return (
    <div>
      <H2>Connection quality — the single most under-priced risk</H2>
      <P>
        Resource quality is the developer's first conversation; connection quality is the
        developer's quietest one. A site with 35% capacity factor at MLF 0.95 and a site with 35%
        capacity factor at MLF 0.78 have very different NPVs — but the second one's MLF won't
        appear in a project pitch deck. Connection quality has to be reconstructed from public
        data and analytical inference.
      </P>

      <H2>Sub-metric 1 — MLF history at the connection point</H2>
      <P>
        AEMO publishes <Em>Marginal Loss Factors</Em> annually (published mid-year, effective from
        1 July). The MLF is the multiplier applied to a generator's energy output for settlement
        purposes — a project at 0.85 MLF receives 85% of the regional reference price (RRP) for
        every MWh it generates. MLFs change every year, primarily as a function of:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>How much generation has been added to nearby connection points</li>
        <li>How much demand has been added (rare for renewable nodes)</li>
        <li>Network topology changes (line additions, transformer changes)</li>
        <li>Generation mix shifts (e.g. coal retirements at distant nodes affect everywhere)</li>
      </ul>
      <P>
        The historical MLF trajectory at a connection point is the single best predictor of where
        a development project's MLF will go. The interactive tool below shows MLF history for
        eight representative NEM connection points.
      </P>

      <H2>Interactive — explore representative NEM connection points</H2>
      <ConnectionPointInteractive />

      <Callout type="warn">
        The "projected MLF with pipeline" uses a simplified heuristic (-0.4pp per GW of pipeline
        connecting), not a power-flow analysis. AEMO does run power-flow simulations to set
        future-year MLFs, but those outputs are commercially-sensitive and not publicly available
        until the year of effect. The heuristic captures the <Em>direction and rough magnitude</Em> of
        MLF degradation at saturating nodes; it should not be used as a settlement-grade forecast.
      </Callout>

      <H2>Sub-metric 2 — TNSP vs DNSP connection</H2>
      <P>
        A renewable project connects either to the <Em>transmission network</Em> (TNSP — TransGrid,
        AusNet, Powerlink, ElectraNet) or to the <Em>distribution network</Em> (DNSP — Essential
        Energy, Endeavour Energy, AusGrid, AusNet distribution, etc.). The choice has substantial
        implications:
      </P>
      <Table
        emphasizeFirst
        headers={['Dimension', 'TNSP connection', 'DNSP connection']}
        rows={[
          ['Typical scale', '50 MW – 1+ GW', '5–50 MW (sometimes 100 MW)'],
          ['Connection capex', '$30–80M (substation, transformers, HV line)', '$3–15M'],
          ['Connection timeline', '24–36 months (R1+R2 process)', '6–18 months (typically faster)'],
          ['Marginal Loss Factor', 'Generally lower (more saturation)', 'Generally higher (closer to load)'],
          ['Network charges (TUOS / DUOS)', 'Higher TUOS', 'Higher DUOS but lower TUOS — net often similar'],
          ['CISA / LTESA eligibility', 'Standard', 'Standard but typically smaller-tranche bids'],
          ['Constraint exposure', 'Heavy (interconnector flows matter)', 'Lower (mostly local feeder constraints)'],
          ['Suitable technologies', 'Utility-scale wind, large solar, large BESS', 'Smaller BESS, distributed solar, behind-the-meter'],
        ]}
      />
      <P>
        For BESS specifically, the DNSP route is increasingly attractive: faster connection, lower
        capex, higher MLF, and the smaller scale (5–50 MW) matches the size of many emerging
        revenue stacks (FCAS regulation, capacity for ESEM firming, EV-charging behind-the-meter).
        The trade-off is the absence of utility-scale economies and limited access to the largest
        offtake structures.
      </P>

      <H2>Sub-metric 3 — Curtailment exposure</H2>
      <P>
        Curtailment — where the network operator directs a generator to reduce output — comes in
        two forms:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Network curtailment</Em> — AEMO or NSP imposes a constraint; the generator must
          comply. Compensated under some PPAs (deemed generation) but not CISAs.</li>
        <li><Em>Economic curtailment</Em> — the generator chooses not to dispatch (e.g. during
          negative-price intervals). Compensated under PPAs that pay strike regardless; not
          compensated under CISAs.</li>
      </ul>
      <P>
        Network curtailment exposure at a development site can be estimated from:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Historical constraint-binding hours at neighbouring connection points (AEMO DISPATCHCONSTRAINT table)</li>
        <li>The REZ-level pipeline + transmission upgrade status</li>
        <li>The TNSP's published constraint-relief schedule (e.g. NSW EnergyCo's REZ infrastructure plan)</li>
      </ol>
      <Callout type="info">
        Curtailment is the most-underestimated risk in development valuation. Projects pitched as
        "low MLF risk" because the current MLF is high often have significant <Em>future</Em>
        curtailment risk if the area is on a major REZ build-out. The {' '}
        <Link to="/learn/cis-ltesa-bidding/ppa-cisa-calculator" className="text-[var(--color-primary)] hover:underline">
          PPA × CISA Interactions calculator
        </Link>{' '}
        models how curtailment hits revenue under both PPA and CISA structures.
      </Callout>

      <H2>Putting it together — scoring connection quality 1–5</H2>
      <Table
        emphasizeFirst
        headers={['Score', 'Pattern']}
        rows={[
          ['5', 'MLF 0.93+, stable or improving over 3+ years; pipeline at the node is modest (<1.5x current capacity); TNSP route or DNSP with strong scale match.'],
          ['4', 'MLF 0.88–0.93, modestly declining (-0.5 to -1.0 pp/yr); pipeline 1.5–2.5x current; constraint exposure moderate.'],
          ['3', 'MLF 0.83–0.88, declining 1–2 pp/yr; pipeline 2.5–4x current; some constraint binding hours.'],
          ['2', 'MLF 0.78–0.83, declining 2+ pp/yr; pipeline 4x+ current; binding constraints regularly.'],
          ['1', 'MLF below 0.78; severe and ongoing pipeline congestion; project economics depend on transmission upgrade timing the developer cannot control.'],
        ]}
      />

      <Callout type="key">
        Connection quality is the category most likely to have its <Em>perceived</Em> value gap
        with its <Em>actual</Em> value at the development stage. Three reasons: (i) MLF is set in
        retrospect, so future-year MLF must be inferred from the pipeline; (ii) constraint
        exposure depends on future-year power flows that are not publicly modelled; (iii) the
        TNSP cost-recovery schedule for upgrades introduces timing risk. The interactive tool
        above is the early-warning system — see if the connection point's pipeline is heavy
        before committing.
      </Callout>

      <Callout type="source">
        Sources: AEMO published MLF tables (annual, mid-year release) ·
        AEMO Generation Information (monthly pipeline snapshot) ·
        NSW EnergyCo REZ infrastructure plans · TransGrid, AusNet, Powerlink, ElectraNet
        Transmission Annual Planning Reports · AEMO ISP 2024 · Allens, KWM legal commentary on
        TNSP vs DNSP connection · AURES{' '}
        <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
          Scheme Tracker
        </Link>
        {' '}for project pipeline data.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 11 — Constructability, community, offtake, developer
// ============================================================

function Lesson11() {
  return (
    <div>
      <H2>The four softer categories — limited data, real signal</H2>
      <P>
        Resource and connection are quantifiable. Constructability, community, offtake, and
        developer track record involve more judgment — but each can be scored from public data
        with reasonable consistency.
      </P>

      <H2>Constructability — by technology</H2>

      <H3>Wind</H3>
      <P>
        Wind has the largest constructability spread of any renewable technology. Three factors
        drive it:
      </P>
      <Table
        emphasizeFirst
        headers={['Factor', 'Easy site', 'Hard site', 'Cost spread']}
        rows={[
          ['Topographical complexity', 'Flat ridgeline, single-slope', 'Mountainous, multiple aspects', '+$50-150k/MW for hard site'],
          ['Blade-transport route', 'Direct port access, no constraint', 'Long oversize-load route, bridges, tunnels', '+$30-100k/MW'],
          ['Hub-height crane access', 'Wide flat working area at each tower', 'Tight terrain, multiple lifts', '+$20-60k/MW'],
          ['Road / civil works', 'Existing forestry/rural roads', 'Greenfield road construction', '+$40-120k/MW'],
        ]}
      />
      <P>
        Capricornia Range (QLD, hilly), Robertstown (SA, accessible), Stockyard Hill (VIC,
        relatively easy) represent the range. A "hard" wind site can be 20-30% more expensive to
        construct than an "easy" one with the same generating capacity.
      </P>

      <H3>Solar — modest constructability variance</H3>
      <P>
        Solar constructability is dominated by terrain and access:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Slope &gt;5% adds $10-30k/MW (tracker piling complexity)</li>
        <li>Rocky / hard subsoil adds $15-40k/MW (driven piling vs concrete ballast)</li>
        <li>Limited water access for cleaning adds operational cost (not capex)</li>
      </ul>

      <H3>BESS — scale economies dominate</H3>
      <P>
        BESS constructability is less about terrain and more about scale. A 50 MW BESS at $300k/MW
        and a 200 MW BESS at $230k/MW reflect the scale economy — shared transformers,
        switchgear, EPC mobilisation costs amortised over more MW. A 50 MW BESS has fewer scale
        advantages, so per-MW capex is higher, but the project can be delivered faster (typically
        9-15 months vs 18-24 months for large-scale).
      </P>

      <H3>Hybrid — inherits the dominant technology</H3>
      <P>
        A 200 MW solar + 100 MW BESS hybrid inherits the solar constructability profile (since
        the solar field dominates the physical footprint). A 50 MW wind + 100 MW BESS hybrid
        inherits the wind constructability profile (since wind dominates the supply-chain
        complexity).
      </P>

      <H2>Community — the social licence dimension</H2>
      <P>
        Community fundamentals are harder to quantify but can be approximated from public
        sources:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Planning approval history</Em> — has the local IPC (NSW) or planning panel
          approved comparable projects without objection in the last 5 years? Approval rate by
          panel is published</li>
        <li><Em>Submissions received</Em> — projects receiving &gt;50 negative submissions are
          materially higher-risk than projects receiving &lt;15</li>
        <li><Em>Local Council position</Em> — local government submissions matter even when
          formal authority is state-level</li>
        <li><Em>Traditional owner engagement</Em> — under the EII Act (NSW) and increasingly
          elsewhere, executed APP commitments are public</li>
        <li><Em>Heritage and cultural overlays</Em> — projects in or near declared cultural
          areas face elevated risk</li>
      </ul>
      <Callout type="info">
        The First Nations Clean Energy Network's "From Commitment to Delivery" tracker has
        emerged as the leading public source for community-engagement quality scoring on
        CIS-backed projects. Projects without First Nations APP publication 6+ months after
        award score as bottom-quartile on community fundamentals.
      </Callout>

      <H2>Offtake — the bankability gate</H2>
      <P>
        Offtake availability scoring centres on three questions:
      </P>
      <Table
        emphasizeFirst
        headers={['Question', 'Top-quartile signal', 'Bottom-quartile signal']}
        rows={[
          ['CIS / LTESA awarded?', 'Executed CISA with signed offtake', 'Round awarded but no execution 12+ months later'],
          ['Corporate PPA optionality', 'Large state-based corporate buyer base, multiple inbound enquiries', 'Project at saturated REZ; corporate PPA market thin'],
          ['24/7 CFE compatibility', 'Hybrid configuration; data centre adjacency', 'Solar-only project, far from data centre demand'],
        ]}
      />
      <P>
        Detailed coverage of the PPA market is in the{' '}
        <Link to="/learn/ppas" className="text-[var(--color-primary)] hover:underline">
          PPAs for Renewable Projects
        </Link>{' '}
        module; CIS / LTESA awards and execution status are tracked live on the{' '}
        <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
          AURES Scheme Tracker
        </Link>.
      </P>

      <H2>Developer — the execution-risk dimension</H2>
      <P>
        Developer track record can be reconstructed from public sources:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Previous projects delivered to COD</Em> — count and capacity. A first-time
          developer scores bottom; a developer with 1+ GW operating scores top.</li>
        <li><Em>CIS execution rate</Em> — for developers with multiple CIS-awarded projects,
          the rate at which they've executed within target windows.</li>
        <li><Em>Capital base</Em> — listed parent, large infrastructure fund, family office,
          or first-time platform.</li>
        <li><Em>Equity / debt access</Em> — established lender relationships, prior refinancings
          executed.</li>
      </ul>
      <Callout type="numbers">
        <strong>Worked example — scoring developer track record:</strong>
        <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
          <li><Em>Score 5</Em> — Neoen, Lightsource bp, RES, Tilt Renewables (renamed), Akaysha (BlackRock-backed)</li>
          <li><Em>Score 4</Em> — Edify Energy, Genex, Octopus, Adamantem-backed platforms</li>
          <li><Em>Score 3</Em> — Mid-size developer with 200–500 MW delivered to COD</li>
          <li><Em>Score 2</Em> — Single-project platform with planning approval but no construction record</li>
          <li><Em>Score 1</Em> — First-time developer or distressed platform</li>
        </ul>
      </Callout>

      <Callout type="key">
        The four softer categories average ~30% of the overall weight but commonly determine
        whether a top-fundamentals project actually reaches COD. A 5/5 resource + 5/5 connection
        project with a 2/5 developer and 2/5 community will struggle to finance; the lender
        diligence will flag the soft categories even if the hard ones are pristine.
      </Callout>

      <Callout type="source">
        Sources: AEMC market design submissions · NSW IPC determinations and submission databases ·
        First Nations Clean Energy Network <em>From Commitment to Delivery</em> ·
        AURES Scheme Tracker (CIS/LTESA execution data) · ASX-listed developer half-yearly
        reports · BloombergNEF developer track record analysis · CEFC investment principles ·
        Norton Rose Fulbright development-risk practice notes.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 12 — The scoring framework (worked example)
// ============================================================

function Lesson12() {
  return (
    <div>
      <H2>From five categories to one quartile rank</H2>
      <P>
        Lessons 8–11 covered each category individually. This lesson synthesises them into a
        single quartile rank. The rubric is deliberately simple: a 1–5 score per category,
        weighted, summed, and mapped to a quartile band. Simplicity is a feature — the framework
        survives diligence-room scrutiny because every input is traceable.
      </P>

      <H2>The composite formula</H2>
      <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-4 my-4 font-mono text-sm leading-relaxed">
        <p>
          Composite = (Resource × W₁) + (Connection × W₂) + (Offtake × W₃) +<br />
          {' '.repeat(12)} (Developer × W₄) + (Constructability/Community × W₅)
        </p>
        <p className="mt-3">
          where Wᵢ sums to 1.0 and defaults to 0.25 / 0.25 / 0.20 / 0.15 / 0.15.
        </p>
      </div>

      <H2>Quartile mapping</H2>
      <Table
        emphasizeFirst
        headers={['Composite score', 'Quartile band', 'Interpretation']}
        rows={[
          ['4.0 – 5.0', 'Top quartile', 'Best-in-class development project; minimal compromises across fundamentals'],
          ['3.0 – 3.99', 'Upper-middle', 'Solid project with 1–2 below-average categories; addressable if mid-quartile categories are the soft ones'],
          ['2.0 – 2.99', 'Lower-middle', 'Multiple categories below median; valuation reflects discount'],
          ['Below 2.0', 'Bottom quartile', 'Material weaknesses across the fundamentals; questionable bankability'],
        ]}
      />

      <H2>Worked example — three NSW projects compared</H2>
      <P>
        Three hypothetical NSW solar projects (200 MW each, late-development stage). Scored on
        all five categories with the default weights:
      </P>
      <Table
        emphasizeFirst
        headers={['Category', 'Weight', 'Project A', 'Project B', 'Project C']}
        rows={[
          ['Resource quality',           '25%', '4 (GHI 1,750)', '4 (GHI 1,720)', '5 (GHI 1,820)'],
          ['Connection quality',         '25%', '4 (MLF 0.91, modest pipeline)', '2 (MLF 0.82, heavy pipeline)', '3 (MLF 0.87, moderate pipeline)'],
          ['Offtake availability',       '20%', '5 (CISA executed)', '3 (CIS-awarded, no execution)', '2 (no scheme; thin PPA market)'],
          ['Developer track record',     '15%', '5 (Lightsource bp)', '4 (Edify Energy)', '2 (first-time)'],
          ['Constructability + community','15%', '4 (gentle terrain, low submissions)', '3 (acceptable)', '3 (some heritage overlay)'],
          ['Composite score',            '—',   <strong key="a">4.40</strong>, <strong key="b">2.95</strong>, <strong key="c">3.20</strong>],
          ['Quartile band',              '—',   'Top quartile', 'Lower-middle', 'Upper-middle (just)'],
        ]}
      />
      <P>
        Reading the result:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project A</Em>: top quartile across the board. The CISA execution plus strong
          developer plus stable connection lift this to 4.4 — clearly a candidate for premium
          $/MW pricing.</li>
        <li><Em>Project B</Em>: the connection-quality drag (saturated REZ, declining MLF) plus
          no executed offtake puts it bottom-of-the-middle. Until the CIS execution lands, the
          project's valuation should reflect the offtake risk.</li>
        <li><Em>Project C</Em>: the strongest resource in the group, but no offtake and an
          inexperienced developer creates a "good site, wrong owner" dynamic. Strategic buyers
          may acquire this project rather than the developer.</li>
      </ul>

      <H2>What the score does NOT capture</H2>
      <Callout type="warn">
        Three things the framework deliberately leaves out:
        <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-[var(--color-text-muted)]">
          <li><Em>Force-majeure exposure</Em> — cyclone, fire, flood. Flag separately when
            material.</li>
          <li><Em>Technology obsolescence</Em> — e.g. a 1-hour BESS in a market that shifts to
            4-hour minimum firming. Flag as a deduction when the technology spec is at risk.</li>
          <li><Em>Counterparty concentration</Em> — if all offtake risk sits with one buyer,
            the project's score is overstated. The composite framework treats offtake as a
            scalar; concentration risk needs a separate flag.</li>
        </ul>
      </Callout>

      <H2>Handling missing data</H2>
      <P>
        Most development-stage projects have data gaps. Rules of thumb:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Missing resource data</Em> — score 2.5 (penalised for absence of measurement)
          until on-site data is collected</li>
        <li><Em>Missing MLF history</Em> — use the nearest comparable connection point's trajectory</li>
        <li><Em>No offtake yet</Em> — score 2.0 (well-positioned for CISA/PPA but not yet
          executed) for late-stage development; lower for early-stage</li>
        <li><Em>Unknown developer (e.g. SPV with shadow ownership)</Em> — score 2.0 until parent
          ownership disclosed</li>
        <li><Em>Pre-DA project</Em> — score 2.0 on community pending submission outcome</li>
      </ul>

      <H2>Re-scoring over time</H2>
      <P>
        The framework is dynamic. A project scored at 3.2 at planning-lodgement stage might re-score
        to 4.1 at FID (resource data validated, CISA executed, developer track record now informed
        by execution). Or it might re-score to 2.8 (MLF declined faster than expected, planning
        approval delayed). The cadence: re-score at every major development gate.
      </P>

      <H2>Onward — Part C and the interactive tool</H2>
      <Callout type="info">
        Part B has covered the framework conceptually. Lessons 13 (the interactive valuation tool,
        coming in v2.97.0) and 14 (how the framework adapts for ESEM, 24/7 CFE, and the
        data-centre demand surge) close the module. The tool will let you input or auto-detect
        the five category scores for any operational or development project, and output the
        composite score, quartile rank, and pros/cons narrative — for direct insertion into
        diligence outputs.
      </Callout>

      <Callout type="source">
        Sources: AURES framework (this module, lessons 1–11) · BloombergNEF asset valuation
        methodology · Norton Rose Fulbright project finance practice notes · CEFC investment
        principles · Macquarie Infrastructure investor day materials · Allens, KWM, HSF Kramer
        legal commentary on renewable project diligence.
      </Callout>
    </div>
  )
}
// ============================================================
// Lesson 13 — The interactive valuation tool
// ============================================================

type Tech = 'wind' | 'solar' | 'bess' | 'hybrid'

const TECH_WEIGHTS: Record<Tech | 'default', [number, number, number, number, number]> = {
  default: [0.25, 0.25, 0.20, 0.15, 0.15],
  wind:    [0.30, 0.20, 0.20, 0.15, 0.15],
  solar:   [0.20, 0.30, 0.20, 0.15, 0.15],
  bess:    [0.15, 0.30, 0.25, 0.15, 0.15],
  hybrid:  [0.22, 0.25, 0.23, 0.15, 0.15],
}

const CATEGORY_LABELS = [
  'Resource quality',
  'Connection quality',
  'Offtake availability',
  'Developer track record',
  'Constructability + community',
] as const

interface Preset {
  label: string
  notes: string
  scores: [number, number, number, number, number]   // 1-5 each
}

const PRESETS: Preset[] = [
  {
    label: 'Top-quartile NSW wind farm — CISA-backed',
    notes: 'Strong CF site + signed CISA + Tier-1 developer + stable MLF on a moderately-loaded REZ.',
    scores: [5, 4, 5, 5, 4],
  },
  {
    label: 'Saturated REZ solar project — pre-FID',
    notes: 'Excellent GHI but in a heavily-saturated REZ. CIS-awarded but not executed. Mid-tier developer. Light community opposition.',
    scores: [5, 2, 3, 4, 3],
  },
  {
    label: 'First-time developer, strong site',
    notes: 'Top resource and connection but the developer has not delivered any project to COD. No offtake yet.',
    scores: [5, 4, 2, 1, 3],
  },
  {
    label: 'Mid-merit hybrid (solar+BESS)',
    notes: 'Good resource, declining MLF in a wind-heavy REZ, signed corporate VPPA, established hybrid developer.',
    scores: [4, 3, 4, 4, 3],
  },
  {
    label: 'DNSP-connected BESS',
    notes: 'Smaller-scale BESS at a distribution node. Strong MLF, no scheme backing yet, well-known sponsor.',
    scores: [3, 4, 3, 5, 4],
  },
  {
    label: 'Bottom-quartile — multiple issues',
    notes: 'Mediocre site, heavy congestion, no offtake, untested developer, active community opposition.',
    scores: [2, 2, 1, 2, 1],
  },
  {
    label: 'Manual entry (start neutral)',
    notes: 'Adjust each slider yourself.',
    scores: [3, 3, 3, 3, 3],
  },
]

const SCORE_COLOR = (s: number) =>
  s >= 4.5 ? '#10b981' :   // emerald — best-in-class
  s >= 3.5 ? '#3b82f6' :   // blue — above average
  s >= 2.5 ? '#f59e0b' :   // amber — median
  s >= 1.5 ? '#fb923c' :   // orange — below average
             '#ef4444'      // red — bottom tier

function quartileBand(composite: number): { label: string; color: string; description: string } {
  if (composite >= 4.0) return { label: 'Top quartile', color: '#10b981', description: 'Best-in-class — minimal compromises across fundamentals.' }
  if (composite >= 3.0) return { label: 'Upper-middle', color: '#3b82f6', description: 'Solid project with 1–2 below-average categories.' }
  if (composite >= 2.0) return { label: 'Lower-middle', color: '#f59e0b', description: 'Multiple categories below median; valuation reflects discount.' }
  return                       { label: 'Bottom quartile', color: '#ef4444', description: 'Material weaknesses across the fundamentals; questionable bankability.' }
}

function generateNarrative(scores: [number, number, number, number, number]): { pros: string[]; cons: string[] } {
  const pros: string[] = []
  const cons: string[] = []
  const checks: { idx: number; metric: string; proAt: number; conAt: number; proText: string; conText: string }[] = [
    {
      idx: 0, metric: 'Resource quality', proAt: 4, conAt: 2,
      proText: 'Top-quartile resource — capacity factor / GHI / spread potential well above cohort median; the foundational driver of long-run value.',
      conText: 'Sub-median resource — the project is structurally disadvantaged on the only fundamental that cannot be improved later.',
    },
    {
      idx: 1, metric: 'Connection quality', proAt: 4, conAt: 2,
      proText: 'Strong connection — stable or improving MLF, modest pipeline congestion, defensible position into the next decade.',
      conText: 'Connection-quality drag — declining MLF and/or heavy upstream pipeline. Forward NPV materially exposed to network risk.',
    },
    {
      idx: 2, metric: 'Offtake', proAt: 4, conAt: 2,
      proText: 'Offtake is in hand or close — CISA executed (or near-execution) and/or strong corporate PPA optionality. Bankability gate cleared.',
      conText: 'No firm offtake — neither CIS/LTESA execution nor a deep corporate PPA pipeline. The single largest pre-FID risk.',
    },
    {
      idx: 3, metric: 'Developer', proAt: 4, conAt: 2,
      proText: 'Top-tier developer — established Australian renewables platform with multiple operating projects and a strong CIS execution record.',
      conText: 'Developer risk — limited operating record or a thin balance sheet. Execution probability is the binding constraint.',
    },
    {
      idx: 4, metric: 'Constructability + community', proAt: 4, conAt: 2,
      proText: 'Buildable and well-engaged — moderate terrain, established supply chain, low submission count, supportive councils.',
      conText: 'Construct/community drag — terrain or supply chain risk plus elevated planning-submission opposition.',
    },
  ]
  for (const c of checks) {
    const s = scores[c.idx]
    if (s >= c.proAt) pros.push(c.proText)
    else if (s <= c.conAt) cons.push(c.conText)
  }
  if (pros.length === 0) pros.push('No category scored top-quartile. Treat this project as median or below until at least one category improves.')
  if (cons.length === 0) cons.push('No category scored bottom-tier — but all valuations should pressure-test the highest-scoring categories before pricing the project.')
  return { pros, cons }
}

function ScoringTool() {
  const [tech, setTech] = useState<Tech | 'default'>('default')
  const [presetIdx, setPresetIdx] = useState(0)
  const [scores, setScores] = useState<[number, number, number, number, number]>(PRESETS[0].scores)

  const onPresetChange = useCallback((i: number) => {
    setPresetIdx(i)
    setScores(PRESETS[i].scores)
  }, [])

  const updateScore = useCallback((idx: number, v: number) => {
    setScores(prev => {
      const next: [number, number, number, number, number] = [...prev] as [number, number, number, number, number]
      next[idx] = v
      return next
    })
    // Switch to manual once any score is edited away from preset
    setPresetIdx(PRESETS.length - 1)
  }, [])

  const weights = TECH_WEIGHTS[tech]

  const composite = useMemo(() => {
    let s = 0
    for (let i = 0; i < 5; i++) s += scores[i] * weights[i]
    return s
  }, [scores, weights])

  const band = quartileBand(composite)
  const narrative = useMemo(() => generateNarrative(scores), [scores])

  const chartData = useMemo(() => CATEGORY_LABELS.map((label, i) => ({
    category: label.split(' ').slice(0, 2).join(' '),   // shorten for axis
    score: scores[i],
    weight: weights[i],
    weighted: Number((scores[i] * weights[i]).toFixed(2)),
  })), [scores, weights])

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 my-4 space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">Technology — sets the weights</label>
          <select
            value={tech}
            onChange={(e) => setTech(e.target.value as Tech | 'default')}
            className="w-full text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)]"
          >
            <option value="default">Default (25/25/20/15/15) — cross-technology</option>
            <option value="wind">Wind (30/20/20/15/15)</option>
            <option value="solar">Solar (20/30/20/15/15)</option>
            <option value="bess">BESS (15/30/25/15/15)</option>
            <option value="hybrid">Hybrid (22/25/23/15/15)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">Preset — or start from manual</label>
          <select
            value={presetIdx}
            onChange={(e) => onPresetChange(parseInt(e.target.value, 10))}
            className="w-full text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)]"
          >
            {PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)] italic">{PRESETS[presetIdx].notes}</p>

      {/* Per-category sliders */}
      <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
        {CATEGORY_LABELS.map((label, i) => (
          <div key={label} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 sm:items-center">
            <div>
              <p className="text-xs font-semibold text-[var(--color-text)]">{label}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Weight: {(weights[i] * 100).toFixed(0)}%</p>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={scores[i]}
              onChange={(e) => updateScore(i, parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-[var(--color-bg-elevated)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
            />
            <span className="font-mono text-sm font-semibold" style={{ color: SCORE_COLOR(scores[i]) }}>
              {scores[i]} / 5
            </span>
          </div>
        ))}
      </div>

      {/* Output — composite + quartile + chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[var(--color-border)]">
        <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Composite score</p>
          <p className="text-3xl font-bold" style={{ color: band.color }}>{composite.toFixed(2)}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">out of 5.00</p>
        </div>
        <div className="md:col-span-2 rounded-lg p-3 border-2" style={{ borderColor: band.color + '50', backgroundColor: band.color + '12' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: band.color }}>Quartile band</p>
          <p className="text-xl font-bold mt-1" style={{ color: band.color }}>{band.label}</p>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-1">{band.description}</p>
        </div>
      </div>

      {/* Per-category bar chart */}
      <div className="bg-[var(--color-bg-elevated)]/40 rounded-lg p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          Per-category contribution (score × weight)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} interval={0} angle={-12} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} domain={[0, 5]} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgb(15,23,42)', border: '1px solid rgb(51,65,85)', borderRadius: 8, fontSize: 11 }}
              formatter={(_value, _name, item) => {
                const p = item?.payload as { score: number; weight: number; weighted: number }
                return [`${p.score} × ${(p.weight * 100).toFixed(0)}% = ${p.weighted.toFixed(2)}`, 'Contribution']
              }}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={SCORE_COLOR(d.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Narrative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-2">Strengths</p>
          <ul className="text-xs text-[var(--color-text)] leading-relaxed space-y-1.5 list-disc list-inside">
            {narrative.pros.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-2">Risks / weaknesses</p>
          <ul className="text-xs text-[var(--color-text)] leading-relaxed space-y-1.5 list-disc list-inside">
            {narrative.cons.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Lesson13() {
  return (
    <div>
      <H2>Apply the framework — interactively</H2>
      <P>
        Lessons 1–12 built the framework category by category. This lesson collapses the whole
        thing into a single working tool. Pick a technology (which sets the weights per Lesson 8),
        choose a preset or score from scratch, and watch the composite + quartile + narrative
        update live. The same tool serves three audiences:
      </P>
      <Table
        emphasizeFirst
        headers={['Audience', 'How to use', 'What to take away']}
        rows={[
          ['Developer pitching a project', 'Score honestly per category; iterate until you understand which categories are dragging', 'Where to focus pre-FID effort'],
          ['Investor comparing pipeline', 'Score several candidates with the same weighting and rank by composite', 'Top-quartile candidates surface; bottom-tier flagged'],
          ['Asset manager — operational asset', 'Score with operational data (CF percentile → resource; MLF trend → connection)', 'Whether the asset is still top-quartile vs. when it was acquired'],
        ]}
      />

      <H2>The tool</H2>
      <ScoringTool />

      <H2>Reading the output</H2>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Composite ≥ 4.0</Em> — top quartile. Pricing premium justified.</li>
        <li><Em>3.0–4.0</Em> — upper-middle. Solid project; the cons are usually addressable.</li>
        <li><Em>2.0–3.0</Em> — lower-middle. Material weaknesses; valuation reflects discount.</li>
        <li><Em>Below 2.0</Em> — bottom quartile. Questionable bankability without a structural change.</li>
      </ul>
      <P>
        The per-category bar chart shows where the composite is concentrated. A project at 3.5
        composite driven by 5s in resource and offtake (with 1s in developer and community) is a
        different proposition from a project at 3.5 driven by balanced 3.5s across every category.
        The first is "execution-risk strong" — buy it under a sponsor that can execute. The
        second is "average across the board" — the price should reflect the lack of any standout.
      </P>

      <H2>Using the tool with real data — quick recipes</H2>

      <H3>Operating wind farm</H3>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Visit the project's AURES{' '}
          <Link to="/projects?tech=wind&status=operating" className="text-[var(--color-primary)] hover:underline">
            Wind Value Analysis page
          </Link>
          {' '}— note the data confidence badge and grade chip.</li>
        <li><Em>Resource</Em>: read the CF percentile from the Peers tab. Top decile → 5, top quartile → 4, etc.</li>
        <li><Em>Connection</Em>: read the MLF trend from the Trend tab. Stable/improving → 4-5; falling 0.5–1pp/yr → 3; falling &gt;1pp/yr → 2.</li>
        <li><Em>Offtake</Em>: known PPA / CISA → 4-5; merchant tail → 2-3.</li>
        <li><Em>Developer</Em>: known parent (Neoen, AGL, Tilt etc.) — assign per Lesson 11 anchors.</li>
        <li><Em>Constructability + community</Em>: usually 3-4 once operating (settled).</li>
      </ol>

      <H3>Development project (pre-FID)</H3>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Resource</Em>: on-site measurement &gt; 12 months → 4-5; reanalysis-only → 2-3.</li>
        <li><Em>Connection</Em>: use Lesson 10's interactive — look up the connection point's MLF history + pipeline.</li>
        <li><Em>Offtake</Em>: CIS-executed → 5; CIS-awarded not executed → 3-4; eligible only → 2-3.</li>
        <li><Em>Developer</Em>: Tier-1 platform → 5; first-time → 1-2 (per Lesson 11).</li>
        <li><Em>Constructability + community</Em>: terrain + IPC submission count proxies → see Lesson 11.</li>
      </ol>

      <Callout type="key">
        The tool's value is not in the absolute composite — it's in the <Em>relative</Em> ranking
        when you score multiple candidates with the same weighting. For an investor with a 10-
        project pipeline, scoring all 10 in the tool surfaces the top three within 30 minutes —
        and reveals which categories drive the gap.
      </Callout>

      <Callout type="info">
        <strong>Data integration roadmap.</strong> The current version uses presets to demonstrate
        the framework. A future enhancement (not committed to a release yet) would pull
        operational metrics live from the AURES project pages — auto-detecting CF percentile
        (Resource), MLF trend (Connection), and known offtake / developer status. Until then,
        the manual / preset workflow is the supported path.
      </Callout>

      <Callout type="source">
        Sources: AURES framework (lessons 1–12 of this module) ·
        AURES per-project{' '}
        <Link to="/projects" className="text-[var(--color-primary)] hover:underline">Wind / Solar / BESS Value Analyses</Link>
        {' '}for operational metrics input · AURES{' '}
        <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">Scheme Tracker</Link>
        {' '}for offtake status.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 14 — How this changes (ESEM, 24/7 CFE, data centre surge)
// ============================================================

function Lesson14() {
  return (
    <div>
      <H2>The framework is forward-compatible — but the weights are not</H2>
      <P>
        The five fundamentals — resource, connection, offtake, developer, constructability +
        community — describe the persistent structure of what makes a renewable project work.
        That taxonomy is durable. The <Em>weights</Em>, on the other hand, reflect the market
        regime in which the project will operate. As the NEM transitions through ESEM, 24/7
        carbon-free PPA expansion, and the data-centre demand surge, the regime shifts and the
        weights should shift with it.
      </P>
      <P>
        Three forces are most likely to re-shape the weights between 2026 and 2030.
      </P>

      <H2>Force 1 — ESEM replaces CIS as the underwriting layer</H2>
      <P>
        ESEM (covered in detail in the{' '}
        <Link to="/learn/summing-it-up/esem" className="text-[var(--color-primary)] hover:underline">
          Summing It Up module, Lesson 5
        </Link>
        ) replaces project-by-project bespoke CISAs with three standardised, fungible derivative
        contracts. The implications for the framework:
      </P>
      <Table
        emphasizeFirst
        headers={['Category', 'Pre-ESEM (2026)', 'Post-ESEM (2028+)']}
        rows={[
          ['Resource quality',           'Unchanged — physical resource is technology-agnostic to scheme', 'Unchanged'],
          ['Connection quality',         'Critical — CISA does not cover MLF erosion', 'Even more critical — ESEM\'s bulk energy contract pays clearing prices that are MLF-adjusted indirectly via cohort'],
          ['Offtake availability',       'CISA awarded / eligible binary', 'Three sub-questions: bulk energy, shaping, firming. Project-fit by technology matters more'],
          ['Developer track record',     'CIS execution rate is the proxy', 'ESEM auction-win rate becomes the new proxy. Tier-1 still wins disproportionately'],
          ['Constructability + community','Unchanged', 'Unchanged'],
        ]}
      />
      <P>
        Weight implications: <Em>Offtake category likely steps up to 23-25%</Em> (from 20%) as
        ESEM creates three offtake products instead of one CISA. The "offtake-fit by technology"
        question becomes nuanced — a BESS bidding into the firming auction needs a different
        offtake-fit assessment than a solar project bidding into the bulk energy auction.
      </P>

      <H2>Force 2 — 24/7 CFE PPA market matures</H2>
      <P>
        Hyperscaler-led 24/7 carbon-free PPA volume rose from ~$2-3B globally in 2023 to ~$8-12B
        in 2025. Australia is set to be a significant share of the 2027-2030 expansion —
        Microsoft, Google, AWS, plus domestic hyperscalers (NextDC, AirTrunk, CDC,
        Goodman/Brookfield) all pricing premium for shaped delivery. The framework implications:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Offtake premium becomes structurally tiered</Em>. The new top tier is
          hyperscaler 24/7 CFE PPAs at $110-140/MWh — only accessible to hybrid configurations.
          Pure solar drops a tier (corporate VPPA at $70-85). Wind sits in the middle.</li>
        <li><Em>Hybrid resource scoring becomes more nuanced</Em>. Today a hybrid is scored on
          blended resource. Under 24/7 CFE the score should reflect <Em>complementarity</Em>
          quality — how well the BESS shifts solar generation into the buyer's 24/7 demand
          shape.</li>
        <li><Em>Connection quality matters more for hybrids</Em>. The premium is conditional on
          delivering shape, which requires the BESS to discharge during peak hours — exactly
          when transmission constraints can bind.</li>
      </ul>
      <P>
        Weight implications: for hybrids specifically, the <Em>Resource category should sub-divide</Em>
        into "raw resource" (~15%) and "complementarity / shape fit" (~10%), preserving the 25%
        weight but reflecting that the BESS contribution to the offtake-shape match has joined
        the resource fundamental.
      </P>

      <H2>Force 3 — data-centre demand creates a connection-premium tier</H2>
      <P>
        The data-centre surge described in Summing It Up Scenario B creates concentrated demand
        nodes — Sydney metro, Melbourne metro, soon Brisbane and Perth. Projects connecting near
        these nodes capture both higher capture prices (less cannibalisation) and premium
        offtake structures (hyperscaler PPAs):
      </P>
      <Table
        emphasizeFirst
        headers={['Project location', 'Pre-data-centre weights', 'Post-data-centre weights (2028+)']}
        rows={[
          ['Near major DC cluster (Sydney W, Melbourne W)', '25/25/20/15/15', '20/30/25/15/10 — connection premium dominates'],
          ['Mid-distance (rural NSW REZ)', '25/25/20/15/15', '23/27/22/15/13 — modest premium for connection access'],
          ['Remote (Western Downs, Mid-North SA)', '25/25/20/15/15', '28/22/20/15/15 — resource becomes the only differentiator'],
        ]}
      />
      <P>
        The mechanism: as data centres absorb the best-located new generation at premium prices,
        merchant prices for residual generation rise <Em>further away</Em> from the demand nodes.
        Projects in those remote locations become more dependent on raw resource quality
        (since they cannot tap the connection premium). Projects near the demand nodes become
        more dependent on connection quality (since the offtake premium is conditional on
        delivering).
      </P>

      <H2>Re-scoring an existing project as the regime shifts</H2>
      <P>
        A NSW solar project scored top-quartile (4.2) in 2026 under default weights might re-score
        to 3.4 in 2030 under post-ESEM, post-DC-surge weights — without anything about the project
        itself changing. The framework would attribute the drop to:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The connection-quality category re-weighted higher (5pp) while the project's actual
          connection score has fallen as the REZ saturated</li>
        <li>The offtake category re-weighted higher (3pp) while the project's offtake has not
          shifted to 24/7 CFE-compatible</li>
        <li>The resource category re-weighted lower (5pp) — the score's contribution to composite
          falls even if the score itself is unchanged</li>
      </ul>
      <P>
        This is exactly why the framework <Em>requires periodic re-scoring</Em>. A top-quartile
        operational asset is top-quartile against the current regime, not against any future
        regime. Annual re-scoring is the recommended cadence; quarterly during regime transitions.
      </P>

      <Callout type="key">
        Three rules for using the framework through 2030:
        <ol className="list-decimal list-inside mt-2 ml-2 space-y-1 text-[var(--color-text-muted)]">
          <li><Em>Update weights yearly</Em> — track ESEM auction outcomes, hyperscaler PPA
            announcements, and AEMO ISP load forecasts. Update the technology-specific weights
            when any of these materially shift.</li>
          <li><Em>Re-score quarterly during regime transitions</Em> — 2026 H2 (ESEM pilot
            auctions), 2027 (formal ESEM commencement), 2028 (first ESEM-only awarded cohort
            reaching FID).</li>
          <li><Em>Keep the five-category taxonomy fixed</Em> — the categories are durable. Only
            the weights and the sub-metrics inside each category evolve.</li>
        </ol>
      </Callout>

      <H2>Closing — the role of AURES Intelligence</H2>
      <P>
        AURES Intelligence is built to be the live-data layer behind this framework. The per-
        project Value Analyses surface operational scores; the Scheme Tracker surfaces offtake
        status; the connection-point dataset (now in Lesson 10's interactive) tracks MLF
        trajectories; the Boardroom briefing reframes any of these for executive review. As ESEM
        rolls out, AURES adds: ESEM auction clearing prices, ESEM contract-by-technology
        eligibility, hyperscaler PPA announcements, and data-centre approval tracking. The
        framework's outputs become live by being plugged into these data feeds rather than
        hand-entered each time.
      </P>

      <Callout type="info">
        <strong>End of module.</strong> The 14-lesson <em>Valuing Renewable Projects</em>{' '}
        framework is now complete. Use it as a working tool — re-score quarterly, watch the
        weights evolve as the regime shifts, and pressure-test the highest-scoring categories
        before committing capital. The framework is opinionated, defensible, and (most
        importantly) data-traceable: every input lives in a public dataset somewhere, and the
        composite score has a transparent derivation that survives diligence-room scrutiny.
      </Callout>

      <Callout type="source">
        Sources: Nelson Review Final Report (NEM Wholesale Market Settings Review, Dec 2025) ·
        Energy Synapse <em>ESEM explained</em> · Modo Energy <em>Nelson Review BESS impact</em> ·
        AURES{' '}
        <Link to="/learn/summing-it-up/esem" className="text-[var(--color-primary)] hover:underline">Summing It Up — ESEM</Link>
        {' '}and{' '}
        <Link to="/learn/summing-it-up/scenario-b" className="text-[var(--color-primary)] hover:underline">Scenario B</Link>
        {' '}· Goldman Sachs <em>Global AI Infrastructure Outlook</em> 2026 · BloombergNEF Australia ETO ·
        AEMO ISP 2024 and forthcoming ISP 2026.
      </Callout>
    </div>
  )
}

// ============================================================
// Module shell — index + per-lesson view
// ============================================================

function ModuleIndex({ progress, onMark }: {
  progress: Set<string>
  onMark: (id: string, done: boolean) => void
}) {
  const builtMin = LESSONS.filter(l => l.built).reduce((s, l) => s + parseInt(l.readingTime, 10), 0)
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div>
        <Link to="/learn" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← Learning modules
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mt-2 mb-1">
          Valuing Renewable Projects — Top-Quartile Analysis
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          A 14-lesson framework for scoring renewable assets — operational or in-development — against
          fundamentals. Part A (lessons 1–6) covers operational valuation; Part B (7–12, coming in v2.96.0)
          covers development-stage valuation; Part C (13–14, v2.97.0) ties them together with an
          interactive scoring tool.
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          Currently built: {LESSONS.filter(l => l.built).length} of {LESSONS.length} lessons (~{builtMin} min).
        </p>
      </div>

      <div className="space-y-2">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          const isBuilt = l.built
          if (!isBuilt) {
            return (
              <div
                key={l.id}
                className="flex items-start gap-3 p-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)]/40 opacity-60"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                  {l.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-1">{l.title}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{l.subtitle}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1 italic">Coming in v2.97.0</p>
                </div>
              </div>
            )
          }
          return (
            <Link
              key={l.id}
              to={`/learn/valuing-projects/${l.id}`}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                done
                  ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                  : 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]/30'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
              }`}>
                {done ? '✓' : l.number}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">{l.title}</h3>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{l.subtitle}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{l.readingTime}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="text-xs text-[var(--color-text-muted)] text-center py-4">
        {LESSONS.filter(l => progress.has(l.id)).length} of {LESSONS.filter(l => l.built).length} built lessons read.
        {' '}
        <button onClick={() => { LESSONS.forEach(l => onMark(l.id, false)) }}
          className="text-[var(--color-primary)] hover:underline">
          Reset progress
        </button>
      </div>
    </div>
  )
}

function LessonView({ lesson, onComplete }: {
  lesson: LessonMeta
  onComplete: (id: string) => void
}) {
  const navigate = useNavigate()
  const builtLessons = LESSONS.filter(l => l.built)
  const idx = builtLessons.findIndex(l => l.id === lesson.id)
  const prev = idx > 0 ? builtLessons[idx - 1] : null
  const next = idx >= 0 && idx < builtLessons.length - 1 ? builtLessons[idx + 1] : null

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div>
        <Link to="/learn/valuing-projects" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← Valuing Renewable Projects
        </Link>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="text-[var(--color-text-muted)]">Lesson {lesson.number} of {LESSONS.length} · {lesson.readingTime}</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mt-1">
          {lesson.title}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{lesson.subtitle}</p>
      </div>

      <div>
        {lesson.id === 'asset-manager-job' && <Lesson1 />}
        {lesson.id === 'data-layer'        && <Lesson2 />}
        {lesson.id === 'metrics-by-tech'   && <Lesson3 />}
        {lesson.id === 'peer-comparison'   && <Lesson4 />}
        {lesson.id === 'forward-valuation' && <Lesson5 />}
        {lesson.id === 'presenting'        && <Lesson6 />}
        {lesson.id === 'dev-stages'        && <Lesson7 />}
        {lesson.id === 'fundamentals'      && <Lesson8 />}
        {lesson.id === 'resource-quality'  && <Lesson9 />}
        {lesson.id === 'connection'        && <Lesson10 />}
        {lesson.id === 'other-fundamentals' && <Lesson11 />}
        {lesson.id === 'scoring-framework' && <Lesson12 />}
        {lesson.id === 'interactive-tool'  && <Lesson13 />}
        {lesson.id === 'future-shifts'     && <Lesson14 />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/valuing-projects/${prev.id}`)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/valuing-projects/${next.id}`) }}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 transition-colors">
            Mark read + next → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/valuing-projects') }}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
            Mark read + back to index
          </button>
        )}
      </div>
    </div>
  )
}

export default function ValuingProjectsModule() {
  const { lessonId } = useParams<{ lessonId?: string }>()
  const [progress, setProgress] = useState<Set<string>>(loadProgress)

  const onMark = useCallback((id: string, done: boolean) => {
    setProgress(prev => {
      const next = new Set(prev)
      if (done) next.add(id); else next.delete(id)
      saveProgress(next)
      return next
    })
  }, [])

  const onComplete = useCallback((id: string) => onMark(id, true), [onMark])

  if (!lessonId) {
    return <ModuleIndex progress={progress} onMark={onMark} />
  }

  const lesson = LESSONS.find(l => l.id === lessonId)
  if (!lesson || !lesson.built) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          {lesson ? 'This lesson is not built yet — coming in a later version.' : 'Lesson not found.'}
        </p>
        <Link to="/learn/valuing-projects" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to Valuing Renewable Projects
        </Link>
      </div>
    )
  }
  return <LessonView lesson={lesson} onComplete={onComplete} />
}
