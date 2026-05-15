export interface Guide {
  id: string
  title: string
  description: string
  icon: string
  category: 'about' | 'technical' | 'process' | 'roadmap'
  readingTime: string
  /** ISO date (YYYY-MM-DD) the guide first shipped. */
  added: string
  /** ISO date of the last meaningful edit — typically the release that
   * refreshed the underlying feature. Defaults to `added` when never
   * materially revised. */
  updated?: string
  content: string
}

/**
 * True if the guide is considered recent — used to badge guides as "New"
 * or "Updated" in the index. Threshold is 14 days from the latest of
 * `updated` / `added`.
 */
export function isGuideRecent(guide: Guide, now: Date = new Date()): boolean {
  const stamp = guide.updated ?? guide.added
  if (!stamp) return false
  const t = new Date(stamp).getTime()
  if (Number.isNaN(t)) return false
  return (now.getTime() - t) < 14 * 24 * 60 * 60 * 1000
}

export const GUIDES: Guide[] = [
  {
    id: 'plain-english-overview',
    title: 'What Is AURES?',
    description: 'A plain-English explanation of what this project is, who it\'s for, and why it exists.',
    icon: '💡',
    category: 'about',
    readingTime: '5 min read',
    added: '2026-03-10',
    content: `# What Is This and Why Does It Exist?

## The Plain English Version

Australia is in the middle of the biggest transformation of its electricity system in a century. Coal plants are closing, and they're being replaced by wind farms, solar farms, batteries, and new transmission lines. There are hundreds of these projects — some already operating, some being built, some still on paper.

**The problem is:** there's no single place where you can see all of this clearly.

The information exists, but it's scattered across dozens of websites, government databases, news articles, company announcements, and paywalled reports. If you want to know basic things like "what battery projects are being built in NSW?" or "who makes the turbines for that wind farm?" or "has this project been delayed?", you have to piece it together yourself from half a dozen sources.

**AURES fixes this.** It brings together information from 10+ public sources — including AEMO registers, government scheme data, RSS news feeds, OpenElectricity performance data, and AEMO ISP planning documents — into one searchable, browsable database with built-in analytics. It works on your phone, has a powerful cross-entity search (press Cmd+K), and includes an Intelligence Layer with 10 analytical features covering risk scoring, performance benchmarking, market trends, EIS document analysis, and developer data quality auditing.

---

## What Can You Do With It?

### Look at projects from any angle

Want to see every wind farm in Queensland? Done.
Every project using Vestas turbines? Done.
Every battery that uses Tesla Megapacks? Done.
What did Origin Energy buy this year? Done.
Which projects won CIS funding in Tender 3? Done.
What's in the South West REZ? Done.
Who are the offtakers for operating wind farms? Done.

It's the same underlying data, but you can slice it a dozen different ways — by project, developer, OEM, contractor, offtaker, REZ, scheme, or location on the map. Use the **Cmd+K search** (or tap the search icon on mobile) to instantly find any project, developer, OEM, contractor, or offtaker across the whole platform.

### Track how projects evolve over time

This is the killer feature. Every project has a timeline showing its full history:
- When it was first proposed
- Who developed it
- When it got planning approval
- If it was sold (and for how much)
- When it won CIS/LTESA funding
- What the original construction timeline was
- How that timeline has changed
- What the current expected completion date is

You can see at a glance: "This project was supposed to be finished in 2025, but it's slipped to 2028. Here's why."

### See which projects are actually performing well

For projects that are already operating, AURES tracks:
- How much power they actually generate (capacity factor)
- How much they get paid (volume-weighted price)
- How much power they lose to grid congestion (curtailment)
- How their location affects their revenue (loss factors)

You can see league tables — the best-performing wind farms, solar farms, and batteries — and also the worst. And critically, you can see *why* some perform better than others.

### Understand whether new projects will succeed

For projects that have won government contracts (CIS or LTESA) but haven't been built yet, AURES provides a "watchlist" that scores each project on how likely it is to actually reach construction. This is based on:
- Does it have planning approval?
- Does it have grid access?
- Does the developer have a track record?
- Is the technology proven?
- Are there supply chain risks?

### Analyse market trends with the Intelligence Layer

AURES includes 10 intelligence features that go beyond raw data:
- **Scheme Risk Scoring** — traffic-light risk assessment for CIS/LTESA projects
- **COD Drift Analysis** — delay patterns by technology, state, and developer
- **Wind Resource Assessment** — capacity factor predictions based on location
- **Dunkelflaute Analysis** — renewable energy drought risk and BESS coverage adequacy
- **Energy Mix Tracker** — how each state's generation mix is evolving
- **Developer Scores** — A-F execution grading based on delivery track record
- **Revenue Intelligence** — revenue trends and benchmarks by technology
- **Grid Connection Analysis** — REZ congestion and connection bottleneck mapping
- **EIS/EIA Technical Intelligence** — 98 projects with extracted technical specs, EIS vs actual performance comparison, coverage gap tracking
- **Developer Data Quality** — website cross-referencing, SPV correction identification, JV partnership documentation

### Stay up to date with the News Feed

AURES automatically imports news from RenewEconomy, PV Magazine Australia, and Energy Storage News, and fuzzy-matches articles to projects in the database. See the latest coverage for any project right on its detail page.

### Learn how the energy system works

An education section explains the fundamentals:
- How does Australia's electricity market work?
- What is a Renewable Energy Zone?
- What is the Capacity Investment Scheme?
- Why do batteries earn money from frequency control?
- What is a marginal loss factor and why does it matter?

---

## What Makes This Different?

### 1. It's honest about uncertainty
If we don't know something, it says "Not yet verified" rather than making something up. Every data point has a confidence rating, and every fact links back to its source.

### 2. It shows conflicting information
When the AFR says a project cost $300M and RenewEconomy says $350M, AURES shows both, with dates and context. In this industry, no single source is right about everything. The database helps you see the full picture.

### 3. It tracks change over time
Most databases show you a snapshot. AURES shows you the movie. How has this project's expected completion date shifted? Who used to own it? What was the original cost estimate?

### 4. It works on your phone
Designed mobile-first as a Progressive Web App. Install it on your iPhone and use it on-site, in meetings, or wherever you need quick access to project intelligence.

---

## Who Is This For?

- **Renewable energy professionals** who need project intelligence at their fingertips
- **Investors** evaluating project risks and developer track records
- **Policy analysts** tracking whether CIS/LTESA/REZ programs are delivering
- **Journalists** who need accurate, sourced project data
- **Students and educators** learning about Australia's energy transition
- **Anyone** who wants to understand what's happening with renewable energy in Australia

---

## How Is the Data Kept Accurate?

1. **AEMO backbone**: The core project list comes from AEMO's Generation Information publication, updated quarterly. This is the official source of truth for what exists and what's proposed.

2. **Sourced enrichment**: Every additional detail (OEM, cost, offtakes, etc.) must have a source URL. No data is entered without attribution.

3. **Multi-source triangulation**: Where possible, facts are confirmed across multiple sources. The more sources that agree, the higher the confidence rating.

4. **Change tracking**: Every data update is logged with date, source, and the old value. This creates an audit trail and prevents silent errors.

5. **Honest gaps**: Fields that haven't been researched say "Not yet verified" rather than being left blank or filled with guesses.

---

## Hierarchy of What AURES Achieves

**Level 1: DATABASE** — "What projects exist?"
1,067 project records covering every significant renewable energy project in Australia (NEM + WEM). Filterable by technology, state, developer, OEM, status, REZ, CIS/LTESA round. Searchable via Cmd+K cross-entity search.

**Level 2: PROFILES** — "Who are the players?"
Developer profiles (152 scored developers). OEM profiles (34 equipment manufacturers). EPC contractor profiles (45 contractors). Offtaker profiles (31 offtakers with 85 PPA/offtake agreements tracked).

**Level 3: HISTORY** — "How has this project evolved?"
Full lifecycle timeline for each project. Ownership changes with transaction values. COD drift tracking. Milestone progression.

**Level 4: ANALYSIS** — "How are existing projects performing?"
Operational performance league tables. Capacity factors, revenue, curtailment, loss factors. Best and worst performers by technology and state. BESS revenue breakdown (arbitrage vs FCAS).

**Level 5: INTELLIGENCE** — "What patterns explain performance?"
10 intelligence features: scheme risk scoring (17 tracked projects), COD drift analysis, wind resource assessment, Dunkelflaute analysis, energy mix tracking, developer execution scoring (A-F grades), revenue intelligence, grid connection bottleneck analysis, EIS/EIA technical intelligence (98 projects), and developer data quality auditing (20 developers cross-referenced).

**Level 6: INSIGHT** — "What should we be watching?"
News feed integration (RenewEconomy, PV Magazine, Energy Storage News) with fuzzy project matching. Multi-source analysis of contested topics. Market share trends and competitive dynamics.`,
  },
  {
    id: 'project-plan',
    title: 'Architecture & Plan',
    description: 'Full architecture, phase-by-phase build plan, data sources, and key design decisions.',
    icon: '🏗️',
    category: 'technical',
    readingTime: '12 min read',
    added: '2026-03-10',
    updated: '2026-04-17',
    content: `# AURES — Comprehensive Project Plan

## What Is AURES?

**AURES** (AUstralian Renewable Energy System) is a comprehensive, open-source database and intelligence platform tracking every significant renewable energy project in Australia's National Electricity Market (NEM) and Western Australian Wholesale Electricity Market (WEM).

It is designed to be:
- **Comprehensive**: Every wind, solar, BESS, hybrid, pumped hydro, and gas project tracked with full lifecycle data
- **Multi-lens**: Same data viewable by technology, state, developer, OEM, REZ, CIS/LTESA round, and status
- **Historically rich**: Full project timelines showing ownership changes, COD drift, cost evolution, milestone history
- **Analytically powerful**: Operational performance league tables, project risk scoring, top quartile benchmarking
- **Source-transparent**: Every data point linked to its source, with confidence ratings and multi-source triangulation
- **Mobile-first**: PWA that works brilliantly on iPhone and desktop
- **Accurate**: No AI hallucinations — only verified, sourced data with gaps honestly marked

---

## Architecture Overview

The system has four layers:

**Layer 0: DATA PROCESSING PIPELINE (Python)**
Automated AEMO data ingestion (Generation Info, SCADA, MLFs). OpenElectricity API integration (annual + monthly). News RSS import (RenewEconomy, PV Magazine, Energy Storage News). AEMO ISP data import. Computed metrics (capacity factors, revenue, curtailment, rankings). Pipeline automation via \`scripts/aures-pipeline.sh\` with macOS launchd scheduling (weekly Monday 6am). \`admin.py --auto\` flag runs only steps exceeding their frequency threshold.

**Layer 1: SQLite DATABASE**
All project records, timelines, ownership, suppliers, performance. Multi-source data storage with confidence ratings. Computed fields: risk scores, performance scores, quartile rankings. Audit trail: every field change logged with source.

**Layer 2: STATIC JSON (version-controlled)**
Pre-computed views exported from SQLite. Indexes for every navigation lens (by tech, state, developer, OEM, etc.). League tables, watchlists, and market share data. Updated whenever the pipeline runs.

**Layer 3: PWA FRONTEND (GitHub Pages)**
React 19 + TypeScript + Vite 6 + Tailwind 4. Offline-capable via service worker (vite-plugin-pwa). Cross-entity search modal (Cmd+K) with fuzzy matching via Fuse.js. 8 Intelligence Layer pages (scheme risk, COD drift, wind resource, Dunkelflaute, energy mix, developer scores, revenue intelligence, grid connection). Charts via Recharts with PNG export and CSV download. Maps via Leaflet. Accessibility: ARIA labels, skip-to-content, focus management. Mobile-first responsive design with ScrollableTable and Breadcrumbs.

---

## Phase-by-Phase Build Plan

### Phase 1: Foundation (~2 weeks)
**Goal: Working PWA with project database on your phone**

Core tasks: React + Vite + TypeScript + Tailwind + PWA setup. SQLite database schema. Python AEMO Generation Information importer. JSON export pipeline. Core frontend screens (Home dashboard, Project list with filters, Project detail with tabs, Universal search). Mobile-responsive layout with bottom navigation. 10 exemplar projects with full data. Deploy to GitHub Pages.

### Phase 2: CIS/LTESA/REZ + Watchlist (~2 weeks)
**Goal: Full scheme round views and forward-looking risk dashboard**

Structure all CIS rounds (Pilot NSW through Tender 8). Structure all LTESA rounds (Round 1-6). Structure REZ views (NSW, VIC, QLD). Build CIS/LTESA round comparison views. Build Watchlist dashboard with risk scoring. Education hub: CIS explainer, LTESA explainer, REZ explainer.

### Phase 2.5: Interactive Map + NEM Summary
**Goal: Spatial intelligence and fleet-wide dashboard**

**Interactive Map** — Zoomable Leaflet map showing REZ boundaries, transmission network (500kV/330kV/275kV backbone), planned transmission upgrades (HumeLink, VNI West, Marinus Link, CopperString 2.0, etc.) with construction status, and every tracked project plotted by location. Color-coded by technology, sized by capacity. Filter by tech, status, developer. Highlight which projects depend on specific transmission upgrades.

**NEM Summary Dashboard** — High-level snapshot of installed renewables by type (Wind, Solar, BESS, Pumped Hydro, Hybrid). Shows operating vs under construction vs planned capacity. Timeline of projects expected to reach COD in the next 12 months. Clickable drill-downs to see individual projects. Includes practical guidance on how to check if projects are on time (AEMO commissioning register, GPS approval, connection scorecard, CIS milestone deadlines, developer track record, supply chain indicators).

### Phase 3: Performance Analytics (~2-3 weeks)
**Goal: Operational performance league tables and AEMO data pipeline**

Build Python AEMO SCADA data pipeline (dispatch, price, MLF data). Compute monthly/quarterly/annual metrics per generator (capacity factor, revenue, curtailment, availability). Build league table frontend for Wind, Solar, BESS. Curtailment analysis by zone/region. BESS revenue analysis (arbitrage vs FCAS). Wind performance by OEM.  Top quartile benchmark framework.

### Phase 4: Intelligence Layer (~2 weeks)
**Goal: Multi-source analysis, insights, and development mapping**

Multi-source data panel on project pages. Confidence rating system. "Differing Views" feature. Source coverage map per project. Operations to development mapping. Developer and OEM profiles with market share. COD drift tracking visualisation. "Zombie project" detection. Construction performance leaderboard.

### Phase 5: Ongoing Data Enrichment
**Goal: Continuously improve data depth and freshness**

Monthly: Run AEMO SCADA pipeline. Quarterly: Refresh AEMO Generation Information. Per-event: CIS/LTESA results, REZ announcements. Ongoing: Enrich project fact sheets, article linking, stakeholder tracking.

---

## Data Sources (10+ public sources)

### Tier 1: Official / Regulatory
- **AEMO Generation Information** — Project universe (~500+ projects)
- **AEMO Dispatch SCADA** — Per-unit 5-min generation data
- **AEMO MLFs** — Marginal loss factors per generator
- **AEMO Connections Scorecard** — Connection queue status
- **DCCEEW CIS** — Capacity Investment Scheme results
- **AEMO Services / ASL** — LTESA tender results
- **EnergyCo** — REZ access rights, REZ info
- **ACCC Merger Register** — M&A regulatory decisions
- **State Planning Portals** — DA approvals

### Tier 2: Authoritative Journalism
- **Australian Financial Review** — Deal values, M&A, strategic moves, financing
- **RenewEconomy** — Project detail, RenewMap, daily coverage
- **WattClarity** — Technical analysis, curtailment, capacity factors
- **Modo Energy** — BESS revenue analytics, CIS/LTESA analysis

### Tier 3: Specialist Industry
PV Magazine Australia, Energy Storage News, Infrastructure Investor, Capital Brief, Energy Synapse, Clean Energy Council

### Tier 4: Open Data
OpenElectricity (OpenNEM) — annual and monthly performance data (capacity factors, revenue, curtailment). Monthly intervals enable seasonal analysis with 12 data points per facility per year. Global Energy Monitor, Wikipedia, ARENA.

### Tier 5: News & RSS Feeds
**RenewEconomy** (reneweconomy.com.au/feed/), **PV Magazine Australia**, **Energy Storage News**. Imported weekly via \`import_news_rss.py\`. Articles are fuzzy-matched to projects in the database and displayed on project detail pages.

### Tier 6: AEMO ISP & Planning Data
AEMO Integrated System Plan appendix Excel files — REZ hosting capacity limits, transmission augmentation timelines, and connection queue data. Imported annually via \`import_aemo_isp.py\`.

### Tier 7: Primary Sources
Developer websites, OEM announcements, EPC contractor announcements, Community/stakeholder submissions

---

## Key Design Decisions

### 1. Multi-Source Intelligence (Not Single-Source Truth)
Every key data point stores ALL reported values with source, date, and context. Conflicting information is shown, not hidden — it's a feature.

### 2. Nothing Is Ever Deleted
Old values move to history arrays. Every change has a timestamp and source.

### 3. Source Hierarchy with Recency Rule
When same-tier sources conflict, latest date wins for "current" display. All values preserved in history.

### 4. Pre-Computed Analytics
All rankings, scores, and aggregations computed at export time. PWA serves pre-built JSON — no runtime computation needed.

### 5. Mobile-First, Comprehensive Second
Bottom navigation with tabs on mobile. Progressive disclosure — simple surfaces, depth on demand. Desktop gets full sidebar navigation.

---

## Technology Stack

| Component | Choice |
|-----------|--------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| PWA | vite-plugin-pwa |
| Charts | Recharts |
| Animations | Framer Motion |
| Search | Fuse.js |
| Routing | React Router 7 |
| Database | SQLite3 |
| Data Pipeline | Python 3.11+ |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |`,
  },
  {
    id: 'using-aures',
    title: 'Using AURES on Your Phone',
    description: 'How to install the PWA, update to the latest version, and troubleshoot common issues.',
    icon: '📱',
    category: 'about',
    readingTime: '3 min read',
    added: '2026-03-11',
    content: `# Using AURES on Your Phone

## Installing the PWA

AURES is a Progressive Web App (PWA). You can install it on your phone for quick access:

### iPhone (Safari)
1. Open **https://travis-coder712.github.io/aures-db/** in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** in the top right

### Android (Chrome)
1. Open **https://travis-coder712.github.io/aures-db/** in Chrome
2. Tap the **three-dot menu** in the top right
3. Tap **Add to Home Screen** or **Install App**
4. Confirm the installation

---

## Updating to the Latest Version

AURES uses a service worker to cache the app for offline use. This means your phone may show an older version even after updates are deployed. Here's how to force an update:

### Quick Fix — Hard Refresh
1. Open AURES in your phone's browser (not the installed PWA)
2. Pull down to refresh, or use the browser's reload button
3. The service worker will check for updates in the background
4. Close and reopen the app — the new version should load

### If That Doesn't Work — Clear Cache
**iPhone:**
1. Go to **Settings > Safari > Advanced > Website Data**
2. Find **travis-coder712.github.io** and swipe to delete
3. Reopen AURES in Safari

**Android:**
1. Go to **Settings > Apps > Chrome** (or your browser)
2. Tap **Storage > Clear Cache**
3. Reopen AURES

### Nuclear Option — Reinstall the PWA
1. Delete the AURES app from your home screen
2. Open the URL fresh in your browser
3. Reinstall using the steps above

---

## Troubleshooting

**App shows old data or missing pages:**
This is almost always a service worker cache issue. Follow the update steps above.

**App won't install:**
Make sure you're using Safari on iPhone or Chrome on Android. Other browsers may not support PWA installation.

**Pages load slowly:**
The first load fetches ~300KB of project data. Subsequent loads are cached and should be instant. If you're on a slow connection, give it a moment.

**Charts don't render:**
Make sure JavaScript is enabled in your browser settings. Some content blockers can interfere with chart rendering.

---

## Navigating on Mobile

AURES has a bottom navigation bar with quick access to the 5 most-used pages: Home, Projects, Performance, REZ, and Search.

To access all pages (Developers, OEMs, Contractors, Offtakers, Dashboard, Map, Schemes, Guides), tap the **hamburger menu** (three lines) in the top-left corner. This opens the full navigation sidebar.

---

## Key Pages

**Developers** — Browse 718 developers. Use the "Group variants" toggle to merge SPV/legal entities under their parent companies (~104 groups). Top-10 buttons give quick access to the biggest developers (ACEN, AGL, Hydro Tasmania, etc.).

**OEMs** — 17 equipment manufacturers (Vestas, Goldwind, Tesla, etc.). See which turbines or batteries are used in which projects.

**Contractors** — 20 EPC contractors. See who is building what.

**Offtakers & PPAs** — 19 offtakers with 48 tracked power purchase agreements. Filter by PPA type (corporate PPA, government PPA, tolling, etc.).

**Performance** — League tables ranking operating projects by capacity factor, revenue, and curtailment. Compare wind farms, solar farms, and batteries side by side.

**Data Sources** — Shows where AURES data comes from and when each source was last updated.`,
  },
  {
    id: 'performance-methodology',
    title: 'Performance Metrics Deep Dive',
    description: 'How capacity factor, curtailment, revenue, and BESS metrics are calculated — data sources, formulas, limitations, and caveats.',
    icon: '🔬',
    category: 'technical',
    readingTime: '10 min read',
    added: '2026-03-12',
    content: `# Performance Metrics — Deep Dive

This guide explains exactly how every metric on the Performance League Tables page is calculated, where the data comes from, and what the limitations are.

---

## Data Pipeline Overview

All performance data flows through this pipeline:

**AEMO NEMWEB** (5-minute dispatch intervals) → **OpenElectricity API** (aggregation & enrichment) → **AURES Python pipeline** (import, compute rankings) → **Static JSON** (served to your browser)

- **Source:** OpenElectricity API, which aggregates AEMO's 5-minute dispatch and settlement data
- **Frequency:** Annual aggregation (sum of ~105,000 five-minute intervals per year). Monthly data available but not yet imported.
- **Coverage:** All NEM-registered facilities. WEM (Western Australia) is **not** covered — WA projects appear in the database but without performance data.
- **Latency:** Settlement data lags real-time by 2-3 days
- **API plan:** Community (free), 500 requests/day

---

## Capacity Factor (CF%)

### What it measures
The ratio of actual energy output to the theoretical maximum if the plant ran at full nameplate capacity 24/7. It answers: "How hard is this plant working relative to what it could theoretically do?"

### Formula
\`CF = (Energy_MWh) / (Capacity_MW x 8,760) x 100\`

- **Energy_MWh:** Total metered energy dispatched to the grid over the year, from AEMO SCADA data
- **Capacity_MW:** Nameplate (registered) capacity from AEMO Generation Information — NOT maximum output or de-rated capacity
- **8,760:** Hours in a standard year (8,784 in a leap year). For YTD data, actual hours elapsed to date.

### What affects capacity factor
- **Resource quality:** Wind speed, solar irradiance at the site
- **Plant age:** Degradation of solar panels (0.3-0.5%/year) or turbine wear
- **Planned outages:** Scheduled maintenance windows
- **Unplanned outages:** Equipment failures, grid faults
- **Curtailment:** Output forced below capacity due to grid constraints or negative prices
- **Connection constraints:** Runback schemes limiting output at the connection point

### Typical ranges
| Technology | Poor | Average | Good | Excellent |
|-----------|------|---------|------|-----------|
| Wind | <25% | 25-32% | 32-40% | >40% |
| Solar | <18% | 18-22% | 22-26% | >26% |
| Pumped Hydro | 5-15% | 15-25% | 25-35% | n/a |

### Important caveats
- CF does **not** distinguish between voluntary curtailment (negative prices — a smart economic decision) and forced curtailment (constraints — a problem). A low CF could mean bad wind or smart market behaviour.
- **Hybrid projects** may have combined CF for co-located generation. AEMO tracks DUIDs separately but OpenElectricity may aggregate wind+solar at the same site.
- Comparing CF across technologies is meaningless — a 25% wind CF and 25% solar CF reflect very different realities.

---

## Curtailment (%)

### What it measures
The estimated percentage of potential generation that was NOT dispatched, despite available resource (wind/sun). It answers: "How much power was left on the table?"

### Why it's estimated (not exact)
AEMO does not publish a single "curtailment" number per facility. True curtailment requires comparing:
- Actual dispatch vs available capacity (from SCADA)
- Constraint equations that bound output
- Semi-scheduled generator UIGF (Unconstrained Intermittent Generation Forecast) vs actual

### Our method
Derived from dispatch data patterns — comparing expected output (resource availability x capacity) vs actual output. This is an **approximation**.

### Types of curtailment
1. **Economic curtailment** — Generator self-curtails during negative prices (voluntary, rational). Under-reported by our method.
2. **Network constraints** — AEMO directs reduced output due to transmission limits
3. **System security** — AEMO directs reduction for grid stability (frequency, inertia)
4. **Connection limits** — Runback schemes at the connection point cap output below nameplate

### Limitations
- Currently **indicative only**
- Under-reports economic curtailment (choosing not to generate)
- May over-report for plants with genuinely low output (old panels, poor siting)
- Future improvement: use NEMWEB constraint equation data directly for precise curtailment

---

## Revenue & Pricing

### Market Value ($)
Total wholesale energy revenue from the NEM spot market. This is the sum of energy dispatched x spot price at each 5-minute interval.

**What it excludes:**
- LGC (Large-scale Generation Certificate) revenue — worth $30-50/MWh for eligible projects
- PPA contract premiums or floors
- FCAS/ancillary services revenue
- Capacity payments (future CIS payments)

**Real-world revenue** for most renewable projects is 30-60% higher than the wholesale market value shown here.

### Price Received ($/MWh)
Volume-weighted average spot price at time of dispatch. Reflects the generator's price exposure profile.

\`$/MWh = Market Value ($) / Energy Generated (MWh)\`

A solar farm dispatching at midday will receive lower prices than a battery dispatching at evening peak. This metric reveals those differences.

### Revenue per MW (Rev/MW)
Total market revenue divided by nameplate capacity.

\`Rev/MW = Market Value ($) / Capacity (MW)\`

This is the key efficiency metric — it captures both how much a plant generates AND when it generates (price capture). Two wind farms with identical capacity factors can have very different Rev/MW if one is in a high-price state.

---

## BESS-Specific Metrics

Battery storage has fundamentally different metrics from generators.

### Charge / Discharge Energy
AEMO registers each battery as **two separate DUIDs** — a charging unit and a discharging unit. OpenElectricity tracks both. Discharged energy is always less than charged energy due to round-trip efficiency losses (typically 85-90% for lithium-ion).

### Price Spread ($/MWh)
\`Spread = Avg Discharge Price - Avg Charge Price\`

The core profit driver for BESS. A battery charges when prices are low (e.g. $20/MWh midday solar glut) and discharges when prices are high (e.g. $150/MWh evening peak). Higher spreads mean better arbitrage returns.

### Annual Cycles
\`Cycles = Total Energy Discharged (MWh) / Storage Capacity (MWh)\`

One cycle = fully discharging the battery's entire storage capacity once. Most NEM batteries do 1-2 full equivalent cycles per day. Higher cycles mean more throughput but also more wear on the battery.

### Utilisation (%)
\`Utilisation = Energy Discharged / (Capacity MW x Hours in Period) x 100\`

Percentage of time the battery was actively discharging. Note this only counts discharge — a battery spending 4 hours charging and 4 hours discharging has ~17% utilisation by this measure.

### What BESS revenue data misses
Our data captures **arbitrage revenue only** (buy low, sell high in the spot market). It does NOT include:
- **FCAS revenue** — batteries earn significant income from frequency regulation services, sometimes exceeding arbitrage revenue
- **Network support payments** — contracted grid stability services
- **Cap contract premiums** — financial hedging products

For many batteries, FCAS is 30-50% of total revenue. Our league tables therefore represent a floor, not the complete picture.

---

## Composite Rankings

### How projects are ranked
Each project receives a composite score (0-100) based on weighted metrics:

**Wind & Solar:**
| Metric | Weight |
|--------|--------|
| Capacity Factor | 40% |
| Revenue per MW | 40% |
| Curtailment (inverted) | 20% |

**BESS:**
| Metric | Weight |
|--------|--------|
| Revenue per MW | 30% |
| Utilisation | 30% |
| Price Spread | 20% |
| Cycles | 20% |

### Quartiles
Projects are divided into four equal groups based on composite score:
- **Q1** (green) — Top 25% performers
- **Q2** (blue) — Above median
- **Q3** (amber) — Below median
- **Q4** (red) — Bottom 25%

### Percentile rankings
Each metric also has a percentile ranking (0-100th percentile) showing where a project sits relative to all peers of the same technology.

---

## Drill-down — from aggregate to projects

Every aggregate chart on the Performance and intelligence pages supports click-through drill-down:

- **Performance > Quartile Distribution chart** — click any quartile bar (Q1/Q2/Q3/Q4) to open a side panel listing the projects in that quartile, sorted by composite rank. The panel shows rank, project name (link), state, capacity, and the key tech-specific metric (CF% for wind/solar, Spread for BESS).
- **Drift Analysis > Drift by Technology/State** — click a bar to see the projects in that technology or state.
- **Revenue Intelligence > Revenue by Tech / Revenue Pressure** — click a bar to see the underlying projects.
- **BESS Bidding > Rebid Frequency Ranking** — click a bar to see that DUID's full bidding profile and 10 price bands.

The panel slides in from the right on desktop and up from the bottom on mobile. Press **Escape** or click outside to close. Every drill panel embeds a sortable table with row numbers, totals, and CSV export.

---

## Known Limitations

1. **WEM not covered** — Western Australian projects (Collie Battery, etc.) have no performance data
2. **FCAS revenue excluded** — Especially impacts BESS rankings
3. **Curtailment is estimated** — Indicative, not precise
4. **Hybrid attribution** — Co-located wind+solar may have combined metrics
5. **New projects penalised** — Projects that started mid-year will show lower annual totals (CF is annualised to compensate, but revenue is not)
6. **Sample data fallback** — If real data is unavailable for a technology/year, projected estimates (marked with amber badge) are shown instead

---

## Want to verify our numbers?

The underlying data is publicly available:
- **OpenElectricity:** [openelectricity.org.au](https://openelectricity.org.au) — free facility-level data explorer
- **AEMO NEMWEB:** [nemweb.com.au](https://nemweb.com.au) — raw 5-minute dispatch files
- **AEMO Generation Information:** Published quarterly with registered capacities

If you spot a discrepancy, it's likely due to capacity differences (registered vs maximum), time period alignment, or DUID mapping. We welcome corrections.`,
  },
  {
    id: 'battery-records-live',
    title: 'Battery Records & Live Activity',
    description: 'How the Records Board is computed, how the 30-day snapshot works, and the single-API-request pattern that keeps costs low.',
    icon: '⚡',
    category: 'technical',
    readingTime: '6 min read',
    added: '2026-04-16',
    content: `# Battery Records & Live Activity

The new **Live & Records** tab on \`/intelligence/bess-portfolio\` surfaces what the structural BESS intelligence can't: the actual behavioural records of the operating fleet — how big a single 5-minute discharge has ever been, how much the NEM's batteries moved yesterday, and where the daily records sit per state.

## What's tracked

Per region (NEM plus each of NSW1, VIC1, QLD1, SA1, TAS1):

| Metric | Unit | Source |
|---|---|---|
| **Max 5-min discharge** | MW | Peak single-interval discharge across the fleet |
| **Max 5-min charge** | MW | Peak single-interval charge (load) |
| **Max daily discharge** | MWh | Highest total daily throughput discharged |
| **Max daily charge** | MWh | Highest total daily throughput charged |

Plus for the latest day available:
- Total discharged / charged MWh per region
- Peak 5-min discharge and charge MW with timestamps
- 30-day trailing daily throughput chart (NEM-wide)

## Data source — OpenElectricity 5-minute network endpoint

Rather than scraping raw NEMWEB 5-minute SCADA (which would be ~8M rows/year across 80+ battery DUIDs), we use OpenElectricity's pre-aggregated \`/data/network/NEM\` endpoint with:

\`\`\`
metrics=power
interval=5m
primary_grouping=network_region
secondary_grouping=fueltech
fueltech=battery_charging,battery_discharging
\`\`\`

**One API request per month of history** — fits easily in OE's free-tier 500/day quota. For a full-year backfill, 12 requests.

The importer stores only **daily aggregates per region**, not raw 5-min data. Schema:

\`\`\`sql
battery_daily_scada (
  settlement_date, region, discharged_mwh, charged_mwh,
  peak_discharge_mw, peak_charge_mw,
  peak_discharge_time, peak_charge_time, intervals_counted
)
battery_records (
  metric, region, value, unit, recorded_at, settlement_date
)
\`\`\`

## Running the importer

\`\`\`bash
# First-run 30-day backfill
python3 pipeline/importers/import_battery_scada.py --days 30

# Incremental catch-up (daily cron)
python3 pipeline/importers/import_battery_scada.py --days 7

# Specific historical range
python3 pipeline/importers/import_battery_scada.py \\
    --date-start 2025-01-01 --date-end 2025-12-31
\`\`\`

Requires \`OPENELECTRICITY_API_KEY\` env var (sign up at https://platform.openelectricity.org.au — free tier).

After each run, \`battery_records\` is recomputed from scratch against the full \`battery_daily_scada\` history. Running the importer multiple times is idempotent — daily rows are upserted on their unique (date, region) key.

## How the importer works

1. Single API call fetches 5-min battery_charging + battery_discharging power for the chosen date range, already split by region.
2. For each 5-min interval, we synthesise a "NEM" row by summing the 5 NEM regions.
3. Daily aggregate per (date, region):
   - \`discharged_mwh = Σ battery_discharging_mw / 12\` (12 five-min intervals per hour)
   - \`charged_mwh = Σ battery_charging_mw / 12\`
   - \`peak_discharge_mw = max(battery_discharging_mw)\` + timestamp of peak
   - \`peak_charge_mw = max(battery_charging_mw)\` + timestamp of peak
4. Upsert into \`battery_daily_scada\`.
5. Refresh \`battery_records\` from the updated daily table.

## Graceful rendering when no data yet

The exporter writes \`battery-live-records.json\` on every \`export_json.py\` run. If \`battery_daily_scada\` is empty:
- \`has_data: false\`
- \`records: { max_discharge_5min: [], ... }\` (empty arrays)
- \`source_note\` with the exact importer command

The UI renders an amber info banner with the command, and every record cell shows \`—\` without breaking.

When data is present:
- Banner turns green ✓
- Stat cards populate: Fleet capacity (GW), Max 5-min discharge/charge, Max daily discharge
- Latest snapshot table shows yesterday's activity per region
- Records Board shows every record with timestamp / date
- 30-day NEM throughput bar chart shows the recent trend

## Design choices

1. **Aggregate-only storage.** The brief's original plan kept raw 5-min data, but at ~3M rows/year it bloats the DB unnecessarily. Daily aggregates + peaks cover every user-facing metric with 99% less storage.
2. **NEM synthesised from 5 regions.** Keeps the API simple and the sums trivial to verify.
3. **Records recomputed in full, not incremental.** The table is tiny (4 metrics × 6 regions = 24 rows max). Full recompute avoids the "record stuck at old value because the daily it was set on got overwritten" bug class.
4. **No per-DUID tracking.** Individual project activity is captured in \`performance_monthly\` + league tables. Live & Records is about fleet-level records, not unit-level drill-in.
5. **State-of-charge inference deferred.** The brief flagged it as approximate (round-trip efficiency 85-90% estimate). Shipping the records board first; SOC estimation can layer on top later if users want it.

## Known limitations

1. **First-run lookback is ~12 months on free tier** — OpenElectricity free plan caps historical queries at 367 days. Longer history requires a paid plan.
2. **Records history only goes back as far as you've ingested.** If the importer hasn't run, records are empty. If you ingested only 30 days, records reflect that window.
3. **NEMWEB is the authoritative AEMO source.** OpenElectricity is a downstream consumer with ~2-5 minute latency. For absolute real-time, the brief's original raw-NEMWEB-SCADA path would be needed — but the complexity jump is large for marginal improvement.
4. **5-min interval aggregation.** MWh figures assume each 5-min interval is accurate; minor rounding error accumulates in multi-day totals but doesn't affect peaks or single-day records.
5. **No FCAS market separation.** The OE fueltech tags don't split energy dispatch vs FCAS service — a battery providing contingency FCAS shows up in the same power trace as a battery arbitraging energy.

## Cross-references

- **BESS Portfolio Intelligence** guide for structural data (duration, chemistry, grid-forming, co-location)
- **BESS Bidding** for per-DUID price-band analysis (NEMWEB bids)
- **Coal Outage vs Dispatch** (v2.27.0) — same graceful-pending-state pattern and similar NEMWEB / OE data architecture
`,
  },
  {
    id: 'energy-transition-scoreboard',
    title: 'Energy Transition Scoreboard',
    description: 'Year-over-year coal decline stacked against wind / solar / BESS growth with demand overlaid — at NEM and per-state scope.',
    icon: '📊',
    category: 'technical',
    readingTime: '7 min read',
    added: '2026-04-17',
    content: `# Australia's Energy Transition — Scoreboard

The scoreboard lives on \`/intelligence/energy-mix\` as the **Transition Scoreboard** tab. It answers the single question everyone asks when they look at generation data: *is the transition actually happening?* — with five years of NEM-wide and per-state evidence.

## What it shows at a glance

**One stacked bar per year.** Coal is red at the bottom. Wind (blue) / solar (amber) / BESS discharge (green) stack on top. A dashed line traces total demand.

- If coal bars shrink and renewables grow → the transition is doing the work.
- If the total bar stays flat while the mix flips → demand is steady, generation is re-composing.
- If the demand line climbs faster than the stack → new load is being added faster than new supply (not the case in the NEM to date).
- If demand falls in line with coal → the transition is partially "load response, not new supply" (also not the case — demand is essentially flat 2021-2025).

## Same-period comparison — not apples to oranges

Every year is aggregated over the **same Jan 1 → current day-of-year window**. A partial 2026 does NOT get compared to a full 2025 — both are restricted to the first 107 days when the cutoff is 17 April.

This is the same apples-to-apples pattern used in Coal Watch → YTD Comparison tab, extended across all four fuel techs plus demand. The \`Full calendar year\` toggle lets you switch to full-year view for historical years.

## Records board

Six transition-specific records per scope:

| Record | Direction | Insight |
|---|---|---|
| Coal — lowest 5-min dispatch | ↓ | The deepest trough the NEM coal fleet has ever hit |
| Coal — lowest daily dispatch | ↓ | The slowest full day of the coal era |
| Wind — highest daily output | ↑ | The windiest 24 hours for the fleet |
| Solar — highest daily output | ↑ | The brightest clear-sky day |
| Renewables — highest combined day | ↑ | Wind + solar + BESS all firing |
| Demand — peak 5-min MW | ↑ | The system's biggest pull of the period |

Records are scoreboard-specific — they communicate the transition rather than duplicating the raw-peak records on the BESS Portfolio page. BESS headline records (max 5-min discharge, max daily discharge) live on \`/intelligence/bess-portfolio → Live & Records\` — we link out rather than duplicating.

## Storyline chips

Four chips surface the percentage change from the earliest to latest year for each fuel tech, with the absolute values underneath. We auto-pick the latest year with enough coverage (≥93 YTD days for the in-progress year, ≥300 days for historical) so a sparse 2026 row can't produce a spurious -100% chip for fuel techs that are still populating.

## Data pipeline

The scoreboard joins three tables:

1. **\`dispatch_availability\`** — 5-min coal dispatch. Populated by \`import_dispatchload.py\` from NEMWEB MMSDM DISPATCHLOAD archives. 5 years × 44 coal DUIDs = ~24M rows.
2. **\`generation_daily\`** — daily MWh per solar / wind / BESS DUID. Populated by \`import_generation_daily.py\`, which re-parses the *same cached MMSDM zips* with an expanded DUID filter (208 DUIDs from \`aemo_generation_info\`). Aggregates to daily at parse time so the table stays small (~270k rows across 60 months).
3. **\`demand_daily\`** — daily MWh + peak MW per NEM region. Populated by \`import_dispatch_regionsum.py\` from MMSDM DISPATCHREGIONSUM. ~9k rows.

Exporter: \`export_energy_transition()\` in \`pipeline/exporters/export_json.py\` produces \`analytics/intelligence/energy-transition.json\`.

## The NSW narrative — Liddell in motion

NSW is the state where the transition tells the sharpest story. Liddell Power Station (4 × 500 MW black coal, commissioned 1971-1973) closed on 28 April 2023. You can see the ripple in the data:

- **Coal tonnage UP, not down** — the four remaining NSW coal plants (Eraring, Bayswater, Mount Piper, Vales Point B) ran harder to cover Liddell's 8+ TWh/yr gap.
- **Wind +53% YTD** (1.4 → 2.1 TWh Jan-Apr 2021→2025) — new Sapphire, Bango, Rye Park wind farms commissioning.
- **Solar +188% YTD** (1.0 → 2.8 TWh) — dramatic CIS-funded and privately-developed solar buildout.
- **BESS from 0 to 32 GWh YTD** — Eraring Big Battery, Waratah, Liddell Battery come online.
- **Demand essentially flat** — the buildout is reshaping supply, not meeting growing load.

This is why NSW is the flagship state view: the coal-retirement transition is visible in real operational data, not projected.

## Known limitations

1. **2026 coal data goes to 17 Apr; solar/wind/BESS only to the end of the cached archive month (currently Feb 2026).** AEMO publishes MMSDM archives ~45 days after month end.
2. **BESS 2021-2023 was tiny** — the fleet really started growing in 2024. Our scoreboard reflects reality: near-zero BESS through 2023, visible from 2024.
3. **Demand peak is "sum of regional 5-min peaks"** — this overstates the true concurrent NEM peak because not all regions peak in the same 5-min interval. The NSW/QLD/VIC/SA/TAS individual peaks are accurate.
4. **DUID coverage** — we filter to \`In Service\` + \`In Commissioning\` DUIDs from \`aemo_generation_info\` (208 DUIDs). Projects registered but not yet commissioning aren't counted. This matches operational reality.

## Cross-references

- **Coal Watch → YTD Comparison** — same same-period comparison pattern but coal-only, with station-level drill-down
- **BESS Portfolio → Live & Records** — structural BESS records (max discharge, max throughput)
- **BESS Bidding** — per-DUID bid-stack analysis for the BESS fleet
`,
  },
  {
    id: 'coal-outage-vs-dispatch',
    title: 'Coal Outage vs Dispatch Erosion',
    description: 'How AURES distinguishes coal unit unavailability from market displacement — plus YTD same-period comparison across 5 years.',
    icon: '🔥',
    category: 'technical',
    readingTime: '7 min read',
    added: '2026-04-14',
    updated: '2026-04-17',
    content: `# Coal Outage vs Dispatch Erosion

The Coal Watch page on \`/intelligence/energy-mix\` now includes an **Outage vs Dispatch** decomposition across all 15 NEM coal stations (NSW / QLD / VIC, ~21 GW nameplate). This guide explains the distinction, why it matters, and how the signal is computed.

---

## Why it matters

When a coal unit's monthly output drops, there are two very different explanations — and they tell completely different stories about the energy transition:

1. **Outage** — planned maintenance or unplanned trip. The unit is physically unavailable. **A mechanical event, not a structural market shift.** Callide C Unit 4's explosion in 2021 took 2 GWh/day off the system for months — but that reduction said nothing about whether coal was being displaced.

2. **Dispatch erosion** (a.k.a. "displacement") — the unit is available and bidding into the market, but cheaper renewables are pushing it out in the merit order. **This is the structural signal of coal's decline.** A solar-rich state pushing Eraring's midday output to minimum stable load every day is dispatch erosion.

Conflating these two produces misleading conclusions. A station with 20% CF because it had a 3-month forced outage is very different from a station with 20% CF because it gets cycled off-and-on by renewables.

---

## How we detect each

The exporter uses AEMO's NEMWEB **DISPATCHLOAD** table, which publishes two key numbers per DUID per 5-minute interval:

- **\`AVAILABILITY\`** — MW the unit has offered as available for dispatch
- **\`TOTALCLEARED\`** — MW the unit was actually dispatched for

Three classifications per interval:

| Mode | Rule | Interpretation |
|---|---|---|
| **Outage** | \`availability < 20% of unit capacity\` | Unit unavailable (partial or full outage) |
| **Displaced** | \`availability ≥ 20%\` AND \`total_cleared < 30% of availability\` | Unit offered, market didn't take it |
| **Dispatched** | \`total_cleared ≥ 30% of availability\` | Normal operation |

These thresholds are deliberate:
- **20%** reflects that coal units have minimum stable generation at ~40-60% of capacity — offering below 20% means the unit effectively can't run
- **30%** accounts for minimum-load constraints and ramp rates — a unit dispatched at 25% of what it offered is genuinely being displaced

---

## Aggregation hierarchy

Data aggregates at three levels:

### NEM-wide
- Total outage hours / displaced hours / dispatched hours across all 44 coal DUIDs
- Total MWh displaced — the capacity the market *could* have had from coal but didn't take

### State-level
Breakdowns for NSW (4 stations, 8.2 GW), QLD (8 stations, 8.2 GW), VIC (3 stations, 4.8 GW). This surfaces regional patterns — e.g. QLD's daytime solar push vs VIC's wind-heavy evenings.

### Station-level
All 15 operational stations with outage / displaced / dispatched % plus closure year. Enables direct comparison between Yallourn (old brown coal, closing 2028) vs Kogan Creek (newer supercritical black, 2042 close).

---

## What the numbers *should* look like

When DISPATCHLOAD data is populated, expect patterns like:

- **Dispatch % declining** year-on-year in NSW / VIC as renewables build
- **Outage %** clustered around 10-15% for well-maintained fleets, higher (20%+) for older brown coal
- **Displaced %** rising steadily — this is the structural signal
- **QLD > NSW > VIC** for dispatched % in current data (QLD keeps more coal running due to weaker grid interconnection)

Without DISPATCHLOAD data the page shows all structural metadata (stations, DUIDs, capacity, closure dates) but the percentage columns sit as "—" until you run the importer.

---

## Running the importer

\`\`\`bash
# Last 7 days from NEMWEB Current
python3 pipeline/importers/import_dispatchload.py --days 7

# Or a specific historical month
python3 pipeline/importers/import_dispatchload.py --month 2025-12
\`\`\`

The importer:
- Filters to only the 44 coal DUIDs (not all ~400 NEM DUIDs — small footprint)
- Caches zips at \`data/nemweb_cache/\`
- Respects NEMWEB's CSV format (skips C/I header rows, parses D rows)
- Classifies each interval on insert
- Fails gracefully on bad zips, logs continue

First-run volume: a 12-month backfill is ~12 MB of filtered data. Rebuilding from scratch takes ~5-10 minutes over a decent connection.

---

## Known limitations

1. **Classification thresholds are heuristic.** 20% and 30% reflect typical coal dispatch dynamics; edge cases (ramp constraints, ancillary service offers, minimum-load violations) can miscategorise intervals. The alternative — parsing every rebid reason and ancillary-service cap — is out of scope.

2. **No outage cause attribution.** We identify *that* the unit was unavailable, not *why*. Callide C's 2021 explosion and a routine Bayswater boiler clean both read as "outage". Cross-referencing to AEMO Market Notices would disambiguate — queued for a future enrichment.

3. **"Displaced" doesn't mean "permanently lost".** A unit displaced during peak solar hours is still available for evenings. The page reports hours in each mode, not a verdict.

4. **DUID list is point-in-time accurate** (verified 2026-04-17). New units or rebrands require updating \`pipeline/config/coal_stations.json\`.

5. **5-minute data is aggregated to hours by dividing by 12 (12 × 5-min = 1h).** For MWh calculations, \`cleared_mw × hours\` ignores within-interval variation — small effect.

6. **NEMWEB platform migration 21 April 2026** may change URLs / case sensitivity. The importer's base URL constants would need updating. See: aemo.com.au/energy-systems/electricity/national-electricity-market-nem/data-nem/market-data-nemweb

---

## Cross-references

- \`/intelligence/energy-mix\` → **Coal Watch** tab for the main decline narrative
- **Asset Lifecycle & Repowering** guide for closure-timeline analysis
- **Revenue Intelligence** for how coal revenue has tracked this dispatch erosion
- Station closure dates and battery replacements: coal-watch.json + pipeline/config/coal_stations.json

## v2.29 — YTD same-period comparison (new tab)

The Coal Watch page now also has a **YTD Comparison** tab answering a different question: *is coal generation declining year-on-year, once you compare the same calendar window?*

- Aggregates \`dispatch_availability\` into per-(year, day-of-year, DUID) MWh
- Two windows per year: **YTD** (Jan 1 → cutoff day-of-year) and **full calendar year**
- Scope pills: NEM / NSW / QLD / VIC — the three coal states plus NEM-wide
- Year pills switch the featured year. Auto-defaults to YTD for the current year, full-year for historicals
- Station breakdown bar chart for the selected year × scope
- Year-over-year table comparing 2021-2026 at the chosen window

With five years of backfilled DISPATCHLOAD data (~24M 5-min rows, Jan 2021 → Apr 2026), the YTD comparison makes the coal decline unambiguous: NEM YTD capacity factor went from 67.5% (2021) → 64.0% (2025) → 60.5% (2026 so far, Jan 1 → 17 Apr).

See the **Energy Transition Scoreboard** guide for the companion stacked view that folds solar / wind / BESS / demand on top of this coal trend.
`,
  },
  {
    id: 'risk-probability-signals',
    title: 'Risk & Probability Signals',
    description: 'Supply chain concentration, at-risk OEM exposure, developer-OEM chain risks, and forward-looking CIS/LTESA win probability.',
    icon: '⚠️',
    category: 'technical',
    readingTime: '8 min read',
    added: '2026-04-12',
    content: `# Risk & Probability Signals

The \`/intelligence/risk-signals\` page bundles **T3.I Supply Chain Concentration Risk** and **T3.J Scheme Win Probability** — two forward-looking views that help anticipate where the market is exposed and which development projects are best positioned for the next scheme round.

## Why it's one page

Both features answer a similar question framed differently:
- **T3.I** looks backward at installed fleet concentration (where is failure cost amplified?)
- **T3.J** looks forward at development pipeline fit (which projects will win next?)

Putting them together in five tabs lets you pivot from "where are today's risks" to "where's the next opportunity" without leaving the page.

---

## T3.I Supply Chain Concentration Risk

Three signals surfaced.

### Dominance matrix

Cells where a single OEM holds ≥40% of installed MW within a (technology × state × role) cohort. Thresholds:

| Classification | Share | Current cells |
|---|---|---|
| 🏴 Monopoly | ≥75% | 3 |
| ⚠️ Dominant | 50-74% | 5 |
| Concentrated | 40-49% | 3 |

Notable current state:
- **Vestas TAS wind** = 100% monopoly (4/4 projects, 561 MW). Makes sense given Tasmania's small wind fleet.
- **EKS Energy (Hitachi) NSW BESS inverter** = 77% (driven by Waratah Super Battery).
- **SMA VIC solar inverter** = 76%. SMA dominates Australian solar inverters.
- **Vestas VIC wind** = 68% (13/24 projects, 4.8 GW).

### At-risk OEMs

Projects using OEMs whose parent is bankrupt, absorbed, or stressed. Three OEMs on the flag list have live project exposure:

- **Suzlon** — 7 projects, 697 MW (NSW, SA, VIC). Stressed balance sheet, minimal AU support.
- **Senvion** — 5 projects, 741 MW (SA, VIC). Parent filed insolvency 2019, absorbed by Siemens Gamesa with reduced support.
- **Acciona Windpower** — 1 project, 192 MW (VIC — Waubra). Absorbed into Nordex 2016.

Note the risk is about spare-parts availability and service warranty coverage, not certain failure. A well-maintained Senvion fleet can keep running; the concern is what happens when something breaks.

### Dev-OEM chain risks

Single-developer-single-OEM pairings where one supplier accounts for ≥50% of that developer's fleet in one role. Current state (2 chains flagged):

- **Equis Energy / SEC Victoria × Tesla** (bess_oem) — 3 BESS projects, 100% of their BESS fleet
- **Lake Bonney Wind Power × Vestas** (wind_oem) — 3 wind projects, 100% of their wind fleet

These aren't bad — Tesla and Vestas are fine OEMs — but they flag where any supply-chain disruption would cascade across the developer's whole portfolio.

---

## T3.J Scheme Win Probability

Heuristic composite (0-100) predicting which development-stage projects are most likely to win future CIS / LTESA / scheme rounds. 782 development projects scored.

### The model

| Component | Max pts | How |
|---|---|---|
| **Developer track record** | 30 | A = 30, B = 22, C = 15, D = 8, F = 0 from developer-scores.json |
| **Tech fit** | 20 | BESS + pumped_hydro = 20 (dispatchable rounds); hybrid = 18; wind = 15; solar = 12; offshore_wind = 10 |
| **Project size fit** | 15 | 100-500 MW = 15 (sweet spot); 50-100 or 500-1000 = 10; others = 5 |
| **Readiness** | 20 | has_cod (5) + has_rez (5) + has_eis (5) + planning_submitted (5) |
| **Repeat-winner bonus** | 15 | 5 pts per prior scheme win, capped at 15 |

### Bands

- **High** (≥75) — 2 projects currently (Haughton BESS 200 MW QLD Pacific Hydro grade A; Karara BESS 400 MW QLD Acciona Energy grade A)
- **Medium** (55-74) — 260 projects
- **Low** (35-54) — 462 projects
- **Very low** (<35) — 58 projects

### What the scoring reflects

The heuristic rewards:
1. **BESS in dispatchable-leaning rounds.** CIS Tender 1 and 3 both targeted dispatchable; NSW LTESA Round 2 targeted firming. Any BESS in NSW / QLD / VIC with an A/B developer and reasonable size scores well.
2. **Proven developers.** Grade A is 3× the points of grade D. This matches reality — scheme administrators favour known successful deliverers.
3. **Project readiness.** Has COD, REZ, EIS → signals a serious submission. Early-stage projects with no planning work are long shots.
4. **Repeat winners.** Developers who've won before generally win again.

## Known limitations

1. **It's a heuristic, not a trained model.** We don't yet have enough scheme-round data to train a real classifier. The weights are judgement-based, informed by the 6 CIS tenders and 6 LTESA rounds to date.
2. **Tech fit is round-dependent.** The current weights blend generation and dispatchable round appetites. A strictly-generation round (no BESS) would flip the ranking.
3. **Size fit uses standard caps.** A project outside the 100-500 MW band can still win — the score just reflects that historical round outcomes lean to that band.
4. **Existing scheme winners currently excluded.** Projects that already hold a scheme contract don't show up in the ranked list (they can't win again for that project).
5. **No state quota handling.** Recent CIS rounds have had implicit state caps (e.g. NSW capacity ceiling) that aren't in the model. A high-scoring NSW project may still get squeezed out on state quota.
6. **Model score is a relative ranking signal, not an absolute probability.** A score of 75 doesn't mean "75% chance of winning" — it means "this project clusters with historically-successful submissions."

## Cross-references

- **OEM Intelligence** — full HHI and top-3 per role; the Dominance Matrix here is a complementary lens
- **Asset Lifecycle & Repowering** — at-risk OEMs feed into the refurbishment scoring too
- **Scheme Tracker** — actual scheme round outcomes (historical CIS + LTESA)
- **Developer Intelligence** — per-developer grade and scheme win history
`,
  },
  {
    id: 'asset-lifecycle-repowering',
    title: 'Asset Lifecycle & Repowering',
    description: 'How operating fleet age is tracked, how repowering candidates are scored, and how the fleet turnover forecast is built.',
    icon: '🔁',
    category: 'technical',
    readingTime: '7 min read',
    added: '2026-04-10',
    content: `# Asset Lifecycle & Repowering

The \`/intelligence/asset-lifecycle\` page takes the operating fleet and answers: **how old is it, which projects are due for repowering, which OEMs are carrying the aging exposure, and when does the replacement wave hit?**

## Why this matters

The Australian renewable fleet commissioned most of its wind capacity between 2007 and 2018 — meaning 59 operating projects are now ≥15 years old, and will face end-of-life decisions over the next decade. Wind turbines are typically designed for 20-25 years. Solar panels degrade but can run 25-30+ years. BESS cells lose cycle capacity over 10-15 years depending on duty cycle. Pumped hydro is effectively open-ended with periodic refurbishment.

Smart operators plan repowering 5-10 years in advance. The page surfaces the fleet-level picture.

## The refurb score (0-100)

Each operating project gets a composite score indicating repowering likelihood. Three components:

| Component | Max | Reasoning |
|---|---|---|
| **Age** | 60 pts | Linear 0 → 60 across 0 → 25 years. Pumped hydro is excluded because hydro refurbishes in place rather than repowers. |
| **OEM risk** | 25 pts | 25 if primary OEM is bankrupt / absorbed / withdrawn (Senvion, REpower, Acciona Windpower, Suzlon). 15 if Vestas legacy model (V66/V80/V82/V90). 0 otherwise. |
| **Performance underperformance** | 15 pts | Scaled by how far below the state-tech median CF the project sits. Also triggered by declining CF trend (-1%/y or worse). |

A score of **80+** reflects high age + stressed OEM + material underperformance. **60-80** is worth watching. **40-60** may be normal mid-life operation; not every mid-aged asset needs repowering.

### The OEM risk list

At-risk OEMs in the database:
- **Senvion** — filed for insolvency 2019. Brand absorbed by Siemens Gamesa but legacy units have limited aftermarket support.
- **REpower** — Senvion's previous name. Same situation.
- **Suzlon** — long-running balance sheet stress. Still operating globally but minimal AU presence for new spares.
- **Acciona Windpower** — absorbed into Nordex in 2016. Older AW77 / AW82 fleet has reduced support.
- **Vestas (legacy)** — V66/V80/V82/V90 are out of current service programs. Vestas still supports them for existing customers but new spares are limited.

## Tabs

### Overview
Top-line stats, fleet age by technology, COD year profile, and an **aging OEM exposure** list.

### Age Distribution
Bucket histograms per technology (<5y / 5-10y / 10-15y / 15-20y / 20-25y / 25y+), plus a full 225-row DataTable of every operating asset with age, OEM, CF latest, and CF trend.

### Refurb Candidates
Ranked 74 candidates (excludes pumped hydro). Columns include OEM model, CF gap to state median, and at-risk OEM flag. Score is colour-banded:
- ≥80 → red (high signal)
- 60-79 → amber
- 40-59 → yellow (worth tracking)
- <40 → neutral

### OEM Fleet Ages
Per-OEM fleet averages, %-over-15-years, and at-risk flag. **Hydro OEMs** (Fuji Electric, Toshiba, Voith, Boving, English Electric) show extremely old fleets because hydro turbines are designed for 50+ year lifetimes — refurbished in place rather than replaced. These are not repowering candidates. Wind-OEM aging is the real signal.

### Fleet Turnover Forecast
Assumes a 25-year nominal operating life and plots projected end-of-life year by project count and MW. Key near-term turnover:
- **2026** — 4 projects / ~1 GW (mostly pumped hydro — will be refurbished)
- **2028** — 2 projects / 87 MW (wind)
- **2029-2036** — accelerating wind turnover, 3-7 projects per year

### Historic Deals
Placeholder until more ownership_history data accumulates. Currently 12 records in the database; future enrichment passes will expand this.

## Known limitations

1. **25-year nominal life is approximate.** Many wind farms are being extended to 30 years with targeted refurbishment (blade upgrades, gearbox swaps). Some will be fully repowered (new bigger turbines on the same site). Others will be retired. The turnover forecast is a planning signal, not a schedule.
2. **Refurbishment ≠ repowering.** "Refurb" in industry parlance can mean swapping sub-components while keeping the same nameplate — different capex and permitting than a full repower (replace turbines, often larger).
3. **At-risk OEM list is conservative.** A Senvion fleet with strong O&M contracts and spare-parts hoarding can still be delivering today. The flag indicates risk of availability gaps, not certainty of failure.
4. **CF underperformance only counts when both latest-year CF and state-tech median are available.** Smaller states (like TAS with one solar farm) will show no CF gap.
5. **Hydro OEM ages look alarming** (avg 45-80 years) because hydro is just old. The UI explicitly notes this is not a repowering signal.
6. **Refurb candidates intentionally exclude pumped hydro.** Hydro fleet refurbishment happens in place via overhaul programs (e.g. Snowy refurb projects, Tasmania's "Battery of the Nation") and is better tracked there.

## Cross-references

- **Performance Metrics** guide — full definition of capacity factor and composite score used for the underperformance signal.
- **OEM Intelligence** page — per-OEM fleet profile + market concentration.
- **Developer Intelligence** page — ownership track record for the acquiring / replacement parties.
`,
  },
  {
    id: 'solar-resource',
    title: 'Solar Resource',
    description: 'How the solar capacity-factor benchmarks are built, what the rating thresholds mean, and the difference between small and utility-scale solar CF.',
    icon: '☀️',
    category: 'technical',
    readingTime: '6 min read',
    added: '2026-04-09',
    content: `# Solar Resource

The \`/intelligence/solar-resource\` page is the solar equivalent of the Wind Resource deep-dive — it shows every operating solar farm's capacity factor, benchmarks them by state / REZ / capacity class, and projects predicted CF for development-pipeline projects.

## Why solar CF is different to wind CF

Wind CF can reach 45-50% at the best sites. **Solar CF is fundamentally capped by the sun** — a perfectly sized, perfectly sited, zero-curtailment solar farm in Northern Australia maxes out around 30-32% on annual CF, because roughly 12 of every 24 hours is night-time and the winter low-sun months pull the annual average down.

The page uses solar-specific CF rating thresholds:

| Rating | CF% | Notes |
|---|---|---|
| **Excellent** | ≥ 29% | Northern QLD / tracker-equipped sites |
| **Good** | 24 – 29% | Most NSW / VIC / QLD operating fleet |
| **Average** | 20 – 24% | SA / older fixed-mount sites |
| **Below Average** | < 20% | Heavily curtailed or older equipment |

Compared to wind, where Excellent starts at 35%+ — the scale is shifted down to reflect solar's underlying physics.

## The capacity-class signal

Solar has an unusual pattern that wind does not: **larger plants tend to have lower CF**. The Capacity Class Benchmarks section surfaces this directly. Two reasons:

1. **Inverter clipping** — utility-scale solar is typically built with a DC-to-AC ratio ≥ 1.3, meaning the DC panel capacity exceeds the AC inverter capacity. On sunny days around noon, the inverters "clip" and can't push all the generated DC output through. This costs a few percentage points of CF by design (it's a cost-optimal trade-off).
2. **Network curtailment** — large plants in heavily-developed REZs get hit harder by AEMO / network constraint directions, especially during midday.

Small solar farms (<50 MW) typically see 1-3% higher CF than utility-scale (300+ MW) in the same state. This isn't a performance problem — larger plants are optimising for \$/MWh built, not raw CF.

## State benchmarks (2024 dispatch year)

Approximate state averages from the current fleet:

| State | Avg CF | Sample size |
|---|---|---|
| VIC | 25.4% | 13 projects |
| QLD | 23.5% | 28 projects |
| NSW | 22.8% | 33 projects |
| SA | 18.9% | 4 projects |

VIC's lead is partly curtailment-adjusted: VIC's market has had less midday solar over-supply than QLD.

## Development pipeline predictions

The Development Pipeline Predictions table projects each pipeline project's CF using its state's operating fleet average. This is a **floor estimate** — new projects with modern panels and tracking should outperform the state average, but the average is the honest starting point when we don't yet have real dispatch data.

## Known limitations

1. **Tracker vs fixed-mount isn't broken out** — solar tracker data lives in individual project EIS documents but isn't systematically extracted yet. A solar farm with a single-axis horizontal tracker can outperform a fixed-mount equivalent by 10-15% on annual CF. The data is present in the underlying EIS PDFs; parsing it is a future enrichment job.
2. **No rooftop PV interaction** — this page only covers utility-scale projects. Behind-the-meter rooftop PV reduces daytime demand and can indirectly suppress utility-scale capture, but isn't modelled here.
3. **Developer fleet benchmarks are empty** — no developer currently has ≥ 3 operating solar farms in their portfolio. As the pipeline commissions over 2026-2028, this section will populate.
4. **REZ benchmarks sparse** — most solar farms aren't yet formally assigned to a declared REZ.

## Cross-references

- See the **Performance Metrics** guide for the full CF definition and how it's computed from OpenElectricity API data.
- See the **Dunkelflaute Monitor** for the climate context — when solar underperforms system-wide.
- See the **Revenue Intelligence** page for how solar price capture (\$/MWh) varies by tech and state.
`,
  },
  {
    id: 'bess-portfolio-intelligence',
    title: 'BESS Portfolio Intelligence',
    description: 'Duration trends, grid-forming tracker, co-located hybrid projects, cell chemistry from EIS, and the network-services contract registry.',
    icon: '🔋',
    category: 'technical',
    readingTime: '8 min read',
    added: '2026-04-09',
    content: `# BESS Portfolio Intelligence

The \`/intelligence/bess-portfolio\` page is the battery-side counterpart to Wind/Solar Resource. Instead of capacity factor (BESS CF is meaningless — it's dispatch-controlled), it surfaces the **structural shape** of the Australian BESS fleet: duration, grid-forming adoption, co-location, cell chemistry, and system-service contracts.

---

## The 6 tabs

### 1. Overview

Stat cards (431 total BESS, 32 operating, 11 GFM, 34 EIS-verified chemistry) plus three signals:
- **Duration is doubling** line chart — avg / median duration by COD year shows the industry-wide shift from 1-2h in 2017-2022 to 4+ hours in 2027+ commitments.
- **LFP dominates** — the EIS-verified set is 33 LFP : 1 NMC.
- **GFM stat line** — 11 of 431 BESS (2.6%) are grid-forming, clustered in recent commissions.

### 2. Duration

The core BESS supply-side trend. Three views:

1. **Buckets by status** — operating fleet clusters in 1-2h and 2-4h; development pipeline dominates 4-8h with 14 projects at 8h+.
2. **Summary cards** — avg / median / max duration per status.
3. **Evolution by COD year** — the 2017 cohort averaged 0.89h; 2028-2029 cohort averages 4.0h+. Background area shows total MWh committed to each year.
4. **Top-20 longest-duration table** — dominated by 8h+ committed pipeline projects.

### 3. Grid-Forming

Grid-forming (GFM) inverters provide voltage and frequency support that grid-following inverters cannot. As coal retires, synchronous machine inertia drops — GFM batteries and synchronous condensers become essential.

Current fleet (11 projects):
- Eraring Battery (NSW, 700 MW / 3,160 MWh / 4.5h) — largest GFM
- Tomago BESS (NSW, 500 MW / 2,000 MWh / 4h)
- Liddell BESS (NSW, 500 MW / 1,000 MWh / 2h)
- Western Downs Battery (QLD, 510 MW)
- Victorian Big Battery (VIC, 300 MW / 450 MWh)
- Plus 6 smaller NSW/VIC/QLD projects

NSW dominates GFM adoption. Queensland state-owned projects (CleanCo, Stanwell) are also investing in GFM.

### 4. Co-located (hybrid)

92 hybrid projects — solar+BESS and wind+BESS sharing a connection point. One operating (development/construction heavy). BESS is typically sized at 30-50% of generator AC capacity to:
- Absorb curtailment (peak solar hours)
- Shift output to evening peak (6-9pm)
- Provide frequency response (if GFM)

This is a huge pipeline but almost none is operating yet — expect 2027-2029 to reshape the fleet.

### 5. Chemistry

From \`eis_technical_specs\` — 34 projects with verified cell chemistry from published EIS documents. Coverage is thin (~8% of the BESS fleet) because most development-stage projects don't publish EIS with cell specs, and most operating-stage projects commissioned before systematic EIS parsing began.

What's visible:
- **LFP** (Lithium Iron Phosphate) = 33 / 34 verified projects
- **NMC** (Nickel Manganese Cobalt) = 1 / 34
- Top cell suppliers in the EIS set: CATL (via Tesla Gigafactory), BYD, direct CATL, Samsung SDI

Why LFP wins:
- Thermal stability (safer in stationary applications)
- Longer cycle life
- No cobalt (cheaper, less supply-chain risk)
- Lower energy density matters less on a stationary MWh footprint

PCS type split in the same 34 projects: 17 grid-forming, 17 grid-following. Developers are roughly evenly split on whether to take on the GFM premium.

### 6. Network Services

BESS projects holding specific system-service contracts — SIPS (System Integrity Protection Schemes), FCAS tolling, and network augmentation agreements. Currently 4 documented contracts:

- **Waratah Super Battery** (NSW EnergyCo SIPS) — 700 MW reserved for shock-absorber service, 5.5-year contract from 2025
- **Victorian Big Battery** (AEMO SIPS) — 250 MW reserved summer-peak, 11-year contract from 2021
- **Torrens Island BESS** — the entry was flagged during research as likely mis-attributed (AGL-owned merchant battery with no publicly disclosed SA Government contract)

These contracts usually pay an **availability fee** (annual \$/MW-year) rather than a \$/MWh energy price. Exact fees are commercial-in-confidence but AER revenue determinations set the regulated ceiling.

---

## Known limitations

1. **Chemistry coverage is 8%** of the fleet. As more projects publish EIS (required for most development approvals), this will grow.
2. **GFM flag comes from developer disclosure** — the 11 flagged projects are conservative. Some projects use inverters that are technically capable of GFM but not explicitly marketed or contracted as such.
3. **Co-located doesn't distinguish AC vs DC coupling** — a DC-coupled hybrid (BESS wired to the solar inverter DC bus) behaves differently to AC-coupled (BESS has its own inverter). The distinction matters for revenue modelling but isn't systematically captured.
4. **Duration is computed as \`storage_mwh / capacity_mw\`**. Some larger projects are published with only MW (no MWh), giving null duration. They're excluded from distribution charts.
5. **Operating BESS avg duration (1.83h) under-states reality** — the operating fleet is dominated by 2017-2022 vintage, before the shift to 4h. Look at the COD-year evolution line for the forward trend.
6. **Network services list is thin (4 contracts)** because it's sourced from the \`offtakes\` table. More contracts may exist but are undocumented publicly.

---

## Cross-references

- **BESS Capex** — \$/kWh by OEM, capex evolution over COD years
- **BESS Bidding** — revenue + dispatch behaviour, not structural
- **OEM Intelligence** — BESS tab, for supplier concentration
- **Offtaker / PPA Mapper** — tolling contracts and SIPS-type arrangements live there too
`,
  },
  {
    id: 'contractor-intelligence',
    title: 'Contractor Intelligence',
    description: 'How the EPC/BoP contractor layer is structured, how concentration is measured, and what the developer × contractor + contractor × OEM matrices reveal.',
    icon: '🏗️',
    category: 'technical',
    readingTime: '7 min read',
    added: '2026-04-08',
    content: `# Contractor Intelligence

The \`/contractors\` page is the intelligence layer's view of the Australian renewable build market — who's physically constructing these projects, which OEM partners they pair with, and which developers they deliver for. This guide explains what's tracked, how concentration is measured, and the current limitations.

---

## What we mean by "contractor"

AURES tracks **two contractor roles**:

| Role | What it covers | Typical examples |
|---|---|---|
| \`epc\` | Engineering, Procurement & Construction — the firm responsible for end-to-end project delivery | RCR Tomlinson, Beon Energy Solutions, Sterling & Wilson, PCL Construction, UGL, METKA EGN, Biosar |
| \`bop\` | Balance of Plant — the civil / electrical / interconnection works around the core equipment | Consolidated Power Projects (CPP), Zenviron, NuEnergy Infrastructure |

Some firms operate in both roles on different projects — CPP is the clearest example, doing **both EPC and BoP** on BESS projects including Waratah Super Battery.

**Not tracked here**:
- OEMs / equipment manufacturers — see the [OEM & Supplier Data](./oem-supplier-data) guide and \`/oems\`
- Sub-contractors one level down (civil works, mounting structures, cabling)
- O&M operators (post-commissioning)

---

## Source data

Contractor rows come from \`suppliers\` where \`role IN ('epc', 'bop')\`. Each record is attributed to:
- A specific project
- An optional contract value, model note, and source URL
- Research provenance (AEMO registry, developer announcement, ASX disclosure, RenewEconomy / PV Magazine coverage)

Total coverage: 71 contractors across 115 EPC records + 21 BoP records.

---

## Market concentration — how it's measured

The Overview tab shows a **Herfindahl-Hirschman Index (HHI)** per role, computed over installed MW market share — identical methodology to the OEM intelligence page.

| Role | HHI | Top-3 Share (MW) | Reading |
|---|---|---|---|
| **EPC** | 389 | 24% | Highly competitive — 63 firms |
| **BoP** | 1,417 | 58% | Moderately concentrated — 12 firms |

**EPC is one of the most fragmented segments in the renewable supply chain** — dozens of national and international firms competing on project-by-project tenders. BoP is far more concentrated because the work is more specialised and local. CPP + Zenviron + NuEnergy hold over half of BoP activity.

---

## The four tabs

### 1. Overview
- Stat cards: total contractors, EPC firms, BoP firms, most concentrated role
- Horizontal HHI chart with competitive / moderately-concentrated / highly-concentrated bands
- Top-3-per-role summary table
- Most Active Developer-Contractor Pairings — the top-15 repeat relationships

### 2. EPC tab
- Market share pie (top 10 + "Other")
- Full EPC firms DataTable with columns: Contractor, Category, Projects, MW, Top Tech, Top OEM Partner, Top Developer
- Sortable, CSV export

### 3. BoP tab
- Same structure as EPC, filtered to the 12 BoP firms

### 4. Developer × Contractor
- Full matrix of 125 pairings sorted by project count
- Highlights preferred-partner relationships

### 5. Directory
- Original filterable card grid preserved

---

## Standout findings

**The CPP × Tesla partnership is the single strongest contractor-OEM signal in the database** — CPP has delivered 8 projects with Tesla Megapack as the BESS OEM, including Akaysha Energy's Orana BESS and Waratah Super Battery.

Other strong pairings:
- **Akaysha Energy × CPP** — 5 projects, both EPC and BoP, 1,936 MW — the strongest developer-contractor relationship
- **RCR Tomlinson × First Solar** — 4 solar projects (thin-film specialisation)
- **Zenviron × Vestas** — 3 wind projects (BoP for V150/V162 rollouts)
- **Beon × SMA** — 3 solar projects (inverter pairing)
- **Samsung C&T / Genus Plus JV × Tesla** — 3 BESS projects including the Equis Energy / SEC Victoria portfolio

---

## Individual contractor pages

\`/contractors/:slug\` shows:
- Summary pills — category, roles, top OEM partner, top developer client
- Go-to OEM Partners — table with OEM (linked to \`/oems/:slug\`), role pill, project count
- Top Clients (Developers) — table with developer (linked to \`/developers/:slug\`), project count
- Project Portfolio — every project this contractor has worked on with role, tech, state, status, MW, developer, external source link. Sortable, CSV export.
- Summary charts — capacity by technology + pipeline status

---

## Known limitations

1. **COD drift per contractor is weak signal.** The database has drift data on operating projects but the per-contractor averages come out near zero because cod_original often matches cod_current in the source data. A true "delivery track record" per contractor needs more granular construction-phase milestones.
2. **Only EPC and BoP are tracked.** Specialist subcontractors (civil works, mounting, cabling) aren't in the database. A project may list CPP as EPC but use five subcontractors for site works — we only see the head contract.
3. **Some JVs are treated as single entities.** "Samsung C&T / Genus Plus JV" is one row, not two. This is deliberate but means the underlying partner firms aren't independently visible.
4. **Pipeline project contractors are often unknown.** The database is strongest on operating and construction projects. Many development-stage projects don't name their EPC until FID.
5. **BESS skews the data heavily.** CPP appears at the top of most tables because BESS is the largest segment of contractor activity and CPP is the dominant BESS integrator. This is a real market signal — not a data artefact — but it means EPC ranking can look different when you filter by tech.

---

## Want to verify?

- Each contractor record carries a \`source_url\` where possible
- Raw aggregation: \`analytics/contractor-analytics.json\` (~90kB)
- Raw profiles: \`indexes/contractor-profiles.json\`
- Top-level stats on the Contractor Intelligence Overview tab
`,
  },
  {
    id: 'lifecycle-quartile-matrix',
    title: 'Lifecycle Quartile Matrix',
    description: 'The state-of-the-nation grid — how every project in the NEM is scored and quartile-ranked at each lifecycle stage.',
    icon: '🎯',
    category: 'technical',
    readingTime: '9 min read',
    added: '2026-04-07',
    content: `# Lifecycle Quartile Matrix

The \`/intelligence/lifecycle-quartile\` page is the intelligence layer's capstone view — every project in the NEM pipeline, grouped by **technology × state × stage**, with a stage-appropriate quartile score in each cell. It's the single view that answers "where are we, at a glance?"

This guide explains the three scoring systems behind the matrix, what "Q1 vs Q4" means in each stage, the data limits, and how to use the drill-through.

---

## The stages

Every project in AURES sits in one of three stage groups:

- **Operating** — project is commissioned and dispatching. 220 projects scored.
- **Construction / commissioning** — FID has passed, physical build is underway or complete but not yet operating. 56 projects scored.
- **Development** — pre-FID: planning, permitting, grid connection, equipment procurement. 782 projects scored.

Total: **1,058 projects** plotted across 63 non-empty cells in the matrix (6 techs × 6 states × 3 stages = 108 possible cells; sparse cells for hydro and offshore wind leave 45 empty).

---

## How each stage is scored

Every project gets a single score (0-100ish) on a stage-specific formula. Within each cell (tech + state + stage), we rank projects, split into quartiles, and render the mix as a coloured strip.

### Operating — fleet performance

Uses the **composite score** from the annual league tables (see the Performance Metrics guide). This is a weighted blend of:

- 40% capacity factor
- 40% revenue per MW
- 20% curtailment (inverted)

For BESS: 30% revenue + 30% utilisation + 20% spread + 20% cycles.

**Q1 = top-25% of the project's (tech, state) cohort**. If a league-table quartile is already assigned across the NEM, we prefer that; otherwise we compute the quartile within the cell cohort.

### Construction / Commissioning — delivery risk

Lower risk = better. We score each project starting at 100 and deduct for:

- **|COD drift months| × 1.5** (capped at 90 pts) — how far current COD has slipped from originally announced
- **−20 if drift data missing** (uncertainty penalty)
- **−10 if no construction_start event has been captured**

Then add:

- **+ developer grade × 2.5** (A=+10, B=+7.5, C=+5, D=+2.5, F=0)

Q1 = lowest-risk quarter of the cohort.

### Development — readiness

Higher = more ready. Components:

| Signal | Points | Meaning |
|---|---|---|
| development_stage | 15 (planning_submitted) or 0 (early) | Formal planning submission is a hurdle cleared |
| cod_current set | 15 | The developer has announced a target COD |
| rez set | 10 | Project sits inside a defined Renewable Energy Zone |
| has scheme contract | 20 | CIS / LTESA / ARENA award |
| has EIS | 15 | Environmental Impact Statement filed (more common for wind and large solar) |
| developer grade | ×5 | A=20, B=15, C=10, D=5, F=0 based on execution track record |

Theoretical max: 110.

Quartile = position in the (tech, state) development cohort.

---

## How to read a cell

Each matrix cell shows:
- **Big number** — project count
- **MW total** (smaller)
- **Coloured quartile strip** — four segments proportional to Q1/Q2/Q3/Q4 shares, colours:
  - Q1 emerald (#10b981)
  - Q2 blue (#3b82f6)
  - Q3 amber (#f59e0b)
  - Q4 red (#ef4444)
- **Q1 %** — how much of the cell is in the top quartile

An emerald-heavy cell is healthy (top performers / most ready). A red-heavy cell is a risk or low-readiness cluster.

Click any cell → DrillPanel with the full project list, stage-specific columns (CF/rev for operating, drift/dev grade for construction, scheme/EIS/REZ flags for development), and CSV export.

---

## Notable current state (v2.22.0)

| Tech | Stage | Count | MW | Q1 share |
|---|---|---|---|---|
| BESS | Development | 374 | 116 GW | 34% |
| BESS | Construction | 25 | 6.8 GW | 40% |
| BESS | Operating | 28 | 4.6 GW | 25% |
| Solar | Development | 135 | 38 GW | 34% |
| Solar | Operating | 78 | 9.5 GW | 26% |
| Wind | Development | 121 | 68 GW | 36% |
| Wind | Operating | 80 | 11.7 GW | 25% |
| Hybrid | Development | 105 | 43.8 GW | 32% |
| Offshore wind | Development | 22 | 43 GW | 59% |
| Pumped hydro | Operating | 33 | 8.3 GW | 27% |

**Observations worth noting:**
- BESS dominates the development pipeline (374 projects, 116 GW). About a third are "Q1 ready" — a healthy pipeline.
- Offshore wind has only 22 projects but 59% are in Q1 readiness — largely because these are state-blessed projects (VIC declared zones) with scheme support.
- Operating fleets across all techs cluster around 25-27% Q1 share, which is the expected distribution (quartiles by definition)... *except* where the NEM-wide league quartile overrides, which reflects true performance vs just within-cohort ranking.

---

## Known limitations

1. **Development scores are structural, not predictive.** A high readiness score means "this project has cleared more milestones", not "this project will definitely commission on time". For delivery probability, cross-reference the developer's execution grade on the developer profile.
2. **Construction has only 56 projects scored.** The signal is meaningful but the cohort is small — some (tech × state) cells for construction have just 1-2 projects, and the quartile becomes a neutral mid-bucket.
3. **Development Q1 distribution is structural 25%**, not a real ranking. Within a cohort, 25% will always fall in Q1. What matters is the score spread — a Q1 project in a weak cohort may still be less ready than a Q4 project in a strong cohort. Treat quartiles as within-cohort comparisons.
4. **development_score field is unused** — the DB has a \`development_score\` column but it's currently empty. Our readiness score is computed at export time from the component flags. If development_score gets populated in a future enrichment pass, we may switch to that.
5. **No FID / ownership-change / ESG signals yet** — those events exist in timeline_events but aren't fed into the score. Could be added later.
6. **WEM excluded from operating scoring** — WA projects appear in construction/development cells but have no operating quartile because OpenElectricity only covers NEM dispatch.

---

## Cross-references

- **Operating cell drills** → see the individual project detail page for full league-table history
- **Construction cell drills** → check Drift Analysis for cohort-wide trends
- **Development cell drills** → check Scheme Tracker (for CIS/LTESA wins) and EIS Technical (for environmental coverage)

The matrix is built on the v2.16–v2.18 foundation primitives (ChartFrame, DataTable, DrillPanel, DataProvenance) — the same drill-through and CSV-export patterns as the rest of the intelligence layer.
`,
  },
  {
    id: 'ppa-market-mapper',
    title: 'PPA Market Mapper',
    description: 'How offtake contracts are classified, what price/volume/tenor coverage looks like, and how to read the uncontracted-operating risk register.',
    icon: '🤝',
    category: 'technical',
    readingTime: '10 min read',
    added: '2026-04-06',
    content: `# PPA Market Mapper

The \`/offtakers\` page is the intelligence layer's PPA mapper — a tabbed view of every offtake contract in the database, the buyers signing them, and the operating projects that remain uncontracted. This guide explains what's tracked, how the data was sourced (heavily enriched in v2.21.0), buyer classifications, and current limitations.

---

## What's tracked

The \`offtakes\` table carries one row per contract we've identified, with these fields:

| Field | What it is |
|---|---|
| \`party\` | The **buyer** / offtaker (e.g. "AGL Energy", "Snowy Hydro", "ACT Government", "BHP") |
| \`type\` | Contract classification — PPA / corporate_ppa / government_ppa / tolling / merchant / CIS / LTESA / SIPS / FCAS / other |
| \`capacity_mw\` | Contracted volume in MW (may be less than project size) |
| \`volume_structure\` | Free-text alternative: "100% of output", "50% of generation", "first 200 GWh pa", "LGCs only", "195 GWh pa for 10 years" |
| \`price_aud_per_mwh\` | Contracted price where disclosed — rare for private PPAs, common for government auctions |
| \`price_structure\` | "fixed FIT" / "CPI-indexed" / "merchant floor + cap" / "sleeved through retailer" / "availability payment" etc. |
| \`price_notes\` | Free-text context: "record low at award", "excludes LGCs", "CPI-indexed annually", "confidential" |
| \`term_years\` | Contract tenor |
| \`start_date\` / \`end_date\` | ISO dates where known |
| \`tenor_description\` | Free-text: "20-year FIT from commercial operation", "15 + 5 extension" |
| \`sources\` | JSON array of \`{url, title, accessed}\` — primary sources where possible |
| \`data_confidence\` | \`high\` / \`medium\` / \`low\` / \`inferred\` — see below |
| \`last_verified\` | ISO date of last web-research pass |

---

## The v2.21.0 enrichment pass

The offtakes table existed before v2.21.0 but was ~85% empty beyond party and type. In v2.21.0 we ran a systematic research pass across all 85 known contracts, split into 4 buyer clusters (gentailers, state-owned, government, corporates + industrial) and dispatched to parallel research agents. Coverage before → after:

| Field | Before | After |
|---|---|---|
| capacity_mw | 1 of 85 | 57 of 84 |
| term_years | 14 of 85 | 40 of 84 |
| price_aud_per_mwh | 0 of 85 | 11 of 84 |
| price_structure | 0 | 60 of 84 |
| start_date | 0 | 58 of 84 |
| end_date | 0 | 35 of 84 |
| Source URLs | 47 | 241 |
| data_confidence | 0 | 84 |

Highlights: **all seven ACT Government reverse-auction strike prices recovered** — from $92/MWh (Hornsdale Round 1, CPI-indexed) down to $44.97/MWh (Goyder Round 5, 14-year flat). Average government_ppa price now **$78.5/MWh with 17.2-year tenor**. Standard PPAs come in at **$60/MWh / 13.7 years**.

---

## Buyer categories

The Overview tab groups buyers into seven categories. The classification is rule-based (substring match on party name):

| Category | Includes | Colour |
|---|---|---|
| \`gentailer\` | AGL · Origin · EnergyAustralia · Alinta · Shell · ActewAGL · Flow Power · **Snowy Hydro · Hydro Tasmania** | red |
| \`state_owned\` | CleanCo · CS Energy · Stanwell · Ergon · Synergy | amber |
| \`government\` | ACT Gov · Victorian Gov · NSW Gov (EII) · SA Gov · AEMO | blue |
| \`industrial\` | BHP · Rio Tinto · Ark Energy · Fortescue · Sun Metals · Glencore · Nectar Farms | green |
| \`corporate\` | Telstra · Woolworths · Coles · ALDI · Qantas · Microsoft · Amazon · data centres · banks | purple |
| \`trader\` | Zen Energy · Iberdrola · Neoen portfolio · ENGIE | teal |
| \`other\` | unmatched | grey |

Snowy Hydro is classified \`gentailer\` despite being federal-owned because its market role is indistinguishable from AGL or Origin for PPA purposes. The state-owned QLD generators (CleanCo, CS Energy, Stanwell) get their own \`state_owned\` bucket to preserve the QLD renewable-policy signal.

---

## The tabs

- **Overview** — market shape at a glance: category market-share bar, offtake-type aggregates (count, parties, avg tenor, avg price).
- **Top Buyers** — full 31-row table with buyer link, category pill, offtake count, project count, MW, avg tenor, avg price, top-2 technologies. Sortable / CSV export.
- **Developer × Offtaker** — flattened pairings. Shows preferred-partner patterns (Neoen × Snowy Hydro, Tilt × AGL).
- **Offtake Types** — 4 type cards (PPA / corporate_ppa / government_ppa / tolling) with explainer, avg-tenor-by-type bar chart.
- **Uncontracted** — operating projects with no known offtake. 142 projects covering projects like Supernode BESS (1300 MW), Eraring Battery (700 MW), Aldoga Solar (387 MW). Cross-references project CF and revenue/MW so you can spot merchant-exposed revenue pressure.
- **Directory** — the original filterable card grid.

---

## Individual offtaker pages

\`/offtakers/:slug\` gains an "Offtake Contracts" table with every contract we have for that buyer, each row showing project, tech, state, contract type, volume, price, tenor, and a confidence pill. **Click any row** to open a DrillPanel with the full detail: tenor description, price notes, all source URLs with access dates, provenance metadata.

---

## data_confidence — what the levels mean

- **high** — primary source (developer ASX release, government contract outcome, AER determination) with exact figures matching
- **medium** — secondary reporting (RenewEconomy, PV Magazine) or figures inferred from a combination of sources
- **low** — one uncorroborated source, or figures that look wrong against other known data
- **inferred** — contract existence is clear but specific figures aren't disclosed

Several rows were flagged \`low\` with explanatory notes during research:
- **ActewAGL entries** on Goyder South likely duplicate ACT Government contracts
- **Torrens Island SA Government** — AGL battery is merchant, no disclosed SA Government offtake
- **Telstra Murra Warra Stage 2** — publicly disclosed offtaker is Snowy Hydro, not Telstra
- **Several EnergyAustralia wind entries** could not be corroborated

These are preserved as-is (with low confidence flags) rather than deleted, so you can review and correct them if you have better information.

---

## Known limitations

1. **Corporate PPA prices are universally confidential** — we captured 0 published prices across BHP, Telstra, Woolworths, NAB, CBA, etc. Best we can do is the tenor and the volume commitment.
2. **Uncontracted ≠ merchant** — a project may be under a private PPA we haven't identified, OR fully merchant, OR partially contracted. Use the CF / revenue/MW columns on the Uncontracted tab to triangulate.
3. **Buyer categorisation is mechanical** — a party not matching any rule falls to \`other\`. Some clear categorisations (Shell Energy is gentailer since it absorbed ERM Power in 2019) rely on substring matching that may mis-attribute unusual names.
4. **VRET prices never disclosed** — VRET1 reference price was reported as ~$56.52/MWh but individual winning strike prices were not released. VRET2 similar.
5. **SIPS contracts are availability payments, not $/MWh** — Waratah, Victorian Big Battery, Wallgrove etc. appear under government_ppa with null price. That's correct; price is per-year-availability-fee from AER-approved revenue determinations.
6. **One input row didn't round-trip** — 85 original records → 84 research outputs (one likely duplicate deduplicated by the research agents).

---

## Want to verify?

- Every row in the DB has source URLs in \`offtakes.sources\` (JSON array) and/or the legacy \`source_url\` column
- All ACT Government prices cross-verified against climatechoices.act.gov.au
- AER determinations at aer.gov.au for SIPS / EII contracts
- Raw aggregation at \`analytics/offtake-analytics.json\` (~75kB)
`,
  },
  {
    id: 'developer-execution-scoring',
    title: 'Developer Intelligence & Execution Scoring',
    description: 'How developer grades are calculated, what the portfolio dashboard shows, and how to read the execution scorecard.',
    icon: '👷',
    category: 'technical',
    readingTime: '8 min read',
    added: '2026-04-05',
    content: `# Developer Intelligence & Execution Scoring

The \`/developers\` list and individual developer profile pages tell you who's actually building in the NEM — how much, where, with which OEMs and contractors, and how reliably they deliver. This guide explains what the scorecard measures, how the grades are assigned, and what the limitations are.

---

## What a developer profile shows

Every developer detail page (\`/developers/:slug\`) is a **portfolio dashboard** with these sections, rendered only when the underlying data supports them:

1. **Header + alias chips** — the canonical grouped name plus any SPV aliases we've mapped to this developer. "Edify Energy Pty Ltd" and "Edify Energy (Bartlett Holding Company) Pty Ltd" collapse to one profile; you see both.
2. **Execution Scorecard** — A/B/D/F grade badge + on-time %, average drift (months), completion rate, score /100.
3. **Scheme Wins** — coloured chip row for CIS / LTESA / ARENA / state scheme awards (only developers with at least one award). Click any chip to open the specific project.
4. **Pipeline Waterfall** — four stage cards (Development → Construction → Commissioning → Operating) with project counts and MW.
5. **Portfolio Timeline (COD drift)** — a sortable table of every project with original COD, current COD, and the drift in months, colour-coded green/amber/red.
6. **Equipment Preferences** — two side-by-side tables (Go-to OEMs, Go-to Contractors). Only renders if the developer has ≥3 supplier rows. Shows supplier, project count, MW.
7. **Operating Fleet Performance** — quartile distribution chart + ranked project list. Only renders if the developer has ≥3 league-ranked operating projects (9 developers qualify today).
8. **Offtake Counterparties summary** — counterparty chips + link to the PPA Market Mapper for full analysis.
9. **Full project list** — every project the developer owns, grouped by status.

---

## The grade — how it's calculated

The execution grade comes from \`analytics/intelligence/developer-scores.json\` (see the underlying pipeline in \`pipeline/analytics/compute_developer_scores.py\`). It blends three delivery-timing signals:

| Component | Weight | What it measures |
|---|---|---|
| **On-time delivery %** | 40% | Projects commissioned within ±6 months of their original COD |
| **Average COD drift (months)** | 30% | Absolute drift, rewarded for staying near zero |
| **Completion rate** | 20% | Projects that made it to operating vs withdrew |
| **Portfolio diversity** | 10% | Number of distinct technologies and states |

The weighted score (0-100) bins into grades:
- **A** — 80+ (consistent on-time delivery across a meaningful portfolio)
- **B** — 60-79 (solid track record with occasional drift)
- **D** — 40-59 (mixed reliability, expect delays)
- **F** — below 40 (frequent drift or high withdrawal rate)

Distribution as of v2.20.0: **26 A · 74 B · 2 D · 50 F** across 152 scored developers.

---

## Equipment preferences

Preferences come from the \`suppliers\` table joined to \`projects.current_developer\`. We surface the top OEMs (roles: \`wind_oem\`, \`solar_oem\`, \`bess_oem\`, \`hydro_oem\`, \`inverter\`) and top contractors (roles: \`epc\`, \`bop\`) by project count.

Real examples:
- **Akaysha Energy (BlackRock)** — Tesla on 3 BESS projects, Powin on 2. CPP as BOP on 3, EPC on 2.
- **Neoen** — Tesla + CATL on BESS; GE Vernova on wind.
- **Snowy Hydro** — Alstom/GE/Toshiba on hydro turbines.

**Caveat:** we only surface relationships where we have supplier records. Many development-stage projects don't have a named OEM yet. About 35% of developer supplier rows are still "to be confirmed" or a generic category (e.g. "CATL BESS system").

---

## Fleet performance

The **Operating Fleet Performance** section cross-joins the developer's operating projects against the annual league tables (see the Performance Metrics guide). A developer's **quartile distribution** shows how their fleet clusters — are most of their farms Q1 performers, or scattered across Q3/Q4?

**Requirement: ≥3 ranked operating projects.** Below that threshold we show only a short note, because 1-2 data points don't form a fleet. This gates the section on ~9 developers today — mostly state-owned (Hydro-Electric Corp, Snowy Hydro, AGL Hydro Partnership) plus a few wind developers (Neoen, Ratch, Lake Bonney).

Example: **Snowy Hydro** has 54 ranked projects with an average composite of 39.9, Q1 share 11%, clustered heavily in Q3/Q4 (38 of 54 are below median).

---

## Scheme wins

The scheme chip row comes from the \`scheme_contracts\` table. Currently there are 20 scheme-contract records across 15 developers:
- **CIS** (Commonwealth Capacity Investment Scheme) — 5 contracts
- **NSW LTESA** (Long-term Energy Service Agreement) — 5
- **ARENA** — 4
- **QLD Renewable Energy & Hydrogen** — 3
- **NAIF, NSW SIPS, VIC SIPS** — 1 each

Developers with multiple scheme wins include Akaysha Energy (CIS + NSW LTESA + NSW SIPS = 3 schemes), AGL Energy (ARENA + LTESA), Genex (ARENA + NAIF).

---

## Known limitations

1. **Developer names are sometimes SPVs.** AEMO registers projects under special-purpose vehicles (e.g. "Culcairn Solar Farm Pty Ltd") rather than the parent developer. We collapse known SPVs via the alias mechanism in \`developer-profiles.json\`, but it's a moving target — corrections welcome.
2. **Execution grade is delivery-timing only.** It does not reward financial discipline, community engagement, or post-commissioning operating performance. A developer can have an A for on-time delivery and still have weak operating CF.
3. **COD drift requires both original and current COD.** Projects without an announced original COD drop out of the timeline section.
4. **Performance quartiles gate on ≥3 ranked projects.** Most developers don't qualify — that's OK, it just means we don't over-extrapolate from a small fleet.
5. **Ownership changes are thin.** The \`ownership_history\` table has 12 entries across 10 projects — good for case studies, not comprehensive.
6. **Scheme win chip attribution.** If a project changes hands after a scheme award, we still attribute the chip to whoever currently owns the project. A follow-up pass could split "won by X, now owned by Y" cleanly.

---

## Want to verify?

- Raw developer data: \`indexes/developer-profiles.json\` (706 developers, 537 grouped)
- Scoring data: \`analytics/intelligence/developer-scores.json\` (152 with grades)
- Portfolio analytics: \`analytics/developer-analytics.json\` (181 with equipment, 167 with performance, 16 with scheme wins)

All three are exported directly from the SQLite database by the pipeline — no external API calls.
`,
  },
  {
    id: 'oem-supplier-data',
    title: 'OEM & Supplier Data',
    description: 'What the OEM intelligence layer tracks, where the data comes from, how concentration is measured, and known limitations.',
    icon: '🔧',
    category: 'technical',
    readingTime: '8 min read',
    added: '2026-04-04',
    content: `# OEM & Supplier Data — Deep Dive

The OEM Intelligence page at \`/oems\` pulls together everything AURES knows about who supplies equipment into the NEM — turbine manufacturers, battery systems, inverters, panels, and hydro turbines. This guide explains what's tracked, where the data comes from, how the market concentration metrics are calculated, and where the gaps are.

---

## What counts as an OEM here

AURES tracks five **equipment-supplier roles**:

| Role | What it is | Typical examples |
|---|---|---|
| \`wind_oem\` | The turbine manufacturer — the entity whose nameplate is on the tower | Vestas, Goldwind, GE Vernova, Siemens Gamesa, Suzlon, Nordex |
| \`solar_oem\` | The panel / module manufacturer | Canadian Solar, Jinko Solar, JA Solar, First Solar, LONGi |
| \`bess_oem\` | The battery system integrator (includes cell + container + BMS) | Tesla, Fluence, Wartsila, CATL, Samsung SDI, Powin, BYD |
| \`hydro_oem\` | The turbine / generator / pump manufacturer for pumped hydro | Fuji Electric, Toshiba, Voith, Melco (Mitsubishi Electric), Boving |
| \`inverter\` | Power electronics — for solar farms and separately for BESS PCS | SMA, Ingeteam, Sungrow, Huawei, TMEIC; also Tesla/Fluence/BYD for integrated BESS |

Some vendors carry multiple roles. Tesla is both \`bess_oem\` and \`inverter\` because Megapack integrates cells and power electronics. BYD is \`solar_oem\`, \`bess_oem\`, **and** \`inverter\`.

**Not** tracked here:
- **EPC contractors** — these are in \`/contractors\` (roles \`epc\`, \`bop\`)
- **Transformer / switchgear suppliers** — not systematically captured
- **FCAS controller or bid-optimisation software** — captured as "trading platform" in BESS Bidding intelligence, not as an OEM

---

## Where the data comes from

OEM records are assembled from three data sources — each pass is validated against the others before records land in the database:

1. **AEMO Generation Information** (monthly Excel) — flags manufacturers on operating and committed projects where AEMO lists them.
2. **Web research** — targeted searches on ASX disclosures, RenewEconomy / PV Magazine / Energy Storage News articles, developer investor presentations, and WattClarity writeups. Sourced with URLs where possible.
3. **EIS technical specifications** — extracted from Environmental Impact Statements when a project publishes one. This is the most reliable source for BESS cell chemistry, inverter model numbers, and solar panel specs. Currently 34 BESS projects have verified EIS chemistry (33 LFP, 1 NMC).

Each \`suppliers\` record in the database carries a \`source\` field (one of \`aemo\`, \`web_research\`, \`eis\`, \`manual\`) so we can trace where the attribution came from. Records are deduplicated by \`(project_id, role, supplier)\`.

---

## Market concentration — how it's measured

The Overview tab shows a **Herfindahl-Hirschman Index (HHI)** per role, calculated over installed MW market share:

\`\`\`
HHI = Σ (market_share_pct)² for each OEM
\`\`\`

- HHI below **1,500** → competitive market
- HHI between **1,500 and 2,500** → moderately concentrated
- HHI above **2,500** → highly concentrated

Current state (v2.19.0):

| Role | HHI (MW) | Top-3 Share | Interpretation |
|---|---|---|---|
| Wind | 2,827 | 78% (Vestas · Goldwind · GE) | Highly concentrated |
| BESS | 1,848 | 66% (Tesla · CATL · Fluence) | Moderately concentrated |
| Inverter | 1,703 | 62% (SMA · Ingeteam · GE) | Moderately concentrated |
| Solar panels | 1,175 | 50% (Canadian · Jinko · JA) | Competitive |
| Hydro | 1,047 | 44% (Toshiba · Voith · Melco) | Competitive (but state-level dynamics matter) |

**Caveat:** these numbers are computed across the whole pipeline (operating + construction + development). If a development-stage project announces a different OEM than what ultimately gets installed, it will shift the reading. We treat announced equipment as firm intent until a project commissions differently.

---

## Performance correlation (OEM → fleet quartile)

For operating OEMs we cross-join \`suppliers\` with \`performance_annual\` and \`league_table_entries\` (see the Performance Metrics guide) to surface:

- **Average capacity factor** across the OEM's operating fleet
- **Average composite performance score** (0-100)
- **Q1 share** — what % of the fleet is in the top-25% of its technology

This is visible in the "Top Wind OEMs" and similar DataTables on each tech tab. Example: Vestas' 27 ranked operating wind farms have an average CF of 24.7% with 26% of the fleet in Q1.

**Caveat:** correlation ≠ causation. A Vestas farm with high CF might reflect site quality, developer skill, or O&M practice — not the turbine alone. Use this to spot patterns, not to assign blame.

---

## Developer-OEM pairings

The "Most Active Developer-OEM Pairings" DataTable on the Overview tab flattens our supplier data by developer × OEM. This exposes preferred-partner patterns (eg "Akaysha uses Tesla on 3 projects", "Edify uses Fluence on X projects"). Counts are based on whichever current developer AEMO has on record, consolidated via the developer-alias map.

---

## Known limitations

1. **~35% of OEMs have no model list.** "Models" is free-text and often reads as a generic category (eg "CATL BESS system") rather than a specific SKU. Expanding this requires parsing developer announcements and EIS documents more aggressively.
2. **BESS chemistry coverage is thin** — only 34 of 420 BESS projects have verified chemistry from EIS documents. We mark this clearly in the BESS tab rather than inferring.
3. **Tracker vs fixed-mount** — we have this for some solar projects via EIS but it's not yet systematically surfaced in the OEM view.
4. **Mid-stream OEM changes** — if a project replaces its originally announced supplier mid-construction, we may not catch it until commissioning. Ownership changes often drag OEM changes along.
5. **WEM not included in some views** — Western Australian projects appear in the directory but their CF/performance data is absent (we only have NEM dispatch via OpenElectricity).

---

## Using the intelligence tabs

- **Overview** — start here to see the market-structure picture and biggest developer-OEM pairings
- **Wind / Solar / BESS / Hydro** — each tab has its own market-share pie, an OEM-ranked table with performance columns, and tech-specific commentary (eg the Fuji Tasmania callout on the Hydro tab)
- **Directory** — full filterable list of all 101 OEMs with search, jump-to, tech/state/status filters, and card layout

Click an OEM name anywhere → individual OEM detail page with their full project list, equipment models, and state/status breakdowns.

---

## Want to verify the data?

- Individual \`suppliers\` records with source URLs are visible on each project detail page under "Suppliers" section
- Raw aggregation is in \`indexes/oem-profiles.json\` and \`analytics/oem-analytics.json\` — both are exported from the SQLite database
- The EIS-extracted chemistry data is at \`analytics/eis-analytics.json\` under \`summary.bess_stats\`
`,
  },
  {
    id: 'strategic-roadmap',
    title: 'Strategic Roadmap',
    description: 'Comprehensive review of infrastructure, UX, data strategy, and the 10-feature intelligence layer plan.',
    icon: '🗺️',
    category: 'roadmap',
    readingTime: '20 min read',
    added: '2026-03-15',
    updated: '2026-04-17',
    content: `# AURES Strategic Roadmap

> **Last Updated:** 22 March 2026
> **Version:** v2.5.1 | **Projects:** 1,067 | **Intelligence Features:** 10 | **Developers Scored:** 152 | **EIS Projects:** 98

This document is the master plan for AURES. It covers a comprehensive review of the platform's code and infrastructure, UX quality, data enhancement strategy, and the design of the intelligence layer features that transform AURES from a database into an analytical platform.

---

## Part 1: Infrastructure & Code Quality Review

### Current Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19, Vite 7, TypeScript 5.9, Tailwind 4 | 25 pages, 12 hooks, 7 components |
| Data | SQLite (1 file, 19 tables) | Exported to static JSON for the PWA |
| Pipeline | Python 3 (16 scripts, ~7,000 lines) | Manual runs, no automation |
| Deploy | GitHub Actions → GitHub Pages | Push to main triggers build+deploy |
| PWA | vite-plugin-pwa, StaleWhileRevalidate | 7-day cache, 500 max entries |

### Priority Improvements

#### Tier 1 — High Impact, Low Effort ✅ COMPLETE

**Code Splitting (React.lazy)** ✅
All routes converted to React.lazy with Suspense fallbacks.

**Error Boundaries** ✅
Generic ErrorBoundary wrapping routes plus specific boundaries around chart-heavy pages.

**Icon Extraction** ✅
SVG icons extracted to dedicated icons file.

#### Tier 2 — High Impact, Medium Effort (Partial)

**Data Cache Layer** — ⏳ Planned
Each hook still fetches independently. TanStack Query or SWR migration planned for future sprint.

**Testing Framework** — ⏳ Planned
Vitest + @testing-library/react planned but not yet implemented.

**PWA Cache Versioning** ✅
Cache-busting implemented.

#### Tier 3 — Medium Impact ✅ COMPLETE

**Pipeline Automation** ✅
\`scripts/aures-pipeline.sh\` shell wrapper with macOS launchd scheduling (weekly Monday 6am). \`admin.py --auto\` flag runs only steps exceeding their frequency threshold. Auto git commit and push on data changes.

**Large Page Decomposition** ✅
Chart components extracted into ChartWrapper. ScrollableTable component for mobile. Sub-components extracted from large pages.

---

## Part 2: UX Assessment

### Current Scores (post-UX enhancements)

| Dimension | Score | Status |
|-----------|-------|--------|
| Navigation | 9/10 | ✅ Breadcrumbs added, Cmd+K search |
| Search | 9/10 | ✅ Cross-entity SearchModal, fuzzy matching, recent searches |
| Mobile | 9/10 | ✅ ScrollableTable, gradient indicators, larger touch targets |
| Accessibility | 8/10 | ✅ ARIA labels, skip-to-content, focus management |
| Error Handling | 8/10 | ✅ Error boundaries, Skeleton components |
| Data Viz | 9/10 | ✅ PNG export, CSV download, semantic figures |
| Code Quality | 8/10 | Clean TypeScript, ChartWrapper pattern |
| Design System | 7/10 | Good CSS variables, dark theme |
| **Overall** | **8.6/10** | **Major polish pass complete** |

### Priority UX Improvements

**1. Error Handling (5/10 → 8/10)** ✅ COMPLETE
- Error boundaries at route level with "Something went wrong. Tap to retry"
- Centralised Skeleton component with variants (card, table row, chart)
- Network error states with retry buttons on all data-fetching pages

**2. Search (6/10 → 9/10)** ✅ COMPLETE
- Cmd+K / Ctrl+K keyboard shortcut opening a SearchModal from any page
- Cross-entity search: projects, developers, OEMs, contractors, offtakers
- Fuzzy matching via Fuse.js with relevance-ranked results
- Recent searches persisted in localStorage
- Mobile: tap the search icon in the header

**3. Accessibility (6/10 → 8/10)** ✅ COMPLETE
- aria-label on all icon-only buttons (hamburger, search, filter chips)
- aria-current="page" on active NavLinks
- Skip-to-content link for keyboard navigation
- Focus management on route changes
- Screen reader support throughout

**4. Mobile Polish (7/10 → 9/10)** ✅ COMPLETE
- ScrollableTable component with gradient indicators for horizontal scroll
- Breadcrumb navigation visible on tablet+ breakpoints
- Larger touch targets on chart elements
- Touch-friendly chart tooltips

**5. Data Visualization (8/10 → 9/10)** ✅ COMPLETE
- PNG chart export via html-to-image (share button on every chart)
- CSV data download for filtered datasets
- Semantic figure + figcaption elements around all charts (ChartWrapper component)
- Responsive chart sizing using ResponsiveContainer everywhere

---

## Part 3: Data Enhancement Strategy

### Current Data Coverage

| Metric | Count | Coverage |
|--------|-------|----------|
| Total projects | 1,064 | — |
| With timeline events | 677 | 63.6% |
| With coordinates | 250 | 23.5% |
| With performance data | 221 | 20.8% |
| With supplier records | 134 | 12.6% |
| With offtake/PPA data | 60 | 5.6% |

### 8 Data Sources (5 complete, 3 planned)

#### 1. NSW Planning Portal API
**URL:** api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA
**Provides:** DA status, lodge date, determination date, conditions of consent, modification applications.
**Approach:** New importer matching projects by developer name and location. New planning_approvals database table.
**Priority:** HIGH — NSW has the most projects and the only proper API.

#### 2. Other State Planning Portals
VIC (planning.vic.gov.au), QLD (planning.statedevelopment.qld.gov.au), SA (plan.sa.gov.au).
**Approach:** Web scraping (no public APIs). Start with SA PlanSA which has the most structured HTML.
**Priority:** MEDIUM — Do after NSW is working.

#### 3. EIS Document Mining
Environmental Impact Statements are typically 500-2000 page PDFs containing wind speed measurements, turbine layouts, noise assessments, grid connection details, and vegetation clearing data.
**Approach:** Download PDFs from EPBC referral links and NSW Planning Portal. Use pdfplumber for text extraction. Regex patterns for structured fields. For scale, use an LLM API for unstructured extraction.
**New data:** Wind speed (m/s), hub height (m), rotor diameter (m), number of turbines, noise limits (dBA), grid connection voltage (kV).
**Priority:** HIGH for wind projects — EIS docs contain data available nowhere else.

#### 4. OEM & Developer Websites
Vestas, GE Vernova, and Goldwind publish project reference lists. Origin, AGL, Neoen, and other listed developers publish project updates and ASX announcements.
**Approach:** Per-source scrapers storing raw announcements in a news_items table, auto-linked to projects.
**Priority:** MEDIUM — good for filling OEM gaps and tracking ownership changes.

#### 5. News Feed Automation ✅ COMPLETE
RenewEconomy (reneweconomy.com.au/feed/), PV Magazine Australia, Energy Storage News.
**Implementation:** \`import_news_rss.py\` fetches RSS weekly, fuzzy-matches article titles against project names, stores in news_articles table with project linkage. Articles appear on project detail pages.

#### 6. OpenElectricity Monthly Data ✅ COMPLETE (FCAS pending)
**Implementation:** \`import_openelectricity.py\` extended to fetch monthly intervals — 12 data points per facility per year enabling seasonal analysis. Used by Dunkelflaute analysis and revenue intelligence features.
**Remaining:** FCAS revenue data pending OpenElectricity API support for FCAS market endpoints.

#### 7. Global Wind Atlas
**URL:** globalwindatlas.info — provides modeled mean wind speed at 100m/150m hub heights at 250m spatial resolution.
**Approach:** For each geolocated wind project (currently 250), query the API for modeled wind speed. Store as modeled_wind_speed_100m, modeled_wind_speed_150m columns.
**Priority:** HIGH — enables the Wind Resource Quality Assessment intelligence feature.

#### 8. AEMO ISP Data ✅ COMPLETE
The Integrated System Plan publishes REZ hosting capacity limits, transmission augmentation timelines, and connection queue data.
**Implementation:** \`import_aemo_isp.py\` parses ISP appendix Excel files (published annually). REZ hosting capacity data integrated. Used by the Grid Connection Bottleneck Analysis intelligence feature.

### Keeping Data Up To Date

**Automated (GitHub Actions cron):**
- AEMO Generation Info: 1st of each month
- OpenElectricity annual: Quarterly (Jan/Apr/Jul/Oct)
- OpenElectricity YTD: 15th of each month
- EPBC referrals: 1st of each month
- News feeds (RSS): Daily

**Semi-automated (local + Claude):**
- EIS document mining: Ad hoc when new EIS published
- Web research: Triggered by news feed matches
- Planning portal checks: Monthly manual review

**API Rate Limit Management:**
New api_rate_limits table tracking daily usage per API. OpenElectricity budget: ~100 req/day for automation, 400 for ad-hoc research.

---

## Part 4: The Intelligence Layer — 10 Features (9 Complete, 1 Planned)

### Feature 1: CIS/LTESA Project Risk Tracker ✅ COMPLETE

**What it does:** Analyses projects that won CIS or LTESA scheme contracts to assess delivery risk. Flags projects that haven't reached FID, are experiencing COD drift, or were awarded to already-operating assets. Provides a traffic-light risk score.

**Why it matters:** The CIS and LTESA schemes have awarded contracts to dozens of projects, but many face significant delivery challenges. Some contracts went to projects already in operation or construction — potentially diluting the scheme's intent to incentivise new build. Identifying at-risk projects early enables better policy and investment decisions.

**Key questions it answers:**
- Which CIS/LTESA projects have reached FID? Which haven't?
- How many were already operating or in construction when awarded?
- What is the aggregate COD drift for scheme-funded projects vs the broader pipeline?
- Which projects are most at risk of missing their contractual deadlines?

**Data sources:** scheme_contracts table, timeline_events (FID milestones), cod_history, performance_annual, web research for contract deadlines.

**UI:** Traffic-light risk table (Green/Amber/Red). Timeline visualisation showing each project's actual progress vs required milestones. Summary KPIs.

---

### Feature 2: COD/FID Drift Analysis (Aggregate) ✅ COMPLETE

**What it does:** Extends the existing per-project COD drift tracking into a statistical analysis of delay patterns across the entire fleet. Identifies which factors predict delay — technology type, project size, state, developer.

**Why it matters:** Project delays are systemic in Australian renewables. Understanding the patterns (do larger projects delay more? do certain developers consistently miss timelines? are certain states slower?) enables better project evaluation and planning assumptions.

**Key questions it answers:**
- What is the median COD drift by technology? (Wind vs Solar vs BESS vs Hybrid)
- Do bigger projects experience more delay?
- Which states have the slowest approval-to-operation timelines?
- Is drift getting worse or better over time?
- Which developers are "serial delayers"?

**Data sources:** cod_history, timeline_events, projects (technology, capacity_mw, state, developer).

**UI:** Box plot charts by technology. Heat map (state x technology). Scatter plot (capacity vs drift). Developer leaderboard sorted by average drift. Trend line over time.

---

### Feature 3: Wind Resource Quality Assessment ✅ COMPLETE

**What it does:** Predicts expected capacity factors for development-stage wind projects based on their location. Uses modeled wind speed data from Global Wind Atlas and a regression model trained on operating wind farms' actual performance.

**Why it matters:** A wind project's long-term viability depends on the quality of the wind resource at its location. By comparing modeled wind speeds against actual capacity factors of operating farms, we can predict whether a proposed project is in a good location — crucial for evaluating CIS/LTESA project viability.

**Key questions it answers:**
- What capacity factor can we expect from this development-stage wind project?
- How does this location compare to the best and worst performing wind farms?
- Are any CIS/LTESA wind projects in poor resource areas?
- What is the R-squared between modeled wind speed and actual capacity factor?

**Data sources:** Global Wind Atlas API (wind speed at hub height), performance_annual (actual CF for operating farms), project coordinates.

**UI:** Map overlay with wind speed contours. Scatter plot of modeled wind speed vs actual CF. Table of development projects ranked by predicted CF. Resource rating badges (Excellent/Good/Average/Poor).

---

### Feature 4: EIS/EIA Technical Intelligence ✅ COMPLETE

**What it does:** Extracts and structures technical specifications from Environmental Impact Statement PDFs across all technologies. Provides EIS vs actual performance comparison for operating projects. Tracks coverage gaps and flags PDF download opportunities for future data extraction.

**Why it matters:** EIS documents contain the most detailed technical information about a project — data that exists nowhere else publicly. Extracting and structuring this data unlocks deep technical comparison and due diligence. Comparing EIS predictions against actual operational performance reveals systematic optimism bias in environmental approvals.

**Key questions it answers:**
- What hub height, rotor diameter, and capacity factor was assumed in this wind farm's EIS?
- How does the EIS-predicted capacity factor compare to actual operational performance?
- What grid connection voltage, substation, and distance is planned for each project?
- Which projects have EIS documents available but data not yet extracted?
- What is the EIS coverage rate across the project database?

**Data sources:** eis_technical_specs table (SQLite), performance_annual (for EIS vs actual comparison), manually curated coverage gap and PDF opportunity data.

**UI:** 6-tab page — Wind specs, BESS specs, Solar specs, EIS vs Actual (grouped bar, scatter, delta charts), Coverage (extracted + gap tables with PDF opportunity flags), Grid Connection (voltage distribution with drill-down, NSP table, connection distance analysis). 98 projects extracted (33 wind, 36 BESS, 27 solar, 2 pumped hydro). 21 operating wind projects with EIS vs actual CF comparison showing average -11.4% delta.

---

### Feature 5: Dunkelflaute Detection & Analysis ✅ COMPLETE

**What it does:** Identifies periods of simultaneous low wind and solar generation across the NEM. Analyses frequency, duration, geographic extent, and models the impact on BESS dispatch and grid reliability.

**Why it matters:** Dunkelflaute events (periods of low wind and low solar simultaneously) are critical stress tests for a renewable-dominated grid. Understanding their frequency and severity helps assess whether the BESS pipeline is sufficient and which wind farms are most affected.

**Key questions it answers:**
- How often do Dunkelflaute events occur? In which months?
- When one state has low wind, do neighbouring states also?
- During the worst Dunkelflaute on record, how much did wind generation drop? Which farms were hit hardest?
- Given current BESS capacity, how many hours of backup does each state have during a Dunkelflaute?

**Data sources:** OpenElectricity monthly generation data by NEM region, project capacity by state, BESS storage capacity.

**UI:** Calendar heat map (wind+solar combined CF by month by region). Dunkelflaute event timeline. Cross-region correlation matrix. BESS adequacy analysis cards. Historical trend line.

---

### Feature 6: State Energy Mix Transition Tracker ✅ COMPLETE

**What it does:** Visualises how each state's electricity generation mix has evolved — the retirement of coal, the growth of wind/solar/BESS, and the path toward decarbonisation. Projects forward based on the committed and development pipeline.

**Why it matters:** Each state is on a different trajectory. Tasmania is nearly 100% renewable. Victoria and NSW are racing to replace coal. Queensland has the largest pipeline. Understanding these trajectories helps assess where investment is heading.

**Key questions it answers:**
- What percentage of each state's generation is now renewable?
- When will each state reach 50%, 80%, 100% renewables?
- Which specific projects are driving the transition in each state?
- How realistic are the forward projections given historical delivery rates?

**Data sources:** OpenElectricity historical generation by fuel type by NEM region. AURES pipeline by state/technology/status/COD.

**UI:** Stacked area chart per state. Forward projection zone (shaded). Small multiples for state comparison. Key milestone markers (coal closures). Click on future year to see assumed projects.

---

### Feature 7: Developer Execution Scoring ✅ COMPLETE

**What it does:** Rates each developer on their track record of delivering projects on time, at stated capacity, and through to operation. Provides an execution reliability score that contextualises the credibility of their development pipeline.

**Why it matters:** A developer with 5 GW in their pipeline but a history of delays and withdrawals is very different from one with 500 MW and a perfect delivery record. Execution scoring adds crucial context to pipeline announcements and scheme contract awards.

**Key questions it answers:**
- What is this developer's average COD drift?
- What percentage of their announced projects actually reach operation?
- How long do they typically take from FID to COD?
- How credible is their current pipeline given their track record?

**Data sources:** developer-profiles.json, cod_history, timeline_events, projects.status.

**UI:** A-F rating badge on DeveloperDetail. Radar chart (speed, reliability, scale, experience). Developer comparison tool. Pipeline credibility view flagging large pipelines with poor execution scores.

---

### Feature 8: Equipment Supply Chain Intelligence ⏳ PLANNED

**What it does:** Tracks OEM market share trends over time, technology evolution (turbine size, BESS chemistry), and lead time intelligence.

**Why it matters:** Understanding which OEMs are winning in the Australian market, how turbine sizes are evolving, and what lead times look like helps developers plan procurement and helps analysts understand technology trends.

**Key questions it answers:**
- Which wind OEM has gained the most market share in the last 3 years?
- What is the average turbine capacity installed each year? (showing the trend toward larger turbines)
- What is the average time from equipment order to COD?
- Which BESS chemistry (LFP, NMC) is dominating new orders?

**Data sources:** suppliers table, oem-profiles.json, timeline_events (equipment_order dates).

**UI:** Animated market share pie chart (slider by year). Technology evolution line chart (average turbine MW over time). OEM comparison table. Lead time analysis.

---

### Feature 9: Market Revenue Intelligence ✅ COMPLETE

**What it does:** Benchmarks project revenue performance, analyses merchant vs contracted revenue exposure, and provides BESS-specific revenue decomposition (energy arbitrage vs FCAS).

**Why it matters:** Understanding actual revenue performance — not just capacity factor — is critical for investment analysis. BESS revenue in particular is complex, with significant FCAS contribution that varies dramatically by market conditions.

**Key questions it answers:**
- What does a top-quartile wind farm earn per MWh vs the fleet average?
- What proportion of BESS revenue comes from FCAS vs energy arbitrage?
- Which projects are fully merchant vs fully contracted? What is the revenue difference?
- Are revenues trending up or down by technology?

**Data sources:** performance_annual (revenue, price), offtakes (PPA status), OpenElectricity FCAS data.

**UI:** BESS revenue waterfall chart. Revenue heat map (monthly per MW). Merchant exposure analysis. Quartile benchmark cards. Year-over-year trend.

---

### Feature 10: Grid Connection Bottleneck Analysis ✅ COMPLETE

**What it does:** Identifies where projects are stuck in the grid connection process, maps queue congestion by REZ and network service provider, and quantifies the systemic impact of connection delays.

**Why it matters:** Grid connection is the single biggest bottleneck in Australian renewable energy development. Projects can wait 3-5 years for a connection agreement. Understanding where the queues are longest and which NSPs are slowest enables better site selection and policy focus.

**Key questions it answers:**
- Which REZs have the most queued capacity relative to hosting capacity?
- How long does it take from planning approval to grid connection in each REZ?
- Which NSP (Transgrid, ElectraNet, AusNet, etc.) processes connections fastest?
- How much capacity and investment is held up by connection delays?

**Data sources:** projects (connection_status, connection_nsp, rez), AEMO TCPR data, ISP hosting capacity.

**UI:** Map with REZ boundaries coloured by queue congestion. REZ detail cards. Connection journey Gantt chart. NSP comparison table.

---

## Part 5: What's Next

### Completed Summary (as of v2.5.1, 27 March 2026)

**Infrastructure:** ✅ Code splitting, error boundaries, icon extraction, pipeline automation (launchd + admin.py --auto)
**UX:** ✅ Cmd+K search, accessibility, mobile polish, data viz export, mobile version check
**Data Sources:** ✅ News RSS (3 feeds), OE monthly, AEMO ISP, EIS documents (98 projects). ⏳ NSW Planning Portal, Global Wind Atlas, FCAS data
**Intelligence:** ✅ 10 of 11 features complete. ⏳ Supply Chain Intelligence
**Developer Quality:** ✅ 20 developer websites audited, 610 SPV corrections, 4 JV partnerships documented

### Remaining Work

**Intelligence Features (1 remaining)**
- Feature 8: Equipment Supply Chain Intelligence — OEM market share trends over time, technology evolution, lead time tracking

**Data Sources (3 remaining)**
- NSW Planning Portal API — DA status, determination dates, conditions of consent
- Global Wind Atlas — modeled wind speed at hub height for every geolocated wind project
- FCAS revenue data — pending OpenElectricity API support for FCAS market endpoints

**Data Quality Actions (from Developer Audit)**
- Apply high-confidence SPV corrections (51 projects) to SQLite database
- Add EDF Renewables to developer data (Dawson Wind 600MW, Banana Range Wind 230MW in development)
- Update JV developer assignments (Pottinger = Someva/AGL, MacIntyre = Acciona/Ark Energy)
- Extract EIS data for 61 flagged PDF opportunities (16 high priority)

**Platform Evolution**
- Testing framework (Vitest + @testing-library/react)
- Data cache layer (TanStack Query or SWR)
- Database migration consideration (SQLite to Supabase/Turso for concurrent writes)
- User accounts + Watchlist feature
- Push notification alerts for project milestone changes
- SA PlanSA and VIC planning portal scrapers
- ASX announcement parser for listed developers`,
  },
  {
    id: 'search-tips',
    title: 'Search Tips',
    description: 'How to use the Cmd+K search modal to find projects, developers, OEMs, contractors, and offtakers.',
    icon: '🔍',
    category: 'about',
    readingTime: '2 min read',
    added: '2026-03-15',
    content: `# Search Tips

## Opening Search

**Desktop:** Press **\u2318K** (Mac) or **Ctrl+K** (Windows/Linux) from any page to open the search modal instantly.

**Mobile:** Tap the **search icon** in the header bar.

You can also click the search bar in the navigation sidebar.

---

## What You Can Search

AURES search spans five entity types in a single query:

| Entity | Examples |
|--------|----------|
| **Projects** | "Waratah Super Battery", "Goyder South", "Snowy 2.0" |
| **Developers** | "ACEN", "Neoen", "Goldwind" |
| **OEMs** | "Vestas", "Tesla", "GE Vernova" |
| **Contractors** | "UGL", "Downer", "Bouygues" |
| **Offtakers** | "Origin", "AGL", "CleanCo" |

Results are grouped by type so you can quickly find what you need.

---

## Fuzzy Matching

Search uses **fuzzy matching** powered by Fuse.js. This means:

- You don't need exact spelling — "watara batt" will still find "Waratah Super Battery"
- Partial matches work — "gold" finds both "Goldwind" (OEM) and "Golden Plains" (project)
- Results are ranked by relevance, with closer matches appearing first

### Tips for Better Results

- **Be specific when you can** — "Clarke Creek Wind" is better than just "Clarke"
- **Use key words** — technology names, state names, or company names narrow results fast
- **Try abbreviations** — "BESS", "CIS", "LTESA" work as search terms
- **Developer names** — search by the parent company name for grouped results

---

## Recent Searches

The search modal remembers your **recent searches** and shows them when you open it. This makes it quick to jump back to entities you were recently researching.

Recent searches are stored locally in your browser and persist across sessions.

---

## Keyboard Navigation

Once the search modal is open:

- **Type** to filter results in real time
- **Arrow keys** (\u2191\u2193) to move between results
- **Enter** to navigate to the selected result
- **Escape** to close the modal

---

## On Mobile

On mobile devices, the search modal opens full-screen for easier typing and browsing. Tap any result to navigate directly to that entity's detail page. The back button or swipe gesture returns you to where you were.`,
  },
  {
    id: 'data-quality',
    title: 'Data Quality Audit',
    description: 'Automated data quality checks, issue taxonomy, and methodology for identifying and resolving data accuracy problems.',
    icon: '🔬',
    category: 'technical',
    readingTime: '10 min read',
    added: '2026-03-28',
    updated: '2026-04-17',
    content: `# Data Quality Audit

> **Last Updated:** 2026-03-27
> **Script:** \`pipeline/generators/generate_data_quality.py\`
> **Output:** \`frontend/public/data/analytics/data-quality.json\`

AURES aggregates data from 10+ sources (AEMO, OpenElectricity, CIS/LTESA announcements, developer websites, EIS documents). When the same physical project appears in multiple sources under slightly different names, capacities, or statuses, data quality issues can emerge. This guide documents the automated audit system and the taxonomy of issues it detects.

---

## How to Run the Audit

\`\`\`bash
cd /path/to/aures-db
python3 pipeline/generators/generate_data_quality.py
\`\`\`

The script:
1. Loads all 1,000+ project JSON files from \`frontend/public/data/projects/\`
2. Parses scheme entries from \`scheme-rounds.ts\` and \`esg-tracker-data.ts\`
3. Runs 5 automated checks (see below)
4. Writes a structured report to \`data-quality.json\`
5. Prints a summary with high-severity issues to the console

Run it **after every data import or manual edit** to catch regressions.

---

## Issue Taxonomy

### 1. Identity Confusion (similar_names)

**What:** Two distinct projects with similar names that could be mixed up.

**Examples found and fixed:**
- **Willogoleche Wind Farm** (operating, 120 MW) vs **Willogoleche 2 Wind Farm** (development, 108 MW) — CIS data was incorrectly linked to the operating project
- **Mokoan Solar Farm** (operating, 46 MW) vs **West Mokoan Solar Farm and BESS** (development, 300 MW) — scheme entry was pointing to the wrong project_id

**Detection:** Fuzzy name matching (SequenceMatcher) with smart filtering to exclude legitimate patterns:
- Explicit stage/phase numbering (Stage 1 vs Stage 2)
- Co-located different technologies (Solar + BESS at same site)
- Directional variants (North vs South)
- Numbered suffixes (BESS 1 vs BESS 2)

**Resolution:** Verify each flagged pair. If they're genuinely distinct, no action needed. If confused, create separate project files and fix cross-references.

---

### 2. Cross-Reference Mismatch (name_mismatch)

**What:** A scheme entry's \`project_id\` points to a project file whose name doesn't match.

**Examples:**
- Scheme says "Kentbruck Wind Farm" but project file is "Kentbruck Green Power Hub"
- Scheme says "Teebar BESS" but project file is "Teebar Creek Battery Storage - KCI"

**Detection:** Name similarity score < 60% between scheme entry name and linked project file name.

**Resolution:** Either the scheme name or project name needs updating, or the project_id is wrong.

---

### 3. Capacity Discrepancy (capacity_mismatch)

**What:** Scheme-contracted capacity differs significantly (>20%) from the project file capacity.

**Important context:** This is often **legitimate** — a scheme may contract for Stage 1 of a larger project, or for partial capacity. The audit distinguishes:
- **Staged projects:** Flagged as "info" when scheme name contains "Stage" and capacity < total
- **Non-staged mismatches:** Flagged as "warning" or "high" — these need investigation

**Examples found and fixed:**
- **Liddell BESS:** Was listed as 250 MW in CIS Pilot and 500 MW in LTESA R2, but it's one project with one 500 MW contract under the combined round

**Resolution:** Verify which capacity is correct. If it's a staged contract, add a note. If it's wrong, fix it.

---

### 4. Status Drift (status_drift)

**What:** A scheme entry's \`stage\` (operating/construction/development) doesn't match the project file's \`status\`.

**Example found and fixed:**
- **West Mokoan Solar Farm** was listed as \`stage: 'operating'\` in ESG tracker but the project file correctly shows \`status: 'development'\`

**Detection:** Direct comparison of scheme stage vs project status.

**Resolution:** Update the stale status — usually the project file is more current.

---

### 5. Multi-Scheme Duplicate (multi_scheme_duplicate)

**What:** Same \`project_id\` appears in multiple scheme rounds. May indicate double-counting.

**Example found and fixed:**
- **Liddell BESS** appeared in both CIS Pilot NSW (250 MW) and LTESA Round 2 (500 MW) — these were one combined round, not two separate contracts

**Detection:** Group scheme entries by project_id, flag those appearing 2+ times. Higher severity when capacities differ across rounds.

**Resolution:** Verify whether the project genuinely has multiple contracts or if rounds were double-listed.

---

### 6. Orphaned Reference (orphaned_reference)

**What:** A scheme entry references a \`project_id\` that doesn't exist as a project file.

**Detection:** Check every scheme project_id against the project file index.

**Resolution:** Either create the missing project file or fix the project_id.

---

### 7. Technology Mismatch (technology_mismatch)

**What:** Scheme says one technology but the project file says another.

**Detection:** Direct comparison, allowing hybrid to match solar/bess.

---

### 8. Missing Coordinates & Empty Timelines

**What:** Operating/construction projects without map coordinates or timeline events.

**Detection:** Simple field presence checks for active projects.

---

## Common Root Causes

| Root Cause | How It Manifests |
|-----------|-----------------|
| **Name evolution** | Project changes name during development (e.g. "Kentbruck Wind Farm" → "Kentbruck Green Power Hub") |
| **Source disagreement** | AEMO uses one name/capacity, CIS announcement uses another |
| **Partial contracting** | Scheme contracts for Stage 1 or partial capacity; project file shows total |
| **Combined rounds** | CIS Pilot NSW and LTESA R2 were one combined round but modelled as two |
| **SPV vs parent** | Developer registered as SPV (e.g. "Willogoleche Power Pty Ltd") vs parent ("ENGIE") |
| **Stale status** | Project progresses but scheme tracker isn't updated |

---

## Audit Results Summary (27 March 2026)

| Metric | Count |
|--------|-------|
| Projects scanned | 1,068 |
| Scheme entries parsed | 187 |
| Total issues found | 243 |
| High severity | 62 |
| Warning | 94 |
| Info | 87 |

### Issues by Type

| Type | Count | Description |
|------|-------|-------------|
| similar_names | 105 | Pairs of projects with similar names — most are legitimate (stages, co-located tech) |
| multi_scheme_duplicate | 79 | Projects appearing in multiple scheme rounds |
| capacity_mismatch | 36 | Scheme capacity differs from project file |
| name_mismatch | 12 | Scheme name significantly different from project file name |
| missing_coordinates | 9 | Active projects without map coordinates |
| technology_mismatch | 2 | Scheme and project disagree on technology type |

### Key Issues Resolved This Session

1. **Willogoleche / Willogoleche 2** — Created separate project file for Willogoleche 2 (development, 108 MW). Fixed CIS Tender 4 references to point to new project instead of operating Willogoleche.
2. **Mokoan / West Mokoan** — Fixed project_id in scheme data: West Mokoan now correctly points to \`west-mokoan-solar-farm-and-bess\` instead of \`mokoan-solar-farm\`. Fixed status from "operating" to "development".
3. **Liddell BESS** — Consolidated to single 500 MW entry under CIS Pilot NSW. Removed duplicate from LTESA Round 2 (same combined round, one contract).

### Issues Requiring Future Investigation

- **Smithfield Battery (235 MW in CIS Pilot vs 65 MW in project file)** — likely same combined round issue as Liddell
- **Orana BESS** — appears in both CIS Pilot and LTESA R2, may need same consolidation as Liddell
- **Hargaves BESS vs Hargraves BESS** (300 MW vs 710 MW) — possible spelling error creating duplicate
- **Blue Mackerel North Off Shore vs Offshore** — likely duplicate from capitalisation difference

---

## Recommended Workflow

1. **After data import:** Run \`python3 pipeline/generators/generate_data_quality.py\`
2. **Review high-severity issues** printed to console
3. **Fix confirmed issues** in the relevant source files (project JSON, scheme-rounds.ts, esg-tracker-data.ts, export_json.py)
4. **Re-run audit** to verify fixes and check for regressions
5. **Commit** the updated data-quality.json alongside your fixes`,
  },
  {
    id: 'learning-module-constraints',
    title: 'Learning Module Plan: NEM Constraints & Constraint Equations',
    description: 'Build plan for the 7-lesson interactive learning module. Documents scope, lesson content, interactive components, data sources, and implementation status.',
    icon: '🎓',
    category: 'roadmap',
    readingTime: '8 min read',
    added: '2026-05-09',
    content: `# Learning Module Plan: NEM Constraints & Constraint Equations

## Overview

A 7-lesson interactive learning module under **Resources → Learning** explaining how network constraints work in the NEM — from physical phenomena through to market price impacts and data access. Content is pitched at the WattClarity level: technically credible, data-first, real constraint IDs throughout.

**Route:** \`/learn/constraints\` and \`/learn/constraints/:lessonId\`

**Status:** Lessons 1–3 built. Lessons 4–7 content complete, interactive elements in progress.

---

## Lesson Inventory

### Lesson 1 — Why Dispatch Is More Than a Bid Stack ✅
*The problem constraints solve*

- NEMDE as Security-Constrained Economic Dispatch (SCED)
- The gap between "cheapest on paper" and "physically safe"
- What happens without constraints: thermal overloads, voltage collapse, cascading failures
- Scale: ~1,000 constraint equations active per 5-minute dispatch interval
- **Interactive:** 5-unit bid stack comparison — unconstrained vs constrained dispatch

### Lesson 2 — Anatomy of a Constraint Equation ✅
*The LHS / RHS structure*

- General form: \`Σ(Factor_i × Q_i) ≤ RHS\`
- LHS entities: generator DUIDs, interconnectors, scheduled loads, FCAS providers
- LHS factors: fractions of 1 MW injection reaching the monitored line
- RHS: line rating, stability limit, or dynamic SCADA-derived value
- Operators: ≤, ≥, =
- The 5 MMS tables: GENCONDATA, SPDCONNECTIONPOINTCONSTRAINT, SPDINTERCONNECTORCONSTRAINT, SPDREGIONCONSTRAINT, GENERICCONSTRAINTRHS
- The 0.07 minimum factor threshold (Dec 2025 rule change raising this)
- **Interactive:** Live constraint equation builder using real X5 (N^^N_NIL_3) factors

### Lesson 3 — Injection Shift Factors: Where the Numbers Come From ✅
*The maths behind LHS coefficients*

- DC power flow model — why it's linear and why AEMO uses it
- ISF definition: \`ISF(line, bus) = ΔFlow(line) / ΔInjection(bus)\`
- The swing bus: always the Regional Reference Node (RRN)
- Post-contingency ISFs: switch out the contingent element, rerun power flow
- Why radial lines have ISF = 1.0 and meshed lines have ISF < 1.0
- The 0.07 minimum threshold and normalisation rules
- **Interactive:** 4-bus network walkthrough with sliders showing how 1 MW splits across parallel paths

### Lesson 4 — Types of Constraints and Physical Phenomena 🔲
*What each constraint type is protecting against*

- Thermal limits (static vs dynamic line ratings, N-1 post-contingency thermal)
- Voltage stability (^^): N-1 voltage collapse limits
- Transient stability (::): rotor angle following a fault
- Oscillatory stability: inter-area oscillation modes, damping ratio ≥ 5%
- System strength / fault level: IBR penetration, SCR, SA_ISLE_STRENGTH example
- FCAS sufficiency constraints (D_ and F_ prefix equations)
- **Reference table:** one row per type — phenomenon, example constraint ID, typical binding frequency

### Lesson 5 — Constraint IDs, Sets, and the Operational Lifecycle 🔲
*How constraints get activated and decoded*

- Decoding constraint IDs: state prefix, type operator (^^, ::, >>), NIL vs outage-specific
- Worked decodes: N^^N_NIL_3, Q^^TR_CLHA_-600, V_NWVIC_GFT1_750, N-DPWG_63_X5
- Constraint sets: grouped equations invoked/revoked as outages occur
- The Network Outage Schedule
- Pre-dispatch vs dispatch RHS values (DS / PD / ST scope)
- The RPN (Reverse Polish Notation) RHS calculation engine
- **Interactive:** Constraint ID decoder — type in a real constraint ID, see plain-English breakdown

### Lesson 6 — Market Impacts: Shadow Prices and Congestion 🔲
*How binding constraints move spot prices*

- What "binding" means: LHS = RHS, marginal value ≠ 0
- Shadow price (marginal value): \`λ = ∂(dispatch cost) / ∂(RHS)\`
- Regional price separation from binding interconnector constraints
- Congestion rent: \`|P_export − P_import| × Flow × Duration\`
- CVP factors: priority order for constraint violations
- Case study 1 — X5 / N^^N_NIL_3: SW NSW solar curtailment
- Case study 2 — SA islanding (2020): Heywood trip, $90M+ FCAS bill
- Case study 3 — Opaque congestion (Jun 2024): N-DPWG_63_X5, 103 equations, hidden curtailment
- **Chart:** Top 10 most-binding 2024 constraints by marginal value from real DISPATCHCONSTRAINT data

### Lesson 7 — Working with Constraint Data 🔲
*Practical data access guide*

- AEMO Congestion Information Resource (CIR): CFG, Limits Advice Guidelines, Monthly Constraint Reports
- NEMweb MMS Archive: which ZIPs contain GENCONDATA, SPD tables, GENERICCONSTRAINTRHS
- NEMOSIS (Python): \`dynamic_data_compiler()\` for DISPATCHCONSTRAINT at scale
- Julius Susanto's NEM_constraints library: \`get_LHS_terms()\`, \`get_RHS_terms()\`
- AEMO MMS Data Model Report: column-level documentation
- **Interactive:** Constraint lookup panel — enter constraint ID, see binding stats from AURES data

---

## Key Data Sources Used

| Source | Used In |
|--------|---------|
| AEMO Constraint Formulation Guidelines v12 | Lessons 2, 3, 4 |
| AEMO Constraint Naming Guidelines (May 2013) | Lesson 5 |
| AEMO Congestion Information Resource (CIR) | Lessons 5, 7 |
| AEMO DISPATCHCONSTRAINT MMS table | Lessons 2, 6, 7 |
| AEMO GENCONDATA / SPD tables | Lessons 2, 7 |
| WattClarity constraint articles (X5, SA islanding, opaque congestion) | Lessons 1, 5, 6 |
| NEMOSIS Python package | Lesson 7 |
| Julius Susanto NEM_constraints library | Lesson 7 |
| AEMC Appendix A — Congestion in the NEM | Lesson 6 |

---

## Key Formulae

\`\`\`
Constraint equation:   Σ(ISF_i × Q_i) ≤ LineRating_post-contingency

ISF definition:        ISF(line ℓ, bus k) = ∂P_ℓ / ∂P_k  [swing at RRN]

Marginal value:        λ = ∂(ObjFn cost) / ∂(RHS)  [$/MW/DI]

Congestion rent:       |P_export − P_import| × Flow × Duration

CVP violation cost:    CVP × MarketPriceCap × ViolationDegree
\`\`\`

---

## Implementation Notes

- **Route tree:** \`/learn/constraints\` (module index) · \`/learn/constraints/:lessonId\` (individual lessons)
- **Components:** \`src/pages/learn/ConstraintsModule.tsx\` — single file containing module shell, lesson data, and all lesson content components
- **Style:** Inline styles for PDF-safe sections; Tailwind CSS variables for interactive UI. Follows the WattClarity "technically credible, data-first" standard — real constraint IDs throughout, real MMS table names, worked examples from actual NEMweb data
- **Progress tracking:** localStorage key \`aures-constraints-progress\` stores completed lesson IDs
- **Navigation entry:** Guides page → Learning category card → module index
- **Version shipped:** v2.51.0

---

## Lesson Status Legend

- ✅ Built and on main
- 🔲 Planned, not yet built
`,
  },
]

export const GUIDE_CATEGORIES = {
  about: { label: 'About AURES', color: '#0ea5e9' },
  technical: { label: 'Technical', color: '#8b5cf6' },
  process: { label: 'Process', color: '#22c55e' },
  roadmap: { label: 'Roadmap', color: '#f59e0b' },
} as const
