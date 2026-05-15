/**
 * ESG & First Nations Agreement Tracker Data
 *
 * Tracks the publication status of First Nations commitments and community benefit
 * sharing plans for CIS and LTESA projects.
 *
 * KEY INSIGHT: Projects awarded a CISA must publish their First Nations and social
 * licence commitments within 20 business days of executing the agreement. This
 * publication requirement can be used as a proxy to determine which projects have
 * actually executed their CISA (as distinct from merely being "awarded" one).
 *
 * Data sources:
 * - DCCEEW CIS tender results and guidelines
 * - AEMO Services (ASL) tender summaries
 * - First Nations Clean Energy Network (FNCEN) "From Commitment to Delivery" tracker
 * - Clean Energy Council Best Practice Charter reports
 * - Proponent/developer websites (primary source for published commitments)
 * - NSW EnergyCo / OECC First Nations Guidelines (for LTESA)
 *
 * Publication requirement history:
 * - CIS Pilots (NSW, SA/VIC): No formal 20-day publication requirement (pre-tender)
 * - CIS Tender 1 onwards: Merit Criteria 4 (First Nations) and 7 (Social Licence)
 *   require binding commitments in CISA; publication within 20 business days of execution
 * - CIS Tender 3 onwards: Strengthened First Nations merit criteria per Nov 2024 update
 * - CIS Tender 5 onwards: Dedicated First Nations participation criterion; labour disclosure
 * - LTESA: Aboriginal Participation Plans required under EII Act 2020; min 1.5% FN procurement
 *   with 10% stretch goal. Publication via EnergyCo/Consumer Trustee tender rules.
 */

export type PublicationStatus =
  | 'published'         // Commitments found published on proponent website or public register
  | 'partial'           // Some information published but incomplete
  | 'fncen_only'        // Appears on FNCEN tracker but no proponent website publication found
  | 'not_found'         // Awarded but no published commitments found
  | 'not_required'      // Pre-dates publication requirement (e.g. pilots)
  | 'too_early'         // Recently awarded — within 20 business day window
  | 'exempt'            // VPPs or other exempt project types

export type AgreementStatus =
  | 'executed'          // CISA/LTESA confirmed as executed
  | 'likely_executed'   // Strong evidence of execution (construction started, FID reached)
  | 'awarded'           // Announced as successful but execution not confirmed
  | 'unknown'           // Insufficient data

export interface ESGTrackerProject {
  name: string
  projectId: string | null
  developer: string
  scheme: 'CIS' | 'LTESA'
  round: string
  roundId: string
  capacityMW: number
  state: string
  stage: string

  // Agreement status
  agreementStatus: AgreementStatus
  awardAnnouncedDate: string         // Date round results announced
  estimatedExecutionDate?: string    // Best estimate of CISA/LTESA execution date
  publicationDeadline?: string       // 20 business days after execution

  // First Nations commitments
  publicationStatus: PublicationStatus
  fnCommitmentValueM?: number        // $ millions committed to First Nations outcomes
  fnCommitments?: string[]           // Specific commitments made
  fnEquityShare?: number             // % First Nations equity (if any)
  fnRevenueShare?: boolean           // Revenue sharing agreement in place?

  // Community benefit sharing
  communityBenefitValueM?: number    // $ millions in community benefits
  communityBenefitDetails?: string[] // Specific community benefits

  // Data sources
  proponentWebsiteUrl?: string       // URL where commitments published
  fncenListed: boolean               // Listed on FNCEN tracker
  cecCharterSignatory: boolean       // CEC Best Practice Charter signatory
  aslSummaryData: boolean            // Data available from ASL tender summary

  // Notes
  notes?: string
}

export interface RoundESGSummary {
  roundId: string
  scheme: 'CIS' | 'LTESA'
  round: string
  announcedDate: string
  publicationRequired: boolean
  totalFNCommitmentM?: number        // Aggregate from ASL summary
  totalCommunityBenefitM?: number
  meritCriteriaVersion: string       // Which version of FN merit criteria applied
}

// ============================================================
// Per-round summary data (from ASL tender announcements)
// ============================================================

export const ROUND_ESG_SUMMARIES: RoundESGSummary[] = [
  {
    roundId: 'cis-pilot-nsw',
    scheme: 'CIS',
    round: 'CIS Pilot — NSW',
    announcedDate: '2023-11-23',
    publicationRequired: false,
    meritCriteriaVersion: 'Pilot — no formal FN merit criteria',
    notes: 'NSW state partnership pilot. No CIS-specific publication requirements.',
  } as RoundESGSummary & { notes?: string },
  {
    roundId: 'cis-pilot-sa-vic',
    scheme: 'CIS',
    round: 'CIS Pilot — SA/VIC',
    announcedDate: '2024-09-04',
    publicationRequired: false,
    meritCriteriaVersion: 'Pilot — limited FN assessment',
  },
  {
    roundId: 'cis-tender-1-nem-gen',
    scheme: 'CIS',
    round: 'Tender 1 — NEM Generation',
    announcedDate: '2024-12-11',
    publicationRequired: true,
    totalFNCommitmentM: 280,
    totalCommunityBenefitM: 660,
    meritCriteriaVersion: 'MC4 (FN Engagement) + MC7 (Social Licence) — first formal tender',
  },
  {
    roundId: 'cis-tender-2-wem-disp',
    scheme: 'CIS',
    round: 'Tender 2 — WEM Dispatchable',
    announcedDate: '2025-03-20',
    publicationRequired: true,
    totalFNCommitmentM: 41.5,
    totalCommunityBenefitM: 145,
    meritCriteriaVersion: 'MC4 + MC7 — WEM-specific tender',
  },
  {
    roundId: 'cis-tender-3-nem-disp',
    scheme: 'CIS',
    round: 'Tender 3 — NEM Dispatchable',
    announcedDate: '2025-09-17',
    publicationRequired: true,
    totalFNCommitmentM: 218.8,
    meritCriteriaVersion: 'Strengthened MC4 + MC8 (Nov 2024 update)',
  },
  {
    roundId: 'cis-tender-4-nem-gen',
    scheme: 'CIS',
    round: 'Tender 4 — NEM Generation',
    announcedDate: '2025-10-09',
    publicationRequired: true,
    totalFNCommitmentM: 348,
    totalCommunityBenefitM: 291,
    meritCriteriaVersion: 'Strengthened MC4 + MC8 — higher FN merit weighting',
  },
  {
    roundId: 'ltesa-round-1',
    scheme: 'LTESA',
    round: 'Round 1 — Generation + LDS',
    announcedDate: '2023-05-03',
    publicationRequired: true,
    meritCriteriaVersion: 'EII Act 2020 — Aboriginal Participation Plan required',
  },
  {
    roundId: 'ltesa-round-2',
    scheme: 'LTESA',
    round: 'Round 2 — Firming',
    announcedDate: '2023-11-22',
    publicationRequired: true,
    meritCriteriaVersion: 'EII Act 2020 — Aboriginal Participation Plan required',
  },
  {
    roundId: 'ltesa-round-3',
    scheme: 'LTESA',
    round: 'Round 3 — Generation + LDS',
    announcedDate: '2023-12-19',
    publicationRequired: true,
    meritCriteriaVersion: 'EII Act 2020 — First Nations Guidelines (revised)',
  },
  {
    roundId: 'ltesa-round-4',
    scheme: 'LTESA',
    round: 'Round 4 — Generation',
    announcedDate: '2024-07-01',
    publicationRequired: true,
    meritCriteriaVersion: 'EII Act 2020 — First Nations Guidelines (revised)',
  },
  {
    roundId: 'ltesa-round-5',
    scheme: 'LTESA',
    round: 'Round 5 — Long Duration Storage',
    announcedDate: '2025-02-27',
    publicationRequired: true,
    meritCriteriaVersion: 'EII Act 2020 — Revised General First Nations Guidelines (May 2025)',
  },
  {
    roundId: 'ltesa-round-6',
    scheme: 'LTESA',
    round: 'Round 6 — Long Duration Storage',
    announcedDate: '2026-02-05',
    publicationRequired: true,
    meritCriteriaVersion: 'EII Act 2020 — Revised General First Nations Guidelines (May 2025)',
  },
]

// ============================================================
// Per-project ESG tracking data
// ============================================================

export const ESG_TRACKER_PROJECTS: ESGTrackerProject[] = [
  // ────────────────────────────────────────────────
  // CIS Pilot — NSW (announced 2023-11-23)
  // No formal publication requirement for pilots
  // ────────────────────────────────────────────────
  {
    name: 'Orana REZ Battery', projectId: 'orana-bess', developer: 'Akaysha Energy (BlackRock)',
    scheme: 'CIS', round: 'CIS Pilot — NSW', roundId: 'cis-pilot-nsw',
    capacityMW: 460, state: 'NSW', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-11-23',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
    notes: 'Pilot round — no formal FN publication requirement. Construction commenced mid-2024.',
  },
  {
    name: 'Liddell BESS', projectId: 'liddell-bess', developer: 'AGL Energy',
    scheme: 'CIS', round: 'CIS Pilot — NSW', roundId: 'cis-pilot-nsw',
    capacityMW: 500, state: 'NSW', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-11-23',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: false,
    notes: 'AGL is CEC Best Practice Charter signatory. 500 MW total — single contract under combined CIS Pilot/LTESA R2 round.',
  },
  {
    name: 'Smithfield Sydney Battery', projectId: 'smithfield-bess', developer: 'Iberdrola',
    scheme: 'CIS', round: 'CIS Pilot — NSW', roundId: 'cis-pilot-nsw',
    capacityMW: 235, state: 'NSW', stage: 'operating',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-11-23',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
    notes: 'Operating — agreement fully executed. Pilot round.',
  },
  {
    name: 'Enel X VPP 1', projectId: null, developer: 'Enel X Australia',
    scheme: 'CIS', round: 'CIS Pilot — NSW', roundId: 'cis-pilot-nsw',
    capacityMW: 43, state: 'NSW', stage: 'unknown',
    agreementStatus: 'unknown', awardAnnouncedDate: '2023-11-23',
    publicationStatus: 'exempt',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
    notes: 'VPP — distributed assets, typically exempt from site-specific FN requirements.',
  },
  {
    name: 'Enel X VPP 2', projectId: null, developer: 'Enel X Australia',
    scheme: 'CIS', round: 'CIS Pilot — NSW', roundId: 'cis-pilot-nsw',
    capacityMW: 43, state: 'NSW', stage: 'unknown',
    agreementStatus: 'unknown', awardAnnouncedDate: '2023-11-23',
    publicationStatus: 'exempt',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
  },
  {
    name: 'Enel X VPP 3', projectId: null, developer: 'Enel X Australia',
    scheme: 'CIS', round: 'CIS Pilot — NSW', roundId: 'cis-pilot-nsw',
    capacityMW: 44, state: 'NSW', stage: 'unknown',
    agreementStatus: 'unknown', awardAnnouncedDate: '2023-11-23',
    publicationStatus: 'exempt',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
  },

  // ────────────────────────────────────────────────
  // CIS Pilot — SA/VIC (announced 2024-09-04)
  // ────────────────────────────────────────────────
  {
    name: 'Wooreen Battery', projectId: 'wooreen-energy-storage-system', developer: 'EnergyAustralia',
    scheme: 'CIS', round: 'CIS Pilot — SA/VIC', roundId: 'cis-pilot-sa-vic',
    capacityMW: 350, state: 'VIC', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2024-09-04',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: false,
    notes: 'Pilot round. EnergyAustralia is CEC signatory. Construction underway.',
  },
  {
    name: 'Springfield BESS', projectId: null, developer: 'Neoen',
    scheme: 'CIS', round: 'CIS Pilot — SA/VIC', roundId: 'cis-pilot-sa-vic',
    capacityMW: 200, state: 'VIC', stage: 'unknown',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-09-04',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: false,
    notes: 'Pilot round. Neoen is CEC signatory.',
  },
  {
    name: 'Mortlake BESS', projectId: 'mortlake-battery', developer: 'Origin Energy',
    scheme: 'CIS', round: 'CIS Pilot — SA/VIC', roundId: 'cis-pilot-sa-vic',
    capacityMW: 135, state: 'VIC', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2024-09-04',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: false,
  },
  {
    name: 'Tailem Bend BESS', projectId: 'tailem-bend-stage-3', developer: 'Vena Energy',
    scheme: 'CIS', round: 'CIS Pilot — SA/VIC', roundId: 'cis-pilot-sa-vic',
    capacityMW: 200, state: 'SA', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2024-09-04',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
  },
  {
    name: 'Clements Gap Battery', projectId: 'clements-gap-bess', developer: 'Pacific Blue (SPIC China)',
    scheme: 'CIS', round: 'CIS Pilot — SA/VIC', roundId: 'cis-pilot-sa-vic',
    capacityMW: 60, state: 'SA', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2024-09-04',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
  },
  {
    name: 'Hallett Battery', projectId: 'hallett-bess', developer: 'EnergyAustralia',
    scheme: 'CIS', round: 'CIS Pilot — SA/VIC', roundId: 'cis-pilot-sa-vic',
    capacityMW: 50, state: 'SA', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-09-04',
    publicationStatus: 'not_required',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: false,
    notes: 'Still in development — agreement status uncertain.',
  },

  // ────────────────────────────────────────────────
  // CIS Tender 1 — NEM Generation (announced 2024-12-11)
  // First round with formal FN publication requirement
  // $280M FN commitments, $660M community benefits (ASL)
  // ────────────────────────────────────────────────
  {
    name: 'Valley of the Winds', projectId: 'valley-of-the-winds', developer: 'ACEN Renewables',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 936, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'fncen_only',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'ACEN has broader First Nations partnerships (Yindjibarndi 25% equity model in WA). Listed on FNCEN tracker but specific T1 commitments not found on proponent website.',
  },
  {
    name: 'Sandy Creek Solar Farm', projectId: 'sandy-creek-solar-farm', developer: 'Sandy Creek Solar Fund Pty Ltd',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 700, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'SPV — no public-facing proponent website found with FN commitments.',
  },
  {
    name: 'Spicers Creek Wind Farm', projectId: 'spicers-creek-wind-farm', developer: 'Squadron Energy',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 700, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'Squadron Energy (Tattarang). CEC signatory. No specific CIS T1 FN publication found.',
  },
  {
    name: 'Junction Rivers', projectId: 'junction-rivers-wind-and-bess', developer: 'Junction Rivers Pty Ltd',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 585, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Goulburn River Solar Farm', projectId: 'goulburn-river-solar-farm-and-bess', developer: 'Lightsource bp',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 450, state: 'NSW', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'partial',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'In construction — agreement likely executed. Lightsource bp publishes sustainability reports but project-specific CIS commitments not clearly isolated.',
  },
  {
    name: 'Thunderbolt Wind Farm', projectId: 'thunderbolt-wind-farm', developer: 'Neoen Australia',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 230, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'partial',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'Neoen publishes community benefit info for Goyder zone. CEC BPC signatory. Project-specific CIS T1 FN commitments not isolated.',
  },
  {
    name: 'Glanmire Solar Farm', projectId: 'glanmire-solar-farm', developer: 'Elgin Energy',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 60, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Kentbruck Wind Farm', projectId: 'kentbruck-green-power-hub', developer: 'Kentbruck Wind Farm Pty Ltd',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 600, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'SPV structure. No proponent website with FN commitments found.',
  },
  {
    name: 'West Mokoan Solar Farm', projectId: 'west-mokoan-solar-farm-and-bess', developer: 'Edify Energy',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 300, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'partial',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'In development (COD ~2029). Separate project from operating Mokoan Solar Farm (46 MW). Edify publishes sustainability info but CIS-specific FN commitments not clearly separated.',
  },
  {
    name: 'Mokoan Solar Farm', projectId: 'mokoan-solar-farm', developer: 'European Energy Australia',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 46, state: 'VIC', stage: 'operating',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
    notes: 'Operating (46 MW, commissioned late 2024). Won CIS Tender 1 while still in commissioning. Separate project from West Mokoan Solar Farm (300 MW, Lightsource bp).',
  },
  {
    name: 'Barwon Solar Farm', projectId: 'barwon-solar-farm-and-bess', developer: 'Elgin Energy',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 250, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Campbells Forest Solar Farm', projectId: 'campbells-forest-solar-farm', developer: 'Risen Energy',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 205, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Elaine Solar Farm', projectId: 'elaine-solar-farm-and-bess', developer: 'Elgin Energy',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 125, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Barnawartha Solar Farm', projectId: 'barnawartha-solar-and-energy-storage', developer: 'Barnawartha Solar Pty Ltd',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 64, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Goyder North Wind Farm', projectId: 'goyder-north-wind-farm', developer: 'Neoen Australia',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 300, state: 'SA', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'published',
    proponentWebsiteUrl: 'https://goyderenergy.com.au/community/',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    fnRevenueShare: false,
    communityBenefitDetails: ['$250k/year community benefit sharing program', 'National park legacy (Worlds End Gorge)', 'First Nations heritage conservation fund'],
    notes: 'Neoen publishes Goyder zone community page with FN heritage and community benefit details. One of few proponents with clear public commitments.',
  },
  {
    name: 'Palmer Wind Farm', projectId: 'palmer-wind-farm', developer: 'Tilt Renewables',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 274, state: 'SA', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'fncen_only',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'Tilt Renewables is CEC BPC signatory. Listed on FNCEN tracker.',
  },
  {
    name: 'Hopeland Solar Farm', projectId: 'hopeland-solar-farm', developer: 'Hopeland Solar Farm Pty Ltd',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 250, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Majors Creek Solar Power Station', projectId: 'majors-creek-solar-power-station', developer: 'Edify Energy',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 150, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Ganymirra Solar Power Station', projectId: 'ganymirra-solar-power-station', developer: 'Edify Energy',
    scheme: 'CIS', round: 'Tender 1 — NEM Generation', roundId: 'cis-tender-1-nem-gen',
    capacityMW: 150, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-12-11',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },

  // ────────────────────────────────────────────────
  // CIS Tender 2 — WEM Dispatchable (announced 2025-03-20)
  // $41.5M FN commitments, $145M community benefits
  // ────────────────────────────────────────────────
  {
    name: 'Boddington Giga Battery', projectId: null, developer: 'PGS Energy',
    scheme: 'CIS', round: 'Tender 2 — WEM Dispatchable', roundId: 'cis-tender-2-wem-disp',
    capacityMW: 324, state: 'WA', stage: 'unknown',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-03-20',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'Announced 12 months ago. No FN publication found.',
  },
  {
    name: 'Merredin Big Battery', projectId: null, developer: 'Atmos Renewables',
    scheme: 'CIS', round: 'Tender 2 — WEM Dispatchable', roundId: 'cis-tender-2-wem-disp',
    capacityMW: 100, state: 'WA', stage: 'unknown',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-03-20',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Muchea Big Battery', projectId: null, developer: 'Neoen',
    scheme: 'CIS', round: 'Tender 2 — WEM Dispatchable', roundId: 'cis-tender-2-wem-disp',
    capacityMW: 150, state: 'WA', stage: 'unknown',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-03-20',
    publicationStatus: 'fncen_only',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'Neoen CEC signatory. Listed on FNCEN but project-specific WA commitments not on proponent website.',
  },
  {
    name: 'Waroona Renewable Energy Project Stage 1', projectId: null, developer: 'Frontier Energy',
    scheme: 'CIS', round: 'Tender 2 — WEM Dispatchable', roundId: 'cis-tender-2-wem-disp',
    capacityMW: 80, state: 'WA', stage: 'unknown',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-03-20',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },

  // ────────────────────────────────────────────────
  // CIS Tender 3 — NEM Dispatchable (announced 2025-09-17)
  // $218.8M FN commitments
  // ────────────────────────────────────────────────
  {
    name: 'Bulabul 2 BESS', projectId: 'bulabul-bess-2', developer: 'WEBESS02 ProjectCo',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 100, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Swallow Tail BESS', projectId: 'swallow-tail-bess', developer: 'STBESS ProjectCo',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 300, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Calala BESS', projectId: 'calala-bess-a1', developer: 'Equis Australia',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 150, state: 'NSW', stage: 'construction',
    agreementStatus: 'likely_executed', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'In construction — likely executed. No FN publication found despite requirement.',
  },
  {
    name: 'Goulburn River Standalone BESS', projectId: 'goulburn-river-bess', developer: 'Lightsource bp',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 450, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'fncen_only',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
  },
  {
    name: 'Mount Piper BESS Stage 1', projectId: 'mt-piper-bess', developer: 'EnergyAustralia',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 250, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'fncen_only',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
  },
  {
    name: 'Deer Park BESS', projectId: 'deer-park-bess-akaysha', developer: 'Akaysha Energy',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 275, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Joel Joel BESS', projectId: 'joel-joel-bess', developer: 'ACEnergy',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 250, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Kiamal BESS', projectId: 'kiamal-bess', developer: 'TotalEnergies',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 220, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Little River BESS', projectId: 'little-river-bess', developer: 'ACEnergy',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 350, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Mornington BESS', projectId: 'mornington-bess', developer: 'Valent Energy',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 240, state: 'VIC', stage: 'construction',
    agreementStatus: 'likely_executed', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'In construction — likely executed. No FN publication found.',
  },
  {
    name: 'Capricorn BESS', projectId: 'capricorn-bess', developer: 'Enel Green Power',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 300, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Lower Wonga BESS', projectId: 'lower-wonga-bess', developer: 'Equis Energy',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 200, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Teebar BESS', projectId: 'teebar-creek-battery-storage-kci', developer: 'Atmos Developments',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 400, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Ulinda Park Expansion', projectId: 'ulinda-park-bess-expansion', developer: 'Akaysha Energy',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 195, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Koolunga BESS', projectId: 'koolunga-battery-energy-storage-system', developer: 'Equis Energy',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 200, state: 'SA', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Reeves Plains BESS', projectId: 'reeves-plains-power-station-bess', developer: 'Alinta Energy',
    scheme: 'CIS', round: 'Tender 3 — NEM Dispatchable', roundId: 'cis-tender-3-nem-disp',
    capacityMW: 250, state: 'SA', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-09-17',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
  },

  // ────────────────────────────────────────────────
  // CIS Tender 4 — NEM Generation (announced 2025-10-09)
  // $348M FN commitments, $291M community benefits
  // ────────────────────────────────────────────────
  {
    name: 'Bell Bay Wind Farm', projectId: null, developer: 'Equis',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 224, state: 'TAS', stage: 'unknown',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Bendemeer Energy Hub', projectId: 'bendemeer-renewable-energy-hub-solar-and-bess', developer: 'Athena Energy Australia',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 252, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Bundey BESS and Solar', projectId: 'bundey-bess-and-solar-project', developer: 'Genaspi Energy',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 240, state: 'SA', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: "Carmody's Hill Wind Farm", projectId: 'carmodys-hill-wind-farm', developer: 'Aula Energy',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 247, state: 'SA', stage: 'construction',
    agreementStatus: 'likely_executed', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'In construction — likely executed.',
  },
  {
    name: 'Corop Solar Farm and BESS', projectId: 'corop-solar-farm', developer: 'Leeson Solar',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 230, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Derby Solar Project', projectId: 'derby-solar-farm-and-bess', developer: 'Derby Solar Project Pty Ltd',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 95, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Dinawan Wind Farm Stage 1', projectId: 'dinawan-energy-hub', developer: 'Spark Renewables',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 357, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Gawara Baya', projectId: 'gawara-baya-wind-and-bess', developer: 'Gawara Baya Wind Farm Pty Ltd',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 399, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: "Guthrie's Gap Solar Power Station", projectId: 'guthries-gap-solar-power-station', developer: 'Edify Energy',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 300, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Hexham Wind Farm', projectId: 'hexham', developer: 'Wind Prospect',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 600, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Liverpool Range Wind Stage 1', projectId: 'liverpool-range-wind-farm', developer: 'Tilt Renewables',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 634, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'fncen_only',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'Tilt Renewables CEC signatory. FNCEN listed.',
  },
  {
    name: 'Lower Wonga Solar Farm', projectId: 'lower-wonga-solar-farm-and-bess', developer: 'Lower Wonga Solar Farm Pty Ltd',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 281, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Merino Solar Farm', projectId: 'merino-solar-farm', developer: 'Merino Solar Farm Pty Ltd',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 450, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Middlebrook Solar Farm', projectId: 'middlebrook-solar-and-bess', developer: 'Middlebrook Solar Farm Pty Ltd',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 363, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Moah Creek Wind Farm', projectId: 'moah-creek-wind-farm', developer: 'Moah Creek Wind Farm Project Co',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 360, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Nowingi Solar Power Station', projectId: 'nowingi-solar-farm-edify-kci', developer: 'Edify Energy',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 300, state: 'VIC', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Punchs Creek Solar Farm', projectId: null, developer: 'EDPR',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 400, state: 'QLD', stage: 'unknown',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Smoky Creek Solar Power Station', projectId: 'smoky-creek-solar-power-station', developer: 'Edify Energy',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 300, state: 'QLD', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Tallawang Solar Hybrid', projectId: 'tallawang-solar-and-bess', developer: 'Enel Green Power',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 500, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Willogoleche 2 Wind Farm', projectId: 'willogoleche-2-wind-farm', developer: 'ENGIE / Foresight',
    scheme: 'CIS', round: 'Tender 4 — NEM Generation', roundId: 'cis-tender-4-nem-gen',
    capacityMW: 108, state: 'SA', stage: 'development',
    agreementStatus: 'executed', awardAnnouncedDate: '2025-10-09',
    publicationStatus: 'not_found',
    fncenListed: true, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'In development — separate project from operating Willogoleche Wind Farm. No FN publication found.',
  },

  // ────────────────────────────────────────────────
  // LTESA Round 1 — Generation + LDS (announced 2023-05-03)
  // ────────────────────────────────────────────────
  {
    name: 'New England Solar Farm', projectId: 'new-england-solar-farm', developer: 'ACEN Australia',
    scheme: 'LTESA', round: 'Round 1 — Generation + LDS', roundId: 'ltesa-round-1',
    capacityMW: 720, state: 'NSW', stage: 'operating',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-05-03',
    publicationStatus: 'published',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    fnCommitments: ['Aboriginal Participation Plan filed', 'Local procurement targets'],
    notes: 'Operating. ACEN is CEC signatory with broader FN partnerships including Yindjibarndi 25% equity in WA.',
  },
  {
    name: 'Stubbo Solar Farm', projectId: 'stubbo-solar-farm', developer: 'ACEN Australia',
    scheme: 'LTESA', round: 'Round 1 — Generation + LDS', roundId: 'ltesa-round-1',
    capacityMW: 400, state: 'NSW', stage: 'operating',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-05-03',
    publicationStatus: 'published',
    fncenListed: true, cecCharterSignatory: true, aslSummaryData: true,
    fnCommitments: ['Aboriginal Participation Plan filed'],
    notes: 'Operating. ACEN Australia.',
  },
  {
    name: 'Coppabella Wind Farm', projectId: 'coppabella-wind-farm', developer: 'Coppabella Wind Farm Pty Ltd',
    scheme: 'LTESA', round: 'Round 1 — Generation + LDS', roundId: 'ltesa-round-1',
    capacityMW: 275, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2023-05-03',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
    notes: '34+ months since award, still in development. No FN publication found — longest gap in LTESA portfolio.',
  },
  {
    name: 'Limondale BESS', projectId: 'limondale-bess', developer: 'RWE Renewables',
    scheme: 'LTESA', round: 'Round 1 — Generation + LDS', roundId: 'ltesa-round-1',
    capacityMW: 50, state: 'NSW', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-05-03',
    publicationStatus: 'fncen_only',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'In construction. RWE publishes corporate sustainability but project-specific APP not publicly available.',
  },

  // ────────────────────────────────────────────────
  // LTESA Round 2 — Firming (announced 2023-11-22)
  // ────────────────────────────────────────────────
  // Liddell BESS (500 MW) listed under cis-pilot-nsw — single contract under combined round
  {
    name: 'Orana BESS', projectId: 'orana-bess', developer: 'Akaysha Energy (BlackRock)',
    scheme: 'LTESA', round: 'Round 2 — Firming', roundId: 'ltesa-round-2',
    capacityMW: 415, state: 'NSW', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-11-22',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Enel X VPP Portfolio', projectId: null, developer: 'Enel X Australia',
    scheme: 'LTESA', round: 'Round 2 — Firming', roundId: 'ltesa-round-2',
    capacityMW: 95, state: 'NSW', stage: 'unknown',
    agreementStatus: 'unknown', awardAnnouncedDate: '2023-11-22',
    publicationStatus: 'exempt',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: false,
    notes: 'VPP — distributed assets.',
  },
  {
    name: 'Smithfield BESS', projectId: 'smithfield-bess', developer: 'Iberdrola',
    scheme: 'LTESA', round: 'Round 2 — Firming', roundId: 'ltesa-round-2',
    capacityMW: 65, state: 'NSW', stage: 'operating',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-11-22',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },

  // ────────────────────────────────────────────────
  // LTESA Round 3 — Generation + LDS (announced 2023-12-19)
  // ────────────────────────────────────────────────
  {
    name: 'Uungula Wind Farm', projectId: 'uungula-wind-farm', developer: 'Squadron Energy',
    scheme: 'LTESA', round: 'Round 3 — Generation + LDS', roundId: 'ltesa-round-3',
    capacityMW: 400, state: 'NSW', stage: 'construction',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-12-19',
    publicationStatus: 'partial',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'Squadron Energy CEC signatory. Construction underway. Some community benefit info published.',
  },
  {
    name: 'Culcairn Solar Farm', projectId: 'culcairn-solar-farm', developer: 'Culcairn Solar Farm Pty Ltd',
    scheme: 'LTESA', round: 'Round 3 — Generation + LDS', roundId: 'ltesa-round-3',
    capacityMW: 350, state: 'NSW', stage: 'operating',
    agreementStatus: 'executed', awardAnnouncedDate: '2023-12-19',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'Operating. SPV — no proponent website with APP found.',
  },
  {
    name: 'Richmond Valley BESS', projectId: 'richmond-valley-bess', developer: 'Ark Energy',
    scheme: 'LTESA', round: 'Round 3 — Generation + LDS', roundId: 'ltesa-round-3',
    capacityMW: 275, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2023-12-19',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
    notes: '27+ months since award, still in development.',
  },
  {
    name: 'Silver City Energy Storage Centre', projectId: 'silver-city-energy-storage', developer: 'A-CAES NSW',
    scheme: 'LTESA', round: 'Round 3 — Generation + LDS', roundId: 'ltesa-round-3',
    capacityMW: 200, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2023-12-19',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'Compressed air energy storage. Novel technology — extended development timeline expected.',
  },
  {
    name: 'Goulburn River BESS', projectId: 'goulburn-river-bess', developer: 'Lightsource bp',
    scheme: 'LTESA', round: 'Round 3 — Generation + LDS', roundId: 'ltesa-round-3',
    capacityMW: 49, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2023-12-19',
    publicationStatus: 'fncen_only',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: true,
  },

  // ────────────────────────────────────────────────
  // LTESA Round 4 — Generation (announced 2024-07-01)
  // ────────────────────────────────────────────────
  {
    name: 'Maryvale Solar + BESS', projectId: 'maryvale-solar-and-energy-storage-system', developer: 'Maryvale Solar Farm Pty Ltd',
    scheme: 'LTESA', round: 'Round 4 — Generation', roundId: 'ltesa-round-4',
    capacityMW: 172, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2024-07-01',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Flyers Creek Wind Farm', projectId: 'flyers-creek-wind-farm', developer: 'Flyers Creek Wind Farm Pty Ltd',
    scheme: 'LTESA', round: 'Round 4 — Generation', roundId: 'ltesa-round-4',
    capacityMW: 145, state: 'NSW', stage: 'operating',
    agreementStatus: 'executed', awardAnnouncedDate: '2024-07-01',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
    notes: 'Operating. Legacy project — in operation before LTESA awarded.',
  },

  // ────────────────────────────────────────────────
  // LTESA Round 5 — Long Duration Storage (announced 2025-02-27)
  // ────────────────────────────────────────────────
  {
    name: 'Phoenix Pumped Hydro', projectId: 'phoenix-pumped-hydro-project', developer: 'ACEN Phoenix',
    scheme: 'LTESA', round: 'Round 5 — Long Duration Storage', roundId: 'ltesa-round-5',
    capacityMW: 800, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-02-27',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'ACEN CEC signatory. Pumped hydro — long development timeline expected.',
  },
  {
    name: 'Stoney Creek BESS', projectId: 'stoney-creek-bess', developer: 'Stoney Creek BESS Pty Ltd',
    scheme: 'LTESA', round: 'Round 5 — Long Duration Storage', roundId: 'ltesa-round-5',
    capacityMW: 125, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-02-27',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Griffith BESS', projectId: 'griffith-bess', developer: 'Eku Energy',
    scheme: 'LTESA', round: 'Round 5 — Long Duration Storage', roundId: 'ltesa-round-5',
    capacityMW: 100, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2025-02-27',
    publicationStatus: 'not_found',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },

  // ────────────────────────────────────────────────
  // LTESA Round 6 — Long Duration Storage (announced 2026-02-05)
  // ────────────────────────────────────────────────
  {
    name: 'Great Western Battery', projectId: 'great-western-battery-project', developer: 'Neoen Australia',
    scheme: 'LTESA', round: 'Round 6 — Long Duration Storage', roundId: 'ltesa-round-6',
    capacityMW: 330, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2026-02-05',
    publicationStatus: 'too_early',
    fncenListed: false, cecCharterSignatory: true, aslSummaryData: true,
    notes: 'Awarded Feb 2026 — within 20 business day window. Neoen CEC signatory.',
  },
  {
    name: 'Bowmans Creek BESS', projectId: 'bowmans-creek-bess', developer: 'Ark Energy',
    scheme: 'LTESA', round: 'Round 6 — Long Duration Storage', roundId: 'ltesa-round-6',
    capacityMW: 250, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2026-02-05',
    publicationStatus: 'too_early',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Bannaby BESS', projectId: 'bannaby-bess', developer: 'Penso Power Australia',
    scheme: 'LTESA', round: 'Round 6 — Long Duration Storage', roundId: 'ltesa-round-6',
    capacityMW: 233, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2026-02-05',
    publicationStatus: 'too_early',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Armidale East BESS', projectId: 'armidale-east-bess', developer: 'FRV',
    scheme: 'LTESA', round: 'Round 6 — Long Duration Storage', roundId: 'ltesa-round-6',
    capacityMW: 158, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2026-02-05',
    publicationStatus: 'too_early',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Ebor BESS', projectId: 'ebor-bess', developer: 'Bridge Energy',
    scheme: 'LTESA', round: 'Round 6 — Long Duration Storage', roundId: 'ltesa-round-6',
    capacityMW: 100, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2026-02-05',
    publicationStatus: 'too_early',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },
  {
    name: 'Kingswood BESS', projectId: 'kingswood-bess', developer: 'Iberdrola Australia',
    scheme: 'LTESA', round: 'Round 6 — Long Duration Storage', roundId: 'ltesa-round-6',
    capacityMW: 100, state: 'NSW', stage: 'development',
    agreementStatus: 'awarded', awardAnnouncedDate: '2026-02-05',
    publicationStatus: 'too_early',
    fncenListed: false, cecCharterSignatory: false, aslSummaryData: true,
  },
]
