/**
 * PPAs for Renewable Projects — AURES Learning Module
 *
 * 11 lessons covering the full PPA story: history from state utility
 * offtake through the corporate boom to sovereign-backed contracts;
 * anatomy and the three structural forms (physical/financial/virtual);
 * volume shape and hourly matching; LGC bundling; the major Australian
 * corporate deals; risk allocation; pricing (BNEF + structural drivers);
 * government counterparties (CIS/LTESA/VRET); the corporate buyer
 * landscape today; and the 2026-2030 outlook.
 */
import { useState, useCallback, useMemo, memo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// CISA Leverage Calculator (Lesson 9)
// ============================================================
// Shows how CISA's revenue floor lets lenders size higher senior debt,
// magnifying equity sponsor IRR (and also magnifying downside squeeze
// when project IRR falls below cost of debt). Standard project-finance
// leverage formula: Equity IRR ≈ Project IRR + (Project IRR − Cost of
// debt) × (Debt / Equity).

// Slider defined OUTSIDE the component (Vite HMR + re-mount bug — same
// fix as the CIS/LTESA module calculator).
const LevSlider = memo(function LevSlider({
  label, value, min, max, step, onChange, format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className="font-mono font-semibold text-[var(--color-text)]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-[var(--color-bg-elevated)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
      />
    </div>
  )
})

function leveredEquityIrr(projectIrr: number, costOfDebt: number, gearing: number): number {
  // gearing is 0..1; debt/equity = g / (1−g). At gearing 100% (no equity)
  // the formula explodes — clamp to 99% for display sanity.
  const g = Math.min(gearing, 0.99)
  const de = g / (1 - g)
  return projectIrr + (projectIrr - costOfDebt) * de
}

function CisaLeverageCalculator() {
  const [projectIrrP50, setProjectIrrP50] = useState(9.0)   // %
  const [costOfDebt, setCostOfDebt] = useState(6.5)         // %
  const [projectIrrP90, setProjectIrrP90] = useState(5.0)   // % — stress case

  // Two gearing presets that bookend the typical merchant vs CISA-backed range
  const MERCHANT_GEARING = 0.60
  const CISA_GEARING = 0.75

  const results = useMemo(() => {
    const merch_p50 = leveredEquityIrr(projectIrrP50, costOfDebt, MERCHANT_GEARING)
    const merch_p90 = leveredEquityIrr(projectIrrP90, costOfDebt, MERCHANT_GEARING)
    const cisa_p50  = leveredEquityIrr(projectIrrP50, costOfDebt, CISA_GEARING)
    const cisa_p90  = leveredEquityIrr(projectIrrP90, costOfDebt, CISA_GEARING)
    return {
      merch_p50, merch_p90,
      cisa_p50, cisa_p90,
      uplift_p50: cisa_p50 - merch_p50,
      erosion_p90: cisa_p90 - merch_p90,  // negative when CISA hurts more in stress
    }
  }, [projectIrrP50, projectIrrP90, costOfDebt])

  const fmtPct1 = (v: number) => `${v.toFixed(1)}%`

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 my-4 space-y-5">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        Inputs · adjust to see the CISA leverage effect
      </p>

      <div className="grid sm:grid-cols-3 gap-x-6 gap-y-3">
        <LevSlider label="Project IRR (unlevered, P50)" value={projectIrrP50}
          min={4} max={15} step={0.1} onChange={setProjectIrrP50} format={fmtPct1} />
        <LevSlider label="Cost of debt (all-in)" value={costOfDebt}
          min={3} max={9} step={0.1} onChange={setCostOfDebt} format={fmtPct1} />
        <LevSlider label="Project IRR (stress, P90)" value={projectIrrP90}
          min={0} max={12} step={0.1} onChange={setProjectIrrP90} format={fmtPct1} />
      </div>

      <div className="overflow-x-auto pt-2 border-t border-[var(--color-border)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--color-text-muted)]">
              <th className="text-left py-2 pr-3 font-semibold uppercase tracking-wider text-[10px]">Financing</th>
              <th className="text-right py-2 px-2 font-semibold uppercase tracking-wider text-[10px]">Gearing</th>
              <th className="text-right py-2 px-2 font-semibold uppercase tracking-wider text-[10px]">Equity IRR · P50</th>
              <th className="text-right py-2 px-2 font-semibold uppercase tracking-wider text-[10px]">Equity IRR · P90</th>
              <th className="text-right py-2 pl-2 font-semibold uppercase tracking-wider text-[10px]">P50 − P90 range</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[var(--color-border)]">
              <td className="py-2 pr-3 font-mono text-[var(--color-text)]">Merchant (no CISA)</td>
              <td className="py-2 px-2 text-right font-mono text-[var(--color-text-muted)]">60% debt</td>
              <td className="py-2 px-2 text-right font-mono text-[var(--color-text)]">{results.merch_p50.toFixed(2)}%</td>
              <td className={`py-2 px-2 text-right font-mono ${results.merch_p90 < 0 ? 'text-red-400' : 'text-[var(--color-text)]'}`}>
                {results.merch_p90.toFixed(2)}%
              </td>
              <td className="py-2 pl-2 text-right font-mono text-[var(--color-text-muted)]">
                {(results.merch_p50 - results.merch_p90).toFixed(2)}pp
              </td>
            </tr>
            <tr className="border-t border-[var(--color-border)] bg-[var(--color-primary)]/5">
              <td className="py-2 pr-3 font-mono text-[var(--color-text)]">CISA-backed</td>
              <td className="py-2 px-2 text-right font-mono text-[var(--color-text-muted)]">75% debt</td>
              <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-400">
                {results.cisa_p50.toFixed(2)}%
              </td>
              <td className={`py-2 px-2 text-right font-mono font-semibold ${results.cisa_p90 < 0 ? 'text-red-400' : 'text-[var(--color-text)]'}`}>
                {results.cisa_p90.toFixed(2)}%
              </td>
              <td className="py-2 pl-2 text-right font-mono text-[var(--color-text-muted)]">
                {(results.cisa_p50 - results.cisa_p90).toFixed(2)}pp
              </td>
            </tr>
            <tr className="border-t border-[var(--color-border)] text-[var(--color-text-muted)]">
              <td className="py-2 pr-3 italic">CISA effect</td>
              <td className="py-2 px-2 text-right font-mono">+15pp</td>
              <td className={`py-2 px-2 text-right font-mono font-semibold ${results.uplift_p50 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {results.uplift_p50 >= 0 ? '+' : ''}{results.uplift_p50.toFixed(2)}pp
              </td>
              <td className={`py-2 px-2 text-right font-mono font-semibold ${results.erosion_p90 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {results.erosion_p90 >= 0 ? '+' : ''}{results.erosion_p90.toFixed(2)}pp
              </td>
              <td className="py-2 pl-2 text-right font-mono">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs leading-relaxed text-[var(--color-text)]">
        <p className="font-semibold uppercase tracking-wider text-[10px] text-blue-400 mb-2">
          Reading the table
        </p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>
            With project IRR &gt; cost of debt, <em>more debt magnifies equity IRR</em>. The CISA-backed
            P50 row should be ~{((results.cisa_p50 - results.merch_p50) >= 0 ? '' : '−')}{Math.abs(results.uplift_p50).toFixed(1)}pp higher than merchant.
          </li>
          <li>
            With project IRR &lt; cost of debt (P90 stress), <em>more debt magnifies equity erosion</em>.
            The CISA-backed P90 row falls further than the merchant P90. The asymmetric leverage cuts both ways.
          </li>
          <li>
            The CISA only "wins" if its floor + 90% coverage keeps project IRR materially above the cost of debt
            in the downside. A floor of $55/MWh with a 10% deductible and a $25M annual cap typically does — but the worst
            stress scenarios (low CF + low RRP) can break the assumption (see Item 10 of the PPA × CISA checklist).
          </li>
        </ul>
      </div>
    </div>
  )
}


// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-ppas-progress'

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
}

const LESSONS: LessonMeta[] = [
  { id: 'history',         number: 1,  title: 'A brief history of the Australian PPA',                subtitle: 'From utility offtake to corporate boom to sovereign-backed CFD',  readingTime: '11 min' },
  { id: 'anatomy',         number: 2,  title: 'Anatomy of a renewable PPA',                            subtitle: 'Term, price, shape, volume, risk — the 30+ clauses bankability turns on', readingTime: '13 min' },
  { id: 'structures',      number: 3,  title: 'Physical, financial, virtual — the three PPA structures', subtitle: 'How each works mechanically and what each does for the parties',  readingTime: '12 min' },
  { id: 'shape',           number: 4,  title: 'Volume shape and the hourly-matching movement',         subtitle: 'Firm vs as-generated vs shaped vs 24/7 hourly carbon-free',       readingTime: '12 min' },
  { id: 'lgc',             number: 5,  title: 'LGC bundling — bundled vs stripped PPAs',               subtitle: 'The $90 → $5 LGC market collapse and what it did to PPA economics', readingTime: '11 min' },
  { id: 'corporate-deals', number: 6,  title: 'Corporate PPAs in Australia — the big deals',           subtitle: 'Telstra, BHP, Coles, Microsoft, Amazon, Atlassian, Aldi — what each shaped', readingTime: '14 min' },
  { id: 'risk',            number: 7,  title: 'Risk allocation in detail',                             subtitle: 'Curtailment, MLF, basis, volume, change-in-law — who carries what', readingTime: '12 min' },
  { id: 'pricing',          number: 8,  title: 'PPA pricing — the BNEF index and structural drivers',  subtitle: 'Solar vs wind divergence, the firming premium, where prices are heading', readingTime: '12 min' },
  { id: 'sovereign',       number: 9,  title: 'Government as counterparty — CIS, LTESA, VRET, ACT',    subtitle: 'How sovereign-backed contracts crowd in (or out) corporate offtake', readingTime: '12 min' },
  { id: 'buyers',          number: 10, title: 'The corporate buyer landscape today',                   subtitle: 'Who is buying, why, and how 24/7 carbon-free is reshaping demand', readingTime: '12 min' },
  { id: 'outlook',         number: 11, title: 'Where this is going — the 2026-2030 PPA outlook',       subtitle: 'Firmed-as-default, data centre wave, bankability questions',      readingTime: '11 min' },
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
// Lesson 1 — A brief history of the Australian PPA
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>Why the PPA is the backbone of project finance</H2>
      <P>
        For every utility-scale wind, solar or battery project in Australia, the question that
        ultimately decides whether the project gets built is the same: <Em>who buys the energy,
        and at what price?</Em> The Power Purchase Agreement (PPA) is the legal instrument that
        answers that question. It is the foundation on which project debt is sized, equity is
        committed, and EPC contracts are signed. A project without a PPA — or with a PPA that
        carries too much residual risk — typically cannot reach financial close. The history of
        the Australian PPA is therefore the history of how the renewable energy industry has
        sourced revenue certainty across four very different eras.
      </P>

      <H2>Era 1 — the state utility era (pre-1998)</H2>
      <P>
        Before the National Electricity Market opened in December 1998, electricity in
        Australia was supplied by six state-owned vertically-integrated utilities (covered in
        the Energy Transition module). New generation was added by the state utility itself,
        with internal funding and internal revenue allocation — there was no commercial PPA
        market because the same entity owned both the generation and the customer.
      </P>
      <P>
        The few exceptions were independent gas-fired peaking plants in Victoria and South
        Australia from the mid-1990s, which signed long-term offtake contracts with the host
        state utility. These were the embryonic PPAs of the Australian market — typically
        25-year tolling agreements with the state retailer.
      </P>

      <H2>Era 2 — the RET decade (1998-2016)</H2>
      <P>
        The post-NEM, post-MRET (Mandatory Renewable Energy Target, 2001) period was the era of
        the <Em>utility PPA</Em>. Almost every major Australian wind farm built 2002-2016 had a
        long-term PPA with one of the gentailers — AGL, Origin, EnergyAustralia (then
        TruEnergy/CLP) — or with a smaller retailer. Typical structures:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Term:</Em> 10-15 years</li>
        <li><Em>Price:</Em> generally bundled energy + LGC at a single $/MWh strike</li>
        <li><Em>Volume:</Em> as-generated (the project sells everything it produces; gentailer
          takes shape risk)</li>
        <li><Em>Indexation:</Em> CPI or a fixed escalation (typically 1-2%/yr)</li>
        <li><Em>Counterparty:</Em> one of the Big 3 gentailers, sometimes via a smaller retailer
          on-sold to the gentailer</li>
      </ul>
      <P>
        Iconic deals from this era included Origin Energy's Cullerin Range PPA (2008), AGL's
        offtake of Macarthur Wind Farm (2012) and Coopers Gap Wind Farm (2018), and various
        smaller wind farm offtakes through Pacific Hydro, Energy Australia, Snowy Hydro and
        Hydro Tasmania. The model was effective but structurally limited — the demand for
        new PPAs depended entirely on the gentailers' appetite for long-dated commitments,
        which contracted sharply after 2014 as wholesale prices and LGC values fell.
      </P>

      <H2>Era 3 — the corporate boom (2017-2022)</H2>
      <P>
        The market-defining shift came in <Em>October 2017</Em>: <Em>Telstra</Em> announced an
        offtake of the Murra Warra Wind Farm (Stage 1, RES Australia, Victoria) — 226 MW for an
        11-year term. The "Telstra deal" demonstrated three things that re-shaped the market:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>A corporate (non-utility) buyer could underwrite a renewable project at scale</li>
        <li>The buyer could use the PPA to meet its sustainability commitments (RE100, Science
          Based Targets, internal carbon-neutral goals)</li>
        <li>The "virtual PPA" structure (covered in Lesson 3) made cross-jurisdictional
          contracting practical, opening up the buyer pool dramatically</li>
      </ul>
      <P>
        Through 2017-2022, the corporate PPA market exploded:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'Approx. new corporate PPA capacity', 'Key deals']}
        rows={[
          ['2017', '~250 MW', 'Telstra-Murra Warra; ANZ; CUB'],
          ['2018', '~700 MW', 'BHP Olympic Dam; Sydney Airport; ALDI; UNSW'],
          ['2019', '~900 MW', 'Coles; Woolworths; ANZ; Carlton & United'],
          ['2020', '~600 MW', 'Coles-ENGIE 100%; Microsoft pilots'],
          ['2021', '~1,000 MW', 'Microsoft major deals; Amazon Bango'],
          ['2022', '~1,100 MW', 'Microsoft-ACEN; Amazon; Bunnings; Atlassian'],
        ]}
      />
      <P>
        By end-2022, the cumulative Australian corporate PPA market had reached approximately
        <Em> 3.5 GW of signed capacity</Em> — the third-largest national corporate PPA market in
        the world, behind only the US and Spain.
      </P>

      <H2>Era 4 — the sovereign-backed era (2022-present)</H2>
      <P>
        Through 2022-2024, three sovereign-backed offtake mechanisms scaled to a point where
        they began re-shaping the PPA market:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>NSW LTESA</Em> (Long-Term Energy Service Agreement) — first round 2021, scaled
          to majors 2022-2025. Fixed-price floor + ceiling CFD with a 20-year term.</li>
        <li><Em>Federal CIS</Em> (Capacity Investment Scheme) — first round 2023, accelerated
          2024-2025. Revenue floor + ceiling CFD; 12-15 year terms.</li>
        <li><Em>VIC VRET</Em> (Victorian Renewable Energy Target) — reverse auctions 2017,
          2018, 2022. Fixed-price CFD with the VIC government.</li>
      </ul>
      <P>
        These mechanisms are functionally PPAs but with the state or federal government as
        counterparty. Combined, they have committed roughly 25-30 GW of capacity to revenue
        underwriting by mid-2026 — dwarfing the cumulative corporate PPA market of ~5 GW (by
        end-2025).
      </P>
      <P>
        The implication for the corporate PPA market has been profound. With sovereign-backed
        revenue floors widely available, developers can secure project finance without a
        corporate PPA. Corporate buyers therefore now compete with the federal government for
        the marginal project — and many corporate buyers have shifted from being primary
        offtakers to providing "uplift" or "topping" against a sovereign floor.
      </P>

      <H2>Where we are today — the four-era summary</H2>
      <Table
        emphasizeFirst
        headers={['Era', 'Dominant counterparty', 'Typical term', 'Typical pricing structure', 'Volume shape']}
        rows={[
          ['Era 1 (pre-1998)', 'State utility (self-funded)', '25 yrs tolling', 'Internal recovery', 'N/A'],
          ['Era 2 (1998-2016)', 'Big 3 gentailers', '10-15 yrs', 'Bundled energy + LGC, $/MWh fixed', 'As-generated'],
          ['Era 3 (2017-2022)', 'Corporate buyer (RE100)', '7-15 yrs', 'Mostly virtual CFD; bundled LGC', 'As-generated or pay-as-produced'],
          ['Era 4 (2022+)', 'Federal/State Govt', '12-20 yrs', 'Floor + ceiling CFD', 'As-generated; firmness premium for storage'],
        ]}
      />

      <Callout type="key">
        The Australian PPA market has evolved from a closed state-utility internal funding
        mechanism to a complex multi-counterparty marketplace where corporate buyers,
        gentailers, and government CFDs all compete for offtake. Each era's structural
        assumptions still echo — pre-2014 wind farms still operating on Era-2 utility PPAs,
        the corporate boom signed deals still progressing, the CIS rounds reshaping the
        2026-2030 pipeline. Understanding which era a particular project sits in is the first
        step in reading its economics.
      </Callout>

      <Callout type="source">
        Sources: Australian Energy Regulator <em>State of the Energy Market 2024</em> ·
        BloombergNEF Australia PPA Tracker · Clean Energy Council Corporate PPA database ·
        Energetics PPA Outlook 2024 · BRC-A (Business Renewables Centre Australia)
        cumulative deal tracker.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — Anatomy of a renewable PPA
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>What a PPA actually contains</H2>
      <P>
        A typical Australian utility-scale renewable PPA is a 200-400 page contract with
        approximately 30 substantive clauses plus extensive schedules and definitions. The core
        commercial terms are negotiated; many ancillary terms follow industry-standard precedent
        established in the Big 3 gentailer template PPAs from the 2010s.
      </P>
      <P>
        Six terms drive 90% of the commercial value of any PPA:
      </P>
      <Table
        emphasizeFirst
        headers={['Term', 'What it specifies', 'Typical range', 'Why it matters']}
        rows={[
          ['Strike price ($/MWh)', 'The price the buyer pays per MWh delivered', '$45-130/MWh (technology + shape dependent)', 'Primary revenue determinant'],
          ['Term', 'Length of the contract', '7-20 years (typically 10-15)', 'Sets debt tenor; equity return horizon'],
          ['Indexation', 'How the strike price escalates', 'CPI-linked (most common), fixed 1.5-2.5%/yr, or partial CPI', 'Determines real revenue over the term'],
          ['Volume profile', 'What and how much energy is delivered', 'As-generated, baseload, shaped, hourly-matched', 'Shape risk allocation (Lesson 4)'],
          ['LGC treatment', 'Whether Large-scale Generation Certificates are bundled or stripped', 'Bundled (most), stripped (some)', 'LGC value goes to one party or the other'],
          ['Counterparty', 'Who is on the other side', 'Corporate buyer / gentailer / sovereign body', 'Credit risk + dispatch optimisation'],
        ]}
      />

      <H2>Beyond the headline — the second-tier terms</H2>
      <P>
        Below these six there is a band of approximately 10-15 terms that get carefully
        negotiated on most deals:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Curtailment risk allocation</Em> — economic vs technical curtailment, who absorbs
          each (Lesson 7)</li>
        <li><Em>MLF risk</Em> — does the buyer pay gross of MLF or net of MLF; if net, who
          carries the MLF degradation risk</li>
        <li><Em>Force majeure</Em> — what events excuse non-performance; how long is the
          buyer's option to terminate</li>
        <li><Em>Change in law</Em> — what regulatory changes trigger price re-opener or
          termination right</li>
        <li><Em>Change in market design</Em> — specifically, what happens if the NEM moves to
          5-minute settlement, capacity markets, etc.</li>
        <li><Em>Security and credit support</Em> — bank guarantees, parent company guarantees,
          letters of credit</li>
        <li><Em>Step-in rights</Em> — lender step-in rights if the developer defaults</li>
        <li><Em>Termination payments</Em> — what each party pays if the contract ends early</li>
        <li><Em>Capex hold-back / construction milestones</Em> — when does payment start
          (typically COD = R2)</li>
        <li><Em>Settlement methodology</Em> — billing cycle, dispute resolution, audit rights</li>
        <li><Em>Insurance</Em> — what insurance the seller must maintain</li>
        <li><Em>Volume cap / floor</Em> — upper limit on delivery; lower limit (LD risk)</li>
        <li><Em>Buyer financial covenants</Em> — quarterly/annual reporting obligations</li>
        <li><Em>Reps and warranties</Em> — site, technology, regulatory status</li>
      </ul>

      <H2>Schedules and technical annexures</H2>
      <P>
        Behind the main clauses, every PPA has technical schedules:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project description</Em> — site, capacity, technology, expected output</li>
        <li><Em>Volume forecast</Em> — P50, P90, P99 generation profiles</li>
        <li><Em>Delivery point</Em> — which NEM region, settlement node</li>
        <li><Em>Metering and verification</Em> — AEMO meter requirements, audit procedures</li>
        <li><Em>LGC accreditation and surrender</Em> — Clean Energy Regulator interface</li>
        <li><Em>Operational procedures</Em> — dispatch coordination, outage notifications</li>
        <li><Em>Reporting requirements</Em> — monthly/quarterly/annual schedules</li>
      </ul>

      <H2>The bankability bar — what lenders look for</H2>
      <P>
        For a project to reach financial close on the back of a PPA, the contract typically
        needs to meet what lenders call the <Em>bankability bar</Em>:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Investment-grade counterparty</Em> — buyer credit rating typically BBB+ or
          better (or a parent guarantee from an entity that is)</li>
        <li><Em>Term ≥ debt tenor</Em> — PPA term must cover the debt repayment period (typically
          10-15 years for project finance)</li>
        <li><Em>Predictable revenue ≥ debt service + maintenance</Em> — guaranteed minimum
          revenue covers operational costs plus debt service plus a Debt Service Coverage Ratio
          (DSCR) cushion of 1.30-1.50x</li>
        <li><Em>Clean termination provisions</Em> — early termination by the buyer doesn't
          leave the project stranded</li>
        <li><Em>Recognised market practice on risk allocation</Em> — curtailment, MLF, change-
          in-law follow standard precedent</li>
      </ul>
      <P>
        Projects that don't meet the bankability bar may still secure offtake but cannot raise
        senior debt against it. They must rely on equity, mezzanine, or sponsor balance sheets
        — adding 200-400 basis points to the cost of capital and shrinking project returns
        accordingly.
      </P>

      <H2>The "pre-development risk allocation" question</H2>
      <P>
        One under-appreciated detail: most PPAs are signed during development, before
        construction commences. This means the buyer must take some pre-development risk:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Planning approval risk — will the project achieve consent?</li>
        <li>Connection risk — will the project achieve R1 then R2 on time?</li>
        <li>Construction risk — will the project complete on schedule and budget?</li>
      </ul>
      <P>
        The PPA typically includes <Em>conditions precedent</Em> that allow the buyer to
        terminate or re-price if these don't materialise. Buyer-friendly PPAs have many
        conditions; seller-friendly PPAs (more common today) have fewer. The negotiation
        balance depends on bargaining power — a developer with multiple competing buyers can
        push back; a developer with one interested buyer accepts more conditions.
      </P>

      <Callout type="key">
        The PPA is not a price-and-volume contract. It is a sophisticated risk-allocation
        document that distributes ~30 distinct project risks between buyer and seller. The
        commercial outcome of a PPA is determined as much by which party carries which risks
        as by the headline price. Lenders read the risk-allocation schedule first; the price
        second. Project teams should approach PPA negotiation the same way.
      </Callout>

      <Callout type="source">
        Sources: King &amp; Wood Mallesons <em>Australian PPA Practice</em> 2024 · Clean Energy
        Council <em>Corporate PPA toolkit</em> · MinterEllison <em>Corporate PPA series</em> ·
        AEMO Bilateral Contract Framework · BloombergNEF Australia PPA structure database.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — Physical, financial, virtual — the three PPA structures
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>Three structures, three sets of mechanics</H2>
      <P>
        Almost every PPA in the Australian market falls into one of three structures, each with
        very different operational, financial, accounting, and tax implications:
      </P>
      <Table
        emphasizeFirst
        headers={['Structure', 'Physical flow', 'Financial flow', 'Common uses']}
        rows={[
          ['Physical PPA', 'Yes — buyer takes title to physical electricity at delivery point', 'Buyer pays seller for delivered MWh', 'Gentailers buying for retail customer base; large industrial users with co-located plant'],
          ['Financial PPA (CFD)', 'No — energy flows to pool; settlement is purely financial', 'Difference settled monthly: (PPA strike − pool price) × MWh', 'Most modern corporate PPAs; CIS, LTESA, VRET'],
          ['Virtual PPA (Synthetic / Sleeved)', 'No — energy is sold by the project to the spot market', 'Buyer pays/receives the difference between PPA strike and pool price', 'Cross-jurisdictional corporate buyers (most common modern structure)'],
        ]}
      />

      <H2>Physical PPAs — the traditional model</H2>
      <P>
        A <Em>physical PPA</Em> is what most people imagine when they hear "PPA": the project
        generates electricity, the buyer takes title, the buyer pays a contracted price.
        Mechanically:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The project bids its energy into the NEM spot market like any other generator</li>
        <li>The buyer is a registered NEM market participant (typically a retailer)</li>
        <li>The buyer settles AEMO dispatch transactions against its retail customer load</li>
        <li>The contract specifies the price the buyer pays the project per MWh — independent
          of the spot price</li>
        <li>The buyer absorbs the difference between contracted price and pool price</li>
      </ul>
      <P>
        Physical PPAs are commercially clean — the buyer literally owns the electricity. They
        suit gentailers (AGL, Origin, EnergyAustralia, Alinta) buying for their own retail
        customer base, where the gentailer is already a NEM participant. They are less suited
        to corporate buyers — a manufacturing company is not a NEM participant and cannot
        directly settle dispatch transactions.
      </P>

      <H2>Financial PPAs (CFDs) — the settlement-only model</H2>
      <P>
        A <Em>Financial PPA</Em>, also called a <Em>Contract for Difference (CFD)</Em>, settles
        purely financially. No electricity flows between buyer and seller. Mechanically:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The project sells its energy into the NEM spot market — earning the regional
          reference price (RRP) for every MWh dispatched</li>
        <li>The contract specifies a fixed price (the strike or CFD price)</li>
        <li>Each settlement period, the difference between strike and RRP is paid:
          <ul className="list-circle list-inside ml-4 mt-1 space-y-1">
            <li>If RRP &lt; strike: buyer pays project (strike − RRP) × MWh</li>
            <li>If RRP &gt; strike: project pays buyer (RRP − strike) × MWh</li>
          </ul>
        </li>
        <li>The net result is that the project's effective realised price is the strike, and
          the buyer's effective realised price for the same MWh is also the strike</li>
      </ul>
      <P>
        Most government schemes (CIS, LTESA, VRET) are Financial PPAs / CFDs. They are
        legally simple, regulatory-friendly, and avoid the complexity of physical delivery
        across NEM regions.
      </P>

      <Callout type="numbers">
        <strong>Worked example — Financial PPA settlement.</strong> A 200 MW solar farm signs a
        Financial PPA at $60/MWh strike. In a given month it dispatches 30,000 MWh at average
        RRP of $50/MWh. Settlement:
        <br /><br />
        Project receives from NEM spot: 30,000 × $50 = $1.5M
        <br />
        Project receives from buyer: 30,000 × ($60 − $50) = $300k
        <br />
        Total project revenue: $1.8M = effective $60/MWh
        <br /><br />
        Net buyer cost: 30,000 × $60 = $1.8M (replicates the cost of buying that energy at the
        strike)
      </Callout>

      <H2>Virtual PPAs — the corporate buyer's instrument</H2>
      <P>
        A <Em>Virtual PPA (VPPA)</Em>, also called <Em>Synthetic PPA</Em> or sometimes
        <Em> Sleeved PPA</Em>, is a Financial PPA + a separate retail electricity supply
        arrangement. The buyer is a corporate end-user (Microsoft, Coles, BHP) that:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Continues to buy its actual electricity from a retailer at standard retail rates
          (or at large-customer wholesale-pass-through rates)</li>
        <li>Separately enters into a Financial PPA with the renewable project — settling the
          difference between PPA strike and the project's regional pool price</li>
        <li>Receives the LGCs from the project, which it surrenders against its retail
          consumption (or holds for ESG reporting)</li>
        <li>Reports the underlying renewable generation as "matched" against its consumption
          for Scope 2 emissions purposes</li>
      </ul>
      <P>
        The Virtual PPA structure is what made the corporate PPA boom possible. Before VPPAs,
        a corporate buyer in New South Wales couldn't easily buy energy from a wind farm in
        Victoria (different NEM regions, different retailer settlements). With a Virtual PPA,
        the corporate sponsors the project economically while remaining commercially separate
        from the physical electricity supply chain.
      </P>

      <H2>Sleeved variant — the gentailer middle-layer</H2>
      <P>
        A <Em>Sleeved PPA</Em> is structurally similar to a Virtual PPA but uses a gentailer
        as a middle layer:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The project signs a physical PPA with the gentailer</li>
        <li>The gentailer signs a back-to-back arrangement with the corporate buyer</li>
        <li>The gentailer takes a margin for managing dispatch and settlement complexity</li>
        <li>The corporate buyer gets the renewable energy attribution but pays the gentailer
          rather than the project directly</li>
      </ul>
      <P>
        Sleeved structures were common 2018-2020 (when gentailer balance sheets supported
        large corporate intermediation) but have declined as corporate buyers became
        comfortable with direct Virtual PPAs.
      </P>

      <H2>Accounting and tax implications</H2>
      <P>
        The three structures have very different accounting treatments:
      </P>
      <Table
        emphasizeFirst
        headers={['Structure', 'For the buyer', 'For the seller']}
        rows={[
          ['Physical PPA', 'Cost of goods (electricity purchase)', 'Revenue (energy sale)'],
          ['Financial PPA / CFD', 'Hedge accounting under AASB 9; can be designated cash flow hedge', 'Energy revenue + CFD settlement income/expense'],
          ['Virtual PPA', 'Derivative under AASB 9; mark-to-market through P&L (or hedge accounting if designated)', 'Energy revenue + CFD settlement; LGC sale'],
        ]}
      />
      <P>
        Virtual PPAs are derivatives. They generate <Em>mark-to-market P&amp;L volatility</Em>
        on the buyer's income statement unless designated as a cash flow hedge with proper
        documentation. Many corporates entered the VPPA market without fully understanding
        this — and have since hired specialist treasury teams to manage the accounting
        complexity. This is one of the practical reasons that corporate PPA volume slowed in
        2023-2024 even as project supply expanded.
      </P>

      <H2>Australian regulatory wrap</H2>
      <P>
        All three structures operate within the existing NEM framework — no special licensing
        is required for entering into a PPA. However:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The seller must be an AEMO-registered scheduled or non-scheduled generator</li>
        <li>The buyer in a Physical PPA must be a registered NEM customer/retailer</li>
        <li>Financial and Virtual PPAs are over-the-counter (OTC) derivatives — covered by
          ASIC derivative regulations and reporting requirements</li>
        <li>LGC transfers are administered by the Clean Energy Regulator</li>
      </ul>

      <Callout type="key">
        Choosing the right structure is one of the first decisions in any PPA negotiation. The
        choice affects which counterparties can participate, what accounting treatment applies,
        how settlement flows, and how the deal interacts with the buyer's retail electricity
        arrangements. Virtual PPAs dominate the modern corporate market; Financial PPAs (CFDs)
        dominate sovereign-backed contracts; Physical PPAs remain the natural fit for
        gentailers and large industrial customers.
      </Callout>

      <Callout type="source">
        Sources: AASB 9 (financial instruments) Australian Accounting Standards · ASIC Regulatory
        Guide 251 (OTC derivatives) · Clean Energy Regulator LGC procedures · King &amp; Wood
        Mallesons <em>Virtual PPA practice notes</em> · Norton Rose Fulbright
        <em> Australian corporate PPA structure guide</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — Volume shape and the hourly-matching movement
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>Why volume shape is the second-most-important PPA term</H2>
      <P>
        After strike price, volume shape is the single most important term in a renewable PPA.
        Shape determines:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>How much of the project's actual generation is delivered to the buyer</li>
        <li>Which party absorbs the difference between generation profile and demand profile</li>
        <li>The implicit firmness premium — the more "firm" the delivery, the higher the
          price the buyer pays</li>
      </ul>
      <P>
        Five major shape archetypes exist in the Australian market:
      </P>
      <Table
        emphasizeFirst
        headers={['Shape', 'What is delivered', 'Risk allocation', 'Typical premium / discount']}
        rows={[
          ['As-generated', 'Whatever the project produces, hour by hour', 'Buyer takes all shape risk', 'No firming premium; base case'],
          ['Pay-as-produced (PAP)', 'Same as as-generated but priced fixed', 'Buyer takes all shape risk; project paid fixed regardless', 'Slight premium for fixed-price certainty'],
          ['Baseload', 'A constant MW for each hour of the year', 'Project absorbs shape risk via storage or contracted firming', '+$10-25/MWh premium over as-generated'],
          ['Shaped (e.g. business hours)', 'Defined delivery hours only', 'Project firms the specific hours via storage or hedging', '+$5-15/MWh premium'],
          ['24/7 hourly-matched', 'Matched hour-by-hour to buyer\'s actual consumption', 'Project must firm every hour individually', '+$30-50/MWh premium over as-generated'],
        ]}
      />

      <H2>As-generated — the original baseline</H2>
      <P>
        For most of the 2017-2022 corporate PPA boom, the default structure was <Em>as-
        generated</Em>: the project delivers whatever it generates, hour by hour, and the
        buyer takes the shape risk. The buyer either uses the energy when it arrives (suiting
        time-of-day-flexible loads like data centres) or accepts the merchant-price exposure
        for hours when buyer demand is low.
      </P>
      <P>
        For a solar farm operating at 25-28% capacity factor in NSW, an as-generated PPA
        delivers:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>~80% of total generation during daylight hours (peak ~11am-2pm)</li>
        <li>0% generation overnight</li>
        <li>Seasonal variation — typically 30-40% more generation in summer than winter</li>
        <li>Weather-driven daily variability — clear summer day might produce 2.5× a cloudy
          winter day</li>
      </ul>

      <H2>The shape problem — solar's structural challenge</H2>
      <P>
        As Australian solar penetration grew from 2018 onwards, the value of as-generated
        solar PPAs declined. The reason was the merit-order effect (covered in detail in the
        Solar + BESS module Lesson 3): when many solar farms generate at the same time,
        wholesale prices crash. The buyer of an as-generated solar PPA at $60/MWh strike still
        pays $60/MWh — but the underlying energy is often available on the spot market at
        $20-40/MWh during the same hours. The buyer is effectively overpaying for solar at
        the times the project is generating.
      </P>
      <P>
        By 2022, this shape problem made as-generated solar PPAs increasingly unattractive to
        corporate buyers. The market began to demand firmer structures.
      </P>

      <H2>Baseload PPAs — the firming response</H2>
      <P>
        A <Em>baseload PPA</Em> commits the seller to deliver a constant MW every hour of the
        year. To meet this commitment from a variable renewable source, the seller must:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Either build co-located storage (BESS) sized to firm the variability</li>
        <li>Or contract with a firming provider (typically a gentailer or peaking gas plant)</li>
        <li>Or accept liquidated damages for hours when delivery falls short</li>
      </ul>
      <P>
        The premium for baseload over as-generated is typically <Em>$10-25/MWh</Em> — reflecting
        the cost of storage capex plus the value of firmness. For a buyer who genuinely needs
        24/7 supply (a large industrial customer, a hospital, a data centre), this premium is
        worth paying.
      </P>

      <H2>24/7 hourly-matched — the new gold standard</H2>
      <P>
        The most demanding modern PPA structure is <Em>24/7 hourly-matched</Em> — also called
        <em> 24/7 carbon-free energy</em> (CFE) matching, or <em>hourly granular matching</em>.
        Under this structure:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The buyer's actual hourly electricity consumption is measured</li>
        <li>The PPA must deliver renewable energy in the <em>same hour</em> the buyer consumes
          it</li>
        <li>The match is verified against the buyer's metering and the project's dispatch
          data</li>
        <li>Surplus generation in any hour is sold to the spot market and not matched against
          buyer consumption</li>
      </ul>
      <P>
        24/7 hourly matching is significantly harder than baseload because the buyer's load
        profile shapes the delivery requirement — and load profiles are typically inversely
        correlated with solar generation (load peaks evening; solar generates midday). The
        premium for 24/7 hourly matching is typically <Em>$30-50/MWh</Em> over as-generated
        — large in absolute terms but small relative to corporate sustainability commitments
        worth millions in brand value.
      </P>

      <H2>Who's adopting 24/7 hourly matching</H2>
      <P>
        Global hyperscaler buyers have led the movement:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Microsoft</Em> — committed to 100% 24/7 carbon-free energy across all
          operations by 2030; multiple Australian PPAs progressing toward hourly matching</li>
        <li><Em>Google</Em> — committed to 24/7 CFE by 2030; published methodologies on
          hourly matching</li>
        <li><Em>Amazon AWS</Em> — commitments to 24/7 CFE; piloting in Australia</li>
        <li><Em>Meta, Apple</Em> — RE100 plus 24/7 commitments under development</li>
      </ul>
      <P>
        In Australia specifically:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Microsoft has signed multiple PPAs with explicit pathway to 24/7 matching</li>
        <li>The ACT Government's 100% renewable supply (since 2020) uses an effectively-
          hourly-matched approach via reverse auction portfolios</li>
        <li>Some data centre operators (NextDC, AirTrunk) are exploring 24/7 CFE arrangements
          with their gentailer suppliers</li>
      </ul>

      <H2>Implications for project design</H2>
      <P>
        The shift from as-generated to firmer shapes has reshaped what projects developers are
        building:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Solar + co-located BESS hybrid projects have proliferated (the CIS T4 60% hybrid
          share, covered in Solar + BESS module Lesson 10)</li>
        <li>Solar + standalone BESS portfolios (combining a remote solar farm with an urban
          BESS) are increasingly contracted as a bundled offering</li>
        <li>Wind + storage hybrids are emerging more slowly because wind shape is less
          predictable than solar</li>
        <li>Pumped hydro + solar + wind multi-asset offtakes are appearing for very large
          24/7 commitments</li>
      </ul>

      <Callout type="key">
        Volume shape has moved from a peripheral PPA term to a primary design driver. The 2017-
        2022 era of as-generated solar PPAs is largely over; modern PPAs are increasingly
        firmed via co-located or contracted storage. The shift to 24/7 hourly matching adds
        another layer — corporate buyers are paying meaningful premiums for renewable
        attribution that genuinely matches their consumption profile, not just their annual
        total. Project teams that anticipate this shift are designing hybrid solar+BESS or
        wind+BESS configurations from day one; teams that don't face increasing difficulty
        finding corporate buyers for variable-only output.
      </Callout>

      <Callout type="source">
        Sources: Google <em>24/7 Carbon-Free Energy methodology</em> 2021 · UN Energy Compact
        on 24/7 Carbon-Free Energy · EnergyTag global standard for hourly matching ·
        Microsoft <em>Sustainability Report 2024</em> · ACT Government renewable electricity
        supply audit reports · Clean Energy Council
        <em> Hourly matching guidance</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — LGC bundling
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>What an LGC is and why it matters in a PPA</H2>
      <P>
        A <Em>Large-scale Generation Certificate (LGC)</Em> is a tradable renewable energy
        certificate created under the federal Renewable Energy Target. Every MWh of eligible
        renewable generation creates one LGC. LGCs are surrendered by liable retailers
        (electricity retailers above certain customer thresholds) against their annual
        obligation under the Renewable Energy Target. They can also be voluntarily surrendered
        by corporate buyers for Scope 2 emissions accounting under the GreenPower scheme.
      </P>
      <P>
        A renewable project generates both <Em>energy</Em> (MWh sold to the grid) and
        <Em> LGCs</Em> (a separable environmental attribute). In a PPA, the parties must agree
        what happens to the LGCs:
      </P>
      <Table
        emphasizeFirst
        headers={['Structure', 'Who gets the LGCs', 'When this is used']}
        rows={[
          ['Bundled', 'Buyer gets the LGCs as part of the PPA at no extra charge', 'Standard pre-2020; still common for sovereign CFD contracts'],
          ['Stripped', 'Seller retains LGCs and sells them separately to the LGC spot market', 'Common from 2020 onwards; especially when buyer doesn\'t value LGCs'],
          ['Bundled with separate LGC price line', 'LGCs bundled but priced separately within the PPA — buyer pays explicit LGC component', 'Increasingly common; allows transparent pricing as LGC market evolves'],
        ]}
      />

      <H2>The 2017-2022 LGC price spike and crash</H2>
      <P>
        The trajectory of the LGC spot price is one of the most extraordinary commodity-price
        stories in Australian energy:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'LGC spot price ($/MWh)', 'Context']}
        rows={[
          ['2010', '~$30', 'Early LRET period; ample supply'],
          ['2014', '~$25', 'Warburton Review uncertainty'],
          ['2016', '~$80', 'Pre-2020 deadline scarcity'],
          ['2017', '~$85-90 (peak)', 'Maximum scarcity; new build pipeline still ramping'],
          ['2018', '~$80', 'Sustained scarcity'],
          ['2019', '~$50', 'New build catching up to demand'],
          ['2020', '~$35', 'LRET target met; oversupply emerging'],
          ['2022', '~$25', 'Sustained oversupply'],
          ['2024', '~$10-15', 'Severe oversupply; LRET closed to new entrants'],
          ['2026', '~$5-10', 'Functionally near zero'],
        ]}
      />
      <P>
        The 2016-2018 LGC spike drove a major shift in PPA pricing. PPAs signed at the peak
        bundled LGCs at $80+/MWh strike — implicitly capturing $80+/MWh of LGC value per MWh
        delivered. PPAs signed at the 2017 peak therefore had effective energy-only prices
        much lower than headline.
      </P>

      <H2>Why LGC prices collapsed</H2>
      <P>
        Three causes drove the LGC price collapse 2019-2024:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Supply ramp</Em> — the 2015-2020 build-out of wind and solar projects to meet
          the LRET target dramatically expanded LGC supply</li>
        <li><Em>Target closure</Em> — the LRET was set at 33,000 GWh annually from 2020,
          with no further increases. Once the supply could meet that target, additional LGCs
          had no demand-side absorption.</li>
        <li><Em>Voluntary demand limited</Em> — voluntary surrender (GreenPower, corporate
          claims) absorbs only ~5-10% of new LGC supply</li>
      </ul>

      <H2>What it did to PPA economics</H2>
      <P>
        For projects with bundled LGCs at pre-2020 contracted strike prices: the project still
        earns the contracted strike, but the buyer's "effective cost" of LGCs is much higher
        than the current market price. The buyer captures less value than if the LGCs had been
        stripped and sold separately at spot.
      </P>
      <P>
        For projects with stripped LGCs entering the market today: LGC sales at $5-10/MWh
        contribute approximately 2-4% of project gross revenue — versus the 25-30% they
        contributed at the 2017 peak. The shift is significant: projects that depended on LGC
        revenue for debt service margin have seen that revenue stream collapse.
      </P>

      <H2>Long-dated bundled PPAs from the 2016-2018 era</H2>
      <P>
        A significant cohort of operating renewable projects in Australia signed bundled PPAs
        with strike prices in the $80-110/MWh range during 2016-2018. These projects continue
        to earn those strikes through to PPA expiry (typically 2026-2032), creating an
        "above-market" revenue stream that is highly attractive to lenders and equity holders.
        Examples include several wind farms in the Murra Warra cluster, Stockyard Hill, and
        early Coopers Gap commitments.
      </P>
      <P>
        Industry estimates suggest <Em>$15-25/MWh of "legacy LGC premium"</Em> sits inside
        these contracts — a structural revenue advantage that the projects' second-decade
        operating economics will lose when these PPAs expire and re-contracting occurs at
        current market prices.
      </P>

      <H2>What about new PPAs in 2026?</H2>
      <P>
        The LGC discussion has largely moved on. Most new PPAs:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Bundle LGCs but at minimal explicit value (effectively $0-5/MWh of strike price
          attributed to LGC)</li>
        <li>Or strip LGCs entirely (buyer takes them at no extra charge; if they sell them
          they get the proceeds)</li>
        <li>For corporate buyers focused on Scope 2 emissions reporting — particularly those
          on RE100 — LGC bundling remains operationally useful</li>
        <li>For pure financial / Virtual PPAs settled in cash, LGC treatment is increasingly a
          secondary consideration</li>
      </ul>

      <H2>The 2030-onwards question — what replaces LGCs?</H2>
      <P>
        The LRET is structurally winding down. New build is no longer LRET-eligible. The
        Clean Energy Regulator has indicated it will keep the LGC market functional through
        existing project surrender obligations for the next decade-plus, but new LGC-eligible
        capacity will not be added. The question for 2030+:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Will a replacement mechanism emerge for tradable renewable-energy attribution?</li>
        <li>Will the GreenPower scheme expand to cover post-LRET projects?</li>
        <li>Will corporate Scope 2 reporting shift to 24/7 hourly matching (eliminating the
          need for annual LGC-style attribution)?</li>
        <li>Will state-based renewable energy schemes (NSW EII, QLD CleanCo) develop their
          own certification?</li>
      </ul>

      <Callout type="key">
        The LGC market has gone from a major contributor to renewable economics ($25-30% of
        revenue at 2017 peak) to a near-zero residual ($2-4% in 2026). The shift has
        eliminated one of the primary value drivers behind the corporate PPA boom — and is
        contributing to the rise of 24/7 hourly matching as the new attribution standard.
        Projects from the 2016-2018 vintage still benefit from legacy bundled LGC premium;
        new projects must price LGCs at functional zero. The wider attribution market is in
        transition and the 2030 replacement framework is still uncertain.
      </Callout>

      <Callout type="source">
        Sources: Clean Energy Regulator LGC spot market data 2010-2026 · AEMC LRET reform
        consultations · GreenPower scheme statistics · BloombergNEF Australia LGC tracker ·
        Energetics LGC market commentary · Clean Energy Council
        <em> LGC market outlook</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — Corporate PPAs in Australia (the big deals)
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>The deals that shaped the market</H2>
      <P>
        Of the roughly 50-60 major corporate PPAs signed in Australia 2017-2025, perhaps 8-10
        have shaped industry expectations beyond their individual project economics. This
        lesson walks through those deals — what was novel, who took which risk, and what
        precedent each established.
      </P>

      <H2>October 2017 — Telstra-Murra Warra (the catalyst)</H2>
      <P>
        Telstra announced an offtake of <Em>Murra Warra Wind Farm Stage 1</Em> (RES Australia)
        — 226 MW for 11 years — in October 2017. The deal was structurally significant for
        several reasons:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>First major Australian corporate PPA at utility-scale — the first time a non-
          gentailer corporate had signed a single offtake large enough to single-handedly
          underwrite a project's financial close</li>
        <li>Used a Virtual PPA structure — Telstra's actual electricity continued to be
          supplied by its existing retailer; the offtake was a financial overlay</li>
        <li>Set the precedent for bundled LGCs at a premium strike price (the deal was
          structured at the LGC peak)</li>
        <li>RES Australia developed Stage 2 (209 MW) on the back of additional offtake from
          Sydney University, ANZ Bank, Coca-Cola Amatil and others — demonstrating that
          aggregated buyer pools could underwrite incremental development</li>
      </ul>

      <H2>2018-2019 — The first wave</H2>
      <P>
        The 18 months following the Telstra deal saw a rapid expansion of the corporate buyer
        pool:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>BHP Olympic Dam</Em> (2018-2019) — 100 MW solar from PARF (Pacific Hydro) +
          wind from Bungala Solar (Enel Green Power) — multi-year tranches. BHP was the first
          major mining corporate to commit at scale.</li>
        <li><Em>Sydney Airport Corporation</Em> — Beryl Solar Farm + portfolio diversification</li>
        <li><Em>Carlton &amp; United Breweries</Em> (2017-2018) — Karadoc Solar Farm 100%
          offtake</li>
        <li><Em>ALDI</Em> (2018) — Murra Warra Stage 2 + Cherry Tree Wind Farm; one of the
          first retail corporates committing to ~100% renewable supply</li>
        <li><Em>UNSW + Sydney University</Em> (2018-2019) — Sunraysia Solar Farm + Murra Warra
          Stage 2; the university sector emerging as a meaningful buyer</li>
      </ul>

      <H2>2019-2020 — Coles-ENGIE (the 100% milestone)</H2>
      <P>
        In <Em>April 2019</Em>, Coles announced a 100% renewable electricity supply agreement
        with ENGIE for the supply of approximately 70% of its national electricity
        consumption. The deal structure was distinctive:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>ENGIE acted as the supply intermediary — building or contracting renewable
          generation behind the supply commitment</li>
        <li>Supply commitment covered Coles' actual physical electricity needs, not a
          financial overlay</li>
        <li>Structurally a sleeved PPA (gentailer middle-layer) covering the projects
          ENGIE built or contracted to deliver against the Coles supply</li>
        <li>Demonstrated that a major retailer could commit to renewable supply for its core
          operations, not just an incremental sustainability commitment</li>
      </ul>
      <P>
        Woolworths followed in 2020-2021 with similar 100% renewable supply arrangements
        through CWP Renewables (Crudine Ridge Wind Farm) and other contracts.
      </P>

      <H2>2021-2023 — The Microsoft era</H2>
      <P>
        From 2021 onwards, Microsoft has been the single most active corporate PPA buyer in
        Australia — sustained by its data centre buildout in NSW and Victoria and its global
        commitment to 100% renewable by 2025 and 24/7 carbon-free by 2030. Major Microsoft
        PPAs:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'Project', 'Developer', 'Capacity']}
        rows={[
          ['2020', 'Stockyard Hill Wind Farm', 'Goldwind', 'Multi-year partial offtake'],
          ['2022', 'New England Solar Farm Stage 1+2', 'ACEN Australia (UPC \\\\\\\\ AC Energy)', 'Multi-year, multi-tranche'],
          ['2022', 'Murra Warra Stage 2 portion', 'RES + Macquarie', 'Multi-year'],
          ['2023', 'Coopers Gap Wind Farm extension portion', 'AGL', 'Multi-year'],
          ['2023', 'Other portfolio additions', 'Multiple', 'Cumulative ~500+ MW'],
        ]}
      />
      <P>
        Microsoft's PPAs have consistently included pathways to 24/7 hourly matching — making
        the company the de facto leader in advanced PPA structure innovation in Australia.
      </P>

      <H2>2022-2024 — Amazon, Atlassian, Bunnings, hyperscaler expansion</H2>
      <P>
        Following Microsoft's lead, several other major corporates have committed:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Amazon AWS</Em> — Bango Wind Farm (CWP, NSW, 99 MW) + Hawkesdale Wind Farm
          (Global Power Generation, VIC) — pioneering data centre offtake from 2022. Amazon
          has been less public about subsequent deals but is broadly regarded as the second-
          largest corporate buyer in Australia by 2025.</li>
        <li><Em>Atlassian</Em> (2021-2023) — multiple Australian renewable PPAs as part of
          global RE100 commitment; deals through ENGIE and CWP</li>
        <li><Em>Bunnings Warehouse</Em> (2020-2023) — Edify Energy partnership at Kennedy
          Energy Park (QLD) + portfolio diversification</li>
        <li><Em>NBN Co</Em>, <Em>Westpac</Em>, <Em>Commonwealth Bank</Em>, <Em>Telstra
          (further deals)</Em> — financial services and infrastructure buyers committing
          for sustained Scope 2 emissions claims</li>
      </ul>

      <H2>2024-2026 — The sovereign-backed offset</H2>
      <P>
        As the CIS scaled through 2024-2025, the marginal corporate PPA buyer's competitive
        position changed. Sovereign-backed CIS contracts now compete directly with corporate
        buyers for offtake. The result through 2024-2026:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Corporate PPA volume has slowed — most major Australian corporates have made their
          initial commitments and are now upsizing existing arrangements rather than signing
          new greenfield offtakes</li>
        <li>The remaining corporate market is concentrated in <Em>24/7 hourly-matched</Em>
          structures (hyperscalers) and <Em>specialty applications</Em> (e.g. green hydrogen
          industry pre-commitments)</li>
        <li>Sovereign-backed CIS contracts are doing the work that mass-market corporate PPAs
          did 2018-2022</li>
      </ul>

      <H2>Lessons from the corporate PPA era</H2>
      <P>
        Reading these deals as a portfolio, several patterns emerge:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Buyer aggregation works</Em> — Murra Warra Stage 1 and 2 underwrote ~440 MW
          via 6-7 separate buyer commitments. The aggregation reduced single-buyer
          counterparty concentration risk while spreading transaction cost across multiple
          deals.</li>
        <li><Em>Investment-grade buyers dominate</Em> — almost every named buyer is a major
          ASX-listed corporate or hyperscaler subsidiary, with the credit standing to support
          long-dated commitments</li>
        <li><Em>Brand value is the primary motivation</Em> — the deals typically have modest
          marginal economic return to the buyer; the strategic value is sustainability
          reporting and risk management around long-term electricity costs</li>
        <li><Em>Structure innovation has been continuous</Em> — from Telstra's initial Virtual
          PPA to today's 24/7 hourly-matched solar+BESS portfolios, each cohort has pushed
          the boundary further</li>
      </ul>

      <Callout type="key">
        The Australian corporate PPA market is small relative to the underlying renewable
        build-out — roughly 5 GW of cumulative signed deals vs ~30 GW of operating renewables
        and ~100 GW in the pipeline. But corporate PPAs have shaped industry practice
        disproportionately. The structural innovations from this era (Virtual PPAs, bundled
        LGCs, baseload firming, 24/7 hourly matching) are now standard features of the
        sovereign-backed CFD market. The corporate market may be plateauing as primary
        offtaker but its precedents continue to shape how every other PPA is negotiated.
      </Callout>

      <Callout type="source">
        Sources: BRC-A (Business Renewables Centre Australia) cumulative deal tracker ·
        Clean Energy Council Corporate PPA database · Energetics PPA Outlook 2024 ·
        BloombergNEF Australia PPA Tracker · Reuters / AFR / Renew Economy corporate PPA
        announcement archives 2017-2025.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — Risk allocation in detail
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>The seven risks that drive every PPA negotiation</H2>
      <P>
        A modern Australian PPA distributes approximately seven categories of risk between
        buyer and seller. Each is negotiated explicitly; the allocation choices have
        substantial commercial impact and are reflected in the strike price.
      </P>
      <Table
        emphasizeFirst
        headers={['Risk', 'What it is', 'Default seller-friendly allocation', 'Default buyer-friendly allocation']}
        rows={[
          ['Volume risk', 'Project produces less than P50 forecast', 'Buyer takes — pay-as-produced; seller paid for what is delivered', 'Seller takes — pay-as-forecast; LD if undelivered'],
          ['Shape risk', 'Generation profile vs buyer demand profile mismatch', 'Buyer takes — accepts as-generated delivery', 'Seller takes — must firm via storage'],
          ['Curtailment risk', 'Network operator forces output reduction', 'Buyer pays for curtailed energy (deemed delivery)', 'Seller absorbs curtailment loss'],
          ['MLF risk', 'Marginal Loss Factor changes over project life', 'Buyer pays gross of MLF (seller hedged)', 'Seller paid net of MLF (seller exposed)'],
          ['Basis risk', 'Settlement node price differs from regional reference', 'Buyer takes settlement risk', 'Seller takes settlement risk'],
          ['Change in law', 'New regulation affects project economics', 'Pass-through to buyer (seller protected)', 'Seller absorbs (buyer protected)'],
          ['Credit / counterparty risk', 'Either party may default', 'Bilateral security; parent guarantees', 'One-way security from seller only'],
        ]}
      />

      <H2>Curtailment — the single most contested allocation</H2>
      <P>
        Curtailment is the most frequently re-negotiated risk in Australian PPAs. Two distinct
        types:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Technical (network) curtailment</Em> — AEMO or the NSP directs output reduction
          due to system security, transmission constraint, or system strength shortfall</li>
        <li><Em>Economic (price) curtailment</Em> — the project chooses to reduce output to
          avoid negative spot prices (typically midday solar oversupply)</li>
      </ul>
      <P>
        Standard PPA treatment:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Technical curtailment</Em> — most PPAs treat technical curtailment as
          <Em> deemed generation</Em>: the buyer pays for the energy that would have been
          generated had AEMO not curtailed. This shifts the risk to the buyer.</li>
        <li><Em>Economic curtailment</Em> — most PPAs do <em>not</em> deem economic
          curtailment as delivered. If the project chooses to reduce output during negative
          prices, the buyer doesn't pay for the foregone energy. This shifts the risk to the
          seller.</li>
      </ul>
      <P>
        The dollar impact can be substantial. For a 200 MW solar farm with 8% annual
        curtailment (typical for QLD Western Downs or NSW South-West in 2024-2026), at a
        $65/MWh strike that is approximately $2.7M per year of revenue at stake. Whether the
        buyer or seller absorbs this depends entirely on the curtailment allocation clauses.
      </P>

      <H2>MLF risk — increasingly contested</H2>
      <P>
        Pre-2018, MLF risk was relatively uncontested — most PPAs paid the seller gross of MLF
        (the buyer effectively hedged), and MLFs were stable enough that this didn't matter.
        Post-2018, with MLFs in remote-REZ regions degrading 8-15 percentage points over
        5-7 years (covered in AEMO Connection Lesson 7), the allocation has become a primary
        negotiating point.
      </P>
      <P>
        Typical 2024-2026 patterns:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Strong-grid sites (urban + near-coal): seller pays gross of MLF (low MLF risk to
          transfer)</li>
        <li>Mid-MLF risk sites: typically a band — first 3-5 pp of MLF degradation absorbed by
          seller, beyond that pass-through to buyer</li>
        <li>High-MLF risk sites (remote REZ): seller paid net of MLF (buyer effectively
          hedged); reflected in lower strike price</li>
      </ul>

      <H2>Basis risk — the regional reference complication</H2>
      <P>
        Basis risk arises because the project's actual settlement price (at its connection
        point) may differ from the Regional Reference Price (RRP) used for PPA settlement.
        Differences arise from:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Marginal Loss Factor differences (settlement at connection point applies MLF; PPA
          may pay at RRP gross)</li>
        <li>Network constraints causing local prices to diverge from regional prices</li>
        <li>Settlement intervals (5-minute vs hourly aggregation)</li>
      </ul>
      <P>
        Most modern PPAs price at the regional reference price (Sydney West for NSW, Melbourne
        South for VIC, etc.) and treat any basis as a seller risk. Some sophisticated
        contracts include a basis-tracking adjustment that catches material divergences.
      </P>

      <H2>Change-in-law clauses</H2>
      <P>
        <Em>Change-in-law (CIL)</Em> clauses determine what happens if regulatory or market
        design changes affect project economics. Common triggers:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>New AEMC rule change that materially affects connection costs</li>
        <li>NEM-wide market design change (e.g. capacity market, demand response, ancillary
          service redesign)</li>
        <li>New environmental regulation (carbon price, emissions intensity standard)</li>
        <li>State-level renewable energy scheme changes (LTESA, VRET expansion)</li>
        <li>Federal CIS changes affecting eligible projects</li>
      </ul>
      <P>
        PPAs typically provide:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Pass-through</Em> for compliance cost changes (e.g. new ancillary service
          payments, system strength service charges)</li>
        <li><Em>Re-opener</Em> for material market-design changes</li>
        <li><Em>Termination right</Em> for catastrophic regulatory changes that fundamentally
          alter the contract economics</li>
      </ul>

      <H2>Credit and counterparty risk</H2>
      <P>
        Long-dated PPAs (10-20 years) carry substantial counterparty risk. Standard mitigation:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Parent company guarantees</Em> — buyer's parent guarantees the obligation</li>
        <li><Em>Bank guarantees</Em> — first-demand bank guarantees from major Australian banks</li>
        <li><Em>Letters of credit</Em> — sometimes used for cross-border buyer counterparties</li>
        <li><Em>Project security</Em> — first-mortgage charge over the project asset to the
          buyer (for early termination scenarios)</li>
      </ul>

      <H2>The risk-allocation matrix in summary</H2>
      <P>
        A modern Australian PPA's typical risk allocation can be summarised in a single
        matrix. For a corporate Virtual PPA from a strong-grid solar+BESS project signed
        in 2026:
      </P>
      <Table
        emphasizeFirst
        headers={['Risk', 'Typical seller share', 'Typical buyer share', 'Notes']}
        rows={[
          ['Volume (P50/P90 production)', '100%', '0%', 'Seller manages forecast accuracy'],
          ['Shape', '100%', '0%', 'Seller firms via storage'],
          ['Technical curtailment', '0%', '100%', 'Buyer pays for deemed generation'],
          ['Economic curtailment', '100%', '0%', 'Seller absorbs negative-price avoidance'],
          ['MLF degradation', '50%', '50%', 'Banded allocation common'],
          ['Basis (connection point vs RRP)', '100%', '0%', 'Seller absorbs differences'],
          ['Change in law (compliance cost)', '0%', '100%', 'Pass-through to buyer'],
          ['Change in law (re-opener)', 'Negotiated case-by-case', '–', 'Often 50/50 split'],
          ['Credit risk', '50%', '50%', 'Bilateral security typical'],
        ]}
      />

      <Callout type="key">
        Risk allocation is where the PPA earns its place in project finance. A poorly-allocated
        risk schedule can leave one party with exposure they can't manage — leading either to
        breach (if it materialises) or to refusal of senior debt (if lenders price in the
        risk). Good PPA negotiation is the art of allocating each risk to the party best
        able to manage or absorb it, recognising that the same risk has very different costs
        for different counterparties.
      </Callout>

      <Callout type="source">
        Sources: Norton Rose Fulbright <em>Australian PPA risk allocation guide</em> 2024 ·
        Allens <em>Energy PPA practice notes</em> · Australian Energy Regulator
        <em> Connection Charging Guideline</em> (MLF context) · King &amp; Wood Mallesons
        <em> Curtailment allocation analysis</em> 2023 · Marsh <em>PPA insurance commentary</em>
        2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 8 — PPA pricing
// ============================================================

function Lesson8() {
  return (
    <div>
      <H2>The BNEF Australia PPA index</H2>
      <P>
        BloombergNEF has tracked the Australian corporate PPA market since 2017 via its
        <Em> Australia PPA Tracker</Em>. The index reports the volume-weighted average price of
        new corporate PPAs in each quarter, separated by technology. The index is the closest
        thing to a market-wide PPA price benchmark — though it captures only the corporate
        market, not the sovereign-backed CFD market or the gentailer offtake market.
      </P>
      <P>
        Indicative BNEF Australia PPA prices through the period:
      </P>
      <Table
        emphasizeFirst
        headers={['Period', 'Solar PPA ($/MWh, bundled where applicable)', 'Wind PPA ($/MWh, bundled where applicable)', 'Context']}
        rows={[
          ['2017 Q4', '~$55-65', '~$70-85', 'Telstra-Murra Warra; LGC at peak; initial corporate wave'],
          ['2018', '~$55-70', '~$70-85', 'BHP, Sydney Airport, ALDI deals; supply still constrained'],
          ['2019', '~$45-60', '~$60-75', 'Cost decline; oversupply emerging; Warburton-era pipeline delivering'],
          ['2020', '~$40-55', '~$55-70', 'Solar prices bottoming; COVID impact mixed'],
          ['2021', '~$45-60', '~$65-80', 'Recovery; first firming premium signals'],
          ['2022', '~$60-75', '~$85-100', 'Russia-Ukraine wholesale spike; firming premium accelerating'],
          ['2023', '~$55-70', '~$80-95', 'Stabilising; CIS announcements changing market structure'],
          ['2024', '~$55-70', '~$80-95', 'Sovereign-backed CFDs becoming primary; corporate slow'],
          ['2025', '~$55-70', '~$80-90', 'Range-bound; few major new corporate deals'],
        ]}
      />
      <P>
        These are bundled (energy + LGC) prices for as-generated PPAs. <Em>Firmed</Em> PPAs
        (with co-located or contracted storage) typically add a $20-40/MWh premium. <Em>24/7
        hourly-matched</Em> PPAs add a further $10-20/MWh.
      </P>

      <H2>Why solar and wind have diverged</H2>
      <P>
        Solar and wind PPA prices have moved in different directions over the past five years:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Solar prices have stabilised at $55-70/MWh</Em> — capex decline has matched
          deteriorating shape value (cannibalisation discount), keeping the headline number
          flat</li>
        <li><Em>Wind prices have risen to $80-95/MWh</Em> — wind capex has not declined as
          quickly as solar, and shape value has held up better (wind generates more in
          evenings and shoulder seasons when solar is offline)</li>
      </ul>
      <P>
        The ~$25/MWh wind-over-solar premium reflects three factors:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Higher LCOE for wind (~$70-90/MWh vs solar $35-55/MWh)</li>
        <li>Better shape — wind value factor typically 0.75-0.95 vs solar 0.35-0.60 in mature
          markets</li>
        <li>Greater certainty for 24/7 matching scenarios — wind generates when solar doesn't</li>
      </ul>

      <H2>The firming premium — what is being paid for what</H2>
      <P>
        Firmed PPAs price meaningfully above as-generated. The premium reflects:
      </P>
      <Table
        emphasizeFirst
        headers={['Firmness level', 'Premium over as-generated', 'What the buyer gets']}
        rows={[
          ['As-generated', '$0', 'Buyer takes shape risk'],
          ['Shaped (e.g. business hours only)', '$5-15/MWh', 'Defined hours covered; off-hours buyer pays merchant'],
          ['Baseload (24h constant)', '$15-25/MWh', 'Constant supply; project firms via co-located BESS or contracted firming'],
          ['24/7 hourly-matched to buyer load', '$30-50/MWh', 'Every hour of consumption matched; complex settlement; corporate sustainability narrative'],
        ]}
      />

      <H2>What drives PPA pricing — the four factors</H2>
      <P>
        Four structural factors drive PPA pricing in any quarter:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Underlying project LCOE</Em> — the cost basis below which sellers won't go.
          Solar LCOE in Australia has fallen from ~$80/MWh (2017) to ~$35-55/MWh (2025);
          wind LCOE from ~$75/MWh to ~$60-80/MWh.</li>
        <li><Em>Wholesale market expectations</Em> — buyers price PPAs as a hedge against
          spot price exposure. When wholesale prices are high (2022-2023), PPA prices rise
          even when LCOE doesn't.</li>
        <li><Em>LGC market value</Em> — historically a major component; now nearly zero
          (~$5-10/MWh).</li>
        <li><Em>Counterparty competition</Em> — when many buyers chase the same project,
          prices rise. When sovereign-backed CFDs scale up, corporate buyers face less
          competition for projects but also fewer projects available.</li>
      </ul>

      <H2>The recent BNEF Australia PPA report — what it shows</H2>
      <P>
        BNEF's mid-2025 Australia PPA report highlighted:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Corporate PPA volume in 2024 was ~1.0 GW — declining from 2022's ~1.1 GW peak</li>
        <li>The sovereign-backed CIS market signed ~4-5 GW of capacity in 2024 — far
          exceeding the corporate market</li>
        <li>Average corporate PPA strike in 2024 sat at ~$70/MWh for solar, ~$88/MWh for wind
          — both up from 2020 lows</li>
        <li>Firmed PPAs (with BESS) commanded ~$95/MWh average for solar+BESS, ~$115/MWh for
          wind+BESS</li>
      </ul>

      <H2>What this implies for 2026-2030</H2>
      <P>
        The pricing trajectory suggests:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Headline PPA prices will remain in current ranges as LCOE decline matches
          deteriorating capture value</li>
        <li>The firming premium will grow as 24/7 matching becomes standard</li>
        <li>The corporate-vs-sovereign divergence may continue — corporate buyers pay
          premium for 24/7 matched while sovereign CFDs price below market on as-generated</li>
        <li>By 2028-2030, most utility-scale PPAs in Australia will be firmed in some form
          (BESS, hourly matching, or both)</li>
      </ul>

      <Callout type="key">
        PPA pricing is not a single number — it is a structure-dependent surface that varies
        by technology, shape, location, term, and counterparty. The BNEF index is useful for
        tracking the market median; for specific deals, the pricing reflects the deal's
        particular risk allocation and the parties' negotiating leverage. Project teams
        should benchmark against BNEF medians but expect material divergence based on
        project-specific factors.
      </Callout>

      <Callout type="source">
        Sources: BloombergNEF <em>Australia PPA Tracker</em> 2017-2025 ·
        BloombergNEF <em>Australia Renewable Energy Outlook</em> 2024-25 ·
        Energetics <em>PPA Outlook</em> 2024 · Cornwall Insight <em>Australia PPA report</em>
        2024 · Schneider Electric <em>Energy &amp; Sustainability Services</em> insights ·
        Wood Mackenzie <em>Australia PPA price outlook</em> 2025.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 9 — Government as counterparty
// ============================================================

function Lesson9() {
  return (
    <div>
      <H2>Why sovereign-backed offtake exists</H2>
      <P>
        The federal and state governments in Australia have built explicit revenue-
        underwriting schemes for renewable projects since 2017. The motivation has been
        consistent: <Em>renewable project investment was insufficient to meet emissions
        targets and replace retiring coal</Em>, and corporate PPAs alone could not scale fast
        enough. Sovereign-backed contracts fill the gap.
      </P>
      <P>
        Three major schemes operate in 2026:
      </P>
      <Table
        emphasizeFirst
        headers={['Scheme', 'Jurisdiction', 'Year started', 'Cumulative capacity contracted', 'Structure']}
        rows={[
          ['CIS (Capacity Investment Scheme)', 'Federal', '2023', '~25-30 GW by mid-2026', 'Revenue floor + ceiling CFD'],
          ['LTESA (Long-Term Energy Service Agreement)', 'NSW', '2021', '~6 GW by mid-2026', 'Fixed-price CFD'],
          ['VRET (Victorian Renewable Energy Target)', 'VIC', '2017', '~3 GW signed across 4 auctions', 'Fixed-price CFD'],
          ['ACT 100% renewable supply auctions', 'ACT', '2015', '~700 MW across 4 rounds', 'Fixed-price CFD'],
          ['QLD CleanCo direct contracting', 'QLD', '2019', '~2-3 GW direct + indirect', 'Variable'],
        ]}
      />

      <H2>The CIS — the federal flagship</H2>
      <P>
        The Capacity Investment Scheme (covered in detail in the CIS &amp; LTESA Bidding module)
        is now the dominant offtake mechanism in the NEM. Structurally:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Revenue floor and ceiling</Em> — proponents bid floor and ceiling strike prices.
          If wholesale prices fall below floor, government tops up to floor. If wholesale
          prices rise above ceiling, proponents pay government the excess. Between floor and
          ceiling, proponents earn merchant.</li>
        <li><Em>Term</Em> — typically 12-15 years</li>
        <li><Em>Capacity-based</Em> — payments tied to registered capacity, not actual energy
          delivered</li>
        <li><Em>Counterparty</Em> — federal government via the Clean Energy Finance Corporation
          / Capacity Investment Scheme Office</li>
      </ul>
      <P>
        For developers, a CIS contract provides a revenue floor that supports project finance
        — and allows the developer to retain upside if wholesale prices rise above ceiling.
        Competition for CIS contracts has been intense:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>T1 (NEM Generation, 2023-2024): 19 projects awarded across ~5 GW</li>
        <li>T3 (NEM Dispatchable, 2024): 16 BESS projects awarded</li>
        <li>T4 (NEM Generation, 2025): 20 projects awarded including 12 hybrids</li>
        <li>T5 + T6 (WEM): smaller tranches in WA</li>
        <li>Cumulative through mid-2026: ~25-30 GW committed across all CIS tranches</li>
      </ul>

      <H2>Key concept — how a CISA magnifies equity sponsor IRR</H2>

      <Callout type="key">
        The single biggest commercial implication of a CISA is that its 90%-covered floor lets
        lenders size <Em>more senior debt</Em>. A merchant project might be financed at 55–60%
        debt. The same project with a CISA backing the downside is routinely financed at 70–75%.
        Because debt is cheaper than equity (call it 6–7% nominal vs 10–14% equity target),
        replacing equity with debt magnifies the equity sponsor's IRR — typically by 3–6
        percentage points on otherwise-identical project economics.
      </Callout>

      <P>
        The mechanic is standard project-finance leverage. Equity IRR ≈ Project IRR + (Project
        IRR − Cost of debt) × (Debt / Equity). When the project earns above the cost of debt,
        every extra dollar of debt funds equity-equivalent returns at debt rates — the spread is
        captured by equity. This is not magic. It is the same effect that makes leveraged buy-outs
        attractive, applied to a renewable project balance sheet.
      </P>

      <P>
        The catch — and it is a real one — is that <Em>leverage is asymmetric</Em>. When project
        IRR falls below the cost of debt (the stress scenario), the same debt magnifies the
        downside. Debt service is fixed; equity absorbs the squeeze. A CISA-backed project at 75%
        gearing has a steeper P50-to-P90 IRR fall than a merchant project at 60% gearing — unless
        the CISA floor (with its 10% deductible and annual cap) is high enough to keep project
        IRR comfortably above cost of debt in the worst case.
      </P>

      <CisaLeverageCalculator />

      <Callout type="info">
        This calculator captures the headline leverage effect with one simplified equation. The
        full project finance picture (DSCR sizing, refinancing assumptions, depreciation tax
        shield, sponsor support letters, etc.) is covered in detail in the{' '}
        <Link to="/learn/project-financing" className="text-[var(--color-primary)] hover:underline">
          Project Financing of Renewables
        </Link>{' '}
        learning module. The downside-stress dynamics — how the CISA floor and annual cap interact
        with the 90% deductible to set the P90 revenue line lenders actually size against — are
        worked through with numerical examples in the{' '}
        <Link to="/learn/cis-ltesa-bidding/ppa-cisa-calculator" className="text-[var(--color-primary)] hover:underline">
          PPA × CISA Interactions
        </Link>{' '}
        guide (checklist items 4, 10, and 13 are especially relevant).
      </Callout>

      <H2>NSW LTESA — the long-duration sister scheme</H2>
      <P>
        The NSW Long-Term Energy Service Agreement (LTESA) is structurally similar to CIS but
        with NSW Government counterparty and a longer term:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Term</Em> — 20 years</li>
        <li><Em>Structure</Em> — fixed-price CFD with capacity payments</li>
        <li><Em>Focus</Em> — long-duration storage particularly (8+ hour BESS, pumped hydro)</li>
        <li><Em>Run by</Em> — NSW EnergyCo</li>
      </ul>
      <P>
        LTESA Round 6 (2025) awarded 1.17 GW of 8.7-11.5 hour batteries — defining the
        long-duration storage market for the rest of the decade. LTESA has been particularly
        important in establishing the merchant-firmness boundary for long-duration storage,
        where wholesale arbitrage alone wouldn't be sufficient.
      </P>

      <H2>VRET — Victoria's pioneer scheme</H2>
      <P>
        The Victorian Renewable Energy Target (VRET) reverse auctions started in 2017 — the
        first state-led renewable auctions in Australia. Four major rounds have been run:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>VRET 1 (2017-2018) — 928 MW awarded; included Bald Hills, Cherry Tree, Crowlands,
          Dundonnell wind farms and Carwarp, Yatpool solar farms</li>
        <li>VRET 2 (2019) — 800 MW awarded; technology and project diversification</li>
        <li>VRET 3 (2022) — 600 MW awarded; included Wooreen BESS</li>
        <li>VRET 4 (2024-2025) — focus on offshore wind feasibility</li>
      </ul>
      <P>
        VRET contracts are typically fixed-price CFDs with 15-year terms. They are settled by
        VicGrid (formerly via the Department of Environment, Land, Water and Planning).
      </P>

      <H2>ACT renewable energy auctions — the smaller pioneer</H2>
      <P>
        The Australian Capital Territory ran reverse auctions for renewable energy from 2015
        onwards. The ACT was the first Australian jurisdiction to commit to 100% renewable
        electricity supply (achieved 2020). Four major auctions ran 2015-2019, contracting
        ~700 MW. The deals defined the early structure of state-level renewable CFDs and
        provided proof that government-as-counterparty could underwrite project finance.
      </P>
      <P>
        Notable ACT-contracted projects include Hornsdale Wind Farm Stage 1 (Neoen, SA),
        Hornsdale Wind Farm Stage 2, Crookwell Wind Farm (NSW), Coonooer Bridge Wind Farm
        (VIC), and White Rock Wind Farm (NSW) — with offtake structured to flow back to ACT
        consumers as 100% renewable supply.
      </P>

      <H2>QLD — the GOC model + CleanCo</H2>
      <P>
        Queensland operates differently from the other states. The state owns its renewable
        generation through Government Owned Corporations (covered in the Energy Transition
        module Lesson 4) — Stanwell, CS Energy, CleanCo Queensland. These GOCs both operate
        their own projects and contract with private developers via:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Long-term offtake agreements</Em> — direct purchase from private projects</li>
        <li><Em>PPA-style arrangements</Em> — for specific project investments</li>
        <li><Em>Joint ventures</Em> — co-investment in certain renewable + storage projects</li>
      </ul>
      <P>
        The Queensland Energy and Jobs Plan (2022) commits $62B of state-led investment, much
        of which flows through the GOC counterparty structure. This is a meaningfully
        different model from the NSW/VIC CFD approach.
      </P>

      <H2>How sovereign-backed contracts compete with corporate PPAs</H2>
      <P>
        The expansion of sovereign-backed offtake has had two effects on the corporate PPA
        market:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Crowding out</Em> — developers with sovereign offtake have less incentive to
          negotiate corporate PPAs. Many projects now go to FID on sovereign contracts alone.</li>
        <li><Em>Complementing</Em> — developers can stack sovereign + corporate offtake on
          the same project. The sovereign contract provides the revenue floor; the corporate
          PPA captures the upside (or the 24/7 matched portion).</li>
      </ul>
      <P>
        The stacking arrangement is structurally elegant. The sovereign CFD floor sits at,
        say, $55/MWh for solar. A corporate buyer signs a Virtual PPA at $70/MWh for hourly-
        matched delivery. The buyer captures the carbon-attribution + brand value at the
        marginal price; the seller has dual revenue protection from both contracts.
      </P>

      <H2>The 2026-2030 outlook for sovereign-backed offtake</H2>
      <P>
        Three trends to watch:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>CIS scaling</Em> — federal commitment of 32 GW by 2030 implies 8-10 GW of new
          CIS contracts per year through 2027-2030</li>
        <li><Em>LTESA expansion to other states</Em> — VicGrid is signalling a similar
          long-duration storage scheme; QLD considering CleanCo+state CFD integration</li>
        <li><Em>Political risk</Em> — a federal Coalition government could reduce CIS scale or
          alter contract structure. Existing contracts are protected but rounds T7+ could be
          affected.</li>
      </ul>

      <Callout type="key">
        Sovereign-backed offtake has become the dominant revenue underwriting mechanism in
        the NEM. The CIS alone has committed more capacity in 18 months than the entire
        corporate PPA market did in 8 years. For developers, the strategic question is no
        longer "should I sign a sovereign contract?" but "which sovereign contracts should I
        stack, and how do I optimise against corporate buyers for the remaining upside?".
      </Callout>

      <Callout type="source">
        Sources: Capacity Investment Scheme contract documents · NSW LTESA Round 1-6 results ·
        VRET auction results 2017-2025 · ACT renewable electricity supply auction results ·
        Queensland Energy and Jobs Plan 2022 · DCCEEW CIS public materials · Clean Energy
        Finance Corporation annual reports.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 10 — The corporate buyer landscape today
// ============================================================

function Lesson10() {
  return (
    <div>
      <H2>The buyer cohorts in 2026</H2>
      <P>
        The Australian corporate PPA buyer market has evolved from a handful of pioneers
        (Telstra, Sydney Airport, UNSW) to several dozen active buyers. They can be grouped
        into five cohorts based on motivation and structural approach:
      </P>
      <Table
        emphasizeFirst
        headers={['Cohort', 'Examples', 'Motivation', 'Typical deal structure']}
        rows={[
          ['Hyperscalers', 'Microsoft, Google, Amazon AWS, Meta, Apple', 'RE100 + 24/7 CFE by 2030; data centre electricity demand', 'Large multi-year portfolios; 24/7 hourly matching; firmed solar+wind+BESS'],
          ['Retail majors', 'Coles, Woolworths, ALDI, Bunnings, Officeworks', 'Brand-led 100% renewable; supply-cost stability', '100% supply via gentailer intermediary or portfolio of as-generated'],
          ['Mining + heavy industry', 'BHP, Rio Tinto, Fortescue, Newcrest, Glencore', 'Operational decarbonisation; carbon pricing hedge', 'Multi-asset offtakes; some captive generation; some sleeved'],
          ['Financial services', 'CBA, NAB, ANZ, Westpac, Macquarie', 'Bank-internal sustainability + brand', 'Office + data centre PPAs; portfolio of small contracts'],
          ['Universities + government', 'UNSW, Sydney University, Monash, ACT Govt, Federal Govt', 'Institutional sustainability commitments', 'Smaller-scale, often as part of consortium or aggregation'],
        ]}
      />

      <H2>The hyperscaler cohort — the new growth engine</H2>
      <P>
        Hyperscale data centre operators have become the single fastest-growing corporate
        buyer cohort in Australia. The fundamentals:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Microsoft, Google, AWS, Meta all have global 24/7 carbon-free energy commitments
          (typically by 2030)</li>
        <li>Australian data centre demand growth (covered in Energy Transition Lesson 15) is
          driving new electricity load that must be matched with renewable supply</li>
        <li>Hyperscalers can structure complex multi-project portfolios — they aggregate
          generation across solar, wind, and BESS for hourly matching</li>
        <li>Hyperscalers pay premium prices for 24/7 matching — $30-50/MWh above as-generated
          — which underwrites the firming premium of co-located BESS</li>
      </ul>
      <P>
        Microsoft is currently the largest single buyer in Australia by signed capacity
        (~700+ MW across multiple deals). Amazon is the second largest (~400+ MW). Google's
        Australian portfolio is growing but is currently the smallest of the three. Meta and
        Apple have smaller Australian footprints (Microsoft Azure dominates the Australian
        cloud market).
      </P>

      <H2>The retail cohort — mature buyers</H2>
      <P>
        The major retail corporates — Coles, Woolworths, ALDI, Bunnings — have largely
        completed their initial 100% renewable supply commitments. They are now in the
        upsize-and-renew phase rather than the greenfield-deal phase. Typical patterns:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Coles-ENGIE</Em> — 100% supply since 2020; renewed contractually 2024-25</li>
        <li><Em>Woolworths-CWP Renewables</Em> — multiple project tranches; expanding into
          shape-matching</li>
        <li><Em>ALDI</Em> — 100% renewable across all operations from 2021; multi-project
          portfolio</li>
        <li><Em>Bunnings</Em> — Kennedy Energy Park + portfolio diversification through
          Edify Energy and Atlassian-led aggregations</li>
      </ul>

      <H2>The mining + heavy industry cohort — operationally complex</H2>
      <P>
        Mining and heavy industry have distinct PPA needs because their electricity loads are
        often:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Very large (single sites consuming 100-500+ MW continuously)</li>
        <li>Geographically isolated (Pilbara, remote QLD, NW NSW)</li>
        <li>Process-critical (cannot be load-shedded)</li>
        <li>Operating 24/7 with very flat consumption profiles</li>
      </ul>
      <P>
        Major deals from this cohort:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>BHP Olympic Dam</Em> (2018-2019) — Wind + solar + BESS portfolio for SA
          operations</li>
        <li><Em>BHP Western Australia Iron Ore</Em> — Pilbara renewable supply commitments,
          including partnership with Newmont Mining and Fortescue Future Industries</li>
        <li><Em>Rio Tinto</Em> — Yarwun aluminium refinery solar + Gladstone industrial supply;
          multiple Pilbara renewable contracts</li>
        <li><Em>Fortescue / Fortescue Future Industries</Em> — captive renewable generation for
          Pilbara iron ore; ambitious green hydrogen development</li>
      </ul>

      <H2>The 24/7 carbon-free energy movement</H2>
      <P>
        Beyond traditional RE100 commitments (annual renewable matching), the leading
        corporates have moved to <Em>24/7 carbon-free energy</Em> (CFE) standards. The
        difference:
      </P>
      <Table
        emphasizeFirst
        headers={['Standard', 'Time horizon', 'What is matched']}
        rows={[
          ['RE100 (Annual)', 'Calendar year', '100% of annual consumption matched with annual renewable LGCs (or equivalent)'],
          ['Daily matching', 'Daily', '~80-95% of daily consumption matched within each calendar day'],
          ['24/7 hourly matching', 'Hourly', 'Each hour of consumption matched with renewable energy generated in that same hour'],
          ['Decarbonisation pathway', 'Multi-year', '90%+ hourly match by 2025; 100% by 2030; carbon-negative thereafter'],
        ]}
      />
      <P>
        Google and Microsoft are the explicit Australian 24/7 CFE leaders. Apple has
        committed to 100% renewable across all operations including suppliers by 2030.
        Amazon AWS has 100% renewable electricity by 2025 and 24/7 CFE pathway through 2030.
      </P>

      <H2>What's driving demand growth — the data centre wave</H2>
      <P>
        Hyperscale data centre electricity demand in Australia (covered in Energy Transition
        Lesson 15) is the single largest demand-growth driver for the late 2020s. From the
        PPA market perspective:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Data centre load is growing 15-25%/yr globally; faster locally</li>
        <li>Hyperscale operators commit to 24/7 CFE — driving demand for firmed solar+BESS
          portfolios</li>
        <li>Connection-application pipeline of 15-20 GW of data centre load (Energy Transition
          Lesson 15) creates a multi-billion dollar potential PPA market through 2027-2030</li>
        <li>Each new hyperscale region typically commits 200-500 MW of renewable supply at
          launch</li>
      </ul>

      <H2>The challenger retailers — smaller but innovative</H2>
      <P>
        Beyond the major buyers, a growing number of challenger retailers and renewable-energy
        specialists are entering the PPA market:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Energy Locals</Em> — community-focused; smaller PPAs from local renewable
          projects</li>
        <li><Em>Powershop</Em> (owned by Octopus Energy) — sustainable-energy positioning</li>
        <li><Em>Amber Electric</Em> — wholesale-pass-through to households; signals demand for
          flexible PPA structures</li>
        <li><Em>Diamond Energy, OVO Energy, OEM Energy</Em> — smaller retailer commitments</li>
      </ul>

      <H2>How buyer behaviour is shaping the project pipeline</H2>
      <P>
        Buyer preferences directly shape what gets built. In 2024-2026, the patterns:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Firmed solar+BESS hybrid projects are easier to contract than solar-only</li>
        <li>Wind farms with co-located or contracted BESS get faster offtake</li>
        <li>Standalone solar farms targeting only as-generated PPAs face longer offtake
          searches and lower prices</li>
        <li>Long-duration storage (8+ hour BESS) is increasingly contracted via LTESA rather
          than corporate</li>
      </ul>

      <Callout type="key">
        The corporate buyer landscape has matured significantly. The 2017-2022 wave brought
        the major Australian buyers into the market; the 2023-2026 wave is upsizing existing
        commitments and adding 24/7 carbon-free demand from hyperscalers. The next wave —
        2027-2030 — will be defined by data centre electricity demand growth and by the
        continued integration of corporate buyers with sovereign-backed offtake. Developers
        who design projects around 24/7 matching demand will capture the highest-value
        offtakes; developers who don't will face increasingly difficult contracting paths.
      </Callout>

      <Callout type="source">
        Sources: Microsoft Sustainability Report 2024 · Google 24/7 CFE Methodology · Amazon
        Sustainability Reports · Apple Environmental Progress Report · RE100 Annual Disclosure
        Australia · BRC-A Corporate PPA database 2017-2025 · Bloomberg
        <em> Hyperscaler Energy Procurement</em> 2024 · Reuters / AFR corporate sustainability
        coverage.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 11 — The 2026-2030 PPA outlook
// ============================================================

function Lesson11() {
  return (
    <div>
      <H2>The PPA market in 2030 — four scenarios</H2>
      <P>
        Looking ahead from mid-2026 to the end of the decade, the Australian PPA market has
        four plausible 2030 outcomes — each with different implications for buyers, sellers,
        and the broader renewable energy transition:
      </P>
      <Table
        emphasizeFirst
        headers={['Scenario', 'Dominant mechanism', 'PPA market size', 'Typical structure']}
        rows={[
          ['CIS-dominant', 'Federal CIS does the heavy lifting', '~80% sovereign / ~20% corporate', 'Floor + ceiling CFD; firmed standard'],
          ['Balanced multi-source', 'CIS + LTESA + corporate stack', '~60% sovereign / ~40% corporate', 'Stacked contracts; flexible structures'],
          ['Corporate revival', 'Hyperscale data centres drive corporate growth', '~50% sovereign / ~50% corporate', '24/7 hourly matching dominant'],
          ['Sovereign retreat', 'Policy change reduces CIS scale', '~30% sovereign / ~70% corporate', 'Return to corporate PPA primary; less firming'],
        ]}
      />
      <P>
        The most likely outcome (industry consensus mid-2026): the balanced multi-source
        scenario, with sovereign CIS providing the floor and corporate buyers stacking on top
        for the firmed / 24/7-matched portion.
      </P>

      <H2>Five trends to watch through 2030</H2>
      <P>
        Five structural trends are likely to define the 2026-2030 PPA market:
      </P>

      <H2>Trend 1 — Firmed becomes the default</H2>
      <P>
        The market is converging on firmed PPAs as the default structure for new wind and
        solar projects. Drivers:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Buyer preference — 24/7 CFE commitments require firmness</li>
        <li>Sovereign scheme design — CIS contracts increasingly favour firmed configurations</li>
        <li>Cost decline — BESS capex has fallen 60%+ since 2018, making co-located storage
          economical at scale</li>
        <li>Operational reality — as-generated PPAs face increasing cannibalisation discount</li>
      </ul>
      <P>
        By 2030, industry estimates suggest <Em>~70% of new utility-scale renewable PPAs in
        Australia will be firmed</Em> — up from ~25% today.
      </P>

      <H2>Trend 2 — Data centre demand reshapes pricing</H2>
      <P>
        Hyperscale data centre electricity demand is set to grow from ~10 TWh today to
        ~30-40 TWh by 2030 (covered in Energy Transition Lesson 15). Implications for PPAs:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Data centre operators commit to 24/7 CFE — driving demand for firmed PPAs at
          premium prices</li>
        <li>Each new data centre site typically requires 200-500 MW of dedicated renewable
          supply at launch</li>
        <li>If 5 GW of new data centre load materialises by 2030, that implies $40-60B of
          new PPA commitments — meaningful even relative to the CIS pipeline</li>
        <li>Data centre operators are willing to pay $90-130/MWh for 24/7 firmed CFE — driving
          a premium-segment growth that the sovereign-backed CFD market can't match</li>
      </ul>

      <H2>Trend 3 — LGC market continues to fade</H2>
      <P>
        LGC prices have collapsed from $90 (2017) to ~$5-10 (2026). By 2030, LGC value is
        likely to be functionally zero for new generation. The replacement attribution
        mechanism is unclear:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>GreenPower may expand to cover post-LRET projects</li>
        <li>State-level certification (NSW EII, QLD CleanCo) could emerge</li>
        <li>24/7 hourly matching may replace annual LGC-style attribution for premium buyers</li>
        <li>Federal-level Renewable Energy Certificate (REC) reform is being discussed but
          has not advanced</li>
      </ul>

      <H2>Trend 4 — Pricing converges on LCOE-plus-shape-premium</H2>
      <P>
        As the corporate-vs-sovereign balance stabilises and LGC value approaches zero, PPA
        pricing should converge on a simple formula:
      </P>
      <Callout type="numbers">
        PPA Strike Price = LCOE + Shape Premium − Capture Price Discount
        <br /><br />
        For 2026 NSW solar: LCOE ~$45 + Shape Premium $0 (as-generated) − Capture Discount $0
        = ~$45/MWh
        <br />
        For 2026 NSW solar + BESS: LCOE ~$55 + Shape Premium $20 (firmed) − Capture Discount
        $0 = ~$75/MWh
        <br />
        For 2026 NSW wind + BESS 24/7-matched: LCOE ~$75 + Shape Premium $40 − Capture
        Discount $0 = ~$115/MWh
      </Callout>
      <P>
        The convergence implies <Em>a tighter relationship between PPA price and underlying
        cost basis</Em> than the historical relationship has shown. Pre-2022, PPA prices were
        often substantially decoupled from LCOE due to LGC value, wholesale-spike hedging,
        and counterparty competition. Post-2026, prices are likely to track LCOE more closely.
      </P>

      <H2>Trend 5 — Bankability bar shifts</H2>
      <P>
        With sovereign-backed contracts becoming standard, the bankability bar for renewable
        project finance is shifting:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Single-contract bankability</Em> — projects with a CIS or LTESA contract alone
          are bankable; corporate PPAs no longer required</li>
        <li><Em>Stack bankability</Em> — projects with sovereign + corporate stacked offtake
          achieve lowest cost of capital (~5-6% all-in, vs 7-8% for sovereign-only and 9-10%
          for corporate-only)</li>
        <li><Em>Merchant bankability</Em> — pure-merchant projects (no PPA) remain very hard
          to finance; equity-only structures dominate that segment</li>
      </ul>

      <H2>The risks to the outlook</H2>
      <P>
        Three risks could disrupt the trajectory:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Federal political risk</Em> — a Coalition government could reduce CIS scale or
          alter contract design. Existing CIS contracts are legally protected, but new
          rounds T7+ could be affected.</li>
        <li><Em>Capex cost inflation</Em> — global construction and equipment costs could rise
          faster than electricity prices, squeezing project margins and reducing the
          attractiveness of new build at current PPA strikes.</li>
        <li><Em>Demand growth slower than expected</Em> — if data centre electricity demand
          grows slower than current forecasts suggest (e.g. due to AI workload optimisation
          reducing per-flop electricity usage), the projected 2027-2030 corporate PPA
          surge may not materialise.</li>
      </ul>

      <H2>What this means for project teams</H2>
      <P>
        Strategic implications for renewable project developers in 2026-2030:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Design firmed (solar+BESS or wind+BESS) configurations from feasibility — these
          have the broadest offtake market</li>
        <li>Target dual-revenue structures — sovereign floor + corporate uplift — for optimal
          cost of capital</li>
        <li>Engage hyperscaler buyers early — these are the new growth segment with premium
          pricing</li>
        <li>Plan for 24/7 hourly matching — sophistication in matching shapes and
          counterparties will increasingly differentiate winning deals</li>
        <li>Manage LGC-attribution complexity — for legacy projects with bundled LGC PPAs,
          structure the rights and obligations carefully as PPAs approach expiry</li>
      </ul>

      <Callout type="key">
        The Australian PPA market is in a transition phase. The Era 3 corporate boom is
        plateauing; the Era 4 sovereign-backed era is in full swing. Through 2026-2030, the
        market will likely settle into a balanced sovereign + corporate model where sovereign
        contracts provide the bulk underwriting and corporate buyers (especially hyperscalers)
        provide the firmed / 24/7-matched premium layer. Project teams that design for this
        layered market will deliver projects efficiently; teams that design for either pure
        sovereign or pure corporate offtake will leave value on the table. The next five
        years will define the structural template for Australian renewable PPAs through 2050.
      </Callout>

      <Callout type="source">
        Sources: BloombergNEF <em>Australia PPA Outlook 2026-2030</em> · Wood Mackenzie
        <em> Australia Renewable Energy Outlook</em> 2025-26 · Cornwall Insight
        <em> Australia PPA report</em> 2024 · DCCEEW CIS forward pipeline · NSW EnergyCo
        LTESA forward pipeline · BRC-A <em>Corporate PPA Forecast</em> 2024 · Clean Energy
        Council <em>State of the Energy Transition</em> 2025.
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
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-6">
      <Link to="/learn" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        ← AURES Learning
      </Link>

      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-3xl" aria-hidden>📜</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
            ✅ Available
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight"
          style={{ borderLeft: '4px solid #8b5cf6', paddingLeft: 12, marginLeft: -12 }}>
          PPAs for Renewable Projects
        </h1>
        <p className="text-base italic text-[var(--color-text-muted)]">
          From state utility offtake to corporate boom to sovereign-backed CFD — how the contract evolved.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          Power Purchase Agreements are the backbone of renewable project finance. This 11-lesson
          module traces four distinct eras of the Australian PPA market, walks through the anatomy
          and three structural forms (physical, financial CFD, virtual), explores volume shape and
          the 24/7 hourly-matching movement, covers the LGC market collapse and what it did to PPA
          economics, profiles the major Australian corporate deals (Telstra-Murra Warra, BHP, Coles,
          Microsoft, Amazon, Atlassian), maps the seven-way risk allocation, tracks BNEF pricing,
          explains government-as-counterparty (CIS, LTESA, VRET, ACT auctions, QLD GOCs), surveys
          the corporate buyer landscape, and closes with the 2026-2030 outlook including data
          centre demand and the firming premium.
        </p>
      </div>

      <div className="space-y-3">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          return (
            <Link key={l.id} to={`/learn/ppas/${l.id}`}
              className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors group">
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-bold text-[var(--color-text-muted)]">Lesson {l.number}</span>
                {done && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">✓ Read</span>}
              </div>
              <h3 className="text-base font-bold text-[var(--color-text)] mt-1.5 group-hover:text-[var(--color-primary)]">{l.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">{l.subtitle}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]/70 mt-1.5">{l.readingTime}</p>
            </Link>
          )
        })}
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          See live AURES data alongside this module
        </p>
        <ul className="space-y-1 text-sm">
          <li>
            <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
              Scheme Tracker →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— CIS/LTESA awards by project</span>
          </li>
          <li>
            <Link to="/offtakers" className="text-[var(--color-primary)] hover:underline">
              Offtaker registry →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— corporate PPA buyers and their deals</span>
          </li>
          <li>
            <Link to="/learn/cis-ltesa-bidding" className="text-[var(--color-primary)] hover:underline">
              CIS &amp; LTESA Bidding module →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— deep dive on sovereign-backed contracts</span>
          </li>
        </ul>
      </div>

      <p className="text-[10px] text-[var(--color-text-muted)] text-center pt-4 border-t border-[var(--color-border)]">
        {LESSONS.filter(l => progress.has(l.id)).length} of {LESSONS.length} lessons read.
        Progress is stored in your browser only.
        <button onClick={() => { LESSONS.forEach(l => onMark(l.id, false)) }}
          className="ml-3 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline">
          Reset
        </button>
      </p>
    </div>
  )
}

function LessonView({ lesson, progress, onComplete }: {
  lesson: LessonMeta
  progress: Set<string>
  onComplete: (id: string) => void
}) {
  const navigate = useNavigate()
  const idx = LESSONS.findIndex(l => l.id === lesson.id)
  const prev = idx > 0 ? LESSONS[idx - 1] : null
  const next = idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2 text-xs">
        <Link to="/learn/ppas" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← PPAs for Renewable Projects
        </Link>
        <span className="text-[var(--color-text-muted)]">Lesson {lesson.number} of {LESSONS.length} · {lesson.readingTime}</span>
      </div>

      <div className="space-y-1 pb-4 border-b border-[var(--color-border)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Lesson {lesson.number}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight">{lesson.title}</h1>
        <p className="text-base italic text-[var(--color-text-muted)]">{lesson.subtitle}</p>
      </div>

      <article className="text-[15px] text-[var(--color-text-muted)]">
        {lesson.id === 'history'         && <Lesson1 />}
        {lesson.id === 'anatomy'         && <Lesson2 />}
        {lesson.id === 'structures'      && <Lesson3 />}
        {lesson.id === 'shape'           && <Lesson4 />}
        {lesson.id === 'lgc'             && <Lesson5 />}
        {lesson.id === 'corporate-deals' && <Lesson6 />}
        {lesson.id === 'risk'            && <Lesson7 />}
        {lesson.id === 'pricing'         && <Lesson8 />}
        {lesson.id === 'sovereign'       && <Lesson9 />}
        {lesson.id === 'buyers'          && <Lesson10 />}
        {lesson.id === 'outlook'         && <Lesson11 />}
      </article>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/ppas/${prev.id}`)}
            className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/ppas/${next.id}`) }}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-colors">
            {progress.has(lesson.id) ? 'Continue' : 'Mark read & continue'} → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/ppas') }}
            className="text-sm px-4 py-2 rounded-lg bg-emerald-500 text-white hover:opacity-90 transition-colors">
            ✓ Mark complete &amp; back to module
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Top-level component
// ============================================================

export default function PpasModule() {
  const { lessonId } = useParams<{ lessonId?: string }>()
  const [progress, setProgress] = useState<Set<string>>(loadProgress)

  const onComplete = useCallback((id: string) => {
    setProgress(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveProgress(next)
      return next
    })
  }, [])

  const onMark = useCallback((id: string, done: boolean) => {
    setProgress(prev => {
      const next = new Set(prev)
      if (done) next.add(id)
      else      next.delete(id)
      saveProgress(next)
      return next
    })
  }, [])

  if (!lessonId) {
    return <ModuleIndex progress={progress} onMark={onMark} />
  }

  const lesson = LESSONS.find(l => l.id === lessonId)
  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-base text-[var(--color-text-muted)]">Lesson not found.</p>
        <Link to="/learn/ppas" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to module index
        </Link>
      </div>
    )
  }

  return <LessonView lesson={lesson} progress={progress} onComplete={onComplete} />
}
