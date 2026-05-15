/**
 * Climate Intelligence — Curated Reference Data
 *
 * Static data for Australian climate drivers (ENSO, IOD, SAM),
 * historical climate events and their impact on renewable generation,
 * and current conditions assessment.
 *
 * Sources: Bureau of Meteorology, NOAA Climate Prediction Center,
 * AEMO State of the Energy Market reports.
 *
 * Last researched: March 2026
 */

// ============================================================
// Types
// ============================================================

export interface ClimatePhase {
  name: string
  threshold: string
  color: string
  renewableImpact: 'positive' | 'negative' | 'mixed' | 'neutral'
}

export interface ClimateDriver {
  id: 'enso' | 'iod' | 'sam'
  name: string
  fullName: string
  description: string
  phases: ClimatePhase[]
  impactOnRenewables: {
    wind: string
    solar: string
    regions: string
  }
  measurementIndex: string
  dataSource: string
}

export interface HistoricalClimateEvent {
  year: number
  yearRange: string
  ensoPhase: string
  iodPhase: string
  samPhase: string
  severity: 'strong' | 'moderate' | 'weak'
  renewableImpact: string
  windImpact: 'above_avg' | 'below_avg' | 'normal'
  solarImpact: 'above_avg' | 'below_avg' | 'normal'
  marketImpact: string
  notableEvents: string[]
}

export type ClimateAssessment = 'favorable' | 'neutral' | 'concerning' | 'adverse'

export interface CurrentClimateConditions {
  lastUpdated: string
  enso: { phase: string; oni: number; outlook: string; confidence: string }
  iod: { phase: string; dmi: number; outlook: string }
  sam: { phase: string; index: number; outlook: string }
  overallAssessment: ClimateAssessment
  assessmentSummary: string
  keyRisks: string[]
  keyOpportunities: string[]
}

// ============================================================
// Assessment colours
// ============================================================

export const ASSESSMENT_COLORS: Record<ClimateAssessment, string> = {
  favorable: '#22c55e',
  neutral: '#f59e0b',
  concerning: '#ef4444',
  adverse: '#dc2626',
}

export const ASSESSMENT_LABELS: Record<ClimateAssessment, string> = {
  favorable: 'Favorable',
  neutral: 'Neutral / Mixed',
  concerning: 'Concerning',
  adverse: 'Adverse',
}

// ============================================================
// Climate Drivers
// ============================================================

export const CLIMATE_DRIVERS: ClimateDriver[] = [
  {
    id: 'enso',
    name: 'ENSO',
    fullName: 'El Niño–Southern Oscillation',
    description:
      'ENSO is the most influential climate driver for Australia. It describes the periodic warming (El Niño) and cooling (La Niña) of sea surface temperatures in the central-eastern Pacific Ocean. ENSO cycles typically last 2–7 years and profoundly affect Australian rainfall, cloud cover, and wind patterns — all of which directly influence renewable energy generation.',
    phases: [
      {
        name: 'El Niño',
        threshold: 'ONI ≥ +0.5 °C for 5 consecutive overlapping 3-month periods',
        color: '#ef4444',
        renewableImpact: 'mixed',
      },
      {
        name: 'Neutral',
        threshold: 'ONI between −0.5 °C and +0.5 °C',
        color: '#6b7280',
        renewableImpact: 'neutral',
      },
      {
        name: 'La Niña',
        threshold: 'ONI ≤ −0.5 °C for 5 consecutive overlapping 3-month periods',
        color: '#3b82f6',
        renewableImpact: 'mixed',
      },
    ],
    impactOnRenewables: {
      wind:
        'El Niño tends to reduce wind speeds in southern Australia (SA, VIC, TAS) during summer but can increase synoptic wind events. La Niña generally brings more active weather systems to eastern Australia, which can increase wind generation in NSW and QLD but effects vary by region.',
      solar:
        'El Niño = drier, clearer skies in eastern Australia → higher solar generation. La Niña = wetter, more cloud cover → lower solar CF, especially in NSW and QLD. The 2020–23 triple La Niña significantly depressed solar output in eastern states.',
      regions:
        'Eastern states (NSW, QLD) most affected. SA and TAS less directly impacted by ENSO but experience secondary effects through changed weather patterns.',
    },
    measurementIndex: 'Oceanic Niño Index (ONI)',
    dataSource: 'NOAA Climate Prediction Center / Bureau of Meteorology',
  },
  {
    id: 'iod',
    name: 'IOD',
    fullName: 'Indian Ocean Dipole',
    description:
      'The IOD measures the difference in sea surface temperatures between the western and eastern Indian Ocean. It typically develops in May–June and peaks in September–November. The IOD strongly influences winter and spring rainfall in southern and eastern Australia, often co-occurring with ENSO to amplify or dampen its effects.',
    phases: [
      {
        name: 'Positive IOD',
        threshold: 'DMI ≥ +0.4 °C sustained',
        color: '#ef4444',
        renewableImpact: 'mixed',
      },
      {
        name: 'Neutral',
        threshold: 'DMI between −0.4 °C and +0.4 °C',
        color: '#6b7280',
        renewableImpact: 'neutral',
      },
      {
        name: 'Negative IOD',
        threshold: 'DMI ≤ −0.4 °C sustained',
        color: '#3b82f6',
        renewableImpact: 'mixed',
      },
    ],
    impactOnRenewables: {
      wind:
        'Positive IOD reduces frontal activity in southeastern Australia, potentially lowering wind generation in VIC and SA during winter/spring. Negative IOD brings more active fronts, generally supporting wind generation in the south.',
      solar:
        'Positive IOD = drier conditions in southern/eastern Australia → higher solar output, especially in VIC and SA. Negative IOD = wetter conditions → reduced solar CF. The 2019 strong positive IOD contributed to the drought and bushfire conditions but also elevated solar output.',
      regions:
        'Southern Australia (VIC, SA) most affected. IOD influence strongest in winter and spring (May–November). Typically weakens during summer.',
    },
    measurementIndex: 'Dipole Mode Index (DMI)',
    dataSource: 'Bureau of Meteorology',
  },
  {
    id: 'sam',
    name: 'SAM',
    fullName: 'Southern Annular Mode',
    description:
      'The SAM describes the north-south movement of the westerly wind belt that circles Antarctica. When positive, the westerly belt contracts towards Antarctica; when negative, it expands towards Australia. SAM changes on weekly to monthly timescales and has a strong influence on southern Australian weather.',
    phases: [
      {
        name: 'Positive SAM',
        threshold: 'SAM Index > +1.0',
        color: '#22c55e',
        renewableImpact: 'mixed',
      },
      {
        name: 'Neutral',
        threshold: 'SAM Index between −1.0 and +1.0',
        color: '#6b7280',
        renewableImpact: 'neutral',
      },
      {
        name: 'Negative SAM',
        threshold: 'SAM Index < −1.0',
        color: '#8b5cf6',
        renewableImpact: 'mixed',
      },
    ],
    impactOnRenewables: {
      wind:
        'Negative SAM brings more fronts and storms to southern Australia → increased wind generation in VIC, SA, TAS. Positive SAM pushes storm tracks further south → reduced wind in mainland southern states but can increase wind in TAS.',
      solar:
        'Positive SAM = less rainfall in southern mainland → better solar conditions in VIC and SA. Negative SAM = more cloud and rain in the south → reduced solar. In summer, positive SAM also brings more rain to eastern Australia (opposite to winter effect).',
      regions:
        'VIC, SA and TAS most affected. Effects are season-dependent: in summer, positive SAM increases eastern rainfall; in winter/spring, positive SAM reduces southern rainfall.',
    },
    measurementIndex: 'SAM Index (Marshall)',
    dataSource: 'Bureau of Meteorology / British Antarctic Survey',
  },
]

// ============================================================
// Historical Climate Events
// ============================================================

export const HISTORICAL_CLIMATE_EVENTS: HistoricalClimateEvent[] = [
  {
    year: 2018,
    yearRange: '2017–2018',
    ensoPhase: 'La Niña (weak)',
    iodPhase: 'Negative',
    samPhase: 'Positive',
    severity: 'weak',
    renewableImpact: 'Mild La Niña with negative IOD brought above-average rainfall to parts of eastern Australia. Solar output slightly below trend in NSW. Wind patterns near normal.',
    windImpact: 'normal',
    solarImpact: 'below_avg',
    marketImpact: 'Wholesale prices remained elevated following SA system black and Hazelwood closure. Gas prices high.',
    notableEvents: ['Weak La Niña dissipated by March 2018', 'Negative IOD brought wetter spring to southeast'],
  },
  {
    year: 2019,
    yearRange: '2019',
    ensoPhase: 'Neutral',
    iodPhase: 'Positive (strong)',
    samPhase: 'Positive',
    severity: 'strong',
    renewableImpact: 'Strong positive IOD combined with positive SAM drove extreme drought and heatwave conditions. Solar output well above average with clear skies. Wind below average in VIC/SA due to persistent high-pressure blocking.',
    windImpact: 'below_avg',
    solarImpact: 'above_avg',
    marketImpact: 'Extreme heatwave events drove record spot prices. Multiple price spikes in SA and VIC. High demand periods coincided with low wind.',
    notableEvents: [
      'Record positive IOD event',
      'Black Summer bushfires began',
      'Severe drought across eastern Australia',
      'Record heatwave conditions',
    ],
  },
  {
    year: 2020,
    yearRange: '2020–2021',
    ensoPhase: 'La Niña (moderate)',
    iodPhase: 'Negative',
    samPhase: 'Positive',
    severity: 'moderate',
    renewableImpact: 'First year of the triple La Niña. Increased rainfall and cloud cover reduced solar output across eastern states. Wind generation was near normal but variable. Combined CF dropped noticeably in NSW.',
    windImpact: 'normal',
    solarImpact: 'below_avg',
    marketImpact: 'COVID-19 demand reduction offset some weather effects. Wholesale prices moderated. Gas prices fell.',
    notableEvents: [
      'COVID-19 demand reduction',
      'La Niña declared in September 2020',
      'Significant flooding in NSW',
    ],
  },
  {
    year: 2021,
    yearRange: '2021–2022',
    ensoPhase: 'La Niña (moderate)',
    iodPhase: 'Negative',
    samPhase: 'Negative',
    severity: 'moderate',
    renewableImpact: 'Second consecutive La Niña maintained wet conditions across eastern Australia. Solar CF below average in QLD and NSW. Negative SAM brought more fronts to southern states, supporting wind generation in VIC and SA.',
    windImpact: 'above_avg',
    solarImpact: 'below_avg',
    marketImpact: 'Energy crisis began mid-2022 with coal plant outages, high gas prices, and flooding affecting coal supplies. Record wholesale prices.',
    notableEvents: [
      'Second consecutive La Niña year',
      'Lismore and northern NSW major flooding',
      'Coal supply disruptions from floods',
    ],
  },
  {
    year: 2022,
    yearRange: '2022–2023',
    ensoPhase: 'La Niña (weak)',
    iodPhase: 'Negative',
    samPhase: 'Positive',
    severity: 'weak',
    renewableImpact: 'Third and final year of the triple La Niña. Wet conditions continued but weakening. Solar output recovering but still below long-term trends in eastern states. Wind variable.',
    windImpact: 'normal',
    solarImpact: 'below_avg',
    marketImpact: 'Wholesale prices remained high through H1 but moderated as coal supply recovered. Price cap intervention by government.',
    notableEvents: [
      'Rare triple-dip La Niña',
      'AEMO price cap intervention December 2022',
      'La Niña weakening through early 2023',
    ],
  },
  {
    year: 2023,
    yearRange: '2023–2024',
    ensoPhase: 'El Niño (moderate)',
    iodPhase: 'Positive',
    samPhase: 'Negative',
    severity: 'moderate',
    renewableImpact: 'Transition from La Niña to El Niño brought drier conditions. Solar output recovered strongly across all states. Wind generation slightly below average in southern states as El Niño reduced frontal activity.',
    windImpact: 'below_avg',
    solarImpact: 'above_avg',
    marketImpact: 'Wholesale prices fell significantly from 2022 peaks. New solar and wind capacity coming online helped moderate prices.',
    notableEvents: [
      'El Niño declared June 2023',
      'Record solar installation year',
      'Drier conditions returned to eastern Australia',
    ],
  },
  {
    year: 2024,
    yearRange: '2024',
    ensoPhase: 'Neutral (post-El Niño)',
    iodPhase: 'Neutral',
    samPhase: 'Positive',
    severity: 'weak',
    renewableImpact: 'El Niño faded to neutral by mid-2024. Generally favorable conditions for both wind and solar. Near-normal rainfall across most of the NEM. Good combined CF performance in most states.',
    windImpact: 'normal',
    solarImpact: 'normal',
    marketImpact: 'Wholesale prices continued to moderate. Record levels of rooftop and utility solar in the system.',
    notableEvents: [
      'El Niño faded to neutral',
      'EnergyConnect SA section commissioned',
      'Record NEM renewable penetration days',
    ],
  },
  {
    year: 2025,
    yearRange: '2025',
    ensoPhase: 'La Niña (weak)',
    iodPhase: 'Neutral',
    samPhase: 'Positive',
    severity: 'weak',
    renewableImpact: 'Weak La Niña brought slightly above-average rainfall to eastern states. Solar CF modestly reduced in NSW and QLD. Wind generation near average. Combined CF slightly below neutral conditions.',
    windImpact: 'normal',
    solarImpact: 'below_avg',
    marketImpact: 'Increasing renewable capacity offsetting any weather-related CF reduction. Wholesale prices at multi-year lows.',
    notableEvents: [
      'Weak La Niña declared late 2024',
      'Record wind and solar capacity in the NEM',
    ],
  },
  {
    year: 2026,
    yearRange: '2026 (to date)',
    ensoPhase: 'Neutral (La Niña fading)',
    iodPhase: 'Neutral',
    samPhase: 'Positive',
    severity: 'weak',
    renewableImpact: 'La Niña fading to neutral through Q1. Conditions improving for solar generation. Early season data suggests near-normal combined CF across the NEM.',
    windImpact: 'normal',
    solarImpact: 'normal',
    marketImpact: 'To be determined — early year data suggests continued low wholesale prices.',
    notableEvents: [
      'La Niña expected to fully dissipate by Q2',
      'EnergyConnect full completion expected',
    ],
  },
]

// ============================================================
// Current Conditions Assessment
// ============================================================

export const CURRENT_CONDITIONS: CurrentClimateConditions = {
  lastUpdated: '2026-03-15',
  enso: {
    phase: 'Neutral',
    oni: -0.3,
    outlook: 'La Niña has faded to neutral. ENSO-neutral conditions expected through at least mid-2026.',
    confidence: 'High',
  },
  iod: {
    phase: 'Neutral',
    dmi: +0.1,
    outlook: 'IOD currently inactive (typical for late summer/autumn). Next active season May–November.',
    },
  sam: {
    phase: 'Positive',
    index: +1.2,
    outlook: 'Positive SAM favoring reduced rainfall in southern mainland — supportive of solar output in VIC and SA.',
  },
  overallAssessment: 'favorable',
  assessmentSummary:
    'Current conditions are broadly favorable for renewable generation across the NEM. The weak La Niña that suppressed solar output in eastern states through 2025 has faded to neutral. Positive SAM is reducing cloud cover in southern states. No major climate drivers are signaling adverse conditions for the coming season.',
  keyRisks: [
    'Possible La Niña re-emergence in late 2026 (low probability currently)',
    'Above-average sea surface temperatures may increase cyclone activity in QLD',
  ],
  keyOpportunities: [
    'Neutral ENSO + positive SAM = above-average solar potential in VIC and SA',
    'Calmer conditions should support construction timelines for HumeLink and CWO REZ',
    'Post-La Niña recovery typically brings 1–2 seasons of improved solar CF in eastern states',
  ],
}

// ============================================================
// Helpers
// ============================================================

/** Get the climate event record for a given year */
export function getClimateEventForYear(year: number): HistoricalClimateEvent | undefined {
  return HISTORICAL_CLIMATE_EVENTS.find(e => e.year === year)
}

/** Phase colour for display */
export function getPhaseColor(phase: string): string {
  const lower = phase.toLowerCase()
  if (lower.includes('el ni')) return '#ef4444'
  if (lower.includes('la ni')) return '#3b82f6'
  if (lower.includes('positive')) return '#f59e0b'
  if (lower.includes('negative')) return '#8b5cf6'
  return '#6b7280'
}

/** Impact arrow character */
export function getImpactArrow(impact: 'above_avg' | 'below_avg' | 'normal'): string {
  if (impact === 'above_avg') return '↑'
  if (impact === 'below_avg') return '↓'
  return '→'
}

/** Impact colour */
export function getImpactColor(impact: 'above_avg' | 'below_avg' | 'normal'): string {
  if (impact === 'above_avg') return '#22c55e'
  if (impact === 'below_avg') return '#ef4444'
  return '#6b7280'
}
