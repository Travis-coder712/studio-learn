import type { ProjectPerformance } from '../lib/types'

// ============================================================
// Sample Performance Data for Operating Projects
// Note: This is illustrative data. Real data will come from
// AEMO MMS / NEMWEB dispatch data in Phase 3.
// ============================================================

export const SAMPLE_PERFORMANCE: ProjectPerformance[] = [
  // ── Wind ──────────────────────────────────────────────────
  {
    project_id: 'coopers-gap-wind',
    ytd_price: 68,
    ytd_period: 'Jan–Mar 2026',
    annual: [
      { year: 2022, energy_price_received: 85, curtailment_pct: 2.1, capacity_factor_pct: 35.2 },
      { year: 2023, energy_price_received: 62, curtailment_pct: 3.8, capacity_factor_pct: 33.1 },
      { year: 2024, energy_price_received: 78, curtailment_pct: 5.2, capacity_factor_pct: 34.5 },
      { year: 2025, energy_price_received: 71, curtailment_pct: 6.9, capacity_factor_pct: 32.8 },
    ],
  },
  {
    project_id: 'stockyard-hill-wind',
    ytd_price: 59,
    ytd_period: 'Jan–Mar 2026',
    annual: [
      { year: 2022, energy_price_received: 78, curtailment_pct: 1.8, capacity_factor_pct: 37.1 },
      { year: 2023, energy_price_received: 55, curtailment_pct: 3.2, capacity_factor_pct: 36.4 },
      { year: 2024, energy_price_received: 69, curtailment_pct: 4.5, capacity_factor_pct: 35.0 },
      { year: 2025, energy_price_received: 63, curtailment_pct: 7.1, capacity_factor_pct: 34.2 },
    ],
  },

  // ── Hybrid (Solar + BESS) ─────────────────────────────────
  {
    project_id: 'new-england-solar',
    ytd_price: 48,
    ytd_period: 'Jan–Mar 2026',
    annual: [
      { year: 2023, energy_price_received: 52, curtailment_pct: 4.2, capacity_factor_pct: 24.1 },
      { year: 2024, energy_price_received: 61, curtailment_pct: 6.8, capacity_factor_pct: 25.3 },
      { year: 2025, energy_price_received: 55, curtailment_pct: 9.3, capacity_factor_pct: 23.7 },
    ],
  },

  // ── BESS ──────────────────────────────────────────────────
  {
    project_id: 'hornsdale-power-reserve',
    ytd_charge_price: 31,
    ytd_discharge_price: 118,
    ytd_period: 'Jan–Mar 2026',
    annual: [
      { year: 2018, avg_charge_price: 38, avg_discharge_price: 165, utilisation_pct: 15.2, cycles: 245 },
      { year: 2019, avg_charge_price: 42, avg_discharge_price: 148, utilisation_pct: 17.4, cycles: 280 },
      { year: 2020, avg_charge_price: 30, avg_discharge_price: 125, utilisation_pct: 20.1, cycles: 310 },
      { year: 2021, avg_charge_price: 35, avg_discharge_price: 155, utilisation_pct: 22.3, cycles: 335 },
      { year: 2022, avg_charge_price: 40, avg_discharge_price: 175, utilisation_pct: 24.0, cycles: 352 },
      { year: 2023, avg_charge_price: 28, avg_discharge_price: 112, utilisation_pct: 26.8, cycles: 378 },
      { year: 2024, avg_charge_price: 33, avg_discharge_price: 128, utilisation_pct: 23.5, cycles: 345 },
      { year: 2025, avg_charge_price: 29, avg_discharge_price: 105, utilisation_pct: 25.1, cycles: 365 },
    ],
  },
  {
    project_id: 'victorian-big-battery',
    ytd_charge_price: 33,
    ytd_discharge_price: 115,
    ytd_period: 'Jan–Mar 2026',
    annual: [
      { year: 2022, avg_charge_price: 32, avg_discharge_price: 145, utilisation_pct: 18.2, cycles: 265 },
      { year: 2023, avg_charge_price: 28, avg_discharge_price: 118, utilisation_pct: 22.4, cycles: 310 },
      { year: 2024, avg_charge_price: 35, avg_discharge_price: 132, utilisation_pct: 25.0, cycles: 338 },
      { year: 2025, avg_charge_price: 30, avg_discharge_price: 108, utilisation_pct: 21.3, cycles: 295 },
    ],
  },
  {
    project_id: 'waratah-super-battery',
    ytd_charge_price: 30,
    ytd_discharge_price: 110,
    ytd_period: 'Jan–Mar 2026',
    annual: [
      { year: 2025, avg_charge_price: 27, avg_discharge_price: 98, utilisation_pct: 19.4, cycles: 185 },
    ],
  },
]

export function getPerformanceData(projectId: string): ProjectPerformance | undefined {
  return SAMPLE_PERFORMANCE.find((p) => p.project_id === projectId)
}
