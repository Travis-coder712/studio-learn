import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-constraints-progress'

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
  { id: 'dispatch-problem', number: 1, title: 'Why Dispatch Is More Than a Bid Stack', subtitle: 'The problem constraints solve', readingTime: '6 min', built: true },
  { id: 'constraint-anatomy', number: 2, title: 'Anatomy of a Constraint Equation', subtitle: 'The LHS / RHS structure', readingTime: '8 min', built: true },
  { id: 'injection-shift-factors', number: 3, title: 'Injection Shift Factors', subtitle: 'Where the numbers come from', readingTime: '8 min', built: true },
  { id: 'constraint-types', number: 4, title: 'Types of Constraints', subtitle: 'Physical phenomena they model', readingTime: '7 min', built: true },
  { id: 'ids-and-sets', number: 5, title: 'Constraint IDs, Sets & Lifecycle', subtitle: 'How constraints get activated and decoded', readingTime: '7 min', built: true },
  { id: 'market-impacts', number: 6, title: 'Market Impacts: Shadow Prices & Congestion', subtitle: 'How binding constraints move spot prices', readingTime: '9 min', built: true },
  { id: 'data-access', number: 7, title: 'Working with Constraint Data', subtitle: 'Practical data access guide', readingTime: '6 min', built: true },
]

// ============================================================
// Shared UI primitives
// ============================================================

function Callout({ type, children }: { type: 'info' | 'warn' | 'key' | 'formula'; children: React.ReactNode }) {
  const styles = {
    info:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   label: 'Note' },
    warn:    { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  label: 'Important' },
    key:     { bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',text: 'text-emerald-400',label: 'Key Concept' },
    formula: { bg: 'bg-slate-800/60',  border: 'border-slate-600/40',  text: 'text-slate-300',  label: 'Formula' },
  }
  const s = styles[type]
  return (
    <div className={`${s.bg} border ${s.border} rounded-xl p-4 my-4`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${s.text} mb-2`}>{s.label}</p>
      <div className="text-sm text-[var(--color-text)] leading-relaxed">{children}</div>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-[var(--color-bg-elevated)] text-emerald-400 px-1.5 py-0.5 rounded text-[13px] font-mono">
      {children}
    </code>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-4 overflow-x-auto my-4">
      <code className="text-sm font-mono text-emerald-400 leading-relaxed whitespace-pre">{children}</code>
    </pre>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-[var(--color-text)] mt-8 mb-3 flex items-center gap-2">{children}</h2>
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-[var(--color-text)] mt-5 mb-2">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-3">{children}</p>
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
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
                <td key={j} className="p-3 text-xs text-[var(--color-text-muted)] leading-relaxed">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Lesson 1 — Why Dispatch Is More Than a Bid Stack
// ============================================================

function Lesson1() {
  const [showConstrained, setShowConstrained] = useState(false)

  const units = [
    { name: 'Gas A',   bid: 45,  capacity: 200, color: '#f97316' },
    { name: 'Coal',    bid: 30,  capacity: 300, color: '#64748b' },
    { name: 'Wind',    bid: 5,   capacity: 250, color: '#3b82f6' },
    { name: 'Solar',   bid: 0,   capacity: 400, color: '#f59e0b' },
    { name: 'Gas B',   bid: 85,  capacity: 150, color: '#ef4444' },
  ]
  const demand = 700
  const sorted = [...units].sort((a, b) => a.bid - b.bid)

  // Unconstrained: cheapest first up to demand
  let remaining = demand
  const unconstrained = sorted.map(u => {
    const dispatched = Math.min(u.capacity, remaining)
    remaining -= dispatched
    return { ...u, dispatched }
  })

  // Constrained: Solar limited to 150 MW due to network constraint
  const SOLAR_LIMIT = 150
  remaining = demand
  const constrained = sorted.map(u => {
    const cap = u.name === 'Solar' ? Math.min(u.capacity, SOLAR_LIMIT) : u.capacity
    const dispatched = Math.min(cap, remaining)
    remaining -= dispatched
    return { ...u, dispatched, capped: u.name === 'Solar' && u.capacity > SOLAR_LIMIT }
  })

  const display = showConstrained ? constrained : unconstrained
  const marginalUnit = [...display].reverse().find(u => u.dispatched > 0)
  const clearingPrice = marginalUnit ? marginalUnit.bid : 0

  return (
    <div className="space-y-2">
      <P>
        Most people picture electricity dispatch as a simple merit-order stack: generators offer their output at a price,
        the cheapest ones get dispatched first until demand is met, and the most expensive unit needed sets the spot price.
        This is correct as far as it goes — but it misses everything the physical network imposes.
      </P>

      <H2>Security-Constrained Economic Dispatch</H2>
      <P>
        AEMO's dispatch engine — NEMDE (National Electricity Market Dispatch Engine) — doesn't just find the cheapest
        combination of generation to meet demand. It finds the cheapest combination that also keeps the physical power
        system within safe operating limits. This is called <strong className="text-[var(--color-text)]">Security-Constrained Economic Dispatch (SCED)</strong>.
      </P>
      <P>
        SCED is a linear programming optimisation. Every 5 minutes it solves a problem with roughly:
      </P>
      <ul className="text-sm text-[var(--color-text-muted)] space-y-1 ml-4 mb-4 list-disc">
        <li>~300 decision variables (scheduled generator dispatch targets)</li>
        <li>~600–1,000 constraint equations (physical network limits)</li>
        <li>1 objective function (minimise total dispatch cost)</li>
      </ul>
      <P>
        The constraints are what make SCED different from a simple bid stack. Without them, NEMDE might dispatch a
        generator at full output even though doing so would overload a transmission line — causing real physical damage
        and potentially a cascading blackout.
      </P>

      <H2>What Happens Without Constraints?</H2>
      <P>
        When more power flows through a transmission line than its thermal rating allows, the conductor heats up. If the
        overload persists, the conductor sags, potentially touching vegetation or structures below. Protection systems
        then trip the line — suddenly removing a large amount of transfer capacity. The generators on the export side
        now have nowhere to send their power, and the load on the import side faces a shortfall. Other lines pick up the
        load, potentially overloading themselves in turn. This is <strong className="text-[var(--color-text)]">cascading failure</strong> — and it's how large-scale blackouts begin.
      </P>
      <P>
        Voltage stability and transient stability failures can happen even faster — some in under a second. Constraints
        prevent NEMDE from ever finding a dispatch solution that puts the system in a position where these failures
        could occur.
      </P>

      <H2>Interactive: Bid Stack vs Constrained Dispatch</H2>
      <P>
        The example below shows a simplified 5-unit system with 700 MW of demand. Toggle between unconstrained merit
        order and constrained dispatch (a network constraint limits solar output to 150 MW).
      </P>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 my-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowConstrained(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!showConstrained ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}
          >
            Merit Order (no constraints)
          </button>
          <button
            onClick={() => setShowConstrained(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showConstrained ? 'bg-amber-600 text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}
          >
            Constrained Dispatch (solar capped)
          </button>
        </div>

        <div className="space-y-2">
          {display.map((u) => {
            const isMarginal = u.name === marginalUnit?.name
            return (
              <div key={u.name} className="flex items-center gap-3">
                <div className="w-16 text-xs text-[var(--color-text-muted)] text-right shrink-0">{u.name}</div>
                <div className="flex-1 bg-[var(--color-bg-elevated)] rounded h-7 overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${(u.dispatched / 400) * 100}%`, backgroundColor: u.color, opacity: 0.85 }}
                  />
                  {Boolean('capped' in u && u.capped) && (
                    <div
                      className="absolute top-0 h-full border-r-2 border-amber-400 border-dashed"
                      style={{ left: `${(SOLAR_LIMIT / 400) * 100}%` }}
                    />
                  )}
                </div>
                <div className="w-24 text-xs text-right shrink-0">
                  <span className="text-[var(--color-text)]">{u.dispatched} MW</span>
                  <span className="text-[var(--color-text-muted)] ml-1">@ ${u.bid}</span>
                </div>
                {isMarginal && (
                  <span className="text-[10px] font-semibold text-amber-400 shrink-0">← sets price</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex flex-wrap gap-4 text-xs">
          <span className="text-[var(--color-text-muted)]">Clearing price: <strong className="text-[var(--color-text)]">${clearingPrice}/MWh</strong></span>
          <span className="text-[var(--color-text-muted)]">Demand: <strong className="text-[var(--color-text)]">700 MW</strong></span>
          {showConstrained && (
            <span className="text-amber-400 font-medium">Solar network constraint: 150 MW limit on this corridor</span>
          )}
        </div>

        {showConstrained && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-[var(--color-text-muted)]">
            With the solar corridor constrained to 150 MW, NEMDE must dispatch the expensive Gas B unit to meet demand.
            The clearing price rises from <strong className="text-amber-400">${unconstrained.find(u => [...unconstrained].reverse().find(v => v.dispatched > 0)?.name === u.name)?.bid ?? 45}/MWh to ${clearingPrice}/MWh</strong> —
            not because fuel costs changed, but because a physical network limit prevents the cheapest generation from reaching the load.
          </div>
        )}
      </div>

      <H2>The Scale of Real NEM Dispatch</H2>
      <P>
        The simple 5-unit example above had one constraint. The real NEM runs with{' '}
        <strong className="text-[var(--color-text)]">600–1,000 active constraint equations</strong> in every 5-minute dispatch
        interval. Each one represents a real physical limit somewhere on the 40,000+ km of transmission network.
        NEMDE solves this constrained optimisation in under 30 seconds, every 5 minutes, 24/7.
      </P>

      <Callout type="key">
        A constraint equation tells NEMDE: "the weighted sum of these generators' outputs must not exceed this limit."
        NEMDE finds the least-cost dispatch that satisfies all constraints simultaneously — this is what makes NEM
        dispatch far more complex than a simple merit-order bid stack.
      </Callout>

      <H2>Key Terms Introduced</H2>
      <Table
        headers={['Term', 'Meaning']}
        rows={[
          ['SCED', 'Security-Constrained Economic Dispatch — the optimisation NEMDE solves every 5 minutes'],
          ['NEMDE', 'National Electricity Market Dispatch Engine — AEMO\'s dispatch software'],
          ['Constraint equation', 'A linear inequality/equality that limits generator dispatch to keep the network safe'],
          ['Binding constraint', 'A constraint where the limit is actually reached — LHS equals RHS'],
          ['Marginal value', 'The shadow price of a binding constraint — how much dispatch cost changes per 1 MW relaxation'],
        ]}
      />
    </div>
  )
}

// ============================================================
// Lesson 2 — Anatomy of a Constraint Equation
// ============================================================

function Lesson2() {
  const [highlightRow, setHighlightRow] = useState<number | null>(null)

  const x5Terms = [
    { duid: 'LKBONNY1', name: 'Limondale 1 SF', cap: 220, factor: 1.000 },
    { duid: 'LKBONNY2', name: 'Limondale 2 SF', cap: 29,  factor: 1.000 },
    { duid: 'COPPABELLA1', name: 'Coppabella SF', cap: 115, factor: 0.952 },
    { duid: 'DARLINGTON1', name: 'Darlington Point SF', cap: 200, factor: 0.891 },
    { duid: 'TRANGIE1',  name: 'Trangie SF',    cap: 85,  factor: 0.743 },
    { duid: 'WHITROCK1', name: 'White Rock Wind', cap: 175, factor: 0.612 },
  ]
  const rhs = 630

  const exampleDispatch = [220, 29, 80, 140, 50, 120]
  const lhsValue = x5Terms.reduce((sum, t, i) => sum + t.factor * exampleDispatch[i], 0)
  const isBinding = lhsValue >= rhs * 0.99

  return (
    <div className="space-y-2">
      <P>
        Every constraint equation in the NEM follows the same mathematical structure. Once you can read one,
        you can read all of them — and understand exactly what physical limit is being enforced and which generators
        are contributing to it.
      </P>

      <H2>The General Form</H2>
      <Callout type="formula">
        <code className="font-mono text-emerald-400">
          F₁ × Q₁ + F₂ × Q₂ + … + Fₙ × Qₙ  ≤  RHS
        </code>
        <div className="mt-2 text-xs text-[var(--color-text-muted)] space-y-1">
          <div><span className="text-emerald-400">Fᵢ</span> = LHS factor (sensitivity coefficient — how much unit i contributes to the monitored element's flow)</div>
          <div><span className="text-emerald-400">Qᵢ</span> = dispatch quantity for unit i (MW of generation, interconnector flow, or FCAS enablement)</div>
          <div><span className="text-emerald-400">RHS</span> = the physical limit (line rating, stability limit, or dynamic SCADA value) — fixed for each dispatch interval</div>
        </div>
      </Callout>

      <P>
        The left-hand side (LHS) is a weighted sum of things NEMDE can control. The right-hand side (RHS) is a
        pre-calculated limit that NEMDE treats as fixed. NEMDE must find dispatch quantities{' '}
        <Code>Q₁…Qₙ</Code> such that this inequality (or equality) holds for every active constraint.
      </P>

      <H2>What Goes on the LHS?</H2>
      <P>Any entity whose output NEMDE controls can appear on the LHS:</P>
      <ul className="text-sm text-[var(--color-text-muted)] space-y-1 ml-4 mb-4 list-disc">
        <li><strong className="text-[var(--color-text)]">Scheduled and semi-scheduled generators</strong> — identified by DUID</li>
        <li><strong className="text-[var(--color-text)]">Scheduled loads</strong> and Wholesale Demand Response units</li>
        <li><strong className="text-[var(--color-text)]">Interconnectors</strong> (Heywood, QNI, VNI, Basslink, Murraylink)</li>
        <li><strong className="text-[var(--color-text)]">FCAS providers</strong> — separate terms for raise/lower ancillary services</li>
        <li><strong className="text-[var(--color-text)]">Regional net load</strong> — for regional surplus/deficit constraints</li>
      </ul>
      <P>
        Only entities with a factor ≥ 0.07 must appear on the LHS. Smaller factors are excluded as they have
        negligible influence on the monitored element's flow.
      </P>

      <H2>What Goes on the RHS?</H2>
      <P>The RHS is a single number for each dispatch interval, but it can be calculated in complex ways:</P>
      <Table
        headers={['RHS Source', 'Example', 'When Used']}
        rows={[
          ['Static line rating', '630 MW', 'Thermal limit from TNSP — same every interval'],
          ['Dynamic line rating', 'Varies with temperature/wind', 'Weather-dependent conductor cooling'],
          ['SCADA measurement', 'Actual metered flow from start of interval', '"Feedback constraints" — includes initial conditions'],
          ['Stability limit', 'Output of offline security studies', 'Voltage collapse, transient stability, oscillatory stability'],
          ['RPN expression', 'Complex formula combining multiple inputs', 'Constraints with multiple contributing factors in RHS'],
        ]}
      />
      <P>
        The RHS uses a <strong className="text-[var(--color-text)]">Reverse Polish Notation (RPN)</strong> calculation engine inside NEMDE.
        This allows arbitrarily complex expressions — for example, RHS = line rating minus existing metered flow on
        a parallel line. AEMO's <Code>GENERICCONSTRAINTRHS</Code> table stores these RPN terms.
      </P>

      <H2>The Three Operators</H2>
      <Table
        headers={['Operator', 'Meaning', 'Example Use']}
        rows={[
          ['≤ (LE)', 'LHS must not exceed RHS', 'Thermal limit — combined output must stay below line rating'],
          ['≥ (GE)', 'LHS must not fall below RHS', 'Minimum generation constraint — e.g. must run at least X MW for voltage support'],
          ['= (EQ)', 'LHS must exactly equal RHS', 'Equality constraint — rare, used for specific balancing requirements'],
        ]}
      />

      <H2>The Five MMS Tables</H2>
      <P>
        A constraint equation is not a single record — it's spread across five database tables in AEMO's Market
        Management System (MMS), each holding a different part of the definition:
      </P>
      <Table
        headers={['Table', 'Contents']}
        rows={[
          [<Code key="1">GENCONDATA</Code>, 'Master record: constraint ID, operator (≤/≥/=), type (THERMAL/VOLTAGE/STABILITY), which processes use it (DISPATCH/PREDISPATCH/ST PASA/MT PASA)'],
          [<Code key="2">SPDCONNECTIONPOINTCONSTRAINT</Code>, 'LHS factors for generators and loads, keyed by DUID + constraint ID + effective date'],
          [<Code key="3">SPDINTERCONNECTORCONSTRAINT</Code>, 'LHS factors for interconnectors'],
          [<Code key="4">SPDREGIONCONSTRAINT</Code>, 'LHS factors for regions (regional demand-type constraints)'],
          [<Code key="5">GENERICCONSTRAINTRHS</Code>, 'RHS calculation terms using RPN notation. Different scope (DS/PD/ST/MT) allows different limits for dispatch vs planning'],
        ]}
      />

      <H2>Interactive: The X5 Constraint (N^^N_NIL_3)</H2>
      <P>
        The N^^N_NIL_3 constraint — informally called the "X5 constraint" — limits combined output from a group of
        solar farms in southwest NSW to protect against voltage collapse following a contingency. Hover any row to
        see that unit's contribution to the LHS sum.
      </P>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 my-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[var(--color-text)]">N^^N_NIL_3 — SW NSW Voltage Stability</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBinding ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {isBinding ? 'BINDING' : 'NOT BINDING'}
          </span>
        </div>

        <div className="font-mono text-xs mb-3 text-[var(--color-text-muted)] flex flex-wrap gap-1 items-center">
          {x5Terms.map((t, i) => (
            <span key={t.duid}>
              <span
                className={`px-1 rounded cursor-pointer transition-colors ${highlightRow === i ? 'bg-blue-500/30 text-blue-300' : 'hover:bg-blue-500/10 text-[var(--color-text)]'}`}
                onMouseEnter={() => setHighlightRow(i)}
                onMouseLeave={() => setHighlightRow(null)}
              >
                {t.factor.toFixed(3)} × {exampleDispatch[i]}
              </span>
              {i < x5Terms.length - 1 && <span className="text-[var(--color-text-muted)]"> + </span>}
            </span>
          ))}
          <span className="text-[var(--color-text-muted)]"> ≤ </span>
          <span className="text-amber-400 font-bold">{rhs}</span>
        </div>

        <div className="space-y-1.5">
          {x5Terms.map((t, i) => {
            const contribution = t.factor * exampleDispatch[i]
            const pct = (contribution / rhs) * 100
            const isHl = highlightRow === i
            return (
              <div
                key={t.duid}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${isHl ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-[var(--color-bg-elevated)]/50'}`}
                onMouseEnter={() => setHighlightRow(i)}
                onMouseLeave={() => setHighlightRow(null)}
              >
                <div className="w-32 shrink-0">
                  <p className="text-[11px] font-medium text-[var(--color-text)] truncate">{t.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{t.duid} · {t.cap} MW</p>
                </div>
                <div className="w-14 text-right shrink-0 text-[11px] text-blue-400 font-mono">×{t.factor.toFixed(3)}</div>
                <div className="flex-1 bg-[var(--color-bg-elevated)] rounded h-4 overflow-hidden">
                  <div className="h-full bg-blue-500/60 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-20 text-right text-[11px] text-[var(--color-text-muted)] shrink-0">
                  {contribution.toFixed(1)} MW
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">
            LHS sum: <strong className="text-[var(--color-text)]">{lhsValue.toFixed(1)} MW</strong>
          </span>
          <span className="text-[var(--color-text-muted)]">
            RHS limit: <strong className="text-amber-400">{rhs} MW</strong>
          </span>
          <span className="text-[var(--color-text-muted)]">
            Headroom: <strong className={lhsValue < rhs ? 'text-emerald-400' : 'text-red-400'}>{(rhs - lhsValue).toFixed(1)} MW</strong>
          </span>
        </div>

        <p className="text-[10px] text-[var(--color-text-muted)] mt-2 italic">
          Example dispatch values for illustration. Real values change every 5-minute interval.
        </p>
      </div>

      <Callout type="key">
        The LHS factor (0.743 for Trangie, 1.000 for Limondale) represents how much of each generator's 1 MW
        output reaches the monitored transmission element. A factor of 1.0 means every MW produced flows through
        that element; 0.743 means 74.3% does. These are called <strong>Injection Shift Factors (ISFs)</strong> —
        covered in detail in Lesson 3.
      </Callout>

      <H2>The 0.07 Threshold</H2>
      <P>
        Any generator with an ISF below 0.07 is excluded from the LHS — their influence on the monitored element
        is too small to justify the complexity of including them. In December 2025 AEMO raised this threshold
        (previously lower) as part of ongoing constraint equation maintenance. If all LHS factors are very small,
        the entire equation is rescaled so that the largest absolute factor equals 1.0, with a maximum scaling
        factor of 30.
      </P>
    </div>
  )
}

// ============================================================
// Lesson 3 — Injection Shift Factors
// ============================================================

function Lesson3() {
  const [injection, setInjection] = useState(100)
  const [showPostCont, setShowPostCont] = useState(false)

  // 4-bus network: A—B—C—D in a loop, with a cross-link B—D
  // Line impedances (p.u.): AB=0.2, BC=0.3, CD=0.2, AD=0.4, BD=0.25
  // DC power flow gives ISFs relative to bus D (RRN)
  // Pre-contingency ISFs for injection at bus A (relative to D):
  //   Line AB: 0.71  Line BC: 0.43  Line AD: 0.29  Line BD: 0.28  Line CD: 0.43
  // Post-contingency (line BD removed):
  //   Line AB: 0.83  Line BC: 0.52  Line AD: 0.17  Line CD: 0.52

  const lines = showPostCont
    ? [
        { name: 'Line A–B', from: 'A', to: 'B', isf: 0.83, x: 50,  y: 80,  x2: 230, y2: 80  },
        { name: 'Line B–C', from: 'B', to: 'C', isf: 0.52, x: 230, y: 80,  x2: 340, y2: 200 },
        { name: 'Line C–D', from: 'C', to: 'D', isf: 0.52, x: 340, y: 200, x2: 140, y2: 200 },
        { name: 'Line A–D', from: 'A', to: 'D', isf: 0.17, x: 50,  y: 80,  x2: 140, y2: 200 },
      ]
    : [
        { name: 'Line A–B', from: 'A', to: 'B', isf: 0.71, x: 50,  y: 80,  x2: 230, y2: 80  },
        { name: 'Line B–C', from: 'B', to: 'C', isf: 0.43, x: 230, y: 80,  x2: 340, y2: 200 },
        { name: 'Line C–D', from: 'C', to: 'D', isf: 0.43, x: 340, y: 200, x2: 140, y2: 200 },
        { name: 'Line A–D', from: 'A', to: 'D', isf: 0.29, x: 50,  y: 80,  x2: 140, y2: 200 },
        { name: 'Line B–D', from: 'B', to: 'D', isf: 0.28, x: 230, y: 80,  x2: 140, y2: 200 },
      ]

  const buses = [
    { id: 'A', label: 'Bus A\n(Generator)', x: 50,  y: 80,  color: '#3b82f6' },
    { id: 'B', label: 'Bus B',               x: 230, y: 80,  color: '#64748b' },
    { id: 'C', label: 'Bus C',               x: 340, y: 200, color: '#64748b' },
    { id: 'D', label: 'Bus D\n(RRN)',         x: 140, y: 200, color: '#f59e0b' },
  ]

  return (
    <div className="space-y-2">
      <P>
        In Lesson 2, we saw that every LHS term has a factor — a number like 0.891 or 1.000. These factors don't
        come from nowhere. They are calculated from a power flow model of the transmission network, and are called
        <strong className="text-[var(--color-text)]"> Injection Shift Factors (ISFs)</strong> — or sometimes
        Generation Shift Factors or Power Transfer Distribution Factors (PTDFs).
      </P>

      <H2>What an ISF Measures</H2>
      <Callout type="formula">
        <code className="font-mono text-emerald-400">
          ISF(line ℓ, bus k) = ΔFlow(line ℓ) / ΔInjection(bus k)
        </code>
        <div className="mt-2 text-xs text-[var(--color-text-muted)]">
          The fraction of a 1 MW injection at bus k that flows through line ℓ.
          Relative to the Regional Reference Node (RRN) as the swing bus.
        </div>
      </Callout>

      <P>
        If a generator at bus A injects 1 MW and 0.71 MW of that flows through line A–B, then the ISF for
        (line A–B, bus A) is 0.71. This is the number that goes into the LHS of a constraint equation monitoring
        line A–B — for any generator connected at bus A.
      </P>

      <H2>The Swing Bus: Why the RRN Has ISF = 0</H2>
      <P>
        Every ISF is computed relative to a reference bus — the Regional Reference Node (RRN). The RRN is the
        "swing bus" in the DC power flow: it absorbs any imbalance. By definition, injecting 1 MW at the RRN
        causes zero additional flow on any line — all the power stays at the reference point. So any generator
        located at the RRN has LHS factor = 0 and does not appear in constraint equations.
      </P>
      <P>
        NEM RRNs: <Code>NSW1</Code> = Sydney West 330 kV, <Code>VIC1</Code> = Thomastown 66 kV,{' '}
        <Code>QLD1</Code> = South Pine 275 kV, <Code>SA1</Code> = Torrens Island 275 kV,{' '}
        <Code>TAS1</Code> = George Town 220 kV.
      </P>

      <H2>Why DC Power Flow?</H2>
      <P>
        The actual power system uses AC (alternating current), which means the full power flow equations are
        non-linear — they can't be used directly in a linear programme. AEMO uses a linearised DC power flow
        approximation that makes two simplifications:
      </P>
      <ul className="text-sm text-[var(--color-text-muted)] space-y-1 ml-4 mb-4 list-disc">
        <li>Voltage magnitudes are assumed constant (1.0 per unit throughout)</li>
        <li>Voltage angle differences are assumed small (so sin(θ) ≈ θ)</li>
      </ul>
      <P>
        Under these assumptions, real power flows become linear functions of nodal injections — exactly what you
        need for a linear programme. The DC approximation is accurate enough for constraint formulation while
        remaining computationally tractable.
      </P>

      <H2>Meshed Networks: Why ISF ≠ 1</H2>
      <P>
        In a <strong className="text-[var(--color-text)]">radial network</strong> (a simple chain of buses with no
        loops), every MW from a generator flows along the single path to load. The ISF for every line on that path
        is exactly 1.0.
      </P>
      <P>
        In a <strong className="text-[var(--color-text)]">meshed network</strong> (loops, parallel paths), power
        follows the path of least resistance. A 1 MW injection splits across multiple parallel routes according to
        their impedances. The ISF for each line reflects only its share of the flow — so ISFs are typically less
        than 1.0 in meshed networks.
      </P>

      <H2>Interactive: 4-Bus Network</H2>
      <P>
        The diagram below shows a simplified 4-bus meshed network. Bus A is the generator (injection point);
        Bus D is the RRN (swing bus). Use the slider to set the injection and see how 1 MW splits across the
        network. Toggle to see how ISFs change when line B–D is lost (post-contingency).
      </P>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 my-4">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">Injection at A:</span>
            <input
              type="range" min={10} max={200} step={10} value={injection}
              onChange={e => setInjection(Number(e.target.value))}
              className="w-28 accent-blue-500"
            />
            <span className="text-xs font-mono text-blue-400 w-16">{injection} MW</span>
          </div>
          <button
            onClick={() => setShowPostCont(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showPostCont ? 'bg-red-600/80 text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}
          >
            {showPostCont ? '⚡ Line B–D tripped (N-1)' : 'Trip Line B–D (N-1 contingency)'}
          </button>
        </div>

        {/* Network diagram */}
        <div className="relative mb-4" style={{ height: 280 }}>
          <svg width="100%" height="280" viewBox="0 0 420 280" className="overflow-visible">
            {/* Lines */}
            {lines.map(l => {
              const flow = l.isf * injection
              const thick = 1 + (l.isf * 4)
              return (
                <g key={l.name}>
                  <line x1={l.x} y1={l.y} x2={l.x2} y2={l.y2}
                    stroke="#1e40af" strokeWidth={thick} opacity={0.6} />
                  <text
                    x={(l.x + l.x2) / 2 + 8} y={(l.y + l.y2) / 2 - 6}
                    fontSize="10" fill="#94a3b8" textAnchor="middle"
                  >
                    {flow.toFixed(0)} MW
                  </text>
                  <text
                    x={(l.x + l.x2) / 2 + 8} y={(l.y + l.y2) / 2 + 8}
                    fontSize="9" fill="#475569" textAnchor="middle"
                  >
                    (ISF={l.isf.toFixed(2)})
                  </text>
                </g>
              )
            })}
            {/* Buses */}
            {buses.map(b => (
              <g key={b.id}>
                <circle cx={b.x} cy={b.y} r={22} fill={`${b.color}30`} stroke={b.color} strokeWidth={1.5} />
                <text x={b.x} y={b.y + 4} fontSize="13" fontWeight="700" fill={b.color} textAnchor="middle">{b.id}</text>
              </g>
            ))}
            <text x={50} y={112} fontSize="9" fill="#94a3b8" textAnchor="middle">Generator</text>
            <text x={140} y={232} fontSize="9" fill="#f59e0b" textAnchor="middle">RRN (swing)</text>
          </svg>
        </div>

        {/* ISF table */}
        <div className="space-y-1.5">
          {lines.map(l => {
            const flow = l.isf * injection
            const pct = l.isf * 100
            return (
              <div key={l.name} className="flex items-center gap-2">
                <div className="w-20 text-[11px] text-[var(--color-text-muted)] shrink-0">{l.name}</div>
                <div className="w-12 text-right text-[11px] font-mono text-blue-400 shrink-0">ISF={l.isf.toFixed(2)}</div>
                <div className="flex-1 bg-[var(--color-bg-elevated)] rounded h-4 overflow-hidden">
                  <div className="h-full bg-blue-500/60 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-16 text-right text-[11px] text-[var(--color-text)] shrink-0">{flow.toFixed(1)} MW</div>
              </div>
            )
          })}
        </div>

        {showPostCont && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-[var(--color-text-muted)]">
            With line B–D removed, power redistributes across the remaining lines. Line A–B's ISF
            rises from 0.71 to 0.83 — generators at bus A now have a larger LHS factor in any constraint
            monitoring line A–B. The constraint RHS may also need adjusting for the new thermal limit of the
            remaining circuit.
          </div>
        )}
        <p className="text-[10px] text-[var(--color-text-muted)] mt-2 italic">
          Simplified 4-bus example using DC power flow principles. Real NEM networks have hundreds of buses.
        </p>
      </div>

      <H2>Post-Contingency ISFs</H2>
      <P>
        Most NEM constraints are <strong className="text-[var(--color-text)]">N-1 security constraints</strong>:
        they protect against the loss of a single network element (a line, transformer, or generator) while keeping
        the system in a safe state. The ISFs in these constraints are computed on the{' '}
        <strong className="text-[var(--color-text)]">post-contingency network</strong> — the network topology after
        the worst credible fault has been removed.
      </P>
      <P>
        Process: (1) Switch out the contingent element in the power flow model. (2) Solve the post-contingency
        power flow. (3) Compute sensitivities of the monitored line's post-contingency flow to generator injections.
        (4) These sensitivities become the constraint's LHS factors.
      </P>
      <P>
        This is why the same generator can have different LHS factors in different constraint equations — each
        constraint models a different post-contingency network topology.
      </P>

      <Callout type="key">
        ISFs are the bridge between the physical network (impedances, topology) and the dispatch optimisation
        (linear equations). They convert a complex non-linear power flow problem into the linear constraint
        format that NEMDE can solve in seconds.
      </Callout>

      <H2>Minimum ISF Threshold</H2>
      <P>
        Any generator with <Code>|ISF| &lt; 0.07</Code> is excluded from the LHS — their influence is too
        small to meaningfully constrain. This threshold was raised in December 2025 as part of AEMO's ongoing
        constraint maintenance. After filtering, if all remaining factors are very small, the whole equation
        is normalised by multiplying both LHS and RHS by a scalar so the largest factor equals 1.0 (maximum
        scaling factor: 30).
      </P>
    </div>
  )
}

// ============================================================
// Lesson 4 — Types of Constraints
// ============================================================

function Lesson4() {
  const [activeType, setActiveType] = useState<string>('thermal')

  const types = [
    {
      id: 'thermal',
      label: 'Thermal',
      color: '#f97316',
      idMarker: '- or _ (dash / underscore)',
      genconType: 'THERMAL',
      proportion: '~65%',
      description: 'Prevents transmission lines and transformers from overheating due to excessive current.',
      physics: `When too much current flows through a conductor, resistive heating (I²R) raises its temperature. High temperatures cause overhead conductors to sag — potentially contacting vegetation below — and weaken the material over time. TNSPs publish continuous, short-term, and emergency ratings (in MVA or MW) for each circuit. NEMDE enforces the most restrictive applicable rating for each dispatch interval. Dynamic line ratings — which vary with ambient temperature and wind speed — allow higher limits in cool or windy conditions, increasing corridor capacity without building new infrastructure.`,
      rhsSource: 'Static MW rating from TNSP, or dynamic (temperature/wind-dependent via SCADA)',
      examples: [
        { id: 'V_NWVIC_GFT1_750', region: 'VIC', desc: 'NW Victoria corridor — 750 MW post-contingency limit' },
        { id: 'N-DPWG_63_X5', region: 'NSW', desc: 'Darlington Point Wind Group X5 corridor thermal limit' },
        { id: 'Q_CLIPP_40', region: 'QLD', desc: 'Clipperton–Lilyvale thermal constraint' },
      ],
    },
    {
      id: 'voltage',
      label: 'Voltage Stability',
      color: '#8b5cf6',
      idMarker: '^^ (double caret)',
      genconType: 'VOLTAGE',
      proportion: '~15%',
      description: 'Prevents voltage collapse — a rapid uncontrolled decline in bus voltages across a region.',
      physics: `Voltage collapse occurs when reactive power demand exceeds what the network can supply. As real power transfer increases across a long corridor, the line impedance consumes more reactive power. If a contingency then causes a step-increase in reactive demand, bus voltages can spiral downward. Unlike a thermal overload (which develops over minutes), voltage collapse can cascade in seconds and is extremely difficult to arrest once underway. Voltage stability limits are determined from offline studies using power flow software (PSS/E, DigSilent), and are typically more restrictive than the thermal rating of the same corridor.`,
      rhsSource: 'P–V curve analysis and offline stability studies — not a conductor property',
      examples: [
        { id: 'N^^N_NIL_3', region: 'NSW', desc: 'SW NSW voltage stability — the "X5" constraint' },
        { id: 'S^^S_NIL_1', region: 'SA', desc: 'SA voltage stability — limits export from local generation' },
        { id: 'V^^V_NIL_5', region: 'VIC', desc: 'Victorian corridor voltage stability limit' },
      ],
    },
    {
      id: 'transient',
      label: 'Transient Stability',
      color: '#ef4444',
      idMarker: ':: (double colon)',
      genconType: 'TRANSIENT',
      proportion: '~8%',
      description: 'Prevents loss of synchronism between synchronous generators following a sudden fault.',
      physics: `After a fault (e.g., a line short-circuit), the electrical power output of nearby generators drops suddenly. Their mechanical input (steam, water, gas) cannot change instantly, so the generators accelerate — their rotor angles advance relative to the rest of the system. If the post-fault electrical restoring force cannot decelerate the rotor before it exceeds the stability boundary (~120° angle deviation), the generator loses synchronism and must trip. This is called "pole slipping". Transient stability limits depend on the fault clearing time (how fast protection trips the faulted element), the post-fault network topology, and the inertia of nearby generators.`,
      rhsSource: 'Critical fault clearing angle from time-domain stability simulations',
      examples: [
        { id: 'Q::QPF_NIL_1', region: 'QLD', desc: 'QLD transient stability — north–south power flow limit' },
        { id: 'N::NNSC_NIL_1', region: 'NSW', desc: 'NSW north transient stability constraint' },
        { id: 'T::TAS_NIL_1', region: 'TAS', desc: 'Tasmania transient stability — Basslink flow limit' },
      ],
    },
    {
      id: 'oscillatory',
      label: 'Oscillatory Stability',
      color: '#06b6d4',
      idMarker: '~~ (double tilde)',
      genconType: 'OSCILLATORY',
      proportion: '~5%',
      description: 'Maintains ≥5% damping on inter-area power oscillations to prevent growing power swings.',
      physics: `Power systems have natural oscillation modes — synchronous generators in one region swing against generators in another at frequencies typically between 0.1–2 Hz (well below the 50 Hz supply frequency). These oscillations are normally damped out by automatic voltage regulators and Power System Stabilisers (PSS). If damping falls below 5%, small disturbances can cause growing oscillations that — unchecked — lead to loss of synchronism between regions. Long high-impedance transmission corridors between large generation hubs and load centres are most susceptible. The 5% damping criterion is specified in the NER and enforced via oscillatory stability constraints in NEMDE.`,
      rhsSource: 'Power transfer limit at which inter-area mode damping falls to 5%, from eigenvalue analysis',
      examples: [
        { id: 'N~~NOSQ_NIL_1', region: 'NSW', desc: 'NSW–QLD inter-area oscillation transfer limit' },
        { id: 'V~~VIC_NIL_1', region: 'VIC', desc: 'VIC oscillatory stability — Murray corridor' },
      ],
    },
    {
      id: 'strength',
      label: 'System Strength',
      color: '#10b981',
      idMarker: 'SS_ prefix',
      genconType: 'SYSTEM_STRENGTH',
      proportion: '~4%',
      description: 'Limits inverter-based resource (IBR) penetration to maintain minimum fault current levels.',
      physics: `Synchronous generators provide fault current — large surges of current when a short-circuit occurs. Protection systems rely on this fault current to detect faults and trip circuit breakers. Inverter-based resources (solar, wind, BESS) provide very little fault current — typically 1.1× rated current vs 5–10× for synchronous machines. As IBR penetration rises and synchronous generators exit, the Short-Circuit Ratio (SCR) falls. Below a minimum SCR, protection relays may fail to detect faults reliably, and IBRs themselves can become unstable due to control interactions (sub-synchronous oscillations, converter instability). System strength constraints require a minimum number of synchronous generators to remain online in each region.`,
      rhsSource: 'Minimum synchronous MW required in the region for each contingency state — from studies',
      examples: [
        { id: 'SS_S_NIL_1', region: 'SA', desc: 'SA system strength — IBR limit when Heywood is open' },
        { id: 'SS_N_NIL_1', region: 'NSW', desc: 'NSW system strength — min synchronous generation' },
        { id: 'SS_V_NIL_1', region: 'VIC', desc: 'VIC system strength constraint' },
      ],
    },
    {
      id: 'fcas',
      label: 'FCAS Sufficiency',
      color: '#f59e0b',
      idMarker: 'F_ or D_ prefix',
      genconType: 'FCAS',
      proportion: '~3%',
      description: 'Ensures sufficient frequency control ancillary services are enabled in each region.',
      physics: `When generation is lost suddenly (e.g., a large unit trips), frequency drops. FCAS providers — fast-response batteries, gas turbines, pumped hydro — arrest the decline and restore frequency to 50 Hz. NEM procurement rules require minimum quantities of 8 raise and 8 lower FCAS services (Raise/Lower 1s, 6s, 60s, 5min, Reg, and contingency services). FCAS sufficiency constraints ensure that total FCAS enablement, accounting for "trapping" effects when interconnectors are at their limits, is sufficient for the largest credible contingency in each region. A region physically separated by a binding interconnector constraint must have enough local FCAS to manage a contingency in isolation.`,
      rhsSource: 'Maximum credible contingency size (largest unit, Basslink capacity, etc.)',
      examples: [
        { id: 'F_I+_LNSP_NZ', region: 'ALL', desc: 'Raise 5-min FCAS — lower interconnector contingency' },
        { id: 'F_T+_LREG_R6', region: 'ALL', desc: 'Regulation raise FCAS trap constraint' },
        { id: 'F_S+_LSAS_NZ', region: 'SA', desc: 'SA raise FCAS sufficiency — islanding protection' },
      ],
    },
  ]

  const active = types.find(t => t.id === activeType) ?? types[0]

  return (
    <div className="space-y-2">
      <P>
        Constraint equations model very different physical phenomena. A thermal overload on a conductor, a
        voltage collapse risk, and a transient stability boundary all require different engineering analysis
        to determine, have different time constants, and call for different dispatch responses. Understanding
        the constraint type is essential for interpreting why a constraint is binding and what the options are.
      </P>

      <H2>Six Constraint Types in the NEM</H2>
      <P>
        AEMO's <Code>GENCONDATA</Code> table classifies every constraint equation by its{' '}
        <Code>CONSTRAINTTYPE</Code> field. The type also shapes the naming convention used in the constraint ID.
        Approximate proportions of the active constraint set in a typical dispatch interval are shown below.
      </P>

      <div className="flex flex-wrap gap-2 my-4">
        {types.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeType === t.id
                ? 'text-white shadow-sm'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            style={activeType === t.id ? { backgroundColor: t.color } : {}}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] opacity-70">{t.proportion}</span>
          </button>
        ))}
      </div>

      <div className="bg-[var(--color-bg-card)] border rounded-xl p-5 transition-all" style={{ borderColor: `${active.color}40` }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${active.color}20` }}>
            {active.id === 'thermal' ? '🌡' : active.id === 'voltage' ? '⚡' : active.id === 'transient' ? '💥' : active.id === 'oscillatory' ? '〰' : active.id === 'strength' ? '🔋' : '⚖'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">{active.label} Constraints</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{active.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
          <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">GENCONDATA type</p>
            <Code>{active.genconType}</Code>
          </div>
          <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">ID marker</p>
            <span className="text-[var(--color-text)] font-mono text-xs">{active.idMarker}</span>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Physics</p>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">{active.physics}</p>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">RHS determination</p>
          <p className="text-xs text-[var(--color-text-muted)]">{active.rhsSource}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Example constraint IDs</p>
          <div className="space-y-1.5">
            {active.examples.map(ex => (
              <div key={ex.id} className="flex items-center gap-2 flex-wrap">
                <Code>{ex.id}</Code>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${active.color}15`, color: active.color }}>{ex.region}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{ex.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <H2>Constraint Type vs Constraint Operator</H2>
      <P>
        The constraint <em>type</em> (thermal, voltage, etc.) and the constraint <em>operator</em> (≤, ≥, =)
        are independent attributes stored separately in <Code>GENCONDATA</Code>. A thermal constraint is almost
        always ≤ (maximum flow), but a voltage constraint might be ≥ if it requires a minimum level of local
        generation for voltage support. Never assume the operator from the type.
      </P>

      <H2>N-1 Security — the Default Standard</H2>
      <P>
        Most NEM constraints are <strong className="text-[var(--color-text)]">N-1 security constraints</strong>:
        they protect against the loss of any single network element while keeping the remaining system within
        safe operating limits. NEMDE continuously checks this for every credible contingency it tracks.
      </P>
      <P>
        The constraint is formulated on the <strong className="text-[var(--color-text)]">post-contingency</strong>{' '}
        network: "if element X were to trip right now, would the remaining network be within its limits?" N-0
        constraints (intact network limits) also exist for corridors where normal-state flows can approach
        thermal ratings without any contingency.
      </P>

      <Callout type="warn">
        A single transfer corridor can simultaneously approach thermal, voltage, and oscillatory stability
        limits — and NEMDE must satisfy all three simultaneously. In practice the tightest limit binds first,
        but the others may become binding seconds later if the tightest constraint is relaxed by a redispatch.
      </Callout>

      <H2>How Type Affects the Dispatch Response</H2>
      <Table
        headers={['Type', 'Typical NEMDE response', 'Out-of-market tools']}
        rows={[
          ['Thermal', 'Reduce generation on export side; increase on import side', 'TNSP dynamic rating; network reconfiguration'],
          ['Voltage stability', 'Curtail generation in constrained area; enable local voltage support', 'Reactive compensation (SVCs, capacitor banks)'],
          ['Transient stability', 'Reduce generation near fault location', 'Faster protection; network reconfiguration'],
          ['Oscillatory', 'Reduce transfer on oscillatory corridor', 'PSS re-tuning by generator owners'],
          ['System strength', 'Maintain minimum synchronous MW online', 'Synchronous condensers (SynCons)'],
          ['FCAS sufficiency', 'Enable more FCAS in the constrained region', 'Demand response; emergency import'],
        ]}
      />
    </div>
  )
}

// ============================================================
// Lesson 5 — Constraint IDs, Sets & Lifecycle
// ============================================================

function Lesson5() {
  const [decodeInput, setDecodeInput] = useState('N^^N_NIL_3')

  const parseConstraintId = (id: string) => {
    if (!id.trim()) return null
    const upper = id.trim()

    const stateMap: Record<string, string> = {
      N: 'New South Wales', Q: 'Queensland', V: 'Victoria', S: 'South Australia', T: 'Tasmania',
    }

    let region = ''
    let typeMarker = ''
    let typeDesc = ''
    let typeColor = '#64748b'
    let remainder = upper

    // Special prefixes first
    if (upper.startsWith('SS_')) {
      typeMarker = 'SS_'; typeDesc = 'System strength'; typeColor = '#10b981'
      remainder = upper.slice(3)
    } else if (upper.startsWith('F_')) {
      typeMarker = 'F_'; typeDesc = 'FCAS sufficiency'; typeColor = '#f59e0b'
      remainder = upper.slice(2)
    } else if (upper.startsWith('D_')) {
      typeMarker = 'D_'; typeDesc = 'Demand management'; typeColor = '#ec4899'
      remainder = upper.slice(2)
    } else {
      // State prefix
      const stateChar = upper[0]
      region = stateMap[stateChar] ?? `Unknown (${stateChar})`
      remainder = upper.slice(1)

      if (remainder.startsWith('^^')) {
        typeMarker = '^^'; typeDesc = 'Voltage stability'; typeColor = '#8b5cf6'; remainder = remainder.slice(2)
      } else if (remainder.startsWith('::')) {
        typeMarker = '::'; typeDesc = 'Transient stability'; typeColor = '#ef4444'; remainder = remainder.slice(2)
      } else if (remainder.startsWith('~~')) {
        typeMarker = '~~'; typeDesc = 'Oscillatory stability'; typeColor = '#06b6d4'; remainder = remainder.slice(2)
      } else if (remainder.startsWith('-')) {
        typeMarker = '-'; typeDesc = 'Thermal'; typeColor = '#f97316'; remainder = remainder.slice(1)
      } else if (remainder.startsWith('_')) {
        typeMarker = '_'; typeDesc = 'Thermal'; typeColor = '#f97316'; remainder = remainder.slice(1)
      }
    }

    const parts = remainder.split('_').filter(Boolean)
    const hasNil = parts.some(p => p === 'NIL')

    return { region, typeMarker, typeDesc, typeColor, parts, hasNil, remainder }
  }

  const decoded = parseConstraintId(decodeInput)

  const workedExamples = [
    {
      id: 'N^^N_NIL_3',
      breakdown: [
        { token: 'N', desc: 'NSW region', color: '#3b82f6' },
        { token: '^^', desc: 'Voltage stability', color: '#8b5cf6' },
        { token: 'N', desc: 'Network element group', color: '#94a3b8' },
        { token: 'NIL', desc: 'Normally active — no outage required', color: '#10b981' },
        { token: '3', desc: 'Distinguishing number', color: '#94a3b8' },
      ],
      summary: 'NSW voltage stability constraint #3 — always active in normal network state. The "X5" constraint limiting SW NSW solar farm combined output.',
    },
    {
      id: 'Q^^TR_CLHA_-600',
      breakdown: [
        { token: 'Q', desc: 'QLD region', color: '#3b82f6' },
        { token: '^^', desc: 'Voltage stability', color: '#8b5cf6' },
        { token: 'TR', desc: 'Transformer type', color: '#94a3b8' },
        { token: 'CLHA', desc: 'Calvale–Halys transformer', color: '#94a3b8' },
        { token: '-600', desc: 'Limit: −600 MW direction', color: '#f97316' },
      ],
      summary: 'QLD voltage stability — Calvale–Halys transformer, 600 MW limit in the southward flow direction.',
    },
    {
      id: 'V_NWVIC_GFT1_750',
      breakdown: [
        { token: 'V', desc: 'VIC region', color: '#3b82f6' },
        { token: '_', desc: 'Thermal (underscore notation)', color: '#f97316' },
        { token: 'NWVIC', desc: 'NW Victoria corridor', color: '#94a3b8' },
        { token: 'GFT1', desc: 'Grid Fault Type 1 contingency', color: '#94a3b8' },
        { token: '750', desc: 'Thermal limit 750 MW', color: '#f97316' },
      ],
      summary: 'VIC NW Victoria corridor thermal constraint — 750 MW limit following a Grid Fault Type 1 contingency.',
    },
    {
      id: 'N-DPWG_63_X5',
      breakdown: [
        { token: 'N', desc: 'NSW region', color: '#3b82f6' },
        { token: '-', desc: 'Thermal (dash notation)', color: '#f97316' },
        { token: 'DPWG', desc: 'Darlington Point Wind Group', color: '#94a3b8' },
        { token: '63', desc: 'Circuit identifier', color: '#94a3b8' },
        { token: 'X5', desc: 'X5 constraint set', color: '#94a3b8' },
      ],
      summary: 'NSW thermal constraint — Darlington Point Wind Group on the X5 corridor. Part of the X5 constraint set.',
    },
  ]

  return (
    <div className="space-y-2">
      <P>
        Every constraint equation has a unique string identifier — like <Code>N^^N_NIL_3</Code> or{' '}
        <Code>V_NWVIC_GFT1_750</Code>. These follow a documented naming convention that encodes the region,
        physical type, monitored element, and activation condition. Once you can decode one, you can read
        any constraint ID you encounter in AEMO data and understand immediately what it represents.
      </P>

      <H2>The Naming Structure</H2>
      <Callout type="formula">
        <code className="font-mono text-emerald-400">[Region][TypeMarker][Element]_[OutageState]_[Suffix]</code>
        <div className="mt-2 text-xs text-[var(--color-text-muted)] space-y-1">
          <div><span className="text-emerald-400">[Region]</span> — N, Q, V, S, T (or SS_, F_, D_ for special types)</div>
          <div><span className="text-emerald-400">[TypeMarker]</span> — ^^ voltage, :: transient, ~~ oscillatory, - or _ thermal, SS_ system strength, F_ FCAS</div>
          <div><span className="text-emerald-400">[Element]</span> — abbreviated name of the monitored transmission element</div>
          <div><span className="text-emerald-400">[OutageState]</span> — NIL (always active) or outage-specific activation condition</div>
          <div><span className="text-emerald-400">[Suffix]</span> — numeric or alphabetic distinguishing label</div>
        </div>
      </Callout>

      <Table
        headers={['Prefix', 'Region', 'RRN bus']}
        rows={[
          ['N', 'New South Wales + ACT', 'Sydney West 330 kV'],
          ['Q', 'Queensland', 'South Pine 275 kV'],
          ['V', 'Victoria', 'Thomastown 66 kV'],
          ['S', 'South Australia', 'Torrens Island 275 kV'],
          ['T', 'Tasmania', 'George Town 220 kV'],
          ['F_', 'FCAS (all regions)', '—'],
          ['SS_', 'System strength', '—'],
        ]}
      />

      <H2>NIL vs Outage-Specific</H2>
      <P>
        The <Code>NIL</Code> token means the constraint is{' '}
        <strong className="text-[var(--color-text)]">always active in normal network state</strong> — it
        represents a fundamental corridor limit that applies regardless of planned maintenance. These are the
        constraints you'll see binding most frequently.
      </P>
      <P>
        Outage-specific constraints are only activated when a named network element is out of service for
        maintenance. For example, a constraint might be inactive when both circuits of a double-circuit line
        are in service, but must be applied when one is on outage — because the single remaining circuit has
        a lower post-contingency transfer limit. These constraints are linked to the{' '}
        <strong className="text-[var(--color-text)]">Network Outage Schedule (NOS)</strong> — AEMO's real-time
        schedule of planned maintenance submitted by TNSPs.
      </P>

      <H2>Interactive: Constraint ID Decoder</H2>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 my-4">
        <label className="text-xs text-[var(--color-text-muted)] block mb-1.5">Enter a constraint ID</label>
        <input
          value={decodeInput}
          onChange={e => setDecodeInput(e.target.value.toUpperCase())}
          placeholder="e.g. N^^N_NIL_3"
          className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] mb-2"
        />
        <div className="flex flex-wrap gap-1.5 mb-4">
          {['N^^N_NIL_3', 'Q^^TR_CLHA_-600', 'V_NWVIC_GFT1_750', 'N-DPWG_63_X5', 'SS_S_NIL_1', 'F_I+_LNSP_NZ'].map(ex => (
            <button
              key={ex}
              onClick={() => setDecodeInput(ex)}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        {decoded && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {decoded.region && (
                <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
                  <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Region</p>
                  <p className="text-xs font-semibold text-blue-400">{decoded.region}</p>
                </div>
              )}
              <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
                <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Type</p>
                <p className="text-xs font-semibold" style={{ color: decoded.typeColor }}>
                  {decoded.typeDesc || 'Unknown'}
                  {decoded.typeMarker && <span className="font-mono opacity-70 ml-1">({decoded.typeMarker})</span>}
                </p>
              </div>
              <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
                <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Outage state</p>
                <p className="text-xs font-semibold" style={{ color: decoded.hasNil ? '#10b981' : '#f59e0b' }}>
                  {decoded.hasNil ? 'NIL — normally active' : 'Outage-specific'}
                </p>
              </div>
            </div>
            <div className="bg-[var(--color-bg-elevated)] rounded-lg p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5">Element / suffix tokens</p>
              <div className="flex flex-wrap gap-1.5">
                {decoded.parts.map((p, i) => (
                  <span key={i} className={`font-mono text-xs px-2 py-0.5 rounded ${p === 'NIL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--color-bg-card)] text-[var(--color-text)] border border-[var(--color-border)]'}`}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <H2>Worked Decodes</H2>
      <div className="space-y-3 my-4">
        {workedExamples.map(ex => (
          <div key={ex.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <Code>{ex.id}</Code>
            <div className="flex flex-wrap gap-3 mt-3 mb-3">
              {ex.breakdown.map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="font-mono text-sm px-2 py-1 rounded font-bold" style={{ backgroundColor: `${b.color}20`, color: b.color }}>{b.token}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] max-w-[72px] text-center leading-tight">{b.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] italic">{ex.summary}</p>
          </div>
        ))}
      </div>

      <H2>Constraint Sets</H2>
      <P>
        Constraint equations are grouped into <strong className="text-[var(--color-text)]">constraint sets</strong> —
        named collections activated together when a network event occurs. A constraint set for a major planned
        outage might contain 20–50 individual equations covering all affected corridors and post-contingency
        scenarios. When a TNSP books a maintenance outage, the associated constraint set is scheduled for
        activation at the outage start time and deactivated when the element returns to service.
      </P>

      <H2>DS / PD / ST / MT Scope</H2>
      <P>
        The same constraint ID can carry different RHS values depending on the planning timescale. This is
        controlled by the <Code>SCOPE</Code> column in <Code>GENERICCONSTRAINTRHS</Code>:
      </P>
      <Table
        headers={['Scope', 'Timescale', 'Used by', 'Typical RHS characteristic']}
        rows={[
          ['DS', '5-min dispatch', 'NEMDE (live dispatch)', 'Tightest — actual operational limits'],
          ['PD', '30-min pre-dispatch', 'Pre-dispatch engine', 'May include small look-ahead relaxations'],
          ['ST', 'Short-term PASA (hours)', 'Reliability assessment', 'Planning limits, fewer contingencies'],
          ['MT', 'Medium-term PASA (months)', 'Capacity planning', 'Conservative statistical assumptions'],
        ]}
      />
      <P>
        For example, a corridor might have a DS limit of 600 MW (real-time thermal rating) but a PD limit of
        620 MW (pre-dispatch uses a slightly higher planning limit). Only the DS-scoped RPN terms are evaluated
        in live dispatch.
      </P>

      <Callout type="key">
        The constraint ID naming convention is documented in AEMO's Constraint Naming Guidelines, published on
        the AEMO website and updated periodically. AEMO also publishes a Constraint Formulation Guidelines
        document that explains the engineering standards used to derive each constraint type's RHS. Both are
        essential references for practitioners working with constraint data.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — Market Impacts: Shadow Prices & Congestion
// ============================================================

function Lesson6() {
  const [lhsValue, setLhsValue] = useState(550)
  const [rhsLimit, setRhsLimit] = useState(600)

  const exportPrice = 32
  const importPrice = 87
  const isBinding = lhsValue >= rhsLimit
  const shadowPrice = isBinding ? importPrice - exportPrice : 0
  const headroom = rhsLimit - lhsValue
  const congestionRent = isBinding ? shadowPrice * lhsValue : 0

  return (
    <div className="space-y-2">
      <P>
        When a constraint equation reaches its limit — when the LHS sum equals the RHS — it is{' '}
        <strong className="text-[var(--color-text)]">binding</strong>. Binding constraints are the mechanism
        by which physical transmission limits translate into price outcomes. They cause regional spot price
        separation, generator curtailment, and congestion rents. Understanding this link is central to
        interpreting NEM price events.
      </P>

      <H2>The Shadow Price (Marginal Value)</H2>
      <P>
        NEMDE solves a linear programme. Every constraint has a{' '}
        <strong className="text-[var(--color-text)]">dual variable</strong> — the{' '}
        <strong className="text-[var(--color-text)]">shadow price</strong> or{' '}
        <strong className="text-[var(--color-text)]">marginal value</strong>. AEMO publishes this in the{' '}
        <Code>DISPATCHCONSTRAINT</Code> table as <Code>MARGINALVALUE</Code>.
      </P>

      <Callout type="formula">
        <code className="font-mono text-emerald-400">λ = ∂(total dispatch cost) / ∂(RHS)</code>
        <div className="mt-2 text-xs text-[var(--color-text-muted)]">
          The shadow price λ: how much total dispatch cost would fall per 1 MW relaxation of the constraint's RHS limit.
          A non-zero λ means the constraint is binding (or would be if the RHS were tighter).
        </div>
      </Callout>

      <P>
        A constraint with λ = 0 has headroom — relaxing the RHS by 1 MW saves nothing because the constraint
        isn't the active restriction. A constraint with λ = $55/MWh means that if the corridor limit were 1 MW
        higher, total dispatch cost would fall by $55 per MW per hour — equivalent to not needing that last
        expensive generator in the import region.
      </P>

      <H2>Interactive: Two-Region Binding Example</H2>
      <P>
        A cheap southern generator ($32/MWh) wants to export north, where the local generator costs $87/MWh.
        An interconnector constraint limits the transfer. Adjust LHS (actual transfer) and RHS (limit) to see
        when the constraint binds and what it costs.
      </P>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 my-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] block mb-1">Actual transfer — LHS (MW)</label>
            <input type="range" min={200} max={750} step={10} value={lhsValue}
              onChange={e => setLhsValue(Number(e.target.value))}
              className="w-full accent-blue-500" />
            <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-0.5">
              <span>200</span>
              <span className="font-mono font-bold text-blue-400">{lhsValue} MW</span>
              <span>750</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] block mb-1">Constraint RHS limit (MW)</label>
            <input type="range" min={400} max={700} step={10} value={rhsLimit}
              onChange={e => setRhsLimit(Number(e.target.value))}
              className="w-full accent-amber-500" />
            <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-0.5">
              <span>400</span>
              <span className="font-mono font-bold text-amber-400">{rhsLimit} MW</span>
              <span>700</span>
            </div>
          </div>
        </div>

        {/* Two-region flow diagram */}
        <div className="mb-4 overflow-x-auto">
          <svg width="500" height="110" viewBox="0 0 500 110" className="block max-w-full">
            <rect x="8" y="15" width="140" height="75" rx="10" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="78" y="47" textAnchor="middle" fontSize="11" fontWeight="700" fill="#93c5fd">South</text>
            <text x="78" y="62" textAnchor="middle" fontSize="10" fill="#60a5fa">$32/MWh</text>
            <text x="78" y="76" textAnchor="middle" fontSize="9" fill="#475569">Generator</text>

            <line x1="148" y1="52" x2="356" y2="52"
              stroke={isBinding ? '#ef4444' : '#22c55e'}
              strokeWidth={1.5 + (lhsValue / 300)} />
            <polygon points={`${356},52 ${346},47 ${346},57`} fill={isBinding ? '#ef4444' : '#22c55e'} />

            <line x1="252" y1="28" x2="252" y2="78" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
            <text x="252" y="22" textAnchor="middle" fontSize="8" fill="#fbbf24">RHS={rhsLimit}</text>

            <text x="252" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill={isBinding ? '#f87171' : '#4ade80'}>{lhsValue} MW</text>
            {isBinding
              ? <text x="252" y="70" textAnchor="middle" fontSize="9" fontWeight="700" fill="#f87171">BINDING</text>
              : <text x="252" y="70" textAnchor="middle" fontSize="9" fill="#475569">headroom {headroom} MW</text>
            }

            <rect x="356" y="15" width="140" height="75" rx="10"
              fill={isBinding ? '#3b1a1a' : '#1a3b1f'}
              stroke={isBinding ? '#ef4444' : '#22c55e'} strokeWidth="1.5" />
            <text x="426" y="47" textAnchor="middle" fontSize="11" fontWeight="700" fill={isBinding ? '#fca5a5' : '#86efac'}>North</text>
            <text x="426" y="62" textAnchor="middle" fontSize="10" fill={isBinding ? '#f87171' : '#4ade80'}>$87/MWh</text>
            <text x="426" y="76" textAnchor="middle" fontSize="9" fill="#475569">Generator</text>
          </svg>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Status</p>
            <p className={`text-xs font-bold ${isBinding ? 'text-red-400' : 'text-emerald-400'}`}>
              {isBinding ? 'BINDING' : 'Not binding'}
            </p>
          </div>
          <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Shadow price λ</p>
            <p className={`text-xs font-bold ${isBinding ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
              ${shadowPrice}/MWh
            </p>
          </div>
          <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Price gap</p>
            <p className={`text-xs font-bold ${isBinding ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}`}>
              {isBinding ? `$${importPrice - exportPrice}/MWh` : '$0/MWh'}
            </p>
          </div>
          <div className="bg-[var(--color-bg-elevated)] rounded-lg p-2.5">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1">Congestion rent/hr</p>
            <p className={`text-xs font-bold ${isBinding ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}`}>
              {isBinding ? `$${congestionRent.toLocaleString()}` : '$0'}
            </p>
          </div>
        </div>

        {isBinding && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-[var(--color-text-muted)]">
            The interconnector constraint is binding. NEMDE cannot send more cheap southern power north and
            must dispatch the expensive northern generator. South spot price = $32/MWh; North spot price = $87/MWh.
            The $55/MWh price gap equals the shadow price. Congestion rent accrues at ${congestionRent.toLocaleString()}/hr.
          </div>
        )}
      </div>

      <H2>Regional Price Separation</H2>
      <P>
        When an interconnector constraint binds, the two connected regions have{' '}
        <strong className="text-[var(--color-text)]">different spot prices</strong>. The export region
        (where the cheap generation is blocked) has a lower price; the import region (which must run its
        own expensive generation) has a higher price. The price gap equals the shadow price of the binding
        constraint.
      </P>
      <P>
        This is routine in the NEM. The QNI (QLD–NSW Interconnector) regularly has binding thermal constraints
        in both directions. During high-solar periods in QLD, southward flow constraints can push QLD prices
        deeply negative while NSW remains positive. During summer peak demand, northward QNI constraints keep
        QLD prices elevated above NSW.
      </P>

      <H2>Intra-Regional Constraints: The Invisible Problem</H2>
      <P>
        Many binding constraints do <em>not</em> cause regional price separation. A constraint that limits
        generation within a region — like the X5 constraint limiting SW NSW solar output — has a shadow price
        that affects the generators' dispatch targets and their effective location price, but may not move the
        NSW pool price at all if other generators in NSW can make up the shortfall cheaply.
      </P>
      <P>
        These "invisible" constraints are only visible in <Code>DISPATCHCONSTRAINT.MARGINALVALUE</Code> — not
        in the regional pool price. For affected generators, the revenue impact is real and can be large.
      </P>

      <H2>Congestion Rent</H2>
      <Callout type="formula">
        <code className="font-mono text-emerald-400">Congestion rent = (P_import − P_export) × Transfer_volume ($/hr)</code>
        <div className="mt-2 text-xs text-[var(--color-text-muted)]">
          Revenue captured by the market operator from the price differential across a congested interconnector.
          In the NEM, this accrues to Market Network Service Providers (MNSPs) or is redistributed via
          Transmission Use of System (TUOS) mechanisms.
        </div>
      </Callout>

      <H2>Constraint Violation Penalty (CVP) Factors</H2>
      <P>
        When NEMDE cannot simultaneously satisfy all constraints — in extreme conditions — it uses{' '}
        <strong className="text-[var(--color-text)]">CVP factors</strong> to prioritise which constraints can
        be violated and at what penalty cost. A CVP of $1,000/MWh means violating a constraint by 1 MW adds
        a $1,000 penalty to the objective function — equivalent to a very expensive virtual generator.
        Energy balance constraints have very high CVPs and are essentially never violated; some FCAS
        constraints have lower CVPs and may be violated in extreme events.
      </P>

      <H2>Case Studies</H2>

      <H3>X5 Constraint — SW NSW Solar Curtailment</H3>
      <P>
        The N^^N_NIL_3 constraint (the "X5") limits combined output from southwest NSW solar farms to protect
        against voltage collapse following the loss of a key 330 kV corridor. During high-solar, light-load
        periods — typically spring and autumn mornings — this constraint regularly binds, curtailing hundreds
        of MW of available solar output. Affected generators (Limondale, Darlington Point, Coppabella, Trangie,
        White Rock) receive dispatch targets below their available output. The curtailment is visible only
        in their individual dispatch targets and in <Code>DISPATCHCONSTRAINT</Code> — the NSW pool price
        may not move at all.
      </P>

      <H3>SA Islanding — Heywood Trip Events</H3>
      <P>
        When the Heywood interconnector trips while SA is exporting power, SA instantly becomes isolated.
        Without interconnector import, SA must balance internally — and must have sufficient fast FCAS
        already enabled within SA to manage the transition. The SA islanding constraint set activates
        whenever SA is in a net-export position above a threshold, requiring minimum local FCAS enablement.
        During the March 2020 event, this mechanism contributed to FCAS prices exceeding $14,500/MWh in SA,
        with a single trading day cost of over $90M. The constraint forced SA to retain expensive local
        fast-response capacity even when cheaper interstate alternatives were available.
      </P>

      <H3>Opaque Congestion — N-DPWG_63_X5 (June 2024)</H3>
      <P>
        In June 2024, market analysts noted significant curtailment of Darlington Point area wind generators
        despite no obvious movement in the NSW pool price. Investigation of <Code>DISPATCHCONSTRAINT</Code>{' '}
        records revealed the N-DPWG_63_X5 constraint was binding with a shadow price of ~$3–5/MWh — too
        small to visibly move the pool price but enough to force generators well below their available output.
        This case illustrates why pool price analysis alone misses a large proportion of real dispatch
        constraints — MARGINALVALUE records are essential.
      </P>

      <Callout type="warn">
        Regional pool price divergence is a visible symptom of congestion — but many binding constraints
        produce zero price separation while causing substantial physical curtailment. Analysing{' '}
        <Code>DISPATCHCONSTRAINT.MARGINALVALUE</Code> is the only reliable way to identify these
        "invisible" constraints and their effects on individual generators.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — Working with Constraint Data
// ============================================================

function Lesson7() {
  const [activeTab, setActiveTab] = useState<'tables' | 'python' | 'sql' | 'tools'>('tables')

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'tables', label: 'MMS Tables' },
    { id: 'python', label: 'Python / NEMOSIS' },
    { id: 'sql', label: 'SQL Examples' },
    { id: 'tools', label: 'Other Tools' },
  ]

  return (
    <div className="space-y-2">
      <P>
        Everything covered in this module — constraint equations, ISFs, binding status, shadow prices — is
        publicly available through AEMO's Market Management System (MMS) data archive. This lesson is a
        practical guide to finding, downloading, and querying that data. It covers the key MMS tables,
        Python tooling, SQL patterns, and other useful resources.
      </P>

      <div className="flex gap-1.5 flex-wrap my-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'tables' && (
        <div className="space-y-4">
          <H2>The Five Static Definition Tables</H2>
          <P>
            These tables define constraint equations — they change infrequently (when new constraints are added
            or modified) and are the starting point for understanding any constraint's structure.
          </P>
          <Table
            headers={['Table', 'Contents', 'Key columns']}
            rows={[
              [
                <Code key="1">GENCONDATA</Code>,
                'Master constraint record — one row per constraint ID',
                'GENCONID, CONSTRAINTTYPE, GENERICCONSTRAINTWEIGHT, LIMITTYPE (≤/≥/=), DISPATCH, PREDISPATCH, STPASA, MTPASA',
              ],
              [
                <Code key="2">SPDCONNECTIONPOINTCONSTRAINT</Code>,
                'LHS factors for generators and loads (by DUID)',
                'GENCONID, CONNECTIONPOINTID (≈DUID), FACTOR, EFFECTIVEDATE, VERSIONNO',
              ],
              [
                <Code key="3">SPDINTERCONNECTORCONSTRAINT</Code>,
                'LHS factors for interconnectors',
                'GENCONID, INTERCONNECTORID, FACTOR, EFFECTIVEDATE',
              ],
              [
                <Code key="4">SPDREGIONCONSTRAINT</Code>,
                'LHS factors for regions (regional demand constraints)',
                'GENCONID, REGIONID, FACTOR, EFFECTIVEDATE',
              ],
              [
                <Code key="5">GENERICCONSTRAINTRHS</Code>,
                'RHS calculation terms using Reverse Polish Notation',
                'GENCONID, SCOPE (DS/PD/ST/MT), TERMID, OPERATION, VALUE, PARAMETERTERM',
              ],
            ]}
          />

          <H2>The Key Dispatch Table</H2>
          <P>
            This table is updated every 5-minute dispatch interval and contains the real-time binding status
            and shadow prices. It's the most important table for market analysis.
          </P>
          <Table
            headers={['Table', 'Contents', 'Key columns']}
            rows={[
              [
                <Code key="6">DISPATCHCONSTRAINT</Code>,
                'Per-interval constraint status — one row per active constraint per interval',
                'SETTLEMENTDATE, RUNNO, GENCONID, RHS, MARGINALVALUE, VIOLATIONDEGREE, LASTCHANGED',
              ],
            ]}
          />

          <Callout type="info">
            <Code>DISPATCHCONSTRAINT.MARGINALVALUE</Code> is the shadow price λ from Lesson 6. A non-zero value
            confirms the constraint was binding in that interval. <Code>VIOLATIONDEGREE</Code> is the amount by
            which the constraint was violated (normally 0 — violations are rare and indicate extreme system stress).
          </Callout>

          <H2>Pre-Dispatch and PASA Tables</H2>
          <Table
            headers={['Table', 'Timescale', 'Key difference']}
            rows={[
              [<Code key="7">PREDISPATCHCONSTRAINT</Code>, '30-min pre-dispatch', 'MARGINALVALUE for pre-dispatch run, PERIODID instead of SETTLEMENTDATE'],
              [<Code key="8">P5MIN_CONSTRAINTSOLUTION</Code>, '5-min pre-dispatch', 'Very short-term lookahead shadow prices'],
              [<Code key="9">STPASACONSTRAINT</Code>, 'Short-term PASA (hours)', 'Reliability assessment shadow prices'],
            ]}
          />

          <H2>NEMweb Download Locations</H2>
          <P>
            All MMS data is published on AEMO's NEMweb platform. Static definition tables are in the MMS
            Archive (Bidmove_Complete or Data_Archive zip files). The DISPATCHCONSTRAINT table is in the
            5-minute Dispatch zip files, published within 5 minutes of each interval.
          </P>
          <Table
            headers={['Data set', 'NEMweb path', 'Update frequency']}
            rows={[
              ['GENCONDATA', 'Reports/Current/GenconData/', 'When constraints change'],
              ['SPD* tables', 'Reports/Current/SPD_INTERCONNECTORCONSTRAINT/ etc.', 'When factors change'],
              ['DISPATCHCONSTRAINT', 'Reports/Current/Dispatch_SCADA/ (in 5-min zip)', 'Every 5 minutes'],
              ['PREDISPATCHCONSTRAINT', 'Reports/Current/Predispatch_Reports/', 'Every 30 minutes'],
            ]}
          />
        </div>
      )}

      {activeTab === 'python' && (
        <div className="space-y-4">
          <H2>NEMOSIS — The Recommended Python Library</H2>
          <P>
            NEMOSIS (NEM Open Source Information Service) is the standard Python library for downloading and
            compiling NEM dispatch data. It handles authentication, file chunking, caching, and date-range
            queries automatically.
          </P>

          <H3>Installation</H3>
          <CodeBlock>{`pip install nemosis`}</CodeBlock>

          <H3>Download DISPATCHCONSTRAINT for a date range</H3>
          <CodeBlock>{`from nemosis import dynamic_data_compiler

# Download DISPATCHCONSTRAINT for one week
df = dynamic_data_compiler(
    start_time='2024/06/01 00:00:00',
    end_time='2024/06/08 00:00:00',
    table_name='DISPATCHCONSTRAINT',
    raw_data_cache='./nemosis_cache',
    select_columns=['SETTLEMENTDATE', 'GENCONID', 'RHS', 'MARGINALVALUE'],
    filter_cols=['MARGINALVALUE'],
    filter_values=[lambda x: x != 0],   # only binding constraints
)

print(df.head())`}</CodeBlock>

          <H3>Download static constraint definitions</H3>
          <CodeBlock>{`from nemosis import static_table

# Master constraint metadata
gencon = static_table('GENCONDATA', raw_data_cache='./cache')

# LHS factors for generators
lhs = static_table(
    'SPDCONNECTIONPOINTCONSTRAINT',
    raw_data_cache='./cache'
)

# Merge: all LHS factors for a specific constraint
x5 = lhs[lhs['GENCONID'] == 'N^^N_NIL_3'].copy()
x5 = x5.sort_values('EFFECTIVEDATE').drop_duplicates(
    subset='CONNECTIONPOINTID', keep='last'
)
print(x5[['CONNECTIONPOINTID', 'FACTOR']])`}</CodeBlock>

          <H3>Find most frequently binding constraints</H3>
          <CodeBlock>{`import pandas as pd
from nemosis import dynamic_data_compiler

df = dynamic_data_compiler(
    start_time='2024/01/01 00:00:00',
    end_time='2024/07/01 00:00:00',
    table_name='DISPATCHCONSTRAINT',
    raw_data_cache='./cache',
    select_columns=['SETTLEMENTDATE', 'GENCONID', 'MARGINALVALUE'],
)

# Count binding intervals per constraint
binding = df[df['MARGINALVALUE'] != 0]
counts = (
    binding.groupby('GENCONID')
    .size()
    .sort_values(ascending=False)
    .head(20)
)
print(counts)`}</CodeBlock>

          <H3>Reconstruct an LHS sum for a constraint</H3>
          <CodeBlock>{`import pandas as pd

# Assume dispatch_mw is a dict of {DUID: dispatched_MW} for one interval
dispatch_mw = {
    'LKBONNY1': 220, 'LKBONNY2': 29, 'COPPABELLA1': 80,
    'DARLINGTON1': 140, 'TRANGIE1': 50, 'WHITROCK1': 120,
}

# LHS factors (latest version from SPDCONNECTIONPOINTCONSTRAINT)
lhs_factors = {
    'LKBONNY1': 1.000, 'LKBONNY2': 1.000, 'COPPABELLA1': 0.952,
    'DARLINGTON1': 0.891, 'TRANGIE1': 0.743, 'WHITROCK1': 0.612,
}

lhs_sum = sum(lhs_factors.get(duid, 0) * mw
              for duid, mw in dispatch_mw.items())
print(f"LHS = {lhs_sum:.1f} MW  (RHS = 630 MW)")`}</CodeBlock>

          <Callout type="info">
            NEMOSIS caches downloaded files locally, so repeat queries are fast. The cache can grow large —
            DISPATCHCONSTRAINT files are ~2 MB each for a 5-minute interval, adding up to ~500 MB/month.
            Use the <Code>filter_cols</Code> / <Code>filter_values</Code> parameters to pre-filter on
            download to reduce storage.
          </Callout>
        </div>
      )}

      {activeTab === 'sql' && (
        <div className="space-y-4">
          <H2>SQL Patterns for Constraint Analysis</H2>
          <P>
            If you have the MMS tables loaded into a database (SQLite, PostgreSQL, DuckDB), these query
            patterns cover the most common analysis tasks.
          </P>

          <H3>All binding intervals for a specific constraint</H3>
          <CodeBlock>{`SELECT
    SETTLEMENTDATE,
    GENCONID,
    RHS,
    MARGINALVALUE,
    VIOLATIONDEGREE
FROM DISPATCHCONSTRAINT
WHERE GENCONID = 'N^^N_NIL_3'
  AND MARGINALVALUE <> 0
  AND SETTLEMENTDATE >= '2024-01-01'
ORDER BY SETTLEMENTDATE;`}</CodeBlock>

          <H3>Top 20 most frequently binding constraints (H1 2024)</H3>
          <CodeBlock>{`SELECT
    GENCONID,
    COUNT(*) AS binding_intervals,
    AVG(ABS(MARGINALVALUE)) AS avg_shadow_price,
    MAX(ABS(MARGINALVALUE)) AS max_shadow_price
FROM DISPATCHCONSTRAINT
WHERE MARGINALVALUE <> 0
  AND SETTLEMENTDATE BETWEEN '2024-01-01' AND '2024-07-01'
GROUP BY GENCONID
ORDER BY binding_intervals DESC
LIMIT 20;`}</CodeBlock>

          <H3>LHS factors for all generators in one constraint (latest version)</H3>
          <CodeBlock>{`SELECT
    s.CONNECTIONPOINTID AS duid,
    s.FACTOR,
    s.EFFECTIVEDATE
FROM SPDCONNECTIONPOINTCONSTRAINT s
INNER JOIN (
    SELECT CONNECTIONPOINTID, MAX(EFFECTIVEDATE) AS max_date
    FROM SPDCONNECTIONPOINTCONSTRAINT
    WHERE GENCONID = 'N^^N_NIL_3'
    GROUP BY CONNECTIONPOINTID
) latest ON s.CONNECTIONPOINTID = latest.CONNECTIONPOINTID
        AND s.EFFECTIVEDATE = latest.max_date
WHERE s.GENCONID = 'N^^N_NIL_3'
ORDER BY ABS(s.FACTOR) DESC;`}</CodeBlock>

          <H3>Daily binding hours per constraint type</H3>
          <CodeBlock>{`SELECT
    DATE(dc.SETTLEMENTDATE) AS dispatch_date,
    g.CONSTRAINTTYPE,
    COUNT(DISTINCT dc.SETTLEMENTDATE) / 12.0 AS binding_hours,
    COUNT(DISTINCT dc.GENCONID) AS distinct_constraints
FROM DISPATCHCONSTRAINT dc
JOIN GENCONDATA g ON dc.GENCONID = g.GENCONID
WHERE dc.MARGINALVALUE <> 0
  AND dc.SETTLEMENTDATE >= '2024-01-01'
GROUP BY 1, 2
ORDER BY 1, 3 DESC;`}</CodeBlock>

          <H3>Identify constraints affecting a specific generator</H3>
          <CodeBlock>{`SELECT
    s.GENCONID,
    s.FACTOR,
    g.CONSTRAINTTYPE,
    g.LIMITTYPE
FROM SPDCONNECTIONPOINTCONSTRAINT s
JOIN GENCONDATA g ON s.GENCONID = g.GENCONID
WHERE s.CONNECTIONPOINTID = 'DARLINGTON1'
  AND s.EFFECTIVEDATE = (
    SELECT MAX(EFFECTIVEDATE)
    FROM SPDCONNECTIONPOINTCONSTRAINT
    WHERE CONNECTIONPOINTID = 'DARLINGTON1'
      AND GENCONID = s.GENCONID
  )
ORDER BY ABS(s.FACTOR) DESC;`}</CodeBlock>

          <Callout type="key">
            DuckDB is excellent for ad-hoc MMS queries — it reads Parquet and CSV files directly without
            loading into a server database. Convert NEMOSIS outputs to Parquet once and DuckDB can scan
            months of dispatch data in seconds.
          </Callout>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="space-y-4">
          <H2>AEMO Resources</H2>
          <Table
            headers={['Resource', 'What it contains', 'Where to find it']}
            rows={[
              [
                'Congestion Information Resource (CIR)',
                'Dashboard showing currently active constraints, their binding frequency, and historical congestion maps. User-friendly — no coding required.',
                'AEMO website → Markets → Electricity → Congestion Information Resource',
              ],
              [
                'Constraint Formulation Guidelines',
                'Engineering standards for each constraint type — how RHS is determined, what physics is being modelled, and AEMO\'s methodology.',
                'AEMO website → Electricity → NEM → Constraints',
              ],
              [
                'Constraint Naming Guidelines',
                'Authoritative reference for the ID naming convention covered in Lesson 5.',
                'AEMO website → Electricity → NEM → Constraints',
              ],
              [
                'MMS Data Model Report',
                'Column-level documentation for every MMS table — data types, descriptions, relationships. Essential reference.',
                'AEMO website → Electricity → National Electricity Market → Data → MMS Data Model',
              ],
              [
                'Monthly Constraint Reports',
                'AEMO publishes a monthly report summarising the most significant constraint events, binding durations, and costs.',
                'AEMO website → Reports → Electricity → Constraints',
              ],
            ]}
          />

          <H2>Open-Source Libraries</H2>
          <Table
            headers={['Library', 'Language', 'Key capability']}
            rows={[
              [
                'NEMOSIS',
                'Python',
                'Download and compile any MMS table for any date range. Handles caching, authentication, chunking. The standard starting point.',
              ],
              [
                'NEMSEER',
                'Python',
                'Focused on pre-dispatch and PASA data. Useful for lookahead analysis and comparing pre-dispatch constraints to actual dispatch.',
              ],
              [
                'NEMED',
                'Python',
                'NEM Emissions Data — cross-references dispatch with generator fuel types. Useful for linking constraint curtailment to emissions impacts.',
              ],
              [
                'nem-bidstack',
                'Python',
                'Reconstructs full bid stacks from BIDDAYOFFER and BIDPEROFFER tables. Pairs well with constraint analysis to understand constrained off costs.',
              ],
            ]}
          />

          <H2>AURES Constraint Data</H2>
          <P>
            AURES processes AEMO's constraint data and makes it available through the intelligence dashboards
            in this application. The constraint analysis in the Transmission Infrastructure intelligence page
            draws on DISPATCHCONSTRAINT records to identify the most frequently binding constraints affecting
            each REZ and transmission corridor in the NEM.
          </P>
          <P>
            For project-level constraint exposure, the individual project pages include a constraint
            sensitivity section showing which active constraint equations include that project's DUID in
            their LHS and the associated LHS factor. This directly answers "how exposed is this project
            to being curtailed by network constraints?" — a key input to merchant revenue assessments.
          </P>

          <H2>Recommended Learning Path</H2>
          <Table
            headers={['Step', 'Task', 'Time']}
            rows={[
              ['1', 'Download GENCONDATA and explore constraint types and names in the real dataset', '1 hour'],
              ['2', 'Download one month of DISPATCHCONSTRAINT via NEMOSIS; identify the top 10 binding constraints', '2 hours'],
              ['3', 'Pick one frequently binding constraint; reconstruct its LHS using SPDCONNECTIONPOINTCONSTRAINT', '2 hours'],
              ['4', 'Cross-reference binding intervals with dispatch targets for affected generators in DISPATCH_UNIT_SOLUTION', '2 hours'],
              ['5', 'Read AEMO\'s CIR and compare your findings to AEMO\'s published congestion reports', '1 hour'],
            ]}
          />

          <Callout type="key">
            The combination of DISPATCHCONSTRAINT (when constraints bind), SPDCONNECTIONPOINTCONSTRAINT (which
            generators are in the LHS), and DISPATCH_UNIT_SOLUTION (actual dispatch targets) gives a complete
            picture of constraint-driven curtailment for any project or corridor in the NEM. All three tables
            are freely available via NEMweb.
          </Callout>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Lesson 4–7 Coming Soon (kept for potential future use)
// ============================================================

function ComingSoon({ lesson }: { lesson: LessonMeta }) {
  const topics: Record<string, string[]> = {
    'constraint-types': [
      'Thermal limits — static vs dynamic line ratings, N-1 post-contingency thermal',
      'Voltage stability (^^) — N-1 voltage collapse limits',
      'Transient stability (::) — rotor angle following a fault',
      'Oscillatory stability — inter-area oscillation modes, ≥5% damping requirement',
      'System strength / fault level — IBR penetration, SCR, SA islanding constraint',
      'FCAS sufficiency constraints — D_ and F_ prefix equations',
    ],
    'ids-and-sets': [
      'Decoding constraint IDs: state prefix, type operator, NIL vs outage-specific',
      'Worked decodes: N^^N_NIL_3, Q^^TR_CLHA_-600, V_NWVIC_GFT1_750, N-DPWG_63_X5',
      'Constraint sets: why equations are grouped and invoked together',
      'The Network Outage Schedule and outage-specific constraint sets',
      'Pre-dispatch vs dispatch RHS: DS / PD / ST / MT scope',
      'The RPN calculation engine for complex RHS expressions',
      'Interactive: Constraint ID decoder',
    ],
    'market-impacts': [
      'What "binding" means: LHS = RHS, marginal value ≠ 0',
      'Shadow price (marginal value): λ = ∂(dispatch cost) / ∂(RHS)',
      'Regional price separation from binding interconnector constraints',
      'Congestion rent calculation',
      'CVP factors: priority order for constraint violations',
      'Case study: X5 constraint — SW NSW solar curtailment',
      'Case study: SA islanding 2020 — Heywood trip, $90M+ FCAS bill',
      'Case study: Opaque congestion (Jun 2024) — N-DPWG_63_X5 hidden curtailment',
    ],
    'data-access': [
      'AEMO Congestion Information Resource (CIR)',
      'NEMweb MMS Archive — GENCONDATA, SPD tables, GENERICCONSTRAINTRHS',
      'NEMOSIS Python: dynamic_data_compiler() for DISPATCHCONSTRAINT',
      'Julius Susanto\'s NEM_constraints library',
      'AEMO MMS Data Model Report — column-level documentation',
      'AEMO Monthly Constraint Reports',
      'Interactive: Constraint lookup panel using AURES data',
    ],
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-xl p-8 text-center">
        <p className="text-3xl mb-3">🔨</p>
        <p className="text-sm font-semibold text-[var(--color-text)] mb-1">Lesson {lesson.number} is being built</p>
        <p className="text-xs text-[var(--color-text-muted)]">Content and interactive components coming soon</p>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-xs font-semibold text-[var(--color-text)] mb-3">This lesson will cover:</p>
        <ul className="space-y-2">
          {(topics[lesson.id] || []).map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="text-[var(--color-primary)] mt-0.5 shrink-0">→</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ============================================================
// Lesson Shell — navigation wrapper
// ============================================================

function LessonShell({ lesson, progress, onComplete }: {
  lesson: LessonMeta
  progress: Set<string>
  onComplete: (id: string) => void
}) {
  const navigate = useNavigate()
  const isComplete = progress.has(lesson.id)
  const currentIndex = LESSONS.findIndex(l => l.id === lesson.id)
  const prev = currentIndex > 0 ? LESSONS[currentIndex - 1] : null
  const next = currentIndex < LESSONS.length - 1 ? LESSONS[currentIndex + 1] : null

  const ContentComponent = {
    'dispatch-problem': Lesson1,
    'constraint-anatomy': Lesson2,
    'injection-shift-factors': Lesson3,
    'constraint-types': Lesson4,
    'ids-and-sets': Lesson5,
    'market-impacts': Lesson6,
    'data-access': Lesson7,
  }[lesson.id]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-[var(--color-text-muted)]">
        <Link to="/learn/constraints" className="hover:text-[var(--color-primary)] transition-colors">
          ← Constraints Module
        </Link>
        <span>/</span>
        <span>Lesson {lesson.number}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
            Lesson {lesson.number} of {LESSONS.length}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{lesson.readingTime}</span>
          {isComplete && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              ✓ Complete
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">{lesson.title}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{lesson.subtitle}</p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {LESSONS.map((l, i) => (
          <div
            key={l.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < currentIndex ? 'bg-emerald-500' :
              i === currentIndex ? 'bg-[var(--color-primary)]' :
              'bg-[var(--color-border)]'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      {ContentComponent ? <ContentComponent /> : <ComingSoon lesson={lesson} />}

      {/* Mark complete + navigation */}
      <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-3">
        {!isComplete && lesson.built && (
          <button
            onClick={() => onComplete(lesson.id)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            ✓ Mark as complete
          </button>
        )}
        <div className="flex gap-2 sm:ml-auto">
          {prev && (
            <button
              onClick={() => navigate(`/learn/constraints/${prev.id}`)}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              ← Lesson {prev.number}
            </button>
          )}
          {next && (
            <button
              onClick={() => { onComplete(lesson.id); navigate(`/learn/constraints/${next.id}`) }}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
            >
              Lesson {next.number} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Module Index
// ============================================================

function ModuleIndex({ progress }: { progress: Set<string> }) {
  const completed = LESSONS.filter(l => progress.has(l.id)).length
  const pct = Math.round((completed / LESSONS.length) * 100)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link to="/guides" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
          ← Guides & Documentation
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⚡</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
            Learning Module
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Network Constraints in the NEM
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
          From physics to price — a 7-lesson module explaining how transmission constraints work,
          how AEMO models them, and how binding constraints move spot prices. Pitched at the
          practitioner level with real constraint IDs and MMS data throughout.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Your progress</span>
          <span className="text-xs font-semibold text-[var(--color-text)]">{completed} / {LESSONS.length} lessons</span>
        </div>
        <div className="h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {completed === LESSONS.length && (
          <p className="text-xs text-emerald-400 mt-2 font-medium">🎉 Module complete!</p>
        )}
      </div>

      {/* Lessons */}
      <div className="space-y-3">
        {LESSONS.map((lesson) => {
          const isDone = progress.has(lesson.id)
          return (
            <Link
              key={lesson.id}
              to={lesson.built ? `/learn/constraints/${lesson.id}` : '#'}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                lesson.built
                  ? 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]/30 active:scale-[0.99]'
                  : 'bg-[var(--color-bg-card)]/50 border-[var(--color-border)]/50 cursor-default opacity-60'
              }`}
              onClick={e => !lesson.built && e.preventDefault()}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${
                isDone ? 'bg-emerald-500/20 text-emerald-400' :
                lesson.built ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' :
                'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
              }`}>
                {isDone ? '✓' : lesson.number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{lesson.title}</p>
                  {!lesson.built && (
                    <span className="text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{lesson.subtitle}</p>
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">{lesson.readingTime}</span>
            </Link>
          )
        })}
      </div>

      {/* Data source note */}
      <div className="mt-6 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Sources</p>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Content drawn from AEMO's Constraint Formulation Guidelines, Constraint Naming Guidelines, Congestion Information
          Resource, and MMS Data Model documentation. Case studies sourced from WattClarity analysis. Interactive examples
          use simplified but mathematically accurate models of real constraint equations (X5 / N^^N_NIL_3) and DC power flow.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Module root — routes /learn/constraints and /learn/constraints/:lessonId
// ============================================================

export default function ConstraintsModule() {
  const { lessonId } = useParams<{ lessonId?: string }>()
  const [progress, setProgress] = useState<Set<string>>(() => loadProgress())

  const markComplete = useCallback((id: string) => {
    setProgress(prev => {
      const next = new Set(prev)
      next.add(id)
      saveProgress(next)
      return next
    })
  }, [])

  if (!lessonId) {
    return <ModuleIndex progress={progress} />
  }

  const lesson = LESSONS.find(l => l.id === lessonId)
  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] px-4 text-center">
        <span className="text-5xl mb-4">🔍</span>
        <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">Lesson not found</h1>
        <Link to="/learn/constraints" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Back to module
        </Link>
      </div>
    )
  }

  return <LessonShell lesson={lesson} progress={progress} onComplete={markComplete} />
}
