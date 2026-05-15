/**
 * Renewable Energy Zone (REZ) Data
 *
 * Sourced from EnergyCo (NSW), VicGrid, Powerlink (QLD),
 * AEMO ISP, ElectraNet (SA), TasNetworks, and Marinus Link.
 */
import type { SourceReference, State } from '../lib/types'

export interface REZZone {
  id: string
  name: string
  state: State
  target_capacity_gw: number | null // null = TBD
  status: 'declared' | 'draft' | 'in-flight' | 'candidate' | 'planning'
  status_detail: string
  transmission_project?: string
  transmission_status?: 'operating' | 'construction' | 'approved' | 'planning' | 'conceptual'
  description: string
  sources: SourceReference[]
}

// ============================================================
// NSW REZs — EnergyCo / Electricity Infrastructure Roadmap
// ============================================================

const NSW_REZS: REZZone[] = [
  {
    id: 'nsw-central-west-orana',
    name: 'Central-West Orana',
    state: 'NSW',
    target_capacity_gw: 4.5,
    status: 'declared',
    status_detail: 'Australia\'s first declared REZ. Construction commenced June 2025. Financial close April 2025.',
    transmission_project: 'CWO REZ Transmission (ACEREZ consortium)',
    transmission_status: 'construction',
    description: 'Australia\'s first declared REZ, in central-west NSW. Designed to connect 7.7 GW of wind and solar, powering over 2 million homes. 35-year design-build-operate contract awarded to ACEREZ (ACCIONA/COBRA/Endeavour Energy).',
    sources: [
      { title: 'EnergyCo — Central-West Orana REZ', url: 'https://www.energyco.nsw.gov.au/our-projects/central-west-orana-renewable-energy-zone', source_tier: 1 },
    ],
  },
  {
    id: 'nsw-new-england',
    name: 'New England',
    state: 'NSW',
    target_capacity_gw: 8.0,
    status: 'declared',
    status_detail: 'Declared. EIS expected H2 2026. Network operator procurement shortlist announced Nov 2025.',
    transmission_project: 'New England REZ Network Infrastructure',
    transmission_status: 'planning',
    description: 'NSW\'s largest REZ by scale, located around Armidale. 8 GW generation target. Port-to-REZ road infrastructure already under construction. Network operator shortlist announced.',
    sources: [
      { title: 'EnergyCo — New England REZ', url: 'https://www.energyco.nsw.gov.au/ne', source_tier: 1 },
    ],
  },
  {
    id: 'nsw-south-west',
    name: 'South-West',
    state: 'NSW',
    target_capacity_gw: 2.5,
    status: 'declared',
    status_detail: 'Declared. Access rights tender results announced April 2025 (3.56 GW awarded). Projects expected online 2027–2030.',
    transmission_project: 'EnergyConnect + VNI West + HumeLink',
    transmission_status: 'construction',
    description: 'Centred around Hay in south-west NSW. 3.56 GW of generation awarded through access rights tender. Expected to attract $17.8B in private investment. Relies on EnergyConnect (under construction) and VNI West.',
    sources: [
      { title: 'EnergyCo — South-West REZ', url: 'https://www.energyco.nsw.gov.au/our-projects/south-west-rez', source_tier: 1 },
    ],
  },
  {
    id: 'nsw-hunter-central-coast',
    name: 'Hunter-Central Coast',
    state: 'NSW',
    target_capacity_gw: 1.0,
    status: 'declared',
    status_detail: 'Declared. Commitment deed with Ausgrid signed Dec 2024. Preparatory works commenced 2025, full capacity by 2028.',
    transmission_project: 'HCC REZ Network Infrastructure (Ausgrid)',
    transmission_status: 'construction',
    description: 'Australia\'s first REZ based on upgrading existing distribution infrastructure (Ausgrid poles and wires). Approximately 1.8 GW of new generation and storage expected in the Hunter and Central Coast industrial corridor.',
    sources: [
      { title: 'EnergyCo — Hunter-Central Coast REZ', url: 'https://www.energyco.nsw.gov.au/our-projects/hunter-central-coast-rez', source_tier: 1 },
    ],
  },
  {
    id: 'nsw-illawarra',
    name: 'Illawarra',
    state: 'NSW',
    target_capacity_gw: 1.0,
    status: 'declared',
    status_detail: 'Declared. Early planning stage. Roundtable consultations held May and Dec 2025.',
    description: 'REZ in the Illawarra region south of Sydney. Earliest stage among NSW\'s five REZs. 1 GW intended network capacity.',
    sources: [
      { title: 'EnergyCo — Illawarra REZ', url: 'https://www.energyco.nsw.gov.au/our-projects/illawarra-rez', source_tier: 1 },
    ],
  },
]

// ============================================================
// VIC REZs — VicGrid / Victorian Transmission Plan
// ============================================================

const VIC_REZS: REZZone[] = [
  {
    id: 'vic-western',
    name: 'Western Victoria',
    state: 'VIC',
    target_capacity_gw: 2.4,
    status: 'draft',
    status_detail: 'Draft REZ order issued Nov 2025. Declaration expected 2026.',
    transmission_project: 'VNI West (500 kV, target late 2030/2031)',
    transmission_status: 'planning',
    description: 'Victoria\'s largest onshore REZ by capacity. Consolidated from former Grampians-Wimmera and Wimmera Southern Mallee zones. VNI West interconnector will unlock this zone.',
    sources: [
      { title: 'VicGrid — Western REZ', url: 'https://www.vicgrid.com.au/transmission-planning/renewable-energy-zones/western-renewable-energy-zone', source_tier: 1 },
    ],
  },
  {
    id: 'vic-gippsland-offshore',
    name: 'Gippsland Shoreline (Offshore Wind)',
    state: 'VIC',
    target_capacity_gw: 2.0,
    status: 'draft',
    status_detail: 'Draft REZ order Nov 2025. Three consortia shortlisted for transmission delivery. 9 GW offshore wind target by 2040.',
    transmission_project: 'Gippsland Offshore Wind Transmission (500 kV line)',
    transmission_status: 'planning',
    description: 'Dedicated shoreline zone for connecting offshore wind farms to the NEM. 2 GW initial tranche, scaling to 9 GW by 2040. 500 kV double-circuit from Giffard to Loy Yang.',
    sources: [
      { title: 'VicGrid — Gippsland Offshore Wind Transmission', url: 'https://www.vicgrid.com.au/transmission-projects/gippsland-offshore-wind-transmission', source_tier: 1 },
    ],
  },
  {
    id: 'vic-south-west',
    name: 'South West Victoria',
    state: 'VIC',
    target_capacity_gw: null,
    status: 'draft',
    status_detail: 'Draft REZ order Nov 2025. Capacity cap to be set 2026. Mortlake Turn-In grid strengthening complete.',
    transmission_project: 'Mortlake Turn-In (completed)',
    transmission_status: 'operating',
    description: 'Wind-rich zone on Victoria\'s south-west coast. Mortlake Turn-In grid strengthening already completed, enabling near-term connections.',
    sources: [
      { title: 'VicGrid — Renewable Energy Zones', url: 'https://www.vicgrid.com.au/transmission-planning/renewable-energy-zones', source_tier: 1 },
    ],
  },
  {
    id: 'vic-gippsland-onshore',
    name: 'Gippsland (Onshore)',
    state: 'VIC',
    target_capacity_gw: null,
    status: 'draft',
    status_detail: 'Draft REZ order Nov 2025. Capacity cap to be set 2026.',
    description: 'Located between Morwell and Sale, leveraging existing Latrobe Valley energy infrastructure as coal generation retires. Transitional REZ supporting clean energy in Gippsland.',
    sources: [
      { title: 'VicGrid — Gippsland REZ', url: 'https://www.vicgrid.com.au/transmission-planning/renewable-energy-zones/gippsland-renewable-energy-zone', source_tier: 1 },
    ],
  },
  {
    id: 'vic-north-west',
    name: 'North West Victoria',
    state: 'VIC',
    target_capacity_gw: 1.2,
    status: 'draft',
    status_detail: 'Draft REZ order Nov 2025. Declaration expected 2026.',
    description: 'Located in the Murray River corridor of north-west Victoria. Strong solar and wind resources. 930 MW to 1,390 MW capacity range under assessment.',
    sources: [
      { title: 'VicGrid — Renewable Energy Zones', url: 'https://www.vicgrid.com.au/transmission-planning/renewable-energy-zones', source_tier: 1 },
    ],
  },
]

// ============================================================
// QLD REZs (Regional Energy Hubs) — Powerlink / Energy Roadmap
// ============================================================

const QLD_REZS: REZZone[] = [
  {
    id: 'qld-southern-downs',
    name: 'Southern Downs',
    state: 'QLD',
    target_capacity_gw: 2.0,
    status: 'in-flight',
    status_detail: 'In-flight. Transmission line complete. MacIntyre Wind Farm (923 MW) utilising nearly half the capacity.',
    transmission_project: 'Southern Downs REZ transmission line',
    transmission_status: 'operating',
    description: 'One of QLD\'s three in-flight REZs. 2 GW export capacity via new high-voltage transmission. MacIntyre Wind Farm (923 MW, Acciona) is the anchor project.',
    sources: [
      { title: 'Powerlink — Queensland REZs', url: 'https://www.powerlink.com.au/rez', source_tier: 1 },
    ],
  },
  {
    id: 'qld-callide',
    name: 'Callide',
    state: 'QLD',
    target_capacity_gw: 2.3,
    status: 'planning',
    status_detail: 'Phase 1. On track to be QLD\'s first formally declared Regional Energy Hub.',
    transmission_project: 'Powerlink Central QLD upgrades',
    transmission_status: 'planning',
    description: 'Central QLD\'s existing energy heartland, transitioning from coal. 2–2.6 GW of renewable capacity planned. On track to be QLD\'s first declared hub.',
    sources: [
      { title: 'Powerlink — Central QLD REZs', url: 'https://www.powerlink.com.au/central-queensland-renewable-energy-zones', source_tier: 1 },
    ],
  },
  {
    id: 'qld-darling-downs',
    name: 'Darling Downs',
    state: 'QLD',
    target_capacity_gw: null,
    status: 'planning',
    status_detail: 'Phase 2 (mid-late 2020s). Part of 12.2 GW Southern QLD total.',
    description: 'Wind-focused zone in the Darling Downs region. Part of the 12.2 GW Southern QLD renewable energy corridor. Previously supported by proposed Borumba pumped hydro.',
    sources: [
      { title: 'Powerlink — Queensland REZs', url: 'https://www.powerlink.com.au/rez', source_tier: 1 },
    ],
  },
  {
    id: 'qld-isaac',
    name: 'Isaac',
    state: 'QLD',
    target_capacity_gw: null,
    status: 'planning',
    status_detail: 'Phase 2. Part of 8.2 GW Central QLD total.',
    description: 'In the Isaac region of Central QLD, part of the 8.2 GW Central QLD renewable energy corridor.',
    sources: [
      { title: 'Powerlink — Queensland REZs', url: 'https://www.powerlink.com.au/rez', source_tier: 1 },
    ],
  },
]

// ============================================================
// SA REZs — AEMO ISP / ElectraNet
// ============================================================

const SA_REZS: REZZone[] = [
  {
    id: 'sa-mid-north',
    name: 'Mid-North SA',
    state: 'SA',
    target_capacity_gw: null,
    status: 'candidate',
    status_detail: 'Most advanced SA REZ. AER approved $45.7M for Stage 1a early works. Stage 1b application submitted Jan 2026. In-service July 2029.',
    transmission_project: 'Northern Transmission Project (ElectraNet)',
    transmission_status: 'approved',
    description: 'SA\'s most advanced REZ, between Port Augusta and Adelaide. New 275 kV and 132 kV transmission lines. AER regulatory approval for early works secured.',
    sources: [
      { title: 'AER — ElectraNet Mid-North SA REZ Expansion', url: 'https://www.aer.gov.au/industry/networks/contingent-projects/electranet-mid-north-south-australia-rez-expansion-stage-1a-early-works-contingent-project', source_tier: 1 },
    ],
  },
  {
    id: 'sa-south-east',
    name: 'South East SA',
    state: 'SA',
    target_capacity_gw: null,
    status: 'candidate',
    status_detail: 'AEMO ISP candidate REZ. Supported by Project EnergyConnect.',
    transmission_project: 'Project EnergyConnect',
    transmission_status: 'construction',
    description: 'Near the Victorian border, supported by Project EnergyConnect (partially commissioned 2025). Solar and wind potential.',
    sources: [
      { title: 'AEMO — 2024 ISP Appendix 3: REZs', url: 'https://www.aemo.com.au/-/media/files/major-publications/isp/2024/appendices/a3-renewable-energy-zones.pdf', source_tier: 1 },
    ],
  },
  {
    id: 'sa-eastern-eyre',
    name: 'Eastern Eyre Peninsula',
    state: 'SA',
    target_capacity_gw: null,
    status: 'candidate',
    status_detail: 'AEMO ISP candidate REZ.',
    transmission_project: 'Eyre Peninsula Link (275 km, 132 kV)',
    transmission_status: 'planning',
    description: 'Wind and solar resources on the eastern Eyre Peninsula. Requires the proposed Eyre Peninsula Link transmission line.',
    sources: [
      { title: 'AEMO — 2024 ISP Appendix 3: REZs', url: 'https://www.aemo.com.au/-/media/files/major-publications/isp/2024/appendices/a3-renewable-energy-zones.pdf', source_tier: 1 },
    ],
  },
]

// ============================================================
// TAS REZs — TasNetworks / Marinus Link
// ============================================================

const TAS_REZS: REZZone[] = [
  {
    id: 'tas-north-west',
    name: 'North West Tasmania',
    state: 'TAS',
    target_capacity_gw: 1.0,
    status: 'planning',
    status_detail: 'Tasmania\'s first REZ. Active planning. Directly linked to Marinus Link (FID Aug 2025, operational target 2030).',
    transmission_project: 'NW Transmission Development + Marinus Link (1.5 GW)',
    transmission_status: 'approved',
    description: 'Wind-dominant REZ in north-west Tasmania, aligned with the Marinus Link landing point. 1 GW initial capacity, up to 9.5 GW if fully developed. Marinus Link FID confirmed Aug 2025.',
    sources: [
      { title: 'Tasmanian REZs', url: 'https://www.renewableenergyzones.tas.gov.au/', source_tier: 1 },
      { title: 'Marinus Link', url: 'https://www.marinuslink.com.au/about-marinus-link/', source_tier: 1 },
    ],
  },
]

// ============================================================
// COMBINED EXPORT
// ============================================================

export const REZ_ZONES: REZZone[] = [
  ...NSW_REZS,
  ...VIC_REZS,
  ...QLD_REZS,
  ...SA_REZS,
  ...TAS_REZS,
]

export const REZ_BY_STATE: Record<string, REZZone[]> = {
  NSW: NSW_REZS,
  VIC: VIC_REZS,
  QLD: QLD_REZS,
  SA: SA_REZS,
  TAS: TAS_REZS,
}
