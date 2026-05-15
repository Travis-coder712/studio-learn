/**
 * Detailed round-level information for CIS and LTESA rounds.
 * Used by the SchemeTracker info modals and analysis essay.
 */

export interface RoundInfo {
  id: string
  resultsDate: string
  targetCOD: string
  capacitySought: string
  capacityAwarded: string
  supportTerm: string
  bidParameters: string[]
  eligibility: string[]
  stateBreakdown?: string[]
  mechanismNote: string
  keyFacts: string[]
}

export const ROUND_INFO: Record<string, RoundInfo> = {
  // ============================================================
  // CIS Rounds
  // ============================================================

  'cis-pilot-nsw': {
    id: 'cis-pilot-nsw',
    resultsDate: '22 November 2023',
    targetCOD: 'December 2025',
    capacitySought: '930 MW (380 MW NSW LTESA + 550 MW CIS co-funding)',
    capacityAwarded: '1,075 MW across 6 projects (3 BESS + 3 VPP)',
    supportTerm: 'Up to 10 years (NSW LTESA firming structure)',
    bidParameters: [
      'Fixed annuity amount ($/MW/year)',
      'Annuity payment cap: AU$40,000 PV/MW/year',
    ],
    eligibility: [
      'Scheduled firming technologies (BESS, thermal storage, gas peakers, demand response)',
      'Must connect to NSW portion of NEM',
    ],
    stateBreakdown: ['NSW: 1,075 MW (6 projects)'],
    mechanismNote:
      'Delivered under the NSW LTESA firming mechanism \u2014 an annuity-based payment where the operator receives a fixed annual payment per MW of capacity. The operator must maintain at least 90% availability. This was NOT the standard CIS floor/ceiling mechanism used in later rounds.',
    keyFacts: [
      'First-ever CIS round, co-delivered with NSW Government',
      'Included 3 demand response / VPP projects from Enel X',
      'Projects committed to operational by end 2025',
      'Community benefits: $12.5M total',
      'DCCEEW Senate Estimates (Dec 2025) excluded these 6 projects from CIS count of 63 — structured under NSW LTESA firming mechanism',
    ],
  },

  'cis-pilot-sa-vic': {
    id: 'cis-pilot-sa-vic',
    resultsDate: '4 September 2024',
    targetCOD: 'Mid-2027',
    capacitySought: '600 MW / 2,400 MWh (4-hour equivalent dispatchable capacity)',
    capacityAwarded: '995 MW / 3,626 MWh across 6 projects',
    supportTerm: 'Up to 15 years (CISA structure)',
    bidParameters: [
      'Revenue Floor (annual, variable year-on-year)',
      'Revenue Ceiling (annual, variable year-on-year)',
      'Annual Payment Cap (caps both support and clawback)',
    ],
    eligibility: [
      'Clean dispatchable capacity',
      'Minimum 2-hour storage duration',
      'Located in SA or VIC',
      'Connected to NEM',
    ],
    stateBreakdown: ['SA: ~1,996 MWh (4 projects)', 'VIC: ~1,630 MWh (2 projects)'],
    mechanismNote:
      "First round using the standard CISA 'cap and collar' mechanism. If revenue falls below the Floor, the government pays 90% of the shortfall (capped). If revenue exceeds the Ceiling, the project pays back 50% of the excess (capped). Between floor and ceiling, no payments flow \u2014 the project keeps all market revenue.",
    keyFacts: [
      'First round to use the standard CISA mechanism',
      'Expanded CIS to SA and VIC',
      'Required minimum 2-hour duration',
      '$12.5M community benefits; $6.5M First Nations initiatives',
    ],
  },

  'cis-tender-1-nem-gen': {
    id: 'cis-tender-1-nem-gen',
    resultsDate: '11 December 2024',
    targetCOD: '31 December 2028 (earlier CODs assessed as higher merit)',
    capacitySought: '~6 GW of renewable generation across the NEM',
    capacityAwarded: '6.4 GW (19 projects) + 3.5 GWh co-located storage',
    supportTerm: 'Up to 15 years from COD',
    bidParameters: [
      'Revenue Floor ($/year, variable year-on-year)',
      'Revenue Ceiling ($/year, variable year-on-year)',
      'Annual Payment Cap ($/year, variable year-on-year)',
    ],
    eligibility: [
      'Renewable generation (wind, solar, hybrid with storage)',
      'NEM-connected',
      '84 bids received (4.5x oversubscribed)',
    ],
    stateBreakdown: [
      'NSW: 3.7 GW + 904 MWh (7 projects)',
      'VIC: 1.6 GW + 1,458 MWh (7 projects)',
      'QLD: 550 MW + 1,200 MWh (3 projects)',
      'SA: 574 MW (2 projects)',
    ],
    mechanismNote:
      "Standard CISA 'cap and collar' mechanism. Floor/ceiling/cap values locked at bid time for the full 15-year term. Projects retain full market exposure between floor and ceiling. Support period reduces day-for-day for any COD delay beyond the Final Support Commencement Date.",
    keyFacts: [
      "Australia's largest ever renewable energy tender at the time",
      '63% solar, remainder wind',
      '8 of 19 projects include co-located battery storage',
      'None of the Big 3 gen-tailers (Origin, AGL, EnergyAustralia) won',
      '~$660M shared community benefits; $280M First Nations initiatives',
      '$14B+ local content commitment',
    ],
  },

  'cis-tender-2-wem-disp': {
    id: 'cis-tender-2-wem-disp',
    resultsDate: '20 March 2025',
    targetCOD: 'October 2027',
    capacitySought: '500 MW / 2,000 MWh in the WEM (Western Australia)',
    capacityAwarded: '654 MW / 2,595 MWh across 4 projects',
    supportTerm: 'Up to 15 years (CISA)',
    bidParameters: ['Revenue Floor', 'Revenue Ceiling', 'Annual Payment Cap'],
    eligibility: [
      'Must connect to SWIS (South West Interconnected System)',
      'Minimum 2-hour storage duration',
      'Minimum 30 MW size',
      '7x oversubscribed',
    ],
    stateBreakdown: ['WA: 654 MW / 2,595 MWh (4 projects)'],
    mechanismNote:
      "Standard CISA mechanism adapted for WA's Wholesale Electricity Market (WEM), which operates differently from the NEM. Revenue measured against WEM market outcomes rather than NEM spot prices.",
    keyFacts: [
      'First CIS tender for Western Australia',
      'Exceeded target \u2014 awarded 654 MW vs 500 MW sought',
      'Attracted bids for 7x more capacity than tendered',
      '$145M shared community benefits; $41.5M First Nations initiatives',
      'All 4 winners are battery projects',
    ],
  },

  'cis-tender-3-nem-disp': {
    id: 'cis-tender-3-nem-disp',
    resultsDate: '16 September 2025',
    targetCOD: '31 December 2029 (earlier CODs assessed as higher merit)',
    capacitySought: '4 GW / 16 GWh of 4-hour equivalent dispatchable capacity',
    capacityAwarded: '4.13 GW / 15.37 GWh across 16 projects',
    supportTerm: 'Up to 15 years (CISA)',
    bidParameters: ['Revenue Floor', 'Revenue Ceiling', 'Annual Payment Cap'],
    eligibility: [
      'Clean dispatchable capacity (BESS or equivalent)',
      'Minimum 2-hour storage duration',
      'NEM-connected',
      '124 bids totalling ~34 GW (8.5x oversubscribed)',
    ],
    stateBreakdown: [
      'VIC: 1.33 GW / 4.89 GWh (5 projects)',
      'NSW: 1.25 GW / 4.29 GWh (5 projects)',
      'QLD: 1.09 GW / 4.38 GWh (4 projects)',
      'SA: 450 MW / 1.80 GWh (2 projects)',
    ],
    mechanismNote:
      "Standard CISA 'cap and collar'. All 16 winners are lithium-ion BESS \u2014 no pumped hydro, compressed air, or other technologies were successful despite being eligible.",
    keyFacts: [
      "Australia's biggest battery storage tender",
      'All 16 winners were lithium-ion BESS',
      '8.5x oversubscribed (124 bids for ~34 GW)',
      'Average storage duration: 3.72 hours',
      'Estimated $3.8B in local content',
    ],
  },

  'cis-tender-4-nem-gen': {
    id: 'cis-tender-4-nem-gen',
    resultsDate: '9 October 2025',
    targetCOD: '31 December 2030 (earlier CODs assessed as higher merit)',
    capacitySought: '~6 GW of renewable generation in the NEM',
    capacityAwarded: '6.6 GW across 20 projects + 11.4 GWh co-located storage',
    supportTerm: 'Up to 15 years (CISA)',
    bidParameters: ['Revenue Floor', 'Revenue Ceiling', 'Annual Payment Cap'],
    eligibility: [
      'Renewable generation (wind, solar, hybrid)',
      'NEM-connected',
      '84 bids for 25.6 GW (4x oversubscribed)',
    ],
    stateBreakdown: [
      'NSW: 2.6 GW + 3,913 MWh (6 projects)',
      'QLD: 2.0 GW + 4,217 MWh (6 projects)',
      'VIC: 1.2 GW + 2,114 MWh (4 projects)',
      'SA: 595 MW + 1,200 MWh (3 projects)',
      'TAS: 224 MW (1 project)',
    ],
    mechanismNote:
      'Standard CISA mechanism. This round saw a major shift toward hybrid projects \u2014 12 of 20 projects include co-located battery storage, reflecting developer confidence that hybridisation improves revenue certainty and grid value.',
    keyFacts: [
      '56% solar, 44% wind',
      '12 of 20 projects are hybrid (generation + battery)',
      "Includes Tasmania's first CIS project (Bell Bay Wind Farm)",
      '$1B Australian steel commitment',
      '$17B total local investment',
    ],
  },

  // ============================================================
  // LTESA Rounds
  // ============================================================

  'ltesa-round-1': {
    id: 'ltesa-round-1',
    resultsDate: '1 May 2023',
    targetCOD: 'Various \u2014 no single target date specified',
    capacitySought: '950 MW generation + 600 MW long duration storage',
    capacityAwarded: '~1,445 MW generation + 50 MW / 400 MWh LDS (4 projects)',
    supportTerm: 'Up to 20 years (generation)',
    bidParameters: [
      'Fixed price ($/MWh, no escalation)',
      'Contracted percentage (share of output covered)',
      'Repayment threshold price ($/MWh)',
    ],
    eligibility: [
      'Projects in or dispatching into NSW',
      'REZ projects preferred but not required (outstanding merit test for non-REZ)',
      '5.5 GW gen bids + 2.5 GW LDS bids received',
    ],
    stateBreakdown: ['NSW: all projects'],
    mechanismNote:
      'Generation LTESA: an options contract where the operator can enter up to 10 two-year cash-settled swaps over ~20 years. If exercised, operator receives the fixed (strike) price via a swap against spot. In non-exercise years, if average price exceeds the repayment threshold, operator repays 75% of the excess. LDS LTESA: variable annuity top-up to net operational revenues.',
    keyFacts: [
      'First ever LTESA tender',
      'Strike prices achieved: solar below ~$35/MWh, wind below ~$50/MWh \u2014 approximately 40% below LCOE',
      '~$2.5 billion total investment',
      'Enough electricity for ~700,000 homes',
      'Only 50 MW / 400 MWh of LDS awarded vs 600 MW sought',
    ],
  },

  'ltesa-round-2': {
    id: 'ltesa-round-2',
    resultsDate: '22 November 2023',
    targetCOD: '1 December 2025 (preferred); up to 1 December 2026 permitted',
    capacitySought: '380 MW firming (expanded to 930 MW with CIS co-funding)',
    capacityAwarded: '1,075 MW / ~3 GWh across 6 projects',
    supportTerm: 'Up to 10 years (firming)',
    bidParameters: [
      'Fixed annuity amount ($/MW/year)',
      'Annuity payment cap: AU$40,000 PV/MW/year',
    ],
    eligibility: [
      'BESS, demand response, gas peakers, pumped hydro eligible',
      'Must connect to NSW portion of NEM',
      'Average winning bid: AU$32,000 PV/MW/year',
    ],
    stateBreakdown: ['NSW: all projects'],
    mechanismNote:
      'Firming LTESA: provides up to 10 one-year options to access an annuity payment. The annuity is a fixed $/MW/year with no escalation. Operator must maintain at least 90% availability to receive full payment. This round was co-funded with the Commonwealth CIS Pilot NSW.',
    keyFacts: [
      'Co-delivered with CIS Pilot NSW',
      'Original 380 MW expanded to 930 MW with CIS co-funding',
      'Average winning annuity: AU$32,000 PV/MW/year',
      'Included 2-hour and 4-hour BESS plus VPP projects',
      'Target COD: December 2025',
    ],
  },

  'ltesa-round-3': {
    id: 'ltesa-round-3',
    resultsDate: '19 December 2023',
    targetCOD: 'Before 2028',
    capacitySought: '~950 MW generation + 550 MW LDS',
    capacityAwarded: '750 MW generation + 524 MW / 4,192 MWh LDS (5 projects)',
    supportTerm: 'Up to 20 years (gen); up to 14yr BESS / 40yr pumped hydro (LDS)',
    bidParameters: [
      'Generation: Fixed price ($/MWh), Contracted %, Repayment threshold',
      'LDS: Annuity Cap ($/MW/year), Net Revenue Threshold, Contract term',
    ],
    eligibility: [
      'NSW-connected projects',
      'REZ preferred',
      '3.1 GW gen bids + 1.6 GW LDS bids received',
    ],
    stateBreakdown: ['NSW: all projects'],
    mechanismNote:
      'Generation: same options-based swap as Round 1. LDS: variable annuity payment \u2014 top-up to net revenues, with 50% revenue sharing above the Net Revenue Threshold. Both annuity cap and threshold escalate at lesser of CPI or 3%. Notably included an advanced compressed air energy storage (A-CAES) project.',
    keyFacts: [
      'Average generation fixed price less than AUD $55/MWh for 20 years',
      "Included Hydrostor Silver City A-CAES \u2014 first compressed air storage to win an LTESA",
      'Richmond Valley BESS at 275 MW / 2,200 MWh was the largest single LDS award',
      'Combined gen + LDS round',
    ],
  },

  'ltesa-round-4': {
    id: 'ltesa-round-4',
    resultsDate: '28 June 2024',
    targetCOD: 'Before 2028',
    capacitySought: 'Not publicly specified (generation only)',
    capacityAwarded: '312 MW generation + 372 MWh co-located storage (2 projects)',
    supportTerm: 'Up to 20 years (generation)',
    bidParameters: [
      'Fixed price ($/MWh)',
      'Contracted percentage',
      'Repayment threshold price',
    ],
    eligibility: ['NSW-connected generation projects'],
    stateBreakdown: ['NSW: 312 MW (2 projects)'],
    mechanismNote:
      'Standard generation LTESA options mechanism. Only 2 projects awarded \u2014 significantly smaller than previous rounds, signalling tightening eligibility or fewer viable projects meeting criteria.',
    keyFacts: [
      'Smallest LTESA round \u2014 only 2 projects awarded',
      'Flyers Creek Wind Farm (~140 MW) was already constructed and became the first project with an LTESA to begin operations (May 2025)',
      'Planned Q4 2024 generation tender was subsequently cancelled to align with CIS',
      'Maryvale includes 172 MW / 372 MWh co-located BESS',
    ],
  },

  'ltesa-round-5': {
    id: 'ltesa-round-5',
    resultsDate: '27 February 2025',
    targetCOD: 'Before end of decade',
    capacitySought: 'Long duration storage (indicative volume not publicly specified)',
    capacityAwarded: '1.03 GW / 13.79 GWh across 3 projects',
    supportTerm: '14 years (BESS); 40 years (pumped hydro)',
    bidParameters: [
      'Annuity Cap ($/MW/year)',
      'Net Revenue Threshold',
      'Contract term',
      'Escalation type (lesser of CPI or 3%)',
    ],
    eligibility: [
      'Long duration storage in NSW',
      'Also included South West REZ Access Rights',
    ],
    stateBreakdown: ['NSW: 1.03 GW / 13.79 GWh (3 projects)'],
    mechanismNote:
      "LDS LTESA: variable annuity payment with 50% revenue sharing above threshold. This round awarded the first pumped hydro LTESA \u2014 Phoenix Pumped Hydro at 800 MW / 11,990 MWh with a 40-year term, making it the longest government-backed energy contract in Australian history.",
    keyFacts: [
      'Largest LDS tender to that date',
      'First pumped hydro project to receive an LTESA (Phoenix, 800 MW / ~12 GWh, 40-year term)',
      'Contributed ~11% toward 2 GW LDS minimum objective and ~49% toward 28 GWh objective',
      'Phoenix Pumped Hydro at Lake Burrendong is ~15 hours duration',
    ],
  },

  'ltesa-round-6': {
    id: 'ltesa-round-6',
    resultsDate: '5 February 2026',
    targetCOD: 'Before end of decade',
    capacitySought: 'Long duration storage',
    capacityAwarded: '1,171 MW / 11,980 MWh across 6 projects',
    supportTerm: 'Up to 14 years (all BESS \u2014 no pumped hydro)',
    bidParameters: [
      'Annuity Cap ($/MW/year)',
      'Net Revenue Threshold',
      'Contract term',
    ],
    eligibility: [
      'Long duration storage in NSW',
      'Duration range: 8.7 to 11.5 hours',
    ],
    stateBreakdown: ['NSW: 1,171 MW / 11,980 MWh (6 projects)'],
    mechanismNote:
      'LDS LTESA with variable annuity. Combined with prior rounds, this round met the legislated LDS minimum objectives of 2 GW by 2030 and 28 GWh by 2034 \u2014 a significant milestone for the NSW Roadmap.',
    keyFacts: [
      'Largest single LTESA tender by energy capacity',
      'Met NSW legislated LDS targets: 2 GW by 2030 and 28 GWh by 2034',
      'All 6 winners are lithium-ion BESS (no pumped hydro this round)',
      'Great Western Battery (Neoen) at 330 MW / 3,500 MWh was the largest project',
      'Next LDS tender: Q2 2026 seeking 12 GWh',
    ],
  },

  'ltesa-round-7': {
    id: 'ltesa-round-7',
    resultsDate: '15 May 2026',
    targetCOD: 'End of November 2027',
    capacitySought: 'Firming supply & demand response (no fixed MW target disclosed)',
    capacityAwarded: '532 MW / 2,000 MWh across 2 projects (1 BESS + 1 VPP)',
    supportTerm: 'Firming LTESA \u2014 payments triggered by LOR 2 and LOR 3 reliability events',
    bidParameters: [
      'Firming services strike',
      'Availability cap',
      'Demand-response contract terms',
    ],
    eligibility: [
      'Firming capacity or demand response in NSW',
      'Must be available to respond to AEMO LOR 2 and LOR 3 events',
    ],
    stateBreakdown: ['NSW: 532 MW / 2,000 MWh (2 projects)'],
    mechanismNote:
      'Second NSW Roadmap firming tender (Tender 2 was the first, in late 2023). Firming LTESA structure pays the operator for being available during AEMO Lack-of-Reserve (LOR) 2 and LOR 3 events. Pricing materially lower than Tender 2 \u2014 competitive bids reflect rapid battery cost declines.',
    keyFacts: [
      "First firming tender since Tender 2 (late 2023) \u2014 approximately a dozen bids competed",
      "AGL Tomago Battery: 500 MW / 2,000 MWh (4-hour duration), Fluence Gridstack EPC, FID Jul 2025, COD targeted late 2027",
      "Enel X Sydney/Newcastle VPP: 32 MW aggregating flexible demand from business customers",
      "AGL doubled the storage at Tomago vs the 500 MW / 1,000 MWh Liddell battery (Tender 2) at roughly the same cost",
      "Average strike materially lower than Tender 2 \u2014 attributed to falling battery costs",
      "Both projects must be commissioned by end-November 2027",
    ],
  },
}
