/**
 * AURES Learning — module catalogue
 *
 * The single source of truth for the /learn hub and the per-module stub
 * pages. Each module either points to a fully-built lesson page (status
 * = 'available') or renders a stub that surfaces the planned lesson
 * outline + research bibliography (status = 'in-development' / 'planned').
 *
 * Adding research sources here is deliberate: the breadth of sources
 * cited in each module is part of the AURES quality bar. When we
 * deep-build a module, every source listed here should be consulted.
 */

export type ModuleStatus = 'available' | 'in-development' | 'planned'

export interface ModuleSource {
  /** Display label */
  label: string
  /** Optional URL to source */
  url?: string
  /** Short note on what this source provides */
  note?: string
}

export interface ModuleSourceGroup {
  /** e.g. 'AEMO & regulators', 'Law firms', 'Consultancies', etc. */
  category: string
  items: ModuleSource[]
}

export interface ModuleLesson {
  /** Stable lesson id, used in the URL when built (e.g. /learn/<module>/<lesson>) */
  id: string
  /** Lesson number (1-indexed) — purely visual */
  number: number
  /** Lesson title */
  title: string
  /** 1-2 sentence summary of what the lesson covers */
  summary: string
  /** Optional list of bullet points the lesson will cover */
  covers?: string[]
  /** Optional flag for an interactive element planned (e.g. a calculator) */
  interactive?: string
}

export interface LearningModule {
  id: string
  /** Emoji icon for visual flavour */
  icon: string
  title: string
  /** Short tagline (1 sentence) */
  tagline: string
  /** 2-4 sentence longer description */
  description: string
  status: ModuleStatus
  /** Estimated total read time across all lessons, e.g. '45 min' */
  readingTime: string
  /** Anchor colour for the module card */
  accent: string
  /** Lesson outline — visible on the stub even before the module is built */
  lessons: ModuleLesson[]
  /** Research bibliography — visible on the stub */
  sources: ModuleSourceGroup[]
  /** Build-priority order (1 = first to be deep-built in Phase 2) */
  buildOrder?: number
  /** When the module was last revised */
  added: string
  /**
   * For 'available' modules, the route to the existing module page
   * (e.g. '/learn/constraints'). If undefined, the hub will route to
   * the generic stub at /learn/:moduleId.
   */
  route?: string
}

// ============================================================
// 1. NEM Constraints (already built — the gold-standard reference)
// ============================================================

const M_CONSTRAINTS: LearningModule = {
  id: 'constraints',
  icon: '⚡',
  title: 'NEM Constraints & Constraint Equations',
  tagline: 'Why dispatch is more than a bid stack — physics, equations, market impacts.',
  description:
    'A 7-lesson module explaining how network constraints work in the NEM, from physical phenomena through to market price impacts and data access. Pitched at the WattClarity level: technically credible, data-first, real constraint IDs throughout.',
  status: 'available',
  readingTime: '60 min',
  accent: '#3b82f6',
  added: '2026-05-09',
  route: '/learn/constraints',
  lessons: [
    { id: 'why-dispatch', number: 1, title: 'Why Dispatch Is More Than a Bid Stack', summary: 'NEMDE as Security-Constrained Economic Dispatch (SCED). The gap between cheapest-on-paper and physically safe.' },
    { id: 'anatomy', number: 2, title: 'Anatomy of a Constraint Equation', summary: 'LHS, RHS, operator and how they shape dispatch.' },
    { id: 'shift-factors', number: 3, title: 'Injection Shift Factors', summary: 'Where they come from and how they’re used.' },
    { id: 'types', number: 4, title: 'Types of Constraints', summary: 'Six-type browser: thermal, voltage stability, transient, oscillatory, system strength, FCAS.' },
    { id: 'ids', number: 5, title: 'Constraint IDs, Sets & Lifecycle', summary: 'Live constraint ID decoder, four worked decode examples.' },
    { id: 'market', number: 6, title: 'Market Impacts: Shadow Prices & Congestion', summary: 'Two-region shadow-price calculator, congestion-rent intuition, real case studies.' },
    { id: 'data', number: 7, title: 'Working with Constraint Data', summary: 'MMS table reference, NEMOSIS, SQL patterns, external tools.' },
  ],
  sources: [
    { category: 'AEMO', items: [
      { label: 'AEMO Constraint Equations and Sets — Operating Procedures', url: 'https://www.aemo.com.au/-/media/files/electricity/nem/security_and_reliability/power_system_ops/procedures/so_op_3705.pdf' },
      { label: 'NEMDE Cost-Functions: how the dispatch engine values violations' },
      { label: 'AEMO Constraint Library (live and historical equations)' },
    ]},
    { category: 'Industry analysis', items: [
      { label: 'WattClarity — extensive constraint commentary', url: 'https://wattclarity.com.au' },
      { label: 'Aurora Energy Research — congestion price modelling' },
      { label: 'Modo Energy — constraint analytics', url: 'https://modoenergy.com' },
    ]},
    { category: 'Tools & data', items: [
      { label: 'NEMOSIS — Python access to AEMO MMS', url: 'https://github.com/UNSW-CEEM/NEMOSIS' },
      { label: 'AEMO MMS Data Model — DISPATCHCONSTRAINT, GENCONDATA tables' },
    ]},
  ],
}

// ============================================================
// 2. AEMO Connection Process
// ============================================================

const M_CONNECTIONS: LearningModule = {
  id: 'aemo-connections',
  icon: '🔌',
  title: 'AEMO Connection Process for New Developments',
  tagline: 'The 36-50 month journey from feasibility to full registration.',
  description:
    'The connection process is one of the biggest determinants of NEM project timeline and risk. This 11-lesson module walks through every step: connection point selection and feasibility, NER 5.3.4 application, the 14 Generator Performance Standards, EMT vs RMS system studies, system strength as the binding constraint since 2018, Marginal Loss Factors and their revenue impact, connection cost allocation, R1/R2 commissioning hold-points, recent reforms and the 2024 Connections Reform Package, and a snapshot of the NEM-wide connection queue today.',
  status: 'available',
  readingTime: '135 min',
  accent: '#06b6d4',
  added: '2026-05-11',
  route: '/learn/aemo-connections',
  lessons: [
    { id: 'journey',         number: 1,  title: 'The connection journey end-to-end', summary: 'The 7 stages from feasibility to R2 registration, the 3 parties involved (AEMO, NSP, proponent), and why 12-month became 36-50 month.', covers: ['7-stage journey overview', 'AEMO vs NSP vs proponent roles', 'NER Chapter 5 framework', 'Tier 1/2/3 plant classification', 'Why timelines doubled 2017-2025'] },
    { id: 'feasibility',     number: 2,  title: 'Connection point selection and feasibility', summary: 'Pre-application work where most timeline pain originates. Three connection options, hosting capacity, NSP scoping fees, equipment model availability.', covers: ['Three connection-point options (existing substation, new spur, greenfield)', 'Network hosting capacity assessment', 'NSP Pre-Application Service ($30-150k)', 'IBR equipment model availability problem', 'Why feasibility-phase work pays back'] },
    { id: '5341',            number: 3,  title: 'NER 5.3.4 — the formal Application for Connection', summary: 'The legal moment. Mandatory data set, Functional Specification proposing GPS, NSP review, Offer to Connect, cost-and-access principles.', covers: ['NER 5.3.4 vs 5.3.4A pathways', 'Mandatory data set requirements', 'Functional Specification — the heart of the application', 'NSP application fees ($80k-500k)', 'Cost and access framework — AER Connection Charging Guideline'] },
    { id: 'gps',             number: 4,  title: 'Generator Performance Standards — the 14 standards', summary: 'S5.2.5.1 to S5.2.5.14 in detail. Automatic vs Negotiated vs Minimum compliance. The most-contested standards (reactive power, voltage ride-through, frequency response, system strength).', covers: ['14 GPS standards under NER 5.2.5', 'Three compliance levels (Automatic, Negotiated, Minimum)', 'Reactive power S5.2.5.1', 'Voltage ride-through S5.2.5.4 (LVRT/HVRT)', 'Frequency control S5.2.5.11', 'System strength response S5.2.5.5', 'GPS negotiation in practice'] },
    { id: 'studies',         number: 5,  title: 'System studies and modelling — PSS/E, PSCAD, RMS', summary: 'EMT vs RMS distinction. Why inverter-based resource studies take 4-10x longer. Equipment model dependency. AEMO and NSP review cycles.', covers: ['PSS/E, PSCAD, DIgSILENT toolchains', 'EMT vs RMS critical distinction', 'Equipment model availability (Tier-1 OEMs vs others)', 'Typical study workflow (9 specialist studies)', 'AEMO + NSP review cycles', 'The study merry-go-round problem'] },
    { id: 'system-strength', number: 6,  title: 'System strength — the binding constraint since 2018', summary: 'SCR (Short-Circuit Ratio), declared shortfalls, the System Strength Service Framework, synchronous condensers, grid-forming BESS, the 2027-2030 outlook.', covers: ['What system strength is (SCR)', 'Declared shortfalls by region (SA, NSW SW, QLD Far North, NSW New England, VIC West)', 'System Strength Service Framework (2021)', 'Synchronous condensers — primary mitigation', 'Grid-forming BESS — emerging alternative', 'Project economics — system strength as a cost'] },
    { id: 'mlfs',            number: 7,  title: 'Marginal Loss Factors — the revenue you didn\'t plan to lose', summary: 'How MLFs are calculated annually. The 2018-2024 degradation story by region. Why MLF changes can wipe out a project\'s debt service margin.', covers: ['What an MLF is and the math', 'Annual AEMO MLF process (April-July)', 'MLF degradation by region 2017-2024', 'Marginal vs average losses distinction', 'Static vs Dynamic MLF reform debate', 'Network development as primary mitigation'] },
    { id: 'costs',           number: 8,  title: 'Connection cost allocation', summary: 'Connection asset (proponent-funded) vs shared network upgrades (NSP-recovered). AER Connection Charging Guideline. REZ-based cost-sharing. Recent renegotiation pressure.', covers: ['Connection asset scope ($36-126M typical)', 'Shared network upgrades — who pays', 'AER Connection Charging Guideline principles', 'REZ-based cost-sharing frameworks', 'User-of-shared-network annual charges', 'Cost inflation drivers 2023-2026'] },
    { id: 'r1-r2',           number: 9,  title: 'R1, R2 and the commissioning hold-points', summary: 'The two-stage registration process. R1 initial energisation, hold-points, R2 full registration. The 2021-2024 R2 backlog. Constraint equations.', covers: ['R1 vs R2 — initial vs full registration', 'Hold-point structure (HP1 to HP4)', '4-24 month R1-to-R2 typical duration', 'R2 backlog of 25-40 projects', 'Constraint equations operational impact', 'Recent R2 milestones (Waratah Super Battery, Yatpool, etc.)'] },
    { id: 'reforms',         number: 10, title: 'Recent reforms — AEMC, Engineering Framework, CFD', summary: 'What 2022-2026 has changed. Key AEMC rule changes, AEMO Engineering Framework, 2024 Connections Reform Package, NSP-level reforms, what hasn\'t changed.', covers: ['AEMC Rule Changes 2017-2024 (system strength, PFR, SSSF)', 'AEMO Engineering Framework + Roadmap', '2024 Connections Reform Package', 'NSP-level reforms (Powerlink, TransGrid, AusNet)', 'CEC Connection Scorecard advocacy', 'What hasn\'t changed (equipment models, system strength capacity)'] },
    { id: 'queue',           number: 11, title: 'The connection queue today — what it actually looks like', summary: 'AURES data: ~275-330 projects, ~99-133 GW capacity in queue across the NEM and WA SWIS. Per-NSP queue depths. The 2030 CIS implications.', covers: ['Per-NSP queue status (TransGrid, Powerlink, AusNet, ElectraNet, Western Power)', 'Composition by technology + stage', 'Where the queue is healthiest vs most stressed', 'CIS pipeline implications for 2030', 'Strategic landscape for new developers', 'What\'s improving and what isn\'t'] },
  ],
  sources: [
    { category: 'AEMO & regulators', items: [
      { label: 'National Electricity Rules — Chapter 5 (Connection)', url: 'https://www.aemc.gov.au/regulation/energy-rules/national-electricity-rules' },
      { label: 'AEMO Connection portal & application forms', url: 'https://www.aemo.com.au/energy-systems/electricity/national-electricity-market-nem/participate-in-the-market/network-connections' },
      { label: 'AEMO Engineering Framework / Engineering Roadmap', url: 'https://www.aemo.com.au/initiatives/major-programs/engineering-framework' },
      { label: 'AEMC system strength rule changes (2017, 2021, 2023)' },
      { label: 'AER — Connection charging guideline' },
    ]},
    { category: 'Network Service Providers', items: [
      { label: 'Powerlink (QLD) connection guide' },
      { label: 'TransGrid (NSW) connection guide' },
      { label: 'AusNet Services (VIC) connection portal' },
      { label: 'ElectraNet (SA) connection process' },
      { label: 'Western Power (WA) generator access guide (SWIS)' },
    ]},
    { category: 'Law firms', items: [
      { label: 'Norton Rose Fulbright — connection negotiation series', url: 'https://www.nortonrosefulbright.com/' },
      { label: 'Allens — Energy & Resources publications', url: 'https://www.allens.com.au/' },
      { label: 'HSF Kramer — connection rule change tracker', url: 'https://www.hsfkramer.com/' },
      { label: 'Clayton Utz — generator connection insights' },
      { label: 'Gilbert + Tobin — system strength commentary' },
    ]},
    { category: 'Consultancies', items: [
      { label: 'Aurecon — generator connection studies' },
      { label: 'GHD — connection consulting' },
      { label: 'Baringa — connection economic analysis', url: 'https://www.baringa.com/' },
      { label: 'EY ROAM — system modelling and integration studies' },
      { label: 'DIgSILENT Pacific — PowerFactory studies' },
    ]},
    { category: 'Industry bodies', items: [
      { label: 'Clean Energy Council Connection Scorecard', url: 'https://cleanenergycouncil.org.au/' },
      { label: 'Energy Networks Australia — Network of the Future' },
      { label: 'Clean Energy Investor Group — connection bottleneck advocacy' },
    ]},
    { category: 'Press', items: [
      { label: 'RenewEconomy — connection-queue coverage', url: 'https://reneweconomy.com.au/' },
      { label: 'WattClarity — connection process explainers', url: 'https://wattclarity.com.au/' },
    ]},
    { category: 'AURES integration', items: [
      { label: 'AURES dev_status field — surfaces "grid connection pending" projects' },
      { label: 'AURES REZ data — connection point context per zone' },
    ]},
  ],
}

// ============================================================
// 3. Planning Approvals (EPBC + State)
// ============================================================

const M_PLANNING: LearningModule = {
  id: 'planning-approvals',
  icon: '🏛️',
  title: 'Planning Approval Pathways for Renewable Projects',
  tagline: 'State + EPBC + First Nations + cumulative impact — planning as practical strategy.',
  description:
    'The planning system is the single biggest source of pre-construction timeline risk for renewable projects in Australia. This 11-lesson module covers the two-track state + federal structure, deep-dives into each NEM state\'s pathway (NSW SSD/IPC, VIC DFP, QLD call-ins, SA SCAP, WA GEAI), the EIS process and its specialist studies, the EPBC Act and Nature Positive reforms, First Nations consultation and Cultural Heritage Management (including the Juukan Gorge legacy), planning timelines and the 2026 assessment cliff, recent IPC and Coordinator-General case studies, and the coordination bodies (EnergyCo, IDA, VicGrid, GEAI) trying to compress the system.',
  status: 'available',
  readingTime: '135 min',
  accent: '#a855f7',
  added: '2026-05-11',
  route: '/learn/planning-approvals',
  lessons: [
    { id: 'two-track',     number: 1,  title: 'The two-track planning system — state + federal', summary: 'How every major renewable project sits inside both state planning and the federal EPBC Act, and how the two layers sequence.', covers: ['State planning vs federal EPBC scope', 'When EPBC kicks in (MNES list)', 'Bilateral assessment vs approval agreements', 'Sequencing the two tracks', 'Recent reform context: Samuel Review, Nature Positive'] },
    { id: 'nsw',           number: 2,  title: 'NSW — SSD pathway and the Independent Planning Commission', summary: 'EP&A Act 1979, the SSD/SSI/CSSI pathways, the IPC, EnergyCo and the NSW Energy Policy Framework December 2024.', covers: ['SSD thresholds + SSI + CSSI', 'IPC composition + 25-objection trigger', 'Recent IPC determinations (Hills of Gold, Spicers Creek, Valley of the Winds)', 'EnergyCo + 5 declared REZs', 'Energy Policy Framework + Investment Delivery Authority'] },
    { id: 'vic',           number: 3,  title: 'Victoria — Planning & Environment Act and the DFP', summary: 'The VC34 wind moratorium of 2011-2015, the 2015 reset, ministerial call-in powers, and the Development Facilitation Program.', covers: ['Planning & Environment Act 1987', 'VC34 wind moratorium 2011-2015', '2015 Andrews repeal + wind renaissance', 'Development Facilitation Program 2024', 'VicGrid + 6 declared V-REZs', 'Western Renewables Link transmission saga'] },
    { id: 'qld',           number: 4,  title: 'Queensland — the call-in power and recent decisions', summary: 'Planning Act 2016, the Coordinator-General pathway, the 2023 wave of called-in renewables, and the post-October 2024 LNP shift.', covers: ['SARA + Coordinator-General + Ministerial call-in', '2023 called-in projects (Lotus Creek, Theodore, Mt Hopeful)', 'Wambo Wind Farm withdrawal', 'October 2024 LNP government policy shift', 'Western Downs solar success pattern', 'CleanCo Queensland pathway'] },
    { id: 'sa-wa',         number: 5,  title: 'SA and WA — leaner systems, separate journeys', summary: 'SA PDI Act bipartisan support and SCAP; WA\'s multi-agency regime, the Green Energy Approvals Initiative, the Pilbara, and offshore wind.', covers: ['SA Planning, Development & Infrastructure Act 2016', 'SCAP determination process', 'WA Planning + Environmental Protection Acts', 'Green Energy Approvals Initiative April 2024', 'Pilbara Energy Transition Plan', 'Offshore Electricity Infrastructure Act 2021'] },
    { id: 'eis',           number: 6,  title: 'Inside an EIS — what an Environmental Impact Statement actually contains', summary: 'The 12-18 specialist studies, biodiversity as the largest risk, public exhibition + Response to Submissions, and Section 75W modifications.', covers: ['EIS structure and scope', '12-18 specialist studies (BDAR, ACHAR, noise, visual, hydrology, glint+glare, hazard)', 'Costs ($1.5-10M typical) and timelines (12-30 months)', 'Biodiversity offsets and the BAM', 'Public exhibition + RtS', 'Section 75W modifications'] },
    { id: 'epbc',          number: 7,  title: 'EPBC Act 1999 — the federal environmental approval', summary: 'The 9 MNES, controlled-action decision, bilateral agreements, Samuel Review, and the Nature Positive Plan reforms 2022-2026.', covers: ['9 MNES categories', 'Referral + controlled-action decision (20 business days)', 'Assessment methods (PER, EIS, accreditation)', 'Samuel Review October 2020', 'Nature Positive Plan + EPA Australia + EIA', 'Climate Trigger debate'] },
    { id: 'first-nations', number: 8,  title: 'First Nations consultation and Cultural Heritage Management', summary: 'Native Title + state cultural heritage acts + the Juukan Gorge legacy. Best practice CHMPs and ACHARs.', covers: ['Native Title Act 1993 future acts', 'State Aboriginal cultural heritage acts (NSW, Vic, Qld, SA, WA)', 'Juukan Gorge May 2020 and aftermath', 'WA 2021 Act + 2023 reversal', 'CHMP / ACHAR process and typical 18-30 month duration', 'ILUAs and equity-based benefit sharing'] },
    { id: 'timelines',     number: 9,  title: 'Planning timelines — typical durations and where delays come from', summary: 'Why pre-construction planning has doubled to 40-50 months for NSW wind. The 2026 NSW pipeline cliff.', covers: ['Typical durations by tech (wind, solar, BESS, transmission)', 'Five biggest sources of unscheduled delay', '2026 NSW SSD pipeline backlog (~345 projects, ~120 GW)', 'DPHI capacity vs pipeline reality', 'What reforms shorten timelines vs what they don\'t'] },
    { id: 'case-studies',  number: 10, title: 'Case studies — recent approvals, refusals and what they reveal', summary: 'Hills of Gold, Spicers Creek, Valley of the Winds, Lotus Creek, Wambo, Western Renewables Link, Snowy 2.0.', covers: ['Hills of Gold refusal → redesign → approval', 'Spicers Creek model engagement', 'Valley of the Winds largest IPC approval (1 GW)', 'Lotus Creek QLD call-in success', 'Wambo Wind Farm withdrawal cautionary tale', 'Western Renewables Link transmission delays', 'Snowy 2.0 federal-state coordination'] },
    { id: 'acceleration',  number: 11, title: 'Acceleration levers — EnergyCo, IDA, VicGrid and the CIS planning hook', summary: 'How federal and state coordination bodies are trying to compress planning timelines, and what is still missing.', covers: ['EnergyCo NSW REZ coordinator role', 'Investment Delivery Authority NSW December 2024', 'VicGrid expansion 2024', 'WA Green Energy Approvals Initiative', 'Federal Bilateral Approvals (Nature Positive Stage 2)', 'CIS milestone-based payment lever', 'What\'s still missing: bilateral approvals, cultural heritage harmonisation, connection-planning sequencing'] },
  ],
  sources: [
    { category: 'Federal — EPBC', items: [
      { label: 'EPBC Act 1999 (consolidated)', url: 'https://www.legislation.gov.au/C2004A00485/latest/versions' },
      { label: 'DCCEEW EPBC public portal', url: 'https://epbcpublicportal.environment.gov.au/' },
      { label: 'Samuel Review of the EPBC Act (2020) and reform updates' },
      { label: 'Nature Positive reform package — 2026 status' },
    ]},
    { category: 'NSW', items: [
      { label: 'Environmental Planning & Assessment Act 1979', url: 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1979-203' },
      { label: 'NSW Planning Portal — Major Projects', url: 'https://www.planningportal.nsw.gov.au/major-projects' },
      { label: 'Independent Planning Commission NSW', url: 'https://www.ipcn.nsw.gov.au/' },
      { label: 'NSW Energy Policy Framework (Gilbert + Tobin commentary)' },
      { label: 'Investment Delivery Authority (IDA) materials' },
    ]},
    { category: 'VIC', items: [
      { label: 'Planning & Environment Act 1987', url: 'https://www.legislation.vic.gov.au/' },
      { label: 'Department of Transport & Planning — Renewable Energy', url: 'https://www.planning.vic.gov.au/' },
      { label: 'Big Build Approvals reform 2024' },
      { label: 'Development Facilitation Program' },
    ]},
    { category: 'QLD', items: [
      { label: 'Planning Act 2016 — call-in powers', url: 'https://www.legislation.qld.gov.au/view/html/inforce/current/act-2016-025' },
      { label: 'Coordinator-General — Coordinated Project pathway', url: 'https://www.statedevelopment.qld.gov.au/coordinator-general' },
      { label: 'QLD Government media releases on called-in renewables' },
      { label: 'Local Government Association of Queensland — community sentiment' },
    ]},
    { category: 'SA & WA', items: [
      { label: 'SA Planning, Development & Infrastructure Act 2016', url: 'https://www.legislation.sa.gov.au/' },
      { label: 'WA Planning & Development Act 2005', url: 'https://www.legislation.wa.gov.au/' },
      { label: 'WA Green Energy Approvals Initiative' },
      { label: 'Pilbara Energy Transition Plan' },
    ]},
    { category: 'Law firms', items: [
      { label: 'HSF Kramer — Sweeping changes for wind energy projects under new NSW planning framework', url: 'https://www.hsfkramer.com/notes/environmentaustralia/2024-posts/Sweeping-changes-for-wind-energy-projects-under-new-NSW-planning-framework' },
      { label: 'Norton Rose Fulbright — EPBC reform tracker' },
      { label: 'Ashurst — state-by-state planning guides' },
      { label: 'MinterEllison — renewable energy planning updates' },
      { label: 'Allens — Coordinated Project alerts (QLD)' },
      { label: 'Clayton Utz — environmental approvals practice' },
      { label: 'Gilbert + Tobin — Draft NSW Energy Policy Framework analysis' },
    ]},
    { category: 'Industry / consultancy', items: [
      { label: 'Clean Energy Council — DELIVERING MAJOR CLEAN ENERGY PROJECTS IN NSW report', url: 'https://www.ceig.org.au/delivering-major-clean-energy-projects-in-nsw/' },
      { label: 'Clean Energy Investor Group — planning bottleneck advocacy' },
      { label: 'Baringa — planning timeline modelling' },
      { label: 'EY ROAM — system planning intersection' },
    ]},
    { category: 'Press', items: [
      { label: 'RenewEconomy — wind & solar project approval coverage' },
      { label: 'PV Magazine Australia — state-by-state planning news' },
      { label: 'The Guardian — community-opposition reporting' },
    ]},
    { category: 'AURES integration', items: [
      { label: 'planning_approval_date field on NSW wind/CIS projects (curated)' },
      { label: 'CIS scheme tracker — links state planning to federal contract status' },
    ]},
  ],
}

// ============================================================
// 4. NSW REZs
// ============================================================

const M_REZ: LearningModule = {
  id: 'nsw-rez',
  icon: '🗺️',
  title: 'NSW REZs & Transmission Infrastructure',
  tagline: 'Five REZs and three TNSP backbones — where projects actually live or die.',
  description:
    'NSW has declared five Renewable Energy Zones — but a REZ without transmission is just a coloured polygon. This module covers both halves of the puzzle: the access-rights, anchor-project, and consumer-charge mechanics of each REZ, and the long-history TNSP build-out that connects them — Project EnergyConnect, HumeLink, VNI West, and the existing VNI. Heavy NSW focus, with cross-cuts to SA and VIC where the interconnectors land.',
  status: 'available',
  readingTime: '70 min',
  accent: '#10b981',
  added: '2026-05-11',
  route: '/learn/nsw-rez',
  lessons: [
    { id: 'framework',     number: 1, title: 'The NSW REZ + Transmission Framework', summary: 'EII Act 2020, the Consumer Trustee, TransGrid as TNSP, why NSW chose REZs at all.', covers: ['Electricity Infrastructure Investment Act 2020', 'AEMO Services as Consumer Trustee', 'EnergyCo as infrastructure planner', 'TransGrid as the existing TNSP', 'Why NSW chose REZs over a pure access-fee model', 'Comparable models: UK GB Connect Reform, ERCOT CREZ'] },
    { id: 'cwo',           number: 2, title: 'Central-West Orana REZ', summary: 'The first REZ — 4.5 GW target, the CWO Transmission Project, anchor projects.', covers: ['CWO Transmission Project (ACEREZ consortium)', 'Access scheme tender outcome', 'Anchor wind farms (Liverpool Range, Spicers Creek, Valley of the Winds)', 'Anchor solar + storage (Wellington Black Range, Yanco Delta)', 'Consumer charge mechanics'] },
    { id: 'new-england',   number: 3, title: 'New England REZ', summary: '8 GW target — the largest. NETP, project mix, why timelines have moved.', covers: ['New England Transmission Project (NETP)', 'Access scheme tender outcomes', 'Wind-dominant project mix (Winterbourne, Thunderbolt, Hills of Gold, Liverpool Range)', 'Hunter Power Project alignment', 'Local council and community pushback'] },
    { id: 'sw-hcc-ill',    number: 4, title: 'South-West, Hunter-Central Coast & Illawarra REZs', summary: 'The other three — solar-and-storage, coal-replacement, offshore-wind.', covers: ['South-West REZ — Riverina solar belt + Project EnergyConnect', 'Hunter-Central Coast — Eraring + Vales coal replacement', 'Illawarra — offshore wind interface', 'Why different REZs attract different developers'] },
    { id: 'pec',           number: 5, title: 'Project EnergyConnect — the long road', summary: 'NSW-SA interconnector, RIT-T, construction, cost overruns, current status.', covers: ['ESCRI-SA / Riverlink history', 'RIT-T outcome 2020', 'TransGrid + ElectraNet joint delivery', '900 km HVAC route Wagga–Buronga–Robertstown', '$2.3B → $2.8B+ cost trajectory', 'Stage 1 energisation mid-2024', 'Stage 2 to full capacity 2025-26', 'Inter-regional flow implications'] },
    { id: 'humelink-vni',  number: 6, title: 'HumeLink, VNI & VNI West — the NSW spine', summary: 'Snowy 2.0 evacuation, NSW-VIC flows, public delivery model, what slipped.', covers: ['HumeLink — 360 km 500 kV, Wagga to Bannaby', 'Why HumeLink unlocks Snowy 2.0', 'NSW public-delivery decision 2024', 'VNI existing — 660/1100 MW directional capacity', 'VNI West — joint TransGrid + AusNet', 'Original 2031 target slip', 'Cost trajectory'] },
    { id: 'compare',       number: 7, title: 'Compare-the-pair: where to develop', summary: 'CF, access cost, transmission lead time, planning friction — REZ-by-REZ.', covers: ['Resource quality (wind CF, solar CF) by zone', 'Access fee mechanics by REZ', 'Network charge differences', 'Planning friction (LGA, community sentiment)', 'TNSP commissioning risk by zone'] },
  ],
  sources: [
    { category: 'NSW Government', items: [
      { label: 'NSW Electricity Infrastructure Roadmap', url: 'https://www.energy.nsw.gov.au/nsw-plans-and-progress/government-strategies-and-frameworks/electricity-infrastructure-roadmap' },
      { label: 'EnergyCo NSW', url: 'https://www.energyco.nsw.gov.au/' },
      { label: 'AEMO Services Consumer Trustee', url: 'https://www.aemoservices.com.au/' },
      { label: 'NSW EnergyCo Statement of Opportunity (SOO) — annual' },
      { label: 'Investment Delivery Authority materials' },
    ]},
    { category: 'AEMO', items: [
      { label: 'Integrated System Plan (ISP)', url: 'https://aemo.com.au/energy-systems/major-publications/integrated-system-plan-isp' },
      { label: 'Transmission Annual Planning Report (TAPR) — TransGrid' },
      { label: 'AEMO ESOO — supply outlook' },
    ]},
    { category: 'Transmission projects', items: [
      { label: 'HumeLink — TransGrid project page' },
      { label: 'EnergyConnect (NSW-SA) — TransGrid' },
      { label: 'Central-West Orana Transmission Project (ACEREZ consortium)' },
      { label: 'New England Transmission Project' },
    ]},
    { category: 'Consultancies', items: [
      { label: 'Baringa — REZ economic modelling', url: 'https://www.baringa.com/' },
      { label: 'EY ROAM — REZ network modelling' },
      { label: 'Aurora Energy Research — Australia REZ insights', url: 'https://auroraer.com/' },
      { label: 'Cornwall Insight — NSW REZ outlook', url: 'https://www.cornwall-insight.com/' },
      { label: 'PSC Consulting — system studies' },
    ]},
    { category: 'Universities & research', items: [
      { label: 'UNSW Centre for Energy & Environmental Markets (CEEM)' },
      { label: 'ANU School of Engineering — Andrew Blakers research' },
      { label: 'Grattan Institute — energy reports' },
    ]},
    { category: 'Law firms', items: [
      { label: 'King & Wood Mallesons — REZ legal framework', url: 'https://www.kwm.com/' },
      { label: 'Norton Rose Fulbright — REZ access scheme tracker' },
      { label: 'Allens — EII Act updates' },
      { label: 'Gilbert + Tobin — Consumer Trustee tender alerts' },
    ]},
    { category: 'Press', items: [
      { label: 'RenewEconomy — REZ delivery coverage', url: 'https://reneweconomy.com.au/' },
      { label: 'WattClarity — transmission constraint analysis' },
      { label: 'PV Magazine Australia — REZ tender results' },
    ]},
    { category: 'AURES integration', items: [
      { label: 'AURES REZ data file (rez-zones.ts)' },
      { label: 'REZ-tagged projects across the AURES database' },
    ]},
  ],
}

// ============================================================
// 5. PPAs for renewable projects
// ============================================================

const M_PPAS: LearningModule = {
  id: 'ppas',
  icon: '📜',
  title: 'PPAs for Renewable Projects',
  tagline: 'From utility offtake to corporate boom to sovereign-backed CFD — how the contract evolved.',
  description:
    'Power Purchase Agreements are the backbone of renewable project finance. This 11-lesson module traces four distinct eras of the Australian PPA market, walks through the anatomy and three structural forms (physical, financial CFD, virtual), explores volume shape and the 24/7 hourly-matching movement, covers the LGC market collapse and what it did to PPA economics, profiles the major Australian corporate deals (Telstra-Murra Warra, BHP, Coles, Microsoft, Amazon, Atlassian), maps the seven-way risk allocation, tracks BNEF pricing, explains government-as-counterparty (CIS, LTESA, VRET, ACT auctions, QLD GOCs), surveys the corporate buyer landscape, and closes with the 2026-2030 outlook including data centre demand and the firming premium.',
  status: 'available',
  readingTime: '130 min',
  accent: '#8b5cf6',
  added: '2026-05-11',
  route: '/learn/ppas',
  lessons: [
    { id: 'history',         number: 1,  title: 'A brief history of the Australian PPA', summary: 'Four eras: state utility (pre-1998), RET decade (1998-2016), corporate boom (2017-2022), sovereign-backed (2022+).', covers: ['Pre-NEM state utility offtake', 'RET-driven gentailer PPAs', 'Telstra-Murra Warra 2017 catalyst', 'CIS / LTESA / VRET sovereign era', 'Era-by-era counterparty + structure comparison'] },
    { id: 'anatomy',         number: 2,  title: 'Anatomy of a renewable PPA', summary: 'Six headline terms (strike, term, indexation, volume, LGC, counterparty); second-tier clauses; schedules; bankability bar.', covers: ['Strike price, term, indexation', 'Volume profile + LGC treatment', '~15 second-tier negotiated clauses', 'Bankability bar (counterparty rating, DSCR, conditions precedent)', 'Pre-development risk allocation'] },
    { id: 'structures',      number: 3,  title: 'Physical, financial, virtual — the three PPA structures', summary: 'How each works mechanically: physical (energy + title transferred), financial CFD (settlement-only), virtual (corporate buyer\'s primary instrument).', covers: ['Physical PPA mechanics — gentailers + large industrial', 'Financial CFD — sovereign + some corporate', 'Virtual PPA — corporate buyer instrument', 'Sleeved variant via gentailer intermediary', 'Accounting / tax treatment under AASB 9'] },
    { id: 'shape',           number: 4,  title: 'Volume shape and the hourly-matching movement', summary: 'As-generated vs shaped vs baseload vs 24/7 hourly-matched. Premium structure ($0-$50/MWh) and who adopts which.', covers: ['5 shape archetypes', 'Solar\'s shape problem (cannibalisation)', 'Baseload PPAs and firming via co-located BESS', '24/7 carbon-free energy (CFE)', 'Microsoft, Google, AWS leadership', 'Hybrid project design implications'] },
    { id: 'lgc',             number: 5,  title: 'LGC bundling — bundled vs stripped PPAs', summary: 'The $90 to $5 LGC market collapse 2017-2026. Legacy bundled PPAs vs modern stripped structures. The replacement attribution question.', covers: ['LGC market mechanics', '2010-2026 price trajectory ($25 → $90 peak → $5)', 'Bundled vs stripped vs separately-priced', 'Legacy 2016-2018 bundled PPAs as above-market revenue', '2030 attribution question — GreenPower, state schemes, 24/7'] },
    { id: 'corporate-deals', number: 6,  title: 'Corporate PPAs in Australia — the big deals', summary: 'Telstra-Murra Warra (October 2017 catalyst); BHP, Coles, Microsoft, Amazon, Atlassian, Bunnings — what each shaped.', covers: ['Telstra-Murra Warra (2017 catalyst, 226 MW)', 'BHP Olympic Dam multi-asset', 'Coles-ENGIE 100% (2019)', 'Microsoft era (2021-2023, ~700+ MW)', 'Amazon, Atlassian, Bunnings, hyperscaler expansion', 'Lessons: aggregation, investment-grade buyers, brand value primary'] },
    { id: 'risk',            number: 7,  title: 'Risk allocation in detail', summary: 'Seven risks distributed: volume, shape, technical curtailment, economic curtailment, MLF, basis, change-in-law, credit. Standard 2026 allocation patterns.', covers: ['Volume + shape risk allocation', 'Technical vs economic curtailment treatment', 'MLF risk allocation (gross vs net)', 'Basis risk and regional reference price', 'Change-in-law clauses', 'Credit support (PCGs, bank guarantees, LCs)', 'Standard risk-allocation matrix'] },
    { id: 'pricing',         number: 8,  title: 'PPA pricing — the BNEF index and structural drivers', summary: 'BNEF Australia PPA index 2017-2025. Solar vs wind divergence ($55-70 vs $80-95). Firming premium ($5-50/MWh). What drives pricing.', covers: ['BNEF Australia PPA Tracker', 'Solar/wind divergence by year', 'Firming premium by structure', 'Four pricing drivers (LCOE, wholesale, LGC, competition)', '2024-2025 corporate PPA volume', '2026-2030 pricing convergence'] },
    { id: 'sovereign',       number: 9,  title: 'Government as counterparty — CIS, LTESA, VRET, ACT', summary: 'How sovereign-backed contracts (CIS, LTESA, VRET, ACT, QLD GOC) crowd in or out corporate buyers. Stacking arrangements.', covers: ['CIS — federal flagship (~25-30 GW)', 'NSW LTESA — long-duration storage focus', 'Victorian VRET — reverse auctions', 'ACT renewable energy auctions', 'QLD CleanCo + GOC model', 'Stacking sovereign + corporate'] },
    { id: 'buyers',          number: 10, title: 'The corporate buyer landscape today', summary: '5 buyer cohorts: hyperscalers, retail majors, mining + heavy industry, financial services, universities + government. 24/7 CFE leaders.', covers: ['Hyperscalers (Microsoft, Google, AWS, Meta, Apple)', 'Retail majors (Coles, Woolworths, ALDI, Bunnings)', 'Mining + heavy industry (BHP, Rio Tinto, Fortescue)', 'Financial services + universities', '24/7 carbon-free energy movement', 'Data centre wave 2027-2030'] },
    { id: 'outlook',         number: 11, title: 'Where this is going — the 2026-2030 PPA outlook', summary: '4 scenarios; 5 structural trends (firmed-as-default, data centre demand, LGC fadeout, pricing convergence, bankability shift); risks.', covers: ['Four 2030 scenarios', 'Firmed becomes default', 'Data centre demand reshapes pricing', 'LGC fadeout + 2030 replacement question', 'LCOE-plus-shape-premium pricing convergence', 'Bankability bar shifts', 'Risks to the outlook'] },
  ],
  sources: [
    { category: 'Industry market data', items: [
      { label: 'BloombergNEF Australia PPA Tracker', url: 'https://about.bnef.com/' },
      { label: 'Energetics PPA Outlook', url: 'https://www.energetics.com.au/' },
      { label: 'Schneider Electric — Energy & Sustainability Services PPA reports' },
      { label: 'Edify Energy commentary' },
      { label: 'Clean Energy Buyers Alliance' },
    ]},
    { category: 'Law firms', items: [
      { label: 'Norton Rose Fulbright — PPA practice publications', url: 'https://www.nortonrosefulbright.com/' },
      { label: 'King & Wood Mallesons — PPA legal updates', url: 'https://www.kwm.com/' },
      { label: 'MinterEllison — Corporate PPA series', url: 'https://www.minterellison.com/' },
      { label: 'Allens — Energy Transition publications' },
      { label: 'Ashurst — Corporate PPA insights' },
      { label: 'Clayton Utz — PPA risk allocation' },
      { label: 'Herbert Smith Freehills (HSF Kramer) — PPA structure series' },
    ]},
    { category: 'Consultancies', items: [
      { label: 'Baringa — PPA pricing models', url: 'https://www.baringa.com/' },
      { label: 'Wood Mackenzie — Australia PPA outlook' },
      { label: 'Cornwall Insight — Australia PPA report' },
      { label: 'EY ROAM — PPA modelling' },
      { label: 'Marsh — PPA insurance commentary' },
    ]},
    { category: 'Universities & research', items: [
      { label: 'UNSW CEEM — PPA literature' },
      { label: 'ANU CCEP — corporate offtake research' },
      { label: 'IRENA — global PPA evolution reports' },
    ]},
    { category: 'Industry bodies', items: [
      { label: 'Clean Energy Council — Corporate PPA toolkit', url: 'https://cleanenergycouncil.org.au/' },
      { label: 'Business Renewables Centre Australia' },
    ]},
    { category: 'Press', items: [
      { label: 'RenewEconomy — PPA deal coverage', url: 'https://reneweconomy.com.au/' },
      { label: 'PV Magazine Australia — corporate PPA reporting' },
      { label: 'WattClarity — settlement & PPA analysis' },
    ]},
    { category: 'AURES integration', items: [
      { label: 'AURES offtakes data per project', url: '/offtakers' },
      { label: 'Project-level scheme contracts (CIS/LTESA strikes)' },
    ]},
  ],
}

// ============================================================
// 6. The BESS Story in the NEM
// ============================================================

const M_BESS: LearningModule = {
  id: 'bess-story',
  icon: '🔋',
  title: 'Solar + BESS in the NEM — Boom, Cannibalisation, Batteries',
  tagline: 'The full arc: rooftop boom → cannibalisation deep-dive → BESS → spread saturation.',
  description:
    'Australia\'s solar and storage stories are too entangled to tell separately. Rooftop solar created cannibalisation, cannibalisation created the BESS opportunity, BESS deployment is now compressing its own arbitrage spread — and the next wave (long-duration storage and solar+storage co-location) is what answers that. This 12-lesson module tells the whole arc, with deep-dive treatments of capture-price decay (using AURES data), how a battery earns, the BESS records leaderboard, a three-lesson section on hybrid architectures and economics, and the coming spread-saturation question.',
  status: 'available',
  readingTime: '120 min',
  accent: '#22c55e',
  added: '2026-05-11',
  route: '/learn/bess-story',
  lessons: [
    { id: 'rooftop-boom',  number: 1, title: 'The Australian rooftop solar boom', summary: 'How feed-in tariffs, STCs and a hyper-competitive installer market built the world’s densest rooftop solar fleet.', covers: ['Premium FITs (NSW Solar Bonus, VIC Premium FIT)', 'STC scheme replacing RECs in 2011', 'Australian electrician industry — sole-operator competition keeps install costs low', 'Chinese module costs and dumping allegations', 'Cost trajectory: $5/W in 2010 to ~$1.10/W today', '~4 million homes, 24+ GW installed by 2026'] },
    { id: 'btm-scale',     number: 2, title: 'Commercial solar and the hidden demand effect', summary: 'Commercial mid-scale roll-out plus the impact of behind-the-meter generation on operational demand.', covers: ['Commercial 100 kW – 1 MW segment', 'Operational demand vs underlying demand', 'Minimum demand events in SA, VIC, QLD', 'How 30+ GW behind-the-meter changes the grid view of demand', 'Hidden demand growth from data centres and EVs masked by rooftop'] },
    { id: 'cannibalisation-mechanic', number: 3, title: 'The cannibalisation mechanic', summary: 'What value factor really means, why solar farms are perfectly correlated, the merit-order effect.', covers: ['Value factor = capture price / pool average', 'The merit-order effect formally', 'Why solar output is perfectly correlated within a region', 'Hourly profile of a typical solar farm', 'Negative spot prices — mechanism and who pays', 'Mathematical relationship between solar penetration and VF'] },
    { id: 'capture-price-decay',   number: 4, title: 'Capture-price decay — real data by state and farm', summary: 'Year-on-year VF decline using AURES data. Worst farms, best farms, and what predicts the gap.', covers: ['VF trajectory 2018-2026 by NEM region', 'Worst capture price farms (Bungala, Daydream, Hayman, Limondale)', 'Best capture price solar (regional outliers)', 'Curtailment — economic vs technical', 'AURES Solar Value Analysis cross-link', 'The "diversity capture premium" metric'], interactive: 'AURES Solar Value Analysis cross-link' },
    { id: 'hornsdale',             number: 5, title: 'Origins: Hornsdale and the Tesla bet', summary: 'How a Twitter bet brought the world\'s biggest battery to South Australia and rewrote the orthodoxy.', covers: ['28 Sep 2016 SA blackout context', 'Tesla / Neoen / Musk 100-day bet', 'Hornsdale Power Reserve commissioning Dec 2017', 'FCAS revenue surprise', '2019 expansion to 150 MW / 193.5 MWh'] },
    { id: 'how-earns',             number: 6, title: 'How a battery actually earns', summary: 'Arbitrage spread, FCAS, capacity contracts — and the real numbers from AURES.', covers: ['Spread = avg discharge price minus avg charge price', 'Round-trip efficiency 80–88%', 'Cycles per year (target ~250–350)', 'FCAS market revenue mix'], interactive: 'AURES BESS Records Leaderboard cross-link' },
    { id: 'duration-records',      number: 7, title: 'The duration evolution and BESS records', summary: '1-hour → 4-hour → 8h+. State-by-state records. CIS and LTESA driving each tier.', covers: ['Why 1-hour led for FCAS', 'CIS Tender 3 4-hour minimum', 'LTESA Round 6 8.7–11.5 hour batteries', 'AURES leaderboard per state'] },
    { id: 'hybrid-architecture',   number: 8, title: 'Hybrid architectures — what "hybrid" actually means', summary: 'Hybrid vs co-located vs paired vs integrated. AC-coupled vs DC-coupled topology. Shared connection economics. Charge sources and the renewable label.', covers: ['The 4 levels of integration (standalone / co-located / paired / DC-coupled)', 'AC-coupled engineering and energy flow', 'DC-coupled engineering, clipping recovery, single-inverter capex', 'What is shared at the connection point (asset, MLF, planning, BoP)', 'Renewable labelling — grid-charge vs solar-charge', 'Live AURES examples: Junction Rivers, Tallawang, Edify portfolio, Bundey, Killawarra, Collie'] },
    { id: 'hybrid-economics',      number: 9, title: 'Hybrid economics — solar+BESS vs standalone', summary: 'Four-way comparison: solar-alone, BESS-alone load-centre, BESS-alone REZ, hybrid. Unit economics, capex savings, revenue mix, bull/bear cases.', covers: ['The capex-saving line items ($60-100M shared BoP)', 'Revenue stack: solar capture-price rescue, BESS arbitrage with "free fuel"', 'Side-by-side IRR/NPV table per configuration', 'The bull case — what you must believe', 'The bear case — what could break it', 'Verdict per use case (REZ site, load-centre, brownfield, LDS)'] },
    { id: 'hybrid-cis-push',       number: 10, title: 'Hybrids in the CIS — the policy push', summary: 'Generation vs Dispatchable tender streams. T1→T4→T6 hybrid share trajectory (42% → 60% → 67%). What the 2026-2030 CIS pipeline looks like.', covers: ['CIS Generation vs Dispatch tender framework', 'T1 NEM Generation: 42% hybrid (8 of 19)', 'T4 NEM Generation: 60% hybrid (12 of 20) — the inflection', 'T5 + T6 WEM: 14-67% hybrid', 'LTESA hybrid eligibility (Maryvale Solar + BESS)', 'Future rounds T7-T12 — expected hybrid share', 'AEMO 2030 forecast: ~50% of new utility solar with co-located storage'] },
    { id: 'spread-reduction',      number: 11, title: 'BESS spread reduction — does the arbitrage eat itself?', summary: 'As more batteries arrive, midday-to-evening spread compresses. International experience and Australian outlook.', covers: ['The cannibalisation-by-storage thesis', 'AEMO QED data on spread compression', 'California 2022-23 spread collapse parallel', 'When does it start hitting Australia?', 'What survives — long-duration, co-located, multi-day storage'] },
    { id: 'outlook',               number: 12, title: 'Where this is going — more solar, more batteries', summary: 'Residential battery boom, AEMO ISP storage targets, the compounding loop.', covers: ['Federal Cheaper Home Batteries program (2025)', '~250,000+ home batteries by 2024', 'AEMO ISP storage outlook', 'NSW 2 GW / 28 GWh LDS target by 2034', 'BESS as price-setter (32% Q1 2026)', 'Why baseload exit means more solar AND more BESS'] },
  ],
  sources: [
    { category: 'AURES live data', items: [
      { label: 'AURES BESS Records Leaderboard', url: '/intelligence/bess-records' },
      { label: 'AURES BESS Value Analysis on each operating BESS' },
      { label: 'AURES BESS Capex analytics' },
      { label: 'AURES Battery Watch' },
    ]},
    { category: 'AEMO', items: [
      { label: 'AEMO Quarterly Energy Dynamics (QED)', url: 'https://www.aemo.com.au/energy-systems/electricity/national-electricity-market-nem/data-nem/market-management-system-mms-data' },
      { label: 'Integrated System Plan (ISP) storage outlook' },
      { label: 'AEMO ESOO storage outlook' },
    ]},
    { category: 'Industry analytics', items: [
      { label: 'Modo Energy — Australia battery market reports', url: 'https://modoenergy.com/' },
      { label: 'Gridcog Australia BESS analytics', url: 'https://www.gridcog.com/' },
      { label: 'Aurora Energy Research — Australia battery outlook', url: 'https://auroraer.com/' },
      { label: 'Cornwall Insight — battery price-setting analysis' },
      { label: 'Wood Mackenzie — Australia energy storage reports' },
      { label: 'BloombergNEF — Australia BESS' },
    ]},
    { category: 'Universities & research', items: [
      { label: 'UNSW CEEM — battery economics research' },
      { label: 'ANU School of Engineering — storage modelling' },
      { label: 'Grattan Institute — Storing fairness' },
    ]},
    { category: 'Press', items: [
      { label: 'RenewEconomy — battery coverage', url: 'https://reneweconomy.com.au/' },
      { label: 'Energy-Storage News (ESS-news)', url: 'https://www.energy-storage.news/' },
      { label: 'PV Magazine Australia — storage section' },
      { label: 'WattClarity — BESS settlement analysis', url: 'https://wattclarity.com.au/' },
    ]},
    { category: 'Notable case studies', items: [
      { label: 'Hornsdale Power Reserve — Neoen reports' },
      { label: 'Victorian Big Battery — Neoen reports' },
      { label: 'Waratah Super Battery — Akaysha / EnergyCo' },
      { label: 'Eraring Big Battery — Origin' },
      { label: 'Riverina BESS — Edify Energy' },
    ]},
  ],
}

// ============================================================
// 7. Solar Cannibalisation
// ============================================================

const M_SOLAR_CANN: LearningModule = {
  id: 'solar-cannibalisation',
  icon: '☀️',
  title: 'Solar Cannibalisation in the NEM',
  tagline: 'Why solar earns less than the pool — and where it ends.',
  description:
    'Solar farms generate at the same time as every other solar farm in the region. The collective midday peak floods the market and pushes spot prices toward zero, creating a structural revenue penalty unique to high-penetration markets. This module uses real AURES capture-price data from operating solar farms to show the cannibalisation curve, the regional differences (SA vs NSW vs QLD vs VIC), and the role of co-located storage.',
  status: 'in-development',
  readingTime: '40 min planned',
  accent: '#f59e0b',
  added: '2026-05-10',
  buildOrder: 4,
  lessons: [
    { id: 'mechanics', number: 1, title: 'The cannibalisation mechanic', summary: 'Why all solar farms generate at the same time, why that pushes prices down, and what the value-factor metric actually measures.', covers: ['Coincident-output problem', 'Merit-order effect', 'Value factor = capture / pool average', 'AEMO half-hourly RRP intuition'] },
    { id: 'data', number: 2, title: 'Live AURES data — VF by farm and region', summary: 'Real capture prices and value factors for every operating solar farm in AURES.', covers: ['SA leaders & laggards', 'NSW capture price distribution', 'QLD value-factor decay', 'Cross-state comparison'], interactive: 'AURES Solar Value Analysis cross-link' },
    { id: 'curve', number: 3, title: 'The cannibalisation curve', summary: 'How VF has declined as installed solar grew. Year-over-year capture price by region.', covers: ['Annual VF trend per state', 'Threshold effects (when VF dropped fastest)', 'Negative-price hours emergence', 'CSIRO GenCost LCOE vs LCOE-net-of-cannibalisation'] },
    { id: 'rooftop', number: 4, title: 'Rooftop solar — the hidden driver', summary: 'Rooftop displaces grid demand at midday. Why it makes utility-scale cannibalisation worse.', covers: ['DPV trajectory in each state', 'Operational demand vs underlying demand', 'Minimum demand events', 'Rooftop forecasting'] },
    { id: 'storage-stack', number: 5, title: 'Co-located storage as the answer (and its limits)', summary: 'Hybrid solar+battery vs standalone solar. The economics of charging your own dispatch trough.', covers: ['Charge-from-own-array math', 'Time-of-day arbitrage', 'CIS hybrid awards (T1 + T4)', 'Storage saturation risk'] },
  ],
  sources: [
    { category: 'AURES data', items: [
      { label: 'AURES Solar Value Analysis (per-project)' },
      { label: 'AURES Value Factor intelligence' },
      { label: 'AURES Drift Analysis (capture price over time)' },
    ]},
    { category: 'AEMO & data sources', items: [
      { label: 'AEMO Quarterly Energy Dynamics' },
      { label: 'AEMO MMS DISPATCHPRICE table' },
      { label: 'OpenElectricity API — generation-weighted prices', url: 'https://openelectricity.org.au/' },
    ]},
    { category: 'Consultancies', items: [
      { label: 'Aurora Energy Research — Australia solar capture price work', url: 'https://auroraer.com/' },
      { label: 'Cornwall Insight — capture price reports' },
      { label: 'Wood Mackenzie — Australia solar outlook' },
      { label: 'Modo Energy — solar capture pricing', url: 'https://modoenergy.com/' },
      { label: 'EY ROAM — capture price modelling' },
    ]},
    { category: 'Universities & research', items: [
      { label: 'UNSW CEEM — cannibalisation literature' },
      { label: 'ANU — Tom Brown / Andrew Blakers research' },
      { label: 'CSIRO GenCost reports', url: 'https://www.csiro.au/en/research/technology-space/energy/gencost' },
    ]},
    { category: 'Press & analysis', items: [
      { label: 'RenewEconomy — capture price coverage' },
      { label: 'WattClarity — cannibalisation analysis', url: 'https://wattclarity.com.au/' },
      { label: 'PV Magazine Australia — utility-scale solar reporting' },
    ]},
    { category: 'Operator commentary', items: [
      { label: 'Origin / Tilt / Neoen quarterly reports — capture price disclosures' },
      { label: 'Genex, Edify, ACEN investor materials' },
    ]},
  ],
}

// ============================================================
// 8. Energy Transition in the NEM
// ============================================================

const M_TRANSITION: LearningModule = {
  id: 'energy-transition',
  icon: '🔄',
  title: 'The Energy Transition in the NEM',
  tagline: 'Privatisation, the rise of the gentailer, and the decarbonisation arc.',
  description:
    'The modern NEM is the product of a structural reform that started in 1991, a series of state-by-state privatisations that ran 1992-2014, four corporate empires (AGL, Origin, EnergyAustralia, Alinta) that grew up inside it, and a sequence of policy + external-driver shocks that reshaped the generation landscape decade by decade. This 17-lesson module walks the full arc — pre-NEM origins, each state\'s privatisation path (with deep treatment of why Queensland kept GOCs), the rise of the gentailer business model, full profiles of the four organisations that dominate generation and retail, the RET era and Carbon Price era, the Coal Closure Decade, external drivers (solar PV + BESS learning curves), the data centre demand wildcard, the 2030-2035 NEM landing, and a closing synthesis of where this is going.',
  status: 'available',
  readingTime: '195 min',
  accent: '#0ea5e9',
  added: '2026-05-11',
  route: '/learn/energy-transition',
  lessons: [
    { id: 'pre-nem',          number: 1,  title: 'Pre-NEM Australia — state monopolies and COAG reform', summary: 'How electricity was structured before 1998: six state-owned vertically-integrated utilities, why the model broke, and the Hilmer / COAG reform that created the NEM.', covers: ['Six state utilities (Elcom, SECV, QEC, ETSA, SECWA, HEC)', 'Hilmer Review 1993', 'COAG energy reform 1991', 'Vertical disaggregation logic', 'NEM start 13 December 1998 + regional joins'] },
    { id: 'vic-selloff',      number: 2,  title: 'The Victorian sell-off (1992-96)', summary: 'Kennett\'s SECV breakup. Generation, distribution and retail privatised in four years. Who bought Loy Yang A, Loy Yang B, Hazelwood, Yallourn.', covers: ['Generation: 5 companies (Loy Yang A/B, Hazelwood, Yallourn, Energy Brix)', 'Distribution: 5 networks all sold to US buyers', 'Retail: Eastern, CitiPower, Powercor → AGL, Origin, TRUenergy', 'Loy Yang A price history through receivership', 'The Latrobe Valley legacy'] },
    { id: 'nsw-sa-priv',      number: 3,  title: 'NSW + SA — partial privatisation and the gentrader era', summary: 'Carr\'s 1997 attempt, Iemma\'s 2008 attempt, Keneally\'s 2010 Gentrader compromise, O\'Farrell\'s 2014 completion. SA\'s 1999 long-lease.', covers: ['Three failed Labor attempts in NSW', 'Keneally Gentrader deal $5.3B', 'Macquarie Generation $1.5B → AGL 2014', 'Eraring $50M → Origin 2013', 'Vales Point $1M', 'SA ETSA Utilities → CKI (Hong Kong)'] },
    { id: 'qld-wa',           number: 4,  title: 'Queensland GOCs and Western Australia — the alternatives', summary: 'Why QLD kept state ownership (4 GOCs: Stanwell, CS Energy, CleanCo, Energy Queensland), the Newman 2014 defeat, and WA\'s disaggregation/re-merger journey.', covers: ['Beattie/Bligh refused privatisation', 'Newman 2014 attempt + 2015 election defeat', 'QLD GOC structure today', 'Queensland Energy & Jobs Plan 2022 ($62B)', 'WA SECWA breakup + 2014 Synergy re-merger'] },
    { id: 'gentailer',        number: 5,  title: 'What is a gentailer (and why it works)', summary: 'Vertical integration as a natural retail hedge. Why basis risk killed non-gentailer retailers in 2017-19. Market share of the Big 4 today.', covers: ['Definition: gen + retail vertically integrated', 'Basis-risk hedging logic', '2017-19 wholesale spike & retailer casualty list', 'ACCC 2018 inquiry and why no structural separation', 'Big 4 retail share 77% vs gen share 39%'] },
    { id: 'agl-history',      number: 6,  title: 'AGL — the 187-year arc (1837 → 2026)', summary: 'Sydney gas streetlights 1837 → electricity entry 2000s → Loy Yang full ownership 2012 (Fukushima trigger for TEPCO sale) → Macquarie Generation 2014 → 2022 demerger battle defeated by Cannon-Brookes.', covers: ['1837 Australian Gas Light Company chartered', '2006 AGL Energy Ltd listed', '2007 Loy Yang stake via GEAC (with TEPCO)', '2011 Fukushima Daiichi disaster', '2012 AGL acquires remaining 67.5%', '2014 Macquarie Generation $1.505B', 'Largest generator AND largest emitter in Australia', '2022 demerger proposal + Grok Ventures + AustralianSuper takedown', 'Climate Transition Action Plan: $20B / 12 GW by 2035'] },
    { id: 'agl-today',        number: 7,  title: 'AGL today and 2030 — geographic mismatch and rebalance', summary: 'State-by-state customers vs generation footprint. The structural long-VIC/NSW, short-QLD/SA mismatch. How the renewables pipeline targets the rebalance.', covers: ['~4.5M customer accounts across 5 states', 'Long generation in VIC/NSW, short in QLD/SA/ACT', 'Liddell BESS 500 MW + Loy Yang BESS + Hunter wind cluster', '2030 generation map projection', 'Revenue mix shift: coal 65% → 0% by 2035'] },
    { id: 'origin',           number: 8,  title: 'Origin Energy — Boral, APLNG, Eraring, and the Brookfield bid', summary: 'Boral 1946 → Origin 2000 → APLNG ($20B LNG export) → Eraring 2013 ($50M) → Brookfield/EIG $19.5B bid rejected by AustralianSuper 2023.', covers: ['Boral demerger 2000', 'APLNG joint venture (Origin + ConocoPhillips + Sinopec)', '2013 Eraring purchase ~$50M', 'Brookfield/EIG bid 2022-23', 'AustralianSuper 17.45% veto', 'August 2024 NSW Eraring underwriting deal', 'Eraring BESS 700 MW / 2,800 MWh'] },
    { id: 'energy-australia', number: 9,  title: 'EnergyAustralia — Sydney County Council to Hong Kong-owned', summary: 'Sydney County Council 1935 → TRUenergy/CLP 2011 → EnergyAustralia rebrand 2012. Smallest renewables pipeline of the Big 4. CLP capital allocation tension.', covers: ['Sydney County Council 1935-1996', 'Keneally Gentrader retail sale to TRUenergy $2.04B', 'CLP Group ownership chain', 'Yallourn close 2028 (VIC Govt deal 2021)', 'Mt Piper to ~2040', 'Tallawarra B 320 MW + Wooreen BESS'] },
    { id: 'alinta',           number: 10, title: 'Alinta Energy — SECWA roots to Chow Tai Fook', summary: 'AlintaGas privatised 2000 → Babcock & Brown 2007 → collapse → TPG → Chow Tai Fook 2017. Loy Yang B 2017 acquisition. WA stronghold.', covers: ['AlintaGas IPO 2000', 'Browning expansion 2000-07', 'Babcock & Brown $7.4B / 2007 → GFC collapse', 'TPG Capital ownership 2011-17', 'Chow Tai Fook acquisition $4B (2017)', 'Loy Yang B from China Power International $1.07B', 'Smallest renewables build, strongest WA position'] },
    { id: 'ret-era',          number: 11, title: 'RET Era (2001-2016) — the LGC mechanism and the first wind boom', summary: 'MRET 2001 → LRET 2010 (41,000 GWh) → Warburton freeze 2014 → 33,000 GWh compromise → first wind boom delivery → LGC price collapse post-2020.', covers: ['MRET 9,500 GWh by 2010', 'Expanded LRET 41,000 GWh by 2020', 'LGC market mechanics', 'Warburton Review 2014 + 18-month investment freeze', '2015 bipartisan compromise', 'LGC peak ~$90/MWh (2017) → ~$5/MWh (2026)', 'Macarthur, Coopers Gap, Stockyard Hill commissioning'] },
    { id: 'carbon-price',     number: 12, title: 'Carbon Price Era (2012-2014) — 25 months that re-shaped coal', summary: '$23/tCO₂ from July 2012; merit-order shift; brown coal lost ~$28/MWh; Loy Yang A acquisition by AGL during the era; July 2014 repeal; long-tail impairment effect.', covers: ['Clean Energy Act 2011', 'Merit-order impact by fuel type', 'Wholesale price impact ~$25-30/MWh', 'AGL Loy Yang acquisition during carbon price', 'July 2014 Abbott repeal', 'Direct Action / ERF replacement', 'Long-tail effect on closure economics'] },
    { id: 'closure-decade',   number: 13, title: 'Coal Closure Decade (2016-2024) — from Northern + Hazelwood to managed exits', summary: '7 GW exited in 8 years; Hazelwood\'s 5-month notice shock; Finkel review; Liddell political chess; managed closures via government coordination by 2021+.', covers: ['Northern SA closure 2016', 'Hazelwood Nov 2016 shock', 'VIC prices doubled within 6 months', 'Snowy 2.0 announcement', 'Finkel Review + 3-year-notice rule', 'Liddell political battle 2017-23', 'Yallourn / Eraring / Bayswater managed deals'] },
    { id: 'external-drivers', number: 14, title: 'External drivers — solar costs, BESS learning curves, drought', summary: 'Solar PV 87% cheaper since 2010; BESS 80% cheaper since 2015; Chinese manufacturing scale; drought-induced hydro reduction; firmed renewables below new gas peaker LCOE by 2024.', covers: ['Solar PV $5/W → $0.10/W', 'BESS $1,400/kWh → $300/kWh', 'Chinese vertical integration + cluster effects', 'Trina, Jinko, Longi, CATL, BYD dominance', 'Tasmania 2015-16 hydro crisis', 'Murray-Darling 2017-19 drought', 'Black Summer solar reduction', 'Firmed renewable LCOE crossover'] },
    { id: 'data-centres',     number: 15, title: 'Data centres — the demand wildcard', summary: 'Global growth at 15-25%/yr accelerated by AI; TNSP connection-application surge (~15-20 GW pipeline); will it materialise, and could coal extend if it does?', covers: ['Global data centre share trajectories', 'Ireland and Singapore moratoriums', 'AI hyperscale + inference workloads', 'Australian existing footprint (~1.5 GW)', 'Transgrid, Ausgrid, Powerlink application volumes', 'Materialisation conversion rates (30/50/70%)', 'Coal extension scenario vs 24/7 corporate PPA scenario', 'AEMO ISP 2024 + 2026 update outlook', 'Gentailer positioning for DC wholesale contracts'] },
    { id: 'coal-exit',        number: 16, title: 'Coal exit and the 2030-35 NEM landing', summary: 'Coal closure schedule plant-by-plant. Federal/state interventions. Replacement build mix. What the gentailers become by 2035.', covers: ['NEM coal fleet: 24 GW peak → 4-5 GW by 2035', 'Federal/state underwriting models', 'Replacement: 80 GW of renewables+storage by 2035', 'Generation mix at 2030 (70-78% renewable)', 'Big 4 gentailer transition trajectories', 'Risks: forced closure, transmission delays, demand shock'] },
    { id: 'where-going',      number: 17, title: 'Where we go from here — synthesis', summary: 'Four 2035 scenarios (Step Change, Hydrogen Superpower, Data Centre Dominant, Slow Build). Gentailer trajectories per scenario. The second-half transition (47% → 80%+ renewable).', covers: ['Convergence of four forces (privatisation, policy, drivers, demand)', '2035 scenario table', 'Per-gentailer outcomes per scenario', 'Risk drivers (federal policy, transmission, supply chain, demand, balance sheets)', 'Developer pipeline implications', 'Why the second half is structurally harder', 'The remaining 33% timeline question'] },
  ],
  sources: [
    { category: 'AEMO & regulators', items: [
      { label: 'AEMO Integrated System Plan 2024 / 2026' },
      { label: 'AEMO Quarterly Energy Dynamics — historical archive' },
      { label: 'AEMC Strategic Priorities' },
      { label: 'Energy Security Board (ESB) Post-2025 Review' },
      { label: 'AER State of the Energy Market reports' },
    ]},
    { category: 'Universities & think tanks', items: [
      { label: 'Grattan Institute energy reports', url: 'https://grattan.edu.au/' },
      { label: 'ANU Centre for Climate & Energy Policy (CCEP)' },
      { label: 'UNSW Centre for Energy & Environmental Markets (CEEM)' },
      { label: 'CSIRO GenCost (annual)', url: 'https://www.csiro.au/en/research/technology-space/energy/gencost' },
      { label: 'Climate Change Authority — annual reports' },
    ]},
    { category: 'Government & policy', items: [
      { label: 'DCCEEW — Australia’s emissions projections' },
      { label: 'ARENA — annual reports' },
      { label: 'Clean Energy Finance Corporation (CEFC) — annual reports' },
      { label: 'Productivity Commission — energy reviews' },
    ]},
    { category: 'Consultancies', items: [
      { label: 'Wood Mackenzie — Australia outlook' },
      { label: 'BloombergNEF — Australia energy outlook' },
      { label: 'Aurora Energy Research — Australia decadal scenarios' },
      { label: 'Baringa — energy transition reports' },
      { label: 'EY ROAM — energy market modelling' },
      { label: 'IEA — Australia country review' },
    ]},
    { category: 'Press & commentary', items: [
      { label: 'RenewEconomy — Giles Parkinson archive', url: 'https://reneweconomy.com.au/' },
      { label: 'WattClarity — Paul McArdle commentary', url: 'https://wattclarity.com.au/' },
      { label: 'The Conversation — Australian energy academic commentary' },
      { label: 'Australian Financial Review — energy desk' },
    ]},
    { category: 'AURES data integration', items: [
      { label: 'AURES Generation Stack and Energy Mix Transition pages' },
      { label: 'Coal Watch on each major closing plant' },
      { label: 'Battery Watch on the storage build-out' },
    ]},
  ],
}

// ============================================================
// 9. Project Financing of Renewables
// ============================================================

const M_FINANCING: LearningModule = {
  id: 'project-financing',
  icon: '💰',
  title: 'Project Financing of Renewables',
  tagline: 'Debt, equity, DSCR, leverage — how a wind farm or BESS actually gets built.',
  description:
    'A project finance lens on the renewable build-out. This 11-lesson module starts from the basic Special Purpose Vehicle structure and walks through the equity stack (sponsors, infra funds, super funds, CEFC), the debt stack (senior, mezzanine, mini-perm vs term), the Australian lender market (Big 4, Japanese megabanks, European DFIs, CEFC), DSCR-based debt sizing math with worked examples, the seven-way risk allocation framework, the funding waterfall and key covenants, tax and accounting treatment, how CIS and LTESA transform bankability, refinancing dynamics, and the 2026-2030 lender outlook. Pitched at a level a board member could read end-to-end while still being technical enough for a finance professional.',
  status: 'available',
  readingTime: '135 min',
  accent: '#ec4899',
  added: '2026-05-11',
  route: '/learn/project-financing',
  lessons: [
    { id: 'spv',          number: 1,  title: 'Project finance 101 — the SPV structure', summary: 'Why renewable projects are financed off-balance-sheet via Special Purpose Vehicles. Limited recourse, SPV mechanics, why it matters for renewables.', covers: ['Limited recourse defining feature', 'SPV legal structure (Pty Ltd or trust)', 'Sponsor / HoldCo / ProjectCo / Lender architecture', 'Why PF suits renewables (capital intensity, predictable cash flows, asset-specific risks)', 'Trade-offs: higher cost, transaction friction, lost flexibility'] },
    { id: 'equity',       number: 2,  title: 'The equity stack — sponsors, infra funds, super', summary: 'Five equity tiers: sponsor, infra funds, super funds, strategic co-investors, CEFC. Target IRRs by class. How returns are structured.', covers: ['Sponsor equity (developer) — 15-40% of stack, target 15-25% IRR', 'Infra funds (Macquarie GIG, IFM, Brookfield, KKR)', 'Australian super funds (~$3.5T pool, growing renewable allocation)', 'CEFC as foundation investor (~$13-14B cumulative)', 'Equity waterfall structure with preferred returns + carry'] },
    { id: 'debt',         number: 3,  title: 'The debt stack — senior, mezzanine, mini-perm vs term', summary: 'Term vs mini-perm structure, senior vs subordinated debt, drawdown profiles, hedging requirements, debt sizing levers.', covers: ['Mini-perm vs term structure', 'Senior + mezzanine debt tiers', 'Drawdown during construction; amortisation post-R2', 'Mandatory interest rate hedging (80-95% notional)', 'Four debt sizing levers (CFADS, DSCR, tenor, pricing)', 'Currency (AUD-dominant)', 'Typical fee structure ($10-15M upfront on $400M)'] },
    { id: 'lenders',      number: 4,  title: 'The Australian lender market — who actually does the deals', summary: 'Big 4 dominate (40-50%). Japanese megabanks (20-25%). European DFIs + commercial. CEFC. Asian banks. Insurance companies emerging.', covers: ['Big 4 Australian banks (NAB, CBA, Westpac, ANZ)', 'Japanese megabanks (MUFG, Mizuho, SMBC)', 'European players (ING, BNP, Société Générale, Nord/LB, Credit Agricole)', 'CEFC federal foundation lender', 'Asian DFIs (KEXIM, KDB, JBIC)', 'Insurance companies as emerging lender class', 'Typical 3-6 lender syndicate composition'] },
    { id: 'dscr',         number: 5,  title: 'DSCR and leverage — how lenders size debt', summary: 'DSCR math with worked example. P50/P90 mechanics. Sculpted vs flat amortisation. Achievable leverage by revenue profile.', covers: ['DSCR formula and three types (base, downside, average)', 'Worked example: 200 MW wind farm DSCR sizing', 'P50/P90/P99 framework', 'Sculpted amortisation for seasonal cash flows', 'Achievable leverage by contract certainty (40-80%)', 'Lender stress testing (8 sensitivity scenarios)'] },
    { id: 'risk',         number: 6,  title: 'Risk allocation in renewable PF', summary: 'Seven risk categories: construction, resource, market, technical, regulatory, counterparty, force majeure. How each is mitigated.', covers: ['Construction risk via lump-sum turnkey EPC', 'Resource risk via P90 sizing + emerging insurance', 'Market risk via PPA + CIS contracts', 'Technical risk via OEM warranties + O&M', 'Regulatory risk via change-in-law clauses', 'Counterparty risk via PCGs + LCs + step-in rights', 'Force majeure via comprehensive insurance + reserves'] },
    { id: 'waterfall',    number: 7,  title: 'The funding waterfall and key covenants', summary: '10-step cash flow waterfall from opex through to equity distribution. Reserve accounts, lock-up tests, covenants, cure rights, step-in.', covers: ['10-step funding waterfall', 'Reserve accounts (DSRA, MMR, working capital)', 'Lock-up tests (DSCR trailing + forward; no defaults)', 'Financial + affirmative + negative covenants', 'Equity cure rights for breach situations', 'Cash sweep for merchant-tail projects', 'Lender step-in rights as ultimate tool'] },
    { id: 'tax',          number: 8,  title: 'Tax structures and accounting', summary: 'Accelerated depreciation as the largest single tax benefit. IFRS 9 hedge accounting. Tax equity (rare in Australia). CIS contract accounting.', covers: ['Australian corporate tax framework (30% rate)', 'Accelerated depreciation as primary benefit', 'Why tax-equity is rare in Australia (no ITC/PTC)', 'IFRS 9 hedge accounting for interest swaps + PPAs', 'Stamp duty and state considerations', 'CIS contract derivative accounting'] },
    { id: 'cis-impact',   number: 9,  title: 'How CIS and LTESA transform bankability', summary: 'Revenue floor changes the math. Worked example showing 40% increase in debt capacity. CFD accounting. Stacking with corporate PPAs.', covers: ['CIS floor + ceiling mechanics', 'Quantified bankability boost (+15-20 pp leverage, -100-150 bps margin)', 'CIS as financial derivative under IFRS 9', 'LTESA long-tenor variant for storage', 'Stacking CIS + corporate PPA optimal structure', 'What CIS does NOT solve (construction, resource, curtailment)', 'Political risk considerations'] },
    { id: 'refinancing',  number: 10, title: 'Refinancing — when the mini-perm rolls', summary: 'Why mini-perm dominates. Refinancing cycle every 5-7 years. The 2024-2028 refinancing wave ($60-80B). Equity injection scenarios.', covers: ['Mini-perm refinancing imperative', 'Why mini-perm vs true 12-15 yr term', 'Refinancing timeline (year 3-5 prep, year 5 close)', 'Pricing dynamics at refinancing', 'Soft tenor extension as penalty mechanism', '2024-2028 refinancing wave ($60-80B)', 'Equity injection scenarios (cure, refinancing, restructuring)'] },
    { id: 'outlook',      number: 11, title: 'Recent deals and the 2026-2030 lender outlook', summary: 'Murra Warra, Stockyard Hill, Coopers Gap, Eraring BESS, Waratah Super Battery. Five trends for the 2030 vision: $80-120B total debt.', covers: ['Murra Warra Stage 1 (2018-19) — first major corporate PPA + PF', 'Stockyard Hill (2019) — largest southern hemisphere wind', 'Coopers Gap + PARF — gentailer balance-sheet model', 'Eraring BESS (2023-25) — large BESS financing template', 'Waratah Super Battery (2023-24) — grid-forming BESS', 'Five 2026-2030 trends', '2030 vision: $80-120B total renewable debt outstanding'] },
  ],
  sources: [
    { category: 'Law firms (project finance)', items: [
      { label: 'King & Wood Mallesons — Energy & Resources PF series', url: 'https://www.kwm.com/' },
      { label: 'Norton Rose Fulbright — Project Finance Sourcebook' },
      { label: 'Allens — Renewable Energy Finance updates' },
      { label: 'Allen & Overy / Shearman — global PF tracker' },
      { label: 'Ashurst — Australian project finance practice' },
      { label: 'White & Case — global PF reports' },
      { label: 'Clayton Utz — finance & infrastructure publications' },
      { label: 'HSF Kramer — energy finance updates', url: 'https://www.hsfkramer.com/' },
    ]},
    { category: 'Banks & lenders', items: [
      { label: 'Clean Energy Finance Corporation (CEFC) — investment principles', url: 'https://www.cefc.com.au/' },
      { label: 'NAB — energy finance reports' },
      { label: 'CBA — energy finance' },
      { label: 'Westpac / ANZ — sustainability-linked loans' },
      { label: 'MUFG / BNP / ING — Australia infrastructure desks' },
    ]},
    { category: 'Industry data', items: [
      { label: 'IJGlobal — Australian PF deal database', url: 'https://www.ijglobal.com/' },
      { label: 'Inframation Group — renewables deals' },
      { label: 'BloombergNEF — Energy Finance reports' },
    ]},
    { category: 'Consultancies', items: [
      { label: 'KPMG — Renewable Energy Finance practice' },
      { label: 'Deloitte — Renewables Finance' },
      { label: 'EY ROAM — financial models supporting bankability' },
      { label: 'PwC — Energy & Utilities' },
      { label: 'Marsh — PF insurance practice' },
    ]},
    { category: 'Universities & research', items: [
      { label: 'UNSW CEEM — financing literature' },
      { label: 'Australian National University — finance research' },
      { label: 'Climate Change Authority — Capital flows reports' },
    ]},
    { category: 'Press', items: [
      { label: 'AFR — finance pages' },
      { label: 'RenewEconomy — finance coverage' },
      { label: 'Inframation News' },
    ]},
    { category: 'AURES integration', items: [
      { label: 'AURES Developer Scores intelligence' },
      { label: 'Project-level scheme contracts and offtake fields' },
    ]},
  ],
}

// ============================================================
// 10. CIS & LTESA Bidding Parameters (Phase 2 first deep-dive)
// ============================================================

const M_CIS_LTESA: LearningModule = {
  id: 'cis-ltesa-bidding',
  icon: '🎯',
  title: 'CIS & LTESA Bidding Parameters',
  tagline: 'How sovereign-backed renewable underwriting auctions actually work.',
  description:
    'A deep dive into the mechanics of bidding into the federal Capacity Investment Scheme and NSW Long-Term Energy Service Agreements. The strike price, floor and ceiling parameters, an interactive PPA × CISA calculator showing where the dollars come from across spot scenarios, merit criteria evolution, First Nations & Social Licence requirements, project bonds, and how each round\'s changes interact with project finance and equity returns. Heavy use of AURES scheme tracker data.',
  status: 'available',
  readingTime: '80 min',
  accent: '#3b82f6',
  added: '2026-05-11',
  route: '/learn/cis-ltesa-bidding',
  lessons: [
    { id: 'architecture', number: 1, title: 'The federal-state architecture', summary: 'Why Australia ended up with two parallel sovereign underwriting schemes.', covers: ['CIS national rationale', 'LTESA Electricity Infrastructure Investment Act 2020', 'Overlap & gap-filling', 'How states without LTESA equivalents fare'] },
    { id: 'cis-mechanics', number: 2, title: 'CIS mechanics — floor + ceiling CFD', summary: 'The CISA structure. Strike price vs floor, ceiling sharing, term length.', covers: ['Underlying CFD structure', 'Floor price negotiation', 'Ceiling profit-share triggers', 'Term length (typically 12-15 years)', 'Generation vs Dispatchable contracts differ'] },
    { id: 'ppa-cisa-calculator', number: 3, title: 'PPA × CISA interactive calculator', summary: 'Adjust PPA strike, CISA floor + ceiling, annual cap — see how dollars flow across 8 spot scenarios. 14-point critical-interactions checklist.', covers: ['Where the dollars come from across spot scenarios', 'PPA volume / tenor / coverage interactions', 'Negative spot prices and curtailment behaviour', 'CISA annual cap — when government\'s wallet runs out', 'Reference price choice (RRP vs realised)', 'MLF gross vs net', 'LGC treatment + bundling', '14-point interactions checklist'], interactive: 'PPA × CISA revenue stack chart' },
    { id: 'ltesa-mechanics', number: 4, title: 'LTESA mechanics — fixed-price CFD', summary: 'The Consumer Trustee, fixed-price strike, the LDS variant.', covers: ['Fixed-price two-way CFD', 'NSW EnergyCo / AEMO Services roles', 'Round 1 generation vs Round 6 LDS', 'Aboriginal Participation Plans'] },
    { id: 'rounds', number: 5, title: 'Round-by-round — what changed and why', summary: 'CIS Pilot → T1 → T2 (WEM) → T3 → T4 → T5/T6 (WEM). Merit criteria evolution.', covers: ['Single-stage tender reform 2025', 'First Nations & Social Licence weighting growth', 'Time limits for CISA execution', 'Project bond requirements'], interactive: 'Round-by-round comparison table' },
    { id: 'merit-criteria', number: 6, title: 'The merit criteria — and what they cost', summary: 'Each criterion has a price. First Nations equity, community benefit funds, local steel, labour disclosure.', covers: ['MC1 development progress', 'MC2 cost', 'MC3 system value', 'MC4 First Nations', 'MC5 community', 'MC6 jobs', 'MC7 social licence', 'Implicit $/MWh cost of each'] },
    { id: 'finance-interplay', number: 7, title: 'Bidding strategy and project financing', summary: 'How the CIS contract feeds back into the equity model and lender perception.', covers: ['CISA pricing as a finance derivative', 'Offtake stacking with corporate PPAs', 'Bid options: aggressive low-floor vs conservative ceiling-share', 'Why stage-and-second-tender bidders exist'] },
    { id: 'outcomes', number: 8, title: 'Outcomes — has it worked?', summary: 'Award-to-FID conversion, the AER\'s "only half progressing", and the next 6 months.', covers: ['T1 cohort progress (AER Sep 2025)', 'CISA execution proxy (FNCEN)', 'Likely-failed bucket dynamics', 'Forward outlook 2026–2027'] },
  ],
  sources: [
    { category: 'DCCEEW (CIS)', items: [
      { label: 'DCCEEW Capacity Investment Scheme home', url: 'https://www.dcceew.gov.au/energy/renewable/capacity-investment-scheme' },
      { label: 'DCCEEW Open & Closed CIS tenders pages' },
      { label: 'DCCEEW CIS guidelines (every revision)' },
      { label: 'CIS Reform — single-stage tender announcement' },
      { label: 'WA WEM design paper (Aug 2025)' },
    ]},
    { category: 'NSW EnergyCo / AEMO Services (LTESA)', items: [
      { label: 'AEMO Services — Tenders page', url: 'https://aemoservices.com.au/' },
      { label: 'NSW EnergyCo Statement of Opportunity' },
      { label: 'EII Act 2020 (NSW)', url: 'https://legislation.nsw.gov.au/' },
      { label: 'Consumer Trustee tender rules' },
    ]},
    { category: 'Government — testimony & reform', items: [
      { label: 'Senate Standing Committee on Environment & Communications — Estimates 2026', url: 'https://www.aph.gov.au/Parliamentary_Business/Senate_estimates/ec' },
      { label: 'Clean Energy Regulator — quarterly CIS progress notes' },
      { label: 'AER reports referencing CIS' },
    ]},
    { category: 'Law firms', items: [
      { label: 'HSF Kramer — Capacity Investment Scheme update', url: 'https://www.hsfkramer.com/notes/energy/2024-posts/Capacity-Investment-Scheme-update-and-the-release-of-the-Dispatchable-CISA-2024' },
      { label: 'HSF Kramer — Major changes for CIS tender process 2025', url: 'https://www.hsfkramer.com/notes/energy/2025-posts/cis-changes' },
      { label: 'Pinsent Masons — CIS battery projects coverage', url: 'https://www.pinsentmasons.com/' },
      { label: 'Norton Rose Fulbright — CIS practice' },
      { label: 'Lexology — Australian energy contributors' },
      { label: 'Hamilton Locke — kicking off Australia’s largest renewables tender' },
      { label: 'Clayton Utz — CIS legal commentary' },
      { label: 'King & Wood Mallesons — CIS series' },
    ]},
    { category: 'Consultancies', items: [
      { label: 'Baringa — CIS storage tender analysis', url: 'https://www.baringa.com/en/insights/low-carbon-capital/australia-cis-storage-tenders/' },
      { label: 'Modo Energy — CIS round-by-round research', url: 'https://modoenergy.com/' },
      { label: 'Aurora Energy Research — CIS economics' },
      { label: 'Cornwall Insight — CIS pricing reports' },
      { label: 'EY ROAM — CIS modelling' },
    ]},
    { category: 'Industry & First Nations', items: [
      { label: 'First Nations Clean Energy Network "From Commitment to Delivery"', url: 'https://www.firstnationscleanenergy.org.au/project_commitments' },
      { label: 'Clean Energy Council Best Practice Charter' },
      { label: 'Clean Energy Investor Group submissions' },
    ]},
    { category: 'Press', items: [
      { label: 'RenewEconomy — CIS tender coverage', url: 'https://reneweconomy.com.au/' },
      { label: 'Energy-Storage News — CIS BESS coverage', url: 'https://www.energy-storage.news/' },
      { label: 'PV Magazine Australia — CIS tender outcomes' },
      { label: 'WattClarity — CIS analysis' },
    ]},
    { category: 'AURES live data', items: [
      { label: 'AURES Scheme Tracker', url: '/intelligence/scheme-tracker' },
      { label: 'AURES Boardroom briefing' },
      { label: 'AURES Export-to-PowerPoint' },
      { label: 'ESG Tracker — CISA execution proxy' },
    ]},
  ],
}

// ============================================================
// 10. Summing It Up — Market Implications (synthesis module)
// ============================================================

const M_SUMMING_IT_UP: LearningModule = {
  id: 'summing-it-up',
  icon: '🧭',
  title: 'Summing It Up — Market Implications',
  tagline: 'Synthesising the curriculum into a forward view of the NEM through 2030.',
  description:
    'An 8-lesson synthesis module pulling together the threads from the prior nine modules. Covers the solar+BESS hybrid imperative, hybrid economics, the curtailment "what you would have to believe" question, what the operating hybrids tell us, the ESEM post-CIS architecture, and two bookend scenarios for 2032 (CIS/LTESA/ESEM working vs data centre surge rewriting everything). Closes with signals to watch and how to position as developer, investor, or policy-maker.',
  status: 'available',
  readingTime: '102 min',
  accent: '#0ea5e9',
  added: '2026-05-13',
  route: '/learn/summing-it-up',
  lessons: [
    { id: 'hybrid-imperative',    number: 1, title: 'The hybrid imperative — why solar developers ran to BESS', summary: 'From retailer rejection through corporate VPPA to hyperscaler 24/7 CFE — and the four supply-side amplifiers that compound the demand-side forcing function.' },
    { id: 'hybrid-economics',     number: 2, title: 'Hybrid economics — three structures compared',              summary: 'DC-coupled vs AC-coupled vs separate sites vs sole BESS. Capex, revenue stack, complexity — with a worked $440M vs $502M build comparison.' },
    { id: 'curtailment-question', number: 3, title: 'The curtailment question — what you would have to believe', summary: 'The midday dispatch decision at the connection limit, the breakeven inequality, and the NSW BESS pipeline reality check.' },
    { id: 'operating-hybrids',    number: 4, title: 'What the operating hybrids tell us',                          summary: 'CIS Tender 4 awards, Edify Darlington Point, Akaysha portfolio, Neoen Western Downs, Genex Kidston — empirical record so far.' },
    { id: 'esem',                 number: 5, title: 'ESEM — the post-CIS underwriting architecture',               summary: 'Nelson Review recommendation, three standardised contract types, warehouse-and-recycle administrator model, Queensland dissent.' },
    { id: 'scenario-a',           number: 6, title: 'Scenario A — when CIS / LTESA / ESEM work',                   summary: 'Coal out, 80% contracted, $55/MWh real wholesale by 2032. Consumer bills fall ~12%. Commonwealth net cost lower than budget.' },
    { id: 'scenario-b',           number: 7, title: 'Scenario B — data centre surge rewrites everything',          summary: 'AI workload growth, coal extension, hyperscaler co-investment, bifurcated market. Consumer bills rise ~8% real. Commonwealth budget pressure shifts to coal/transmission.' },
    { id: 'synthesis',            number: 8, title: 'Synthesis — signals to watch for the next decade',            summary: 'The four signals that distinguish A from B. How developers, investors and policy-makers should position. AURES Intelligence as the live-data layer.' },
  ],
  sources: [
    { category: 'Nelson Review / ESEM', items: [
      { label: 'NEM Wholesale Market Settings Review — Final Report (Dec 2025)', url: 'https://www.energy.gov.au/energy-and-climate-change-ministerial-council/working-groups/electricity-working-group/nem-wholesale-market-settings-review' },
      { label: 'Energy Ministers Meeting communiqué — 16 December 2025' },
      { label: 'Energy Synapse — ESEM explained', url: 'https://energysynapse.com.au/esem-explained-how-the-nelson-review-improves-bankability-for-renewables-and-storage/' },
      { label: 'Modo Energy — Nelson Review BESS impact', url: 'https://modoenergy.com/research/en/nem-reform-nelson-review-electricity-services-entry-mechanism-esem-bess-impact' },
      { label: 'Ashurst, Allens, KWM, Lexology — Nelson Review briefings' },
    ]},
    { category: 'Operating hybrid project data', items: [
      { label: 'Edify Energy — 2026 investor day deck and Darlington Point operating data' },
      { label: 'Neoen — Western Downs 2025 operating disclosures' },
      { label: 'Akaysha Energy — Brendale and Orana operating updates' },
      { label: 'Genex Power — Kidston commissioning reports' },
      { label: 'CIS Tender 4 award letters and AEMO Services materials' },
    ]},
    { category: 'Market and load forecasts', items: [
      { label: 'AEMO Integrated System Plan 2024 (step-change scenario)' },
      { label: 'Aurora Energy Research — NEM Long-Run Outlook 2026' },
      { label: 'BloombergNEF — Australia Energy Transition Outlook' },
      { label: 'CSIRO GenCost 2024' },
      { label: 'Cornwall Insight — Australia long-run wholesale outlook' },
    ]},
    { category: 'Data centre demand thesis', items: [
      { label: 'Goldman Sachs — Global AI Infrastructure Outlook 2026' },
      { label: 'Microsoft, Google, AWS — 2025 Q3-Q4 cloud and AI workload disclosures' },
      { label: 'NextDC, AirTrunk, Goodman / Brookfield — investor updates' },
      { label: 'McKinsey — Data Centre Demand 2030' },
      { label: 'Australian Energy Council — data centre load forecasts' },
    ]},
    { category: 'AURES prior modules', items: [
      { label: 'Constraints, CIS-LTESA, REZ, Solar+BESS, Energy Transition, Planning, AEMO Connections, PPAs, Project Financing — all upstream context' },
      { label: 'AURES Scheme Tracker (live)', url: '/intelligence/scheme-tracker' },
      { label: 'AURES Boardroom briefing' },
    ]},
  ],
}

// ============================================================
// 11. Valuing Renewable Projects — Top-Quartile Analysis (synthesis / analytical)
// ============================================================

const M_VALUING_PROJECTS: LearningModule = {
  id: 'valuing-projects',
  icon: '📐',
  title: 'Valuing Renewable Projects — Top-Quartile Analysis',
  tagline: 'A 14-lesson framework for scoring renewable assets — operational or in-development — against fundamentals.',
  description:
    'Part A (lessons 1–6, v2.95.0) covers operational valuation: the asset-manager\'s job, what data you need, metrics per technology, peer comparison, forward valuation, and boardroom-ready presentation. Part B (lessons 7–12) extends the framework to development-stage projects. Part C (lessons 13–14) closes with an interactive top-quartile scoring tool.',
  status: 'available',
  readingTime: '~165 min',
  accent: '#14b8a6',
  added: '2026-05-13',
  route: '/learn/valuing-projects',
  lessons: [
    { id: 'asset-manager-job',  number: 1,  title: "The asset-manager's job — why operational valuation is distinct", summary: 'Lifecycle stages, use cases (refinancing, M&A, recap, BI insurance), how operational valuation differs from development.' },
    { id: 'data-layer',         number: 2,  title: 'What data you actually need (Australian context)',                summary: 'AEMO MMSDM, OpenElectricity, AER quarterlies, ASIC half-yearlies, NEM Connection Register. Free vs paywalled.' },
    { id: 'metrics-by-tech',    number: 3,  title: 'Operational metrics that matter — by technology',                 summary: 'Wind / solar / BESS / hybrid metric stacks with target ranges and watch-outs.' },
    { id: 'peer-comparison',    number: 4,  title: 'Peer comparison — defining "top quartile" for operating assets',  summary: 'Cohort construction (technology / region / vintage / capacity bucket), vintage adjustment, the deserves-vs-achieves framework.' },
    { id: 'forward-valuation',  number: 5,  title: 'Forward valuation from operational data',                         summary: 'Capture-price trajectory, MLF degradation, value-factor convergence, discount-rate compression, refinancing economics, terminal value.' },
    { id: 'presenting',         number: 6,  title: 'Presenting it — boardroom-ready outputs',                         summary: 'Single-page scorecard, pros/cons with quantitative backing, peer charts, the AURES Wind Value Analysis as worked example.' },
    { id: 'dev-stages',         number: 7,  title: 'Stages of a renewable project — typical $/MW step-ups',           summary: 'From land-tied-up through FID to COD — value at each stage by technology.' },
    { id: 'fundamentals',       number: 8,  title: 'The five fundamental categories that drive value',                summary: 'Resource, connection, offtake, developer, constructability + community.' },
    { id: 'resource-quality',   number: 9,  title: 'Resource quality — the foundational fundamental',                 summary: 'Wind / solar / BESS — what data exists, what you must estimate.' },
    { id: 'connection',         number: 10, title: 'Connection quality — the value-killer category',                  summary: 'MLF history, future-congestion analysis, DNSP vs TNSP, curtailment. Interactive tool.' },
    { id: 'other-fundamentals', number: 11, title: 'Constructability, community, offtake, developer',                 summary: 'The four softer fundamental categories with limited-data weighting.' },
    { id: 'scoring-framework',  number: 12, title: 'The scoring framework — weights, anchors, quartile output',       summary: 'The 25/25/20/15/15 rubric for the unified top-quartile score.' },
    { id: 'interactive-tool',   number: 13, title: 'The interactive valuation tool',                                  summary: 'Apply the framework to any operational or development project.' },
    { id: 'future-shifts',      number: 14, title: 'How this changes — ESEM, 24/7 CFE, data centre surge',            summary: 'Forward-looking adjustments to the framework.' },
  ],
  sources: [
    { category: 'Public data', items: [
      { label: 'AEMO MMSDM (Market Management System Data Model)', url: 'https://aemo.com.au/energy-systems/electricity/national-electricity-market-nem/data-nem/market-management-system-mms-data' },
      { label: 'OpenElectricity API', url: 'https://api.openelectricity.org.au/' },
      { label: 'AER quarterly Wholesale Markets Performance Reports', url: 'https://www.aer.gov.au/wholesale-markets/wholesale-statistics' },
      { label: 'NEM Connection Register' },
      { label: 'AEMO Generation Information (monthly snapshots)' },
      { label: 'ASIC half-yearly financials for ASX-listed asset owners' },
    ]},
    { category: 'Analyst forecasts', items: [
      { label: 'Aurora Energy Research — NEM Long-Run Outlook' },
      { label: 'Wood Mackenzie Australia capture price + value factor forecasts' },
      { label: 'BloombergNEF Australia ETO' },
      { label: 'Cornwall Insight — capture price index' },
      { label: 'Modo Energy Australia — BESS revenue stack analytics', url: 'https://modoenergy.com/' },
    ]},
    { category: 'Methodology references', items: [
      { label: 'DNV — Renewable Asset Performance Benchmarks' },
      { label: 'CSIRO GenCost (annual)' },
      { label: 'Macquarie Infrastructure / IFM investor day materials' },
      { label: 'Norton Rose Fulbright project finance practice notes' },
    ]},
    { category: 'AURES live data', items: [
      { label: 'AURES per-project Wind / Solar / BESS Value Analysis pages' },
      { label: 'AURES Scheme Tracker', url: '/intelligence/scheme-tracker' },
      { label: 'AURES Project pages', url: '/projects' },
    ]},
  ],
}

// ============================================================
// Module catalogue export
// ============================================================

// Note: solar cannibalisation has been folded into the merged
// "Solar + BESS in the NEM" module (M_BESS) — see lessons 3, 4, 8 and 9
// of that module. M_SOLAR_CANN is retained in code for historical
// reference but is no longer exposed in the catalogue.
void M_SOLAR_CANN

// Module ordering — narrative arc from macro to technical to synthesis:
//   1. Energy Transition (why the market is changing)
//   2. Solar + BESS Story (the dominant new-build configuration)
//   3. NSW REZ (where the new build lands)
//   4. CIS & LTESA Bidding (how new build is underwritten)
//   5. PPAs (the offtake layer)
//   6. Project Financing (how it gets paid for)
//   7. Planning Approvals (the pre-FID gate)
//   8. AEMO Connection (the technical gate)
//   9. NEM Constraints (operational reality once built)
//   10. Summing It Up (synthesis of the curriculum)
export const LEARNING_MODULES: LearningModule[] = [
  M_TRANSITION,
  M_BESS,
  M_REZ,
  M_CIS_LTESA,
  M_PPAS,
  M_FINANCING,
  M_PLANNING,
  M_CONNECTIONS,
  M_CONSTRAINTS,
  M_VALUING_PROJECTS,
  M_SUMMING_IT_UP,
]

export function getModule(id: string): LearningModule | undefined {
  return LEARNING_MODULES.find(m => m.id === id)
}

export function totalLessons(): number {
  return LEARNING_MODULES.reduce((sum, m) => sum + m.lessons.length, 0)
}
