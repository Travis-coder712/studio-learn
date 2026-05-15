/**
 * Project Financing of Renewables — AURES Learning Module
 *
 * 11 lessons covering the full project finance lens on renewable projects:
 * SPV structure, equity stack, debt stack, the Australian lender market,
 * DSCR + leverage sizing, risk allocation, funding waterfall + covenants,
 * tax + accounting, how CIS/LTESA transform bankability, refinancing,
 * recent deals + 2026-2030 lender outlook.
 */
import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-project-financing-progress'

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
  { id: 'spv',          number: 1,  title: 'Project finance 101 — the SPV structure',                  subtitle: 'Why renewable projects are financed off-balance-sheet via Special Purpose Vehicles', readingTime: '11 min' },
  { id: 'equity',       number: 2,  title: 'The equity stack — sponsors, infra funds, super',          subtitle: 'Who provides equity, in what tranches, and what IRRs they target',   readingTime: '12 min' },
  { id: 'debt',         number: 3,  title: 'The debt stack — senior, mezzanine, mini-perm vs term',    subtitle: 'How debt is structured for renewable projects in Australia',         readingTime: '13 min' },
  { id: 'lenders',      number: 4,  title: 'The Australian lender market — who actually does the deals', subtitle: 'Big 4, CEFC, Japanese megabanks, European DFIs, Asian infra',     readingTime: '12 min' },
  { id: 'dscr',         number: 5,  title: 'DSCR and leverage — how lenders size debt',                subtitle: 'The DSCR-based sizing math with worked examples and P50/P90 mechanics', readingTime: '14 min' },
  { id: 'risk',         number: 6,  title: 'Risk allocation in renewable PF',                          subtitle: 'Construction, resource, market, regulatory, force majeure — who bears what', readingTime: '12 min' },
  { id: 'waterfall',    number: 7,  title: 'The funding waterfall and key covenants',                  subtitle: 'Cash sweep, lock-up triggers, reserves, cure rights, distribution tests', readingTime: '11 min' },
  { id: 'tax',          number: 8,  title: 'Tax structures and accounting',                            subtitle: 'Depreciation, instant asset write-off, IFRS 9, hedge accounting',     readingTime: '12 min' },
  { id: 'cis-impact',   number: 9,  title: 'How CIS and LTESA transform bankability',                   subtitle: 'Revenue floor changes the math — CFD accounting + stacking + refinancing', readingTime: '13 min' },
  { id: 'refinancing',  number: 10, title: 'Refinancing — when the mini-perm rolls',                   subtitle: 'Refinancing risk, fee tail, multi-bank syndication, post-FID dynamics', readingTime: '11 min' },
  { id: 'outlook',      number: 11, title: 'Recent deals and the 2026-2030 lender outlook',            subtitle: 'Murra Warra, Stockyard Hill, Waratah Super Battery — what they reveal', readingTime: '13 min' },
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
// Lesson 1 — Project finance 101 — the SPV structure
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>Why renewable projects use project finance</H2>
      <P>
        A 200 MW wind farm in Australia today costs around $400-500M to build. A 1 GW solar +
        BESS hybrid can reach $1.5-2B. These are large numbers — but they are not, by global
        infrastructure standards, especially big. The question is not "is the project
        affordable?" but "how does the developer access the capital, on what terms, and with
        what risk allocation?". That question is answered through <Em>project finance (PF)</Em>
        — a specialised lending structure that funds individual infrastructure assets through
        limited-recourse debt against the asset's own cash flows.
      </P>

      <H2>Limited recourse — the defining feature</H2>
      <P>
        The most important feature of project finance is <Em>limited recourse</Em>. In a
        standard corporate loan, the lender has recourse to the entire balance sheet of the
        borrowing company — if the project fails, the lender can claim against the parent's
        other assets. In project finance, the lender's recourse is limited to:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The project's own cash flows (revenue minus opex)</li>
        <li>The project's own physical assets (security over plant + land + contracts)</li>
        <li>Sometimes a limited equity-injection commitment from the sponsor for specified
          contingencies</li>
      </ul>
      <P>
        Limited recourse means the sponsor's other assets are protected if the project
        underperforms. Equally, lenders charge higher rates than they would on full-recourse
        corporate debt — because their downside is capped at the project itself.
      </P>

      <H2>The Special Purpose Vehicle (SPV)</H2>
      <P>
        Project finance is structured around a <Em>Special Purpose Vehicle (SPV)</Em> — a
        single-purpose legal entity created specifically to own the project. The SPV typically:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Is a private company limited by shares (Pty Ltd) or a trust</li>
        <li>Owns 100% of the project assets — plant, land tenure, contracts</li>
        <li>Is the borrower for all project debt</li>
        <li>Has restrictive constitutional documents preventing it from doing anything other
          than the project (this protects lenders from "asset substitution" risk)</li>
        <li>Has limited employees — operations typically outsourced to a service company</li>
        <li>Is owned by one or more sponsors via a holding company structure</li>
      </ul>
      <P>
        A typical structure diagram:
      </P>
      <Table
        emphasizeFirst
        headers={['Level', 'Entity', 'Role']}
        rows={[
          ['Top', 'Sponsor (corporate group)', 'Develops the project; provides equity'],
          ['Mid', 'HoldCo (Holding Company)', 'Owns 100% of ProjectCo; sometimes the credit-supporting entity'],
          ['Bottom', 'ProjectCo SPV (the borrower)', 'Owns the project; signs all PPAs, EPC contracts, supply agreements'],
          ['Lender-side', 'Senior Lenders (banks)', 'Provide debt to ProjectCo SPV; secured by SPV assets'],
          ['Subordinated', 'Sponsor / Co-investors', 'Equity capital; shareholder loans subordinated to senior debt'],
        ]}
      />

      <H2>What the SPV does and doesn't do</H2>
      <P>
        The SPV is a thin operating entity. It:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Signs the EPC contract for construction</li>
        <li>Signs the PPA for offtake</li>
        <li>Signs the O&amp;M contract for operations</li>
        <li>Signs the connection agreement with the NSP</li>
        <li>Maintains the security and reporting obligations to lenders</li>
        <li>Distributes profits to its shareholders (subject to covenants)</li>
      </ul>
      <P>
        The SPV typically has 0-3 employees — the actual people doing the work sit in the
        sponsor's corporate development team, the O&amp;M provider's operations team, or
        third-party project administrators. This thin structure is by design: it makes the
        SPV simple to understand, audit, and (if necessary) hand over to lenders in default.
      </P>

      <H2>Why limited-recourse is so important for renewables</H2>
      <P>
        Three reasons project finance suits renewables particularly well:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Capital intensity vs sponsor balance sheet</Em> — a single 1 GW project can be
          larger than the entire balance sheet of many renewable developers. Project finance
          lets developers build multiple large assets across multiple SPVs without consolidated
          balance sheet pressure.</li>
        <li><Em>Predictable cash flows</Em> — renewable projects with PPAs or CIS contracts
          have highly predictable revenue, making them ideal candidates for cash-flow-based
          debt sizing.</li>
        <li><Em>Asset-specific risks</Em> — each project has unique resource, location, and
          contractual risk profiles. Project finance allows the risk allocation to be tailored
          per asset rather than pooled at the corporate level.</li>
      </ul>

      <H2>The sponsor's perspective</H2>
      <P>
        For a renewable energy developer (Squadron, Tilt, Neoen, Acen, Goldwind, etc.),
        project finance offers:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Leverage</Em> — typical 65-75% debt funding means equity contributes only
          ~$100-150M to a $400-500M wind farm</li>
        <li><Em>Capital efficiency</Em> — the sponsor can recycle equity capital across
          multiple projects rather than tying it up in any single asset</li>
        <li><Em>Risk isolation</Em> — if Project A fails, Project B continues unaffected
          (legally distinct SPVs)</li>
        <li><Em>Co-investment</Em> — partners can take stakes in individual projects without
          buying into the entire sponsor's portfolio</li>
      </ul>

      <H2>The lender's perspective</H2>
      <P>
        For a senior lender, project finance offers:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Direct security</Em> — first-mortgage charge over project plant + first-
          ranking security over project contracts</li>
        <li><Em>Cash flow control</Em> — funding waterfall ensures debt service is paid before
          equity distributions</li>
        <li><Em>Covenant protection</Em> — restrictive covenants on additional debt, asset
          sale, contract modification</li>
        <li><Em>Step-in rights</Em> — ability to take over project operations if sponsor
          defaults or fails to fund</li>
      </ul>

      <H2>The challenges</H2>
      <P>
        Project finance is not free. The trade-offs:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Higher cost of debt</Em> — typically 100-300 bps higher than corporate debt
          for the same credit quality, reflecting the limited recourse</li>
        <li><Em>Transaction cost</Em> — typical fees for major PF transaction (legal,
          financial, technical advisors): $5-15M for a $400-500M deal</li>
        <li><Em>Long lead times</Em> — 9-18 months from mandate to financial close is typical;
          drafting, due diligence, syndication take time</li>
        <li><Em>Covenant restrictions</Em> — sponsors lose flexibility — major decisions
          require lender consent</li>
      </ul>

      <Callout type="key">
        Project finance is the dominant funding mechanism for Australian renewables for good
        reason — it matches the asset class's predictable cash flows with limited-recourse
        debt while preserving sponsor balance sheet capacity for portfolio growth. The SPV
        structure isolates risk, the limited recourse caps lender exposure, and the
        cash-flow-based debt sizing allows aggressive leverage. The trade-off is higher
        transaction cost and lost flexibility — both acceptable for assets that will operate
        for 25-30 years on contractually-defined cash flows.
      </Callout>

      <Callout type="source">
        Sources: King &amp; Wood Mallesons <em>Australian Project Finance Practice</em> 2024 ·
        Norton Rose Fulbright <em>Project Finance Sourcebook</em> · Allens
        <em> Renewable Energy Finance updates</em> · IJGlobal Australian PF deal database ·
        CEFC <em>Project Finance Best Practice</em> 2023.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — The equity stack
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>Who provides the equity</H2>
      <P>
        The equity portion of a renewable project finance — typically 25-35% of total project
        capex — comes from multiple sources in distinct tranches. The composition has evolved
        substantially since 2015, with infrastructure funds and super funds now dominating
        what was once a sponsor-only category.
      </P>
      <Table
        emphasizeFirst
        headers={['Tier', 'Provider', 'Typical share', 'Target IRR', 'Hold period']}
        rows={[
          ['Sponsor (developer) equity', 'Squadron, Tilt, Neoen, Acen, Goldwind, etc.', '15-40% of equity', '15-25%', 'Development to FID; often partial exit at FID'],
          ['Infrastructure equity funds', 'Macquarie GIG, IFM, Brookfield, KKR, Stonepeak', '30-60% of equity', '10-13%', '15-30 years (long-hold infra)'],
          ['Industry super funds', 'AustralianSuper, IFM, Aware Super, Hesta, Cbus', '10-30% of equity', '8-11%', '20-40 years (perpetual capital)'],
          ['Strategic co-investors', 'Gentailers (AGL, Origin), OEMs (Goldwind, Vestas)', '5-25% of equity', 'Variable', '10-25 years'],
          ['CEFC (federal)', 'Clean Energy Finance Corporation', '5-20% of equity (lead role)', 'Concessional', '10-25 years; sometimes exits at refinancing'],
        ]}
      />

      <H2>The developer's equity decision</H2>
      <P>
        For a developer, the question at FID is: <Em>how much equity to retain vs how much
        to sell?</Em> Three typical approaches:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Full retention (100% sponsor equity)</Em> — only the largest, well-capitalised
          developers (Acciona, Iberdrola, Engie, Origin) can retain 100%. Most others cannot.</li>
        <li><Em>Partial sell-down (typically 49-90% sold at FID)</Em> — most common pattern.
          Developer retains 10-51% to preserve operating control and partial upside; sells the
          rest to long-term infra/super capital.</li>
        <li><Em>Full sell-down (100% sold at or near FID)</Em> — a "build-and-flip" model.
          Developer recovers all development capital plus a development fee; long-term owner
          gets the operating asset.</li>
      </ul>

      <H2>Infrastructure funds — the dominant equity buyer</H2>
      <P>
        Australian renewable equity is dominated by global and Australian infrastructure
        funds:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Macquarie GIG (Green Investment Group)</Em> — Macquarie's infrastructure arm.
          Major holder in Stockyard Hill, Murra Warra, multiple Australian solar+BESS</li>
        <li><Em>IFM Investors</Em> — Australian super-fund-owned infrastructure manager.
          Holdings include Pacific Hydro plus direct stakes</li>
        <li><Em>Brookfield Asset Management</Em> — Canadian-owned global infrastructure giant.
          Made an unsuccessful 2023 bid for Origin Energy; major NEM presence via Powering
          Australian Renewables Fund (PARF) co-investments</li>
        <li><Em>KKR / Stonepeak / GIP / EQT</Em> — major US/European PE infrastructure
          investors, each with multiple Australian renewable holdings</li>
        <li><Em>Mirova / Aware Super (joint)</Em> — French + Australian super fund partnership
          investing in renewables</li>
        <li><Em>InfraStructure Capital Group, Roc Partners, Palisade Investment Partners</Em>
          — Australian mid-cap infra investors active in renewables</li>
      </ul>

      <H2>Australian industry super funds — the new whale</H2>
      <P>
        Australia's superannuation system has approximately A$3.5 trillion in assets under
        management — making it the world's fourth-largest pension pool. Australian super
        funds have been progressively allocating more of this capital to domestic renewables:
      </P>
      <Table
        emphasizeFirst
        headers={['Fund', 'AUM (approx)', 'Renewable holdings', 'Strategy']}
        rows={[
          ['AustralianSuper', '~$330B', 'Direct stakes in major Australian renewables; rejected Brookfield-Origin bid 2023', 'Long-hold direct infrastructure'],
          ['IFM Investors (multi-fund)', '~$220B managed', 'Pacific Hydro plus direct project stakes', 'Asset-management for multiple super funds'],
          ['Aware Super', '~$170B', 'Multiple renewable PE + direct holdings', 'Direct + co-invest model'],
          ['HESTA', '~$100B', 'Climate-aligned portfolio with explicit renewables target', 'ESG-led allocation'],
          ['Cbus', '~$95B', 'Renewables exposure via PE + listed funds', 'Mixed allocation'],
          ['UniSuper', '~$140B', 'Selective renewable infrastructure', 'Conservative allocation'],
        ]}
      />
      <P>
        Super fund equity has grown from ~$5B in 2015 to ~$25-30B in 2026. The combination of
        long-dated liability matching, ESG mandate alignment, and stable infrastructure
        returns makes super capital structurally suited to renewable projects.
      </P>

      <H2>The CEFC — federal foundation investor</H2>
      <P>
        The <Em>Clean Energy Finance Corporation (CEFC)</Em>, established 2012 by the Gillard
        Government, is a federal-government-owned green investment bank. CEFC operates with
        the dual mandate of (1) accelerating Australian clean energy investment and (2)
        earning at least the government's cost of capital. Key features:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Has invested approximately A$13-14B cumulative through 2026 across ~280+
          transactions</li>
        <li>Acts as both senior debt provider AND equity investor — sometimes leading;
          sometimes co-investing</li>
        <li>Capital is concessional — willing to take longer payback periods or higher risk
          than commercial banks, in exchange for catalytic effect</li>
        <li>Often leads first-of-kind deals where commercial capital is hesitant (early
          long-duration storage, hydrogen-related projects)</li>
        <li>Reports to government via DCCEEW; subject to Parliamentary oversight</li>
      </ul>

      <H2>How equity returns are typically structured</H2>
      <P>
        Within the equity stack, returns are distributed via a <Em>waterfall</Em> that
        prioritises different investor classes:
      </P>
      <Table
        emphasizeFirst
        headers={['Tier', 'Hurdle rate', 'Distribution priority']}
        rows={[
          ['Tier 1 — Preferred (super, CEFC)', '7-9% nominal', 'First — until preferred return achieved'],
          ['Tier 2 — Common equity (infra funds, gentailers)', 'Standard rate', 'Pro-rata after preferred satisfied'],
          ['Tier 3 — Sponsor equity (developer)', 'Higher (carried interest)', 'Catch-up tier above hurdle; participation in upside'],
          ['Tier 4 — Performance carry (developer)', 'Variable', 'Performance carry — typically 15-25% of returns above hurdle'],
        ]}
      />
      <P>
        The structure ensures long-term capital (super, CEFC) gets paid first; sponsors capture
        upside through carry; co-investors share pro-rata. The exact structure is heavily
        negotiated and varies by deal.
      </P>

      <H2>What changed since 2015</H2>
      <P>
        Five major shifts in the equity stack composition:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Sponsor equity share has shrunk</Em> — from ~60% (2015) to ~25-35% (2026) of
          equity stack</li>
        <li><Em>Super fund participation has grown 5x</Em> — Australian super capital
          allocation to domestic renewables has gone from ~3% to ~15-20% of total renewable
          equity</li>
        <li><Em>Global infrastructure funds have entered at scale</Em> — Brookfield, KKR,
          Stonepeak, EQT all have substantial Australian renewable portfolios</li>
        <li><Em>CEFC has stepped back as a primary investor</Em> — its role has shifted from
          first-mover to filling specific gaps (hydrogen, long-duration storage)</li>
        <li><Em>Gentailer equity participation has stabilised</Em> — AGL, Origin, EnergyAustralia
          maintain co-investment positions but no longer dominate</li>
      </ul>

      <Callout type="key">
        The equity stack tells you a lot about a renewable project's commercial logic. Highly
        contracted, low-risk projects attract super-fund-led capital with patient long-hold
        thesis. More complex or development-stage projects need higher-IRR-targeting infra
        funds and CEFC. Sponsors have moved from being primary owners to development-and-
        development-fee operators — capturing value through carry, fees, and partial retained
        stakes rather than full asset ownership. The 2026-2030 pipeline is heavily dependent
        on continued super-fund allocation growth.
      </Callout>

      <Callout type="source">
        Sources: APRA superannuation statistics 2024-2025 · CEFC annual reports 2013-2025 ·
        IFM Investors disclosures · AustralianSuper infrastructure portfolio · Macquarie GIG
        Australia portfolio · IJGlobal equity deal database · BloombergNEF
        <em> Australian renewable equity tracking</em> 2024-25 · Mercer / Frontier Advisors
        super fund infrastructure allocation reports.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — The debt stack
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>The two structural choices — mini-perm vs term</H2>
      <P>
        Australian renewable project finance debt comes in two main structural forms, with
        very different implications for sponsors:
      </P>
      <Table
        emphasizeFirst
        headers={['Structure', 'Tenor', 'Amortisation', 'Refinancing requirement', 'When used']}
        rows={[
          ['Term debt', '12-15 yr', 'Fully amortising over term', 'No (paid down in full)', 'Stable cash flow projects; sometimes for very contracted projects'],
          ['Mini-perm debt', '4-7 yr "hard" / 10-15 yr "soft"', 'Partial — leaves "balloon" payment at end of term', 'Required — must refinance at end of mini-perm', 'Most modern Australian deals; mid-risk projects'],
        ]}
      />
      <P>
        Most modern Australian renewable PF deals are <Em>mini-perm structures</Em> — the
        debt is structured as if it would be repaid over 15-18 years, but the actual term is
        4-7 years. At end of mini-perm, the borrower must refinance with new debt. This is
        explored further in Lesson 10.
      </P>

      <H2>Senior vs subordinated debt</H2>
      <P>
        Within the debt stack, lenders can sit at different priority levels:
      </P>
      <Table
        emphasizeFirst
        headers={['Tier', 'Position', 'Typical share of total debt', 'Pricing premium over senior']}
        rows={[
          ['Senior secured debt', 'First-mortgage charge; first to be paid in default', '85-95%', 'Base'],
          ['Mezzanine debt', 'Subordinated to senior but ahead of equity', '5-15%', '+200-400 bps over senior'],
          ['Shareholder loans (subordinated)', 'Behind all external debt', 'Variable', 'Usually intercompany rate'],
        ]}
      />
      <P>
        For most renewable projects, the debt stack is exclusively senior — typically with
        2-5 lenders syndicated. Mezzanine debt is rare in Australian renewables; when used,
        it's typically for higher-risk, partial-merchant projects or for refinancing
        situations where senior lenders have hit their leverage limit.
      </P>

      <H2>The drawdown profile</H2>
      <P>
        Debt is drawn down progressively during construction, matching expenditure milestones:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Initial drawdown at financial close</Em> — typically 5-10% of facility, for
          long-lead-time equipment orders and early site works</li>
        <li><Em>Construction-phase drawdowns</Em> — typically monthly or quarterly, against
          certified construction milestones (verified by independent technical advisor)</li>
        <li><Em>Final drawdown at COD/R2</Em> — typically a "completion certificate" milestone
          confirming the project has reached commercial operation</li>
        <li><Em>Operating-phase amortisation</Em> — from R2 onwards, the project earns revenue
          and debt service starts. Amortisation profiles tracked monthly or quarterly.</li>
      </ul>

      <H2>Interest rate hedging — mandatory for most lenders</H2>
      <P>
        Renewable project finance debt is typically priced at a floating rate (BBSW +
        margin), but lenders require sponsors to hedge most of the interest rate risk through
        interest rate swaps. Typical requirements:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>80-95% of debt notional hedged through fixed-for-floating swaps</li>
        <li>Hedge tenor matches debt tenor (or for mini-perm, the soft tenor extending to
          refinancing)</li>
        <li>ISDA Master Agreements with the swap counterparty</li>
        <li>Cross-default provisions linking the hedge to the loan</li>
      </ul>
      <P>
        The hedging requirement means a project's effective debt cost is fixed (or near-
        fixed) at financial close — protecting both lenders and sponsors from interest rate
        swings. The swap counterparties are typically the same banks that provide the senior
        debt (each lender's swap desk).
      </P>

      <H2>Debt sizing — the four levers</H2>
      <P>
        Lenders size project debt using four primary inputs:
      </P>
      <Table
        emphasizeFirst
        headers={['Lever', 'What it determines', 'Typical Australian values 2026']}
        rows={[
          ['Cash Flow Available for Debt Service (CFADS)', 'Annual revenue minus opex available to pay debt', 'P50 estimate from financial model'],
          ['Debt Service Coverage Ratio (DSCR)', 'How much CFADS cushion lenders require', '1.30x base case; 1.10x P90 downside'],
          ['Tenor', 'Length of the debt facility', '12-15 yr term; 4-7 yr mini-perm soft tenor'],
          ['Interest rate + margin', 'Effective cost of debt', 'BBSW + 200-280 bps for senior secured'],
        ]}
      />
      <P>
        These four inputs combine in the DSCR-based sizing formula explored in Lesson 5. The
        upshot: a 200 MW wind farm with $50M annual CFADS at 1.30x DSCR can support
        approximately $400-450M of senior debt at current rates — typical leverage levels
        for contracted Australian renewables.
      </P>

      <H2>Currency considerations</H2>
      <P>
        Australian renewable PF debt is overwhelmingly in <Em>Australian dollars</Em>. The
        rare exceptions:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Some Japanese megabank syndications include a JPY tranche when the J-bank's
          A$ funding is constrained</li>
        <li>Specific equipment supply lines (e.g. wind turbine OEM finance) may be Euro-
          denominated</li>
        <li>Greenfield deals with European DFI sponsors sometimes have a Euro component</li>
      </ul>
      <P>
        When non-AUD debt is included, the sponsor takes currency risk on the cash flows
        (which are AUD-denominated). Currency swaps are typically used to hedge this — but
        they add complexity and cost.</P>

      <H2>The drawn-down debt fee structure</H2>
      <P>
        Lenders earn fees in addition to interest margin:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Arrangement fee</Em> — paid at financial close; typically 1.5-3% of facility
          size, split among arrangers</li>
        <li><Em>Underwriting fee</Em> — paid to bookrunner/underwriter; typically 0.5-1%</li>
        <li><Em>Commitment fee</Em> — paid on undrawn portion of facility during construction;
          typically 30-50% of margin</li>
        <li><Em>Agency fee</Em> — paid to the facility agent annually; typically $50-200k
          fixed</li>
        <li><Em>Modeling and advisory fees</Em> — typically $1-3M for the lender's
          independent advisors</li>
      </ul>
      <P>
        Total upfront fees on a $400M facility typically run $10-15M — a meaningful cost that
        contributes to the overall cost of project debt.
      </P>

      <H2>The basic debt structure summary</H2>
      <P>
        For a typical fully-contracted Australian wind/solar/BESS project in 2026:
      </P>
      <Table
        emphasizeFirst
        headers={['Element', 'Typical setting']}
        rows={[
          ['Structure', 'Senior secured mini-perm'],
          ['Tenor', '5-7 yr hard; 12-15 yr soft (refinanced)'],
          ['Leverage', '65-75% of total capex'],
          ['Amortisation', 'Sculpted to DSCR target during mini-perm'],
          ['Pricing', 'BBSW + 200-280 bps senior'],
          ['Hedging', '80-95% of debt notional, matched tenor'],
          ['Currency', 'AUD'],
          ['Number of lenders', '3-6 typically; 6-10 for large deals'],
          ['Fees', '~$10-15M upfront on a $400M facility'],
        ]}
      />

      <Callout type="key">
        The debt stack for an Australian renewable project is highly standardised. Senior
        secured mini-perm is the dominant structure; interest hedging is mandatory; leverage
        sits in a 65-75% band for contracted projects. The major variables are tenor (driven
        by sponsor refinancing preferences), pricing (driven by lender competitive dynamics),
        and amortisation profile (driven by cash flow shape and DSCR target). Understanding
        these levers is the foundation for understanding why some projects can support
        aggressive leverage and others cannot.
      </Callout>

      <Callout type="source">
        Sources: Norton Rose Fulbright <em>Project Finance Sourcebook</em> · King &amp; Wood
        Mallesons <em>Australian Project Finance Practice</em> 2024 · Reserve Bank of Australia
        BBSW data · IJGlobal Australian PF deal database 2018-2025 · CEFC
        <em> Investment Principles</em> 2024 · NAB / CBA / Westpac / ANZ project finance
        publications.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — The Australian lender market
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>The Australian lender market overview</H2>
      <P>
        The Australian renewable project finance lender market is a relatively concentrated
        group of approximately 20-25 active lenders. They divide into four broad cohorts:
      </P>
      <Table
        emphasizeFirst
        headers={['Cohort', 'Typical role', 'Approx market share (2024-26)']}
        rows={[
          ['Big 4 Australian banks (NAB, CBA, Westpac, ANZ)', 'Dominant senior debt providers; usually 1-2 in any syndicate', '~40-50% of cumulative lending'],
          ['Japanese megabanks (MUFG, SMBC, Mizuho, MUFG)', 'Major co-lenders; sometimes sole-arranger', '~20-25%'],
          ['European DFIs and commercial banks (ING, BNP Paribas, Société Générale, Nord/LB, Credit Agricole)', 'Co-lenders; often bring technical expertise', '~15-20%'],
          ['Asian commercial + DFI banks (KEXIM, KDB, China Construction Bank, Bank of China)', 'Co-lenders; sometimes leading equipment-tied finance', '~5-10%'],
          ['Government-backed (CEFC)', 'Co-lender or lead lender; concessional terms', '~5-10%'],
        ]}
      />

      <H2>The Big 4 Australian banks</H2>
      <P>
        <Em>NAB, CBA, Westpac and ANZ</Em> are the dominant lenders to Australian renewable
        projects. They have invested substantially in dedicated energy and infrastructure
        finance teams, with each bank typically having 30-60 specialist project finance
        professionals across Sydney and Melbourne. Cumulative renewable energy lending by
        the Big 4 since 2015 is estimated at A$30-40B.
      </P>
      <P>
        Key features of Big 4 participation:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Sustainability-linked lending</Em> — all four banks have signed up to global
          sustainability initiatives (Net Zero Banking Alliance, Principles for Responsible
          Banking). Renewable lending now sits within explicit ESG mandates.</li>
        <li><Em>Australian dollar capacity</Em> — Big 4 banks can fund A$200M+ tickets in a
          single deal without syndication; international banks typically prefer to split
          across multiple syndicate participants.</li>
        <li><Em>Existing client relationships</Em> — Big 4 banks typically have corporate
          banking relationships with sponsors, gentailers, and offtakers — making them
          natural co-lenders for new deals.</li>
        <li><Em>Sustainability-linked pricing</Em> — some Big 4 loans include ESG-linked
          margin reductions (typically 2.5-5 bps for meeting carbon, biodiversity, or
          gender-pay targets).</li>
      </ul>

      <H2>The Japanese megabanks</H2>
      <P>
        Three Japanese banks — <Em>MUFG (Mitsubishi UFJ Financial Group), Mizuho, SMBC
        (Sumitomo Mitsui Banking Corporation)</Em> — are the largest non-Australian lender
        group. Their motivations and characteristics:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Long-standing presence in Asia-Pacific infrastructure finance; Australia is a
          natural extension</li>
        <li>Significant Japanese corporate exposure to Australian energy (TEPCO Loy Yang
          legacy, Marubeni / Mitsui infrastructure portfolios)</li>
        <li>Strong yen funding base allows aggressive pricing — Japanese banks frequently
          underprice Australian Big 4 by 10-20 bps</li>
        <li>Comfort with long-tenor lending (15-20+ years) — Japanese banks have been more
          willing to offer true term debt vs the mini-perm structures favoured by some
          Australian banks</li>
      </ul>

      <H2>European DFIs and commercial banks</H2>
      <P>
        Several European lenders maintain dedicated Australian renewable energy desks:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>ING (Netherlands)</Em> — global renewable energy specialist; very active in
          Australian deals 2018-2025</li>
        <li><Em>BNP Paribas (France)</Em> — broad infrastructure mandate including renewables</li>
        <li><Em>Société Générale (France)</Em> — energy and resources focus</li>
        <li><Em>Nord/LB (Germany)</Em> — wind sector specialist; strong technical capability</li>
        <li><Em>Credit Agricole / CIB (France)</Em> — infrastructure and energy</li>
        <li><Em>Deutsche Bank, Commerzbank (Germany)</Em> — selective participation</li>
        <li><Em>HSBC (UK/HK)</Em> — Asia-Pacific including Australia</li>
      </ul>
      <P>
        European banks bring two specific value-adds: deep technical understanding of
        renewable energy projects (particularly wind technology), and well-established
        relationships with European OEMs (Vestas, Siemens Gamesa, ENGIE, EDF). They are
        typically smaller-ticket co-lenders ($30-80M per deal) but often involved in
        complex deals.
      </P>

      <H2>The CEFC — federal foundation lender</H2>
      <P>
        The Clean Energy Finance Corporation has been the single most influential lender in
        Australian renewables over the past decade. Although small in absolute terms
        (cumulative ~A$13-14B), CEFC has been disproportionately influential:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>First-mover role</Em> — CEFC has led most first-of-kind technology deals in
          Australia (first major battery, first long-duration storage, first hydrogen pilot)</li>
        <li><Em>Concessional terms</Em> — willing to accept lower returns or longer payback
          to catalyse private capital</li>
        <li><Em>Standard-setting</Em> — CEFC has shaped technical and contractual standards
          that subsequent commercial deals have adopted</li>
        <li><Em>De-risking</Em> — CEFC participation often gives commercial lenders comfort
          to participate at higher leverage or earlier in the technology cycle</li>
      </ul>

      <H2>Asian DFIs — specialised participation</H2>
      <P>
        Several Asian development finance institutions participate in Australian renewable
        deals:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>KEXIM (Korea Export Import Bank)</Em> — supports projects with Korean
          equipment content (e.g. some Korean inverter/turbine OEMs)</li>
        <li><Em>KDB (Korea Development Bank)</Em> — selective infrastructure participation</li>
        <li><Em>JBIC (Japan Bank for International Cooperation)</Em> — supports Japanese
          corporate exposure to Australian deals</li>
        <li><Em>NEXI (Nippon Export and Investment Insurance)</Em> — provides credit
          insurance for Japanese lenders</li>
      </ul>
      <P>
        These institutions typically participate alongside commercial lenders, providing
        credit support or partial guarantees rather than directly underwriting deals.
      </P>

      <H2>Chinese commercial banks — limited participation</H2>
      <P>
        Several Chinese commercial banks — Bank of China, China Construction Bank, ICBC,
        Industrial Bank — have offices in Sydney and have participated in some Australian
        renewable deals (typically those with Chinese equipment content such as Goldwind
        turbines or Sungrow inverters). Their participation has been relatively limited and
        has come under heightened ASIC and FIRB scrutiny in 2024-2025.
      </P>

      <H2>Insurance companies — emerging lender class</H2>
      <P>
        Through 2023-2026, Australian and international insurance companies have begun
        participating directly in long-tenor infrastructure debt:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>QBE Insurance</Em> — selective infrastructure debt allocation</li>
        <li><Em>IAG (Insurance Australia Group)</Em> — broader infrastructure allocation</li>
        <li><Em>Munich Re, Swiss Re, Allianz Global Investors</Em> — international insurance
          capital active in some Australian deals</li>
      </ul>
      <P>
        Insurance capital is well-matched to long-tenor renewable debt — long-dated
        liability profile matches long-dated revenue contracts. The category is small today
        but growing.
      </P>

      <H2>Typical syndicate composition</H2>
      <P>
        A typical $400M Australian renewable PF facility is split across 3-6 lenders:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>1-2 Australian Big 4 banks ($100-150M each)</li>
        <li>1 Japanese megabank ($80-120M)</li>
        <li>1-2 European or Asian co-lenders ($30-80M each)</li>
        <li>CEFC for first-of-kind projects ($50-150M)</li>
      </ul>

      <Callout type="key">
        The Australian renewable PF lender market is relatively concentrated but diverse.
        Big 4 banks provide AUD scale; Japanese megabanks provide pricing pressure; European
        banks bring technical depth; CEFC catalyses first-of-kind. Most deals involve a
        syndicate of 3-6 lenders — providing competition during deal origination and
        diversification of relationships for the sponsor. The 2026-2030 outlook (Lesson 11)
        expects continued growth from super funds and insurance companies as direct
        lenders, alongside the existing commercial banks.
      </Callout>

      <Callout type="source">
        Sources: IJGlobal Australian PF deal database 2018-2025 · NAB, CBA, Westpac, ANZ
        renewable energy reports · CEFC annual reports · Japanese megabank Australia
        infrastructure desk disclosures · BloombergNEF
        <em> Lender appetite tracker</em> 2024 · Inframation
        <em> Australian deal lender breakdown</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — DSCR and leverage
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>The DSCR — the single most important PF metric</H2>
      <P>
        <Em>Debt Service Coverage Ratio (DSCR)</Em> is the fundamental metric in project
        finance lending. It expresses, for any given period, the ratio of cash available to
        service debt against actual debt service requirements:
      </P>
      <Callout type="numbers">
        DSCR = (Cash Flow Available for Debt Service, CFADS) ÷ (Debt Service Requirement)
        <br /><br />
        Where:
        <br />
        CFADS = Project revenue − operating expenses − tax (sometimes) − reserve transfers
        <br />
        Debt Service = Principal repayment + Interest payment for the period
        <br /><br />
        A DSCR of 1.30 means CFADS is 1.30x debt service — i.e., CFADS could fall by 23% and
        still cover debt service exactly.
      </Callout>

      <H2>Three DSCR types</H2>
      <P>
        Lenders evaluate three DSCR metrics:
      </P>
      <Table
        emphasizeFirst
        headers={['DSCR', 'When measured', 'Typical lender target']}
        rows={[
          ['Base case DSCR', 'Period-by-period under base case (P50) revenue', 'Min 1.30x; typical 1.35-1.45x'],
          ['Downside / Sensitivity DSCR', 'Period-by-period under stress scenarios (P90, low capacity factor, low MLF, lower prices)', 'Min 1.10x; typical 1.10-1.20x'],
          ['Average / Lifetime DSCR', 'Average across debt tenor', 'Min 1.40x average; typical 1.50-1.70x'],
        ]}
      />
      <P>
        Lenders need all three to clear thresholds before approving a facility size. If the
        base case looks good but downside DSCR drops below 1.10x in any year, the lender
        will require leverage reduction.
      </P>

      <H2>Worked example — a 200 MW wind farm</H2>
      <P>
        A simplified example to illustrate DSCR-based debt sizing:
      </P>
      <Callout type="numbers">
        <strong>Project assumptions:</strong>
        <br />
        Capacity: 200 MW wind farm
        <br />
        P50 capacity factor: 38% → annual generation 666 GWh
        <br />
        PPA strike: $80/MWh (year 1, indexed CPI)
        <br />
        Annual gross revenue (P50): 666 GWh × $80 = ~$53M
        <br />
        Less MLF (assume 0.92): ~$48.8M
        <br />
        Less opex (~$10M/yr): $38.8M
        <br />
        Less tax: ~$0M (using accelerated depreciation offset)
        <br />
        <strong>CFADS (P50): ~$38.8M/year</strong>
        <br /><br />
        <strong>Debt sizing at 1.30x base case DSCR:</strong>
        <br />
        Annual debt service capacity: $38.8M ÷ 1.30 = $29.85M/year
        <br />
        At BBSW + 250 bps (assume 6.5% all-in) and 15-year fully amortising:
        <br />
        Debt service per $1M of debt = $1M × 0.1057 (15-year payment factor at 6.5%) = ~$0.106M/yr
        <br />
        Supportable debt = $29.85M ÷ $0.106M = ~$282M of debt
        <br /><br />
        <strong>Sensitivity check — P90 downside:</strong>
        <br />
        P90 capacity factor: 32% (~16% reduction from P50)
        <br />
        P90 CFADS: ~$38.8M × (32/38) − fixed opex adjustment ≈ ~$31M
        <br />
        P90 DSCR at $282M debt: $31M ÷ $29.85M = 1.04x — fails 1.10x threshold
        <br />
        Therefore must reduce debt: at 1.10x P90 DSCR, max debt = $267M
      </Callout>
      <P>
        On a $450M capex, $267M debt = 59% leverage. Combined with $183M of equity, the
        project is fundable. The DSCR mechanism naturally pushes leverage to a level the
        downside scenario can support — protecting both lenders and equity from
        over-leveraging.
      </P>

      <H2>Sculpted vs flat amortisation</H2>
      <P>
        For a project with seasonal cash flow variation (most renewables), debt amortisation
        is often <Em>sculpted</Em> — meaning principal repayment is shaped to match the
        expected cash flow profile rather than being constant. Examples:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Solar:</Em> peak summer generation; amortisation can be heavier in summer
          months</li>
        <li><Em>Wind:</Em> different seasonal profiles by region; sculpting reflects this</li>
        <li><Em>Hybrid solar+BESS:</Em> firmness reduces seasonal variation; flat amortisation
          more common</li>
      </ul>
      <P>
        Sculpting maintains a constant DSCR target across periods — preventing the situation
        where Q1 DSCR is 1.50 and Q3 DSCR is 1.05 because of seasonal cash flow swings.
      </P>

      <H2>P50, P90, P99 — managing resource uncertainty</H2>
      <P>
        Renewable energy generation forecasts are probabilistic. Independent technical
        advisors (DNV, Sgurr, ArcVera, K2 Management) produce probability-weighted forecasts:
      </P>
      <Table
        emphasizeFirst
        headers={['Percentile', 'Probability of exceedance', 'Use in financial model']}
        rows={[
          ['P50', '50% probability of exceeding', 'Base case for sponsor returns'],
          ['P90', '90% probability of exceeding (i.e., poor year)', 'Lender base case for downside DSCR'],
          ['P99', '99% probability of exceeding (very poor year)', 'Stress test; some lenders require this'],
        ]}
      />
      <P>
        For a wind farm, P50/P90 spread typically 15-25% — meaning the P90 case is 15-25%
        lower than P50. For solar, P50/P90 spread is typically 6-10% (lower variability).
        Lenders price the wider wind spread by sizing debt to P90 downside DSCR.
      </P>

      <H2>Leverage levels — what's achievable</H2>
      <P>
        Leverage achievable depends primarily on revenue certainty:
      </P>
      <Table
        emphasizeFirst
        headers={['Revenue profile', 'Achievable leverage', 'DSCR base case typical']}
        rows={[
          ['Fully contracted (PPA + CIS for full tenor)', '70-80% of capex', '1.30-1.40x'],
          ['Hybrid contracted/merchant (e.g. 10yr PPA, then merchant)', '60-70% of capex', '1.40-1.50x'],
          ['Predominantly merchant (no long-term PPA)', '40-55% of capex', '1.60-2.00x+'],
          ['Pre-FID developer asset', '0-20% (typically all-equity until commitment)', 'N/A — equity funded'],
        ]}
      />

      <H2>Sensitivity testing — what lenders stress</H2>
      <P>
        In addition to P90 generation, lenders typically stress:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Lower capacity factor</Em> — P90 base, P95 stress, P99 catastrophic</li>
        <li><Em>Lower MLF</Em> — declining MLF scenarios (AEMO Connection Lesson 7)</li>
        <li><Em>Lower wholesale prices</Em> — particularly post-PPA expiry</li>
        <li><Em>Higher opex</Em> — typically 5-15% above budget</li>
        <li><Em>Increased curtailment</Em> — 50-100% above operating-history baseline</li>
        <li><Em>Higher interest rates</Em> — if not fully hedged</li>
        <li><Em>Lower availability</Em> — 5-10 percentage points below warranty levels</li>
        <li><Em>One-year complete revenue loss</Em> — to test reserve adequacy</li>
      </ul>

      <H2>What this means for sponsors</H2>
      <P>
        The DSCR mechanism creates predictable but non-trivial trade-offs:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Strong PPA/CFD = high leverage</Em> — fully contracted projects access 70%+
          leverage</li>
        <li><Em>Higher resource certainty = lower DSCR target = more debt</Em> — solar
          typically supports more leverage than wind for the same revenue</li>
        <li><Em>Lower MLF risk = better leverage</Em> — strong-grid sites support more debt
          than remote REZ</li>
        <li><Em>Better OEM warranty = lower opex stress = more debt</Em> — Tier-1 OEMs
          unlock more leverage</li>
      </ul>

      <Callout type="key">
        DSCR is not just a metric — it is the mechanism by which lenders translate uncertain
        renewable energy cash flows into specific debt sizes. Understanding the DSCR
        framework lets sponsors predict their financing capacity before mandate launch. The
        rule of thumb: contracted P90 CFADS divided by 1.30x times the debt-payment factor
        for the chosen tenor and rate gives you supportable senior debt. Everything else
        flows from there.
      </Callout>

      <Callout type="source">
        Sources: King &amp; Wood Mallesons <em>Project Finance Debt Sizing</em> 2024 · CEFC
        <em> Project Finance Best Practice</em> 2023 · Norton Rose Fulbright
        <em> Bankability Analysis</em> · IJGlobal published deal terms 2020-2025 · DNV
        <em> Renewable Energy P50/P90 methodology</em> · ArcVera <em>Wind Resource
        Assessment Standards</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — Risk allocation in renewable PF
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>The seven risk categories in renewable PF</H2>
      <P>
        Renewable project finance distributes risk across seven main categories — each
        managed through different combinations of contracts, insurance, reserves, and
        sponsor support. The principle of project finance is to put each risk with the party
        best able to manage or absorb it.
      </P>
      <Table
        emphasizeFirst
        headers={['Risk category', 'Who typically bears it', 'How it is managed']}
        rows={[
          ['Construction (capex overrun, delay)', 'EPC contractor (via fixed-price contract)', 'Lump-sum turnkey EPC; liquidated damages; performance bonds'],
          ['Resource (wind/solar variability)', 'Lender bears P90 downside; project bears upside', 'P50/P90 sizing; sometimes resource insurance'],
          ['Market (wholesale price, MLF)', 'Mixed — offtaker hedges some; project bears residual', 'PPA + CIS + sometimes financial hedges'],
          ['Technical (equipment performance)', 'OEM bears via warranties; project bears post-warranty', 'OEM warranties; O&M contracts; availability guarantees'],
          ['Regulatory / policy', 'Project (with limited PPA pass-through)', 'Change-in-law clauses; insurance; reserves'],
          ['Counterparty (PPA buyer, EPC contractor)', 'Project (with security from counterparties)', 'Parent guarantees; LCs; performance bonds'],
          ['Force majeure (extreme weather, sabotage)', 'Shared — insurance + project + lender', 'Comprehensive insurance package; specific FM provisions in contracts'],
        ]}
      />

      <H2>Construction risk — the EPC contractor's burden</H2>
      <P>
        Construction risk is the largest single risk in renewable project finance. Cost
        overruns and delays during construction can blow up the entire financial model. The
        primary mitigation is the <Em>Engineering, Procurement and Construction (EPC)
        contract</Em>:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Lump-sum turnkey (LSTK)</Em> — most common form. EPC contractor takes single
          fixed-price responsibility for delivering a working plant. Cost overruns are
          contractor's responsibility.</li>
        <li><Em>Schedule guarantees</Em> — fixed completion date with liquidated damages
          (LDs) for delay, typically 0.5-1.5% of EPC price per week of delay, capped at
          15-25% of contract value</li>
        <li><Em>Performance guarantees</Em> — minimum capacity factor or equivalent power
          curve performance, with LDs for shortfall</li>
        <li><Em>Performance bonds</Em> — typically 10-15% of EPC value posted as bank
          guarantee, paid to project if contractor defaults</li>
        <li><Em>Parent company guarantees</Em> — for EPC contractors whose parent has
          investment-grade credit</li>
      </ul>
      <P>
        Typical EPC contractors in Australian renewables: Vestas, Siemens Gamesa, Goldwind,
        Fulton Hogan, Beon Energy, GE Renewables, BHE Renewables, Decmil, UGL, Acciona,
        SunSet (Solar). EPC pricing varies widely — typically 70-85% of project capex.
      </P>

      <H2>Resource risk — the P50/P90 framework</H2>
      <P>
        Resource risk — that the wind doesn't blow, the sun doesn't shine — is unique to
        renewable energy. It's managed through:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Conservative debt sizing</Em> — lenders use P90 (not P50) for debt sizing,
          giving 15-25% cushion (Lesson 5)</li>
        <li><Em>Resource insurance</Em> — emerging product (Munich Re, Swiss Re); pays
          policyholder if measured generation falls below P90 over a period. Premium
          typically 1-3% of insured revenue.</li>
        <li><Em>Volume hedges</Em> — emerging financial product where bank pays project a
          fixed premium for capped revenue protection</li>
        <li><Em>Diversification</Em> — across multiple projects or technology types</li>
      </ul>

      <H2>Market risk — the role of contracted revenue</H2>
      <P>
        Market risk is managed primarily through long-term revenue contracts:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>PPAs</Em> — fix revenue for the contracted period (10-15 years)</li>
        <li><Em>CIS / LTESA contracts</Em> — provide revenue floor + ceiling (12-20 years)</li>
        <li><Em>Sleeved arrangements</Em> — sometimes combine PPA + CIS for layered hedging</li>
        <li><Em>Merchant exposure</Em> — typically the post-PPA tail; lenders size debt to
          fully amortise within PPA period</li>
      </ul>
      <P>
        MLF (Marginal Loss Factor) risk specifically is now a major focus: lenders
        increasingly require sponsors to maintain MLF reserves or accept lender step-in if
        MLF degrades materially. This is the post-2020 evolution of PF terms.
      </P>

      <H2>Technical risk — OEM warranties and O&amp;M</H2>
      <P>
        Plant performance over 25-30 years involves substantial technical risk. Mitigation:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>OEM warranties</Em> — typically 5-10 years for wind turbines and solar
          inverters, with availability guarantees (96-98%) and power curve performance
          guarantees</li>
        <li><Em>O&amp;M service contracts</Em> — typically 10-15 year service contracts with
          the OEM or specialist O&amp;M provider (Vestas Service, GE Renewable Services,
          ENGIE O&amp;M, Tilt Renewables internal teams)</li>
        <li><Em>Major component reserve accounts</Em> — sponsor-funded reserves for
          gearbox/generator/inverter replacement after warranty expiry</li>
        <li><Em>Insurance</Em> — comprehensive property, business interruption, and
          machinery breakdown</li>
      </ul>
      <P>
        For BESS specifically, augmentation risk (cells degrading over time) is increasingly
        addressed via OEM augmentation guarantees with linked O&amp;M contracts.
      </P>

      <H2>Regulatory and policy risk</H2>
      <P>
        Regulatory risk has been a major project finance concern in Australia post-2014:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>RET shrinkage (2014 Warburton Review) — collapsed LGC market, affected legacy
          deals</li>
        <li>Carbon Price introduction and repeal (2012-2014) — affected coal generators
          (lender base case shifted)</li>
        <li>System strength rule changes (2017, 2021, 2023) — changed connection economics
          for some projects</li>
        <li>Network access reform — affected MLF stability</li>
      </ul>
      <P>
        Mitigation through PF documentation:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Change-in-law clauses</Em> in PPA + CIS — pass-through specific compliance
          costs</li>
        <li><Em>Regulatory event triggers</Em> in lending documents — allow lenders to
          require remediation or accept reduced debt service</li>
        <li><Em>Political risk insurance</Em> — available from international agencies (e.g.
          MIGA, AfDB) but rarely used for stable Australian deals</li>
      </ul>

      <H2>Counterparty risk</H2>
      <P>
        Multiple counterparties create risk:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>PPA buyer</Em> — default would eliminate the project's revenue base</li>
        <li><Em>EPC contractor</Em> — default during construction would require finding a
          replacement contractor (costly + delayed)</li>
        <li><Em>OEM</Em> — default would affect warranty + spare parts</li>
        <li><Em>O&amp;M provider</Em> — default would require finding replacement</li>
      </ul>
      <P>
        Standard mitigation:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Investment-grade counterparty requirement (BBB+ minimum, ideally A-)</li>
        <li>Parent company guarantees from the counterparty's investment-grade parent</li>
        <li>Bank guarantees / letters of credit for the term</li>
        <li>Step-in rights for lenders if counterparty defaults</li>
        <li>Cross-default provisions linking lender + counterparty positions</li>
      </ul>

      <H2>Force majeure</H2>
      <P>
        Force majeure (extreme weather, sabotage, geopolitical disruption) is addressed
        through:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Comprehensive insurance package</Em> — typically $200-500k/yr premium for a
          large project, covering property, business interruption, hail/wind/storm damage</li>
        <li><Em>Force majeure provisions</Em> in all contracts — excusing performance during
          excluded events</li>
        <li><Em>Standing reserves</Em> — typically 6-12 months of debt service in escrow</li>
      </ul>

      <Callout type="key">
        Risk allocation in renewable PF is highly standardised by 2026. The same seven
        categories appear in every deal; the same mitigations are deployed in similar
        proportions; the same counterparty structures emerge. Most variation between deals
        is on the margins — how aggressive the schedule LDs are, how comprehensive the
        warranty bonds, how much equity contingency. Understanding this standard framework
        is essential — both for predicting how a particular deal will be structured and for
        identifying the unusual deals where the framework doesn't fit.
      </Callout>

      <Callout type="source">
        Sources: King &amp; Wood Mallesons <em>Risk Allocation in Renewable Project
        Finance</em> 2024 · Marsh <em>Project Finance Insurance Reports</em> 2024 · Allens
        <em> EPC Contract Practice</em> · Norton Rose Fulbright <em>OEM Warranty Analysis</em> ·
        DNV <em>Renewable Energy Project Risk Framework</em> · IJGlobal post-FID change-in-
        scope analysis 2020-2025.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — The funding waterfall and key covenants
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>The funding waterfall — how cash flows through the project</H2>
      <P>
        After R2, the project's gross revenue flows through a contractually-defined cash
        flow waterfall — a strict priority order for cash usage that lenders enforce through
        the project's bank accounts. The typical waterfall:
      </P>
      <Table
        emphasizeFirst
        headers={['Priority', 'Cash use', 'Description']}
        rows={[
          ['1', 'Operating expenses', 'O&M fees, insurance premiums, land rent, council rates'],
          ['2', 'Tax payments', 'Corporate income tax, GST, payroll'],
          ['3', 'Senior debt interest', 'Quarterly interest payments to senior lenders'],
          ['4', 'Senior debt principal amortisation', 'Quarterly principal repayment per amortisation schedule'],
          ['5', 'Major maintenance reserve', 'Mandatory contribution to MMR (typically $1-3/MWh of generation)'],
          ['6', 'Debt service reserve', 'Maintain 6-12 months of debt service in segregated account'],
          ['7', 'Cash sweep (if applicable)', 'Excess cash applied to senior debt prepayment if DSCR below target'],
          ['8', 'Subordinated debt / mezzanine', 'Payment to mezzanine lenders if any'],
          ['9', 'Working capital allocations', 'Maintain operational cash buffer'],
          ['10', 'Distribution to equity', 'Remaining cash distributed to shareholders'],
        ]}
      />

      <H2>Reserve accounts — the security blanket</H2>
      <P>
        The project maintains several reserve accounts as additional protection for lenders:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Debt Service Reserve (DSRA)</Em> — typically 6-12 months of scheduled debt
          service. Funded at financial close from initial drawdown or sponsor equity.</li>
        <li><Em>Major Maintenance Reserve (MMR)</Em> — accrued during operations to fund
          future major component replacements (gearboxes, inverters, etc.). Funded from
          operating cash, typically $1-3/MWh generated.</li>
        <li><Em>Working Capital Reserve</Em> — typically $5-15M for a major project</li>
        <li><Em>Catastrophic Event Reserve</Em> — sometimes required for high-risk locations
          (cyclone-prone, bushfire zones)</li>
      </ul>
      <P>
        Reserves are held in segregated bank accounts under the control of the security
        trustee. The project cannot access them without specific lender consent.
      </P>

      <H2>Lock-up tests — when distributions stop</H2>
      <P>
        Equity distributions (step 10 in the waterfall) are only permitted if the project
        passes specific tests:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Trailing 12-month DSCR test</Em> — DSCR over the most recent 12 months must
          exceed a threshold (typically 1.20x)</li>
        <li><Em>Forward DSCR test</Em> — projected DSCR over the next 12 months must exceed
          a threshold (typically 1.20x)</li>
        <li><Em>No defaults or unresolved breaches</Em> — must be in compliance with all
          covenants</li>
        <li><Em>Reserves fully funded</Em> — DSRA, MMR at required levels</li>
        <li><Em>No material adverse change</Em> — no events that would impair future debt
          service</li>
      </ul>
      <P>
        If lock-up tests fail, equity distributions are blocked until tests are met. This is
        a meaningful lever for lenders — preventing equity from extracting cash when the
        project is underperforming.
      </P>

      <H2>Covenants — the operational rulebook</H2>
      <P>
        Beyond cash flow waterfall and reserves, the project must comply with a substantial
        set of <Em>covenants</Em> — ongoing operational and financial obligations. The
        typical covenant package:
      </P>
      <Table
        emphasizeFirst
        headers={['Covenant', 'What it requires']}
        rows={[
          ['Financial covenants', 'DSCR thresholds (12-month trailing, projected forward); leverage caps; liquidity minimums'],
          ['Affirmative covenants', 'Maintain insurance; deliver financial statements quarterly; submit operational reports; maintain key contracts'],
          ['Negative covenants', 'No additional debt without consent; no asset sale without consent; no material contract modification without consent; no change of control without consent'],
          ['Information covenants', 'Quarterly financial reporting; annual independent technical advisor report; semi-annual operating report'],
          ['Insurance covenants', 'Maintain comprehensive insurance package; minimum coverage levels; agreed insurers'],
          ['Reporting covenants', 'Audited annual accounts; agreed-upon procedures by lender-appointed auditor'],
        ]}
      />

      <H2>Cure rights and equity injections</H2>
      <P>
        If the project breaches a covenant — say, fails the DSCR test in a poor wind year —
        the lender does not automatically declare default. Standard PF documents include
        <Em> equity cure rights</Em>:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Sponsor may make a one-time equity contribution to fix the breach</li>
        <li>The contribution is typically capped at 1-2 cure events per 3-year rolling period
          and at a specified $ amount</li>
        <li>The contribution becomes subordinated debt (paid back when DSCR recovers)</li>
        <li>If cures are exhausted, the project goes into formal default and lender step-in
          procedures begin</li>
      </ul>
      <P>
        Cure rights are valuable to sponsors because they prevent automatic default during
        temporary cash flow shortfalls. Lenders typically require cures to be paid in
        within 90-120 days of the breach being identified.
      </P>

      <H2>Cash sweep — when excess cash pays down debt</H2>
      <P>
        For some projects, particularly those with merchant exposure, lenders require a
        <Em> cash sweep</Em>: excess cash beyond a defined threshold automatically pays
        down senior debt rather than being distributed to equity. Triggers:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Trailing 12-month DSCR above a target (e.g. 1.50x); sweep below another (e.g.
          1.30x)</li>
        <li>Cash balance above a maintenance threshold</li>
        <li>Approaching debt maturity (sometimes called "trapped cash" in last 12-24 months
          of mini-perm)</li>
      </ul>
      <P>
        Cash sweep is less common in fully-contracted projects (where revenue is stable);
        more common in merchant-tail projects (where excess cash today helps insure against
        weak revenue tomorrow).
      </P>

      <H2>Distribution limits and equity ownership</H2>
      <P>
        Even after passing all lock-up tests, equity distributions are subject to additional
        limits:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Annual distribution cap</Em> — sometimes capped at a specified % of CFADS</li>
        <li><Em>Minimum cash on hand</Em> — must maintain working capital reserve</li>
        <li><Em>Equity tax distributions</Em> — annual tax-related distributions to equity
          holders (to pay their tax on project income) are usually permitted even when
          other distributions are locked</li>
      </ul>

      <H2>Step-in rights — the lender's ultimate tool</H2>
      <P>
        If covenants are breached and cures are exhausted, lenders have <Em>step-in
        rights</Em>:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Lenders can replace the sponsor as decision-maker</li>
        <li>Lenders can replace the EPC contractor, O&amp;M provider, or other service
          providers</li>
        <li>Lenders can sell the project to a new owner</li>
        <li>Lenders can take physical control of the asset</li>
      </ul>
      <P>
        Step-in rights are rarely exercised in practice — sponsors and lenders almost always
        negotiate a restructuring rather than reaching this point. But the threat of
        step-in shapes how sponsors respond to early signs of financial stress.
      </P>

      <Callout type="key">
        The funding waterfall and covenant package are the daily operational reality of
        project finance. They give lenders fine-grained control over cash flow, force
        proactive management of reserves and obligations, and provide an early-warning
        system for financial stress. For sponsors, the system is restrictive but predictable
        — and the structure provides a clear path back to equity distributions after
        recovery from any underperformance.
      </Callout>

      <Callout type="source">
        Sources: King &amp; Wood Mallesons <em>Project Finance Documentation</em> 2024 ·
        Norton Rose Fulbright <em>Covenant Negotiation Practice</em> · Australian Project
        Finance Documentation Group standard templates · IJGlobal published deal terms
        2020-2025 · Allens <em>Step-in Rights Practice Notes</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 8 — Tax structures and accounting
// ============================================================

function Lesson8() {
  return (
    <div>
      <H2>The tax environment for Australian renewables</H2>
      <P>
        Australian tax treatment of renewable energy projects sits within the standard
        corporate tax framework, with several features specifically relevant to large-scale
        capital-intensive infrastructure:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Corporate tax rate: 30% (base rate); 25% for small businesses below $50M turnover
          — most renewable SPVs sit at the 30% rate</li>
        <li>GST: 10% — applied to operations; offset by input tax credits during construction</li>
        <li>Withholding tax: 15% on dividends, 10% on interest payments to non-resident
          shareholders/lenders (subject to tax treaties)</li>
        <li>Stamp duty: state-based; applies to land transfer and (in some states) to
          installation of fixed plant</li>
      </ul>

      <H2>Accelerated depreciation — the largest single tax benefit</H2>
      <P>
        Renewable energy projects benefit from substantial accelerated depreciation under
        Australia's tax depreciation rules:
      </P>
      <Table
        emphasizeFirst
        headers={['Asset class', 'Effective life (years)', 'Diminishing value depreciation rate']}
        rows={[
          ['Wind turbines', '20-25', '~8-10%/yr'],
          ['Solar PV panels', '20-25', '~8-10%/yr'],
          ['BESS systems', '10-15 (cells); 25-30 (BoP)', '~13-20%/yr cells; ~7%/yr BoP'],
          ['Transformers, switchgear', '25-30', '~7%/yr'],
          ['Civil works (foundations, roads)', '40-50', '~4-5%/yr'],
          ['Land', 'No depreciation', 'N/A'],
        ]}
      />
      <P>
        Combined with the <Em>diminishing value method</Em> (front-loaded depreciation),
        renewable projects typically generate substantial tax losses in years 1-5 of
        operation, often eliminating tax payable to year 5-7. This contributes substantially
        to project NPV.
      </P>

      <H2>The instant asset write-off considerations</H2>
      <P>
        Australia's instant asset write-off threshold (allowing immediate full deduction of
        eligible asset purchases below a threshold) generally does not apply to large
        renewable projects — the threshold is far below typical project capex. However:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Small commercial solar (under threshold) benefits substantially</li>
        <li>Some construction-related equipment (utes, small machinery) may qualify</li>
        <li>The temporary full expensing measure (2020-2023) allowed immediate write-off of
          all eligible assets regardless of cost — provided substantial benefit to projects
          taking FID during that period</li>
      </ul>

      <H2>Tax-equity structures — common in the US, rare in Australia</H2>
      <P>
        In the US renewable market, <Em>tax-equity</Em> structures dominate project finance —
        a separate class of investor "buys" the project's tax benefits in exchange for
        contributing equity. This is uncommon in Australia because:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Australian tax law does not include investment tax credits (US "ITCs") or
          production tax credits (US "PTCs") that drive tax-equity structures</li>
        <li>Most Australian super funds and infrastructure funds have low tax burden and
          cannot fully utilise tax losses</li>
        <li>The accelerated depreciation alone is meaningful but doesn't require complex
          tax-equity structures to capture</li>
      </ul>
      <P>
        Some Australian projects use simpler "tax-pass-through" structures where corporate
        sponsors share tax benefits with each other proportional to their ownership shares,
        but this is more standard tax allocation than dedicated tax equity.
      </P>

      <H2>IFRS 9 — hedge accounting for financial instruments</H2>
      <P>
        Australian companies report under Australian Accounting Standards Board (AASB) rules
        — equivalent in substance to International Financial Reporting Standards (IFRS) 9
        for financial instruments. Key implications for renewable projects:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Interest rate swaps</Em> — typically designated as cash flow hedges; gains
          and losses initially recognised in other comprehensive income (OCI), then
          recycled to P&amp;L as the underlying interest is paid</li>
        <li><Em>Virtual PPAs and CIS contracts</Em> — derivatives; can be designated as cash
          flow hedges of expected wholesale revenue (subject to effectiveness testing)</li>
        <li><Em>Currency swaps</Em> — similarly designated as cash flow hedges where used</li>
        <li><Em>Failure of hedge designation</Em> — moves mark-to-market through P&amp;L,
          adding volatility</li>
      </ul>
      <P>
        Hedge accounting compliance is substantially more complex than spot accounting and
        typically requires dedicated treasury and audit attention. Project SPVs often hire
        specialist hedge accounting advisors (KPMG, Deloitte, EY, PwC) for ongoing
        compliance.
      </P>

      <H2>Stamp duty and state-based considerations</H2>
      <P>
        Stamp duty rules vary by state and can be a meaningful cost:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>NSW</Em> — stamp duty on land transfer (typically 4-5% of land value); fixed
          plant stamp duty was abolished 2016</li>
        <li><Em>VIC</Em> — stamp duty on land transfer (5.5% top rate); plant stamp duty was
          progressively reformed 2018-2022</li>
        <li><Em>QLD</Em> — similar to other states; some specific renewable energy
          exemptions in operation</li>
        <li><Em>SA</Em> — stamp duty on land transfer; some renewable energy incentives</li>
        <li><Em>WA</Em> — stamp duty on land transfer; complex provisions for fixed plant</li>
      </ul>
      <P>
        Sponsors typically negotiate land arrangements (leases vs purchase, ownership
        structures) partly to manage stamp duty exposure. For a major project, stamp duty
        can be $5-25M.
      </P>

      <H2>Transfer pricing and related-party considerations</H2>
      <P>
        For projects with international sponsors or counterparties:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Related-party transactions (intercompany loans, services, equipment supply) must
          be at arm's-length pricing — supported by transfer pricing documentation</li>
        <li>ATO scrutiny of transfer pricing has increased substantially post-2018; renewable
          project structures with significant international components are routinely audited</li>
        <li>FIRB approval requirements apply for foreign-acquired stakes — particularly
          significant for major projects with non-Australian sponsors</li>
      </ul>

      <H2>The CIS contract accounting question</H2>
      <P>
        CIS revenue floor + ceiling contracts present specific accounting challenges:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Mark-to-market on the CFD position can create P&amp;L volatility</li>
        <li>Hedge designation against future wholesale revenue is possible but requires
          substantial documentation</li>
        <li>The contingent nature of the floor (CFADS guaranteed only when wholesale prices
          fall below floor) creates timing differences</li>
        <li>The ceiling element (proceeds returned when wholesale exceeds ceiling) is
          mark-to-market until settled</li>
      </ul>

      <H2>What this means for project economics</H2>
      <P>
        The aggregate tax and accounting framework typically:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Reduces years 1-7 tax payable substantially via accelerated depreciation</li>
        <li>Adds 2-4% to overall project IRR through deferred taxation</li>
        <li>Adds complexity in years 5-10 as depreciation tapers</li>
        <li>Imposes ongoing hedge accounting compliance cost ($200-500k/yr for a major
          project)</li>
        <li>Restricts some structuring optionality (state stamp duty, FIRB)</li>
      </ul>

      <Callout type="key">
        Tax and accounting are not the primary value drivers of an Australian renewable
        project, but they materially affect timing of cash flows and the operational
        complexity of running the SPV. The most significant single benefit is accelerated
        depreciation, which typically eliminates tax payable for the first 5-7 years.
        Beyond that, the framework adds complexity without adding much value — explaining
        why most Australian projects use relatively standard tax structures rather than the
        elaborate tax-equity structures common in the US.
      </Callout>

      <Callout type="source">
        Sources: Australian Taxation Office (ATO) <em>Tax Treatment of Renewable Energy</em>
        2024 · AASB Accounting Standards (AASB 9, AASB 16, AASB 115) · King &amp; Wood
        Mallesons <em>Renewable Energy Tax</em> 2024 · KPMG <em>Renewable Energy Finance
        Tax</em> 2024 · Deloitte <em>Project Finance Accounting</em> · PwC <em>Energy &amp;
        Utilities Tax</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 9 — How CIS and LTESA transform bankability
// ============================================================

function Lesson9() {
  return (
    <div>
      <H2>The bankability transformation</H2>
      <P>
        Before 2022, the question facing every Australian renewable developer was: <Em>can
        I find a corporate PPA that gives me enough revenue certainty to attract project
        finance?</Em> Since 2022, with the Capacity Investment Scheme (CIS) and NSW LTESA
        scaling, the question has shifted to: <Em>can I stack my CIS contract with corporate
        PPA upside to optimise both bankability and total returns?</Em> The sovereign-backed
        revenue mechanisms have fundamentally changed the project finance landscape.
      </P>

      <H2>How CIS changes the bankability math</H2>
      <P>
        A CIS contract provides a revenue floor and ceiling. From a project finance
        perspective:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Floor protects downside</Em> — if wholesale prices fall below the CIS floor
          strike, the federal government pays the difference. The project's downside revenue
          is therefore the floor strike, not the merchant price.</li>
        <li><Em>Ceiling caps upside</Em> — if wholesale prices rise above the CIS ceiling
          strike, the project pays the difference back to government. The project's upside
          revenue is therefore the ceiling strike, not the merchant price.</li>
        <li><Em>Wholesale prices between floor and ceiling</Em> — the project earns merchant
          (the actual wholesale price)</li>
      </ul>
      <P>
        For lender DSCR analysis, this transforms the cash flow profile:
      </P>
      <Callout type="numbers">
        <strong>Pre-CIS (no contract):</strong>
        <br />
        P50 revenue: $50/MWh × 666 GWh × MLF = $30M
        <br />
        P90 revenue: $35/MWh × 666 GWh × MLF = $21M (lower price + slightly lower volume)
        <br />
        DSCR-sized debt: based on P90 — supports ~$200M
        <br /><br />
        <strong>With CIS floor at $55/MWh:</strong>
        <br />
        P50 revenue: $55/MWh (or merchant if higher) × 666 GWh × MLF = $33M
        <br />
        P90 revenue: $55/MWh × 600 GWh × MLF = $30M (volume reduced but price floored)
        <br />
        DSCR-sized debt: based on P90 — supports ~$280M (40% more debt)
        <br /><br />
        The CIS floor transforms the project's debt capacity by stabilising P90 revenue.
      </Callout>

      <H2>The CIS contract as financial instrument — IFRS 9 treatment</H2>
      <P>
        For accounting purposes, a CIS contract is a complex financial derivative:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>It is a <Em>two-way Contract for Difference</Em> with payoffs in both directions</li>
        <li>It can be decomposed as a put option (floor) sold to the proponent + a call
          option (ceiling) sold to the government</li>
        <li>Under IFRS 9, it must be recognised at fair value with mark-to-market through
          P&amp;L — unless designated as a cash flow hedge</li>
        <li>Hedge designation against future wholesale revenue is possible but requires
          substantial effectiveness testing</li>
        <li>Most sponsors take the route of hedge designation to avoid P&amp;L volatility</li>
      </ul>

      <H2>The bankability boost — quantified</H2>
      <P>
        Industry analysis suggests CIS contracts transform bankability metrics as follows:
      </P>
      <Table
        emphasizeFirst
        headers={['Metric', 'Pre-CIS (merchant exposure)', 'With CIS contract', 'Improvement']}
        rows={[
          ['Maximum leverage', '50-55%', '70-75%', '+15-20 pp'],
          ['DSCR P90 downside', '~1.05x', '~1.25x', '+20 bps'],
          ['Debt margin', 'BBSW + 300-400 bps', 'BBSW + 180-220 bps', '−100-150 bps'],
          ['Achievable debt size for $400M project', '~$200M', '~$280-300M', '+40-50%'],
          ['Cost of equity', '13-15%', '9-11%', '−300-400 bps'],
        ]}
      />

      <H2>LTESA — the long-duration variant</H2>
      <P>
        The NSW LTESA scheme is structurally similar to CIS but with longer tenor (20 years
        vs CIS 12-15 years). For long-duration storage projects (8+ hour BESS, pumped hydro)
        and large generation projects, LTESA contracts:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Provide longer revenue underwriting than typical corporate PPAs</li>
        <li>Allow debt to be sized at lower DSCR (the longer tenor reduces refinancing risk)</li>
        <li>Enable longer-tenor debt (sometimes 15-18 years term vs typical 4-7 mini-perm)</li>
      </ul>

      <H2>Stacking CIS + corporate PPA — the optimal structure</H2>
      <P>
        The most efficient capital structures combine sovereign and corporate contracts:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>CIS floor</Em> — provides the bankability foundation; covers downside revenue</li>
        <li><Em>Corporate PPA</Em> — covers a portion of the upside between floor and ceiling;
          typically a Virtual PPA with corporate buyer paying a "topping" payment</li>
        <li><Em>Merchant exposure</Em> — the residual; the project benefits from upside above
          the corporate PPA strike</li>
      </ul>
      <P>
        Worked example for a 200 MW solar+BESS hybrid:
      </P>
      <Table
        emphasizeFirst
        headers={['Price band', 'Source of revenue', 'Project receives']}
        rows={[
          ['$0/MWh (negative)', 'CIS floor', '$55/MWh from CIS'],
          ['$0-55/MWh', 'CIS floor (above merchant)', '$55/MWh from merchant + CIS top-up'],
          ['$55-90/MWh', 'Merchant + CIS (some) + Corporate PPA top-up', '~$80/MWh effective'],
          ['$90-120/MWh', 'Merchant', '$90-120/MWh from merchant'],
          ['$120/MWh+', 'CIS ceiling caps at $120', '$120/MWh capped'],
        ]}
      />
      <P>
        The blended effective price across realistic spot price distributions typically lands
        at $75-85/MWh — providing bankability anchored by CIS while preserving corporate
        offtake premium on a meaningful share of generation.
      </P>

      <H2>What CIS does NOT solve</H2>
      <P>
        CIS contracts are powerful but don't eliminate all project finance risks:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Construction risk</Em> — still managed via EPC contracts; CIS doesn't pay for
          construction overruns or delays</li>
        <li><Em>Resource risk</Em> — CIS pays per MWh delivered; if generation is lower than
          P50, revenue is proportionally lower (even with floor in place)</li>
        <li><Em>Curtailment risk</Em> — technical curtailment is typically deemed delivered
          for PPA purposes; CIS may have different deemed-generation rules</li>
        <li><Em>MLF degradation</Em> — typically the project's risk; CIS pays at the
          regional reference price, not at the connection point</li>
        <li><Em>Counterparty risk</Em> — federal Government has highest possible credit, but
          political risk of program changes remains</li>
      </ul>

      <H2>Political risk and refinancing</H2>
      <P>
        Although CIS contracts are legally binding, lenders consider some residual policy
        risk:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>A future Coalition government could reduce CIS scale (new rounds T7+ affected)</li>
        <li>Existing CIS contracts are protected, but program direction may change</li>
        <li>Lender DSCR analysis sometimes adds a small risk margin for this policy
          uncertainty</li>
      </ul>
      <P>
        For refinancing purposes, existing CIS contracts continue to provide bankability
        through their term. Sponsors who hold CIS contracts have substantial flexibility for
        future refinancing.
      </P>

      <H2>The market shift since 2022</H2>
      <P>
        CIS has fundamentally changed Australian renewable PF since 2022:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Most new utility-scale projects since T1 (2023) have CIS contracts</li>
        <li>Average debt margins on contracted projects have declined 50-100 bps</li>
        <li>Average leverage has increased 10-15 pp on contracted projects</li>
        <li>Corporate PPA volume has plateaued as sovereign-backed offtake reduces
          incremental demand for corporate buyers</li>
        <li>The combined CIS + LTESA pipeline of 25-30 GW provides bankable capacity for
          the rest of the decade</li>
      </ul>

      <Callout type="key">
        CIS and LTESA are the single most consequential project finance development in
        Australian renewables since the introduction of project finance itself. They
        transform the bankability of contracted projects, lower the cost of capital, increase
        achievable leverage, and effectively underwrite the federal 32 GW capacity target.
        Project teams who can secure a CIS contract have substantially better project
        economics than those who can't; project teams who can stack CIS with corporate PPA
        have the optimal structure for the late 2020s.
      </Callout>

      <Callout type="source">
        Sources: Capacity Investment Scheme contract documents · NSW LTESA contract framework ·
        DCCEEW CIS contract design papers · CEFC <em>CIS bankability analysis</em> 2024 ·
        BloombergNEF <em>CIS market impact</em> 2024 · King &amp; Wood Mallesons
        <em> CIS contract structure</em> 2024 · IFRS 9 hedge accounting standards.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 10 — Refinancing
// ============================================================

function Lesson10() {
  return (
    <div>
      <H2>The mini-perm refinancing imperative</H2>
      <P>
        Most Australian renewable project finance debt is structured as a <Em>mini-perm</Em>
        — short hard tenor (4-7 years) with a longer amortisation profile (12-15 years). At
        the end of the hard tenor, the project must <Em>refinance</Em>: replace the maturing
        debt with new debt. This creates a recurring refinancing event roughly every 5-7
        years over the project's life.
      </P>
      <P>
        Refinancing is not optional — it's a contractual requirement. If the project cannot
        refinance, lenders may either:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Extend the existing facility (typically at higher pricing)</li>
        <li>Declare default on the maturing facility</li>
        <li>Take step-in rights and operate or sell the project</li>
      </ul>
      <P>
        In practice, refinancing almost always succeeds — but the terms and pricing of the
        new facility depend heavily on the project's performance and broader market
        conditions at the refinancing date.
      </P>

      <H2>Why mini-perm dominates</H2>
      <P>
        Three reasons why Australian lenders prefer mini-perm over true 15-year term debt:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Lender pricing certainty</Em> — Australian banks price renewable PF debt
          based on 4-7 year horizon; longer-tenor debt requires substantially higher pricing
          margins</li>
        <li><Em>Repricing optionality</Em> — at refinancing, lender pricing can adjust to
          current market conditions (BBSW spreads, lender risk appetite)</li>
        <li><Em>Credit quality reassessment</Em> — lenders can require improved metrics or
          equity injections at refinancing if the project has underperformed</li>
      </ul>
      <P>
        Some long-tenor lenders (Japanese megabanks especially) do offer true 12-15 year
        term debt for very strong projects, but this represents perhaps 15-25% of
        Australian renewable PF deals.
      </P>

      <H2>When refinancing happens</H2>
      <P>
        For a typical project with 5-year mini-perm:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'Timing', 'Key activities']}
        rows={[
          ['FID + financial close', 'Year 0', 'Initial mini-perm signed'],
          ['Construction', 'Year 0-2', 'Drawdown phase'],
          ['Initial operation (R1/R2)', 'Year 2-3', 'Begin amortisation; performance monitoring'],
          ['Refinancing preparation', 'Year 3-4', 'Sponsors engage advisors; refresh financial model'],
          ['Refinancing mandate launch', 'Year 4', 'Approach lenders; receive new terms'],
          ['Refinancing financial close', 'Year 4.5-5', 'Replacement facility signed; original facility repaid'],
          ['Next mini-perm cycle', 'Year 5-10', 'Same cycle repeats'],
        ]}
      />

      <H2>What refinancing involves</H2>
      <P>
        Refinancing is functionally similar to original financial close but with several
        important differences:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Less construction risk</Em> — the project is operational; no completion risk</li>
        <li><Em>Operating track record</Em> — lenders have actual generation data to validate
          the financial model</li>
        <li><Em>Updated risk profile</Em> — MLF, curtailment, technical performance all
          re-assessed</li>
        <li><Em>Updated market conditions</Em> — current BBSW spreads, lender appetite,
          regulatory environment</li>
        <li><Em>Updated leverage analysis</Em> — new DSCR based on actual + projected
          performance</li>
      </ul>
      <P>
        Sponsors typically engage advisors (legal counsel, financial advisor, technical
        advisor) for the refinancing — a typical advisor cost of $2-5M, lower than original
        financial close ($5-15M) because much of the documentation is reusable.
      </P>

      <H2>The pricing dynamics at refinancing</H2>
      <P>
        At refinancing, debt pricing can move in either direction depending on:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project performance</Em> — strong operational performance can reduce
          margins; weak performance increases them</li>
        <li><Em>Market BBSW spreads</Em> — overall credit market conditions</li>
        <li><Em>Lender capacity</Em> — if certain lenders are exiting Australian renewables
          (or entering), this changes margins</li>
        <li><Em>Remaining contract life</Em> — projects with long-dated PPAs or CIS contracts
          remaining receive better pricing than those approaching contract expiry</li>
        <li><Em>Refinancing cohort</Em> — when many projects refinance simultaneously, lender
          capacity can be stretched</li>
      </ul>

      <H2>The "soft tenor" extension</H2>
      <P>
        Many mini-perm facilities include a <Em>soft tenor extension</Em> — at end of hard
        tenor (year 5), if refinancing is delayed, the existing facility automatically
        extends to a soft tenor end date (typically year 7) under specified terms:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Higher margin during the soft tenor extension (typically +100-200 bps)</li>
        <li>Mandatory cash sweep — all excess cash to debt prepayment</li>
        <li>Suspension of equity distributions</li>
        <li>Heightened reporting requirements</li>
      </ul>
      <P>
        Soft tenor extension is essentially a "punishment" mechanism — it gives sponsors a
        bit more time but at material economic cost. Most sponsors aim to refinance well
        before hard tenor expiry to avoid the soft tenor penalties.
      </P>

      <H2>What can go wrong at refinancing</H2>
      <P>
        Refinancing risks include:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Lender market disruption</Em> — major banking crises (e.g. 2008-2009 GFC,
          2020 COVID) can shrink available lender capacity</li>
        <li><Em>Project underperformance</Em> — if project has missed P90 generation,
          incurred high curtailment, or experienced equipment problems, refinancing may
          require equity injections to maintain DSCR</li>
        <li><Em>Regulatory changes</Em> — if RET, CIS, or other underwriting mechanisms have
          materially changed, project economics may be impaired</li>
        <li><Em>MLF degradation</Em> — substantial MLF erosion can reduce achievable leverage
          at refinancing</li>
        <li><Em>Counterparty deterioration</Em> — if a PPA buyer's credit rating has dropped,
          this affects refinancing terms</li>
      </ul>

      <H2>Equity injection at refinancing</H2>
      <P>
        If refinancing terms are worse than expected, sponsors may need to inject additional
        equity:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Cure equity</Em> — small injection to repay underperforming portions of the
          original facility (typically $5-50M)</li>
        <li><Em>Refinancing equity</Em> — meaningful injection to maintain leverage targets
          (typically $20-100M)</li>
        <li><Em>Restructuring equity</Em> — large injection to complete a partial debt
          replacement with equity (rare; only in distressed situations)</li>
      </ul>

      <H2>The refinancing wave 2024-2030</H2>
      <P>
        Projects that took FID 2018-2020 are reaching refinancing in 2024-2026. The pipeline:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>2024: ~$10-15B of Australian renewable debt refinancing — first major wave</li>
        <li>2025: ~$15-20B refinancing — continued wave</li>
        <li>2026-2028: ~$25-40B refinancing — peak years as 2020-2022 FID cohort matures</li>
        <li>2029-2030: refinancing volume continues at high levels as 2022+ projects (with
          CIS contracts) reach first refinancing</li>
      </ul>
      <P>
        This refinancing wave represents both opportunity (for lenders to win new business)
        and risk (for sponsors who may face pricing changes). Lenders are gearing up — most
        Big 4 banks have grown their renewable PF teams by 30-50% since 2022 in anticipation.
      </P>

      <Callout type="key">
        Refinancing is a recurring rather than one-time event for Australian renewable
        projects. Most projects will refinance 2-4 times over their operational life. The
        mini-perm structure provides flexibility for both sponsors and lenders but creates
        recurring market exposure. Project teams should plan for refinancing from FID
        onwards — building strong operational records, maintaining lender relationships,
        and preserving sponsor balance sheet capacity for potential cure equity. The 2026-
        2028 refinancing wave will be the largest test of Australian renewable PF
        infrastructure to date.
      </Callout>

      <Callout type="source">
        Sources: King &amp; Wood Mallesons <em>Project Finance Refinancing</em> 2024 ·
        IJGlobal Australian refinancing deal database 2018-2025 · NAB / CBA / Westpac / ANZ
        renewable refinancing volumes · Inframation <em>Refinancing pipeline tracker</em>
        2024 · CEFC <em>Refinancing dynamics</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 11 — Recent deals and the 2026-2030 lender outlook
// ============================================================

function Lesson11() {
  return (
    <div>
      <H2>Recent landmark deals — what they reveal</H2>
      <P>
        Several recent Australian renewable PF transactions illustrate how the market has
        evolved. This lesson walks through five representative deals — what they did, who
        lent, what terms they achieved, and what they tell us about market direction.
      </P>

      <H2>Murra Warra Wind Farm Stage 1 (2018-2019)</H2>
      <P>
        RES Australia's Murra Warra Wind Farm Stage 1 (226 MW, Victoria) is one of the most
        documented early corporate PPA + project finance combinations. Key facts:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project size</Em>: ~$430M total capex</li>
        <li><Em>Debt</Em>: ~$280M senior debt; sponsors Macquarie GIG + RES</li>
        <li><Em>Lenders</Em>: NAB, MUFG, Westpac, Mizuho, ANZ syndicate (4 Big 4 banks +
          Japanese megabank)</li>
        <li><Em>PPA underpinning</Em>: Telstra 11-year corporate PPA for ~50% of generation</li>
        <li><Em>Significance</Em>: One of the first major Australian PF deals underwritten by
          a corporate PPA (not gentailer)</li>
      </ul>
      <P>
        Murra Warra demonstrated that the new corporate PPA model could support large-scale
        PF — establishing the template for the 2018-2022 corporate PPA boom.
      </P>

      <H2>Stockyard Hill Wind Farm (2019)</H2>
      <P>
        Goldwind Australia's Stockyard Hill Wind Farm (530 MW, Victoria) was at the time of
        commissioning the largest wind farm in the southern hemisphere. Key facts:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project size</Em>: ~$700M total capex</li>
        <li><Em>Debt</Em>: ~$500M senior debt (~71% leverage)</li>
        <li><Em>Lenders</Em>: MUFG, NAB, Mizuho, ING, plus others</li>
        <li><Em>PPA underpinning</Em>: Origin Energy 530 MW gentailer PPA for ~95% of
          generation</li>
        <li><Em>Significance</Em>: Demonstrated very large-scale project finance with
          gentailer rather than corporate offtake</li>
      </ul>

      <H2>Coopers Gap Wind Farm (2018)</H2>
      <P>
        AGL's Coopers Gap Wind Farm (453 MW, Queensland) was financed largely on AGL's
        balance sheet through the Powering Australian Renewables Fund (PARF) — a different
        model from external project finance:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project size</Em>: ~$850M total capex</li>
        <li><Em>Structure</Em>: AGL + Powering Australian Renewables Fund (QIC, ARENA, Future
          Fund); not external PF in the classical sense</li>
        <li><Em>Lenders</Em>: Internal AGL + co-investor capital; some external debt for the
          structure</li>
        <li><Em>Significance</Em>: Shows how gentailer balance sheets continue to fund some
          major projects alongside external PF</li>
      </ul>

      <H2>Eraring BESS (2023-2025)</H2>
      <P>
        Origin Energy's Eraring BESS (700 MW / 2,800 MWh, NSW) is one of the largest
        battery projects in the NEM. Financing characteristics:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project size</Em>: ~$1.6B total capex (across both stages)</li>
        <li><Em>Structure</Em>: Stage 1 financed predominantly on Origin's balance sheet;
          Stage 2 partially with external co-investors</li>
        <li><Em>Lenders</Em>: Major Big 4 syndicate + CEFC support; international participation</li>
        <li><Em>PPA / CIS</Em>: Combination of merchant exposure, Origin gentailer hedging,
          and partial CIS Tender 3 contract for capacity payments</li>
        <li><Em>Significance</Em>: Established the financing template for very large BESS
          projects with complex revenue stacks (arbitrage + FCAS + capacity)</li>
      </ul>

      <H2>Waratah Super Battery (2023-2024)</H2>
      <P>
        Akaysha Energy / EnergyCo's Waratah Super Battery (850 MW / 1,680 MWh, NSW) is the
        flagship NSW grid-forming BESS:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project size</Em>: ~$1.8B total capex</li>
        <li><Em>Structure</Em>: PF with substantial CEFC participation; international
          co-investment</li>
        <li><Em>Lenders</Em>: CEFC + Big 4 + international syndicate</li>
        <li><Em>Underwriting</Em>: NSW state government underwriting for grid services
          component (System Integrity Protection Scheme); private offtake for arbitrage
          revenue</li>
        <li><Em>Significance</Em>: First major grid-forming BESS in Australia; demonstrated
          PF appetite for novel-technology BESS at scale</li>
      </ul>

      <H2>The 2026-2030 lender outlook</H2>
      <P>
        Looking forward, several trends are likely to define Australian renewable PF lending
        through 2030:
      </P>

      <H2>Trend 1 — Continued Big 4 dominance with super fund expansion</H2>
      <P>
        Australian Big 4 banks will continue to dominate the senior debt market through 2030,
        but Australian super funds are likely to take a larger share through:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Direct infrastructure debt allocation (already growing 30-40%/yr)</li>
        <li>Partnership structures with banks (co-lending; risk-sharing)</li>
        <li>Long-tenor debt provision (super funds can hold 15-20 year debt where banks
          prefer 5-7 year mini-perm)</li>
      </ul>
      <P>
        Industry analysts forecast super fund direct lending to renewables will grow from
        ~$5B today to $25-40B by 2030 — making super funds a meaningful debt provider on
        par with Japanese megabanks.
      </P>

      <H2>Trend 2 — CIS-backed deals shape lender appetite</H2>
      <P>
        As CIS contracts become the dominant offtake mechanism, lender risk appetite is
        shifting:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>CIS-contracted projects achieve substantially better terms than non-contracted</li>
        <li>Lenders are increasingly comfortable funding larger ticket sizes for
          CIS-contracted deals ($300-500M+ single-lender)</li>
        <li>The federal government's role as effective counterparty makes CIS-contracted
          projects nearly as bankable as government bonds</li>
      </ul>

      <H2>Trend 3 — Refinancing wave creates lender opportunity</H2>
      <P>
        The 2024-2028 refinancing wave (~$60-80B of renewable debt maturing) is the largest
        single near-term lending opportunity in Australia. Lenders are positioning by:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Expanding renewable PF teams (Big 4 banks have grown teams 30-50% since 2022)</li>
        <li>Developing sustainability-linked lending products</li>
        <li>Building relationships with refinancing-stage sponsors</li>
      </ul>

      <H2>Trend 4 — Increasing complexity</H2>
      <P>
        Lender deals are getting more complex:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Hybrid solar+BESS structures require more sophisticated cash flow modelling</li>
        <li>System strength services and grid-forming BESS represent new revenue streams</li>
        <li>24/7 hourly matching adds layers to PPA structure</li>
        <li>Sovereign-backed contract treatment requires hedge accounting expertise</li>
      </ul>
      <P>
        Lenders that build technical expertise across these dimensions will capture
        disproportionate market share; lenders that retreat to simpler deals will lose
        market relevance.
      </P>

      <H2>Trend 5 — International capital normalisation</H2>
      <P>
        International lender participation (Japanese, European, Asian) is likely to remain
        meaningful but at slightly reduced share through 2030:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Australian Big 4 capacity has grown — reducing need for international capital</li>
        <li>Super fund direct lending substitutes for some international participation</li>
        <li>International banks may focus on specific technology niches (e.g. European
          banks on offshore wind, Japanese on long-tenor)</li>
      </ul>

      <H2>The 2030 vision</H2>
      <P>
        By 2030, Australian renewable project finance is likely to look like this:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Total renewable debt outstanding: $80-120B (vs $40-50B today)</li>
        <li>Annual new lending volume: $20-30B</li>
        <li>CIS-contracted share of new deals: ~60-70%</li>
        <li>Big 4 banks: ~40% of senior debt</li>
        <li>Super funds direct: ~25-30%</li>
        <li>Japanese megabanks: ~15-20%</li>
        <li>European + other international: ~10-15%</li>
        <li>CEFC + other government: ~5-10%</li>
      </ul>

      <Callout type="key">
        Australian renewable project finance is mature, well-functioning, and structurally
        ready to support the 32 GW federal target through 2030 and beyond. The lender market
        is diverse, the contract structures are standardised, and the CIS / LTESA framework
        underwrites bankability at scale. The next decade will see continued growth in
        market size, evolution of the participant mix (super funds growing, gentailer
        balance sheets stable), and increasing complexity in deal structures (hybrid, 24/7
        matching, grid-forming BESS). Project teams that understand this evolution will
        deliver projects efficiently; teams that don't will face avoidable financing
        friction. This module — and the eight modules preceding it — provide the
        analytical framework for navigating the modern Australian renewable energy market.
      </Callout>

      <Callout type="source">
        Sources: IJGlobal Australian PF deal database 2018-2025 · RES Australia Murra Warra
        public disclosures · Goldwind Australia Stockyard Hill disclosures · AGL Coopers Gap +
        PARF reports · Origin Energy Eraring BESS reports · EnergyCo Waratah Super Battery
        materials · BloombergNEF <em>Australia Renewable Finance Outlook</em> 2024-2025 ·
        CEFC annual reports 2018-2025.
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
          <span className="text-3xl" aria-hidden>💰</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
            ✅ Available
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight"
          style={{ borderLeft: '4px solid #ec4899', paddingLeft: 12, marginLeft: -12 }}>
          Project Financing of Renewables
        </h1>
        <p className="text-base italic text-[var(--color-text-muted)]">
          How a wind farm or BESS actually gets built — debt, equity, DSCR, leverage, and the lender market.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          A project finance lens on the renewable build-out. This 11-lesson module starts from the
          basic Special Purpose Vehicle structure and walks through the equity stack (sponsors,
          infra funds, super funds, CEFC), the debt stack (senior, mezzanine, mini-perm vs term),
          the Australian lender market (Big 4, Japanese megabanks, European DFIs, CEFC), DSCR-based
          debt sizing math with worked examples, the seven-way risk allocation framework, the
          funding waterfall and key covenants, tax and accounting treatment, how CIS and LTESA
          transform bankability, refinancing dynamics, and the 2026-2030 lender outlook. Designed
          to be readable by a board member but technical enough for a finance professional.
        </p>
      </div>

      <div className="space-y-3">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          return (
            <Link key={l.id} to={`/learn/project-financing/${l.id}`}
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
            <span className="text-[var(--color-text-muted)] ml-2">— CIS/LTESA contract status (the modern bankability anchor)</span>
          </li>
          <li>
            <Link to="/intelligence/developer-scores" className="text-[var(--color-primary)] hover:underline">
              Developer Scores →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— who actually builds and finances Australian renewables</span>
          </li>
          <li>
            <Link to="/learn/cis-ltesa-bidding" className="text-[var(--color-primary)] hover:underline">
              CIS &amp; LTESA Bidding module →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— deep dive on the federal/state revenue underwriting</span>
          </li>
          <li>
            <Link to="/learn/ppas" className="text-[var(--color-primary)] hover:underline">
              PPAs module →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— the offtake contracts that sit on top of project finance</span>
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
        <Link to="/learn/project-financing" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← Project Financing of Renewables
        </Link>
        <span className="text-[var(--color-text-muted)]">Lesson {lesson.number} of {LESSONS.length} · {lesson.readingTime}</span>
      </div>

      <div className="space-y-1 pb-4 border-b border-[var(--color-border)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Lesson {lesson.number}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight">{lesson.title}</h1>
        <p className="text-base italic text-[var(--color-text-muted)]">{lesson.subtitle}</p>
      </div>

      <article className="text-[15px] text-[var(--color-text-muted)]">
        {lesson.id === 'spv'         && <Lesson1 />}
        {lesson.id === 'equity'      && <Lesson2 />}
        {lesson.id === 'debt'        && <Lesson3 />}
        {lesson.id === 'lenders'     && <Lesson4 />}
        {lesson.id === 'dscr'        && <Lesson5 />}
        {lesson.id === 'risk'        && <Lesson6 />}
        {lesson.id === 'waterfall'   && <Lesson7 />}
        {lesson.id === 'tax'         && <Lesson8 />}
        {lesson.id === 'cis-impact'  && <Lesson9 />}
        {lesson.id === 'refinancing' && <Lesson10 />}
        {lesson.id === 'outlook'     && <Lesson11 />}
      </article>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/project-financing/${prev.id}`)}
            className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/project-financing/${next.id}`) }}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-colors">
            {progress.has(lesson.id) ? 'Continue' : 'Mark read & continue'} → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/project-financing') }}
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

export default function ProjectFinancingModule() {
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
        <Link to="/learn/project-financing" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to module index
        </Link>
      </div>
    )
  }

  return <LessonView lesson={lesson} progress={progress} onComplete={onComplete} />
}
