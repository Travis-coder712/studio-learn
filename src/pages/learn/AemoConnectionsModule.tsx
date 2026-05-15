/**
 * AEMO Connection Process for New Developments — AURES Learning Module
 *
 * 11 lessons covering the full connection journey: feasibility, NER 5.3.4
 * application, Generator Performance Standards, system studies, system
 * strength, MLFs, cost allocation, commissioning (R1/R2), recent reforms,
 * and the current connection queue.
 */
import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-aemo-connections-progress'

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
  { id: 'journey',          number: 1,  title: 'The connection journey end-to-end',                     subtitle: 'Feasibility → 5.3.4 → GPS → studies → offer → R1 → R2',           readingTime: '11 min' },
  { id: 'feasibility',      number: 2,  title: 'Connection point selection and feasibility',            subtitle: 'The pre-application work where most timeline pain lives',         readingTime: '12 min' },
  { id: '5341',             number: 3,  title: 'NER 5.3.4 — the formal Application for Connection',     subtitle: 'Mandatory data, functional specification, offer to connect',      readingTime: '12 min' },
  { id: 'gps',              number: 4,  title: 'Generator Performance Standards — the 14 standards',    subtitle: 'S5.2.5.1 to S5.2.5.14, Automatic vs Negotiated vs Minimum',       readingTime: '14 min' },
  { id: 'studies',          number: 5,  title: 'System studies and modelling — PSS/E, PSCAD, RMS',      subtitle: 'EMT vs RMS, equipment models, AEMO and NSP review cycles',        readingTime: '13 min' },
  { id: 'system-strength',  number: 6,  title: 'System strength — the binding constraint since 2018',   subtitle: 'SCR, declared shortfalls, synchronous condensers, the SSS framework', readingTime: '14 min' },
  { id: 'mlfs',             number: 7,  title: 'Marginal Loss Factors — the revenue you didn\'t plan to lose', subtitle: 'How MLFs are set, the 2018-2024 degradation story, regional impacts', readingTime: '12 min' },
  { id: 'costs',            number: 8,  title: 'Connection cost allocation',                            subtitle: 'NSP vs proponent costs, shared-network charges, REZ frameworks',  readingTime: '11 min' },
  { id: 'r1-r2',            number: 9,  title: 'R1, R2 and the commissioning hold-points',              subtitle: 'How a project actually gets onto the grid (and why R2 has been delayed)', readingTime: '12 min' },
  { id: 'reforms',          number: 10, title: 'Recent reforms — AEMC, Engineering Framework, CFD',     subtitle: 'What 2022-2026 has changed and what hasn\'t',                     readingTime: '12 min' },
  { id: 'queue',            number: 11, title: 'The connection queue today — what it actually looks like', subtitle: 'AURES data, CEC Scorecard, TNSP-by-TNSP status, 2030 outlook',  readingTime: '12 min' },
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
// Lesson 1 — The connection journey end-to-end
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>Why the connection process is one of the biggest determinants of project NPV</H2>
      <P>
        For every wind, solar or battery project in Australia, there is a single moment that
        decides whether the asset earns revenue: the day it formally registers with AEMO and
        starts dispatching at its full registered capacity. That moment is the end of the
        <Em> connection process</Em> — and reaching it has become, over the past five years, the
        single biggest source of project schedule and cost surprise in the NEM. A project that
        secures planning approval but cannot navigate the connection process arrives at the
        electricity market roughly 18-36 months late, at higher cost, and often with materially
        reduced capacity factor because of conditions imposed during the connection negotiation.
      </P>

      <H2>The seven stages of the connection journey</H2>
      <P>
        At a high level, every NEM-connecting project moves through the same seven stages:
      </P>
      <Table
        emphasizeFirst
        headers={['#', 'Stage', 'Typical duration', 'Key output']}
        rows={[
          ['1', 'Feasibility + Pre-application Studies', '3-9 months', 'Connection-point selection, preliminary load flow, NSP scoping report'],
          ['2', 'NER 5.3.4 Application for Connection', '1-3 months', 'Formal application; mandatory data set submitted'],
          ['3', 'Negotiation of Generator Performance Standards', '6-18 months', 'Agreed 14 GPS standards; Connection Application Studies'],
          ['4', 'System Studies and Modelling', '6-12 months', 'PSS/E, PSCAD, RMS studies; GPS compliance demonstration'],
          ['5', 'Offer to Connect / Connection Agreement', '3-6 months', 'Negotiated; signed Connection Agreement (CA)'],
          ['6', 'Construction + Commissioning', '12-30 months', 'Plant built; initial energisation (R1); hold-point testing'],
          ['7', 'Full Registration (R2)', '6-18 months after R1', 'AEMO market participation registration at full nameplate'],
        ]}
      />
      <P>
        Total NEM connection journey today: <Em>typically 36-50 months from feasibility to R2
        registration</Em>. This sits in parallel with planning approval (covered in the Planning
        module) — meaning the dual-path pre-construction journey for a typical wind or solar
        project now takes ~4-5 years from initial site identification to first dispatch.
      </P>

      <H2>The three parties — AEMO, NSP, proponent</H2>
      <P>
        Three institutional players sit across the connection journey, with different roles at
        each stage:
      </P>
      <Table
        emphasizeFirst
        headers={['Party', 'Role', 'When most involved']}
        rows={[
          ['AEMO (Australian Energy Market Operator)', 'Establishes Generator Performance Standards; reviews studies for system security; approves R1/R2 registration; manages the connection queue', 'Stages 3-7 (GPS, studies, R1, R2)'],
          ['NSP (Network Service Provider) — TransGrid, Powerlink, AusNet, ElectraNet, Western Power', 'Owns the transmission network; assesses connection-point capacity; designs network reinforcement; issues Offer to Connect; signs Connection Agreement; operational interface', 'Stages 1-6 (most stages)'],
          ['Proponent / Project Developer', 'Selects technology + connection point; commissions all studies; engineers the connection asset; meets GPS standards; constructs + commissions', 'All stages'],
        ]}
      />
      <P>
        The split between AEMO and the NSP is critical. AEMO is the market operator and has
        statutory responsibility for system-wide security and reliability — including the right
        to refuse a connection if the proposed plant would degrade system strength. The NSP is
        the asset owner — it owns the transmission line, the substation, the switchyard — and
        any required network upgrade must be agreed with the NSP. <Em>Disagreements between
        AEMO and the NSP about study methodology, equipment models, and system strength
        assumptions are a primary source of delay</Em>.
      </P>

      <H2>NER Chapter 5 — the regulatory framework</H2>
      <P>
        The connection process is governed by Chapter 5 of the National Electricity Rules (NER) —
        a binding rulebook maintained by the AEMC and updated by rule change every 12-24 months.
        Key provisions:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>NER 5.3.4</Em> — Application for Connection. The legal moment that starts the
          formal connection process.</li>
        <li><Em>NER 5.3.4A</Em> — Negotiated Connection Application pathway (for non-standard or
          complex projects).</li>
        <li><Em>NER 5.2.5</Em> — Generator Performance Standards (the 14 standards explored in
          Lesson 4).</li>
        <li><Em>NER 5.3.7</Em> — Connection Agreement requirements.</li>
        <li><Em>NER 5.3.9</Em> — Hold-points and R1/R2 commissioning.</li>
      </ul>

      <H2>Why "12 months" became "36+ months"</H2>
      <P>
        Through 2010-2017, a "normal" connection journey was 18-30 months. Today it is routinely
        36-50+ months. The shift is structural, not cyclical:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Inverter-based resource complexity</Em> — modern wind and solar are connected
          via power electronics, not synchronous machines. The electromagnetic behaviour of
          inverter-based resources (IBRs) is fundamentally harder to model and predict than
          synchronous generators. PSCAD studies that took 4 weeks in 2017 routinely take 6-12
          months in 2026.</li>
        <li><Em>System strength gap</Em> — as coal retires, the synchronous fault current
          available at any node in the grid declines. New IBRs have a minimum system strength
          requirement; meeting it has become the binding constraint at many connection points.</li>
        <li><Em>AEMO and NSP review capacity</Em> — both have grown rapidly but cannot match
          the application volume. Queue depth at each major NSP is 80-200+ projects.</li>
        <li><Em>Equipment model availability</Em> — inverter manufacturers (especially Chinese
          OEMs) have been slow to release the detailed simulation models AEMO requires. Some
          projects have waited 8-12 months for an updated model.</li>
        <li><Em>Rule change uncertainty</Em> — multiple AEMC rule changes 2017-2023 (system
          strength, fast frequency response, primary frequency response) have shifted the
          target standards mid-application for many projects.</li>
      </ul>

      <H2>Tier 1 / 2 / 3 plant classification</H2>
      <P>
        Under NER 5.2.5, generating plant is classified into three tiers based on size and
        connection point voltage:
      </P>
      <Table
        emphasizeFirst
        headers={['Tier', 'Plant size threshold', 'Connection process intensity', 'Examples']}
        rows={[
          ['Tier 1 (Scheduled)', '≥ 30 MW (5 MW for SA gas, NSW remote area)', 'Full 5.3.4 process; all 14 GPS standards apply; AEMO Engineering Framework requirements', 'Most utility-scale wind, solar, BESS'],
          ['Tier 2 (Semi-scheduled / Non-scheduled)', '5-30 MW (most jurisdictions)', 'Modified 5.3.4 process; some GPS standards apply', 'Mid-scale solar + BESS'],
          ['Tier 3 (Small generators)', '< 5 MW', 'Simplified connection process; lighter GPS', 'Small commercial solar + BESS, embedded generation'],
        ]}
      />
      <P>
        Most projects this module discusses are <Em>Tier 1 scheduled generators</Em> — the
        connection process at this tier is the most rigorous, longest, and most expensive. The
        following lessons focus on this pathway.
      </P>

      <Callout type="key">
        The AEMO connection process is fundamentally about ensuring that any new plant joining
        the NEM does not degrade the system's ability to deliver reliable, secure electricity
        to consumers. As the grid evolves from synchronous coal to inverter-based renewables,
        the technical standards have had to evolve too — and the process of negotiating those
        standards plant-by-plant has become the single biggest schedule risk in Australian
        renewable project development. Understanding this process is the difference between
        successful project delivery and stranded investment.
      </Callout>

      <Callout type="source">
        Sources: National Electricity Rules Chapter 5 · AEMO Connection portal documentation ·
        AEMO Engineering Framework · Clean Energy Council Connection Scorecard 2024 ·
        NER 5.2.5 (Generator Performance Standards) · AEMC Rule Change registers 2017-2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — Connection point selection and feasibility
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>Where most of the timeline pain actually starts</H2>
      <P>
        Industry-experienced developers will tell you that the connection problems they encounter
        at GPS negotiation, system studies, or R2 commissioning <em>were created during the
        feasibility phase</em> — by suboptimal connection point selection, inadequate
        preliminary studies, or unrealistic assumptions about network capacity. The feasibility
        phase is the single highest-leverage opportunity to compress later timelines and reduce
        connection cost.
      </P>

      <H2>Connection point selection — the three options</H2>
      <P>
        A new generator can connect to the grid in one of three ways:
      </P>
      <Table
        emphasizeFirst
        headers={['Option', 'Description', 'Capex implication', 'Timeline implication']}
        rows={[
          ['Existing substation', 'Connect at an existing transmission substation', 'Lower (no new substation); ~$5-15M for connection asset + LV cable run', 'Faster if the substation has capacity; otherwise requires upgrade'],
          ['New spur line to existing line', 'Build a new spur line from the project to an existing transmission line', 'Medium ($10-40M depending on length)', 'Requires NSP design + easement; 12-24 months for the spur alone'],
          ['New substation greenfield', 'Build a new substation at a strategic node, then a transmission line back to existing grid', 'High ($30-150M+ for substation; transmission line ~$1-2M/km double-circuit)', 'Slowest — substation construction itself 24+ months'],
        ]}
      />

      <H2>The capacity question — is there room at the connection point?</H2>
      <P>
        Every existing transmission substation has a limited "hosting capacity" — the maximum
        generation it can accept before voltage or thermal constraints are breached. Hosting
        capacity is a function of:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Transformer capacity</Em> — substation transformers have rated MVA; once exceeded,
          you need a new transformer (12-18 month lead time)</li>
        <li><Em>Network flow constraints</Em> — outflowing transmission lines may already be at
          capacity during peak periods</li>
        <li><Em>Voltage support</Em> — the connection point must maintain steady-state voltage
          within statutory bounds (±5% of nominal). Heavy generation can push voltage high; new
          plant may need to provide voltage control (Var support, typically via STATCOM or
          dynamic reactive power control)</li>
        <li><Em>System strength</Em> — the local short-circuit ratio (SCR) — covered in Lesson
          6 — determines whether the network can support a new IBR</li>
      </ul>
      <P>
        NSPs typically publish a <Em>Network Capability Map</Em> or "load flow heatmap"
        identifying which connection points have remaining capacity. TransGrid, Powerlink,
        ElectraNet and AusNet all maintain public versions. The Clean Energy Council also
        publishes annual Connection Scorecards showing remaining hosting capacity at each major
        NEM substation.
      </P>

      <H2>NSP scoping fees and the preliminary studies</H2>
      <P>
        Before a proponent submits a formal 5.3.4 application, the NSP will typically offer a
        <Em> Pre-Application Service</Em> or <Em>Connection Enquiry</Em> at a fee. Typical
        scoping deliverables:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Preliminary load-flow studies (PSS/E)</li>
        <li>Network capability assessment for the proposed connection</li>
        <li>High-level identification of network reinforcement requirements</li>
        <li>Indicative cost estimate for the connection asset + shared network upgrades</li>
        <li>System strength assessment at the proposed connection point</li>
      </ul>
      <P>
        Scoping fees range from <Em>$30,000-150,000</Em> depending on NSP and project size, and
        typically take <Em>3-6 months</Em> to complete. The fee is non-refundable but the work
        feeds directly into the proponent's later 5.3.4 application.
      </P>

      <H2>Pre-application data the proponent needs</H2>
      <P>
        To get useful scoping work from the NSP, the proponent must already have a substantial
        amount of project data:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Plant nameplate capacity (MW, MVA, MWh for BESS)</li>
        <li>Technology type (wind, solar, BESS, hybrid)</li>
        <li>Equipment manufacturer (inverter OEM is critical — model availability differs)</li>
        <li>Connection point preference + alternative options</li>
        <li>Indicative commissioning year</li>
        <li>Connection asset preliminary design (proponent's responsibility)</li>
      </ul>
      <P>
        For greenfield sites, the proponent will commission their own preliminary studies before
        engaging the NSP — typically by a specialist consultancy (Aurecon, GHD, EY ROAM,
        DIgSILENT Pacific, Baringa). These independent studies de-risk later NSP findings and
        give the developer negotiating leverage.
      </P>

      <H2>Equipment model availability — the IBR problem</H2>
      <P>
        Modern wind and solar projects rely on inverter-based resources. AEMO's GPS compliance
        studies require detailed mathematical models of every inverter type the project will
        deploy — both <Em>RMS models</Em> (phasor-domain, used for PSS/E load flow) and
        <Em> EMT models</Em> (electromagnetic transient, used for PSCAD studies). Models must
        be:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Validated against laboratory and field measurements</li>
        <li>Accompanied by full control system documentation</li>
        <li>Version-controlled and supported by the OEM for the project's full operating life</li>
      </ul>
      <P>
        Equipment model availability has become a significant constraint:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Western inverter OEMs (SMA, ABB, Fluence, Tesla) — generally good model availability,
          released early in product cycle</li>
        <li>Chinese inverter OEMs (Huawei, Sungrow, Goodwe, Solis) — historically slower to
          release detailed models for AEMO compliance; gap has narrowed 2023-2026 but still a
          consideration</li>
        <li>New wind turbine models (e.g. Goldwind GWH266, Vestas V172-7.2 MW) — model release
          often lags commercial availability by 12-18 months</li>
      </ul>
      <P>
        <Em>Verifying model availability for the chosen inverter/turbine should be a feasibility-
        phase question</Em> — not something discovered during GPS negotiations. Some projects
        have switched OEMs late in development purely because the original choice did not have
        suitable models available.
      </P>

      <Callout type="warn">
        A common project failure pattern: developer selects connection point based on land
        availability and grid proximity, without checking system strength or equipment model
        availability. 18 months later, AEMO declares insufficient system strength at that node;
        another 6 months later, the inverter OEM cannot deliver a compliant EMT model. The
        project's planning approval is sound but the connection has slipped 24-36 months. This
        is preventable with thorough feasibility-phase work.
      </Callout>

      <H2>The Pre-Application Service trade-off</H2>
      <P>
        Some developers, particularly in their second or third NEM project, skip part of the
        NSP Pre-Application Service in favour of moving more quickly into the formal 5.3.4
        application. The trade-off:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Faster start</Em> — saves 3-6 months at the front end</li>
        <li><Em>Higher risk of redo</Em> — if the formal application discovers issues that
          scoping would have revealed, the project may need to restart at NER 5.3.4 (losing 3-9
          months)</li>
      </ul>
      <P>
        Industry practice in 2026 is to do at least a partial Pre-Application Service for any
        greenfield site, even where the developer has prior NEM experience. The economics favour
        spending the $50-150k early rather than discovering the same information 18 months
        deeper into the application.
      </P>

      <Callout type="source">
        Sources: TransGrid Connection Guide · Powerlink Connection Process Manual · AusNet
        Connection Portal · ElectraNet Generator Connection Guide · Western Power Generator
        Access Guide (SWIS) · Clean Energy Council Connection Scorecard 2024 ·
        DIgSILENT Pacific <em>Connection Feasibility Best Practice</em> 2023.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — NER 5.3.4: Application for Connection
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>The legal moment when the formal connection process starts</H2>
      <P>
        The submission of an Application for Connection under <Em>NER 5.3.4</Em> is the legal
        moment when the formal connection process begins. From this point, the NSP has
        statutory obligations to assess, study, negotiate and (assuming successful negotiation)
        offer a Connection Agreement. The applicant pays a substantial application fee — the
        magnitude varies by NSP and project complexity, typically $80,000 to $500,000+ for a
        major Tier 1 plant.
      </P>

      <H2>What goes into a 5.3.4 application</H2>
      <P>
        A complete 5.3.4 application has a substantial mandatory data set. The NSP cannot
        progress the application until all data is provided. Typical contents:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project description</Em> — nameplate capacity (MW), maximum and minimum
          generation, storage capacity (MWh for BESS), technology type, expected operating
          regime</li>
        <li><Em>Site identification</Em> — coordinates, land area, layout drawings, connection
          asset preliminary design</li>
        <li><Em>Connection point</Em> — proposed connection point, alternative connection points
          considered, network capability assessment results</li>
        <li><Em>Equipment specifications</Em> — inverter/turbine manufacturer + model, transformer
          specifications, switchyard configuration, protection relays</li>
        <li><Em>Mandatory data set</Em> — equipment electrical characteristics (impedances,
          reactances, X/R ratios), control system documentation, transformer details, cable
          specifications, plant single-line diagram</li>
        <li><Em>Plant model</Em> — preliminary RMS and EMT models of the plant suitable for
          NSP and AEMO studies</li>
        <li><Em>Functional Specification</Em> — proposed Generator Performance Standards for
          each of the 14 GPS standards (Automatic / Negotiated / Minimum)</li>
        <li><Em>Commissioning programme</Em> — preliminary R1 and R2 timeline</li>
        <li><Em>Project schedule</Em> — FID date, construction commencement, commissioning</li>
      </ul>

      <H2>The Functional Specification — the heart of the application</H2>
      <P>
        The <Em>Functional Specification</Em> is the document where the proponent proposes the
        Generator Performance Standards their plant will meet. For each of the 14 standards
        under NER 5.2.5, the proponent specifies whether they will meet the:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Automatic Standard</Em> — the default standard; if met, no further negotiation
          required for that standard</li>
        <li><Em>Negotiated Standard</Em> — a project-specific standard, lower than Automatic but
          higher than Minimum, individually negotiated with AEMO + NSP</li>
        <li><Em>Minimum Standard</Em> — the floor below which AEMO will not accept; if met
          alone, the project may have operational restrictions</li>
      </ul>
      <P>
        The Functional Specification + initial system studies form the basis for the
        <em> negotiation</em> with AEMO and the NSP over the following 6-18 months. Most projects
        propose Automatic standards for most standards, Negotiated for some, and Minimum for
        none. The negotiation typically tightens some standards (where the plant can do better)
        and relaxes others (where it cannot).
      </P>

      <H2>Cost and access principles</H2>
      <P>
        Once the 5.3.4 application is accepted as complete, the NSP begins detailed studies and
        develops the <Em>Offer to Connect</Em>. The offer covers:
      </P>
      <Table
        emphasizeFirst
        headers={['Element', 'What it specifies']}
        rows={[
          ['Connection point', 'Final connection point location and voltage level (e.g. 132 kV, 220 kV, 330 kV, 500 kV)'],
          ['Connection asset boundary', 'The "point of common coupling" (PCC) — where the proponent\'s asset meets the NSP\'s network'],
          ['Generator Performance Standards', 'Final agreed standards across all 14 categories'],
          ['Connection capex', 'Cost of connection asset (proponent) + shared network reinforcement (NSP cost-recovered from proponent)'],
          ['Operational requirements', 'Telemetry, communications, control room interface, SCADA data flows'],
          ['Commissioning programme', 'R1 + R2 timeline + hold-points'],
          ['Termination clauses', 'When connection may be revoked + dispute resolution'],
        ]}
      />

      <H2>Cost and access — the legal framework</H2>
      <P>
        Cost and access principles under NER Chapter 5 are governed by three broad principles:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>User-pays</Em> — the proponent pays for all capex specifically associated with
          their connection (the "connection asset" beyond the PCC, plus any network upgrade
          required by their connection that wouldn't otherwise occur)</li>
        <li><Em>Shared network</Em> — for upgrades that benefit other users or future connections,
          cost-sharing rules apply. The proponent may pay all up-front but receive partial
          rebates as subsequent users connect. The AER's Connection Charging Guideline governs
          this.</li>
        <li><Em>Open access</Em> — the network must accept any new connection that meets GPS
          standards and pays connection costs, provided system security can be maintained.
          This open-access principle is foundational to the NEM but is now constrained by
          system strength and capacity limits.</li>
      </ul>

      <H2>5.3.4 vs 5.3.4A — the negotiated pathway</H2>
      <P>
        For complex projects, the NER offers a parallel pathway under <Em>NER 5.3.4A</Em> —
        Negotiated Connection Application. This pathway is used when:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The project involves non-standard equipment configurations</li>
        <li>The project requires substantial customisation of the standard process</li>
        <li>The proponent wishes to negotiate connection terms before formal application</li>
        <li>Hybrid projects (e.g. wind + solar + BESS at the same connection) where standard
          application doesn't fit cleanly</li>
      </ul>
      <P>
        Under 5.3.4A, the proponent and NSP negotiate terms directly, then the agreed terms are
        documented in a Negotiated Connection Application. This pathway is used less than the
        standard 5.3.4 path but is increasingly relevant for complex hybrid projects.
      </P>

      <H2>The application fee economics</H2>
      <P>
        NSP application fees vary widely but reflect the substantial review work involved:
      </P>
      <Table
        emphasizeFirst
        headers={['NSP', 'Indicative application fee', 'Notes']}
        rows={[
          ['TransGrid (NSW)', '$150,000-500,000', 'Higher fees for larger or more complex projects'],
          ['Powerlink (QLD)', '$100,000-400,000', 'Lower base; system strength studies extra'],
          ['AusNet (VIC)', '$100,000-350,000', 'Modular fee structure'],
          ['ElectraNet (SA)', '$80,000-250,000', 'Smaller market; lower base fee'],
          ['Western Power (WA SWIS)', '$120,000-300,000', 'SWIS-specific; not NER-governed'],
        ]}
      />
      <P>
        These fees are typically refundable in part if the project does not proceed, but the
        scoping and preliminary review work performed before the offer is issued is non-
        recoverable. Industry practice is to budget $200,000-500,000 of NSP fees across the
        full application + offer process.
      </P>

      <Callout type="key">
        The 5.3.4 application is not just a form — it is a comprehensive technical document that
        commits the proponent to a project design, equipment selection, and performance standards.
        Material changes after lodgement typically trigger re-application or substantial re-work.
        Investing in the application quality (especially the Functional Specification and plant
        model) saves substantial time downstream.
      </Callout>

      <Callout type="source">
        Sources: National Electricity Rules Chapter 5 — 5.3.4 (Application for Connection) +
        5.3.4A (Negotiated Connection Application) · AEMO Connection Application Guideline
        2024 · AER Connection Charging Guideline · TransGrid/Powerlink/AusNet/ElectraNet
        Connection Process documents · Clean Energy Council Connection Best Practice Guide 2023.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — Generator Performance Standards (the 14 standards)
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>The 14 standards under NER 5.2.5</H2>
      <P>
        Every generator connecting to the NEM must meet 14 Generator Performance Standards (GPS)
        set out in NER 5.2.5 (Schedule 5.2). Each standard defines a specific aspect of how the
        plant must behave under operating conditions. The standards collectively determine
        whether the plant supports — or degrades — the system's ability to deliver reliable,
        secure electricity.
      </P>
      <Table
        emphasizeFirst
        headers={['#', 'Standard', 'What it regulates', 'Why it matters']}
        rows={[
          ['1', 'S5.2.5.1 — Reactive power capability', 'Range of reactive power (MVAr) plant can absorb or supply', 'Voltage control at connection point'],
          ['2', 'S5.2.5.2 — Quality of electricity generated', 'Harmonic distortion, voltage unbalance', 'Power quality for downstream users'],
          ['3', 'S5.2.5.3 — Response to frequency disturbances', 'How fast and how much the plant responds to system frequency changes', 'System frequency stability'],
          ['4', 'S5.2.5.4 — Response to voltage disturbances', 'Voltage ride-through capability (LVRT, HVRT)', 'Stay connected through grid faults'],
          ['5', 'S5.2.5.5 — Response to disturbances following contingency events', 'Plant behaviour after a major system fault', 'Post-disturbance recovery'],
          ['6', 'S5.2.5.6 — Quality of electricity generated and continuous uninterrupted operation', 'Sustained operation through abnormal conditions', 'System resilience'],
          ['7', 'S5.2.5.7 — Partial load rejection', 'Behaviour when system load suddenly drops', 'Frequency control'],
          ['8', 'S5.2.5.8 — Protection of generating systems', 'Equipment protection settings', 'Equipment safety + system security'],
          ['9', 'S5.2.5.9 — Protection systems that impact on power system security', 'System-impact protection coordination', 'Coordinated protection across network'],
          ['10', 'S5.2.5.10 — Protection to trip plant for unstable operation', 'Tripping criteria during instability', 'Prevent cascading failures'],
          ['11', 'S5.2.5.11 — Frequency control', 'Active frequency control capability (governor or equivalent)', 'System frequency arbitration'],
          ['12', 'S5.2.5.12 — Impact on network capability', 'Limits on harmful interactions with network equipment', 'Network equipment integrity'],
          ['13', 'S5.2.5.13 — Voltage and reactive power control', 'Steady-state and dynamic voltage control', 'Voltage stability at connection point'],
          ['14', 'S5.2.5.14 — Active power control', 'Active power dispatch following AEMO instructions', 'Market dispatch + system balance'],
        ]}
      />

      <H2>Three levels of compliance</H2>
      <P>
        For each of the 14 standards, NER 5.2.5 defines three possible compliance levels:
      </P>
      <Table
        emphasizeFirst
        headers={['Level', 'Definition', 'Plant economics implication']}
        rows={[
          ['Automatic Standard', 'The default requirement under the NER; no project-specific negotiation needed', 'Easiest to demonstrate; some over-engineering may be required (added cost)'],
          ['Negotiated Standard', 'A project-specific standard, agreed between proponent and AEMO/NSP through negotiation. Must lie between the Minimum and Automatic standards.', 'Lower equipment cost; longer negotiation; some operational restrictions may apply'],
          ['Minimum Standard', 'The floor below which AEMO will not accept any plant. If only the Minimum is met, AEMO may impose operational restrictions (e.g. curtailment limits).', 'Lowest equipment cost; significant operational risk; may trigger declared shortfalls'],
        ]}
      />
      <P>
        Industry practice: most projects target <Em>Automatic on most standards, Negotiated on
        2-4 contentious standards, and never accept Minimum without explicit operational
        agreement with AEMO</Em>. The most-negotiated standards in 2024-2026 have been S5.2.5.1
        (reactive power), S5.2.5.4 (voltage ride-through), S5.2.5.11 (frequency control), and
        S5.2.5.13 (voltage control).
      </P>

      <H2>The reactive power standard — S5.2.5.1</H2>
      <P>
        <Em>Reactive power</Em> capability is one of the most negotiated standards, because it
        directly affects equipment selection cost. Reactive power (measured in MVAr) is what
        the plant supplies or absorbs to control voltage at the connection point. The Automatic
        Standard requires:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The plant must be able to supply 0.93 leading power factor (P.F.) at full active
          power output</li>
        <li>The plant must be able to absorb 0.93 lagging power factor (P.F.) at full active
          power output</li>
        <li>The plant must support specified voltage step response characteristics</li>
      </ul>
      <P>
        For an inverter-based plant, meeting these specifications means oversizing the inverter
        capacity (MVA &gt; MW), or installing additional reactive support equipment (STATCOM,
        dynamic capacitor banks). For a 200 MW solar farm, achieving 0.93 P.F. capability
        typically requires inverter MVA capacity of ~215 MVA — about a 7% capex premium over a
        unity-P.F. inverter fleet.
      </P>

      <H2>The voltage ride-through standard — S5.2.5.4</H2>
      <P>
        <Em>Low Voltage Ride Through (LVRT)</Em> and <Em>High Voltage Ride Through (HVRT)</Em>
        require the plant to remain connected through specified voltage disturbances. The
        Automatic Standard requires:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>LVRT down to 0% retained voltage for 250 ms (plant must not trip during a near-zero
          voltage event)</li>
        <li>Gradual voltage recovery profile back to nominal over 1-3 seconds</li>
        <li>HVRT up to 130% nominal for short durations</li>
        <li>Symmetrical and asymmetrical fault behaviour</li>
      </ul>
      <P>
        For inverter-based plant, LVRT/HVRT capability is determined by inverter firmware and
        is typically demonstrated through manufacturer-supplied EMT model + lab certification.
        For wind farms, the standard interacts with turbine type — full-converter (Type 4)
        turbines generally meet Automatic, while older Type 3 (DFIG) machines may need
        modifications.
      </P>

      <H2>The frequency control standard — S5.2.5.11</H2>
      <P>
        Active frequency control — the ability of the plant to respond to system frequency
        deviations — has become one of the most-contested standards as renewable penetration
        has grown. The Automatic Standard requires:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Frequency response over the full active power range</li>
        <li>5% droop characteristic (5% frequency change = 100% power response)</li>
        <li>Response within 10 seconds for primary frequency response</li>
      </ul>
      <P>
        For solar plants, this is challenging because the plant must "headroom" — reserve some
        power capability for frequency response. For BESS, this is well-suited to provide. For
        wind, the response depends on the wind resource at the time. The recent AEMC rule
        change on Primary Frequency Response (2020) mandated all generators provide some level
        of frequency response — previously this was optional. This was the largest single GPS
        compliance shift in recent NER history.
      </P>

      <H2>The system strength standards — S5.2.5.5</H2>
      <P>
        Following the 2017 AEMC system strength rule change, the response-to-disturbance
        standard (S5.2.5.5) was strengthened to require generators to demonstrate stable
        operation under low system strength conditions. This effectively requires:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Inverter-based plant must demonstrate stable operation at short-circuit ratios
          (SCR) as low as 1.5 or 2.0</li>
        <li>Wind farms must demonstrate that the plant does not introduce oscillatory
          instability</li>
        <li>Solar farms must show stable operation under post-contingency network configurations</li>
      </ul>
      <P>
        This is the standard most affected by the system strength shortfall — covered in
        Lesson 6.
      </P>

      <H2>GPS negotiation in practice</H2>
      <P>
        The GPS negotiation runs from the 5.3.4 application acceptance through the offer to
        connect — typically 6-18 months. Common negotiation patterns:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Proponent proposes Automatic on most standards in the Functional Specification</li>
        <li>NSP/AEMO review initial study results and identify standards where the proposed
          plant may not meet Automatic</li>
        <li>Proponent commissions targeted studies (EMT, RMS) to demonstrate compliance or
          propose Negotiated</li>
        <li>Negotiation iterates 3-6 times — each round 2-4 weeks of NSP review + 4-8 weeks
          of proponent study work</li>
        <li>Final agreement on each standard documented in the Connection Agreement</li>
      </ul>

      <Callout type="key">
        Generator Performance Standards are the substantive content of the connection process.
        Equipment selection determines what standards a plant can physically meet. Project
        teams that understand the GPS implications of inverter/turbine choices at the
        feasibility stage compress later negotiations. Project teams that select equipment
        first and figure out GPS later spend 12-24 months in negotiation that could have been
        4-6 months.
      </Callout>

      <Callout type="source">
        Sources: National Electricity Rules — Schedule 5.2 (S5.2.5.1 to S5.2.5.14) ·
        AEMO Power System Model Guidelines · AEMC Rule Change — Primary Frequency Response
        (2020) · AEMC Rule Change — System Strength (2017, 2021, 2023) ·
        DIgSILENT Pacific <em>GPS Compliance Studies Reference</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — System studies and modelling
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>The three modelling tools</H2>
      <P>
        Demonstrating compliance with the 14 GPS standards requires a substantial body of
        engineering studies. Three modelling tools dominate the workflow:
      </P>
      <Table
        emphasizeFirst
        headers={['Tool', 'Type', 'What it analyses', 'Typical use']}
        rows={[
          ['PSS/E (Siemens)', 'Positive-sequence load-flow / RMS', 'Steady-state voltage, power flow, post-contingency stability', 'Network capacity, S5.2.5.1, S5.2.5.13'],
          ['PSCAD (Manitoba HVDC Research Centre)', 'Electromagnetic transient (EMT)', 'Sub-second dynamic behaviour, harmonic distortion, fault transients, inverter control interactions', 'S5.2.5.4 (LVRT/HVRT), S5.2.5.5 (system strength), S5.2.5.11 (frequency response)'],
          ['DIgSILENT PowerFactory / DSA Tools / PSS/E RMS', 'RMS dynamic', 'Power system stability over seconds-to-minutes timescales', 'S5.2.5.3, S5.2.5.5, S5.2.5.11, S5.2.5.13'],
        ]}
      />

      <H2>EMT vs RMS — the critical distinction</H2>
      <P>
        For modern inverter-based plant, the distinction between EMT and RMS modelling is
        critical:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>RMS (Root Mean Square)</Em> — phasor-domain simulation. Models voltages and
          currents as time-varying phasors. Captures dynamics over seconds-to-minutes. Standard
          for system planning and traditional synchronous-generator studies. Insufficient for
          IBR detail.</li>
        <li><Em>EMT (Electromagnetic Transient)</Em> — instantaneous-time-domain simulation.
          Models actual voltage and current waveforms. Captures sub-millisecond dynamics
          including inverter switching, control loop interactions, and post-fault recovery.
          <Em> Essential for inverter-based plant studies</Em>.</li>
      </ul>
      <P>
        Pre-2018, NEM connection studies relied heavily on RMS. Post-2018, AEMO and NSPs have
        progressively required EMT studies for any project involving inverters — which is now
        essentially all new generation. The implications:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>EMT studies take 4-10x longer to run than RMS — a single PSCAD simulation can take
          24-72 hours for a complex network scenario</li>
        <li>EMT studies require detailed inverter manufacturer models — the IBR model problem
          covered in Lesson 2</li>
        <li>EMT model preparation, validation and study execution typically consumes 6-12
          months of the connection journey</li>
      </ul>

      <H2>The equipment model problem</H2>
      <P>
        Every inverter or turbine type in the plant must have a validated model available to
        AEMO and the NSP. The model includes:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Power circuit electrical characteristics</li>
        <li>Control system algorithms (often the most sensitive — represents OEM proprietary
          information)</li>
        <li>Protection settings and trip logic</li>
        <li>Communication and external interfaces</li>
        <li>Documentation of the model's validation against laboratory and field tests</li>
      </ul>
      <P>
        For the Australian market, model availability has progressed substantially since 2020:
      </P>
      <Table
        emphasizeFirst
        headers={['Equipment type', 'Model availability in 2026', 'Notes']}
        rows={[
          ['Tier-1 Western inverters (SMA, ABB, Fluence, Tesla)', 'Generally well-available; released within months of product launch', 'Standard market expectation'],
          ['Major Chinese inverters (Huawei, Sungrow, Goodwe)', 'Good model availability for current product range; some lag on newest models', 'Improved substantially 2023-2026'],
          ['Wind turbines — full-converter (Vestas V155+, Siemens Gamesa SG155+, Goldwind GWH+)', 'Generally available; new model releases lag 6-12 months', 'Standard expectation'],
          ['Wind turbines — older DFIG (Type 3) machines', 'Available but some models retired by OEM; new connections rare', 'Mostly for repowering scenarios'],
          ['Specialty equipment (synchronous condensers, STATCOMs)', 'Manufacturer-specific; usually available with sufficient lead time', 'Special-order'],
        ]}
      />

      <H2>The study workflow</H2>
      <P>
        Once the 5.3.4 application is accepted, the project team typically runs the following
        study sequence over 6-12 months:
      </P>
      <Table
        emphasizeFirst
        headers={['Study', 'Tool', 'Purpose', 'Typical duration']}
        rows={[
          ['Load flow studies', 'PSS/E', 'Establish steady-state voltage and thermal limits at connection point under various network configurations', '2-4 weeks'],
          ['Short-circuit studies', 'PSS/E', 'Determine fault levels at connection point; inform protection settings', '2-3 weeks'],
          ['Reactive power capability studies', 'PSS/E + PSCAD', 'Demonstrate S5.2.5.1 compliance', '3-6 weeks'],
          ['Voltage ride-through studies', 'PSCAD', 'Demonstrate S5.2.5.4 LVRT/HVRT compliance', '6-10 weeks'],
          ['System strength assessment', 'PSCAD', 'Determine if system strength is adequate; if not, identify remediation requirements', '4-8 weeks'],
          ['Harmonic studies', 'PSCAD', 'Demonstrate S5.2.5.2 power quality compliance', '4-6 weeks'],
          ['Control system interaction studies', 'PSCAD', 'Demonstrate no adverse interaction with other nearby plant', '6-12 weeks'],
          ['Frequency response studies', 'PSCAD + RMS', 'Demonstrate S5.2.5.11 + S5.2.5.3 compliance', '3-6 weeks'],
          ['Compiled GPS Compliance Report', 'All tools', 'Single document demonstrating compliance with all 14 standards', '8-12 weeks of writing + iteration'],
        ]}
      />

      <H2>AEMO and NSP review cycles</H2>
      <P>
        Each study output is reviewed by:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>The NSP</Em> — primarily for compliance with NSP-specific requirements and
          consistency with network planning assumptions. Reviews typically take 4-8 weeks per
          major study.</li>
        <li><Em>AEMO</Em> — primarily for system security implications, especially for IBR
          plant in low system strength regions. AEMO reviews typically take 6-12 weeks and often
          generate detailed technical comments requiring re-work.</li>
      </ul>
      <P>
        The AEMO + NSP review cycle is the most common single source of unscheduled delay in
        the study phase. Industry best practice is to engage both bodies in informal review
        before formal submission — particularly on contentious issues like system strength
        adequacy and EMT model fidelity.
      </P>

      <H2>The "study merry-go-round" problem</H2>
      <P>
        A recurring industry frustration: AEMO and NSP reviews sometimes identify
        inconsistencies between the project's EMT model and field-validated equipment behaviour.
        This triggers a request for the OEM to provide an updated model. The OEM provides a
        new model 6-12 months later. The project re-runs all major studies with the new model.
        The cycle takes 12-18 months from first AEMO comment to final compliance.
      </P>
      <P>
        Solutions emerging in 2024-2026:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>OEM model certification programmes (AEMO publishes a list of pre-validated models)</li>
        <li>Standardised model exchange formats reducing translation errors</li>
        <li>Cloud-based simulation environments allowing shared model testing</li>
        <li>Industry-wide reference plant scenarios for benchmarking</li>
      </ul>

      <Callout type="key">
        System studies are the most labour-intensive and time-consuming part of the connection
        process. They typically consume 6-12 months and $1-3M of consulting fees per project.
        Equipment model quality and OEM cooperation are the critical inputs — project teams
        that select equipment without checking model availability spend 50% more on studies and
        wait 6-12 months longer.
      </Callout>

      <Callout type="source">
        Sources: AEMO Power System Model Guidelines 2024 · AEMO PSCAD Modelling Specification ·
        DIgSILENT Pacific <em>EMT Modelling Best Practice</em> 2023 · GHD <em>Connection
        Studies Guidance</em> 2024 · IEEE PES Wind &amp; Solar Power System Studies Reference ·
        Aurecon <em>Inverter-Based Resource Stability Studies</em> 2025.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — System strength: the binding constraint
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>What system strength actually is</H2>
      <P>
        <Em>System strength</Em> is a measure of how stable the AC voltage at a given network
        node is under disturbance. Mechanically, it is measured by the <Em>Short-Circuit Ratio
        (SCR)</Em>:
      </P>
      <Callout type="numbers">
        SCR = (Short-circuit MVA at the connection point) ÷ (Plant rated MVA)
        <br /><br />
        For example, at a connection point with 1,500 MVA of available short-circuit current
        connecting a 300 MW (~310 MVA) wind farm, SCR = 1500 ÷ 310 = 4.8.
      </Callout>
      <P>
        SCR of 4-5+ is generally considered adequate for inverter-based plant. SCR of 1.5-3 is
        marginal — plant may operate but with reduced performance and risk of oscillatory
        instability. SCR below 1.5 is typically infeasible without significant system support.
      </P>

      <H2>Why system strength has become the binding constraint</H2>
      <P>
        System strength comes primarily from synchronous machines — coal generators, gas
        generators, hydro turbines, synchronous condensers. As Australian coal retires, the
        synchronous fault current available at any given network node declines. Meanwhile, the
        same network nodes are being asked to host more and more inverter-based plant.
      </P>
      <P>
        The result has been progressively tighter system strength margins in renewable-heavy
        regions. AEMO declares a <Em>system strength shortfall</Em> when the available system
        strength falls below the minimum required to securely connect existing and committed
        plant. Declared shortfalls since 2018:
      </P>
      <Table
        emphasizeFirst
        headers={['Region', 'Date declared', 'Trigger', 'Status']}
        rows={[
          ['SA (Adelaide region)', '2018', 'Northern + Pelican Point coal/gas retirements', 'Resolved by ElectraNet synchronous condensers (Davenport, Robertstown, Kepler) 2020-2021'],
          ['NSW South-West (Yass / Wagga)', '2019', 'Growing wind/solar cluster + Liddell closure announcement', 'Largely resolved by TransGrid synchronous condensers + EnergyConnect'],
          ['QLD Far North (Cairns / Townsville)', '2020', 'Bowen Basin coal retirements', 'Resolved by Powerlink synchronous condensers'],
          ['VIC West (Mildura / Wimmera)', '2021', 'Growing solar cluster + Hazelwood retirement legacy', 'Ongoing remediation via AusNet works'],
          ['NSW North (Tamworth / Inverell)', '2023', 'New England wind/solar cluster', 'Remediation studies ongoing'],
          ['Multiple emerging regions', '2024-2026', 'Coal retirements accelerating', 'New strength service market under development'],
        ]}
      />

      <H2>The System Strength Service Framework</H2>
      <P>
        Until 2021, system strength was managed informally — AEMO would refuse connections in
        low-strength regions until the NSP installed mitigation equipment. The 2021 AEMC rule
        change introduced the <Em>System Strength Service Framework (SSSF)</Em> as the formal
        regulatory structure:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>NSPs identify system strength shortfalls and quantify the gap</li>
        <li>NSPs procure system strength services via competitive process</li>
        <li>Service providers (synchronous condenser operators, large-scale BESS with grid-
          forming capability) compete to provide strength</li>
        <li>Cost of services is recovered from generation users via the access charge</li>
      </ul>
      <P>
        The SSSF was first implemented in NSW (TransGrid) in 2023, with Powerlink and AusNet
        following 2024-2025. The framework is still evolving but has clarified responsibility:
        the NSP is responsible for providing adequate system strength, with the proponent
        contributing through access charges.
      </P>

      <H2>Synchronous condensers — the primary mitigation</H2>
      <P>
        <Em>Synchronous condensers</Em> are essentially synchronous machines that have been
        decoupled from a turbine — they spin up to grid frequency on their own (or with a small
        starting motor) and provide:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Synchronous fault current (system strength)</li>
        <li>Inertia (resisting frequency changes)</li>
        <li>Reactive power support (voltage control)</li>
      </ul>
      <P>
        Major synchronous condenser installations in Australia:
      </P>
      <Table
        emphasizeFirst
        headers={['Installation', 'Region', 'Capacity', 'Operator', 'Year online']}
        rows={[
          ['Davenport', 'SA', '250 MVAr', 'ElectraNet', '2020'],
          ['Robertstown', 'SA', '150 MVAr', 'ElectraNet', '2020'],
          ['Kepler', 'SA', '150 MVAr', 'ElectraNet', '2021'],
          ['Liddell + Bayswater (proposed)', 'NSW', '~200-400 MVAr', 'AGL / TransGrid', '2024-2027'],
          ['Various Solar+SyCon co-located', 'NEM-wide', 'Various', 'Multiple', '2022-2026 progressively'],
        ]}
      />
      <P>
        Synchronous condensers are not cheap — a typical installation costs $50-150M for 100-
        300 MVAr capability — but they are increasingly the only economic mitigation for
        system strength shortfalls in renewable-heavy regions.
      </P>

      <H2>Grid-forming BESS — the emerging alternative</H2>
      <P>
        Conventional BESS uses <Em>grid-following</Em> inverters — control logic that tracks
        the grid frequency and voltage as inputs. Newer <Em>grid-forming (GFM)</Em> inverters
        can <em>create</em> their own voltage reference, providing system strength services
        comparable to synchronous machines. Key examples in Australia:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Waratah Super Battery (NSW) — grid-forming, 850 MW / 1,680 MWh — Akaysha/EnergyCo</li>
        <li>Hornsdale Power Reserve Stage 2 (SA) — partial grid-forming retrofit</li>
        <li>Wallgrove BESS (NSW) — grid-forming capability</li>
        <li>Several CIS T3 projects awarded with grid-forming requirements</li>
      </ul>
      <P>
        Grid-forming BESS has the advantage of also providing arbitrage and FCAS revenue —
        making the economics more favourable than dedicated synchronous condensers in some
        regions. However, GFM inverter cost is currently 15-25% higher than grid-following,
        and the technology is still maturing.
      </P>

      <H2>Project economics — system strength as a cost</H2>
      <P>
        For a proponent connecting to a low system strength region, the system strength burden
        manifests as:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Access charges</Em> — annual charge for use of NSP system strength services,
          typically $5-25/MW/yr</li>
        <li><Em>Plant capex premium</Em> — grid-forming inverters cost more than grid-following</li>
        <li><Em>Connection asset modifications</Em> — sometimes a dedicated reactive power
          device (STATCOM, capacitor bank) must be installed</li>
        <li><Em>Operational restrictions</Em> — in some regions, projects accept curtailment
          conditions during low system strength events</li>
      </ul>

      <H2>Where this is going — 2027-2030</H2>
      <P>
        AEMO's Engineering Roadmap forecasts system strength remaining the binding constraint
        through 2027-2030 in:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>NSW South-West (Yass/Wagga) — post-Bayswater retirement 2033</li>
        <li>NSW Hunter Valley — post-Liddell + future post-Bayswater retirement</li>
        <li>VIC Latrobe Valley — Hazelwood legacy, post-Yallourn 2028 + post-Loy Yang A 2035</li>
        <li>QLD Bowen Basin — Stanwell, Tarong, Callide retirements 2028-2037</li>
        <li>WA SWIS — Collie coal retirements 2028-2030</li>
      </ul>
      <P>
        The shortfalls are largest where coal retirements are concentrated. Grid-forming BESS
        + synchronous condensers + system strength services will scale up to meet them, but
        each project in these regions will need to budget for system strength considerations
        in feasibility and design.
      </P>

      <Callout type="key">
        System strength has become the single biggest technical constraint on renewable
        connection in the NEM. The transition from synchronous coal to inverter-based
        renewables creates a structural gap that must be filled — either by network-owned
        synchronous condensers, by grid-forming BESS, or by reducing the rate of renewable
        connection in already-stressed regions. Each project's system strength burden is
        site-specific and must be assessed at feasibility — late discovery of system strength
        shortfalls has stranded multiple projects since 2018.
      </Callout>

      <Callout type="source">
        Sources: National Electricity Rules — System Strength Service Framework (2021, 2023) ·
        AEMC Rule Change — System Strength (2017, 2021, 2023) · AEMO Engineering Framework ·
        AEMO declared system strength shortfall reports 2018-2025 · ElectraNet, TransGrid,
        Powerlink, AusNet synchronous condenser installations · Gilbert + Tobin
        <em> System Strength regulatory analysis</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — Marginal Loss Factors (MLFs)
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>What an MLF is and why it matters</H2>
      <P>
        A <Em>Marginal Loss Factor (MLF)</Em> is a multiplier applied to a generator's
        settlement revenue to account for the marginal electrical losses incurred in
        transporting its energy from the generation point to the regional reference node
        (typically Sydney West for NSW, Melbourne South for VIC, etc.). Settlement revenue
        equals:
      </P>
      <Callout type="numbers">
        Settlement revenue = (Energy generated, MWh) × (Regional Reference Price, $/MWh) × MLF
        <br /><br />
        An MLF of 0.95 means the generator receives 95% of the regional reference price for each
        MWh dispatched. An MLF of 0.85 means the generator receives only 85% — a 10 percentage
        point reduction directly equates to a 10% reduction in gross revenue.
      </Callout>

      <H2>How MLFs are calculated</H2>
      <P>
        AEMO calculates MLFs annually for every connection point in the NEM. The methodology:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>For each connection point, AEMO calculates the <Em>marginal cost of losses</Em> —
          the additional kW of system losses caused by injecting 1 MW at that connection point</li>
        <li>This is converted to a Loss Factor by dividing the gross generation by the
          generation net of losses</li>
        <li>The MLF is updated annually based on previous-year operational data and the
          coming-year load and generation forecast</li>
        <li>Each MLF is set for the financial year (July-June)</li>
      </ul>
      <P>
        Key inputs to the MLF calculation:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Network topology (which lines connect which substations)</li>
        <li>Forecast generation mix at each connection point</li>
        <li>Forecast load at each connection point</li>
        <li>Network thermal limits and operational scenarios</li>
        <li>Annual capacity factor assumptions for renewable plant</li>
      </ul>

      <H2>The 2018-2024 MLF degradation story</H2>
      <P>
        From 2018 onwards, MLFs in renewable-heavy regions have degraded substantially. The
        cause is straightforward: as more generation concentrates at a remote location, more
        of its output must flow through the same transmission lines to reach load centres,
        increasing marginal losses. The pattern:
      </P>
      <Table
        emphasizeFirst
        headers={['Region', 'Typical MLF 2017', 'Typical MLF 2024', 'Change', 'Driver']}
        rows={[
          ['NSW Hunter Valley (Bayswater area)', '~0.97', '~0.85-0.90', '−7-12 pp', 'Hunter Valley wind + solar cluster + Bayswater output'],
          ['NSW South-West (Yass / Wagga)', '~0.96', '~0.80-0.88', '−8-16 pp', 'Yass Valley wind + Bango cluster + Eraring closure context'],
          ['NSW New England (Tamworth / Inverell)', '~0.95', '~0.82-0.87', '−8-13 pp', 'New England REZ cluster (White Rock, Sapphire, Bango)'],
          ['VIC NW (Mildura / Wemen)', '~0.97', '~0.80-0.88', '−9-17 pp', 'Limondale, Wemen, Yatpool, Bannerton, Bungala solar cluster'],
          ['SA Mid-North (Snowtown / Hornsdale)', '~0.96', '~0.85-0.92', '−4-11 pp', 'Hornsdale, Snowtown, Hallett, Bungala wind+solar density'],
          ['QLD Western (Surat / Roma)', '~0.96', '~0.88-0.93', '−3-8 pp', 'Western Downs solar density'],
          ['QLD Far North (Mt Emerald / Kennedy)', '~0.95', '~0.78-0.85', '−10-17 pp', 'Mt Emerald, Kennedy, Lakeland cluster + transmission constraints'],
        ]}
      />
      <P>
        The economic impact for an operating project is substantial. For a 200 MW wind farm
        running at 30% capacity factor (525 GWh/yr), a 10 pp MLF drop at $80/MWh wholesale
        equates to <Em>~$4.2M of lost annual settlement revenue</Em> — typically more than the
        farm's annual debt service margin.
      </P>

      <H2>Why MLFs are not the same as physical losses</H2>
      <P>
        MLFs reflect <em>marginal</em> losses, not <em>average</em> losses. The distinction:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Physical losses through the transmission system are typically 3-7%</li>
        <li>Marginal losses (incremental losses for adding 1 MW) can be 2-3x the average,
          because losses are I²R — they increase non-linearly with load on each line</li>
        <li>When a transmission line is heavily loaded, marginal losses are very high;
          when lightly loaded, very low</li>
        <li>MLFs therefore reflect the network's loading at the time, not its physical
          characteristics</li>
      </ul>
      <P>
        This means MLFs can change substantially year-on-year as the generation/load mix
        evolves. A new wind farm joining a cluster doesn't just cause its own MLF to be lower
        — it can <Em>also reduce MLFs for existing nearby generators</Em> by increasing
        cluster loadings. This compounding effect is one reason MLFs in remote-REZ regions
        have moved by 8-15 pp in 5-7 years.
      </P>

      <H2>The annual AEMO MLF process</H2>
      <P>
        AEMO publishes draft MLFs in <Em>April-May</Em> each year for the following financial
        year. Industry consultation runs <Em>May-June</Em>. Final MLFs are published in
        <Em> June</Em> and apply from <Em>1 July</Em>. The cycle:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>April: AEMO publishes draft Loss Factor Methodology Compliance Report</li>
        <li>April-May: AEMO publishes draft MLFs</li>
        <li>May-June: Industry submissions on draft MLFs</li>
        <li>June: AEMO publishes final MLFs</li>
        <li>1 July: New MLFs apply</li>
      </ul>
      <P>
        Industry submissions can result in adjustments but rarely overturn the underlying
        methodology. For projects in declining MLF regions, the annual cycle creates
        substantial revenue forecasting risk — a project's contracted revenue assumptions
        may be invalidated by an MLF revision shortly before financial close.
      </P>

      <H2>What's being done — and what isn't</H2>
      <P>
        Industry has long advocated for MLF reform, but progress has been slow. Two ongoing
        debates:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Static vs Dynamic MLFs</Em> — current MLFs are static annual values. Industry
          has proposed <Em>Static Loss Factors</Em> set at investment time (giving certainty)
          and separate <Em>dynamic settlement</Em> that absorbs operational variability.
          AEMC has reviewed this proposal multiple times without adopting it.</li>
        <li><Em>Average vs Marginal</Em> — using average loss factors rather than marginal would
          eliminate the compounding cluster effect. AEMC has consistently rejected this on
          efficiency grounds (marginal pricing is correct economic signal), but the industry
          impact debate continues.</li>
      </ul>
      <P>
        Network development is the primary practical mitigation. As REZ-area transmission
        upgrades come online (HumeLink, VNI West, EnergyConnect, Marinus Link), MLFs in
        affected regions should partially recover. AEMO modelling suggests:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>NSW South-West MLFs improve 4-8 pp by 2028 with EnergyConnect + HumeLink</li>
        <li>VIC NW MLFs improve 3-6 pp by 2030 with VNI West + Western Renewables Link</li>
        <li>NSW Hunter MLFs decline further 2026-2030 as Hunter REZ density increases</li>
      </ul>

      <Callout type="warn">
        MLF risk is one of the largest uncontrolled risks in renewable project economics.
        Project teams routinely model MLF assumptions and compare to current-year actuals — but
        the 5-10 year MLF trajectory is genuinely uncertain. Most modern PPAs include MLF
        risk-sharing language, but the burden typically falls on the generator. Locations
        chosen partially for short-term MLF reasons (e.g. existing strong substations) age
        well; locations chosen for resource alone can see substantial MLF degradation.
      </Callout>

      <Callout type="source">
        Sources: AEMO Annual MLF reports 2018-2025 · AEMO Loss Factor Methodology · AEMC
        Static Loss Factors rule change consultations · AURES Marginal Loss Factor tracker ·
        Clean Energy Council <em>MLF Reform Position</em> 2023 · Cornwall Insight
        <em> MLF degradation analysis</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 8 — Connection cost allocation
// ============================================================

function Lesson8() {
  return (
    <div>
      <H2>The two cost buckets</H2>
      <P>
        Connection costs split into two broad buckets, with different cost recovery rules:
      </P>
      <Table
        emphasizeFirst
        headers={['Cost bucket', 'Who designs/builds', 'Who funds initially', 'Who ultimately pays']}
        rows={[
          ['Connection asset', 'Proponent', 'Proponent', 'Proponent — fully internal cost'],
          ['Shared network upgrade', 'NSP', 'NSP (recovered via various mechanisms)', 'Initially proponent (via Connection Charge); over time, partial cost recovery from subsequent users'],
        ]}
      />

      <H2>The connection asset — what the proponent builds</H2>
      <P>
        The <Em>connection asset</Em> is everything between the project plant and the
        <Em> point of common coupling (PCC)</Em> with the NSP's network. Typical scope:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Plant substation (transformer, switchgear, protection relays)</li>
        <li>Outgoing transmission line from plant substation to NSP-owned substation (typically
          5-30 km for a wind farm, sometimes longer)</li>
        <li>Easements for the transmission line</li>
        <li>Communications and SCADA infrastructure to NSP control room</li>
        <li>Reactive power compensation equipment (STATCOM, capacitor banks, harmonic filters)</li>
        <li>Synchronous condenser if required for system strength contribution</li>
      </ul>
      <P>
        For a typical 200 MW wind or solar project, connection asset capex runs:
      </P>
      <Table
        emphasizeFirst
        headers={['Component', 'Typical capex']}
        rows={[
          ['Plant substation + switchgear', '$8-18M'],
          ['Transmission line (5-30 km, 132-275 kV)', '$10-50M'],
          ['Easements + land acquisition', '$2-15M'],
          ['Reactive power equipment (STATCOM)', '$15-40M (where required)'],
          ['Communications + SCADA', '$1-3M'],
          ['Subtotal', '$36-126M'],
          ['Total connection asset (% of total project capex)', '~6-12% for solar/wind, ~3-6% for BESS'],
        ]}
      />

      <H2>Shared network upgrades — what the NSP builds</H2>
      <P>
        Beyond the PCC, the NSP may need to upgrade its network to accept the new generation.
        Common upgrades:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>NSP substation upgrades (additional transformers, switchgear)</li>
        <li>Network reinforcement (rebuilding existing lines to higher capacity, adding parallel
          circuits)</li>
        <li>Voltage control equipment at network nodes</li>
        <li>Protection scheme modifications</li>
        <li>System strength services contributions (synchronous condensers)</li>
      </ul>
      <P>
        These costs are borne initially by the NSP and recovered from the proponent through
        the <Em>Connection Charge</Em>.
      </P>

      <H2>The Connection Charge — AER Connection Charging Guideline</H2>
      <P>
        The AER's <Em>Connection Charging Guideline</Em> sets the rules for how NSPs recover
        shared network upgrade costs. Key principles:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Causer-pays</Em> — the proponent whose connection triggers an upgrade pays for
          it</li>
        <li><Em>Beneficiary-pays adjustments</Em> — if a subsequent user connects within a
          defined window and benefits from the upgrade, they pay a contribution that partially
          reimburses the original proponent</li>
        <li><Em>Cost-sharing for system-wide benefit</Em> — upgrades that benefit the broader
          system (not just the connecting generator) may have a cost-sharing provision</li>
        <li><Em>Negotiated within standard rules</Em> — proponent and NSP can negotiate within
          the framework but cannot override its principles</li>
      </ul>

      <H2>REZ-based cost-sharing — a different framework</H2>
      <P>
        For projects within declared REZs (NSW, VIC, QLD have declared REZs in various stages),
        cost-sharing operates differently. The REZ network operator (e.g. EnergyCo NSW) plans
        network upgrades to support multiple projects simultaneously, then allocates costs to
        projects through:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Access Authorization Schemes</Em> — projects pay an access fee for use of REZ
          network</li>
        <li><Em>Initial Capacity Allocation</Em> — early users contribute more; later users pay
          incremental access fees</li>
        <li><Em>Shared system strength services</Em> — REZ-wide synchronous condensers funded
          by REZ access fees rather than individual project capex</li>
        <li><Em>Capacity-based pricing</Em> — fees based on registered capacity, regardless of
          actual dispatch</li>
      </ul>
      <P>
        REZ-based cost allocation has the advantage of <Em>predictability</Em> — proponents know
        their access charges at financial close rather than discovering them mid-project. But
        the trade-off is that the proponent has less control over network design and may pay
        for capacity they don't fully use.
      </P>

      <H2>The user-of-shared-network charges</H2>
      <P>
        Once connected, generators pay annual <Em>access charges</Em> for use of the shared
        network:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Demand-related TUOS</Em> (Transmission Use of System) — for using the network
          to transport energy</li>
        <li><Em>Negotiable Local Use</Em> — for the local connection-asset interface</li>
        <li><Em>System strength service charge</Em> — for system strength services provided
          by NSP synchronous condensers (recently introduced)</li>
      </ul>
      <P>
        Typical annual access charges for a NEM-connected wind/solar farm: <Em>$2-8/MWh of
        generated energy</Em>, paid as monthly charges to the NSP.
      </P>

      <H2>Recent cost-renegotiation pressure</H2>
      <P>
        Through 2023-2026, several factors have driven upward cost pressure:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>System strength shortfalls</Em> — NSPs require generators to contribute to
          system strength services, adding $5-25/MW/yr</li>
        <li><Em>Transmission cost inflation</Em> — global cable and steel prices have risen
          15-30% since 2021</li>
        <li><Em>Construction labour costs</Em> — Australian construction workforce constraints
          have driven civil and electrical construction costs up 20-40%</li>
        <li><Em>Easement land prices</Em> — agricultural land prices in NSW, VIC have risen
          15-25%</li>
      </ul>

      <Callout type="key">
        Connection cost is one of the most under-appreciated risks in renewable project
        economics. Industry rule-of-thumb pre-2020 was ~5-8% of total capex for connection
        works. Current reality for many projects is 10-15% or higher, particularly for remote-
        REZ sites with system strength shortfalls. Late-discovery of system strength
        contribution requirements can add $20-50M to project capex. Early scoping work and
        scenario analysis of network upgrade costs are essential.
      </Callout>

      <Callout type="source">
        Sources: AER Connection Charging Guideline · NER Chapter 5 (Connection Cost Recovery) ·
        AEMO Network Pricing Working Group materials · TransGrid/Powerlink/AusNet/ElectraNet
        connection cost schedules · Energy Networks Australia <em>Connection Pricing Review</em>
        2024 · Clean Energy Council <em>Connection Cost Trends</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 9 — R1, R2 and commissioning hold-points
// ============================================================

function Lesson9() {
  return (
    <div>
      <H2>The two-stage registration process</H2>
      <P>
        Under NER 5.3.9, the formal end of the connection process is split into two registration
        stages:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'What it represents', 'What capacity is registered', 'Revenue implications']}
        rows={[
          ['R1 — Initial Energisation', 'Plant is physically connected to the grid; initial commissioning tests in progress', 'Limited — proponent may operate at very reduced capacity', 'Limited dispatch; revenue starts but at small fraction of full capability'],
          ['R2 — Full Registration', 'All commissioning tests passed; plant operates at full nameplate capacity', 'Full registered capacity', 'Full settlement revenue; project meets PPA commercial operation date'],
        ]}
      />
      <P>
        For PPA accounting purposes, <Em>Commercial Operation Date (COD) typically aligns with
        R2 — not R1</Em>. A project that achieves R1 but is delayed at R2 incurs revenue
        loss and may face PPA penalties.
      </P>

      <H2>The R1 phase — initial energisation</H2>
      <P>
        R1 is the technical milestone when the plant first energises and synchronises with the
        grid. The phase typically:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Plant first delivers energy at <Em>very limited capacity</Em> — typically 5-20% of
          nameplate, to allow testing without risking system security</li>
        <li>The proponent demonstrates initial control system response, protection coordination,
          and basic dispatch capability</li>
        <li>Testing focuses on synchronous machine behaviour (or for IBR, on basic inverter
          coordination)</li>
        <li>Hold-point reviews occur at predetermined capacity steps</li>
      </ul>

      <H2>Hold-points — the staged commissioning approach</H2>
      <P>
        Between R1 and R2, the plant moves through a series of <Em>hold-points</Em> — capacity
        increments at which testing is performed before the plant is permitted to ramp higher.
        Typical hold-point structure:
      </P>
      <Table
        emphasizeFirst
        headers={['Hold-point', 'Plant output', 'Tests performed']}
        rows={[
          ['HP1 — Initial', '5-10% nameplate', 'Synchronisation tests, basic protection verification'],
          ['HP2 — Low operation', '20-40% nameplate', 'Voltage control response, reactive power capability verification'],
          ['HP3 — Mid operation', '50-70% nameplate', 'Frequency response, fault ride-through demonstration'],
          ['HP4 — High operation', '80-90% nameplate', 'Full GPS compliance demonstration including S5.2.5.4, S5.2.5.5'],
          ['R2 — Full Registration', '100% nameplate', 'Final comprehensive testing; AEMO + NSP sign-off'],
        ]}
      />
      <P>
        Each hold-point requires the project team to demonstrate compliance with predetermined
        criteria. Testing typically takes 1-4 weeks per hold-point, with AEMO + NSP review
        cycles in between of 2-6 weeks. Total R1-to-R2 duration: <Em>4-12 months for a
        straightforward project, 12-24+ months for projects facing technical issues</Em>.
      </P>

      <H2>The R2 backlog — a recent industry crisis</H2>
      <P>
        2021-2024 saw a substantial accumulation of projects stuck between R1 and R2 — operating
        at partial capacity, unable to reach full registration. The backlog reached
        approximately <Em>40-60 NEM projects in active R1-to-R2 phases</Em> at peak.
      </P>
      <P>
        Causes of the backlog:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>AEMO + NSP review capacity unable to keep pace with new project commissioning</li>
        <li>Testing identifying issues with inverter behaviour requiring OEM firmware updates
          (6-12 month cycles)</li>
        <li>System strength constraints requiring projects to demonstrate stable operation in
          progressively more challenging network configurations</li>
        <li>Modifications to existing operational requirements requiring re-testing of already-
          registered plant</li>
      </ul>

      <H2>Constraint equations — the operational reality</H2>
      <P>
        Even at R2, plants typically operate under <Em>Constraint Equations</Em> — operational
        limits that restrict their output under specific network conditions. Common constraint
        equations:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>System strength constraints</Em> — reduce output when nearby synchronous
          condensers are unavailable</li>
        <li><Em>Voltage constraints</Em> — reduce output when network voltage approaches
          statutory limits</li>
        <li><Em>Thermal constraints</Em> — reduce output when nearby transmission lines approach
          thermal capacity</li>
        <li><Em>Cumulative renewable constraints</Em> — limit total renewable output in a region
          during low-load periods (negative pricing scenarios)</li>
      </ul>
      <P>
        Constraint equations can be onerous. Some NEM projects operate at <Em>actual capacity
        factor 5-10 pp lower than nameplate-based estimates</Em> due to constraint equations.
      </P>

      <H2>R2 milestones in 2024-2026</H2>
      <P>
        High-profile R2 achievements in recent years:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Hornsdale Power Reserve Stage 2 — R2 achieved Q2 2022 after 9 months in R1</li>
        <li>Stockyard Hill Wind Farm — R2 achieved late 2022 after extended R1 phase</li>
        <li>Yatpool Solar Farm (VIC) — R2 achieved late 2023 after 18 months in R1 due to
          system strength constraints</li>
        <li>Sapphire Wind Farm Stage 2 (NSW) — R2 in progress 2025</li>
        <li>Eraring BESS Stage 1 — R2 achieved Q3 2025</li>
        <li>Waratah Super Battery — R1 achieved 2024, R2 progressing 2025-26</li>
      </ul>

      <Callout type="key">
        The R1-to-R2 transition is one of the most underestimated phases in project planning.
        Industry standard 6-12 month estimates are routinely exceeded. Project economics
        modelling should include 12-18 month R2 delay scenarios and the associated revenue
        impact. The R2 backlog has been a major contributor to NEM renewable build slippage
        relative to AEMO ISP timelines.
      </Callout>

      <Callout type="source">
        Sources: National Electricity Rules — 5.3.9 (Hold-points and R1/R2) · AEMO
        Commissioning Guidelines · AEMO Constraint Equations documentation · Clean Energy
        Council <em>R2 Backlog Analysis</em> 2023 · TransGrid + AEMO joint commissioning
        guidance.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 10 — Recent reforms
// ============================================================

function Lesson10() {
  return (
    <div>
      <H2>The reform context</H2>
      <P>
        Since 2017, the connection process has been the subject of multiple major reform
        programs from the AEMC, AEMO, NSPs and industry advocacy groups. The aggregate effect
        has been substantial but incomplete — process duration has stopped lengthening but has
        not materially shortened.
      </P>

      <H2>Key AEMC rule changes 2017-2024</H2>
      <Table
        emphasizeFirst
        headers={['Year', 'Rule change', 'What it changed', 'Industry impact']}
        rows={[
          ['2017', 'System Strength', 'Introduced system strength as a generator performance requirement; required NSPs to provide system strength services', 'Significant — created the framework for system strength assessment'],
          ['2018', 'Distribution-connected generation', 'Streamlined connection process for distribution-connected (≤30 MW) generation', 'Limited to smaller projects'],
          ['2020', 'Primary Frequency Response', 'Required all NEM generators to provide primary frequency response (PFR)', 'Major — required GPS amendments for all operating plant'],
          ['2021', 'System Strength Services', 'Introduced System Strength Service Framework — services traded as a market product', 'Major — clarified responsibility and cost recovery'],
          ['2022', 'Network Access', 'Updated connection charging principles; introduced more transparent shared network upgrade allocation', 'Moderate — improved cost transparency'],
          ['2023', 'System Strength', 'Refinement of SSSF; integration with Engineering Roadmap', 'Moderate — operational clarification'],
          ['2024', 'Connections Reform package', 'Multiple changes — streamlined application stages, clearer model requirements, NSP commitments on timeline', 'Significant — first material process compression'],
        ]}
      />

      <H2>The AEMO Engineering Framework / Engineering Roadmap</H2>
      <P>
        AEMO's <Em>Engineering Framework</Em> (2022 onwards) and <Em>Engineering Roadmap</Em>
        (2023 onwards) are the most comprehensive technical reform programs. The Framework
        identifies the engineering capabilities the future NEM will require:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>System strength services (covered in Lesson 6)</li>
        <li>Fast Frequency Response services (FFR)</li>
        <li>Grid-forming inverter capability</li>
        <li>System inertia services</li>
        <li>Voltage control services</li>
        <li>Cybersecurity standards</li>
      </ul>
      <P>
        The Engineering Roadmap operationalises this — a phased plan for procuring these
        capabilities through the late 2020s. Key milestones:
      </P>
      <Table
        emphasizeFirst
        headers={['Milestone', 'Target year', 'Status']}
        rows={[
          ['System Strength Service Framework operational across all NSPs', '2024', 'Achieved (with variation by NSP)'],
          ['Fast Frequency Response services market', '2025', 'Operational in NSW, expanding'],
          ['Grid-forming BESS at scale (1+ GW)', '2026', 'In progress (Waratah Super Battery operational)'],
          ['Inertia services market', '2027', 'Planning stage'],
          ['100% IBR-capable network operations (selected periods)', '2030+', 'AEMO operational target'],
        ]}
      />

      <H2>The 2024 Connections Reform Package</H2>
      <P>
        Announced late 2023 and implemented through 2024-2025, the AEMC Connections Reform
        Package was the most significant single reform to the connection process since the
        2017 system strength rule change. Key elements:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Connection Application stages clarified</Em> — separating preliminary scoping
          from formal 5.3.4 application; clearer NSP obligations at each stage</li>
        <li><Em>NSP timeline commitments</Em> — formal NSP commitment to specified review
          durations at each stage (with cost penalties for missed targets)</li>
        <li><Em>Equipment model standardisation</Em> — industry-standard format for IBR models;
          AEMO pre-certification of validated models</li>
        <li><Em>Streamlined Generator Performance Standards negotiation</Em> — pre-agreed
          standard-by-standard packages for common technology types</li>
        <li><Em>Connection enquiry portal improvements</Em> — single-window NSP applications;
          standardised data submission</li>
      </ul>

      <H2>NSP-level reforms — Powerlink, TransGrid, AusNet</H2>
      <P>
        Each NSP has implemented its own connection process reforms, varying in pace and
        ambition:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Powerlink (QLD)</Em> — Connection Process Modernisation 2023-2025; consolidated
          intake; standardised study templates; pre-application services expanded</li>
        <li><Em>TransGrid (NSW)</Em> — REZ-integrated connection process (with EnergyCo);
          standardised access charging; system strength service contracts</li>
        <li><Em>AusNet (VIC)</Em> — VicGrid-integrated process for V-REZ areas; streamlined
          5.3.4 path for hybrid projects</li>
        <li><Em>ElectraNet (SA)</Em> — Connection Centre with dedicated multi-project liaison;
          fastest median connection times in NEM (when measured)</li>
        <li><Em>Western Power (WA SWIS)</Em> — GEAI-integrated connection process</li>
      </ul>

      <H2>Industry advocacy and the CEC Scorecard</H2>
      <P>
        The Clean Energy Council's annual <Em>Connection Scorecard</Em> has been one of the most
        influential industry advocacy tools. Released annually since 2020, it scores each NSP
        on:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Connection application response times</li>
        <li>Study review cycle durations</li>
        <li>5.3.4 process timeline</li>
        <li>System strength service availability</li>
        <li>Pre-application service quality</li>
        <li>Project team responsiveness</li>
      </ul>
      <P>
        Recent CEC Scorecards have driven public commitments from NSPs to specific improvement
        targets. The Scorecard is now used by AEMC as input to its rule change deliberations.
      </P>

      <H2>Federal coordination — CIS as a planning lever</H2>
      <P>
        The federal Capacity Investment Scheme includes connection milestones in its contract
        terms — proponents must demonstrate connection progress at agreed checkpoints to
        receive CIS payments. This has created federal-state-NSP triangular coordination
        pressure:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Federal government pressures states + NSPs to accelerate connection processes
          for CIS-contracted projects</li>
        <li>States respond via REZ network operators (EnergyCo, VicGrid)</li>
        <li>NSPs respond via dedicated CIS project teams</li>
        <li>AEMO coordinates priorities across the multi-project pipeline</li>
      </ul>

      <H2>What hasn't changed</H2>
      <P>
        Despite the reforms, certain structural constraints persist:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Equipment model availability</Em> — still depends on OEM cooperation; cannot
          be accelerated by NSP/AEMO process changes</li>
        <li><Em>System strength gap</Em> — physical mitigation (synchronous condensers,
          grid-forming BESS) takes 24-48 months to build; cannot be accelerated by process
          reform alone</li>
        <li><Em>Construction-stage hold-points</Em> — R1-to-R2 testing duration is bounded by
          test physics, not process</li>
        <li><Em>AEMO + NSP review capacity</Em> — adding senior engineers takes years; the
          capacity gap closes slowly</li>
      </ul>

      <Callout type="key">
        Connection process reform is real and has improved the situation, but it has not been
        transformative. The 2024 Connections Reform Package + Engineering Framework will
        likely compress typical connection timelines by 6-12 months over 2025-2028. The
        remaining structural constraints — equipment model availability, system strength
        physical capacity, R1-R2 hold-point physics — will continue to set the floor on
        connection timelines through the late 2020s.
      </Callout>

      <Callout type="source">
        Sources: AEMC Rule Change register 2017-2024 · AEMO Engineering Framework / Engineering
        Roadmap publications · AEMC Connections Reform Package consultation papers ·
        NSP connection process updates (Powerlink, TransGrid, AusNet, ElectraNet, Western
        Power) · Clean Energy Council Connection Scorecards 2020-2025 · DCCEEW CIS
        coordination materials.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 11 — The connection queue today
// ============================================================

function Lesson11() {
  return (
    <div>
      <H2>What the queue actually looks like in 2026</H2>
      <P>
        At mid-2026, the NEM-wide connection queue contains <Em>approximately 250-320 projects</Em>
        — a total of <Em>roughly 95-130 GW of registered generation capacity</Em>. The queue is
        concentrated in the four main NEM NSPs (Powerlink, TransGrid, AusNet, ElectraNet) plus
        Western Power in WA.
      </P>
      <Table
        emphasizeFirst
        headers={['NSP', 'Projects in queue', 'Approx. capacity (GW)', 'Median time in queue', 'Notes']}
        rows={[
          ['TransGrid (NSW)', '~95-110', '~40-50', '24-36 months', 'Largest single queue; concentrated in 5 declared REZs'],
          ['Powerlink (QLD)', '~75-90', '~30-40', '18-30 months', 'Strong solar pipeline; wind concentrated in Central+North'],
          ['AusNet (VIC)', '~55-65', '~18-25', '20-32 months', 'Includes V-REZ projects; Western Renewables Link dependency'],
          ['ElectraNet (SA)', '~25-35', '~6-10', '15-24 months', 'Smallest queue; faster process; hydrogen-hub priority'],
          ['Western Power (WA SWIS)', '~25-35', '~5-8', '24-36 months', 'GEAI-integrated; growing rapidly'],
          ['Total NEM + WA SWIS', '~275-330', '~99-133', '–', '–'],
        ]}
      />

      <H2>The composition of the queue</H2>
      <P>
        Reading the queue by technology and stage:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'Approx. projects', 'Approx. capacity (GW)', 'Conversion rate']}
        rows={[
          ['Initial Enquiry / Scoping', '~120-150', '~50-70', 'Approx 60% progress to formal 5.3.4'],
          ['5.3.4 Application + GPS negotiation', '~80-95', '~28-38', 'Approx 75% reach Connection Agreement'],
          ['Construction (post-CA)', '~50-65', '~14-20', 'Approx 90% reach R1'],
          ['R1 — R2 commissioning', '~25-40', '~6-10', 'Most reach R2; some delayed 18-24+ months'],
          ['Total active queue', '~275-340', '~98-138', 'Overall ~50-60% will reach R2 within 5 years'],
        ]}
      />

      <H2>What's most in queue — technology mix</H2>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Solar (utility-scale)</Em> — ~35-40% of queue capacity; concentrated QLD,
          NSW South-West, VIC NW, SA Mid-North</li>
        <li><Em>Wind</Em> — ~25-30% of queue capacity; concentrated NSW New England + South-West,
          VIC West, QLD Highlands</li>
        <li><Em>Standalone BESS</Em> — ~15-20% of queue capacity; concentrated near retiring
          coal plants and urban nodes</li>
        <li><Em>Solar+BESS hybrid</Em> — ~12-18% of queue; rising rapidly with CIS T4 hybrid
          wave</li>
        <li><Em>Pumped hydro</Em> — small but high-impact; Snowy 2.0 + Borumba primary</li>
        <li><Em>Other (wind+BESS, CSP, hydrogen-coupled)</Em> — ~3-5% of queue</li>
      </ul>

      <H2>Where the queue is healthiest</H2>
      <P>
        Patterns from the AURES tracker plus CEC Scorecard data:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>SA (ElectraNet)</Em> — fastest median connection times; healthy queue
          progression; system strength services well-established</li>
        <li><Em>QLD Western Downs (Powerlink)</Em> — established solar belt with proven
          connection pathway; ~70% of T1 + T4 QLD CIS projects sit here</li>
        <li><Em>NSW Central-West Orana REZ (TransGrid + EnergyCo)</Em> — most advanced REZ
          implementation; first cohort of CIS T1 projects progressing</li>
        <li><Em>WA SWIS (Western Power + GEAI)</Em> — newer process but rapid pipeline growth</li>
      </ul>

      <H2>Where the queue is most stressed</H2>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>NSW New England REZ</Em> — strong project pipeline, but transmission
          dependencies (HumeLink + EnergyConnect) constrain immediate uptake</li>
        <li><Em>VIC West (Western Renewables Link area)</Em> — significant pipeline blocked by
          transmission delays</li>
        <li><Em>QLD Far North</Em> — system strength constraints + remote transmission
          dependencies</li>
        <li><Em>NSW South-West (Yass region)</Em> — system strength shortfall + MLF degradation
          + transmission constraints</li>
      </ul>

      <H2>The 2030 implications for the CIS pipeline</H2>
      <P>
        The federal CIS target is approximately 32 GW of renewable + storage capacity by 2030.
        Reading the current queue against this target:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Current queue capacity (~100-130 GW) is 3-4x the CIS target — substantial
          oversupply at the application stage</li>
        <li>Realistic conversion rates suggest 50-65 GW of the current queue will reach R2 by
          2030 — sufficient to meet CIS target with margin</li>
        <li>However, conversion rates vary significantly by region — NSW + VIC face binding
          transmission constraints that may delay 5-15 GW</li>
        <li>System strength shortfalls add uncertainty — particularly in NSW New England, VIC
          West, QLD Far North</li>
      </ul>

      <H2>What's improving — and what isn't</H2>
      <P>
        Positive trends over 2024-2026:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>NSP review capacity increasing — Powerlink and TransGrid have added 30-50% more
          connection engineers since 2022</li>
        <li>Equipment model availability for major OEMs has materially improved</li>
        <li>REZ-integrated processes (EnergyCo, VicGrid) reducing duplication on cumulative
          assessments</li>
        <li>System strength services market beginning to function — grid-forming BESS
          deployments accelerating</li>
        <li>2024 Connections Reform Package implementation reducing administrative friction</li>
      </ul>
      <P>
        Persistent challenges:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>R2 backlog still ~25-40 projects with extended commissioning durations</li>
        <li>System strength physical capacity (synchronous condensers + GFM BESS) builds slowly</li>
        <li>MLF degradation continues in REZ regions until transmission upgrades complete</li>
        <li>Construction cost inflation pressuring proponent economics</li>
        <li>Skilled workforce constraints — both at NSPs and across the project development
          industry</li>
      </ul>

      <H2>The strategic landscape for developers</H2>
      <P>
        For a developer scoping a new project in 2026-2028, key strategic considerations:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Connection point selection is as important as resource quality</Em> — sites
          with adequate system strength and remaining hosting capacity are increasingly
          scarce</li>
        <li><Em>Early NSP scoping pays back many times over</Em> — $50-150k of pre-application
          studies prevents $5-50M of late-discovery surprises</li>
        <li><Em>Inverter/turbine OEM selection should consider GPS compliance, not just
          capex</Em> — Tier-1 OEMs with proven AEMO model support reduce risk</li>
        <li><Em>REZ projects offer faster + more certain pathways</Em> — at cost of sharing
          benefits with co-located projects</li>
        <li><Em>Hybrid solar+BESS projects benefit from shared connection assets</Em> — a 200
          MW solar + 200 MW BESS hybrid has a much better connection cost per MW than two
          separate connections</li>
        <li><Em>Federal CIS contracts provide planning leverage</Em> — both for federal-state
          coordination pressure and for revenue certainty during the connection journey</li>
      </ul>

      <Callout type="key">
        The connection queue is the practical measure of how much renewable capacity can
        actually be delivered to the NEM by 2030. The current queue is healthy in volume
        terms (100+ GW vs 32 GW target) but stressed by transmission and system strength
        constraints in key regions. Developers who select connection points with adequate
        underlying capacity, engage early with NSPs, and structure their projects to fit
        within REZ frameworks will deliver projects on time. Developers who treat connection
        as an afterthought face the worst delays in NEM history. The next 4-6 years will
        separate the successful from the stranded.
      </Callout>

      <Callout type="source">
        Sources: AURES connection status tracker · Clean Energy Council Connection Scorecards
        2020-2025 · TransGrid, Powerlink, AusNet, ElectraNet, Western Power connection
        registers · AEMO Generation Information data · AEMC monthly connection statistics ·
        DCCEEW CIS pipeline tracking · Baringa <em>Australian Renewable Pipeline Tracker</em>
        2025.
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
          <span className="text-3xl" aria-hidden>🔌</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
            ✅ Available
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight"
          style={{ borderLeft: '4px solid #06b6d4', paddingLeft: 12, marginLeft: -12 }}>
          AEMO Connection Process for New Developments
        </h1>
        <p className="text-base italic text-[var(--color-text-muted)]">
          The 36-50 month journey from feasibility to full registration — where most project schedule risk lives.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          The connection process is one of the biggest determinants of NEM project timeline and risk.
          This 11-lesson module walks through every step: connection point selection and feasibility,
          NER 5.3.4 application, the 14 Generator Performance Standards, EMT vs RMS system studies,
          system strength as the binding constraint since 2018, Marginal Loss Factors and their
          revenue impact, connection cost allocation, R1/R2 commissioning hold-points, recent reforms
          and what they have (and haven't) achieved, and a current snapshot of the NEM-wide
          connection queue.
        </p>
      </div>

      <div className="space-y-3">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          return (
            <Link key={l.id} to={`/learn/aemo-connections/${l.id}`}
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
            <Link to="/intelligence/asset-lifecycle" className="text-[var(--color-primary)] hover:underline">
              Asset Lifecycle →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— project progression through connection stages</span>
          </li>
          <li>
            <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
              Scheme Tracker →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— CIS/LTESA award status alongside connection progress</span>
          </li>
          <li>
            <Link to="/learn/nsw-rez" className="text-[var(--color-primary)] hover:underline">
              NSW REZs &amp; Transmission module →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— REZ-coordinated connection pathways</span>
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
        <Link to="/learn/aemo-connections" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← AEMO Connection Process
        </Link>
        <span className="text-[var(--color-text-muted)]">Lesson {lesson.number} of {LESSONS.length} · {lesson.readingTime}</span>
      </div>

      <div className="space-y-1 pb-4 border-b border-[var(--color-border)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Lesson {lesson.number}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight">{lesson.title}</h1>
        <p className="text-base italic text-[var(--color-text-muted)]">{lesson.subtitle}</p>
      </div>

      <article className="text-[15px] text-[var(--color-text-muted)]">
        {lesson.id === 'journey'         && <Lesson1 />}
        {lesson.id === 'feasibility'     && <Lesson2 />}
        {lesson.id === '5341'            && <Lesson3 />}
        {lesson.id === 'gps'             && <Lesson4 />}
        {lesson.id === 'studies'         && <Lesson5 />}
        {lesson.id === 'system-strength' && <Lesson6 />}
        {lesson.id === 'mlfs'            && <Lesson7 />}
        {lesson.id === 'costs'           && <Lesson8 />}
        {lesson.id === 'r1-r2'           && <Lesson9 />}
        {lesson.id === 'reforms'         && <Lesson10 />}
        {lesson.id === 'queue'           && <Lesson11 />}
      </article>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/aemo-connections/${prev.id}`)}
            className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/aemo-connections/${next.id}`) }}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-colors">
            {progress.has(lesson.id) ? 'Continue' : 'Mark read & continue'} → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/aemo-connections') }}
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

export default function AemoConnectionsModule() {
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
        <Link to="/learn/aemo-connections" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to module index
        </Link>
      </div>
    )
  }

  return <LessonView lesson={lesson} progress={progress} onComplete={onComplete} />
}
