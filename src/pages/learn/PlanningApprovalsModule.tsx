/**
 * Planning Approval Pathways for Renewable Projects — AURES Learning Module
 *
 * 11 lessons covering the state-by-state planning pathway, the federal EPBC
 * Act, the EIS process, First Nations consultation, planning timelines,
 * recent case studies, and the acceleration levers (EnergyCo NSW, IDA,
 * VicGrid, WA Green Energy Approvals Initiative).
 */
import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-planning-approvals-progress'

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
  { id: 'two-track',          number: 1,  title: 'The two-track planning system — state + federal',         subtitle: 'Why every major renewable project sits inside both EPBC and state planning', readingTime: '11 min' },
  { id: 'nsw',                number: 2,  title: 'NSW — SSD pathway and the Independent Planning Commission', subtitle: 'EP&A Act 1979, the IPC, EnergyCo and recent IPC determinations',           readingTime: '14 min' },
  { id: 'vic',                number: 3,  title: 'Victoria — Planning & Environment Act and the DFP',         subtitle: 'From the VC34 wind moratorium to the Development Facilitation Program',   readingTime: '12 min' },
  { id: 'qld',                number: 4,  title: 'Queensland — the call-in power and recent decisions',       subtitle: 'Coordinator-General, SARA, and the politics of called-in projects',       readingTime: '12 min' },
  { id: 'sa-wa',              number: 5,  title: 'SA and WA — leaner systems, separate journeys',             subtitle: 'SA PDI Act bipartisanship + WA Green Energy Approvals Initiative',        readingTime: '11 min' },
  { id: 'eis',                number: 6,  title: 'Inside an EIS — what an Environmental Impact Statement actually contains', subtitle: 'Specialist studies, public exhibition, Response to Submissions',  readingTime: '13 min' },
  { id: 'epbc',               number: 7,  title: 'EPBC Act 1999 — the federal environmental approval',        subtitle: 'MNES, controlled-action decisions, Samuel Review and Nature Positive reforms', readingTime: '13 min' },
  { id: 'first-nations',      number: 8,  title: 'First Nations consultation and Cultural Heritage Management', subtitle: 'Native Title, CHMPs, ACHARs, and the Juukan Gorge legacy',              readingTime: '13 min' },
  { id: 'timelines',          number: 9,  title: 'Planning timelines — typical durations and where delays come from', subtitle: 'The 40-month NSW baseline, the EnergyCo target, and the 2026 planning cliff', readingTime: '11 min' },
  { id: 'case-studies',       number: 10, title: 'Case studies — recent approvals, refusals and what they reveal', subtitle: 'Hills of Gold, Spicers Creek, Lotus Creek, Wambo, Western Renewables Link', readingTime: '13 min' },
  { id: 'acceleration',       number: 11, title: 'Acceleration levers — EnergyCo, IDA, VicGrid and the CIS planning hook', subtitle: 'How federal and state coordination bodies are trying to compress timelines', readingTime: '12 min' },
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
// Lesson 1 — The two-track planning system (state + federal)
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>Why planning is the single largest source of project-timeline risk</H2>
      <P>
        Of the ~40 GW of wind, solar and storage capacity that AEMO assumes will be operating by 2030,
        roughly two-thirds sits today in <Em>some stage of planning assessment</Em>. The single biggest
        determinant of whether each of those projects reaches financial close on time is not technology,
        not capex, not offtake — it is how it moves through the planning system. Average pre-construction
        approvals timelines in the NEM have approximately <Em>doubled</Em> since 2018, and the federal
        Capacity Investment Scheme contracts will not pay out if projects miss their COD deadlines.
        Understanding the planning pathway is therefore the single highest-leverage piece of NEM
        development knowledge.
      </P>

      <H2>Two layers of approval — and they are mostly independent</H2>
      <P>
        Every utility-scale renewable project in Australia faces approval from two largely separate
        bodies of law:
      </P>
      <Table
        emphasizeFirst
        headers={['Layer', 'What it regulates', 'Decision-maker', 'Trigger']}
        rows={[
          ['State planning', 'Land use, local amenity, biodiversity (state-level), social impact, traffic, noise', 'State Minister / Department / Independent Planning Commission', 'Always — every project sits in state planning'],
          ['Federal EPBC Act 1999', 'Matters of National Environmental Significance (MNES) — federally listed species, Ramsar wetlands, World Heritage areas, water resources from coal/CSG, Commonwealth marine', 'Federal Minister for Environment / DCCEEW (and from 2025, EPA Australia)', 'Only when the proposed action is likely to have a significant impact on a listed MNES'],
        ]}
      />
      <P>
        These two layers are constitutionally separate. Under the Australian Constitution, the
        Commonwealth has direct legislative power over very few environmental matters; the EPBC Act
        achieves federal environmental jurisdiction by listing nine categories of national significance
        and requiring federal approval if any of those is materially affected. State planning systems
        cover everything else — and that includes most local environmental matters (state-listed
        species, vegetation clearing rules, planning amenity, social impact).
      </P>

      <H2>The constitutional architecture</H2>
      <P>
        The legal basis for the two-track system reflects the deliberate design of Australian
        federalism. Three principles to keep in mind:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>State land use is residual.</Em> Anything not specifically reserved to the
          Commonwealth falls to the states, including ordinary land development consent. Planning
          power is therefore overwhelmingly state-level.</li>
        <li><Em>Federal environmental power is enumerated.</Em> The EPBC Act 1999 relies on
          Commonwealth heads of power (external affairs for international treaty obligations,
          trade and commerce for export-affecting decisions, etc.). It cannot regulate any
          environmental matter not falling within a specific Commonwealth head of power.</li>
        <li><Em>Bilateral agreements bridge the two systems.</Em> The EPBC Act allows the
          Commonwealth to accredit a state's assessment processes as adequate for federal purposes
          (Bilateral Assessment Agreement) or to delegate the approval decision itself (Bilateral
          Approvals Agreement). Most states have the first but not the second.</li>
      </ul>

      <H2>When does EPBC kick in?</H2>
      <P>
        Most utility-scale wind and solar projects do trigger at least one MNES. The most common
        triggers in 2026:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Threatened species + ecological communities</Em> — particularly birds (Regent
          Honeyeater, Swift Parrot, Australasian Bittern), bats (Greater Glider, Spectacled
          Flying Fox), and small native mammals. Wind farms also trigger collision-risk
          assessments for migratory raptors and shorebirds.</li>
        <li><Em>Migratory species under international agreements</Em> — JAMBA, CAMBA, ROKAMBA
          and the Bonn Convention. Common for sites near coastal/wetland habitats.</li>
        <li><Em>Ramsar wetlands</Em> — sites near a listed Ramsar wetland (e.g. Macquarie Marshes,
          NSW north-west) face heightened scrutiny.</li>
        <li><Em>Water resources from coal/CSG</Em> — adopted in 2013; rarely applies to wind/solar
          but does affect BESS sites co-located with mines.</li>
        <li><Em>Commonwealth land</Em> — projects on federal land (e.g. Defence land, NBN sites)
          attract automatic EPBC engagement.</li>
      </ul>
      <P>
        A 2024 DCCEEW analysis found that <Em>roughly 70% of utility-scale wind farms and 35-40%
        of utility-scale solar farms</Em> formally trigger EPBC controlled-action status. The
        remainder either avoid MNES habitats or self-determine that any impact is not significant.
      </P>

      <H2>Sequencing the two tracks</H2>
      <P>
        Project teams sequence the two layers in parallel rather than series, to avoid stacked
        delays:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'State track', 'Federal (EPBC) track']}
        rows={[
          ['Pre-lodgement', 'SEARs request, scoping discussions', 'Preliminary referral discussions with DCCEEW'],
          ['Referral (months 1-3)', 'Submit SSD/SSI application; receive Secretary\'s Environmental Assessment Requirements (SEARs)', 'Self-refer to DCCEEW; controlled-action decision within 20 business days'],
          ['Assessment (months 6-30)', 'Specialist studies, draft EIS, exhibition, RtS', 'Assessment by accreditation under bilateral agreement, or separately by PER/EIS'],
          ['Determination (months 30-40)', 'IPC public hearing (if triggered), Minister or IPC determination', 'Federal Minister/EPA decision on approval and conditions'],
          ['Conditions + monitoring', 'Construction Environmental Management Plan, OCEMP', 'EPBC conditions, threatened-species monitoring, bird strike reporting'],
        ]}
      />

      <Callout type="key">
        The combined planning + EPBC pathway for a typical NSW wind farm is currently running at
        roughly <Em>36-50 months from initial scoping to consent</Em>, with construction-stage
        approvals (CEMP, BMP, ACMP) adding another 6-12 months before turbines can rise.
        Compressing this is the single highest-impact lever available to either federal or state
        governments — and is the principal motivation behind EnergyCo NSW (2020), VicGrid (2022),
        and the federal CIS structural support packages.
      </Callout>

      <H2>The recent reform context</H2>
      <P>
        Three reform programs sit in the background of the 2026 planning landscape:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Samuel Review of the EPBC Act</Em> (Graeme Samuel, delivered October 2020) — found
          the EPBC Act slow, fragmented, biodiversity-declining, and badly enforced. Recommended
          a complete redesign with National Environmental Standards and a federal EPA.</li>
        <li><Em>Nature Positive Plan</Em> (December 2022) — the Albanese Government's formal
          response. Committed to a federal EPA Australia and Environment Information Australia,
          new National Environmental Standards, and a comprehensive EPBC Act rewrite.</li>
        <li><Em>Nature Positive Reforms 2024-2026</Em> — first tranche legislation passed late
          2024 (establishing EPA Australia + EIA). Second tranche (comprehensive rewrite) remains
          contested. Bilateral agreements with states being renegotiated through 2025-26.</li>
      </ul>
      <P>
        On the state side, NSW launched its <Em>Energy Policy Framework</Em> in December 2024,
        Victoria expanded its Development Facilitation Program in 2024, Queensland's LNP government
        (October 2024) has indicated a more conservative approach to call-ins, and WA introduced
        the Green Energy Approvals Initiative in 2024. The five state pathways have therefore
        moved in different directions in just two years — making state-specific knowledge more
        important than ever for developers.
      </P>

      <Callout type="source">
        Sources: EPBC Act 1999 · Samuel Review of the EPBC Act (October 2020) ·
        Nature Positive Plan (DCCEEW, December 2022) · Clean Energy Council
        <em> Delivering Major Clean Energy Projects in NSW</em> 2024 ·
        Norton Rose Fulbright <em>EPBC reform tracker</em> 2025 ·
        Gilbert + Tobin <em>NSW Energy Policy Framework analysis</em> 2025.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — NSW: SSD pathway and the Independent Planning Commission
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>EP&amp;A Act 1979 — the foundation</H2>
      <P>
        The <Em>Environmental Planning and Assessment Act 1979 (NSW)</Em> is the principal planning
        statute. It distinguishes three pathways for renewable energy projects:
      </P>
      <Table
        emphasizeFirst
        headers={['Pathway', 'Statutory section', 'Used for', 'Decision-maker']}
        rows={[
          ['Local DA', 'Part 4', 'Small-scale solar, BESS &lt;30 MW; rooftop installations', 'Local council'],
          ['REF (Review of Environmental Factors)', 'Part 5', 'Public infrastructure by a public authority; some grid connection work', 'The proponent agency itself (self-determining)'],
          ['State Significant Development (SSD)', 'Part 4 — Division 4.7', 'Utility-scale wind/solar/BESS, capex &gt;$30M or specific categories', 'Minister for Planning or IPC'],
          ['State Significant Infrastructure (SSI)', 'Part 5 — Division 5.2', 'Major transmission lines, grid network upgrades', 'Minister or NSW Government'],
          ['Critical State Significant Infrastructure (CSSI)', 'Part 5 — Division 5.2A', 'EnergyCo-coordinated REZ infrastructure', 'Minister'],
        ]}
      />
      <P>
        Almost every utility-scale wind, solar, or BESS project in NSW now sits under <Em>State
        Significant Development (SSD)</Em>. The trigger thresholds for SSD include:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Capital investment value greater than $30M</li>
        <li>Solar electricity generating works with installed capacity of 30 MW or more</li>
        <li>Wind electricity generating works with installed capacity of 30 MW or more</li>
        <li>Electricity generating works on State Significant Development land</li>
        <li>Battery storage systems with capacity of 30 MW or more (added 2022)</li>
      </ul>

      <H2>The SSD assessment journey</H2>
      <P>
        Inside SSD, a typical project moves through roughly seven stages:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'What happens', 'Typical duration']}
        rows={[
          ['1. Scoping Report', 'Project description + initial impact considerations submitted to DPHI for SEARs', '2-4 months'],
          ['2. SEARs issued', 'Department issues Secretary\'s Environmental Assessment Requirements', '1-3 months'],
          ['3. EIS preparation', 'Specialist studies, Aboriginal Cultural Heritage Assessment Report, biodiversity surveys (often need multi-season data), draft EIS', '12-24 months'],
          ['4. Public exhibition', 'EIS publicly exhibited for 28-90 days; submissions invited from community, councils, agencies', '1-3 months'],
          ['5. Response to Submissions', 'Applicant prepares RtS addressing each unique objection; further information often requested', '3-9 months'],
          ['6. Whole-of-government assessment', 'Department prepares Assessment Report; conditions drafted', '2-6 months'],
          ['7. Determination', 'Minister or IPC determines; conditions of consent issued', '1-6 months (longer if IPC public hearing)'],
        ]}
      />

      <H2>The Independent Planning Commission</H2>
      <P>
        Since 2018, an <Em>Independent Planning Commission (IPC)</Em> sits between the Department and
        the Minister for many high-profile SSD applications. Composition: 11 appointed Commissioners
        drawn from planning, environmental science, infrastructure and community development
        backgrounds. The IPC acts as the determining authority (not the Minister) when:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The application receives <Em>25 or more unique public objections</Em> during exhibition</li>
        <li>The local Council formally objects to the proposal</li>
        <li>The Minister chooses to refer the application to the IPC (rare for renewables)</li>
        <li>The Minister has a conflict of interest</li>
        <li>The project is contentious mining or resource extraction (does not apply to renewables)</li>
      </ul>
      <P>
        For controversial renewable projects, the IPC will hold a public hearing. The 25-objection
        threshold is the most common trigger — many wind farm applications receive hundreds of
        objections from regional neighbours, even when overall sentiment is supportive. Once at
        the IPC, the typical timeline adds <Em>6-12 months</Em>: 4-8 weeks for public meeting
        scheduling, 1 day of hearings, written and reply submissions, then 4-6 months for
        Commissioner consideration and reasoned determination.
      </P>

      <H2>The IPC's recent renewable-energy track record</H2>
      <P>
        From mid-2023 onwards, the IPC has determined a cluster of wind farm and large-scale solar
        applications — each shaping how subsequent projects are designed. A short list of recent
        IPC determinations:
      </P>
      <Table
        emphasizeFirst
        headers={['Project', 'Decision', 'Date', 'Notable conditions']}
        rows={[
          ['Hills of Gold Wind Farm (Engie)', 'Refused initially; partial approval after modifications', 'Aug 2023 → Apr 2024', 'Reduced from 70 to 47 turbines; cumulative-impact considerations against existing wind cluster'],
          ['Spicers Creek Wind Farm (Squadron)', 'Approved with conditions', 'Apr 2024', 'Aboriginal Cultural Heritage agreement; bat monitoring; community benefit fund'],
          ['Thunderbolt Wind Farm (Neoen)', 'Approved with conditions', 'Mid-2024', 'Visual amenity setbacks tightened; landholder benefit-sharing required'],
          ['Valley of the Winds (Acen)', 'Approved with conditions', 'Jun 2024', 'Largest project (1 GW) approved in NSW through IPC; multi-stage build conditions'],
          ['Liverpool Range Wind Farm (Tilt Renewables)', 'Approved with conditions', 'Jun 2024', 'Long-running application; multiple modifications; landholder consent terms'],
          ['Glanmire Solar Farm (Elgin)', 'Approved', '2024', 'Small CIS T1 project; relatively low-complexity SSD path'],
        ]}
      />
      <P>
        Pattern recognition: the IPC has been <Em>willing to approve large wind farms but with
        material conditions</Em> — tightened visual amenity setbacks, community benefit funds,
        Aboriginal Cultural Heritage Management Plans, bat and bird strike monitoring, and (in
        cumulative cases like Hills of Gold) outright reductions in turbine count. The pattern
        of refusal-then-modification-then-approval is now a deliberate developer strategy.
      </P>

      <H2>EnergyCo and the REZ planning overlay</H2>
      <P>
        The <Em>Energy Corporation of NSW (EnergyCo)</Em>, established under the Energy Infrastructure
        Investment Act 2020, sits above the standard SSD pathway for projects located within a
        gazetted Renewable Energy Zone (REZ). Five REZs have been declared:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Central-West Orana (declared 2020, fastest progressing)</li>
        <li>New England (declared 2021)</li>
        <li>South-West (declared 2021)</li>
        <li>Hunter-Central Coast (declared 2022)</li>
        <li>Illawarra (declared 2022)</li>
      </ul>
      <P>
        Inside a REZ, EnergyCo coordinates connection planning, manages an Access Authorization
        Scheme (project pre-qualification + dispatch priority), and works with DPHI to streamline
        SSD assessments. The REZ designation does NOT eliminate the SSD requirement, but it does
        provide:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Pre-cleared cumulative-impact baselines (saving developers ~12 months of survey
          duplication)</li>
        <li>Aligned grid connection sequencing (network solutions chosen jointly)</li>
        <li>Faster SEARs response (dedicated DPHI assessment team for REZ projects)</li>
        <li>Sometimes shared community benefit frameworks</li>
      </ul>

      <H2>The Energy Policy Framework (December 2024)</H2>
      <P>
        Late in 2024, NSW Premier Chris Minns and Planning Minister Paul Scully published a new
        <Em> Energy Policy Framework</Em> with three pillars: (1) faster planning for renewable
        and storage projects, (2) clearer community benefit standards, and (3) Investment Delivery
        Authority coordination of major CIS-contracted projects. The Framework's specific
        commitments include:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Reduced public hearing triggers in declared REZs (objection threshold may be lifted
          from 25 to 50 for some projects)</li>
        <li>Statutory SEARs response timeframes (target: 12 weeks)</li>
        <li>Standardised community benefit minimum: $1,050/MW/yr for new wind, $850/MW/yr for new
          solar — paid to local councils for community projects</li>
        <li>Investment Delivery Authority (IDA) — coordinates federal CIS, state planning,
          transmission and connections for major projects</li>
      </ul>

      <Callout type="warn">
        The Energy Policy Framework was met with mixed reception. Industry welcomed the timeline
        reductions; some regional community groups argued the lifted objection threshold weakens
        accountability. The Framework's implementation is ongoing through 2026 and the full
        statutory changes have not yet completed legislative passage.
      </Callout>

      <Callout type="source">
        Sources: EP&amp;A Act 1979 · NSW Planning Portal — Major Projects ·
        Independent Planning Commission NSW · NSW Energy Policy Framework (December 2024) ·
        Energy Infrastructure Investment Act 2020 · Clean Energy Council
        <em> Delivering Major Clean Energy Projects in NSW</em> 2024 · IPC determinations
        archive.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — Victoria: Planning & Environment Act and the DFP
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>Planning &amp; Environment Act 1987 — the foundation</H2>
      <P>
        Victoria's planning framework sits under the <Em>Planning &amp; Environment Act 1987</Em>,
        with planning schemes administered by 79 local councils and the Minister for Planning. For
        renewable energy projects, Victoria has had a more volatile policy history than NSW —
        swinging from open support (1990s) to highly restrictive (2009-15) and back to
        development-encouraging (2015-present).
      </P>

      <H2>The VC34 era — the Victorian wind moratorium (2009-2011)</H2>
      <P>
        In August 2011, the Baillieu Coalition government introduced <Em>Amendment VC34</Em> to
        the Victorian Planning Provisions. VC34 imposed:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>A <Em>2 km no-go buffer</Em> from any dwelling, unless the owner gave written consent</li>
        <li>A <Em>5 km buffer</Em> from regional centres including Bendigo, Ballarat and Geelong</li>
        <li>Exclusion zones around state-significant landscapes (Macedon Ranges, Wilsons Promontory)</li>
        <li>Strict landowner-consent requirements that effectively gave individual neighbours veto
          power over wind farm siting</li>
      </ul>
      <P>
        The effect was immediate and catastrophic for the Victorian wind industry. Within 18 months
        of VC34 taking effect, all 11 wind farm proposals in front of Victorian councils were
        either withdrawn or unable to obtain consent. Some commentators have argued it was the
        most effective single-instrument moratorium on a renewable technology in any Australian
        state.
      </P>

      <H2>The 2015 reset</H2>
      <P>
        The Andrews Labor government, elected November 2014, identified VC34 as a priority repeal
        and worked with industry, councils and community groups to reform the framework. The new
        regime (effective March 2015):
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Removed the 2 km automatic buffer (replaced with a 1 km baseline that can be reduced
          with landowner agreement)</li>
        <li>Retained landowner-consent provisions only where genuinely necessary (specific
          line-of-sight scenarios)</li>
        <li>Re-introduced cumulative-impact assessment</li>
        <li>Required community engagement plans, but did not give individuals veto power</li>
      </ul>
      <P>
        The reset led directly to the Victorian solar and wind boom of 2017-2020 — Stockyard Hill
        Wind Farm (530 MW), Murra Warra Wind Farm (435 MW), Bald Hills extension, Cherry Tree Wind
        Farm, and a wave of large-scale solar projects in the Mildura and Wimmera regions all
        reached financial close in the four years following.
      </P>

      <H2>The Minister's call-in powers</H2>
      <P>
        Under section 96 of the Planning &amp; Environment Act, the Victorian Planning Minister can
        <Em> call in</Em> a planning application from a local council — effectively taking over the
        determination. Call-in is used when:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The matter raises issues of state, regional or metropolitan significance</li>
        <li>The application has been the subject of unreasonable delay</li>
        <li>The application involves environmental, social or economic issues that the Minister
          considers warrant ministerial attention</li>
      </ul>
      <P>
        For renewable projects, call-ins have been used both to <Em>approve</Em> projects that
        local councils were unable to determine (e.g. some 2017-19 solar farms in Mildura LGAs)
        and to <Em>amend conditions</Em> on contentious projects. Call-in has been more common
        under Labor governments than Coalition.
      </P>

      <H2>The Development Facilitation Program (2024)</H2>
      <P>
        Announced in November 2023 and operational from early 2024, the <Em>Development Facilitation
        Program (DFP)</Em> is Victoria's clearest answer to NSW's EnergyCo. The DFP applies to:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Renewable energy projects (wind, solar, BESS) above 50 MW</li>
        <li>Affordable housing development with state-significant social benefit</li>
        <li>Major employment-creating developments</li>
        <li>Transmission infrastructure</li>
      </ul>
      <P>
        Under the DFP, the Minister becomes the responsible authority directly — bypassing the
        local council planning permit pathway. The applicant submits a single application to the
        Department of Transport &amp; Planning, which conducts a coordinated assessment with all
        referral agencies (Country Fire Authority, Environment Protection Authority, Heritage
        Victoria, Aboriginal Heritage Council Victoria, etc.). Indicative timeline: <Em>9-18 months
        from lodgement to determination</Em>, compared with 24-48 months under standard pathways.
      </P>

      <H2>VicGrid — the new transmission coordinator</H2>
      <P>
        Established in 2022 and given expanded powers under the National Electricity (Victoria)
        Amendment Act 2024, <Em>VicGrid</Em> sits across:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Identification of Victorian Renewable Energy Zones (V-REZs) and Transmission
          Investment Plans</li>
        <li>Coordination of REZ network upgrades (Western Renewables Link, Marinus Link planning)</li>
        <li>Access coordination — managing connection sequencing and Access Authorization Schemes</li>
        <li>Integration with the DFP for projects within declared V-REZ areas</li>
      </ul>
      <P>
        Six V-REZs have been declared: Murray River (NW Victoria), Western Victoria, South West,
        Gippsland Offshore, Central North, and Ovens Murray. Projects inside these zones receive
        DFP eligibility automatically.
      </P>

      <H2>The big build approvals — transmission as the bottleneck</H2>
      <P>
        Victoria's most contested 2024-2026 planning episode has not been renewable generation but
        transmission. The Western Renewables Link — a 190 km double-circuit 500 kV line connecting
        the Western Victoria REZ to the Sydenham terminal station near Melbourne — was first
        proposed in 2018, has been through multiple route changes, and remains contested at
        community and Council level through 2025.
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Original AusNet proposed 2018, 220 km overhead route</li>
        <li>Multiple route revisions through 2019-2023 in response to community opposition</li>
        <li>EES (Environment Effects Statement) panel determination late 2024</li>
        <li>VicGrid took over project coordination July 2024</li>
        <li>Construction now slated to begin 2026, completion 2030-2031 — well behind original
          2025 commissioning target</li>
      </ul>

      <Callout type="key">
        Victoria's planning system has moved from the most restrictive (2011-2015 VC34 era) to one
        of the more development-friendly major jurisdictions (2024 onwards) inside a decade. The
        DFP and VicGrid combination is structurally close to NSW's EnergyCo model. The remaining
        binding constraint — transmission build-out — is shared with NSW but politically harder
        because transmission corridors traverse high-value agricultural land in Western Victoria.
      </Callout>

      <Callout type="source">
        Sources: Planning &amp; Environment Act 1987 · Amendment VC34 (2011) and repeal (2015) ·
        Development Facilitation Program guidelines (Department of Transport &amp; Planning, 2024) ·
        VicGrid Annual Plan 2025 · AusNet Western Renewables Link EES Panel Report 2024 ·
        Maddocks Lawyers <em>Victorian renewable energy planning updates</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — Queensland: the call-in power and recent decisions
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>Planning Act 2016 — Queensland's framework</H2>
      <P>
        Queensland's planning system is governed by the <Em>Planning Act 2016</Em>, with most
        development assessment occurring at the local government level. Renewable energy projects
        in Queensland have, until 2022, generally been treated as code-assessable or
        impact-assessable applications by local councils — without the State Significant
        Development overlay that exists in NSW.
      </P>
      <P>
        This produced two distinct outcomes through 2018-2022:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Faster approvals in remote/rural shires</Em> — councils that welcomed renewable
          investment (Western Downs, Maranoa, Banana Shire) approved large solar farms in 12-18
          months, often with minimal conditions</li>
        <li><Em>Council-level refusals or stalls in objection-heavy areas</Em> — particularly in
          coastal and tablelands LGAs where wind farms faced community opposition</li>
      </ul>

      <H2>State pathways — Coordinator-General + SARA</H2>
      <P>
        Queensland has two parallel state mechanisms that can override or accelerate local
        decisions:
      </P>
      <Table
        emphasizeFirst
        headers={['Mechanism', 'Statutory basis', 'Used when', 'Decision-maker']}
        rows={[
          ['SARA — State Assessment & Referral Agency', 'Planning Act 2016', 'Standard state-interest referrals (e.g. infrastructure crossings, environmental matters); does not override council decision', 'Department / local council'],
          ['Coordinator-General — Coordinated Project status', 'State Development & Public Works Organisation Act 1971', 'Major projects of state significance; CG conducts comprehensive coordinated assessment', 'Coordinator-General + Minister'],
          ['Ministerial call-in', 'Planning Act 2016 section 102 (Coordinator-General process)', 'When the Minister calls in a council decision or proposal of state significance', 'Coordinator-General / Minister'],
          ['Regional Planning Interest (RPI) Act assessment', 'Regional Planning Interests Act 2014', 'Projects in priority agricultural areas; resource-impact assessment', 'Department of Resources'],
        ]}
      />

      <H2>The 2023 wave of called-in renewables</H2>
      <P>
        From mid-2022, several renewable energy applications encountered prolonged council-level
        delays or outright refusals in regional Queensland — primarily in the Central Highlands,
        Banana and Maranoa local government areas. In August 2023, the Palaszczuk Labor government
        responded by directing the Coordinator-General to <Em>call in several stalled wind farm
        applications</Em> for centralised assessment under the Coordinated Project framework:
      </P>
      <Table
        emphasizeFirst
        headers={['Project', 'Local outcome', 'Call-in date', 'Final state outcome']}
        rows={[
          ['Lotus Creek Wind Farm (Tilt Renewables)', 'Council assessment stalled', 'Aug 2023', 'Approved June 2024 (Coordinated Project)'],
          ['Theodore Wind Farm (RES Australia)', 'Banana Shire delays', 'Aug 2023', 'Approved 2024'],
          ['Mt Hopeful Wind Farm (Tilt Renewables)', 'Refused by Central Highlands Regional Council 2022', 'Late 2023 (call-in)', 'Approved 2024 with reduced footprint'],
          ['Wambo Wind Farm (Cubico/Stanwell)', 'Withdrawn after Wonnarua Nation cultural heritage concerns', 'Project withdrawn 2024', 'Replacement project being scoped'],
        ]}
      />
      <P>
        These call-ins were politically significant. They demonstrated the State's willingness to
        override local council planning refusals when the Coordinator-General assessed that the
        broader public interest favoured proceeding. They also drew criticism — both from
        community groups who argued the State was bypassing democratic local input, and from
        industry who welcomed the certainty but worried about post-call-in conditions.
      </P>

      <H2>The October 2024 election shift</H2>
      <P>
        Queensland's October 2024 state election produced a change of government — Annastacia
        Palaszczuk's Labor government lost to David Crisafulli's LNP, ending nine years of Labor
        rule. The Crisafulli government's pre-election positions included:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Greater respect for local council planning decisions — explicit rejection of routine
          call-ins of renewable projects</li>
        <li>Restoration of a <Em>"social licence test"</Em> for major wind farms — requiring
          demonstrated community support</li>
        <li>Preservation of Coordinator-General powers for genuine state-of-significance projects
          (mining, large infrastructure) but not as default renewables fast-track</li>
        <li>Continued support for solar farm development in established renewable LGAs (Western
          Downs, Maranoa) where community sentiment is positive</li>
      </ul>
      <P>
        The early signals from the LNP government (Q4 2024 - Q1 2025) suggest call-ins of
        contested wind farms will be rare. New applications in objection-heavy LGAs are likely to
        be determined at council level — meaning developers must invest substantially more in
        community engagement up-front.
      </P>

      <H2>What still works in Queensland — solar in Western Downs</H2>
      <P>
        Despite the wind-farm controversies in Central Highlands and Banana Shire, Queensland's
        utility-scale solar pipeline continues to expand smoothly through cooperative LGAs:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Western Downs Regional Council</Em> has approved over 5 GW of solar farms since
          2018 — making it the single most renewable-friendly LGA in Australia by approved
          capacity</li>
        <li><Em>Maranoa Regional Council</Em> (Roma) — Wandoan, Surat, Roma South solar projects
          have all proceeded smoothly</li>
        <li><Em>Banana Shire</Em> (Biloela) — multiple solar farms operating, though wind has been
          more contested</li>
      </ul>
      <P>
        The common pattern: developers engage early with council CEOs and planning officers,
        commit to local apprenticeships and contracts, contribute to community benefit funds at
        the council's discretion, and route as much benefit through Queensland-based contractors
        as possible. Where this is done well, approvals run smoothly even without state-level
        intervention.
      </P>

      <H2>The CleanCo Queensland pathway</H2>
      <P>
        State-owned <Em>CleanCo Queensland</Em> (established 2019) develops its own renewable
        and storage projects. Because CleanCo is a Government Owned Corporation, its projects
        receive a more streamlined planning pathway via state-government coordination — though
        they still face local council planning permit requirements where relevant. CleanCo's
        major operating + development projects include MacIntyre Wind Farm (1,026 MW, operating),
        Wivenhoe Pumped Hydro (570 MW, operating), Borumba Pumped Hydro (2 GW under
        development), and Kareeya hydro extension.
      </P>

      <Callout type="key">
        Queensland's planning system in 2026 is at a transition point. The Palaszczuk-era
        Coordinator-General call-in pathway delivered approvals for politically-contested wind
        farms but at the cost of local council relations and community trust. The Crisafulli
        LNP government has signalled it will let local councils decide — making early community
        engagement, social licence, and council-level relationship-building the dominant
        success factor for QLD wind projects through 2026-2028. Solar in cooperative LGAs
        remains a relatively straightforward pathway.
      </Callout>

      <Callout type="source">
        Sources: Planning Act 2016 (Queensland) · State Development &amp; Public Works
        Organisation Act 1971 · Coordinator-General called-in project records 2023-24 ·
        Queensland Energy and Jobs Plan 2022 · Local Government Association of Queensland
        community sentiment surveys · The Australian + Courier Mail political reporting
        2024-25 · CleanCo Queensland annual report 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — SA and WA: leaner systems, separate journeys
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>South Australia — the renewables-friendly leader</H2>
      <P>
        South Australia operates under the <Em>Planning, Development &amp; Infrastructure Act 2016
        (PDI Act)</Em> — a relatively modern statute that consolidated earlier planning law into
        a single framework with statewide consistency. For renewable energy projects, SA has the
        most consistently positive political and planning environment in the NEM:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Bipartisan support</Em> — both Liberal and Labor SA governments have backed
          renewables consistently since 2003. This is unique among the eastern states.</li>
        <li><Em>State-significant development pathway</Em> — for projects above $10M, the State
          Commission Assessment Panel (SCAP) is the decision-maker rather than local councils.
          SCAP has approved an average of 25-35 renewable energy applications per year
          2020-2024.</li>
        <li><Em>Renewable Energy and Industrial Hub strategy</Em> — SA has explicitly positioned
          itself for hydrogen industry development, with industrial hubs at Whyalla, Port Bonython
          and Cape Hardy. Planning frameworks were updated 2023 to accommodate hydrogen-scale
          renewable + electrolyser projects.</li>
        <li><Em>Strong community-benefit norms</Em> — most SA wind and solar projects now include
          a community fund (typically $1,000-1,500/MW/yr), even though not legally required.</li>
      </ul>

      <H2>SCAP and the SA assessment process</H2>
      <P>
        The <Em>State Commission Assessment Panel (SCAP)</Em> is the assessment body for major
        SA developments. Composition: independent planning professionals plus the State Planning
        Commission Chair. Pathway:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'Action', 'Typical duration']}
        rows={[
          ['1. Pre-lodgement', 'Pre-application discussions with State Planning Commission staff', '1-3 months'],
          ['2. Lodgement', 'Application + planning report + environmental impact assessment lodged', '–'],
          ['3. Public notification', 'Lodgement publicly notified for 21 days; submissions invited', '~1 month'],
          ['4. Referral agency comment', 'Country Fire Service, Environment Protection Authority, AHRC, water management agencies provide comment', '2-3 months parallel'],
          ['5. SCAP determination', 'SCAP meets, considers application + submissions + referrals; reasoned determination issued', '6-12 months from lodgement'],
        ]}
      />
      <P>
        Typical SCAP renewables determinations land in <Em>18-30 months from initial scoping to
        consent</Em> — meaningfully faster than NSW (40-50 months) or Victoria (24-48 months).
      </P>

      <H2>SA's REZ-equivalent framework</H2>
      <P>
        SA has not formally gazetted "REZs" in the NSW sense, but the Department of Energy &amp;
        Mining publishes a <Em>Renewable Energy Action Plan</Em> with priority development zones:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Mid North (Snowtown, Hornsdale, Hallett wind clusters)</li>
        <li>Yorke Peninsula (large solar + wind potential, ports for hydrogen export)</li>
        <li>Eyre Peninsula (Port Lincoln, Whyalla industrial corridor)</li>
        <li>South-East (Mount Gambier region)</li>
        <li>Adelaide Plains (commercial-scale rooftop + utility solar)</li>
      </ul>
      <P>
        These zones inform transmission planning by ElectraNet (the state-owned transmission
        operator) and inform SCAP's prioritisation. Projects in these zones receive faster
        referral-agency turnaround.
      </P>

      <H2>Western Australia — a different country, planning-wise</H2>
      <P>
        Western Australia is not in the NEM. It runs two separate electricity systems — the
        South-West Interconnected System (SWIS) covering Perth and the south-west, and the North
        West Interconnected System (NWIS) covering the Pilbara. Both have their own planning,
        regulatory and market frameworks, and WA's mainstream planning regime is different from
        the NEM states. Three statutes matter for renewables:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Planning and Development Act 2005</Em> — the principal planning law,
          administered by local government and the WA Planning Commission (WAPC)</li>
        <li><Em>Environmental Protection Act 1986</Em> — environmental approvals administered by
          the Environmental Protection Authority (EPA), with the Department of Water and
          Environmental Regulation (DWER) implementing</li>
        <li><Em>Aboriginal Heritage Act 1972</Em> — restored as the operative cultural heritage
          framework after the 2021 Act was repealed in 2023 (see Lesson 8)</li>
      </ul>

      <H2>The state pathway for renewables in WA</H2>
      <Table
        emphasizeFirst
        headers={['Pathway', 'When used', 'Decision-maker', 'Typical duration']}
        rows={[
          ['Development assessment by local council', 'Solar + BESS &lt;30 MW; rural land uses', 'Local council', '6-18 months'],
          ['Significant project assessment by WAPC', 'Wind/solar/BESS above threshold or with state-significant issues', 'WAPC', '12-30 months'],
          ['EPA referral + assessment', 'Projects likely to cause significant environmental impact', 'EPA → Minister for Environment', '24-48 months (often the binding constraint)'],
          ['Government-led delivery (Green Energy Approvals Initiative)', 'Major renewables identified as state-significant priorities', 'Cross-agency coordinated', '12-24 months target'],
        ]}
      />

      <H2>The Green Energy Approvals Initiative (2024)</H2>
      <P>
        WA's clearest planning-acceleration mechanism is the <Em>Green Energy Approvals Initiative
        (GEAI)</Em>, launched April 2024 by the Cook Labor government. GEAI provides:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>A <Em>single-window coordinated assessment</Em> across WAPC, EPA, DWER, DBCA and
          relevant local councils — managed by a dedicated Major Renewables Assessment Team
          within the Department of Water and Environmental Regulation</li>
        <li>Priority-pathway treatment for renewable projects above 100 MW</li>
        <li>Statutory assessment timeframes (target 18-24 months total)</li>
        <li>Pre-lodgement environmental and cultural heritage scoping</li>
        <li>Integration with the SWIS Long-Term Network Plan (Western Power's transmission roadmap)</li>
      </ul>
      <P>
        The first cohort of GEAI projects (Q2-Q4 2024) included Killawarra Hybrid Project (Trina
        Solar, 350 MW + 2,100 MWh), Collie Battery and Solar Hybrid (200 MW + 1,518 MWh), and
        several smaller solar farms. Early results suggest target timeframes are achievable for
        well-scoped projects.
      </P>

      <H2>The Pilbara — a separate planning conversation</H2>
      <P>
        The Pilbara (north-west WA) operates under different rules. The region hosts most of WA's
        iron ore industry, BHP/Rio Tinto/Fortescue captive power infrastructure, and the planned
        Pilbara Energy Transition — under which Fortescue Future Industries, BHP, Rio Tinto and
        Andrew Forrest's privately-held companies are building dedicated renewable + storage
        plants to decarbonise mining operations. Pilbara-specific planning considerations:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>State Agreement Acts (negotiated between government and individual mining companies)
          govern much of the land tenure</li>
        <li>Native Title agreements with the Yindjibarndi, Banjima, Eastern Guruma and other
          traditional owner groups</li>
        <li>EPA Pilbara Strategic Assessment 2022-2025 — programmatic environmental assessment
          for the region</li>
        <li>NWIS / SWIS interconnection — proposed but politically and economically contested</li>
      </ul>

      <H2>WA's offshore wind ambitions</H2>
      <P>
        WA was designated under the federal <Em>Offshore Electricity Infrastructure Act 2021</Em>
        for offshore wind development off the south-west coast in 2023. Five proposed
        feasibility licence areas off Bunbury and the Indian Ocean have advanced through
        consultation 2024-2025. Major proponents include Equinor, Floventis Energy and BlueFloat
        Energy. None has yet reached feasibility licence award; first commercial offshore wind
        from WA waters is not expected before 2032-34.
      </P>

      <Callout type="key">
        SA and WA represent the two ends of the planning spectrum in non-NSW/Vic Australia. SA
        offers the most pro-renewable political environment with consistent bipartisan support,
        relatively fast approvals via SCAP, and integrated REZ-like priority zones. WA has the
        most complex multi-agency regime, but the 2024 Green Energy Approvals Initiative
        represents a genuine effort to compress timelines for SWIS projects — and the Pilbara
        renewable transition is a fundamentally different planning conversation again, driven
        by mining company commitments rather than state government policy.
      </Callout>

      <Callout type="source">
        Sources: SA Planning, Development &amp; Infrastructure Act 2016 · State Commission
        Assessment Panel determination records · SA Renewable Energy Action Plan 2024 ·
        WA Planning and Development Act 2005 · WA Environmental Protection Act 1986 ·
        WA Green Energy Approvals Initiative (Department of Water and Environmental
        Regulation, April 2024) · Pilbara Energy Transition Plan · Offshore Electricity
        Infrastructure Act 2021 (Commonwealth).
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — EIS deep-dive
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>What an EIS actually contains</H2>
      <P>
        An <Em>Environmental Impact Statement (EIS)</Em> is a comprehensive document — typically
        running to 800-1,500 pages plus 40-80 specialist appendices — that supports a State
        Significant Development application. While the precise format varies by state, every EIS
        addresses the same core questions:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>What is the proposal? (project description, layout, capacity, components)</li>
        <li>What is the existing environment? (biophysical baseline, social baseline, cultural
          heritage baseline)</li>
        <li>What impacts will the proposal have, both individually and cumulatively?</li>
        <li>How will those impacts be avoided, mitigated, or offset?</li>
        <li>How will the proposal be monitored, managed and (where relevant) decommissioned?</li>
      </ul>

      <H2>The specialist studies — typically 12-18 separate reports</H2>
      <P>
        Most utility-scale renewable EIS submissions are anchored by between 12 and 18 specialist
        technical reports, each prepared by an independent consulting firm. Typical scope:
      </P>
      <Table
        emphasizeFirst
        headers={['Specialist study', 'Why it matters', 'Typical duration', 'Indicative cost']}
        rows={[
          ['Biodiversity Development Assessment Report (BDAR) / Flora and Fauna Assessment', 'Identifies threatened species, ecological communities, calculates offsets — often the largest single approval risk', '8-18 months (multi-season surveys needed)', '$250-800k'],
          ['Aboriginal Cultural Heritage Assessment Report (ACHAR / ACHIA)', 'Identifies tangible and intangible cultural heritage; consultation with Registered Aboriginal Parties', '6-12 months', '$120-400k'],
          ['Historic Heritage Assessment', 'Non-Aboriginal heritage (colonial structures, archaeological sites)', '2-4 months', '$40-100k'],
          ['Noise Impact Assessment', 'Wind turbine noise modelling (predicted dBA at nearest dwellings), BESS audible noise, construction noise', '2-4 months', '$30-80k'],
          ['Visual Impact Assessment (LVIA)', 'Landscape character analysis, zone-of-visual-influence mapping, photomontages from key viewpoints', '3-6 months', '$80-200k'],
          ['Traffic & Transport Impact', 'Construction-phase truck movements, over-dimension load routes, road upgrade requirements', '2-4 months', '$30-80k'],
          ['Surface Water + Groundwater Assessment', 'Catchment modelling, stormwater design, groundwater drawdown', '4-8 months', '$80-250k'],
          ['Bird and Bat Strike Risk Assessment (wind specific)', 'Migratory species, residential raptors, fly-line modelling, mitigation plan', '12-18 months (cross-seasonal survey)', '$150-400k'],
          ['Glint and Glare Assessment (solar specific)', 'Reflectivity from panels onto roads, dwellings, aircraft flight paths', '1-2 months', '$20-50k'],
          ['Hazard Assessment (BESS specific)', 'Fire risk, electromagnetic emission, runaway thermal modelling', '2-4 months', '$30-80k'],
          ['Social Impact Assessment', 'Community survey, regional economic impact, distributional analysis', '4-8 months', '$50-150k'],
          ['Air Quality Assessment', 'Construction-phase dust, BESS off-gassing', '2-3 months', '$25-60k'],
          ['Bushfire Risk Assessment', 'BAL rating, evacuation routes, vegetation management plan', '2-3 months', '$30-70k'],
          ['Agricultural Impact', 'Land use change, impact on adjoining agricultural operations', '2-3 months', '$30-70k'],
        ]}
      />
      <P>
        Total typical EIS cost: <Em>$1.5-4M for a medium-complexity SSD project (50-200 MW
        wind/solar)</Em>; <Em>$4-10M for a large or contentious project</Em>. EIS preparation
        consumes 12-30 months of the overall planning timeline.
      </P>

      <H2>Biodiversity is the single highest-risk specialist study</H2>
      <P>
        Across NSW, Victoria and Queensland renewable approvals, <Em>biodiversity is the most
        common single cause of refusal, modification, or delay</Em>. Why:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Multi-season surveys are required (typically 12-24 months) to capture seasonal
          species presence — this is the only assessment that genuinely cannot be accelerated
        </li>
        <li>Threatened species presence triggers calculation of <Em>biodiversity offsets</Em> —
          financial contributions (in NSW typically $20-50M per major project) to acquire or
          restore equivalent habitat</li>
        <li>If a Critically Endangered ecological community is detected on site, project layout
          must avoid it; this can force complete redesign</li>
        <li>EPBC implications — federally listed species impacts may require parallel federal
          assessment</li>
      </ul>
      <P>
        The 2017 Biodiversity Conservation Act in NSW introduced the <Em>Biodiversity Offsets
        Scheme</Em>, which created a market for offset credits. Projects calculate their
        biodiversity impact via the Biodiversity Assessment Method (BAM), then either acquire
        equivalent offset credits (registered Biodiversity Stewardship Sites) or pay into the
        Biodiversity Conservation Fund. Offset costs typically run 4-12% of total project capex.
      </P>

      <H2>Public exhibition and Response to Submissions</H2>
      <P>
        Once the EIS is lodged, the assessment authority publishes it for <Em>public
        exhibition</Em>:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>NSW: 28-90 days, typically 56 days for SSD</li>
        <li>Victoria DFP: typically 28-42 days</li>
        <li>QLD: 30-60 days for Coordinated Projects</li>
        <li>SA SCAP: 21 days</li>
      </ul>
      <P>
        Public submissions can be made by anyone — neighbours, councils, NGOs, government
        agencies, traditional owners, peak bodies. The applicant must then prepare a <Em>Response
        to Submissions (RtS)</Em> document addressing each unique submission. For contentious
        projects, RtS preparation can take 6-12 months and often requires additional specialist
        work (more surveys, additional consultation, redesign).
      </P>
      <P>
        The RtS is a critical document. It usually:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Categorises submissions (e.g. "Theme 1: Visual amenity concerns", "Theme 2: Noise
          impact", "Theme 3: Cultural heritage")</li>
        <li>Provides a substantive response to each theme</li>
        <li>Outlines project amendments made in response to submissions (typically: turbine
          relocations, height reductions, additional mitigation measures, expanded community
          benefit)</li>
        <li>Restates the case for approval with conditions</li>
      </ul>

      <H2>Section 75W modifications — life after approval</H2>
      <P>
        Approvals are not the end of the planning conversation. Under <Em>Section 4.55 / Section
        75W of the EP&amp;A Act</Em>, projects can be modified post-approval — adjusting turbine
        positions, increasing tip heights (as turbine technology evolves), changing BESS
        configurations, or extending construction timeframes. Major modifications follow a
        compressed version of the EIS process. Across NSW SSD projects 2018-2024, <Em>more than
        80% of approvals have been modified at least once</Em>, and major wind farms typically go
        through 3-5 modifications between consent and construction.
      </P>

      <Callout type="key">
        The EIS is the document where most of the project risk sits. Biodiversity surveys are
        the single largest schedule risk (cannot be accelerated past 12-24 months) and offset
        costs are the single largest capex risk (4-12% of total project capex). Social impact
        and cultural heritage are the single largest reputational and legal risks. Every other
        specialist study is technically resolvable; these three are not — they are about
        relationships and time. The best-run planning teams in 2026 are the ones investing
        most in early biodiversity scoping and First Nations consultation.
      </Callout>

      <Callout type="source">
        Sources: NSW EP&amp;A Act 1979 · NSW Biodiversity Conservation Act 2016 ·
        NSW Department of Planning, Housing &amp; Infrastructure <em>Major Project Assessment
        Manual</em> · Victorian Environment Effects Act 1978 · QLD Coordinated Project
        Assessment Guidelines · SA SCAP Public Notification Procedures · Clean Energy Council
        <em> Best Practice EIS Guidelines</em> 2023.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — EPBC Act 1999
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>The Environment Protection and Biodiversity Conservation Act 1999</H2>
      <P>
        The <Em>EPBC Act</Em> is the principal federal environmental statute. Enacted by the
        Howard government in 1999 (replacing the Environment Protection (Impact of Proposals)
        Act 1974), it remains the centrepiece of Australian environmental law a quarter-century
        later — though now under sustained reform pressure.
      </P>
      <P>
        The Act regulates <Em>"controlled actions"</Em> — defined as proposed actions likely to
        have a significant impact on a Matter of National Environmental Significance (MNES).
        Without a controlled-action declaration, the Act does not apply.
      </P>

      <H2>The nine MNES</H2>
      <Table
        emphasizeFirst
        headers={['#', 'Matter', 'Section', 'Examples relevant to renewables']}
        rows={[
          ['1', 'World Heritage properties', 's12-15', 'Great Barrier Reef, Tasmanian Wilderness, Sydney Opera House catchment'],
          ['2', 'National Heritage places', 's15B-15C', 'Brewarrina Aboriginal Fish Traps, Australian Convict Sites'],
          ['3', 'Wetlands of international importance (Ramsar)', 's16-17B', 'Macquarie Marshes, NSW north-west; Coorong, SA'],
          ['4', 'Nationally listed threatened species + ecological communities', 's18-18A', 'Regent Honeyeater, Greater Glider, Box-Gum Grassy Woodland — most common trigger for wind farms'],
          ['5', 'Migratory species (international agreements)', 's20-20A', 'Shorebirds covered by JAMBA/CAMBA/ROKAMBA'],
          ['6', 'Nuclear actions', 's21-22A', 'Uranium mining, nuclear power (not yet operational in Australia)'],
          ['7', 'Commonwealth marine area', 's23-24A', 'Offshore wind in Commonwealth waters'],
          ['8', 'Great Barrier Reef Marine Park', 's24B-24E', 'Any action affecting GBR waters'],
          ['9', 'Water resources from coal seam gas + large coal mining', 's24D-24F', 'Added 2013; rarely applies to renewables'],
        ]}
      />

      <H2>The referral and controlled-action decision</H2>
      <P>
        The standard pathway for a project that may trigger an MNES:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'What happens', 'Timeframe']}
        rows={[
          ['Self-assessment', 'Proponent reviews proposal against MNES list; decides whether to refer', '–'],
          ['Referral submission', 'Proponent submits a referral via the DCCEEW EPBC portal — describes the action, identifies MNES potentially triggered, provides initial impact analysis', 'Statutory 1 business day for receipt'],
          ['Controlled-action decision', 'Minister (or delegate) decides whether the action is "controlled" — i.e. requires assessment and approval', 'Statutory 20 business days'],
          ['Method of assessment decision', 'If controlled, Minister decides method: Preliminary Documentation (lightest), Public Environment Report (PER), Environmental Impact Statement (EIS), accreditation under bilateral, or public inquiry', 'Statutory 20 business days (often runs concurrent with controlled-action decision)'],
          ['Assessment', 'Proponent prepares assessment documents per method chosen; public consultation typically required', '6-30 months depending on method'],
          ['Approval decision', 'Minister decides to approve (with conditions) or refuse', 'Statutory 40 business days from end of assessment'],
          ['Post-approval', 'Conditions monitoring; usually multi-year reporting; non-compliance can trigger civil/criminal penalties', 'Ongoing'],
        ]}
      />
      <P>
        In practice, statutory timeframes are routinely missed. The 20-business-day controlled
        action decision typically takes 40-90 days for renewables; assessment can run 18-36
        months. Total federal pathway: typically 24-48 months from referral to approval for a
        renewable energy project — overlapping but not always finishing in sequence with state
        assessment.
      </P>

      <H2>Bilateral agreements — the practical relief</H2>
      <P>
        Section 45-49 of the EPBC Act permits the Commonwealth to enter <Em>bilateral
        agreements</Em> with states. There are two types:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Bilateral Assessment Agreement</Em> — Commonwealth accepts the state's
          environmental assessment process as sufficient for federal purposes. The state runs the
          EIS process; the Commonwealth makes its own approval decision based on the state's
          assessment. Reduces duplication but Commonwealth still approves separately.</li>
        <li><Em>Bilateral Approval Agreement</Em> — Commonwealth accredits the state to make the
          approval decision on its behalf. The state's approval substitutes for the federal one.
          Eliminates duplication entirely.</li>
      </ul>
      <P>
        Most states have Bilateral Assessment Agreements; <em>none</em> currently has a Bilateral
        Approvals Agreement. The Albanese government has signalled willingness to negotiate
        approval bilaterals if states meet the National Environmental Standards being developed
        under the Nature Positive reforms.
      </P>

      <H2>The Samuel Review (2020)</H2>
      <P>
        In 2019, Professor Graeme Samuel was commissioned to conduct the second-decade statutory
        review of the EPBC Act. His final report (October 2020) made 38 recommendations under a
        scathing assessment of the existing law:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Found the Act "ineffective and not fit to address current or future environmental
          challenges"</li>
        <li>Concluded biodiversity is in continuing decline despite 20 years of EPBC operation</li>
        <li>Highlighted slow assessment timeframes, inconsistent decisions, and weak compliance</li>
        <li>Recommended a complete rebuild around <Em>National Environmental Standards</Em>, a
          federal <Em>Environment Protection Authority</Em>, and enhanced data systems
          (Environment Information Australia)</li>
        <li>Recommended faster, more decisive assessment pathways with clearer conditions and
          stronger compliance</li>
      </ul>

      <H2>The Nature Positive reforms (2022-2026)</H2>
      <P>
        In December 2022, Environment Minister Tanya Plibersek released the Albanese government's
        <Em> Nature Positive Plan</Em> as the formal response to Samuel. Key commitments and
        progress:
      </P>
      <Table
        emphasizeFirst
        headers={['Element', 'Status as of mid-2026']}
        rows={[
          ['Federal EPA (Environment Protection Australia)', 'Established by Nature Positive (Environment Protection Australia) Bill, passed late 2024; operational from 2025; takes over EPBC approval functions progressively'],
          ['Environment Information Australia (EIA)', 'Established alongside EPA; centralises environmental data and decision-support'],
          ['National Environmental Standards', 'First tranche standards published 2024-25; cover MNES decision-making, regional planning, community engagement'],
          ['Comprehensive EPBC Act rewrite (Stage 2)', 'Bills tabled 2025; passage delayed by Senate negotiations; final form uncertain'],
          ['Bilateral agreements renegotiation', 'In progress through 2025-26; new templates being developed to incorporate National Environmental Standards'],
          ['Climate Trigger', 'Proposed (would make GHG emissions an MNES) but not currently in government Bill; politically contested'],
        ]}
      />

      <H2>The Climate Trigger debate</H2>
      <P>
        Activist groups, the Greens, and some independent MPs have campaigned for a <Em>Climate
        Trigger</Em> — adding greenhouse gas emissions to the MNES list, so that any major emitting
        project would require federal climate-impact assessment. Arguments in favour:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Climate change is the largest threat to biodiversity, world heritage and Ramsar sites
          (all already MNES), making climate impact already implicit in EPBC</li>
        <li>Would give the federal government legal authority to assess and condition coal/gas
          projects beyond what the Safeguard Mechanism offers</li>
        <li>Would align Australia with environmental law in the EU and UK (EU Environmental
          Impact Assessment Directive includes climate considerations)</li>
      </ul>
      <P>
        Arguments against:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Would substantially slow the renewable energy approvals pathway (renewables generate
          measurable emissions during construction)</li>
        <li>Could create legal uncertainty for trillions of dollars of existing energy
          infrastructure</li>
        <li>Existing tools (Safeguard Mechanism, state climate Acts) address this more
          coherently</li>
      </ul>
      <P>
        The Albanese government has not included a Climate Trigger in its EPBC reform Bill,
        despite Greens and crossbench pressure. The debate is likely to recur in 2026-2028 as
        Stage 2 reforms move through Parliament.
      </P>

      <Callout type="key">
        For renewable energy developers in 2026, EPBC is a substantial overhead but rarely the
        binding timeline constraint — state planning typically takes longer. The strategic
        question is whether the bilateral pathway will deliver an Approval Bilateral (potentially
        eliminating the federal layer altogether) and whether National Environmental Standards
        will harmonise the state pathways. Both are works in progress through 2026-2027.
      </Callout>

      <Callout type="source">
        Sources: EPBC Act 1999 (consolidated) · Samuel Review of the EPBC Act (October 2020) ·
        Nature Positive Plan (DCCEEW, December 2022) · Nature Positive (Environment Protection
        Australia) Act 2024 · DCCEEW EPBC public portal · Norton Rose Fulbright
        <em> EPBC reform tracker</em> 2025-26 · Australian Conservation Foundation EPBC
        analysis.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 8 — First Nations consultation and Cultural Heritage Management
// ============================================================

function Lesson8() {
  return (
    <div>
      <H2>Three intersecting bodies of law</H2>
      <P>
        First Nations consultation in renewable project planning operates at the intersection of
        three independent bodies of law:
      </P>
      <Table
        emphasizeFirst
        headers={['Layer', 'Statute', 'What it regulates']}
        rows={[
          ['Native Title', 'Native Title Act 1993 (Cth)', 'Future Acts — when development affects native title rights; right to negotiate; ILUAs'],
          ['State cultural heritage', 'State-specific Aboriginal Cultural Heritage Acts (each state has its own)', 'Identification, protection, management of tangible cultural heritage (sites, artefacts, areas of significance)'],
          ['Federal cultural heritage', 'Aboriginal &amp; Torres Strait Islander Heritage Protection Act 1984 (Cth)', 'Federal emergency protection where state processes fail; rarely invoked but powerful'],
        ]}
      />
      <P>
        For most renewable projects, the state cultural heritage layer is the primary engagement
        point. Native Title is engaged where the project requires renewal, grant or surrender of
        land tenure. The federal Heritage Protection Act is invoked only in exceptional cases
        (typically as a final-resort protection mechanism by traditional owners).
      </P>

      <H2>State-specific cultural heritage frameworks</H2>
      <Table
        emphasizeFirst
        headers={['State', 'Principal statute', 'Key mechanism', 'Current status']}
        rows={[
          ['NSW', 'National Parks and Wildlife Act 1974 (NSW); Aboriginal Cultural Heritage Bill 2024 (proposed)', 'Aboriginal Heritage Impact Permits (AHIPs); Aboriginal Cultural Heritage Assessment Reports (ACHARs); Registered Aboriginal Parties (RAPs)', 'Standalone Aboriginal Cultural Heritage Act has been proposed multiple times since 2018; current Bill stalled; existing regime continues under NPW Act'],
          ['Victoria', 'Aboriginal Heritage Act 2006', 'Cultural Heritage Management Plan (CHMP); Aboriginal Heritage Council Victoria; Registered Aboriginal Parties (RAPs)', 'Operational and broadly accepted; consistent standalone statute'],
          ['Queensland', 'Aboriginal Cultural Heritage Act 2003; Torres Strait Islander Cultural Heritage Act 2003', 'Cultural Heritage Management Plans; duty of care; Aboriginal Party for the area', 'Operational; "duty of care" standard introduced 2003 — proponents must take reasonable steps to avoid harm'],
          ['SA', 'Aboriginal Heritage Act 1988', 'Authorisation under s23; Aboriginal Heritage Committee', 'Operational; relatively prescriptive; under review'],
          ['WA', 'Aboriginal Heritage Act 1972 (restored after 2021 Act repeal)', 'Section 18 consent process; Aboriginal Cultural Material Committee', 'Restored after the 2021 Act was repealed in 2023; under further review'],
        ]}
      />

      <H2>The Juukan Gorge episode and its consequences</H2>
      <P>
        On <Em>24 May 2020</Em>, Rio Tinto destroyed two ancient rock shelters at Juukan Gorge in
        the Pilbara region of WA. The shelters held evidence of 46,000 years of continuous human
        occupation — among the oldest verified evidence of human activity in Australia. They were
        culturally significant to the Puutu Kunti Kurrama and Pinikura Aboriginal Corporation
        (PKKPAC). Rio destroyed the shelters with the benefit of valid Section 18 consent
        obtained in 2013 under the (then) WA Aboriginal Heritage Act 1972.
      </P>
      <P>
        The destruction triggered the largest single shift in Australian corporate cultural
        heritage practice in three decades. Direct consequences:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Rio Tinto CEO Jean-Sébastien Jacques resigned</Em> in September 2020 along with
          two other senior executives</li>
        <li><Em>Federal Joint Standing Committee on Northern Australia inquiry</Em> — produced
          the "Never Again" report (October 2020), making 22 recommendations</li>
        <li><Em>Industry-wide cultural heritage protocols rewritten</Em> — every major mining
          and energy company in Australia conducted a review of cultural heritage policies and
          consent renewal practices 2020-2022</li>
        <li><Em>WA Aboriginal Cultural Heritage Act 2021</Em> — passed to replace the 1972 Act
          with a new framework incorporating Aboriginal Cultural Heritage Services (ACHS) bodies
          and management plans</li>
        <li>However, the 2021 WA Act was itself <Em>repealed and reverted to the 1972 framework
          in November 2023</Em> after sustained pushback from the agriculture and small business
          sectors over compliance complexity. The Cook Labor government cited "unintended
          consequences" and committed to further consultation</li>
      </ul>

      <H2>The standard pathway — Cultural Heritage Management Plans</H2>
      <P>
        For most renewable projects in NSW, Victoria and Queensland, the practical cultural
        heritage pathway runs through a <Em>Cultural Heritage Management Plan (CHMP)</Em> or
        equivalent. Standard structure:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'Activity', 'Typical duration']}
        rows={[
          ['1. Identify Registered Aboriginal Parties', 'Determine which traditional owner groups hold cultural authority for the project site', '1-2 months'],
          ['2. Initial consultation meetings', 'Project briefing; cultural sensitivity discussions; preliminary site walk', '2-4 months'],
          ['3. Cultural heritage survey', 'Joint walk of project area with RAP representatives; identification of sites, artefacts, areas of cultural significance', '2-6 months (often seasonal)'],
          ['4. Impact assessment', 'Specialist archaeological + ethnographic reports; assessment of avoidable vs unavoidable impacts', '3-6 months'],
          ['5. CHMP / ACHAR drafting', 'Draft management plan with avoidance, mitigation, conservation measures; ongoing consultation', '3-9 months'],
          ['6. Approval and registration', 'RAP endorsement; state Aboriginal heritage body registration', '2-6 months'],
          ['7. Implementation', 'Pre-construction inductions; cultural monitoring during ground-disturbing work; reporting', 'Project life'],
        ]}
      />
      <P>
        Total typical CHMP duration: <Em>18-30 months from initial scoping to registered
        plan</Em>. This sits inside the broader EIS timeline but cannot be accelerated past
        roughly 12-15 months even under optimal conditions, because the relationship-building
        component is inherently slow.
      </P>

      <H2>Native Title — when it engages</H2>
      <P>
        Native Title becomes a planning consideration when:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The project site is on land where Native Title has been determined (registered or
          pending)</li>
        <li>The project requires renewal, grant or surrender of land tenure (mining lease,
          pastoral lease conversion, Crown land use)</li>
        <li>The project may affect Native Title rights even if not requiring tenure change
          (rare but possible)</li>
      </ul>
      <P>
        Under the Native Title Act, certain "future acts" trigger procedural rights for Native
        Title holders. The most common is the <Em>right to negotiate</Em> for mining leases —
        which gives Native Title holders six months to negotiate an agreement, after which the
        proposed act can proceed via arbitration. For most renewable projects on freehold or
        leasehold land, Native Title is not engaged.
      </P>
      <P>
        <Em>Indigenous Land Use Agreements (ILUAs)</Em> are the formal vehicle for negotiated
        agreements between Native Title holders and project proponents. ILUAs typically cover:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Conditions of access and consent</li>
        <li>Cultural heritage protection commitments</li>
        <li>Employment and contracting opportunities</li>
        <li>Financial compensation or benefit-sharing arrangements</li>
        <li>Ongoing engagement and monitoring</li>
      </ul>

      <H2>Best-practice consultation — what the data says</H2>
      <P>
        From AURES tracking of stakeholder issues across major projects 2020-2025, four
        consistent patterns separate well-engaged from poorly-engaged projects:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Early engagement (12-18 months pre-EIS)</Em> — projects that begin Aboriginal
          Party consultation before site investigations show ~70% fewer cultural heritage
          objections at exhibition</li>
        <li><Em>Benefit-sharing structured genuinely</Em> — equity stakes (5-15%) and / or
          ongoing royalty agreements correlate with quieter approval pathways</li>
        <li><Em>Joint cultural mapping</Em> — surveys done jointly with RAP representatives,
          with cultural authority over interpretations, are more accepted than independent
          archaeology</li>
        <li><Em>Sustained relationships post-approval</Em> — projects that maintain employment
          and contracting commitments post-construction face fewer Section 75W modification
          objections</li>
      </ul>
      <P>
        The Wambo Wind Farm (QLD) is a recent counter-example. Wonnarua Nation Aboriginal
        Corporation cultural heritage concerns were raised late in the planning process and
        Stanwell / Cubico Sustainable Investments withdrew the project in early 2024 rather than
        risk a contested call-in. The replacement project being scoped in late 2024 has more
        substantive upfront First Nations engagement.
      </P>

      <Callout type="key">
        Cultural heritage and First Nations consultation are not regulatory boxes to tick —
        they are relationship-building exercises that interlock with planning, approvals, and
        ongoing operations. Projects that treat them as compliance burdens get refused,
        modified, or withdrawn. Projects that treat them as long-term partnerships proceed.
        The Juukan Gorge episode established this truth at the national-conscience level; the
        Wambo withdrawal underlined it at the project-economics level.
      </Callout>

      <Callout type="source">
        Sources: Native Title Act 1993 (Cth) · Aboriginal &amp; Torres Strait Islander
        Heritage Protection Act 1984 (Cth) · State Aboriginal cultural heritage acts (NSW,
        Vic, Qld, SA, WA) · Joint Standing Committee on Northern Australia
        <em> Never Again: Inquiry into the destruction of 46,000 year old caves at the
        Juukan Gorge in the Pilbara region of Western Australia</em> (October 2020) ·
        WA Aboriginal Cultural Heritage Act 2021 + 2023 repeal · Clean Energy Council
        <em> Best Practice First Nations Engagement Guidelines</em> 2023 · National Native
        Title Council policy statements.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 9 — Planning timelines
// ============================================================

function Lesson9() {
  return (
    <div>
      <H2>How long does planning actually take?</H2>
      <P>
        The honest answer is: longer than developers expect, and longer than AEMO's ISP
        scenarios assume. Across the NEM, typical pre-construction planning durations have
        approximately doubled since 2018 — from the late-2010s expectation of ~24 months for
        a wind farm SSD to the 2024 reality of 40-50 months. Five-year planning timelines from
        scoping to construction commencement are now common.
      </P>
      <Table
        emphasizeFirst
        headers={['Technology', 'Planning duration (scoping → consent)', 'Plus pre-construction approvals', 'Total to first construction']}
        rows={[
          ['Wind farm SSD (NSW)', '36-60 months', '+6-12 months', '~42-72 months'],
          ['Large-scale solar SSD (NSW, &gt;100 MW)', '18-36 months', '+4-8 months', '~22-44 months'],
          ['Standalone BESS &gt;30 MW (NSW)', '12-24 months', '+3-6 months', '~15-30 months'],
          ['Transmission line (CSSI)', '36-72 months', '+12-24 months', '~48-96 months'],
          ['Wind farm (Victoria, DFP pathway)', '18-30 months', '+4-8 months', '~22-38 months'],
          ['Solar farm (QLD code-assessable)', '12-24 months', '+3-6 months', '~15-30 months'],
          ['SA SCAP renewables', '18-30 months', '+4-8 months', '~22-38 months'],
          ['WA SWIS via GEAI', '18-30 months', '+6-12 months', '~24-42 months'],
        ]}
      />

      <H2>Where the time goes</H2>
      <P>
        Breaking down a typical 48-month NSW wind farm SSD timeline by stage:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'Months elapsed', 'Cumulative', 'Where delays happen']}
        rows={[
          ['Scoping + SEARs request', '3-6', '3-6', 'DPHI workload; clarification questions'],
          ['SEARs issued', '1-3', '4-9', 'Department capacity'],
          ['EIS preparation', '12-24', '16-33', 'Biodiversity multi-season surveys; ACHAR consultation; specialist study coordination'],
          ['Exhibition + RtS preparation', '6-12', '22-45', 'High submission counts requiring detailed responses; additional studies'],
          ['Government assessment + conditions drafting', '4-8', '26-53', 'Inter-agency consultation; conditions negotiation'],
          ['IPC referral (if triggered)', '6-12', '32-65', 'Public hearing scheduling; written submissions; determination'],
          ['Final determination', '1-3', '33-68', '–'],
          ['Construction approvals (CEMP, BCMP, OCEMP)', '6-12', '39-80', 'Often run in parallel with FID financing'],
        ]}
      />

      <H2>The five biggest sources of unscheduled delay</H2>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Biodiversity multi-season surveys</Em> — the only category that cannot be
          accelerated. Migratory bird surveys typically need spring + autumn + winter passes,
          driving an irreducible ~12-month minimum.</li>
        <li><Em>Modifications during exhibition</Em> — if community feedback drives a material
          project change (turbine relocation, height reduction, layout amendment), the EIS may
          require partial re-exhibition. This adds 6-12 months.</li>
        <li><Em>IPC public hearing scheduling + determination</Em> — typically adds 6-12 months
          once triggered. Hearing scheduling is constrained by IPC member availability and the
          large volume of contested applications.</li>
        <li><Em>Cultural heritage assessment</Em> — if RAP consultation reveals previously
          unknown cultural significance, the project may require redesign with associated
          delays of 6-18 months.</li>
        <li><Em>Inter-agency conditions disputes</Em> — when government agencies disagree on
          conditions (e.g. between Department of Planning and Environment Protection Authority),
          resolution can take 3-9 months.</li>
      </ul>

      <H2>The 2026-2028 planning cliff</H2>
      <P>
        AURES tracks the project pipeline. The current state shows a striking concentration of
        applications in DPHI assessment:
      </P>
      <Table
        emphasizeFirst
        headers={['NSW SSD Pipeline (mid-2026)', 'Approximate count', 'Total capacity']}
        rows={[
          ['In assessment (post-EIS, pre-determination)', '~85 projects', '~28 GW'],
          ['EIS preparation (post-SEARs)', '~120 projects', '~42 GW'],
          ['Pre-SEARs scoping', '~140 projects', '~50 GW'],
          ['Total NSW SSD renewables pipeline', '~345 projects', '~120 GW'],
        ]}
      />
      <P>
        Against that pipeline, DPHI currently has the staff capacity to determine approximately
        25-35 SSD renewables applications per year. Even with the Energy Policy Framework
        reforms streamlining the process, the assessment-stage backlog will continue to grow
        through 2026-27. Industry has flagged this as the single largest 2030 risk to the federal
        CIS target — meaning federal planning intervention (through bilateral approvals or
        federal coordinated assessment) may become politically necessary by 2027-28.
      </P>

      <H2>What is shrinking the timeline (and what isn't)</H2>
      <Table
        emphasizeFirst
        headers={['Reform / mechanism', 'Where it shortens timeline', 'Where it does not']}
        rows={[
          ['NSW Energy Policy Framework (2024)', 'Statutory SEARs response; reduced IPC referral triggers; community benefit standardisation', 'Biodiversity multi-season surveys; cultural heritage consultation'],
          ['Victorian DFP (2024)', 'Single-window assessment; bypassed local council pathway; consolidated referral agency review', 'EES panel timelines for transmission; biodiversity'],
          ['WA Green Energy Approvals Initiative (2024)', 'Coordinated multi-agency assessment; statutory targets', 'EPA referral & assessment for environmental impact'],
          ['EnergyCo NSW (2020)', 'REZ-area cumulative impact pre-clearance; aligned grid connection; shared community benefit', 'Project-specific biodiversity, cultural heritage, social impact'],
          ['Federal Nature Positive reforms (2024-26)', 'EPA accreditation streamlining; potential bilateral approvals', 'State-level planning pathway; pre-construction approvals'],
          ['Investment Delivery Authority NSW (2024)', 'Federal CIS / state planning / connection coordination for major projects', 'Standard SSD assessment workflow'],
        ]}
      />

      <Callout type="key">
        Three of the five major sources of unscheduled delay (biodiversity, cultural heritage,
        inter-agency conditions) are structural — they sit in the substance of the assessment,
        not its administrative scaffolding. The reforms in flight (Energy Policy Framework,
        DFP, GEAI, EPA Australia, IDA) primarily target the administrative scaffolding —
        compressing waiting times, reducing duplication, standardising processes. They do not
        compress the substantive review itself. The 2030 federal CIS target therefore depends
        less on planning reform pace and more on whether industry develops faster, smarter
        biodiversity and cultural heritage practices — and whether traditional owner
        engagement becomes more efficient through repeated successful precedents.
      </Callout>

      <Callout type="source">
        Sources: AURES SSD pipeline data 2024-26 · Clean Energy Council
        <em> Delivering Major Clean Energy Projects in NSW</em> 2024 · NSW DPHI Major
        Projects determination records · Baringa <em>Australian Renewable Energy Pipeline
        Tracker</em> 2025 · Victorian Auditor-General <em>Permitting Renewable Energy
        Projects</em> 2023.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 10 — Case studies
// ============================================================

function Lesson10() {
  return (
    <div>
      <H2>What the recent cases tell us</H2>
      <P>
        The 2023-2025 planning record contains roughly a dozen high-profile renewable energy
        approvals and refusals that have shaped industry expectations for the next decade.
        Reading these as a set reveals consistent lessons about what works and what doesn't.
      </P>

      <H2>Hills of Gold Wind Farm — refusal, redesign, partial approval</H2>
      <P>
        Engie's Hills of Gold Wind Farm proposed 70 turbines on the Hills of Gold range west of
        Tamworth, NSW. The project moved through SSD assessment from 2018, EIS exhibition in
        2021, and IPC referral when objections exceeded 25. The IPC's <Em>August 2023
        determination refused</Em> the original proposal — citing cumulative visual amenity
        impact when combined with other wind farms in the New England region.
      </P>
      <P>
        Engie revised the proposal — reducing the number of turbines from 70 to 47, repositioning
        several to reduce cumulative ridge-line impact, and strengthening community benefit
        commitments. The <Em>April 2024 IPC determination approved</Em> the modified proposal
        with material conditions including:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Tighter visual amenity setbacks from dwellings</li>
        <li>$1,200/MW/year community benefit fund</li>
        <li>Strengthened biodiversity offset commitments</li>
        <li>Annual cumulative-impact reporting against other approved wind farms</li>
      </ul>
      <P>
        <Em>Lesson:</Em> The IPC is willing to refuse, but is also willing to approve modifications.
        Project teams that respond to IPC reasoning with substantive changes can secure approval
        within 12-18 months of an initial refusal.
      </P>

      <H2>Spicers Creek Wind Farm — model engagement</H2>
      <P>
        Squadron Energy's Spicers Creek Wind Farm (350 MW, NSW Central Tablelands) is widely
        cited as a model of high-quality stakeholder engagement. From scoping (2019) through
        EIS (2022) and IPC determination (April 2024), the project:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Established a community reference group early — including representatives of
          objecting neighbour groups</li>
        <li>Conducted multi-season biodiversity surveys 2020-2022 covering migratory species</li>
        <li>Worked with the Wiradjuri Traditional Owners Central West Aboriginal Corporation on
          a comprehensive ACHAR</li>
        <li>Modified the project layout twice in response to community feedback — once to
          protect a culturally-significant ridge and once to address line-of-sight from a
          residential cluster</li>
        <li>Committed to local hiring (40% of construction workforce regionally sourced)</li>
      </ul>
      <P>
        The IPC determination approved with relatively standard conditions and praised the
        project's engagement methodology. Construction is expected to commence late 2026.
      </P>

      <H2>Valley of the Winds — the largest IPC-approved wind farm</H2>
      <P>
        ACEN Australia's Valley of the Winds Wind Farm (1,000 MW, NSW South West Slopes) is —
        at June 2024 IPC approval — the largest single wind farm consent in NSW history.
        Approval came after a four-year assessment process with notable features:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Multi-stage development consent — staged build-out conditions allowing initial 400
          MW Phase 1 to proceed independently</li>
        <li>$1,200/MW/year community benefit (set at the upper end of the NSW market)</li>
        <li>Comprehensive cumulative-impact analysis with the adjoining Sapphire and other South
          West Slopes wind farms</li>
        <li>Coordinated grid connection planning with EnergyCo for South West REZ</li>
      </ul>

      <H2>Lotus Creek Wind Farm — the QLD call-in success</H2>
      <P>
        Tilt Renewables' Lotus Creek Wind Farm (494 MW, central Queensland) is the most
        prominent example of the Coordinator-General call-in pathway working as intended. After
        local council assessment delays through 2022-23, the project was called in by
        Coordinator-General Toni Power in August 2023. The Coordinated Project assessment was
        completed within 10 months, and approval was granted in June 2024 with conditions
        including:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Adjusted turbine layout to address Yuin and Birri-Gubba cultural heritage concerns</li>
        <li>Bird and bat strike monitoring with adaptive management response framework</li>
        <li>Community benefit fund administered by local government</li>
        <li>Construction phasing to align with regional employment capacity</li>
      </ul>

      <H2>Wambo Wind Farm — the cautionary tale</H2>
      <P>
        Wambo Wind Farm (470 MW, Queensland's Toowoomba Range) was a Stanwell / Cubico
        Sustainable Investments joint venture that <Em>withdrew its application in early 2024</Em>
        rather than proceed through contested assessment. The withdrawal followed sustained
        concerns raised by the Wonnarua Nation Aboriginal Corporation about cultural heritage,
        compounded by community objections about visual amenity in the Toowoomba escarpment.
      </P>
      <P>
        Key features of the failure:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Cultural heritage consultation was initiated relatively late in the design process,
          giving traditional owners limited influence on project siting</li>
        <li>The project sat in a politically prominent area (Toowoomba Range escarpment, highly
          visible from regional centres)</li>
        <li>Cumulative impact was not adequately addressed early in design — the proposal sat
          alongside other contested wind proposals in the same regional area</li>
        <li>Withdrawal occurred before reaching the Coordinator-General call-in stage</li>
      </ul>
      <P>
        Stanwell has indicated it will scope a replacement project with different design and
        substantive upfront First Nations engagement. The episode reset industry expectations
        about early cultural heritage engagement being non-negotiable.
      </P>

      <H2>Western Renewables Link — the transmission lesson</H2>
      <P>
        AusNet's Western Renewables Link is a 190 km 500 kV double-circuit transmission line
        connecting the Western Victoria REZ to the Sydenham terminal station near Melbourne.
        First proposed in 2018, it has been through multiple route revisions and remains
        contested through 2025. Key issues:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Original route through high-value agricultural land triggered sustained farmer
          opposition</li>
        <li>EES (Environment Effects Statement) panel reviewed multiple route options</li>
        <li>VicGrid took over project coordination July 2024, indicating a more collaborative
          approach</li>
        <li>Final route determined late 2024; construction begins 2026</li>
        <li>Completion 2030-31 — at least 5 years behind original 2025 commissioning target</li>
      </ul>
      <P>
        The Western Renewables Link saga is the single most important reminder that transmission
        is harder to plan than generation, and that delays in transmission can strand otherwise
        approved generation projects.
      </P>

      <H2>Snowy 2.0 — the federal precedent</H2>
      <P>
        Snowy Hydro's Snowy 2.0 pumped hydro project (2,000 MW / 350 GWh) is the largest single
        federal-state planning coordination exercise in Australian energy. The project sits
        partially within Kosciuszko National Park (NSW) and triggers MNES for threatened species,
        Ramsar wetlands and water resources. EPBC approval was granted in 2019; state SSI
        approval was granted in 2020. Two modifications have followed (2021 and 2024). The
        federal-state coordinated assessment proved that complex multi-jurisdictional projects
        can move through a 5-year planning window when both governments actively prioritise.
      </P>

      <Callout type="key">
        The recurring theme across the 2023-2025 case studies is that <Em>process matters as
        much as substance</Em>. The IPC, Coordinator-General, and EPA are willing to approve
        large renewable projects — but they require evidence that the proponent has done the
        relationship-building work: with traditional owners, with local communities, with
        adjoining landowners, and with co-located projects on cumulative impact. Projects that
        get this right (Spicers Creek, Valley of the Winds, Lotus Creek) move through approval
        in 36-48 months. Projects that don't (Wambo, original Hills of Gold) face refusal,
        withdrawal, or material redesign.
      </Callout>

      <Callout type="source">
        Sources: NSW IPC determination records (Hills of Gold, Spicers Creek, Valley of the
        Winds, Liverpool Range, Thunderbolt) · Queensland Coordinator-General Coordinated
        Project records (Lotus Creek, Theodore, Mt Hopeful) · Wambo Wind Farm project
        withdrawal correspondence · AusNet Western Renewables Link EES Panel Report 2024 ·
        Snowy 2.0 EPBC approval and state SSI consent · Clean Energy Council case study
        compendium 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 11 — Acceleration levers
// ============================================================

function Lesson11() {
  return (
    <div>
      <H2>The coordination problem</H2>
      <P>
        Australian renewable project planning has historically suffered from a fragmentation
        problem: federal environmental approval, state planning, transmission planning, local
        council approvals, cultural heritage consultation, native title processes, and federal
        capacity contracts all proceed somewhat independently. Each layer is sensible in
        isolation; together they create overlapping and serial delays that have approximately
        doubled total project timelines over the past decade.
      </P>
      <P>
        From 2020 onwards, three jurisdictions have built coordination bodies designed to
        compress these timelines. None has fully solved the problem, but each has shifted
        practice meaningfully.
      </P>

      <H2>EnergyCo NSW — the REZ coordinator</H2>
      <P>
        The <Em>Energy Corporation of NSW (EnergyCo)</Em>, established 2020 under the Energy
        Infrastructure Investment Act, is the clearest example of an integrated REZ coordinator
        in Australia. Its mandate:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Identify and declare Renewable Energy Zones (5 declared by 2026)</li>
        <li>Coordinate transmission planning within each REZ (Central-West Orana transmission,
          New England transmission, Hunter-Central Coast offshore connection studies)</li>
        <li>Manage Access Authorization Schemes — pre-qualifying projects, allocating connection
          capacity, sequencing build-out</li>
        <li>Work with DPHI to align project planning assessment within declared REZs</li>
        <li>Manage REZ-level community engagement (cumulative impact baselines, regional
          benefit-sharing frameworks)</li>
      </ul>
      <P>
        EnergyCo does not approve individual projects — that remains a DPHI / IPC function. But
        it provides the regional coordination layer that makes individual project assessment
        more efficient. Projects within a declared REZ benefit from cleared cumulative-impact
        baselines, aligned grid connection sequencing, and faster referral-agency turnaround.
      </P>

      <H2>Investment Delivery Authority (IDA) NSW</H2>
      <P>
        Announced in November 2024 alongside the Energy Policy Framework, the <Em>Investment
        Delivery Authority</Em> represents NSW's clearest commitment to project-level
        coordination. The IDA operates as a senior-level coordination forum across DPHI,
        EnergyCo, Treasury, the Premier's department, and federal agencies for major
        CIS-contracted projects. Specifically:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Single point of contact for major CIS projects navigating NSW state planning</li>
        <li>Statutory milestone tracking — pre-FID, FID, construction commencement</li>
        <li>Issue-resolution forum when projects encounter coordination problems between
          agencies</li>
        <li>Integration with federal CIS contract conditions (e.g. ensuring NSW planning aligns
          with federal COD requirements)</li>
      </ul>

      <H2>VicGrid Victoria — transmission + REZ coordination</H2>
      <P>
        Victoria's <Em>VicGrid</Em> (established 2022, expanded 2024) covers similar functions to
        EnergyCo, with particular emphasis on transmission:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Identification of Victorian Renewable Energy Zones (6 declared)</li>
        <li>Coordination of REZ transmission infrastructure (Western Renewables Link, North-West
          REZ network, Gippsland offshore wind interconnection)</li>
        <li>Access Authorization Schemes for project pre-qualification</li>
        <li>Integration with the Development Facilitation Program for projects within declared
          V-REZ areas</li>
      </ul>

      <H2>Federal coordination — the bilateral pathway</H2>
      <P>
        Federally, the most promising coordination mechanism is the <Em>bilateral
        approval agreement</Em> envisaged under the Nature Positive reforms. Under such an
        agreement, the Commonwealth would delegate EPBC approval decisions to an accredited
        state body (subject to compliance with National Environmental Standards). For
        renewables, this would effectively eliminate the federal layer — a single state
        approval would suffice.
      </P>
      <P>
        Negotiations through 2025-2026 between DCCEEW, state environment departments, and
        development industry stakeholders have been productive but slow. Final agreements are
        not expected before 2027. In the interim, <Em>Bilateral Assessment Agreements</Em>
        (where Commonwealth uses state assessment but retains its own approval decision) are
        active in every state and remain the primary federal-state interface for most
        renewables.
      </P>

      <H2>The CIS as a planning lever</H2>
      <P>
        The federal Capacity Investment Scheme adds an indirect coordination mechanism. CIS
        contracts include <Em>milestone-based payment conditions</Em> referencing key planning
        and construction stages. The practical effect:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Federal contract carries a milestone date for planning approval</li>
        <li>If planning approval is delayed past the contract date, the proponent must seek
          an extension</li>
        <li>The federal government can use these extensions as leverage points for federal-state
          coordination conversations</li>
        <li>NSW IDA was substantially created in response to federal concern about CIS
          milestone slippage on early projects</li>
      </ul>
      <P>
        This indirect mechanism is meaningful. The 2023-2024 IDA establishment in NSW was, by
        most accounts, accelerated by federal pressure regarding CIS Tender 1 project planning
        progress. The same mechanism is now in dialogue for Queensland and Victoria.
      </P>

      <H2>WA Green Energy Approvals Initiative</H2>
      <P>
        WA's coordination answer — the <Em>Green Energy Approvals Initiative (GEAI)</Em>,
        operational April 2024 — focuses on the multi-agency assessment problem unique to WA's
        regulatory architecture. The GEAI provides:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Single-window submission across WAPC, EPA, DWER, DBCA and relevant councils</li>
        <li>Coordinated specialist study reviews (no agency duplicates analysis)</li>
        <li>Statutory target assessment timeframes (18-24 months)</li>
        <li>Pre-lodgement environmental and cultural heritage scoping support</li>
        <li>Integration with the Western Power SWIS Long-Term Network Plan</li>
      </ul>

      <H2>What's still missing</H2>
      <P>
        Three structural coordination gaps remain in 2026:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Federal-state Bilateral Approvals</Em> — none yet operational; would meaningfully
          compress the federal layer</li>
        <li><Em>National cultural heritage framework</Em> — state-by-state regimes remain
          inconsistent; the post-Juukan reforms have stalled in some states (WA), advanced in
          others (Victoria)</li>
        <li><Em>Connection / planning sequencing</Em> — connection commitments are still
          allocated before planning approval, creating risk of stranded connection capacity if
          planning fails. EnergyCo Access Authorization Schemes partially address this but
          implementation remains incomplete</li>
      </ul>

      <H2>The strategic question for developers</H2>
      <P>
        Inside the current coordination framework, the development teams winning are those that:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Engage with EnergyCo / VicGrid / GEAI bodies at scoping rather than at lodgement</li>
        <li>Apply for CIS contracts that align with planning milestone reality (not optimistic
          scenarios)</li>
        <li>Invest in First Nations consultation and biodiversity scoping 12-18 months before
          first planning lodgement</li>
        <li>Map cumulative impact actively against adjoining proposed projects, rather than
          relying on the assessment to resolve it</li>
        <li>Maintain political-stakeholder relationships at federal, state and local levels —
          recognising that coordination bodies operate inside political constraints</li>
      </ul>

      <Callout type="key">
        Australia's renewable planning landscape in 2026 is roughly two years into a major
        reform cycle that will likely take another four to six years to complete. The
        coordination bodies — EnergyCo, IDA, VicGrid, GEAI — have shifted practice but have
        not fundamentally compressed the substantive review. The next major shift will come
        from federal-state Bilateral Approvals (under Nature Positive Stage 2) and from
        improved First Nations consultation practice across the development industry. Both
        are works in progress and neither has been delivered at scale. Development teams that
        understand and engage with this landscape proactively will deliver projects 12-24
        months faster than those that don't — a multi-hundred-million-dollar difference per
        major project.
      </Callout>

      <Callout type="source">
        Sources: Energy Infrastructure Investment Act 2020 (NSW) · NSW Energy Policy
        Framework + Investment Delivery Authority announcements (December 2024) · VicGrid
        Annual Plan 2025 · WA Green Energy Approvals Initiative (April 2024) · DCCEEW
        bilateral agreement renegotiation working papers 2025 · Clean Energy Council
        <em> Coordination Architecture Recommendations</em> 2025.
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
          <span className="text-3xl" aria-hidden>🏛️</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
            ✅ Available
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight"
          style={{ borderLeft: '4px solid #a855f7', paddingLeft: 12, marginLeft: -12 }}>
          Planning Approval Pathways for Renewable Projects
        </h1>
        <p className="text-base italic text-[var(--color-text-muted)]">
          State + EPBC + First Nations + cumulative impact — the planning system as practical strategy.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          The planning system is the single biggest source of pre-construction timeline risk for
          renewable projects. This 11-lesson module covers the two-track state + federal structure,
          state-by-state pathways (NSW, VIC, QLD, SA, WA), the EIS process, the EPBC Act, First
          Nations consultation and cultural heritage management, planning timelines and the 2026
          assessment cliff, recent case studies from the IPC and Coordinator-General, and the
          coordination bodies that are trying to compress timelines — EnergyCo, IDA, VicGrid,
          and the WA Green Energy Approvals Initiative.
        </p>
      </div>

      <div className="space-y-3">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          return (
            <Link key={l.id} to={`/learn/planning-approvals/${l.id}`}
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
            <span className="text-[var(--color-text-muted)] ml-2">— CIS/LTESA awards alongside planning status</span>
          </li>
          <li>
            <Link to="/intelligence/asset-lifecycle" className="text-[var(--color-primary)] hover:underline">
              Asset Lifecycle →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— how projects move from planning through construction</span>
          </li>
          <li>
            <Link to="/learn/nsw-rez" className="text-[var(--color-primary)] hover:underline">
              NSW REZs &amp; Transmission module →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— transmission planning as the binding constraint</span>
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
        <Link to="/learn/planning-approvals" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← Planning Approval Pathways
        </Link>
        <span className="text-[var(--color-text-muted)]">Lesson {lesson.number} of {LESSONS.length} · {lesson.readingTime}</span>
      </div>

      <div className="space-y-1 pb-4 border-b border-[var(--color-border)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Lesson {lesson.number}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight">{lesson.title}</h1>
        <p className="text-base italic text-[var(--color-text-muted)]">{lesson.subtitle}</p>
      </div>

      <article className="text-[15px] text-[var(--color-text-muted)]">
        {lesson.id === 'two-track'     && <Lesson1 />}
        {lesson.id === 'nsw'           && <Lesson2 />}
        {lesson.id === 'vic'           && <Lesson3 />}
        {lesson.id === 'qld'           && <Lesson4 />}
        {lesson.id === 'sa-wa'         && <Lesson5 />}
        {lesson.id === 'eis'           && <Lesson6 />}
        {lesson.id === 'epbc'          && <Lesson7 />}
        {lesson.id === 'first-nations' && <Lesson8 />}
        {lesson.id === 'timelines'     && <Lesson9 />}
        {lesson.id === 'case-studies'  && <Lesson10 />}
        {lesson.id === 'acceleration'  && <Lesson11 />}
      </article>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/planning-approvals/${prev.id}`)}
            className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/planning-approvals/${next.id}`) }}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-colors">
            {progress.has(lesson.id) ? 'Continue' : 'Mark read & continue'} → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/planning-approvals') }}
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

export default function PlanningApprovalsModule() {
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
        <Link to="/learn/planning-approvals" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to module index
        </Link>
      </div>
    )
  }

  return <LessonView lesson={lesson} progress={progress} onComplete={onComplete} />
}
