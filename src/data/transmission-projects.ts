/**
 * Major NEM Transmission Infrastructure Projects
 *
 * Static data for Australia's key transmission upgrades identified in
 * the AEMO Integrated System Plan (ISP). Route waypoints are approximate
 * and intended for illustrative mapping only.
 *
 * Sources: Transgrid, AusNet, AEMO ISP 2024, TasNetworks, ElectraNet, Powerlink
 */

export type TransmissionStatus = 'operating' | 'construction' | 'approved' | 'planning'

export interface Substation {
  name: string
  lat: number
  lng: number
  type: 'new' | 'existing' | 'upgraded'
}

export interface TransmissionProject {
  id: string
  name: string
  description: string
  status: TransmissionStatus
  voltage_kv: string
  capacity_mw: number
  cost_billion: number
  expected_completion: string
  owner: string
  route: [number, number][]
  substations: Substation[]
  color: string
  source_url: string
}

// ============================================================
// Colours by status
// ============================================================

export const TRANSMISSION_STATUS_COLOURS: Record<TransmissionStatus, string> = {
  operating: '#10b981',
  construction: '#f59e0b',
  approved: '#3b82f6',
  planning: '#8b5cf6',
}

export const TRANSMISSION_STATUS_LABELS: Record<TransmissionStatus, string> = {
  operating: 'Operating',
  construction: 'Construction',
  approved: 'Approved',
  planning: 'Planning',
}

// ============================================================
// Project Data
// ============================================================

export const TRANSMISSION_PROJECTS: TransmissionProject[] = [
  {
    id: 'energyconnect',
    name: 'EnergyConnect',
    description: 'Major interconnector linking South Australia and New South Wales via Buronga. SA section commissioned Nov 2024. NSW section under construction, full completion expected Q4 2026. Includes Red Cliffs spur to Victoria.',
    status: 'construction',
    voltage_kv: '330 kV / 220 kV',
    capacity_mw: 800,
    cost_billion: 3.6,
    expected_completion: 'Q4 2026',
    owner: 'Transgrid / ElectraNet',
    route: [
      [-33.96, 139.13], // Robertstown SA
      [-33.70, 140.50], // mid SA
      [-34.15, 142.18], // Buronga NSW
      [-34.80, 145.90], // Balranald region
      [-35.20, 147.39], // Wagga Wagga
    ],
    substations: [
      { name: 'Robertstown', lat: -33.96, lng: 139.13, type: 'existing' },
      { name: 'Buronga', lat: -34.15, lng: 142.18, type: 'new' },
      { name: 'Red Cliffs', lat: -34.29, lng: 142.24, type: 'upgraded' },
      { name: 'Dinawan', lat: -34.80, lng: 145.90, type: 'new' },
      { name: 'Wagga Wagga', lat: -35.20, lng: 147.39, type: 'existing' },
    ],
    color: '#f59e0b',
    source_url: 'https://www.transgrid.com.au/projects-innovation/energyconnect',
  },
  {
    id: 'humelink',
    name: 'HumeLink',
    description: 'Critical 500 kV backbone connecting Snowy 2.0 to Sydney load centres via new transmission from Gugaa to Bannaby. Construction commenced. One of Australia\'s largest ever transmission projects.',
    status: 'construction',
    voltage_kv: '500 kV',
    capacity_mw: 2200,
    cost_billion: 5.0,
    expected_completion: 'Mid-2026',
    owner: 'Transgrid',
    route: [
      [-35.21, 147.41], // Gugaa (near Wagga)
      [-35.50, 148.00], // Maragle
      [-35.65, 148.15], // Tumut region
      [-35.20, 148.80], // near Yass
      [-34.44, 150.05], // Bannaby
    ],
    substations: [
      { name: 'Gugaa', lat: -35.21, lng: 147.41, type: 'new' },
      { name: 'Maragle', lat: -35.50, lng: 148.00, type: 'new' },
      { name: 'Bannaby', lat: -34.44, lng: 150.05, type: 'existing' },
    ],
    color: '#f59e0b',
    source_url: 'https://www.transgrid.com.au/projects-innovation/humelink',
  },
  {
    id: 'vni-west',
    name: 'VNI West',
    description: 'New Victoria-NSW interconnector via western corridor. Links Western Victoria REZ to NSW. Planning stage with route finalised. Critical enabler for Western Victoria REZ.',
    status: 'planning',
    voltage_kv: '500 kV',
    capacity_mw: 1900,
    cost_billion: 3.5,
    expected_completion: '2030',
    owner: 'AusNet / Transgrid',
    route: [
      [-37.03, 143.08], // Bulgana VIC
      [-36.40, 143.50], // Kerang region
      [-35.73, 143.92], // Murray River crossing
      [-34.80, 145.90], // Dinawan NSW
    ],
    substations: [
      { name: 'Bulgana', lat: -37.03, lng: 143.08, type: 'existing' },
      { name: 'Kerang', lat: -35.73, lng: 143.92, type: 'new' },
      { name: 'Dinawan', lat: -34.80, lng: 145.90, type: 'new' },
    ],
    color: '#8b5cf6',
    source_url: 'https://www.aemo.com.au/energy-systems/major-publications/integrated-system-plan-isp',
  },
  {
    id: 'cwo-rez',
    name: 'CWO REZ Transmission',
    description: 'Australia\'s first REZ transmission infrastructure. New 500 kV and 330 kV lines connecting Central-West Orana REZ to the existing grid. Designed to unlock 4.5 GW of wind and solar generation.',
    status: 'construction',
    voltage_kv: '500 kV / 330 kV',
    capacity_mw: 4500,
    cost_billion: 3.5,
    expected_completion: '2028',
    owner: 'ACEREZ (ACCIONA / COBRA / Endeavour Energy)',
    route: [
      [-32.35, 149.95], // Wollar
      [-32.15, 149.50], // Merotherie
      [-32.00, 149.30], // mid CWO
      [-32.10, 148.90], // Elong Elong
    ],
    substations: [
      { name: 'Wollar', lat: -32.35, lng: 149.95, type: 'existing' },
      { name: 'Merotherie', lat: -32.15, lng: 149.50, type: 'new' },
      { name: 'Elong Elong', lat: -32.10, lng: 148.90, type: 'new' },
    ],
    color: '#f59e0b',
    source_url: 'https://www.energyco.nsw.gov.au/our-projects/central-west-orana-renewable-energy-zone',
  },
  {
    id: 'marinus-link',
    name: 'Marinus Link',
    description: 'Undersea HVDC cable connecting Tasmania to Victoria. FID confirmed August 2025. Will unlock Tasmania\'s wind and hydro resources for the mainland NEM. Two 750 MW cables planned.',
    status: 'approved',
    voltage_kv: 'HVDC (\u00b1320 kV)',
    capacity_mw: 750,
    cost_billion: 3.9,
    expected_completion: '2030',
    owner: 'Marinus Link Pty Ltd (TasNetworks)',
    route: [
      [-41.05, 145.95], // Heybridge TAS
      [-40.50, 145.96], // Bass Strait North
      [-39.50, 145.96], // Bass Strait Mid
      [-38.83, 145.96], // VIC coast
      [-38.27, 146.39], // Hazelwood VIC
    ],
    substations: [
      { name: 'Heybridge', lat: -41.05, lng: 145.95, type: 'new' },
      { name: 'Hazelwood', lat: -38.27, lng: 146.39, type: 'existing' },
    ],
    color: '#3b82f6',
    source_url: 'https://www.marinuslink.com.au/',
  },
  {
    id: 'qni-connect',
    name: 'QNI Connect',
    description: 'Proposed upgrade to the Queensland-NSW Interconnector capacity. Strengthens the flow path from New England REZ through to southern Queensland. Subject to RIT-T assessment.',
    status: 'planning',
    voltage_kv: '330 kV',
    capacity_mw: 1260,
    cost_billion: 1.7,
    expected_completion: 'TBD',
    owner: 'Transgrid / Powerlink',
    route: [
      [-30.30, 151.60], // New England NSW
      [-29.50, 151.65], // mid corridor
      [-28.95, 151.65], // Bulli Creek area
      [-27.92, 150.84], // mid QLD
      [-27.11, 150.90], // Braemar QLD
    ],
    substations: [
      { name: 'Armidale', lat: -30.30, lng: 151.60, type: 'existing' },
      { name: 'Bulli Creek', lat: -28.95, lng: 151.65, type: 'upgraded' },
      { name: 'Braemar', lat: -27.11, lng: 150.90, type: 'existing' },
    ],
    color: '#8b5cf6',
    source_url: 'https://www.transgrid.com.au/projects-innovation',
  },
]

// Total investment across all projects
export const TOTAL_TRANSMISSION_INVESTMENT = TRANSMISSION_PROJECTS.reduce(
  (sum, p) => sum + p.cost_billion, 0
)

// Total new capacity
export const TOTAL_TRANSMISSION_CAPACITY_MW = TRANSMISSION_PROJECTS.reduce(
  (sum, p) => sum + p.capacity_mw, 0
)
