/**
 * CIS and LTESA Round Data
 *
 * Sourced from DCCEEW, AEMO Services (ASL), RenewEconomy, PV Magazine,
 * Energy Storage News, WattClarity, and Modo Energy.
 */
import type { CISRound, LTESARound } from '../lib/types'

// ============================================================
// CIS ROUNDS
// ============================================================

export const CIS_ROUNDS: CISRound[] = [
  {
    id: 'cis-pilot-nsw',
    name: 'CIS Pilot — NSW',
    type: 'dispatchable',
    market: 'NEM',
    announced_date: '2023-11-23',
    total_capacity_mw: 1075,
    total_storage_mwh: 0,
    num_projects: 6,
    project_ids: [],
    description: 'First CIS tender, co-delivered between the federal and NSW governments under the NSW Electricity Infrastructure Roadmap (LTESA Round 2). Six battery and virtual power plant projects delivering 1+ GW of dispatchable capacity. Note: DCCEEW Senate Estimates testimony (Dec 2025) excluded these 6 projects from the CIS project count of 63, likely because they were structured under the NSW LTESA firming framework rather than the standard CISA mechanism.',
    key_changes: 'First-ever CIS round. Dispatchable only. NSW state partnership.',
    sources: [
      { title: 'Big boost to reliable renewables in NSW', url: 'https://www.nsw.gov.au/media-releases/big-boost-to-reliable-renewables-nsw', date: '2023-11-23', source_tier: 1 },
      { title: 'DCCEEW — Stage 1 CIS', url: 'https://www.dcceew.gov.au/energy/renewable/capacity-investment-scheme/stage-1-capacity-investment-scheme', source_tier: 1 },
    ],
  },
  {
    id: 'cis-pilot-sa-vic',
    name: 'CIS Pilot — SA/VIC',
    type: 'dispatchable',
    market: 'NEM',
    announced_date: '2024-09-04',
    total_capacity_mw: 995,
    total_storage_mwh: 3626,
    num_projects: 6,
    project_ids: [],
    description: 'Second CIS pilot, covering South Australia and Victoria. Six battery projects delivering 995 MW / 3,626 MWh of dispatchable capacity, enough to supply peak demand for a million homes.',
    key_changes: 'Expanded to SA and VIC. Dispatchable/storage focus. Required min 2hr duration.',
    sources: [
      { title: 'CIS supports 6 new projects in Vic and SA', url: 'https://www.dcceew.gov.au/about/news/capacity-investment-scheme-supports-6-new-projects-vic-sa', date: '2024-09-04', source_tier: 1 },
    ],
  },
  {
    id: 'cis-tender-1-nem-gen',
    name: 'CIS Tender 1 — NEM Generation',
    type: 'generation',
    market: 'NEM',
    announced_date: '2024-12-11',
    total_capacity_mw: 6380,
    total_storage_mwh: 3500,
    num_projects: 19,
    project_ids: [],
    description: 'Australia\'s largest ever renewable energy tender. 19 projects selected from 84 bids (4.5× oversubscribed), delivering 6.38 GW across NSW, VIC, QLD, and SA. Included 2.8 GW solar, 3.6 GW wind, and 3.5 GWh battery storage via 8 hybrid projects.',
    key_changes: 'First formal national competitive tender (not a pilot). CfD mechanism. None of the Big 3 gen-tailers won.',
    sources: [
      { title: 'DCCEEW — Closed CIS Tenders', url: 'https://www.dcceew.gov.au/energy/renewable/capacity-investment-scheme/closed-cis-tenders', source_tier: 1 },
      { title: 'CIS Tender 1 delivers 2.75 GW solar (PV Magazine)', url: 'https://www.pv-magazine-australia.com/2024/12/11/cis-generation-tender-1-will-deliver-2-75-gw-of-solar-generation-to-the-nem/', date: '2024-12-11', source_tier: 2 },
      { title: 'Standalone solar and wind dominate (WattClarity)', url: 'https://wattclarity.com.au/articles/2024/12/standalone-solar-and-wind-dominate-list-of-19-successful-projects-from-latest-cis-tender/', date: '2024-12-11', source_tier: 2 },
    ],
  },
  {
    id: 'cis-tender-2-wem-disp',
    name: 'CIS Tender 2 — WEM Dispatchable',
    type: 'dispatchable',
    market: 'WEM',
    announced_date: '2025-03-20',
    total_capacity_mw: 654,
    total_storage_mwh: 2595,
    num_projects: 4,
    project_ids: [],
    description: 'First CIS tender for Western Australia\'s WEM. Four battery projects totalling 654 MW / 2,595 MWh, enough to power 600,000 households during peak summer demand. Attracted bids for 7× more capacity than tendered.',
    key_changes: 'First WEM-specific round. Required SWIS connection. Min 2hr duration, min 30 MW.',
    sources: [
      { title: 'WA CIS tender awards four battery projects (PV Magazine)', url: 'https://www.pv-magazine-australia.com/2025/03/20/western-australia-cis-tender-awards-four-battery-projects-totalling-654-mw/', date: '2025-03-20', source_tier: 2 },
      { title: '2.6 GWh of BESS successful in WA CIS tender (Energy Storage News)', url: 'https://www.energy-storage.news/2-6gwh-of-bess-successful-in-western-australias-first-cis-tender/', date: '2025-03-20', source_tier: 2 },
    ],
  },
  {
    id: 'cis-tender-3-nem-disp',
    name: 'CIS Tender 3 — NEM Dispatchable',
    type: 'dispatchable',
    market: 'NEM',
    announced_date: '2025-09-17',
    total_capacity_mw: 4130,
    total_storage_mwh: 15370,
    num_projects: 16,
    project_ids: [],
    description: 'Australia\'s biggest battery storage tender. 16 lithium-ion battery projects totalling 4.13 GW / 15.37 GWh across NSW, VIC, QLD and SA. Drew 124 bids for ~34 GW (8× oversubscribed). Average duration 3.72 hours. Estimated $3.8B in local content.',
    key_changes: 'Largest battery auction ever. All 16 winners were li-ion BESS. 8× oversubscribed.',
    sources: [
      { title: 'CIS Tender 3 — 16 battery projects (PV Magazine)', url: 'https://www.pv-magazine-australia.com/2025/09/17/cis-tender-supports-16-big-battery-projects-totalling-more-than-15-gwh/', date: '2025-09-17', source_tier: 2 },
      { title: '15.37 GWh of storage (Energy Storage News)', url: 'https://www.energy-storage.news/over-15gwh-of-energy-storage-successful-in-australias-capacity-investment-scheme-tender-3/', date: '2025-09-17', source_tier: 2 },
      { title: 'Bowen names 16 winners (RenewEconomy)', url: 'https://reneweconomy.com.au/bowen-names-16-winners-of-australias-biggest-battery-storage-tender/', date: '2025-09-17', source_tier: 2 },
    ],
  },
  {
    id: 'cis-tender-4-nem-gen',
    name: 'CIS Tender 4 — NEM Generation',
    type: 'generation',
    market: 'NEM',
    announced_date: '2025-10-09',
    total_capacity_mw: 6640,
    total_storage_mwh: 11444,
    num_projects: 20,
    project_ids: [],
    description: '20 projects delivering 6.6 GW of renewable generation plus 11.4 GWh of co-located storage. 56% solar, 44% wind. 12 of 20 are hybrid projects with BESS. Drew 84 bids for 25.6 GW (4× oversubscribed). Includes Tasmania\'s first CIS project. $17B in local investment.',
    key_changes: 'Hybrid solar+BESS projects dominant (12 of 20). First Tasmanian project. $1B Australian steel commitment.',
    sources: [
      { title: 'CIS Tender 4 to deliver 6.6GW (DCCEEW)', url: 'https://www.dcceew.gov.au/about/news/cis-tender-4-deliver-6-6gw-clean-energy', date: '2025-10-09', source_tier: 1 },
      { title: '11.4 GWh of solar-plus-storage (Energy Storage News)', url: 'https://www.energy-storage.news/australias-capacity-investment-scheme-tender-4-sees-11-4gwh-of-solar-plus-storage-awarded/', date: '2025-10-09', source_tier: 2 },
    ],
  },
  {
    id: 'cis-tender-5-6-wem',
    name: 'CIS Tenders 5 & 6 — WEM',
    type: 'generation',
    market: 'WEM',
    announced_date: '',
    total_capacity_mw: 0,
    total_storage_mwh: 0,
    num_projects: 0,
    project_ids: [],
    description: 'WEM generation and dispatchable tenders targeting 1.6 GW generation and 2.4 GWh storage in Western Australia. Results expected March-April 2026.',
    key_changes: 'Combined generation + storage tenders for WA.',
    sources: [
      { title: 'CIS Tenders 5 & 6 in WEM now open (DCCEEW)', url: 'https://www.dcceew.gov.au/about/news/cis-tenders-5-and-6-in-wem-now-open', source_tier: 1 },
    ],
  },
  {
    id: 'cis-tender-7-nem-gen',
    name: 'CIS Tender 7 — NEM Generation',
    type: 'generation',
    market: 'NEM',
    announced_date: '',
    total_capacity_mw: 0,
    total_storage_mwh: 0,
    num_projects: 0,
    project_ids: [],
    description: 'Seeking 5 GW of NEM generation capacity. Registrations opened October 2025. Results expected May 2026.',
    sources: [
      { title: 'Australia opens CIS Tender 7 (PV Tech)', url: 'https://www.pv-tech.org/australia-opens-capacity-investment-scheme-tender-7-seeking-5gw-of-renewables/', source_tier: 2 },
    ],
  },
  {
    id: 'cis-tender-8-nem-disp',
    name: 'CIS Tender 8 — NEM Dispatchable',
    type: 'dispatchable',
    market: 'NEM',
    announced_date: '',
    total_capacity_mw: 0,
    total_storage_mwh: 0,
    num_projects: 0,
    project_ids: [],
    description: 'Seeking ~16 GWh of NEM dispatchable capacity. Will allow aggregated small batteries for the first time. Results expected mid-2026.',
    sources: [
      { title: 'Australia to launch CIS Tender 8 (Energy Storage News)', url: 'https://www.energy-storage.news/australia-to-launch-capacity-investment-scheme-tender-8-seeking-16gwh-energy-storage-in-the-nem/', source_tier: 2 },
    ],
  },
]

// ============================================================
// CIS PROJECT DATA (per-round)
// ============================================================

export interface SchemeProject {
  name: string
  developer: string
  technology: 'wind' | 'solar' | 'bess' | 'hybrid' | 'pumped_hydro' | 'vpp'
  capacity_mw: number
  storage_mwh?: number
  state: string
  location?: string
  project_id?: string // Link to master project record
}

export const CIS_PROJECTS: Record<string, SchemeProject[]> = {
  'cis-tender-1-nem-gen': [
    // NSW (7 projects, ~3.7 GW)
    { name: 'Valley of the Winds', developer: 'ACEN Australia', technology: 'wind', capacity_mw: 936, state: 'NSW', project_id: 'valley-of-the-winds' },
    { name: 'Sandy Creek Solar Farm', developer: 'Lightsource bp', technology: 'solar', capacity_mw: 700, state: 'NSW', project_id: 'sandy-creek-solar-farm' },
    { name: 'Spicers Creek Wind Farm', developer: 'Squadron Energy', technology: 'wind', capacity_mw: 700, state: 'NSW', project_id: 'spicers-creek-wind-farm' },
    { name: 'Junction Rivers', developer: 'Windlab', technology: 'hybrid', capacity_mw: 585, storage_mwh: 800, state: 'NSW', project_id: 'junction-rivers-wind-and-bess' },
    { name: 'Goulburn River Solar Farm', developer: 'Lightsource bp', technology: 'solar', capacity_mw: 450, state: 'NSW', project_id: 'goulburn-river-solar-farm-and-bess' },
    { name: 'Thunderbolt Wind Farm', developer: 'Neoen', technology: 'wind', capacity_mw: 230, state: 'NSW', project_id: 'thunderbolt-wind-farm' },
    { name: 'Glanmire Solar Farm', developer: 'Elgin Energy', technology: 'hybrid', capacity_mw: 60, storage_mwh: 104, state: 'NSW', project_id: 'glanmire-solar-farm' },
    // VIC (6 projects, ~1.6 GW)
    { name: 'Kentbruck Wind Farm', developer: 'Neoen', technology: 'wind', capacity_mw: 600, state: 'VIC', project_id: 'kentbruck-green-power-hub' },
    { name: 'West Mokoan Solar Farm', developer: 'Lightsource bp', technology: 'hybrid', capacity_mw: 300, storage_mwh: 560, state: 'VIC', project_id: 'west-mokoan-solar-farm-and-bess' },
    { name: 'Barwon Solar Farm', developer: 'Elgin Energy', technology: 'hybrid', capacity_mw: 250, storage_mwh: 500, state: 'VIC', project_id: 'barwon-solar-farm-and-bess' },
    { name: 'Campbells Forest Solar Farm', developer: 'Risen Energy', technology: 'solar', capacity_mw: 205, state: 'VIC', project_id: 'campbells-forest-solar-farm' },
    { name: 'Elaine Solar Farm', developer: 'Elgin Energy', technology: 'hybrid', capacity_mw: 125, storage_mwh: 250, state: 'VIC', project_id: 'elaine-solar-farm-and-bess' },
    { name: 'Barnawartha Solar Farm', developer: 'Gentari', technology: 'hybrid', capacity_mw: 64, storage_mwh: 139, state: 'VIC', project_id: 'barnawartha-solar-and-energy-storage' },
    // SA (2 projects)
    { name: 'Goyder North Wind Farm', developer: 'Neoen', technology: 'wind', capacity_mw: 300, state: 'SA', project_id: 'goyder-north-wind-farm' },
    { name: 'Palmer Wind Farm', developer: 'Tilt Renewables', technology: 'wind', capacity_mw: 274, state: 'SA', project_id: 'palmer-wind-farm' },
    // QLD (3 projects)
    { name: 'Hopeland Solar Farm', developer: 'ACS', technology: 'solar', capacity_mw: 250, state: 'QLD', project_id: 'hopeland-solar-farm' },
    { name: 'Majors Creek Solar Power Station', developer: 'Edify Energy', technology: 'hybrid', capacity_mw: 150, storage_mwh: 600, state: 'QLD', project_id: 'majors-creek-solar-power-station' },
    { name: 'Ganymirra Solar Power Station', developer: 'Edify Energy', technology: 'hybrid', capacity_mw: 150, storage_mwh: 600, state: 'QLD', project_id: 'ganymirra-solar-power-station' },
    // VIC — 19th project
    { name: 'Mokoan Solar Farm', developer: 'European Energy Australia', technology: 'solar', capacity_mw: 46, state: 'VIC', project_id: 'mokoan-solar-farm' },
  ],
  'cis-pilot-nsw': [
    { name: 'Orana REZ Battery', developer: 'Akaysha Energy', technology: 'bess', capacity_mw: 460, storage_mwh: 920, state: 'NSW', location: 'Wellington', project_id: 'orana-bess' },
    { name: 'Liddell BESS', developer: 'AGL Energy', technology: 'bess', capacity_mw: 500, storage_mwh: 1000, state: 'NSW', location: 'Muswellbrook', project_id: 'liddell-bess' },
    { name: 'Smithfield Sydney Battery', developer: 'Iberdrola Australia', technology: 'bess', capacity_mw: 235, storage_mwh: 470, state: 'NSW', location: 'Smithfield', project_id: 'smithfield-bess' },
    { name: 'Enel X VPP 1', developer: 'Enel X Australia', technology: 'vpp', capacity_mw: 43, state: 'NSW' },
    { name: 'Enel X VPP 2', developer: 'Enel X Australia', technology: 'vpp', capacity_mw: 43, state: 'NSW' },
    { name: 'Enel X VPP 3', developer: 'Enel X Australia', technology: 'vpp', capacity_mw: 44, state: 'NSW' },
  ],
  'cis-pilot-sa-vic': [
    { name: 'Wooreen Battery', developer: 'EnergyAustralia', technology: 'bess', capacity_mw: 350, storage_mwh: 1400, state: 'VIC', location: 'Hazelwood North', project_id: 'wooreen-energy-storage-system' },
    { name: 'Springfield BESS', developer: 'Neoen', technology: 'bess', capacity_mw: 200, storage_mwh: 400, state: 'VIC', location: 'Springfield' },
    { name: 'Mortlake BESS', developer: 'Origin Energy', technology: 'bess', capacity_mw: 135, storage_mwh: 270, state: 'VIC', location: 'Mortlake', project_id: 'mortlake-battery' },
    { name: 'Tailem Bend BESS', developer: 'Iberdrola', technology: 'bess', capacity_mw: 200, storage_mwh: 560, state: 'SA', location: 'Tailem Bend', project_id: 'tailem-bend-stage-3' },
    { name: 'Clements Gap Battery', developer: 'Pacific Blue', technology: 'bess', capacity_mw: 60, storage_mwh: 240, state: 'SA', location: 'Clements Gap', project_id: 'clements-gap-bess' },
    { name: 'Hallett Battery', developer: 'EnergyAustralia', technology: 'bess', capacity_mw: 50, storage_mwh: 756, state: 'SA', location: 'Canownie', project_id: 'hallett-bess' },
  ],
  'cis-tender-2-wem-disp': [
    { name: 'Boddington Giga Battery', developer: 'PGS Energy', technology: 'bess', capacity_mw: 324, storage_mwh: 1296, state: 'WA', location: 'Marradong' },
    { name: 'Merredin Big Battery', developer: 'Atmos Renewables', technology: 'bess', capacity_mw: 100, storage_mwh: 400, state: 'WA', location: 'Merredin' },
    { name: 'Muchea Big Battery', developer: 'Neoen', technology: 'bess', capacity_mw: 150, storage_mwh: 600, state: 'WA', location: 'Muchea' },
    { name: 'Waroona Renewable Energy Project Stage 1', developer: 'Frontier Energy', technology: 'bess', capacity_mw: 80, storage_mwh: 299, state: 'WA', location: 'Waroona' },
  ],
  'cis-tender-3-nem-disp': [
    { name: 'Bulabul 2 BESS', developer: 'AMPYR Australia', technology: 'bess', capacity_mw: 100, storage_mwh: 406, state: 'NSW', location: 'Wuuluman', project_id: 'bulabul-bess-2' },
    { name: 'Swallow Tail BESS', developer: 'AMPYR Australia', technology: 'bess', capacity_mw: 300, storage_mwh: 1218, state: 'NSW', location: 'Bannaby', project_id: 'swallow-tail-bess' },
    { name: 'Calala BESS', developer: 'Equis', technology: 'bess', capacity_mw: 150, storage_mwh: 300, state: 'NSW', location: 'Calala', project_id: 'calala-bess-a1' },
    { name: 'Goulburn River Standalone BESS', developer: 'Lightsource bp', technology: 'bess', capacity_mw: 450, storage_mwh: 1370, state: 'NSW', location: 'Merriwa', project_id: 'goulburn-river-bess' },
    { name: 'Mount Piper BESS Stage 1', developer: 'EnergyAustralia', technology: 'bess', capacity_mw: 250, storage_mwh: 1000, state: 'NSW', location: 'Blackmans Flat', project_id: 'mt-piper-bess' },
    { name: 'Deer Park BESS', developer: 'Akaysha Energy', technology: 'bess', capacity_mw: 275, storage_mwh: 1100, state: 'VIC', location: 'Ravenhall', project_id: 'deer-park-bess-akaysha' },
    { name: 'Joel Joel BESS', developer: 'ACEnergy', technology: 'bess', capacity_mw: 250, storage_mwh: 1000, state: 'VIC', location: 'Joel Joel', project_id: 'joel-joel-bess' },
    { name: 'Kiamal BESS', developer: 'TotalEnergies', technology: 'bess', capacity_mw: 220, storage_mwh: 810, state: 'VIC', location: 'Ouyen', project_id: 'kiamal-bess' },
    { name: 'Little River BESS', developer: 'ACEnergy', technology: 'bess', capacity_mw: 350, storage_mwh: 1400, state: 'VIC', location: 'Little River', project_id: 'little-river-bess' },
    { name: 'Mornington BESS', developer: 'Valent Energy', technology: 'bess', capacity_mw: 240, storage_mwh: 587, state: 'VIC', location: 'Tyabb', project_id: 'mornington-bess' },
    { name: 'Capricorn BESS', developer: 'Potentia Energy', technology: 'bess', capacity_mw: 300, storage_mwh: 1200, state: 'QLD', location: 'Bouldercombe', project_id: 'capricorn-bess' },
    { name: 'Lower Wonga BESS', developer: 'Equis', technology: 'bess', capacity_mw: 200, storage_mwh: 800, state: 'QLD', location: 'Lower Wonga', project_id: 'lower-wonga-bess' },
    { name: 'Teebar BESS', developer: 'Atmos Renewables', technology: 'bess', capacity_mw: 400, storage_mwh: 1600, state: 'QLD', location: 'Gigoomgan', project_id: 'teebar-creek-battery-storage-kci' },
    { name: 'Ulinda Park Expansion', developer: 'Akaysha Energy', technology: 'bess', capacity_mw: 195, storage_mwh: 780, state: 'QLD', location: 'Hopeland', project_id: 'ulinda-park-bess-expansion' },
    { name: 'Koolunga BESS', developer: 'Equis', technology: 'bess', capacity_mw: 200, storage_mwh: 800, state: 'SA', location: 'Koolunga', project_id: 'koolunga-battery-energy-storage-system' },
    { name: 'Reeves Plains BESS', developer: 'Alinta Energy', technology: 'bess', capacity_mw: 250, storage_mwh: 1000, state: 'SA', location: 'Reeves Plains', project_id: 'reeves-plains-power-station-bess' },
  ],
  'cis-tender-4-nem-gen': [
    { name: 'Bell Bay Wind Farm', developer: 'Equis', technology: 'wind', capacity_mw: 224, state: 'TAS', project_id: undefined },
    { name: 'Bendemeer Energy Hub', developer: 'Athena Energy Australia', technology: 'hybrid', capacity_mw: 252, storage_mwh: 300, state: 'NSW', project_id: 'bendemeer-renewable-energy-hub-solar-and-bess' },
    { name: 'Bundey BESS and Solar', developer: 'Genaspi Energy Group', technology: 'hybrid', capacity_mw: 240, storage_mwh: 1200, state: 'SA', project_id: 'bundey-bess-and-solar-project' },
    { name: 'Carmody\'s Hill Wind Farm', developer: 'Aula Energy', technology: 'wind', capacity_mw: 247, state: 'SA', project_id: 'carmodys-hill-wind-farm' },
    { name: 'Corop Solar Farm and BESS', developer: 'BNRG Leeson', technology: 'hybrid', capacity_mw: 230, storage_mwh: 704, state: 'VIC', project_id: 'corop-solar-farm' },
    { name: 'Derby Solar Project', developer: 'Sungrow', technology: 'hybrid', capacity_mw: 95, storage_mwh: 210, state: 'VIC', project_id: 'derby-solar-farm-and-bess' },
    { name: 'Dinawan Wind Farm Stage 1', developer: 'Spark Renewables', technology: 'wind', capacity_mw: 357, state: 'NSW', project_id: 'dinawan-energy-hub' },
    { name: 'Gawara Baya', developer: 'Windlab', technology: 'hybrid', capacity_mw: 399, storage_mwh: 217, state: 'QLD', project_id: 'gawara-baya-wind-and-bess' },
    { name: 'Guthrie\'s Gap Solar Power Station', developer: 'Edify Energy', technology: 'hybrid', capacity_mw: 300, storage_mwh: 1200, state: 'QLD', project_id: 'guthries-gap-solar-power-station' },
    { name: 'Hexham Wind Farm', developer: 'AGL', technology: 'wind', capacity_mw: 600, state: 'VIC', project_id: 'hexham' },
    { name: 'Liverpool Range Wind Stage 1', developer: 'Tilt Renewables', technology: 'wind', capacity_mw: 634, state: 'NSW', project_id: 'liverpool-range-wind-farm' },
    { name: 'Lower Wonga Solar Farm', developer: 'Lightsource bp', technology: 'solar', capacity_mw: 281, state: 'QLD', project_id: 'lower-wonga-solar-farm-and-bess' },
    { name: 'Merino Solar Farm', developer: 'EDPR', technology: 'hybrid', capacity_mw: 450, storage_mwh: 1800, state: 'NSW', project_id: 'merino-solar-farm' },
    { name: 'Middlebrook Solar Farm', developer: 'TotalEnergies', technology: 'hybrid', capacity_mw: 363, storage_mwh: 813, state: 'NSW', project_id: 'middlebrook-solar-and-bess' },
    { name: 'Moah Creek Wind Farm', developer: 'Central Queensland Power', technology: 'wind', capacity_mw: 360, state: 'QLD', project_id: 'moah-creek-wind-farm' },
    { name: 'Nowingi Solar Power Station', developer: 'Edify Energy', technology: 'hybrid', capacity_mw: 300, storage_mwh: 1200, state: 'VIC', project_id: 'nowingi-solar-farm-edify-kci' },
    { name: 'Punchs Creek Solar Farm', developer: 'EDPR', technology: 'hybrid', capacity_mw: 400, storage_mwh: 1600, state: 'QLD' },
    { name: 'Smoky Creek Solar Power Station', developer: 'Edify Energy', technology: 'hybrid', capacity_mw: 300, storage_mwh: 1200, state: 'QLD', project_id: 'smoky-creek-solar-power-station' },
    { name: 'Tallawang Solar Hybrid', developer: 'Potentia Energy', technology: 'hybrid', capacity_mw: 500, storage_mwh: 1000, state: 'NSW', project_id: 'tallawang-solar-and-bess' },
    { name: 'Willogoleche 2 Wind Farm', developer: 'ENGIE / Foresight', technology: 'wind', capacity_mw: 108, state: 'SA', project_id: 'willogoleche-2-wind-farm' },
  ],
}

// ============================================================
// LTESA ROUNDS
// ============================================================

export const LTESA_ROUNDS: LTESARound[] = [
  {
    id: 'ltesa-round-1',
    name: 'LTESA Round 1 — Generation + LDS',
    type: 'mixed',
    announced_date: '2023-05-03',
    total_capacity_mw: 1445,
    total_storage_mwh: 400,
    num_projects: 4,
    project_ids: [],
    description: 'First LTESA round under the NSW Electricity Infrastructure Roadmap. Four projects worth $2.5B delivering 1.4 GW of generation plus Australia\'s first long-duration chemical battery. Strike prices ~40% below LCOE — amongst the lowest in any Australian tender.',
    sources: [
      { title: 'ASL — Tender Round 1', url: 'https://asl.org.au/en/tenders/tender-round-1', source_tier: 1 },
      { title: 'First round puts NSW one-third to 12GW goal', url: 'https://www.nsw.gov.au/media-releases/first-round-of-renewable-energy-projects-puts-nsw-one-third-of-way-to-12-gigawatt-renewable-energy-goal', date: '2023-05-01', source_tier: 1 },
    ],
  },
  {
    id: 'ltesa-round-2',
    name: 'LTESA Round 2 — Firming',
    type: 'firming',
    announced_date: '2023-11-22',
    total_capacity_mw: 1075,
    total_storage_mwh: 2790,
    num_projects: 4,
    project_ids: [],
    description: 'Firming-focused tender delivering 1,075 MW of dispatchable capacity including three BESS projects and one virtual power plant portfolio. Capacity to supply 8% of NSW summer peak demand. $1.8B total investment supporting ~400 jobs. All projects operational by December 2025.',
    sources: [
      { title: 'NSW tender for firming capacity exceeds expectations (ASL)', url: 'https://aemoservices.com.au/en/news/media-release/231122-nsw-tender-for-firming-capacity-exceeds-expectations', date: '2023-11-22', source_tier: 1 },
      { title: '2,800 MWh battery projects win NSW firming tender (Energy Storage News)', url: 'https://www.energy-storage.news/2800mwh-of-battery-storage-projects-win-new-south-wales-firming-infrastructure-tender/', date: '2023-11-22', source_tier: 2 },
    ],
  },
  {
    id: 'ltesa-round-3',
    name: 'LTESA Round 3 — Generation + LDS',
    type: 'mixed',
    announced_date: '2023-12-19',
    total_capacity_mw: 1274,
    total_storage_mwh: 4192,
    num_projects: 5,
    project_ids: [],
    description: 'Five energy infrastructure projects selected: 750 MW renewable generation and 524 MW / 4,192 MWh long-duration storage. Included one solar, one wind, two li-ion BESS, and one advanced compressed air energy storage (A-CAES) project. Over $4.2B total investment.',
    sources: [
      { title: 'ASL — Tender Round 3', url: 'https://aemoservices.com.au/en/tenders/tender-round-3-generation-and-long-duration-storage', source_tier: 1 },
    ],
  },
  {
    id: 'ltesa-round-4',
    name: 'LTESA Round 4 — Generation',
    type: 'generation',
    announced_date: '2024-07-01',
    total_capacity_mw: 317,
    total_storage_mwh: 372,
    num_projects: 2,
    project_ids: [],
    description: 'Two projects covering 33% of the 1,150 MW target — only bids demonstrating sufficient merit for NSW customers were awarded. Includes one solar+BESS hybrid and one wind farm. Operational before 2028. 630+ jobs over lifetime.',
    sources: [
      { title: 'ASL — Tender Round 4 Generation', url: 'https://aemoservices.com.au/en/tenders/tender-round-4-generation-infrastructure', source_tier: 1 },
      { title: 'Maryvale solar and storage lands NSW tender support (PV Magazine)', url: 'https://www.pv-magazine-australia.com/2024/07/01/maryvale-solar-and-storage-project-lands-support-in-nsw-tender-round/', date: '2024-07-01', source_tier: 2 },
    ],
  },
  {
    id: 'ltesa-round-5',
    name: 'LTESA Round 5 — Long Duration Storage',
    type: 'lds',
    announced_date: '2025-02-27',
    total_capacity_mw: 1025,
    total_storage_mwh: 13790,
    num_projects: 3,
    project_ids: [],
    description: 'Largest long-duration storage tender to date. Two batteries and the first-ever pumped hydro LTESA (Phoenix, 800 MW / 12 GWh, 15h discharge). Combined 1.03 GW / 13.79 GWh — exceeding the 1 GW target. Contributes 40% toward the 2030 2 GW LDS minimum objective.',
    sources: [
      { title: 'ASL NSW Long Duration Storage tender awards more than 1GW and 13GWh', url: 'https://asl.org.au/news/media-release/250227-asl-nsw-long-duration-storage-tender-awards-more-than-1gw-and-13gwh', date: '2025-02-27', source_tier: 1 },
      { title: 'Two BESS, one pumped hydro project awarded in NSW (ESS News)', url: 'https://www.ess-news.com/2025/02/27/two-bess-one-pumped-hydro-project-awarded-in-nsw-long-duration-storage-tender/', date: '2025-02-27', source_tier: 2 },
    ],
  },
  {
    id: 'ltesa-round-6',
    name: 'LTESA Round 6 — Long Duration Storage',
    type: 'lds',
    announced_date: '2026-02-05',
    total_capacity_mw: 1171,
    total_storage_mwh: 11980,
    num_projects: 6,
    project_ids: [],
    description: 'Australia\'s largest long-duration energy storage tender. Six battery projects totalling 1.17 GW / 11.98 GWh. 117% of the 1 GW indicative target. Storage durations 8.7 to 11.5 hours. Average cap price ~$150k/MW/year — significant reduction from Round 5 (~$185k/MW/year).',
    sources: [
      { title: 'ASL — Tender Round 6 LDS LTESA', url: 'https://asl.org.au/tenders/tender-round-6-long-duration-storage-ltesa', source_tier: 1 },
      { title: 'NSW contracts six battery projects (Energy Storage News)', url: 'https://www.energy-storage.news/australias-biggest-ldes-tender-nsw-contracts-six-battery-storage-projects-totalling-1-17gw-12gwh/', date: '2026-02-05', source_tier: 2 },
    ],
  },
  {
    id: 'ltesa-round-7',
    name: 'LTESA Round 7 — Firming Supply & Demand Response',
    type: 'firming',
    announced_date: '2026-05-15',
    total_capacity_mw: 532,
    total_storage_mwh: 2000,
    num_projects: 2,
    project_ids: [],
    description: 'Second NSW Roadmap firming tender (the first since Tender 2 in late 2023). Two winners across a competitive field of roughly a dozen bids: AGL\'s 500 MW / 2,000 MWh Tomago Battery near Newcastle and Enel X\'s 32 MW Sydney/Newcastle business-customer Virtual Power Plant. Both projects contract to deliver firming services during LOR 2 and LOR 3 reliability events. Commissioning deadline end-November 2027. Average strike materially lower than Tender 2 — battery cost declines mean AGL doubled the storage at Tomago for roughly the same cost as the 500 MW / 1,000 MWh Liddell battery awarded in Tender 2.',
    sources: [
      { title: 'ASL — Tender Round 7 (Firming)', url: 'https://asl.org.au/tenders', source_tier: 1 },
      { title: 'Tomago battery and VPP win first firming tender (RenewEconomy)', url: 'https://reneweconomy.com.au/giant-tomago-battery-and-vpp-win-first-firming-tender-to-fill-gaps-in-supply/', date: '2026-05-15', source_tier: 2 },
      { title: 'Fluence and AGL — 500 MW / 2,000 MWh Tomago BESS', url: 'https://ir.fluenceenergy.com/news-releases/news-release-details/fluence-and-agl-sign-deal-deliver-500-mw-2000-mwh-tomago-battery', source_tier: 2 },
    ],
  },
]

export const LTESA_PROJECTS: Record<string, SchemeProject[]> = {
  'ltesa-round-1': [
    { name: 'New England Solar Farm', developer: 'ACEN Australia', technology: 'solar', capacity_mw: 720, state: 'NSW', location: 'New England REZ', project_id: 'new-england-solar-farm' },
    { name: 'Stubbo Solar Farm', developer: 'ACEN Australia', technology: 'solar', capacity_mw: 400, state: 'NSW', location: 'Central West Orana REZ', project_id: 'stubbo-solar-farm' },
    { name: 'Coppabella Wind Farm', developer: 'Goldwind Australia', technology: 'wind', capacity_mw: 275, state: 'NSW', location: 'Southern Tablelands', project_id: 'coppabella-wind-farm' },
    { name: 'Limondale BESS', developer: 'RWE Renewables Australia', technology: 'bess', capacity_mw: 50, storage_mwh: 400, state: 'NSW', location: 'South West REZ', project_id: 'limondale-bess' },
  ],
  'ltesa-round-2': [
    // Note: Liddell BESS (500 MW), Orana, Smithfield and VPPs are listed under cis-pilot-nsw — these were one combined round
    { name: 'Orana BESS', developer: 'Akaysha Energy', technology: 'bess', capacity_mw: 415, storage_mwh: 1660, state: 'NSW', location: 'Central West Orana REZ', project_id: 'orana-bess' },
    { name: 'Enel X VPP Portfolio', developer: 'Enel X Australia', technology: 'vpp', capacity_mw: 95, state: 'NSW' },
    { name: 'Smithfield BESS', developer: 'Iberdrola', technology: 'bess', capacity_mw: 65, storage_mwh: 130, state: 'NSW', location: 'Smithfield', project_id: 'smithfield-bess' },
  ],
  'ltesa-round-3': [
    { name: 'Uungula Wind Farm', developer: 'Squadron Energy', technology: 'wind', capacity_mw: 400, state: 'NSW', location: 'Central West Orana REZ', project_id: 'uungula-wind-farm' },
    { name: 'Culcairn Solar Farm', developer: 'Neoen', technology: 'solar', capacity_mw: 350, state: 'NSW', location: 'South West Slopes', project_id: 'culcairn-solar-farm' },
    { name: 'Richmond Valley BESS', developer: 'Ark Energy', technology: 'bess', capacity_mw: 275, storage_mwh: 2200, state: 'NSW', location: 'Richmond Valley', project_id: 'richmond-valley-bess' },
    { name: 'Silver City Energy Storage Centre', developer: 'Hydrostor', technology: 'bess', capacity_mw: 200, storage_mwh: 1600, state: 'NSW', location: 'Broken Hill', project_id: 'silver-city-energy-storage' },
    { name: 'Goulburn River BESS', developer: 'Lightsource bp', technology: 'bess', capacity_mw: 49, storage_mwh: 392, state: 'NSW', location: 'Goulburn River', project_id: 'goulburn-river-bess' },
  ],
  'ltesa-round-4': [
    { name: 'Maryvale Solar + BESS', developer: 'Unknown', technology: 'hybrid', capacity_mw: 172, storage_mwh: 372, state: 'NSW', project_id: 'maryvale-solar-and-energy-storage-system' },
    { name: 'Flyers Creek Wind Farm', developer: 'Unknown', technology: 'wind', capacity_mw: 145, state: 'NSW', project_id: 'flyers-creek-wind-farm' },
  ],
  'ltesa-round-5': [
    { name: 'Phoenix Pumped Hydro', developer: 'ACEN Australia', technology: 'pumped_hydro', capacity_mw: 800, storage_mwh: 11990, state: 'NSW', location: 'Lake Burrendong, Central West Orana REZ', project_id: 'phoenix-pumped-hydro-project' },
    { name: 'Stoney Creek BESS', developer: 'Enervest Utility', technology: 'bess', capacity_mw: 125, storage_mwh: 1000, state: 'NSW', location: 'Narrabri, New England REZ', project_id: 'stoney-creek-bess' },
    { name: 'Griffith BESS', developer: 'Eku Energy', technology: 'bess', capacity_mw: 100, storage_mwh: 800, state: 'NSW', location: 'Yoogali, Riverina', project_id: 'griffith-bess' },
  ],
  'ltesa-round-6': [
    { name: 'Great Western Battery', developer: 'Neoen Australia', technology: 'bess', capacity_mw: 330, storage_mwh: 3500, state: 'NSW', project_id: 'great-western-battery-project' },
    { name: 'Bowmans Creek BESS', developer: 'Ark Energy', technology: 'bess', capacity_mw: 250, storage_mwh: 2414, state: 'NSW', project_id: 'bowmans-creek-bess' },
    { name: 'Bannaby BESS', developer: 'BW ESS', technology: 'bess', capacity_mw: 233, storage_mwh: 2676, state: 'NSW', project_id: 'bannaby-bess' },
    { name: 'Armidale East BESS', developer: 'Unknown', technology: 'bess', capacity_mw: 158, storage_mwh: 1440, state: 'NSW', project_id: 'armidale-east-bess' },
    { name: 'Ebor BESS', developer: 'Energy Vault / Bridge Energy', technology: 'bess', capacity_mw: 100, storage_mwh: 870, state: 'NSW', project_id: 'ebor-bess' },
    { name: 'Kingswood BESS', developer: 'Iberdrola Australia', technology: 'bess', capacity_mw: 100, storage_mwh: 1080, state: 'NSW', project_id: 'kingswood-bess' },
  ],
  'ltesa-round-7': [
    { name: 'Tomago Battery', developer: 'AGL Energy', technology: 'bess', capacity_mw: 500, storage_mwh: 2000, state: 'NSW', location: 'Tomago (near Newcastle)', project_id: 'tomago-battery' },
    { name: 'Sydney / Newcastle VPP', developer: 'Enel X Australia', technology: 'vpp', capacity_mw: 32, state: 'NSW', location: 'Sydney + Newcastle (business customers)' },
  ],
}
