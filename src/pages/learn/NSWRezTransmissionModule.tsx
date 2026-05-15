/**
 * NSW REZs & Transmission Infrastructure — AURES Learning Module
 *
 * 7-lesson deep-dive covering both halves of the NSW build-out:
 * the five Renewable Energy Zones AND the TNSP backbone that makes
 * them work — Project EnergyConnect, HumeLink, VNI / VNI West.
 * Pitched at the same level as the Constraints and CIS-LTESA modules.
 */
import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-nsw-rez-progress'

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
  { id: 'framework',    number: 1, title: 'The NSW REZ + Transmission Framework',          subtitle: 'EII Act, Consumer Trustee, TNSP roles, why NSW chose REZs',     readingTime: '9 min' },
  { id: 'cwo',          number: 2, title: 'Central-West Orana REZ',                         subtitle: 'The first REZ and its anchor transmission project',             readingTime: '11 min' },
  { id: 'new-england',  number: 3, title: 'New England REZ',                                subtitle: '8 GW target — the largest, and slowest',                        readingTime: '11 min' },
  { id: 'sw-hcc-ill',   number: 4, title: 'South-West, Hunter-Central Coast & Illawarra',   subtitle: 'The other three NSW REZs',                                      readingTime: '10 min' },
  { id: 'pec',          number: 5, title: 'Project EnergyConnect — the long road',          subtitle: 'NSW-SA interconnector, RIT-T to energisation',                  readingTime: '12 min' },
  { id: 'humelink-vni', number: 6, title: 'HumeLink, VNI & VNI West — the NSW spine',       subtitle: 'Snowy 2.0 evacuation and NSW-VIC flows',                        readingTime: '10 min' },
  { id: 'compare',      number: 7, title: 'Compare-the-pair: where to develop',             subtitle: 'CF, access cost, lead time, planning friction',                 readingTime: '7 min' },
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
  return <h3 className="text-sm font-semibold text-[var(--color-text)] mt-5 mb-2">{children}</h3>
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
// Lesson 1 — Framework
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>What a REZ actually is</H2>
      <P>
        A Renewable Energy Zone (REZ) is a planning construct, not a technical one. It is a geographic
        polygon declared by the NSW Government under the Electricity Infrastructure Investment Act 2020
        (EII Act), inside which two things happen: <Em>coordinated transmission infrastructure</Em> is
        built to evacuate the area's renewable resource, and <Em>access rights</Em> to that transmission
        are auctioned to project developers. Outside a REZ, a renewable project still has to apply for
        connection to TransGrid the old-fashioned way — and increasingly, the answer is &ldquo;not for
        five years&rdquo;.
      </P>

      <Callout type="key">
        A REZ is therefore a <Em>two-sided market</Em>. On one side, NSW (via the Consumer Trustee at
        AEMO Services) procures shared transmission infrastructure, paying for it through a regulated
        levy on every NSW retail customer's bill. On the other side, generators bid for access to that
        transmission via an Access Scheme tender — paying for the right to connect to it. Both sides
        are designed to be in steady state by 2030.
      </Callout>

      <H2>The actors</H2>
      <Table
        emphasizeFirst
        headers={['Actor', 'Role']}
        rows={[
          ['NSW Government', 'Sets policy. Declares each REZ. Sets capacity targets. Owns the EII Act framework.'],
          ['EnergyCo (NSW)', 'Infrastructure planner. Designs the transmission needed for each REZ. Runs network optimisation. Funds investigation works.'],
          ['AEMO Services (Consumer Trustee)', 'Regulated counterparty for both access scheme tenders and LTESA tenders. Collects the consumer charge to fund infrastructure. Acts as agent for NSW consumers.'],
          ['TransGrid (and EnergyCo, post-2024)', 'TNSP responsible for actually building and operating the transmission. After the 2024 NSW review, public-owned EnergyCo took over delivery of HumeLink (and may take more in future).'],
          ['Network Service Provider (e.g. ACEREZ)', 'Consortium awarded the contract to design, build and operate a specific REZ transmission project under a 30-year concession.'],
          ['Generator developer', 'Bids into the Access Scheme tender for the right to connect a project. Separately bids into LTESA / CIS rounds for revenue underwriting.'],
          ['Distribution NSPs (Ausgrid, Endeavour, Essential)', 'Deal with the customer end of the network. Largely unaffected by REZ design but matter for any DC-connected behind-the-meter project.'],
        ]}
      />

      <H2>The underlying geographic logic — generation chases resource, not load</H2>
      <P>
        Step back from the regulatory machinery for a moment. The fundamental decision a REZ makes is
        a geographic one: <Em>build transmission to where the resource is</Em>, rather than build
        generation where the load is. That is a deliberate choice — and it reverses some prior
        Australian practice but echoes others.
      </P>
      <P>
        In the coal era, generation was located <Em>at the fuel</Em>, not at the load. The Latrobe
        Valley's brown-coal seams put four major power stations (Hazelwood, Yallourn, Loy Yang A, Loy
        Yang B) ~150 km from Melbourne. The Hunter Valley's black coal put Liddell, Bayswater and
        Eraring 200+ km from Sydney. The transmission network was built to evacuate the fuel, not to
        deliver to where people lived. The pattern was: <Em>generation goes to the resource, transmission
        goes to the load</Em>.
      </P>
      <P>
        The renewable era is structurally identical. Wind is on the Northern Tablelands. Solar is in
        the Riverina. Pumped hydro is in the Snowy Mountains. None of those are at the Sydney load.
        So once again the network has to be built to <Em>evacuate the resource</Em> — except this time
        the resource is geographically more dispersed (multiple REZs rather than two coal valleys), the
        scale is larger (32 GW vs ~10 GW of coal at peak), and the timeline is compressed (a decade vs
        the four decades over which the coal fleet was built).
      </P>

      <Callout type="key">
        The genuinely new question for the renewable era is not whether to chase resource — that's
        what generation has always done — but whether to <Em>also</Em> chase load. Behind-the-meter
        solar, distributed batteries, and demand-flexibility programs are all attempts to do exactly
        that: bring some of the generation to where the demand is. But for utility-scale wind and solar
        — and for grid-scale storage — the resource-led siting logic still holds, and that is what the
        REZ + TNSP architecture is designed for.
      </Callout>

      <P>
        This frame matters when assessing each REZ. South Australia is the canonical example of a
        renewable resource &ldquo;stuck&rdquo; without transmission — abundant wind, modest local load,
        and (until 2024) only one congested 660 MW interconnector to the rest of the NEM. That stranded
        energy is exactly what Project EnergyConnect was built to unstick (Lesson 5). The South-West
        NSW REZ is the same problem on a smaller scale: world-class solar resource, virtually no
        nearby load, and almost zero project economics without dedicated evacuation. Without the REZ +
        TNSP wrap, the resource is not commercially accessible.
      </P>

      <H2>Why NSW chose this model</H2>
      <P>
        Other states made different choices. Victoria pursued direct public investment (the SEC
        re-establishment). Queensland kept generation publicly owned (CleanCo, Stanwell). South
        Australia let the private market do the work. NSW's choice to declare REZs and run access-scheme
        tenders was a deliberate adaptation of two prior models:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>ERCOT CREZ (Texas)</Em> — between 2009 and 2014, Texas spent ~US$7B building 5,500 km of
          transmission ahead of the wind generation it would carry. The wind capacity that filled it grew
          from ~10 GW in 2009 to ~25 GW today. NSW's REZ thesis is structurally similar: build the
          transmission first, generation will fill it.</li>
        <li><Em>UK GB Connect Reform</Em> — the UK's response to the same connection-queue problem
          NSW faced in 2019-2020. Britain shifted from a first-come-first-served queue to a zonal
          allocation that prioritises projects ready to build. NSW's Access Scheme borrows the same
          ready-to-build prioritisation.</li>
      </ul>

      <H2>The five NSW REZs</H2>
      <Table
        emphasizeFirst
        headers={['REZ', 'Declared', 'Target capacity', 'Dominant tech', 'Anchor TNSP project']}
        rows={[
          ['Central-West Orana (CWO)', 'Oct 2020 (first declared)', '4.5 GW by 2030', 'Wind + storage + solar', 'CWO Transmission Project (ACEREZ consortium)'],
          ['New England', 'Dec 2020', '8 GW by 2030 (largest)', 'Wind dominant', 'New England Transmission Project (NETP)'],
          ['South-West', 'Aug 2021', '~3 GW by 2030', 'Solar + storage', 'Project EnergyConnect (interconnector backbone)'],
          ['Hunter-Central Coast', 'Nov 2022', '~5 GW (coal-replacement)', 'Mixed; offshore wind interface', 'Existing TransGrid network + Eraring/Vales reuse'],
          ['Illawarra', 'Aug 2023 (most recent)', '~4 GW (offshore wind)', 'Offshore wind primarily', 'Illawarra REZ Transmission (still in scoping)'],
        ]}
      />

      <H2>The TNSPs that connect them</H2>
      <P>
        REZs are not islands — they need to be connected to the rest of the NEM, to the major load
        centres (Sydney, Newcastle, Wollongong), and to other states. That is the job of the TNSP
        backbone:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project EnergyConnect (PEC)</Em> — NSW-SA interconnector via the South-West REZ.
          Stage 1 energised mid-2024, Stage 2 to full capacity 2025-26.</li>
        <li><Em>HumeLink</Em> — Wagga to Bannaby (south of Sydney) via Snowy 2.0. Critical to getting
          new pumped hydro into the Sydney load. NSW Government took the project public in 2024 after
          private-delivery cost blowouts.</li>
        <li><Em>VNI (existing)</Em> — Victoria-NSW Interconnector. 660 MW south-to-north, 1100 MW
          north-to-south.</li>
        <li><Em>VNI West</Em> — joint TransGrid + AusNet project. Originally targeted 2031,
          slipping. Will provide a second NSW-VIC corridor and unblock CWO/SW REZ exports south.</li>
      </ul>

      <Callout type="info">
        Lessons 5 and 6 of this module deep-dive PEC, HumeLink, VNI and VNI West individually. They are
        the most expensive, most contested, and most timeline-critical pieces of the NSW build-out — so
        they get their own treatment alongside the REZs themselves.
      </Callout>

      <Callout type="source">
        Sources: NSW Electricity Infrastructure Roadmap{' '}
        <a className="text-[var(--color-primary)] hover:underline" href="https://www.energy.nsw.gov.au/nsw-plans-and-progress/government-strategies-and-frameworks/electricity-infrastructure-roadmap" target="_blank" rel="noopener">overview</a>{' '}·
        EII Act 2020 (NSW){' '}·
        EnergyCo NSW{' '}
        <a className="text-[var(--color-primary)] hover:underline" href="https://www.energyco.nsw.gov.au/" target="_blank" rel="noopener">network planning materials</a>{' '}·
        AEMO Services{' '}
        <a className="text-[var(--color-primary)] hover:underline" href="https://aemoservices.com.au/" target="_blank" rel="noopener">Consumer Trustee tenders</a>{' '}·
        AEMO Integrated System Plan 2024 ·
        UK National Grid ESO Connect Reform · ERCOT CREZ historical analysis (UTexas, NREL).
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — CWO
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>The first one</H2>
      <P>
        Central-West Orana was the first REZ declared (October 2020) and remains the most advanced. It
        sits north-west of Mudgee, covering the Warrumbungle, Dubbo Regional, and Mid-Western Regional
        local government areas. The resource is excellent — modelled wind capacity factors of 32-38% and
        solar capacity factors of 26-29%, with the additional benefit of relatively flat terrain making
        construction cheaper than the New England equivalent.
      </P>

      <H2>The CWO Transmission Project</H2>
      <P>
        The transmission backbone of the CWO REZ is the Central-West Orana Transmission Project (CWO-TP),
        being delivered by the ACEREZ consortium under a 30-year network operator concession. ACEREZ is
        a joint venture of ACCIONA, Cobra, and Endeavour Energy. The project includes:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>~240 km of new 500 kV transmission line</li>
        <li>Three new switching stations (Stubbo, Elong Elong, Merotherie)</li>
        <li>An upgrade to the existing Wollar-to-Wellington 330 kV corridor</li>
        <li>~4.5 GW of network transfer capacity at full operation</li>
      </ul>
      <P>
        The original cost estimate (2021) was ~$3.2B. The current estimate, after a 2024 redesign and
        cost re-baseline, sits closer to <Em>$3.7-4.2B</Em>. Energisation of Stage 1 is targeted for
        late 2027, with the full project operational by 2028-29.
      </P>

      <Callout type="warn">
        The CWO-TP is the <Em>single biggest critical-path constraint</Em> for the CWO REZ. Without it,
        no connected generation can reach FID — and no FID means no construction. The slippage of the
        CWO-TP from a 2026 in-service date to 2028-29 is the single biggest reason that the CIS Tender 1
        wind projects in NSW (Valley of the Winds, Spicers Creek) sit at the &ldquo;grid connection
        pending&rdquo; dev_status today, despite having planning approvals secured.
      </Callout>

      <H2>The Access Scheme</H2>
      <P>
        Generators do not connect directly to the CWO-TP. Instead they bid into a tender run by AEMO
        Services for access rights — defined as a guaranteed firm transfer capacity in MW for a
        specified term (typically matching the LTESA term). The first CWO Access Scheme tender awarded
        ~3.5 GW of access rights spread across approximately 12 projects in 2023-24, with the residual
        capacity to be auctioned in subsequent rounds.
      </P>

      <H2>The anchor projects</H2>
      <Table
        emphasizeFirst
        headers={['Project', 'Capacity', 'Tech', 'Status (May 2026)']}
        rows={[
          ['Liverpool Range Wind Stage 1', '634 MW', 'Wind', 'CIS Tender 4 awarded; planning modification approved Oct 2024; awaiting access rights confirmation'],
          ['Spicers Creek Wind Farm', '700 MW + 400 MWh', 'Wind + storage', 'CIS Tender 1 awarded; IPC approval Oct 2024; grid connection pending'],
          ['Valley of the Winds', '936 MW + 320 MW BESS', 'Wind + hybrid', 'CIS Tender 1 awarded; IPC approval June 2025; grid connection pending'],
          ['Wellington Black Range', '~250 MW solar', 'Solar', 'In planning'],
          ['Yanco Delta Wind Farm', '~600 MW', 'Wind', 'In planning'],
          ['Sandy Creek Solar Farm', '700 MW solar', 'Solar', 'CIS Tender 1 awarded'],
        ]}
      />

      <H2>Consumer charge — what NSW bills are paying for</H2>
      <P>
        The CWO transmission cost is recovered from NSW retail customers under the EII Contributions
        regime. As at 2024, the Consumer Trustee estimated the CWO REZ adds approximately{' '}
        <Em>$5-15 per NSW household per year</Em> to retail electricity bills, ramping up as more REZ
        infrastructure comes online. AEMO Services publishes annual transparency reports on actual costs
        vs forecasts. The political acceptability of these charges is one of the underlying tensions in
        the broader NSW transition story.
      </P>

      <H2>The local context</H2>
      <P>
        The CWO sits in farming country — broadacre grain, sheep, and beef. Local pushback has been
        material. The Warrumbungle Shire Council formally objected to the Valley of the Winds approval;
        the Dubbo Regional Council passed motions opposing host-developer-funded community benefit
        funds (a quirky outcome). Spicers Creek's IPC approval process attracted 700+ submissions, ~85%
        of them objecting. The CWO is the first NSW REZ to face the genuine question of whether host
        community sentiment can derail the build-out — and the early answer (because CIS dollars and
        IPC determinations have so far overridden objections) is &ldquo;not yet&rdquo;.
      </P>

      <Callout type="source">
        Sources: EnergyCo NSW <em>CWO REZ network design materials</em> ·
        ACEREZ <em>concession agreement public summaries</em> ·
        AEMO Services <em>CWO Access Scheme tender results</em> ·
        TransGrid <em>Transmission Annual Planning Report (TAPR)</em> ·
        AURES{' '}
        <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
          Scheme Tracker
        </Link>{' '}for current project status by REZ ·
        NSW IPC determinations on Spicers Creek and Valley of the Winds.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — New England
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>The biggest one — and the slowest</H2>
      <P>
        The New England REZ (declared December 2020) has by far the largest target — <Em>8 GW of new
        generation capacity by 2030</Em>, more than CWO and SW combined. The wind resource is exceptional
        (modelled CFs of 36-42% in the highest-quality sites) but the terrain is harder, the towns are
        smaller, and the local political environment has been substantially more hostile than CWO's.
      </P>

      <Callout type="info">
        New England covers an area roughly the size of Tasmania. It includes the Northern Tablelands
        from Inverell south to Walcha, plus the Liverpool Plains. Tamworth is the largest town. The REZ
        spans 12 local government areas, each with a distinct planning posture — and most of them have
        passed motions calling for more rigorous planning review of wind projects.
      </Callout>

      <H2>The New England Transmission Project (NETP)</H2>
      <P>
        Where the CWO has the ACEREZ consortium, New England has had a much more complicated procurement
        history. The Network Operator role for NETP went through two separate tender attempts. The
        revised procurement (2024-25) selected a consortium for design and early works, with full
        construction expected to commence 2026-27. Energisation targets have moved from 2027 to{' '}
        <Em>2029-30</Em>.
      </P>
      <P>
        NETP includes:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>~340 km of new 500 kV transmission line, broadly along the existing Northern Tablelands corridor</li>
        <li>Multiple 500/330 kV substations with modular expansion capacity</li>
        <li>Estimated transfer capacity ~4.5 GW into the grid (with the remaining target capacity to be
          carried by separate connection arrangements for projects in the south of the REZ)</li>
        <li>Cost estimate (2024 base): <Em>$5-6B</Em></li>
      </ul>

      <H2>The Access Scheme tender</H2>
      <P>
        The first New England Access Scheme tender (2023) awarded ~2.95 GW of access rights — about a
        third of the REZ's eventual target. Awarded projects included Winterbourne Wind Farm (~500 MW),
        Hills of Gold Wind Farm (~400 MW), and several other large wind projects. Subsequent tenders
        will need to award the remaining ~5 GW, but progress has been slow because the underlying
        transmission timeline keeps moving.
      </P>

      <H2>Anchor projects</H2>
      <Table
        emphasizeFirst
        headers={['Project', 'Capacity', 'Status (May 2026)']}
        rows={[
          ['Winterbourne Wind Farm', '~700 MW', 'Planning approval issued; awaiting access rights'],
          ['Hills of Gold Wind Farm', '~400 MW', 'IPC approval; awaiting access rights and CIS round'],
          ['Thunderbolt Wind Farm', '192 MW Stage 1 (380 MW total)', 'CIS Tender 1 awarded; IPC approval May 2024'],
          ['Liverpool Range Wind (broader)', '1.3 GW total', 'Modification approved Oct 2024; in NETP catchment for some sub-stages'],
          ['Salisbury Solar', '~300 MW solar', 'Planning'],
          ['Various other wind projects', '~3 GW', 'Mixed planning status'],
        ]}
      />

      <H2>The local council problem</H2>
      <P>
        The NSW Government has had to manage a more difficult local-political environment in New England
        than in any other REZ. Examples:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Walcha Council formally requested the NSW Government rescind New England's REZ status in
          2023.</li>
        <li>Inverell, Glen Innes Severn, and Armidale Regional Councils have all passed motions
          requesting greater consultation on individual projects.</li>
        <li>Several wind projects have been referred to the IPC because of high objection volumes (50+
          objections triggers automatic referral under NSW SSD rules).</li>
        <li>The IPC has approved most projects subject to conditions — the system has worked, but each
          referral adds 6-12 months to a project timeline.</li>
      </ul>

      <Callout type="warn">
        Practical implication for a developer choosing between CWO and New England: New England's wind
        resource is materially better, but the planning friction adds 12-24 months to typical project
        timelines and can add $2-5/MWh of social-licence costs (community benefit funds, road
        upgrades, vegetation screening). The CWO is more expensive on resource (lower CFs) but easier
        on planning. The capture price effect — wind farms being weighted to the south of the NEM
        receive systematically higher capture prices — slightly favours New England.
      </Callout>

      <H2>The Hunter Power Project alignment</H2>
      <P>
        New England REZ shares its corridor with the existing 500 kV transmission line that runs from
        the Hunter to Inverell. The Hunter Power Project — a 660 MW gas peaker at Kurri Kurri owned by
        Snowy Hydro — sits at the south of this corridor, and its existence justifies some of the
        existing 500 kV capacity. Practically: wind energy generated in New England can flow south on
        existing infrastructure, but only up to a point. Beyond that point (which the existing line
        reaches at ~3 GW of additional injection), NETP becomes mandatory.
      </P>

      <Callout type="source">
        Sources: EnergyCo NSW <em>New England REZ network design</em> ·
        AEMO Services <em>New England Access Scheme tender outcomes</em> ·
        TransGrid <em>TAPR</em> ·
        NSW IPC determinations on Winterbourne, Hills of Gold, Thunderbolt ·
        Walcha Council, Inverell Council, Armidale Council resolutions on REZ projects ·
        Clean Energy Council <em>DELIVERING MAJOR CLEAN ENERGY PROJECTS IN NSW</em> report.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — SW + HCC + Illawarra
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>The other three NSW REZs</H2>
      <P>
        CWO and New England are the textbook REZs — wind-and-solar greenfield with new dedicated
        transmission. The other three are different in interesting ways: South-West rides the Project
        EnergyConnect interconnector; Hunter-Central Coast is about coal-replacement on existing
        transmission; Illawarra is the offshore-wind interface.
      </P>

      <H2>South-West REZ</H2>
      <P>
        Declared August 2021. Roughly 3 GW target. Sits in the Riverina between Wagga, Hay, and the
        Victorian border. Solar dominant — broadly the best NSW solar resource (modelled CFs of 28-31%)
        with reasonable single-axis-tracking economics. Storage co-location is heavily incentivised
        because the local network is constrained for unmanaged solar export.
      </P>

      <Callout type="key">
        SW REZ is the cleanest illustration of the resource-vs-load thesis. The Riverina has world-class
        solar resource and modest local wind. It has <Em>almost no local load</Em> — Wagga and Albury
        sit on the periphery, and the rest is broadacre agriculture. Without dedicated transmission, a
        500 MW solar farm here is essentially valueless: you cannot consume the energy locally and the
        existing 220-330 kV TransGrid backbone is already congested. PEC and the Access Scheme together
        turn the resource from stranded to accessible — and as soon as PEC Stage 1 energised in mid-2024,
        the existing operating solar farms (Limondale, Yatpool, Bomen) saw measurable curtailment
        relief. The SW REZ thesis is the resource-led model in its purest form.
      </Callout>
      <P>
        The South-West REZ does <Em>not</Em> have a dedicated REZ transmission project. Instead it
        rides on:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Project EnergyConnect (PEC)</Em> — the NSW-SA interconnector, which passes directly
          through the REZ. Stage 1 energised mid-2024.</li>
        <li><Em>The existing 220-330 kV TransGrid backbone</Em> — already substantially loaded.</li>
        <li><Em>Future VNI West</Em> — once delivered, will provide additional southern export
          capacity.</li>
      </ul>
      <P>
        The result: SW REZ projects typically have lower transmission cost exposure (no CWO-TP-style
        new build) but tighter capacity constraints. Many of the awarded SW REZ projects are
        solar-with-co-located-battery hybrids specifically designed to manage local network constraints.
      </P>

      <H3>SW REZ anchor projects</H3>
      <Table
        emphasizeFirst
        headers={['Project', 'Capacity', 'Notes']}
        rows={[
          ['Dinawan Solar Farm', '~500 MW', 'Existing solar, separate from the Dinawan Wind Farm Stage 1 CIS T4 award'],
          ['Limondale Solar Farm', '~349 MW', 'Operating; Yatpool sister project nearby'],
          ['Bomen Solar Farm', '~120 MW', 'Operating'],
          ['Riverina Energy Storage System', '~150 MW BESS', 'Operating; FCAS-focused'],
          ['Bingara North Solar Hybrid', '~300 MW + storage', 'In development'],
        ]}
      />

      <H2>Hunter-Central Coast REZ</H2>
      <P>
        Declared November 2022. The newest large REZ at declaration time, but it's primarily a{' '}
        <Em>coal-replacement zone</Em> rather than a greenfield buildout. The motivations:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Eraring Power Station</Em> — Origin's 2,880 MW coal plant. Originally to close 2025, now
          extended to April 2029.</li>
        <li><Em>Vales Point Power Station</Em> — Delta Electricity's 1,320 MW coal plant. Closure
          confirmed for 2029.</li>
        <li><Em>Existing transmission infrastructure</Em> — the Central Coast already has high-capacity
          500 kV transmission for coal export. As the coal closes, that infrastructure becomes
          available to renewables.</li>
      </ul>
      <P>
        The HCC REZ does not have a single dedicated transmission project. Instead it has the{' '}
        <Em>Hunter Transmission Project</Em>, a smaller package upgrading existing connections, plus
        the network rights freed up by coal closures. Most projects in the zone are batteries (Eraring
        BESS, Waratah Super Battery) sitting at the existing coal sites.
      </P>

      <H2>Illawarra REZ</H2>
      <P>
        Declared most recently (August 2023). The motivation is offshore wind. Australia's Offshore
        Energy Infrastructure regime declared a feasibility licence area off the Illawarra coast in
        2023, and successful licence holders will need a landside connection point. The Illawarra REZ
        is in the pre-network-design phase — TransGrid has been scoping options, but no firm
        transmission project has yet been gazetted. EnergyConnect's southern terminus at the Illawarra
        substation is the existing anchor.
      </P>

      <Callout type="info">
        Illawarra is also unusual in that it has the largest <Em>industrial demand</Em> of any NSW REZ,
        with BlueScope Steel and several other heavy industrial sites. Local industrial demand for
        renewable PPAs is strong — the question is whether offshore wind can be delivered at
        cost-competitive prices. Australian offshore wind is currently more expensive than NEM
        utility-scale onshore wind by $40-60/MWh on LCOE.
      </Callout>

      <H2>How the smaller REZs differ from CWO + New England</H2>
      <Table
        emphasizeFirst
        headers={['Test', 'CWO + New England', 'SW + HCC + Illawarra']}
        rows={[
          ['Dedicated TNSP project?', 'Yes — CWO-TP, NETP', 'No — ride existing or pending interconnectors'],
          ['Generator pays new transmission costs?', 'Indirectly via consumer charge', 'Yes — direct deep connection charges'],
          ['Project economics dominated by', 'Access scheme tender + CIS/LTESA', 'Direct connection cost + MLF'],
          ['Best fit for', 'Greenfield wind/solar with multi-GW scale', 'Storage + smaller solar + offshore wind'],
          ['Dominant developer type', 'Tier 1 IPP + super fund equity', 'Niche developers, plus repurposed coal owners'],
        ]}
      />

      <Callout type="source">
        Sources: EnergyCo NSW <em>SW REZ design materials</em> ·
        EnergyCo NSW <em>HCC REZ scoping report</em> ·
        Department of Climate Change, Energy, the Environment and Water (DCCEEW){' '}
        <em>Offshore Energy Infrastructure declarations</em> ·
        Origin Energy <em>Eraring extension agreement (NSW Government)</em> ·
        BlueScope Steel <em>renewables PPA disclosures</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — Project EnergyConnect
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>Why PEC matters</H2>
      <P>
        Project EnergyConnect (PEC) is the NSW-SA interconnector, completed in two stages between 2024
        and 2026. It is a 900 km HVAC transmission line running from{' '}
        <Em>Wagga (NSW) via Buronga to Robertstown (SA)</Em>. At full operation it can transfer{' '}
        <Em>800 MW from NSW to SA, 800 MW from SA to NSW</Em>, plus serve a Victorian tap-off at Buronga
        for Murray-Darling-region projects.
      </P>
      <P>
        It is the most consequential transmission project completed in Australia in twenty years.
        Without it, SA would have remained synchronously isolated from the rest of the NEM during high
        renewable periods, and NSW's Riverina solar would have hit local network constraints before
        delivering material market value.
      </P>

      <Callout type="key">
        PEC is the canonical example of the resource-vs-load problem the REZ + TNSP architecture is
        designed to solve. South Australia has been Australia's renewable showcase for a decade —
        regularly the most renewable region in the NEM, sometimes 100%+ instantaneous renewable share —
        but a chunk of that renewable energy was effectively <Em>stuck</Em>: SA's local load is roughly
        a quarter of the NEM's total, the existing Heywood interconnector to Victoria caps at ~600 MW,
        and during high-wind / high-solar periods SA spot prices crashed to zero or negative because
        the energy could not leave the state. PEC is the second route out. It does not move the resource
        closer to the load — that is geographically impossible — but it builds the wire that lets the
        resource travel to the load. Same logic that built the 500 kV from the Latrobe Valley to
        Melbourne in the 1970s, just with renewable energy in place of brown coal.
      </Callout>

      <H2>The long history</H2>
      <P>
        The PEC story began in 2009-10 with the ESCRI-SA proposal — an early attempt to use a 500 kV
        line as a strategic synchronous link to SA. That iteration failed the regulatory test. A
        second attempt, called Riverlink, was scoped in 2014-15. ElectraNet and TransGrid jointly
        revisited the case in 2018-19, this time with the AEMO Integrated System Plan endorsing it as a
        priority project. The RIT-T (Regulatory Investment Test for Transmission) outcome was published
        by the AER in <Em>August 2020</Em>.
      </P>
      <P>
        The 2020 RIT-T determined that a 330 kV HVAC link with an estimated capital cost of{' '}
        <Em>~$2.28B</Em> would deliver net market benefits of approximately $268M (NPV). The RIT-T was
        passed; final investment decision followed in 2021; construction began in late 2021.
      </P>

      <Callout type="numbers">
        PEC capital cost trajectory:<br/>
        <span className="text-[var(--color-text-muted)]">2020 RIT-T:</span> $2.28B (joint TransGrid/ElectraNet, 2020 dollars)<br/>
        <span className="text-[var(--color-text-muted)]">2022 contingency revision:</span> $2.4-2.5B<br/>
        <span className="text-[var(--color-text-muted)]">2024 cost re-baseline:</span> $2.7-2.8B<br/>
        <span className="text-[var(--color-text-muted)]">Final estimate (Stage 2 commissioning):</span> $2.8-2.95B
      </Callout>

      <H2>The two stages</H2>
      <P>
        PEC was delivered in two functional stages:
      </P>
      <Table
        emphasizeFirst
        headers={['Stage', 'Scope', 'Energisation', 'Practical effect']}
        rows={[
          ['Stage 1', '275 kV link Buronga–Robertstown completed; partial operation', 'Mid-2024 (June-Sep 2024)', 'Initial NSW-SA flow capability; ~330 MW of useful capacity. Riverina solar starts seeing dispatch into SA.'],
          ['Stage 2', 'Full 500 kV upgrade and Buronga-Wagga completion', 'Targeted late 2025; some elements slipping into mid-2026', 'Full 800 MW bidirectional capacity. SA blackout risk materially reduced. Riverina REZ achievable in earnest.'],
        ]}
      />

      <H2>The dispute history</H2>
      <P>
        PEC has been one of the most contested major transmission projects in Australian history.
        Issues that have surfaced in public proceedings:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>RIT-T methodology</Em> — Stage 1's cost-benefit analysis was challenged by some
          industry parties for under-estimating uncertainty. The AER's August 2020 determination
          rejected those objections but the issue persisted in lobby commentary for several years.</li>
        <li><Em>Easement and farmer compensation</Em> — easement payments to landholders along the
          900 km route were a sustained negotiation, and several easement disputes went to court.
          Mitigation arrangements were generally settled by Q4 2022.</li>
        <li><Em>System strength reductions in SA</Em> — early modelling suggested PEC would reduce SA's
          system strength margin during periods of low synchronous generation. AEMO's response was a
          set of targeted system strength services contracted via ElectraNet, plus the Hornsdale Power
          Reserve's additional inertia services. The mitigation worked.</li>
        <li><Em>Cost recovery to NSW consumers</Em> — TransGrid's portion of the cost is passed to NSW
          consumers via regulated transmission charges. The final cost-recovery arrangement was
          challenged by NSW IPART; the matter was largely resolved by 2024.</li>
      </ul>

      <H2>What PEC unlocks for the South-West REZ</H2>
      <P>
        For SW REZ developers, PEC is the difference between projects being economic and being
        stranded. Specifically:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Existing solar farms (Limondale, Yatpool, Bomen) regularly experienced significant
          curtailment under high-injection conditions before PEC. Stage 1's energisation reduced this.</li>
        <li>New SW REZ solar projects with co-located storage can now realistically target 90%+
          availability for dispatch, improving capture price by 8-12%.</li>
        <li>PEC also creates an SA-to-NSW import path during low-wind/high-solar periods in NSW —
          an asymmetric benefit that NSW retailers value.</li>
      </ul>

      <Callout type="info">
        PEC is also the reason the Australian energy market is, for the first time, plausibly{' '}
        <Em>fully synchronous</Em> across the entire NEM. Pre-PEC, SA could be islanded during certain
        events. Post-PEC, the synchronous link is much harder to break. AEMO has since downgraded SA's
        system risk classification.
      </Callout>

      <Callout type="source">
        Sources: AER <em>RIT-T outcome report on Project EnergyConnect (August 2020)</em> ·
        TransGrid + ElectraNet <em>joint progress reports</em> ·
        AEMO ISP{' '}
        <em>Stage 1 priority project endorsements</em>{' '}·
        AEMC{' '}<em>Network Transmission Cost Recovery rule changes</em> ·
        IPART NSW <em>cost-recovery review submissions</em> ·
        WattClarity{' '}<em>extensive PEC commissioning analysis</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — HumeLink, VNI, VNI West
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>The NSW spine</H2>
      <P>
        HumeLink, VNI (existing), and VNI West together form the NSW transmission spine — the corridor
        running south from the Sydney load through the Snowy Mountains and into Victoria. They are not
        REZ projects; they are <Em>system-level infrastructure</Em> that all of NSW (and increasingly
        VIC and SA) depend on.
      </P>

      <H2>HumeLink</H2>
      <H3>What it is</H3>
      <P>
        HumeLink is a 360 km, 500 kV double-circuit transmission line running from Wagga Wagga via
        Maragle (the planned Snowy 2.0 connection point) to Bannaby (south of Goulburn, with onward
        connection to Sydney). It will replace and augment the existing 330 kV corridor through the
        same region. At full operation it provides ~5 GW of additional transfer capability between
        the southern NSW REZ regions, Snowy 2.0, and the Sydney load.
      </P>

      <H3>Why it matters for Snowy 2.0</H3>
      <Callout type="key">
        HumeLink is the <Em>obligate evacuation path</Em> for Snowy 2.0. Without HumeLink, Snowy 2.0
        cannot deliver its 2 GW of pumped hydro capacity to the Sydney load. The relationship is
        existential: a delay to HumeLink directly delays the operating value of Snowy 2.0, and Snowy 2.0
        is the largest single dispatchable asset in the AEMO ISP step-change scenario.
      </Callout>

      <H3>The cost trajectory</H3>
      <P>
        HumeLink has been one of the most fraught transmission projects in NSW history. The cost has
        moved as follows:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>2020 RIT-T outcome</Em>: ~$3.3B (TransGrid commercial case)</li>
        <li><Em>2023 cost re-baseline</Em>: $4.7-5.5B</li>
        <li><Em>Mid-2024 review</Em>: ~$5.5-7.0B (depending on commissioning model)</li>
        <li><Em>NSW Government public-delivery decision (Q4 2024)</Em>: cost contained at ~$5.5B
          contingent on EnergyCo taking over delivery from TransGrid as the developer</li>
      </ul>
      <P>
        The NSW Government's decision in late 2024 to remove TransGrid as the lead developer and replace
        it with EnergyCo (the public infrastructure planner) was unprecedented — and is being closely
        watched as a possible model for other large transmission projects (including potentially VNI
        West if its own cost trajectory continues to escalate).
      </P>

      <H3>Status today</H3>
      <P>
        Construction is underway on Section 1 (Wagga-Maragle). Energisation targets:{' '}
        <Em>2026 partial, 2027 full</Em>. The Snowy 2.0 commissioning timeline (originally 2024-25,
        slipping to 2027-28) and HumeLink's energisation are now broadly aligned, mitigating the
        risk of stranded pumped hydro that earlier seemed possible.
      </P>

      <H2>VNI (existing)</H2>
      <P>
        The existing Victoria-NSW Interconnector is a single 330 kV double-circuit line completed in
        the early 1990s. It transfers approximately:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>660 MW South-to-North</Em> (VIC into NSW) — typically active in winter and high-NSW-load
          periods</li>
        <li><Em>1100 MW North-to-South</Em> (NSW into VIC) — typically active in summer and high-VIC-load
          periods</li>
      </ul>
      <P>
        VNI is a critical existing asset, but it has been heavily congested in recent years. A 2024
        analysis from WattClarity showed VNI binding (i.e. flowing at capacity) for ~30% of intervals
        in some quarters, particularly during high-solar shoulder periods.
      </P>

      <H2>VNI West</H2>
      <P>
        VNI West (sometimes called Western Renewables Link in Victoria) is a proposed second NSW-VIC
        interconnector. It would connect the Victorian Western Renewables Link (Bulgana to Sydenham)
        via a new corridor running north-east into NSW, terminating around Wagga or Dinawan in the SW
        REZ. The capacity would be ~3,000 MW bidirectional at full build.
      </P>

      <H3>Status, cost, and what's slipped</H3>
      <P>
        Originally targeted for 2031 in the AEMO ISP, the project has:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Target slipped to 2032+</Em> — slow Victorian planning approvals</li>
        <li><Em>Cost trajectory $3-4B</Em> — but with material upside risk</li>
        <li><Em>Joint TransGrid + AusNet delivery</Em> — coordinated, but with separate state regulatory
          approvals required</li>
        <li><Em>Western Renewables Link (Vic side)</Em> currently in detailed planning, with cost
          estimates increasing</li>
      </ul>

      <Callout type="warn">
        VNI West is the <Em>single biggest 2030+ critical-path risk</Em> for the broader NSW renewable
        build-out. Without it, CWO and SW REZ capacity expansion beyond ~7-8 GW becomes congested. AEMO
        ISP step-change requires VNI West online by 2032; current trajectory makes that look optimistic.
      </Callout>

      <H2>The NSW spine in summary</H2>
      <Table
        emphasizeFirst
        headers={['Project', 'Capacity', 'Cost', 'Energisation', 'Critical for']}
        rows={[
          ['Project EnergyConnect', '~800 MW each way', '$2.8-2.95B', 'Stage 1: mid-2024; Stage 2: 2025-26', 'SW REZ + SA market integration'],
          ['HumeLink', '~5 GW additional', '~$5.5B (post 2024 NSW Govt decision)', '2026-27', 'Snowy 2.0 evacuation + S-N flows'],
          ['VNI (existing)', '660/1100 MW', 'Sunk', 'Operating', 'NSW-VIC base load and reserves'],
          ['VNI West', '~3,000 MW', '$3-4B', '2032+', 'CWO/SW REZ capacity expansion + duplicate VNI'],
        ]}
      />

      <Callout type="source">
        Sources: AEMO Integrated System Plan 2024 ·
        TransGrid <em>Transmission Annual Planning Report</em> ·
        AER <em>RIT-T determinations</em> for HumeLink, PEC, and VNI West ·
        NSW Government media release <em>HumeLink public delivery decision</em> (Q4 2024) ·
        WattClarity{' '}<em>VNI binding analysis</em> ·
        AusNet Services <em>Western Renewables Link materials</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — Compare-the-pair
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>The decision matrix for a developer</H2>
      <P>
        For a developer choosing where in NSW to build, the REZ + transmission picture creates a
        non-trivial decision. The same generator (say, a 500 MW wind farm) has materially different
        economics depending on where it sits. This lesson sets out the comparative dimensions and what
        they imply.
      </P>

      <H2>The dimensions</H2>
      <Table
        emphasizeFirst
        headers={['REZ', 'Wind CF', 'Solar CF', 'Access fee', 'Tx lead time', 'Planning friction']}
        rows={[
          ['Central-West Orana', '32-38%', '26-29%', 'Moderate (consumer charge spread)', '2-3 yr (CWO-TP)', 'Moderate'],
          ['New England', '36-42%', '24-26%', 'Higher (NETP largest cost)', '4-5 yr (NETP slipping)', 'High'],
          ['South-West', '28-32%', '28-31% (best NSW solar)', 'Lower (rides PEC)', 'Now (PEC largely complete)', 'Low'],
          ['Hunter-Central Coast', '25-30%', '24-27%', 'Lowest (existing infrastructure)', 'Now', 'Low (industrial host)'],
          ['Illawarra', 'N/A onshore; 45-50% offshore', '24-26%', 'TBC (offshore wind regime evolving)', '4-6 yr', 'Moderate'],
        ]}
      />

      <H2>Capture price implications</H2>
      <P>
        Capture price (the actual $/MWh a project receives) varies systematically by location:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>New England wind</Em> tends to capture 5-10% above NSW pool average — winter peak
          alignment + relative wind/solar anti-correlation. The trade-off: higher transmission fees and
          planning costs.</li>
        <li><Em>SW REZ solar</Em> captures meaningfully below NSW pool average due to the cannibalisation
          effect (per the Solar Cannibalisation module — coming up). PEC has helped, but the underlying
          midday glut remains. Co-located storage materially improves capture.</li>
        <li><Em>CWO wind</Em> captures roughly NSW pool average. The capture-price advantage of New
          England has not yet shown up dramatically in CWO numbers, but it varies project by project.</li>
        <li><Em>HCC region</Em> projects benefit from being near the load — lower MLF erosion, shorter
          transmission distances, but limited new wind/solar resource available.</li>
      </ul>

      <H2>The decision rule</H2>
      <Callout type="key">
        For a 500 MW wind project: <Em>New England</Em> if you have planning patience and accept
        12-24 month timeline overhead in exchange for better resource and capture; <Em>CWO</Em> if you
        want a faster path to FID and a more developed access scheme; <Em>SW REZ</Em> if you're really
        a solar+battery developer and the wind component is opportunistic.<br/><br/>
        For a 500 MW solar+battery project: <Em>SW REZ</Em> first choice (best resource, lowest
        transmission cost, PEC complete); <Em>CWO</Em> as second choice (good resource, good access
        scheme); <Em>HCC</Em> if the project benefits from coal-replacement co-location.<br/><br/>
        For a 500 MW BESS: <Em>HCC</Em> for coal-site reuse and existing transmission;{' '}
        <Em>SW REZ</Em> for arbitrage value (wide intra-day price spread) and PEC bidirectional flow.
      </Callout>

      <H2>The transmission-risk premium</H2>
      <P>
        The single biggest variable in the decision is transmission delivery risk. As of May 2026:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>PEC</Em> — substantively delivered. Risk now is residual Stage 2 commissioning items.</li>
        <li><Em>CWO-TP</Em> — under construction, energisation 2027-28. Material slippage risk remains.</li>
        <li><Em>NETP</Em> — early works phase, energisation 2029-30. High slippage risk.</li>
        <li><Em>HumeLink</Em> — under construction (post-2024 NSW Govt decision). Delivery 2026-27.</li>
        <li><Em>VNI West</Em> — pre-construction. Delivery 2032+ (with material risk of 2034+).</li>
      </ul>
      <P>
        A practical implication: a developer choosing CWO has a 2-3 year longer wait for transmission
        than a developer choosing SW REZ, but a 1-2 year shorter wait than a developer choosing New
        England. For projects with a CIS contract (which has time limits for execution), this can be
        the difference between a viable and an unviable bid.
      </P>

      <H2>Where AURES live data fits</H2>
      <P>
        The AURES{' '}
        <Link to="/rez" className="text-[var(--color-primary)] hover:underline">
          REZ database
        </Link>{' '}
        carries the project mix, capacity factor history, and current dev_status for projects in each
        REZ. The{' '}
        <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
          Scheme Tracker
        </Link>{' '}
        shows the CIS/LTESA awards for each. The Wind and Solar value-analysis pages on individual
        projects show the actual capture-price outcomes, which are the ultimate test of these
        comparative claims.
      </P>

      <Callout type="source">
        Sources: AURES live data ·
        EnergyCo NSW <em>REZ design materials and capacity-factor estimates</em> ·
        AEMO Services <em>access scheme tender outcomes</em> ·
        TransGrid <em>TAPR</em> ·
        Aurora Energy Research <em>NSW capture price modelling</em> ·
        Cornwall Insight <em>NSW wind/solar pricing reports</em> ·
        The corresponding{' '}
        <Link to="/learn/cis-ltesa-bidding" className="text-[var(--color-primary)] hover:underline">
          CIS &amp; LTESA Bidding module
        </Link>{' '}
        for how the financial overlay interacts with REZ choice.
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
          <span className="text-3xl" aria-hidden>🗺️</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
            ✅ Available
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight"
          style={{ borderLeft: '4px solid #10b981', paddingLeft: 12, marginLeft: -12 }}>
          NSW REZs &amp; Transmission Infrastructure
        </h1>
        <p className="text-base italic text-[var(--color-text-muted)]">
          Five REZs and three TNSP backbones — where projects actually live or die.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          NSW has declared five Renewable Energy Zones — but a REZ without transmission is just a
          coloured polygon. This module covers both halves of the puzzle: the access-rights, anchor-
          project, and consumer-charge mechanics of each REZ, and the long-history TNSP build-out that
          connects them — Project EnergyConnect, HumeLink, VNI West, and the existing VNI. Heavy NSW
          focus, with cross-cuts to SA and VIC where the interconnectors land.
        </p>
      </div>

      <div className="space-y-3">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          return (
            <Link key={l.id} to={`/learn/nsw-rez/${l.id}`}
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
            <Link to="/rez" className="text-[var(--color-primary)] hover:underline">
              REZ database →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— project mix and capacity by REZ</span>
          </li>
          <li>
            <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
              Scheme Tracker →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— CIS/LTESA awards by REZ</span>
          </li>
          <li>
            <Link to="/learn/cis-ltesa-bidding" className="text-[var(--color-primary)] hover:underline">
              CIS &amp; LTESA Bidding module →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— how the financial overlay interacts with REZ choice</span>
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
        <Link to="/learn/nsw-rez" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← NSW REZs &amp; Transmission
        </Link>
        <span className="text-[var(--color-text-muted)]">Lesson {lesson.number} of {LESSONS.length} · {lesson.readingTime}</span>
      </div>

      <div className="space-y-1 pb-4 border-b border-[var(--color-border)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Lesson {lesson.number}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight">{lesson.title}</h1>
        <p className="text-base italic text-[var(--color-text-muted)]">{lesson.subtitle}</p>
      </div>

      <article className="text-[15px] text-[var(--color-text-muted)]">
        {lesson.id === 'framework'    && <Lesson1 />}
        {lesson.id === 'cwo'          && <Lesson2 />}
        {lesson.id === 'new-england'  && <Lesson3 />}
        {lesson.id === 'sw-hcc-ill'   && <Lesson4 />}
        {lesson.id === 'pec'          && <Lesson5 />}
        {lesson.id === 'humelink-vni' && <Lesson6 />}
        {lesson.id === 'compare'      && <Lesson7 />}
      </article>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/nsw-rez/${prev.id}`)}
            className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/nsw-rez/${next.id}`) }}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-colors">
            {progress.has(lesson.id) ? 'Continue' : 'Mark read & continue'} → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/nsw-rez') }}
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

export default function NSWRezTransmissionModule() {
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
        <Link to="/learn/nsw-rez" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to module index
        </Link>
      </div>
    )
  }

  return <LessonView lesson={lesson} progress={progress} onComplete={onComplete} />
}
