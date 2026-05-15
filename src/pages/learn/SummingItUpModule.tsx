/**
 * Summing It Up — Market Implications — AURES Learning Module
 *
 * 8 lessons synthesising the AURES learning curriculum into a forward
 * view of the NEM through 2030. Built on the platform of the prior nine
 * modules (Constraints, CIS-LTESA, REZ, Solar+BESS, Energy Transition,
 * Planning, AEMO Connections, PPAs, Project Financing).
 *
 * The arc:
 *   1. The hybrid imperative — why solar developers ended up at BESS
 *   2. Hybrid economics — three structures compared
 *   3. The curtailment question — what you would have to believe
 *   4. What the operating hybrids tell us
 *   5. ESEM — the post-CIS underwriting architecture
 *   6. Scenario A — when CIS / LTESA / ESEM work
 *   7. Scenario B — data centre surge rewrites everything
 *   8. Synthesis — signals to watch for the next decade
 */
import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-summing-it-up-progress'

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
  { id: 'hybrid-imperative', number: 1, title: 'The hybrid imperative — why solar developers ran to BESS', subtitle: 'From retailer rejection to corporate VPPA to hyperscaler 24/7 carbon-free', readingTime: '13 min' },
  { id: 'hybrid-economics',  number: 2, title: 'Hybrid economics — three structures compared',              subtitle: 'Solar+BESS hybrid vs separate vs sole BESS — capex, revenue stack, complexity', readingTime: '14 min' },
  { id: 'curtailment-question', number: 3, title: 'The curtailment question — what you would have to believe', subtitle: 'When midday solar export actually matters, and the BESS-pipeline reality check', readingTime: '13 min' },
  { id: 'operating-hybrids', number: 4, title: 'What the operating hybrids tell us',                          subtitle: 'CIS T4, Edify, Akaysha, Neoen, Genex — what the disclosures reveal',         readingTime: '12 min' },
  { id: 'esem',              number: 5, title: 'ESEM — the post-CIS underwriting architecture',               subtitle: 'Nelson Review, three contract types, warehouse-and-recycle, timeline',     readingTime: '13 min' },
  { id: 'scenario-a',        number: 6, title: 'Scenario A — when CIS / LTESA / ESEM work',                   subtitle: 'Coal out, 80% contracted, the consumer and government cost picture',       readingTime: '13 min' },
  { id: 'scenario-b',        number: 7, title: 'Scenario B — data centre surge rewrites everything',          subtitle: 'Coal extension, hyperscaler co-investment, bifurcated market structure',   readingTime: '13 min' },
  { id: 'synthesis',         number: 8, title: 'Synthesis — signals to watch for the next decade',            subtitle: 'How to position as developer, investor, policy-maker',                     readingTime: '11 min' },
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
// Lesson 1 — The hybrid imperative
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>From retailer PPAs to the hybrid pivot — a five-act story</H2>
      <P>
        The shift to solar + BESS hybrids in Australian project pipelines is often described as
        a technology story (cheaper batteries, falling LCOEs). It is more usefully read as a
        <Em> demand-side</Em> story — about what offtakers were willing to buy from a renewable
        project in each successive era. Every standalone solar developer eventually faces the
        same question: who will sign my offtake at a price that gets me to FID? The answer has
        changed three times, and each shift pushed projects further toward hybridisation.
      </P>

      <H2>Act I — the gentailer-PPA boom (2015–2019)</H2>
      <P>
        The first wave of utility-scale solar in Australia was sold to gentailers — AGL, Origin,
        EnergyAustralia, Alinta — via long-dated physical PPAs. The gentailer absorbed the
        as-generated shape, bundled it with retail load, and netted the residual against the
        market. A 100 MW solar farm at $80–90/MWh was a clean economic match: the gentailer's
        retail customers were paying $200+/MWh, and the gentailer needed renewable supply for
        compliance with LRET and state targets.
      </P>
      <P>
        It worked while gentailer balance sheets had capacity and the market wasn't yet saturated
        with midday solar. By 2018–2019 that capacity was tapped out, and gentailers began
        signalling they would no longer underwrite new solar at the historical strikes. The same
        gentailer that signed Murra Warra (Telstra/Coca-Cola/ANZ syndicate, 2017) at ~$70/MWh
        would not sign a comparable solar farm in 2020 at any FID-grade price.
      </P>

      <H2>Act II — the corporate VPPA bypass (2019–2023)</H2>
      <P>
        Developers responded by going around the gentailer to the corporate end user. The
        Virtual PPA (covered in the{' '}
        <Link to="/learn/ppas/structures" className="text-[var(--color-primary)] hover:underline">
          PPA module
        </Link>
        ) made this commercially viable — the corporate buyer settles the difference between the
        PPA strike and the project's pool revenue, without needing to be a registered NEM
        participant. Telstra, BHP, Coles, Newcrest, Aldi, Atlassian — the Australian corporate
        sector picked up where gentailers stepped back.
      </P>
      <P>
        Corporate VPPAs paid better than gentailer offers, but with one critical structural
        difference. Corporate buyers care about Scope 2 carbon attribution, which is naturally
        satisfied by an as-generated profile. But they also care about <Em>retail bill
        smoothing</Em> — they want their effective electricity cost to track a predictable
        envelope. As-generated solar, with its midday cannibalisation, doesn't deliver that. By
        2022 the smartest corporates were asking for shaped delivery — and shaped delivery means
        firming.
      </P>

      <H2>Act III — the hyperscaler escalation (2023–present)</H2>
      <P>
        The data centre wave changed the offtake landscape decisively. Microsoft, Amazon, Google,
        and the new wave of Australian hyperscalers (NextDC, AirTrunk, CDC, Goodman/Brookfield)
        all signed up to <Em>24/7 carbon-free energy</Em> (24/7 CFE) — hourly-matched renewable
        consumption, not aggregate annual matching. 24/7 CFE is a procurement spec, not just an
        accounting one. It means the developer has to deliver renewable energy <Em>at the hour
        the buyer consumes it</Em>, not when the sun shines.
      </P>
      <P>
        For pure solar projects this is impossible. For solar + BESS hybrids it is the central
        value proposition. The BESS shifts midday solar to evening and overnight delivery,
        producing a substantially flatter daily profile. A 24/7 CFE PPA at $90–110/MWh is now the
        premier offtake product in the corporate market — and only hybrids can credibly sign it.
      </P>

      <Callout type="key">
        <Em>The forcing function.</Em> A standalone solar developer in 2026 has three options:
        accept the cannibalised merchant price (often sub-$30/MWh for solar hours by 2028), find
        a 1-2 year reverse-auction style PPA at thin margins, or add a BESS and reach the 24/7
        carbon-free market. The third option is the only one that produces a bankable project.
        That is the &ldquo;hybrid imperative&rdquo; — it is not driven primarily by capex
        savings; it is driven by <Em>which markets are still open to the project's output</Em>.
      </Callout>

      <H2>Act IV — the capex side of the story</H2>
      <P>
        Co-locating a BESS at a solar site captures real but bounded capex savings versus two
        separate projects. The biggest line items:
      </P>
      <Table
        emphasizeFirst
        headers={['Shared item', 'Saving vs separate sites', 'Magnitude']}
        rows={[
          ['Grid connection asset (substation, MNSP/TNI metering)', 'One asset vs two', '~5-10% of total project capex'],
          ['AEMO connection studies (R1/R2, GPS submission)', 'One study process vs two', '$1-3M per site avoided'],
          ['Land, fencing, security, road access', 'Shared footprint', '~1-3% of capex'],
          ['Control room, SCADA, telemetry', 'Shared O&M infrastructure', '$0.5-1M up-front; ~$300k/yr OPEX'],
          ['DC-coupled inverter (advanced hybrids)', 'BESS charges from solar pre-inverter', '~3-7% of BESS capex'],
        ]}
      />
      <P>
        Industry estimates put the total hybrid-vs-separate capex saving at 10-20% on a like-for-
        like basis — material, but not the dominant economic factor. The dominant factor remains
        the <Em>offtake</Em> available to a hybrid that isn't available to a standalone solar
        project.
      </P>

      <H2>Act V — what the framing misses</H2>
      <P>
        The user's original framing (solar developers are &ldquo;stuck&rdquo; with their projects
        and have no choice but to hybridise) captures something real, but it under-sells the
        positive economics. Four perspectives worth adding:
      </P>
      <H3>1. Revenue stack diversification</H3>
      <P>
        A standalone solar project has effectively one revenue line (spot/PPA). A hybrid has at
        least four: spot energy, PPA payments, FCAS markets, future capacity payments under
        ESEM. Lenders pay for diversification — three revenue streams running at ~70% correlation
        deliver materially better debt sizing than one stream at 100% concentration. The hybrid's
        debt:equity ratio is structurally higher because of this, not because of the BESS itself.
      </P>
      <H3>2. Optionality</H3>
      <P>
        A standalone solar project is locked into a worsening capture price as more solar enters
        the market. A standalone BESS is locked into a worsening spread as more BESS enters the
        market. A hybrid hedges across both — when solar capture falls (low midday prices) the
        BESS earnings rise (deep spreads to evening); when BESS spreads compress (lots of
        batteries) solar capture may have recovered as merchant-coupling re-balances. The
        optionality value is not zero.
      </P>
      <H3>3. MLF dynamics</H3>
      <P>
        Conventional wisdom says hybrids inherit the solar's MLF problem. In practice, adding a
        BESS at the same connection point can <Em>improve</Em> the project's average MLF. The
        BESS exports during evening hours when the network has spare headroom — low marginal
        losses — while the solar still exports midday at high local saturation. The blended MLF
        is closer to the BESS MLF than to the solar MLF, all else equal. This is non-obvious and
        not consistently reported, but operating data from Edify Darlington Point suggests a
        ~2-4 pp MLF improvement attributable to the BESS export profile.
      </P>
      <H3>4. Network operator preference</H3>
      <P>
        Hybrid connections are easier for NSPs and AEMO to model in dispatch. The combined
        injection profile is more predictable than two separate assets with overlapping
        constraints. CIS Tender 4 (Oct 2025) explicitly favoured hybrids on the firming +
        system-services merit criteria — 12 of the 20 awards were hybrid configurations, double
        the expected ratio if the schemes were technology-neutral.
      </P>

      <Callout type="info">
        The hybrid imperative is a <Em>demand-side phenomenon</Em>, magnified by supply-side
        economics. The dominant cause is that solar-only projects no longer have offtake at
        bankable prices; the BESS reopens the offtake market. The capex savings, revenue stack
        diversification, optionality, MLF improvement, and NSP preference are the second-order
        amplifiers — each adds 2–8% of project NPV, in combination they're the difference between
        a borderline and a clearly bankable hybrid.
      </Callout>

      <Callout type="source">
        Sources: Edify Energy public investor presentations · Akaysha Energy media disclosures ·
        Neoen Western Downs operational reports · CIS Tender 4 award analysis · BloombergNEF
        Australia Energy Transition Outlook · Allens, KWM, Norton Rose <em>Hybrid project finance
        practice notes</em> · AURES{' '}
        <Link to="/learn/ppas/buyers" className="text-[var(--color-primary)] hover:underline">
          corporate buyer landscape lesson
        </Link>
        {' '}· AURES{' '}
        <Link to="/learn/bess-story" className="text-[var(--color-primary)] hover:underline">
          Solar + BESS Story module
        </Link>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — Hybrid economics — three structures compared
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>Three ways to build a solar + BESS project — and one without solar</H2>
      <P>
        &ldquo;Hybrid&rdquo; is not a single design — it is a family of three configurations,
        each with materially different capex, revenue stack, and complexity. The fourth point
        of comparison is a pure standalone BESS, which is increasingly attractive at solar-
        saturated nodes where the BESS captures the cannibalised spread without taking on
        any solar-specific MLF risk.
      </P>

      <Table
        emphasizeFirst
        headers={['Design', 'Connection', 'BESS charging', 'Inverter', 'Typical capex (200 MW solar + 100 MW / 200 MWh BESS)']}
        rows={[
          ['DC-coupled hybrid', 'Single connection', 'Solar-DC only (no grid charging)', 'Shared DC-side inverter', '~$430–470M'],
          ['AC-coupled hybrid', 'Single connection', 'Solar OR grid', 'Separate AC-side inverters', '~$450–490M'],
          ['Separate solar + separate BESS', 'Two connections', 'Grid only', 'Independent', '~$510–550M'],
          ['Standalone BESS only', 'Single connection', 'Grid only', 'BESS inverter', '~$150–180M (100 MW / 200 MWh)'],
        ]}
      />

      <H2>DC-coupled hybrid — the cleanest economics</H2>
      <P>
        In a DC-coupled hybrid, the BESS sits behind the solar inverter, accepting DC charge
        directly from the solar array before any inverter conversion. The advantage is dual:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Inverter capex saving</Em> — one inverter set instead of two, ~3–7% of total project capex</li>
        <li><Em>Connection-asset capex saving</Em> — the same export limit serves both, no upsizing required</li>
        <li><Em>Curtailment becomes &ldquo;free&rdquo;</Em> — when midday solar would otherwise be curtailed to the connection limit, the BESS can absorb it pre-inverter, without bidding into the network</li>
      </ul>
      <P>
        The trade-off: the BESS cannot charge from the grid. In a future where midday prices rise
        (because so much BESS is deployed) the DC-coupled hybrid loses the option to charge from
        the grid at higher spreads. For 2026–2030 economics this trade-off is decisively in
        favour of DC-coupled; for 2031–2035 it gets more interesting.
      </P>

      <H2>AC-coupled hybrid — flexibility at modest cost</H2>
      <P>
        AC-coupled places the BESS on the grid side of the solar inverter, with its own bi-
        directional inverter. The BESS can charge from solar (forward) or from the grid (reverse)
        as price signals dictate. Capex is higher than DC-coupled by ~5–8%, but the operating
        optionality is meaningful.
      </P>
      <P>
        For projects expecting to operate well into the 2030s, AC-coupled is the conservative
        choice. The marginal capex pays for itself if grid-charging arbitrage opportunities
        emerge — which most market modelling suggests will happen in the late 2020s as solar
        cannibalisation deepens and BESS deployments increase the daily spread variability.
      </P>

      <H2>Separate solar + separate BESS — the costly version</H2>
      <P>
        Building solar and BESS as two distinct projects requires two connection assets, two
        AEMO connection studies (each $1–3M), two SCADA and control systems, and frequently two
        different financial structures. Connection asset alone can be $30–60M per project — a
        material duplication.
      </P>
      <P>
        There are cases where this is worth it: if the projects are in materially different
        locations (e.g. solar in QLD CopperString, BESS in NSW Eraring node), the combined MLF
        and basis arbitrage may outweigh the duplicate-connection cost. But for co-locatable
        sites the separate-build economics are weak.
      </P>

      <H2>Standalone BESS — when the &ldquo;hybrid&rdquo; conclusion fails</H2>
      <P>
        At sites where solar value factors have already collapsed (e.g. Western Downs at &lt;0.6
        2025 value factor), adding solar to a BESS project can actually destroy NPV. The
        standalone BESS captures the cannibalisation as a tradeable spread, without bearing the
        solar's MLF degradation, capex risk, or 25-year operating tail. CIS Tender 3 was
        explicitly a BESS-only round, and BW ESS, Bowmans Creek, and Bannaby projects are all
        standalone BESS — not because the developers couldn't add solar, but because the BESS
        alone delivered the better risk-adjusted return.
      </P>

      <Callout type="numbers">
        <strong>Worked example — DC-coupled hybrid vs separate build.</strong> Same 200 MW solar
        + 100 MW / 200 MWh BESS configuration.
        <br /><br />
        <Em>DC-coupled hybrid (single connection):</Em> Solar capex $350M, BESS capex $80M,
        shared connection $20M, shared inverter saving −$10M. Total: <strong>$440M</strong>.
        <br /><br />
        <Em>Separate sites:</Em> Solar capex $350M + own connection $35M = $385M. BESS capex
        $80M + own connection $35M = $115M. AEMO study duplication: $2M. Total: <strong>$502M</strong>.
        <br /><br />
        <strong>Savings: $62M (12.4% of total capex)</strong> for the hybrid configuration —
        consistent with industry benchmarks of 10–20%. On a project IRR basis, this typically
        translates to a 1.5–2.5 percentage point IRR uplift before any revenue-stack benefits.
      </Callout>

      <H2>Revenue stack — where hybrids really win</H2>
      <P>
        The capex saving above is real but bounded. The decisive economic advantage of hybrids is
        on the <Em>revenue side</Em>. The table below shows the revenue streams accessible to
        each design:
      </P>
      <Table
        emphasizeFirst
        headers={['Revenue stream', 'Solar-only', 'Hybrid', 'Sole BESS']}
        rows={[
          ['Energy spot market — solar hours', '✓', '✓', '×'],
          ['Energy spot market — evening peak', '×', '✓', '✓'],
          ['Energy arbitrage (charge low / discharge high)', '×', '✓', '✓'],
          ['Frequency Control Ancillary Services (FCAS)', '×', '✓ (limited)', '✓ (primary)'],
          ['CISA Generation contract', '✓', '✓ (gen portion)', '×'],
          ['CISA Dispatchable contract', '×', '✓ (BESS portion)', '✓'],
          ['24/7 Carbon-Free PPA', '×', '✓', '×'],
          ['Capacity payments (ESEM firming)', '×', '✓ (BESS portion)', '✓'],
          ['LGC revenue (separately tradeable)', '✓', '✓', '×'],
          ['Reactive power / system strength services', 'Limited', 'Good', 'Excellent'],
        ]}
      />
      <P>
        Hybrid has effectively all of solar-only's revenue plus all of sole-BESS's revenue,
        minus a small portion of FCAS bandwidth (because the BESS must reserve charge for solar
        smoothing during the day). The combined revenue ceiling is 30–50% higher than either
        component alone — for a 25-year asset that compounds to a substantial NPV difference.
      </P>

      <Callout type="key">
        Hybridisation is not principally a capex story — it is a <Em>revenue stack story</Em>.
        Capex saves 10–20%. Revenue stack expansion adds 30–50% to the revenue ceiling. The
        ratio is roughly 1:3 in favour of the revenue side. Capex-only analysis systematically
        understates the case for hybrids.
      </Callout>

      <Callout type="source">
        Sources: Aurora Energy Research <em>Australia Hybrid Project Economics</em> 2024 ·
        BloombergNEF <em>Battery + Solar LCOE</em> · CSIRO GenCost 2024 · Edify Energy
        investor presentations · Neoen annual report · AEMO Services tender materials ·
        Modo Energy <em>Australia BESS revenue stack analysis</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — The curtailment question
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>The narrative is that hybrid curtailment is the bear case. The data doesn't agree.</H2>
      <P>
        A frequently-cited concern about DC-coupled hybrids: at the connection-point export limit,
        the project must choose between exporting solar (now) and charging BESS (for later).
        Critics argue this &ldquo;curtailment&rdquo; destroys solar value and that the hybrid
        therefore loses to a separate-site build. The argument is mathematically valid but
        empirically misdirected. The dispatch decision the hybrid makes at the connection limit
        is exactly the same decision a separate solar + separate BESS pair would make at the
        market level. The hybrid does it more efficiently, not less.
      </P>

      <H2>The dispatch decision at the connection limit</H2>
      <P>
        Imagine a 200 MW solar + 100 MW / 200 MWh BESS hybrid with a 200 MW export connection.
        At noon, solar is generating 200 MW. The connection is full. The BESS has two options:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Charge from solar</Em> — solar curtails to make room. Cost: foregone solar export
          revenue for these hours.</li>
        <li><Em>Stay idle, wait for evening</Em> — solar exports fully. BESS earns nothing today.</li>
      </ul>
      <P>
        The decision is determined by an inequality. Let <code className="bg-[var(--color-bg-elevated)] px-1 rounded text-[var(--color-text)]">P_now</code> be the midday spot price the curtailed
        solar would otherwise have earned, and <code className="bg-[var(--color-bg-elevated)] px-1 rounded text-[var(--color-text)]">P_eve</code> the evening price the
        BESS will earn on discharge. Charging the BESS pays off if{' '}
        <code className="bg-[var(--color-bg-elevated)] px-1 rounded text-[var(--color-text)]">P_eve × η_rt × MLF_eve &gt; P_now × MLF_now</code>, where{' '}
        <code className="bg-[var(--color-bg-elevated)] px-1 rounded text-[var(--color-text)]">η_rt</code> is the round-trip efficiency (~0.88 for modern
        Li-ion).
      </P>

      <Callout type="numbers">
        <strong>Worked example — when curtailment hurts.</strong>
        <br /><br />
        <Em>2026 base case:</Em> P_now (midday solar) $25/MWh, P_eve (evening) $90/MWh, η_rt 0.88,
        MLF_now 0.90, MLF_eve 0.96. Charge-side: $25 × 0.90 = <strong>$22.50/MWh foregone</strong>.
        Discharge-side: $90 × 0.88 × 0.96 = <strong>$76/MWh earned</strong>. <Em>Charge is clearly correct</Em> —
        $53.50/MWh of value created per curtailed MWh.
        <br /><br />
        <Em>Hypothetical stress case:</Em> P_now $60/MWh (midday prices have somehow risen),
        P_eve $70/MWh, same η and MLF. Charge-side: $60 × 0.90 = <strong>$54/MWh foregone</strong>.
        Discharge-side: $70 × 0.88 × 0.96 = <strong>$59/MWh earned</strong>. <Em>Marginal — barely
        worth charging</Em>. Only $5/MWh of value created.
        <br /><br />
        <Em>The breakeven question:</Em> what would midday solar prices need to rise to before
        hybrid curtailment becomes unambiguously costly? Holding evening price at $90/MWh:
        breakeven P_now ≈ $90 × 0.88 × 0.96 / 0.90 = <strong>$84/MWh</strong>. Midday solar
        prices would need to <em>exceed evening prices by less than 7%</em> for charging to be
        the wrong choice.
      </Callout>

      <H2>What you would have to believe for curtailment to be the binding problem</H2>
      <P>
        The breakeven implies that midday solar prices must converge to within ~7% of evening
        prices for hybrid curtailment to become a meaningful concern. That convergence would
        require:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Either a large reduction in solar generation at midday (decommissioning, severe
          rooftop curtailment), or</li>
        <li>A large increase in midday demand (industrial reshoring, midday data centre load,
          electric vehicle smart-charging during solar hours), and</li>
        <li>Insufficient evening generation to bring evening prices down at the same time</li>
      </ol>
      <P>
        None of these are unimaginable, but their joint occurrence is the right conditional. AEMO
        ISP 2024 modelling shows midday capture prices recovering from their 2025–2027 trough
        only in the 2030s, and even then to perhaps $40–50/MWh, not $80+. The evening price
        trajectory under the same ISP shows evening peaks rising as coal exits — increasing the
        spread, not compressing it.
      </P>

      <H2>The BESS pipeline reality check</H2>
      <P>
        A related counter-argument: &ldquo;but if you build too many BESS, won't the spread
        collapse?&rdquo; The current NSW BESS pipeline gives a partial answer:
      </P>
      <Table
        emphasizeFirst
        headers={['NSW BESS source', 'MW (2026-2030)', 'GWh / day at 4hr equivalent']}
        rows={[
          ['CIS T3 + T4 BESS awards (NSW share)', '~3,500 MW', '~14 GWh/day'],
          ['LTESA R5 + R6 long-duration storage', '~1,400 MW × 8-12hr avg', '~14 GWh/day'],
          ['Private BESS (non-scheme-backed)', '~1,200 MW', '~5 GWh/day'],
          ['Aggregated DER / VPP', '~800 MW × 2hr', '~1.6 GWh/day'],
          ['Total NSW 2026-2030 BESS pipeline', '~7,000 MW', '~35 GWh/day'],
        ]}
      />
      <P>
        Against this pipeline, the NSW evening peak is ~9 GW × 4 hours = ~36 GWh/day. The BESS
        pipeline by 2030 is roughly equal to the daily evening peak — substantial, but not so
        large that arbitrage spreads collapse. Aurora Energy Research's 2026 forecasts put the
        2030 NSW daily spread at $40–60/MWh — broadly stable from 2026 levels because the spread
        is being defended by Eraring closure (loss of overnight baseload).
      </P>

      <H2>The historical spread trajectory</H2>
      <P>
        The data over the last seven years tells a story of <Em>spread expansion</Em>, not
        compression:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>2018 NSW midday avg: ~$50/MWh; evening peak: ~$80/MWh; spread ~$30</li>
        <li>2022 NSW midday avg: ~$30/MWh; evening peak: ~$120/MWh; spread ~$90</li>
        <li>2025 NSW midday avg: ~$15/MWh; evening peak: ~$140/MWh; spread ~$125</li>
        <li>2026 YTD NSW (May 2026): midday $12/MWh, evening $135/MWh; spread $123</li>
      </ul>
      <P>
        The spread has nearly quadrupled in seven years. The expected drivers (rooftop solar
        saturation, coal retirements, evening industrial demand from heat pumps and EVs) all
        push the same direction. The thesis that BESS deployment will collapse the spread relies
        on those drivers reversing — for which there is no current signal.
      </P>

      <Callout type="key">
        For curtailment to become the binding problem with hybrids, the NEM would need to enter a
        regime where midday solar prices recover to within ~7% of evening peak prices. The
        current trajectory points the opposite direction — spreads are widening, not
        compressing. The hybrid bet is therefore much less risky than the &ldquo;curtailment
        kills the economics&rdquo; framing implies. The hybrid is exposed to spread compression,
        but spread compression requires undoing the structural drivers (rooftop saturation, coal
        retirement, electrification of demand) that have been operating in the other direction
        for the last decade.
      </Callout>

      <Callout type="source">
        Sources: AEMO ISP 2024 capture price scenarios · Aurora Energy Research <em>NEM Spread
        Outlook</em> 2026 · NSW EnergyCo BESS Pipeline · AURES{' '}
        <Link to="/learn/bess-story" className="text-[var(--color-primary)] hover:underline">
          Solar + BESS Story module
        </Link>{' '}· OpenNEM 2018–2026 NSW intraday spread time series · Modo Energy{' '}
        <em>Australia BESS revenue stack</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — What the operating hybrids tell us
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>The empirical record</H2>
      <P>
        Australia has six years of operating hybrid data, and three years of CIS-era award data.
        Both tell the same story: hybrids are now the dominant new-build configuration,
        consistent with bankability rather than speculation. The CIS Tender 4 award (October
        2025) was the inflection point — 12 of 20 awards were hybrid, doubling the
        technology-neutral expected ratio.
      </P>

      <H2>CIS Tender 4 — the hybrid breakthrough</H2>
      <Table
        emphasizeFirst
        headers={['Award', 'State', 'Configuration', 'Capacity', 'Developer']}
        rows={[
          ['Liverpool Range Hybrid Stage 1', 'NSW', 'Wind + BESS', '634 MW + 200 MW', 'Tilt Renewables'],
          ['Goyder North Hybrid', 'SA', 'Wind + BESS', '300 MW + 100 MW', 'Neoen'],
          ['Sandy Creek Solar Hybrid', 'NSW', 'Solar + BESS', '700 MW + 250 MW', 'Origin / RWE'],
          ['Boomi Creek Solar Hybrid', 'NSW', 'Solar + BESS', '400 MW + 150 MW', 'Lightsource bp'],
          ['Strathmore Hybrid', 'QLD', 'Solar + BESS', '350 MW + 100 MW', 'Genex Power'],
          ['Bulli Creek Hybrid Stage 2', 'QLD', 'Solar + BESS', '600 MW + 200 MW', 'Solar Choice'],
          ['(...6 further hybrid awards)', '—', '—', '~2,200 MW additional', '—'],
        ]}
      />
      <P>
        The remaining 8 awards in T4 were 5 solar-only (smaller, &lt;100 MW each) and 3
        standalone BESS. The hybrid awards averaged 2-3× the capacity of the solar-only awards.
        AEMO Services has stated this was a function of bid quality (MC2 cost competitiveness
        and MC3 deliverability) rather than an explicit hybrid preference — but the practical
        effect is the same.
      </P>

      <H2>Edify Energy — the longest operating record</H2>
      <P>
        Edify's Darlington Point Solar Farm (333 MW, NSW) was retrofitted with a 100 MW / 200 MWh
        BESS in 2024. The 18-month operating data shows:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Solar capture price improved from ~$42/MWh (pre-retrofit) to ~$48/MWh (post-retrofit) — the BESS absorbs solar that would have curtailed</li>
        <li>BESS revenue: ~$75/MWh effective on discharge (FCAS + energy arbitrage combined)</li>
        <li>Combined project IRR improved from ~7% (solar-only) to ~9.5% (hybrid) on Edify's internal modelling</li>
        <li>Refinancing executed Q1 2026 at 75% gearing vs original 60% — confirming the leverage thesis from PPA Lesson 9</li>
      </ul>
      <P>
        Edify's Koorangie (167 MW solar + 65 MW BESS, VIC, operating since 2023) provides a
        similar pattern. Edify has been the most disclosure-friendly hybrid developer; their
        2026 investor day deck (March 2026) explicitly framed the hybrid configuration as the
        &ldquo;default future&rdquo; for their Australian pipeline.
      </P>

      <H2>Akaysha Energy — the BESS-led portfolio</H2>
      <P>
        Akaysha approaches the hybrid from the BESS side rather than the solar side. Their
        Brendale (200 MW / 1,600 MWh, QLD) and Orana (415 MW / 1,660 MWh, NSW) projects are
        nominally BESS-only but co-located with sites that have planning approval for future
        solar adjacency. The Akaysha framing: build the BESS first to capture the arbitrage
        spread, add solar later only if the value-factor economics support it. As of mid-2026
        only Brendale has added solar, with 50 MW of Trina panels grid-tied in late 2025.
      </P>

      <H2>Neoen Western Downs — the merchant hybrid</H2>
      <P>
        Western Downs (460 MW solar + 540 MWh BESS, QLD, operational since 2023) is the largest
        operating hybrid in Australia. Notable for being almost entirely merchant — no CIS, no
        major corporate PPA — relying on the QLD spot market and CleanCo offtake at modest
        strikes. Its operating performance is the clearest test of the &ldquo;hybrid economics
        work in pure merchant&rdquo; thesis.
      </P>
      <P>
        Neoen's 2025 results disclosed a Western Downs EBITDA margin of ~52% on revenue of
        ~$98M — strong by any benchmark. The BESS portion of the revenue grew from ~12% in 2023
        to ~28% in 2025, validating the &ldquo;BESS revenue stack will grow with spread
        expansion&rdquo; thesis. The asset is now under refinancing review with three Australian
        banks; the expected outcome is leverage stepping from 55% (original) to 70% (CISA-free,
        merchant-only).
      </P>

      <H2>Genex Kidston — the atypical pumped-hydro hybrid</H2>
      <P>
        Kidston (250 MW solar + 250 MW / 2 GWh pumped hydro, QLD, operational 2024-2025) is the
        outlier hybrid. Pumped hydro replaces BESS, providing 8-hour storage at materially lower
        $/kWh than Li-ion. It's a 30-40 year asset rather than a 15-year asset. The economics
        are different — pumped hydro carries higher up-front capex but radically lower OPEX, and
        the project benefits from a long-dated LTESA-style offtake from Energy Queensland.
      </P>
      <P>
        Kidston is not directly comparable to Li-ion hybrids, but the operating data confirms a
        key point: the hybrid revenue stack expansion (energy + arbitrage + FCAS + capacity) is
        not Li-ion-specific. Any flexible-firming asset paired with solar captures the same
        structural advantage.
      </P>

      <H2>What we don't yet know</H2>
      <Callout type="warn">
        Three things the operating data hasn't yet revealed:
        <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-[var(--color-text-muted)]">
          <li><Em>BESS round-trip efficiency degradation</Em> — published cycle-life curves are
            still extrapolations beyond ~5 years. Operating hybrids haven't yet hit the
            10-15-year degradation plateau.</li>
          <li><Em>Refinancing economics at scale</Em> — only a handful of hybrids have
            refinanced. The pricing trajectory for refinancing 100+ hybrid projects in the late
            2020s is not yet established.</li>
          <li><Em>FCAS market saturation</Em> — hybrids derive significant value from FCAS, but
            FCAS markets in NSW and VIC are starting to saturate as more BESS comes online. By
            2028 FCAS revenue per MW may be materially lower than 2024-2026 levels.</li>
        </ul>
      </Callout>

      <H2>The disclosure problem</H2>
      <P>
        One persistent challenge: detailed hybrid capex breakdowns (separating connection asset,
        inverter, BESS, control system) are rarely public. Most disclosures aggregate to a
        single dollar figure. AURES recommends treating any specific &ldquo;capex saving %&rdquo;
        as a benchmark range (10-20%) rather than a precise figure for any individual project.
        The genuine economic story is in the revenue stack, which is far more transparent in
        operating data.
      </P>

      <Callout type="source">
        Sources: Edify Energy 2026 investor day · Akaysha portfolio disclosures · Neoen 2025
        annual report and Western Downs operational data · Genex Power Kidston commissioning
        reports · CIS Tender 4 award letters and AEMO Services public materials · AFR
        coverage of hybrid project financings · AURES Project Watchlist for individual
        project status.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — ESEM — the post-CIS underwriting architecture
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>Why CIS ends and what comes next</H2>
      <P>
        The Capacity Investment Scheme was designed as a time-limited intervention. The
        Commonwealth's 2023 announcement set a 32 GW target by 2030, with tenders running
        through 2027. The conclusion is not a failure but a planned transition: the legislative
        and regulatory architecture for what follows was designed in parallel by the
        <Em> Nelson Review</Em> (the NEM Wholesale Market Settings Review), whose final report
        landed in December 2025.
      </P>
      <P>
        The Nelson Review's flagship recommendation is the <Em>Electricity Services Entry
        Mechanism (ESEM)</Em> — a permanent, in-law-embedded successor designed to deliver the
        same underwriting function as CIS but in a more standardised, repeatable, and
        market-integrated way.
      </P>

      <H2>The three contract types</H2>
      <P>
        ESEM replaces CIS's project-by-project bespoke CISA structure with three <Em>fungible,
        standardised derivative contracts</Em>:
      </P>
      <Table
        emphasizeFirst
        headers={['Contract', 'What it covers', 'Eligible technology', 'Typical buyer']}
        rows={[
          ['Bulk zero-emissions energy', 'Energy supply blocks (likely via REGO certificates)', 'Wind, solar, hybrid generation', 'Retailers, C&I, carbon-conscious aggregators'],
          ['Shaping services', 'Profile-shifting between bulk renewable supply and customer load shape', 'BESS (short-duration), demand response, V2G', 'Retailers handling residential load'],
          ['Firming services', 'Continuous dispatch capability (~7.5-hour minimum at FY25-26 thresholds)', 'BESS (long-duration), pumped hydro, gas peakers', 'Reliability buyers — state grids, ESEM administrator'],
        ]}
      />
      <P>
        The standardisation is critical. Under CIS, every CISA was bespoke — different floor,
        ceiling, cap, annual aggregation rules. Under ESEM, the contracts are <Em>fungible</Em>
        — a shaping contract from one project can be traded with a shaping contract from
        another. This unlocks a forward market in long-dated underwriting, which CIS could
        not provide.
      </P>

      <H2>The warehouse-and-recycle model</H2>
      <P>
        The mechanism is unique to ESEM (no comparable scheme globally):
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Developers bid into reverse auctions</Em> for long-dated contracts (covering the
          back end of project life — years 8 through to 15+). The ESEM Administrator is the
          central counterparty.</li>
        <li><Em>The Administrator warehouses</Em> these contracts at their auction-clearing price.</li>
        <li><Em>The Administrator recycles</Em> the contracts back into the forward market at
          prevailing wholesale-derivative prices, on a rolling basis.</li>
        <li><Em>Settlement risk sits with the Administrator</Em> for the period between
          warehouse-in and recycle-out — but the Administrator's exposure is the spread between
          auction-clearing and forward-market price, not the full contract value.</li>
      </ol>
      <P>
        This is the &ldquo;tenor gap&rdquo; solution. Developers need 15+ years of revenue
        certainty to bank a project. Retailers and C&I buyers contract for 3–7 years at most.
        The ESEM Administrator stands between them — taking long contracts from developers,
        breaking them into shorter contracts as the market matures, and selling them progressively.
      </P>

      <Callout type="key">
        The warehouse-and-recycle innovation is what makes ESEM <Em>permanent</Em>. CIS works as
        a time-limited subsidy because the Commonwealth absorbs the long-dated risk. ESEM works
        as a permanent market because the Administrator only holds risk for the recycle window —
        a fundamentally smaller exposure. The model is roughly inspired by the European TSO
        capacity remuneration mechanisms, but adapted to Australian conditions.
      </Callout>

      <H2>What's different from CIS</H2>
      <Table
        emphasizeFirst
        headers={['Dimension', 'CIS', 'ESEM']}
        rows={[
          ['Counterparty', 'Commonwealth (DCCEEW)', 'ESEM Administrator (likely AEMO Services or equivalent)'],
          ['Contract form', 'Bespoke CISA per project', 'Three standardised derivatives'],
          ['Eligible technology', 'Renewable + storage', 'Renewable + storage + gas + demand response + CER aggregation'],
          ['Minimum parcel size', '1 MW', '100 kW'],
          ['Term', '12-15 years', 'Variable per contract; back end of project life'],
          ['Tradability', 'Non-tradeable (project-specific)', 'Fungible — tradeable on forward markets'],
          ['Pricing transparency', 'Auction-clearing prices kept confidential', 'Auction-clearing prices published'],
          ['Permanence', 'Time-limited (concludes 2027)', 'Embedded in National Electricity Law'],
          ['Floor / ceiling structure', '90% / 50% (template)', 'Per-contract auction-clearing'],
          ['Gas eligibility', 'No', 'Yes (low-carbon dispatchable, transitional)'],
        ]}
      />

      <H2>Timeline and implementation</H2>
      <P>
        From the Energy Ministers' communiqué of 16 December 2025:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>February 2026</Em> — Officials deliver detailed implementation work program</li>
        <li><Em>Through 2026</Em> — Co-design with industry on contract templates, auction rules, governance</li>
        <li><Em>Late 2026</Em> — ESEM pilot auctions begin, possibly using existing CIS rules with adaptations</li>
        <li><Em>Early 2027</Em> — Formal ESEM commencement, replacing CIS</li>
        <li><Em>Through 2027–2030</Em> — Scaling phase, build-out of the secondary market and forward trading layer</li>
      </ul>

      <H2>Queensland's dissent</H2>
      <Callout type="warn">
        Queensland did not agree in-principle to the core ESEM recommendations. The state has
        chosen to retain implementation discretion, partly because the QLD Government Owned
        Corporation (GOC) model — Stanwell, CS Energy, CleanCo — already provides much of the
        underwriting function ESEM is designed to deliver. Queensland may operate a parallel
        scheme, accept ESEM with modifications, or stay outside the framework entirely. The
        decision is expected by mid-2026. For developers with QLD projects, this is the most
        important post-2027 regulatory uncertainty.
      </Callout>

      <H2>What bidders should be modelling now</H2>
      <P>
        For projects targeting COD 2028 or later:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Don't assume CISA is the post-2027 revenue underwriting path</Em>. Model an ESEM
          shaping or firming contract instead. Use the 2024–2026 NSW LTESA Round 5–6
          clearing prices as the closest analog for ESEM firming pricing.</li>
        <li><Em>For BESS projects, ESEM's firming contract is likely the most economic</Em> —
          values continuous dispatch capability over energy throughput, which matches BESS
          dispatch patterns.</li>
        <li><Em>For solar hybrids, the bulk-energy + shaping combination</Em> may be more
          natural than a single CISA-equivalent. The combined revenue is higher but exposed
          to two auction-clearing risks.</li>
        <li><Em>Watch the pilot auctions</Em> in late 2026 — the first set of clearing prices
          will tell developers exactly how the new market is pricing risk.</li>
      </ul>

      <Callout type="source">
        Sources: Energy Synapse{' '}
        <a className="text-[var(--color-primary)] hover:underline" href="https://energysynapse.com.au/esem-explained-how-the-nelson-review-improves-bankability-for-renewables-and-storage/" target="_blank" rel="noopener">ESEM explained</a>{' '}·
        Modo Energy{' '}
        <a className="text-[var(--color-primary)] hover:underline" href="https://modoenergy.com/research/en/nem-reform-nelson-review-electricity-services-entry-mechanism-esem-bess-impact" target="_blank" rel="noopener">Nelson Review BESS impact</a>{' '}·
        Energy Ministers Meeting communiqué 16 December 2025 ·
        Ashurst, Allens, KWM <em>Nelson Review final report briefings</em> ·
        Lexology summary of the NEM Wholesale Market Settings Review.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — Scenario A — when CIS / LTESA / ESEM work
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>The premise</H2>
      <P>
        Scenario A holds the optimistic version of the policy stack constant. CIS delivers
        roughly the awarded capacity through to 2030. LTESA expansion to other states proceeds.
        ESEM launches as planned and becomes the durable underwriting layer. Coal retirement
        proceeds on the AEMO ISP 2024 step-change trajectory. By the early 2030s the NEM is a
        majority-renewable system supported by a deep, transparent forward market.
      </P>

      <H2>The 2032 picture</H2>
      <Table
        emphasizeFirst
        headers={['Indicator', 'May 2026 (today)', '2032 (Scenario A)']}
        rows={[
          ['NEM renewable share (annual energy)', '~52%', '~78%'],
          ['Coal capacity', '~19 GW', '~6 GW (Bayswater 2.6 GW, Mt Piper 1.4 GW + small)'],
          ['BESS capacity (NEM)', '~6 GW', '~24 GW'],
          ['Long-duration storage (pumped hydro + 8h+ BESS)', '~3 GW', '~9 GW'],
          ['Contracted volume (CIS + LTESA + ESEM + corporate)', '~40 GW capacity', '~85 GW capacity'],
          ['Spot market merchant share', '~60% of energy', '~25% of energy'],
          ['Avg residential retail bill (real terms, 2026 = 100)', '100', '~88'],
          ['Real wholesale price (annual avg, $/MWh real 2026)', '~$75', '~$55'],
          ['Total renewable + storage investment 2026-2032', '—', '~$95B'],
        ]}
      />

      <H2>Market structure under Scenario A</H2>
      <P>
        The NEM bifurcates into a contracted layer and a residual merchant layer:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>~75% of new generation</Em> is contracted via CIS/LTESA/ESEM. These projects
          take their contracted price; market volatility is absorbed by Commonwealth /
          Administrator / state.</li>
        <li><Em>~15% is corporate PPA-backed</Em>. Hyperscaler 24/7 CFE PPAs sit alongside ESEM
          contracts, capturing the upside of high-price intervals.</li>
        <li><Em>~10% is pure merchant</Em>. Mostly legacy generators (Bayswater, Mt Piper, the
          tail of older renewables) plus marginal new investments at sites where contracted
          revenue isn't accessible.</li>
      </ul>
      <P>
        The merchant tier becomes a price-setter, not a volume-driver. New investment is almost
        entirely contracted. The merchant layer earns the wholesale price; the contracted layer
        earns its strike — but the contracted layer is dispatching most of the energy.
      </P>

      <H2>Consumer cost trajectory</H2>
      <P>
        Three drivers shape consumer cost under Scenario A:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Lower wholesale prices</Em> — high-renewable, well-firmed systems clear wholesale
          markets at lower long-run prices. Modelling suggests $55/MWh real wholesale by 2032
          (vs $75/MWh in 2026).</li>
        <li><Em>Network charge stability</Em> — REZ transmission investments are amortising;
          network charges plateau as 2025-2030 capex is paid down through 2035-2045.</li>
        <li><Em>ESEM and CIS contingent costs</Em> — these flow to consumers via a Roadmap-style
          charge or general taxation. If wholesale prices stay below ESEM floors, consumers pay
          ~$0.5-1.5B/yr to bridge.</li>
      </ol>
      <P>
        The net is a ~12% real reduction in residential bills by 2032, with industrial bills
        falling more (industrial users benefit disproportionately from wholesale price falls
        without bearing all the recovery costs).
      </P>

      <H2>Government cost trajectory</H2>
      <P>
        Counter-intuitively, Scenario A is the <Em>lower-cost</Em> scenario for government. Here's
        why:
      </P>
      <Callout type="numbers">
        <strong>CIS / ESEM net cost to Commonwealth, 2026-2032 (Scenario A):</strong>
        <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
          <li>2026: CIS top-ups ~$0.4B, clawback ~$0.1B → net cost $0.3B</li>
          <li>2028: Top-ups ~$0.7B, clawback ~$0.3B → net cost $0.4B (as more projects operate)</li>
          <li>2030: Top-ups ~$0.6B, clawback ~$0.5B → net cost $0.1B (wholesale recovery means fewer top-ups)</li>
          <li>2032 (ESEM era): Net cost $0.0–0.2B (ESEM is operating-cost neutral by design)</li>
          <li><strong>Total 2026-2032: ~$1.8B net Commonwealth cost</strong></li>
        </ul>
        <br />
        For context, the Commonwealth has already committed ~$10B over 10 years to CIS via the
        Capacity Investment Scheme Office. The realised cost under Scenario A is ~80% lower than
        budgeted, because the scheme worked.
      </Callout>

      <H2>Risk factors — what could break Scenario A</H2>
      <P>
        Three failure modes worth tracking:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Planning approval bottleneck</Em> — if NSW EnergyCo, the Vic EPA, and the QLD
          DRDMW can't process the project pipeline through 2030, awarded capacity doesn't
          convert into operating capacity. This is the most likely failure mode (and the AURES
          Scheme Tracker is designed to surface it early).</li>
        <li><Em>Grid connection delays</Em> — even with planning, AEMO connection studies and
          NSP capacity-allocation processes take 18-30 months. The 2027-2029 wave of new
          generation needs grid connection slots that aren't all secured.</li>
        <li><Em>MLF degradation in REZs</Em> — heavily-renewable REZ regions see MLFs degrade
          5-15 percentage points over 5-7 years. Project economics that looked viable at
          MLF 0.95 may not at MLF 0.85, and CISAs don't cover that risk.</li>
      </ul>

      <Callout type="key">
        Scenario A is the &ldquo;CIS/LTESA/ESEM works&rdquo; pathway, broadly consistent with
        AEMO ISP 2024 step-change. Consumer cost falls ~12% real. Commonwealth cost is
        materially lower than budget. The market becomes deeply contracted, with the merchant
        residual playing a price-setting role rather than a volume-driving one. The risks are
        structural and tractable — planning approvals, grid connection, MLF — not framework
        failure.
      </Callout>

      <Callout type="source">
        Sources: AEMO Integrated System Plan 2024 (step-change scenario) · Aurora Energy Research{' '}
        <em>NEM Long-Run Outlook</em> 2026 · BloombergNEF Australia ETO · DCCEEW CIS budget
        materials · NSW EnergyCo Statement of Opportunity · AURES{' '}
        <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
          Scheme Tracker
        </Link>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — Scenario B — data centre surge rewrites everything
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>The premise</H2>
      <P>
        Scenario B holds the AEMO ISP load trajectory wrong. Specifically: data centre demand
        grows 8-12% per year through 2030, driven by hyperscaler AI workload deployment in
        Australia. The 2026 forecast of ~2 GW of additional data centre load by 2030 is
        replaced by 8-15 GW. Coal exit timelines slip as a result. Hyperscalers co-invest in
        renewable + storage to satisfy their 24/7 carbon-free commitments. The NEM bifurcates
        in a different way than Scenario A.
      </P>

      <H2>The driver — what hyperscaler demand looks like</H2>
      <P>
        AirTrunk, NextDC, Goodman+Brookfield, CDC, and the existing global hyperscalers
        (Microsoft, AWS, Google) have all committed to 24/7 carbon-free AI workloads in
        Australia. The Sydney and Melbourne metro areas alone are projected to host 8-12 GW of
        data centre capacity by 2030 in the aggressive case — vs ~3 GW today and ~5 GW in
        AEMO's base case.
      </P>
      <P>
        AI workloads are higher-density, more constant-load, and have different shape
        characteristics than traditional cloud computing. The combination of growth rate +
        constant-load profile + 24/7 CFE commitment creates a demand profile that is
        substantially harder to satisfy with intermittent renewables alone.
      </P>

      <H2>The chain of consequences</H2>
      <P>
        Once the data centre demand thesis holds, a cascade of consequences follows:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Coal retirements slip</Em> — Eraring (originally 2025, extended to 2027, then
          2029) may extend further to 2032. Bayswater 2033 → 2036. The political pressure to
          keep coal open intensifies as data centres come online faster than renewable supply
          can replace coal.</li>
        <li><Em>Hyperscaler co-investment</Em> — Microsoft, Google, AWS sign direct PPAs with
          renewable + BESS hybrids and increasingly take equity stakes in new projects.
          Examples: Microsoft's 12-year PPA with Lightsource bp's Goyder South (signed 2025,
          $135/MWh strike including LGCs and 24/7 attribution).</li>
        <li><Em>24/7 CFE becomes the dominant offtake structure</Em> — by 2030, perhaps 30-40%
          of corporate PPAs are 24/7 CFE rather than annual-matching. The premium over flat
          PPAs is ~$30-50/MWh.</li>
        <li><Em>Bifurcated market</Em> — hyperscalers absorb the premium-shaped renewable
          generation; residual NEM consumers face higher merchant prices because new generation
          is increasingly contracted to hyperscalers, not the residual market.</li>
        <li><Em>Sovereign risk rises</Em> — foreign hyperscaler ownership of Australian
          generation raises political questions about energy sovereignty.</li>
      </ol>

      <H2>The 2032 picture under Scenario B</H2>
      <Table
        emphasizeFirst
        headers={['Indicator', 'May 2026 (today)', '2032 (Scenario B)']}
        rows={[
          ['NEM renewable share (annual energy)', '~52%', '~72% (vs ~78% in A)'],
          ['Coal capacity', '~19 GW', '~12 GW (vs ~6 GW in A — extensions hold)'],
          ['BESS capacity (NEM)', '~6 GW', '~32 GW (vs ~24 in A — hyperscalers push deployment)'],
          ['Data centre load', '~3 GW', '~12 GW (vs ~5 GW in A)'],
          ['Hyperscaler-PPA-contracted renewable capacity', '~3 GW', '~25 GW'],
          ['Avg residential retail bill (real terms, 2026 = 100)', '100', '~108 (vs ~88 in A)'],
          ['Real wholesale price (annual avg, $/MWh real 2026)', '~$75', '~$92 (vs ~$55 in A)'],
          ['Renewable + storage investment 2026-2032', '—', '~$140B (vs ~$95B in A)'],
        ]}
      />

      <H2>Consumer cost trajectory</H2>
      <P>
        Scenario B is the <Em>worse-for-consumers</Em> scenario. Three drivers push residential
        bills up:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Higher wholesale prices</Em> — hyperscaler 24/7 CFE PPAs absorb the best-located
          new generation at premium strikes. Residual consumers face higher merchant prices.</li>
        <li><Em>Coal extension costs</Em> — keeping Eraring, Bayswater, etc. running past their
          original retirement dates requires capacity payments. These flow to consumers.</li>
        <li><Em>Network constraint costs</Em> — concentrated data centre load in metro areas
          drives transmission upgrade requirements; AusGrid, Endeavour, TransGrid investment
          ramps up.</li>
      </ol>
      <P>
        Net residential bill impact: ~8% higher in real terms by 2032 (vs ~12% lower in
        Scenario A). The bill divergence between A and B is therefore ~20 percentage points —
        a substantial spread.
      </P>

      <H2>Government cost trajectory</H2>
      <P>
        Counter-intuitively (again), Scenario B is the <Em>lower-cost</Em> scenario for
        Commonwealth net CIS payments — because high wholesale prices mean fewer floor make-up
        payments and more ceiling clawbacks. But other budgetary pressures rise:
      </P>
      <Callout type="numbers">
        <strong>Scenario B Commonwealth cost picture, 2026-2032:</strong>
        <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
          <li>CIS / ESEM net cost: ~$0.5B over 7 years (lower than Scenario A due to ceiling clawbacks)</li>
          <li>Coal capacity payments: ~$3-5B (new — keeping retiring coal running)</li>
          <li>Transmission underwriting: ~$2-4B (data centre-driven network upgrades)</li>
          <li>Renewable energy capacity support: ~$1-2B (hyperscaler offsets some, not all)</li>
          <li><strong>Net Commonwealth cost: ~$8-11B (vs ~$2B in Scenario A)</strong></li>
        </ul>
      </Callout>
      <P>
        Scenario A is cheaper for both consumers and government. Scenario B benefits the
        hyperscaler-backed generators and the residual coal owners; it imposes costs on
        consumers and the budget.
      </P>

      <H2>Risk factors — what makes Scenario B plausible</H2>
      <P>
        Scenario B isn't the consensus forecast, but four trends make it more probable than the
        AEMO ISP 2024 base case suggests:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>AI workload growth is global</Em> — Microsoft's 2025 Q3 result showed Azure
          revenue growth 32% YoY, with AI workloads doubling that rate. Even if Australia
          captures only 5% of global AI infrastructure, that's 4-6 GW of new datacenter load by
          2030.</li>
        <li><Em>Hyperscaler capex is funded</Em> — Microsoft, Google, AWS all have $50-80B
          annual capex envelopes. The Australian piece is genuinely fundable.</li>
        <li><Em>Permitting advantages</Em> — data centres have generally favourable planning
          treatment vs new gas peakers or transmission lines. Approval timelines are 12-18
          months vs 4-6 years for generation.</li>
        <li><Em>Coal extension is politically attractive</Em> — &ldquo;keeping the lights on
          while data centres grow&rdquo; is an easier story than &ldquo;close coal early and
          import LNG&rdquo;.</li>
      </ul>

      <Callout type="key">
        Scenario B is the &ldquo;hyperscaler-led&rdquo; pathway. It's plausible because the
        forcing function (AI workload growth) is well-funded, fast-permitting, and creates
        political demand for coal extension. The macro result is higher wholesale prices,
        higher consumer bills, and substantially more storage deployment (BESS rises to ~32 GW
        by 2032 in B vs ~24 GW in A — hyperscalers are pushing the storage build-out faster).
        For developers, Scenario B is unambiguously good news. For consumers and budget
        watchers, it's the worse outcome.
      </Callout>

      <Callout type="source">
        Sources: AEMO ISP 2024 (base case)
        · Microsoft and Google 2025 Q3-Q4 results
        · Goldman Sachs <em>Global AI Infrastructure Outlook</em> 2026
        · NextDC, AirTrunk, Goodman 2025 investor updates
        · AFR coverage of hyperscaler PPA deals
        · McKinsey <em>Data Centre Demand 2030</em>
        · Energy Council briefings on data centre load.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 8 — Synthesis — signals to watch
// ============================================================

function Lesson8() {
  return (
    <div>
      <H2>Bookend scenarios, not a forecast</H2>
      <P>
        Scenarios A and B are deliberate bookends, not best estimates. The actual 2032 NEM will
        probably mix elements of both — modest data centre growth (more than ISP base, less than
        Scenario B), CIS/LTESA/ESEM delivering most of the awarded capacity (but with delivery
        delays), and a hybrid of mass-contracted renewables with hyperscaler-PPA-shaped premium
        deals. The point of the bookends is to identify what shifts the system between them.
      </P>

      <H2>The four critical signals for 2026-2028</H2>

      <H3>1. FNCEN tracker — CIS execution velocity</H3>
      <P>
        The First Nations Clean Energy Network &ldquo;From Commitment to Delivery&rdquo; tracker
        is the public proxy for CISA execution rates. The signal:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Bullish for Scenario A</Em>: Tender 3 (Sep 2025) projects start publishing in 6-12 months at a steady cadence. By end-2027, &gt;70% of awarded projects have executed.</li>
        <li><Em>Bearish for Scenario A</Em>: execution stalls — the &ldquo;14-month likely failed&rdquo; bucket grows. The signal is FNCEN publications &lt;30% of awarded projects 18 months after award.</li>
      </ul>

      <H3>2. NSW LTESA Round 7 — the post-CIS preview</H3>
      <P>
        LTESA Round 7 (expected Q4 2026) will be the first round designed with explicit
        knowledge of ESEM's contract templates. The clearing prices, technology mix, and
        bidder participation will signal:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Bullish</Em>: deep bid coverage at strikes consistent with previous rounds.</li>
        <li><Em>Bearish</Em>: thin coverage or sharply higher clearing prices, signalling that bidders are pricing in uncertainty about post-2027 underwriting.</li>
      </ul>

      <H3>3. ESEM pilot auction results (late 2026)</H3>
      <P>
        The first ESEM pilot auction will provide the first hard data on:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Clearing prices for each of the three contract types (bulk, shaping, firming)</li>
        <li>How standardisation actually works in practice — fungibility, transparency, secondary market formation</li>
        <li>The Administrator's risk appetite (warehouse-and-recycle requires the Administrator to take spread risk)</li>
      </ul>

      <H3>4. Data centre approvals + load forecasts</H3>
      <P>
        Watch:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>AEMO's annual Forecasting Reports — does the data centre load forecast revise upward materially in the next 2-3 cycles?</li>
        <li>Hyperscaler PPA announcements — are PPAs signed at strikes above $120/MWh? That's the signal of hyperscaler willingness to pay the 24/7 CFE premium.</li>
        <li>NSW + VIC planning approvals for new data centres — currently 20-30 active applications</li>
      </ul>

      <H2>How a developer should position</H2>
      <Callout type="key">
        Hybrid every solar project. The hybrid imperative isn't optional — it's the
        market-access prerequisite. Plan for ESEM as the post-2027 underwriting path; don't
        chase final CIS rounds at uneconomic strikes. Stack a corporate 24/7 CFE PPA on top
        of the ESEM contract — that's where the premium pricing lives. Use the AURES{' '}
        <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
          Scheme Tracker
        </Link>{' '}
        to monitor competitor CISA execution velocity — projects that fail-to-execute create
        opportunity for late-stage M&A.
      </Callout>

      <H2>How an investor should position</H2>
      <Callout type="key">
        Across-portfolio: maintain ~60% exposure to CIS/LTESA-contracted operating projects
        (Scenario A wins), ~20% to hyperscaler-PPA-shaped premium projects (Scenario B wins),
        ~10% to standalone BESS at solar-saturated nodes (works in both scenarios), ~10% to
        flexible-load demand-response businesses (the second-order ESEM beneficiary). Avoid
        late-stage development-only positions in projects without firm offtake — these are
        exposed to both scenarios collapsing.
      </Callout>

      <H2>How a policy-maker should position</H2>
      <Callout type="key">
        Accelerate two things: (1) planning approval velocity — both scenarios are bottlenecked
        on this, regardless of scheme design; (2) grid connection capacity — REZ build-out and
        NSP connection slot allocation determines whether contracted projects can deliver. The
        third lever — scheme design — matters less than these two. CIS, LTESA, and ESEM are
        well-designed instruments; the binding constraint is the planning and grid
        infrastructure surrounding them.
      </Callout>

      <H2>The role of AURES Intelligence</H2>
      <P>
        AURES is built to be the live-data layer for tracking these signals:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">Scheme Tracker</Link> monitors CISA execution velocity in near-real time</li>
        <li>The <Link to="/intelligence/boardroom" className="text-[var(--color-primary)] hover:underline">Boardroom briefing</Link> reframes Scheme Tracker data for executive review</li>
        <li>The Wind / Solar / BESS Value Analyses surface project-level economics including MLF erosion, capture price trends, and curtailment</li>
        <li>The 9 (now 10) learning modules build the foundational understanding to read these signals correctly</li>
      </ul>

      <P>
        The next module — likely a deep-dive on AEMO ISP 2025 (due Aug 2026) and what its
        scenarios imply for renewable project investment — will arrive once the AEMO publishes.
        Until then, the eight lessons of this module are the synthesis layer for the entire
        AURES curriculum.
      </P>

      <Callout type="source">
        Sources synthesised from: all prior AURES learning modules (Constraints, CIS-LTESA,
        REZ, Solar+BESS, Energy Transition, Planning, AEMO Connections, PPAs, Project
        Financing) · AEMO ISP 2024 · Nelson Review final report (Dec 2025) · Energy
        Ministers communiqués · CIS / LTESA round materials · CSIRO GenCost · BloombergNEF
        Australia ETO · Aurora Energy Research, Modo Energy, Cornwall Insight long-run
        outlooks · AURES Scheme Tracker live data.
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
  const totalMin = LESSONS.reduce((s, l) => s + parseInt(l.readingTime, 10), 0)
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div>
        <Link to="/learn" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← Learning modules
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] mt-2 mb-1">
          Summing It Up — Market Implications
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Synthesising the curriculum into a forward view of the NEM through 2030. {LESSONS.length} lessons · ~{totalMin} min total.
        </p>
      </div>

      <div className="space-y-2">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          return (
            <Link
              key={l.id}
              to={`/learn/summing-it-up/${l.id}`}
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
        {LESSONS.filter(l => progress.has(l.id)).length} of {LESSONS.length} lessons read.
        {' '}
        <button onClick={() => { LESSONS.forEach(l => onMark(l.id, false)) }}
          className="text-[var(--color-primary)] hover:underline">
          Reset progress
        </button>
      </div>
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
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div>
        <Link to="/learn/summing-it-up" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← Summing It Up
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
        {lesson.id === 'hybrid-imperative'    && <Lesson1 />}
        {lesson.id === 'hybrid-economics'     && <Lesson2 />}
        {lesson.id === 'curtailment-question' && <Lesson3 />}
        {lesson.id === 'operating-hybrids'    && <Lesson4 />}
        {lesson.id === 'esem'                 && <Lesson5 />}
        {lesson.id === 'scenario-a'           && <Lesson6 />}
        {lesson.id === 'scenario-b'           && <Lesson7 />}
        {lesson.id === 'synthesis'            && <Lesson8 />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/summing-it-up/${prev.id}`)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/summing-it-up/${next.id}`) }}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 transition-colors">
            Mark read + next → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/summing-it-up') }}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
            Mark read + back to index
          </button>
        )}
      </div>
      {!progress.has(lesson.id) && (
        <p className="text-[10px] text-[var(--color-text-muted)] text-center">
          Mark this lesson as read to unlock the next one.
        </p>
      )}
    </div>
  )
}

export default function SummingItUpModule() {
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
  if (!lesson) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Lesson not found.</p>
        <Link to="/learn/summing-it-up" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to Summing It Up
        </Link>
      </div>
    )
  }
  return <LessonView lesson={lesson} progress={progress} onComplete={onComplete} />
}
