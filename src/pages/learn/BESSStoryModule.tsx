/**
 * The Solar + BESS Story in the NEM — AURES Learning Module
 *
 * 7 lessons that tell the full arc: residential solar boom →
 * commercial scale → behind-the-meter scale → cannibalisation →
 * Hornsdale → modern BESS economics → outlook. The solar boom is
 * what made BESS necessary, so the module starts there.
 */
import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-bess-story-progress'

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
  { id: 'rooftop-boom',             number: 1,  title: 'The Australian rooftop solar boom',                  subtitle: 'FITs, STCs, electricians and Chinese modules',         readingTime: '12 min' },
  { id: 'btm-scale',                number: 2,  title: 'Commercial solar and the hidden-demand effect',       subtitle: 'Operational demand vs underlying demand',              readingTime: '10 min' },
  { id: 'cannibalisation-mechanic', number: 3,  title: 'The cannibalisation mechanic',                        subtitle: 'Value factor, merit-order, why all solar is correlated', readingTime: '10 min' },
  { id: 'capture-price-decay',      number: 4,  title: 'Capture-price decay — by state and farm',             subtitle: 'Real AURES data from operating solar farms',           readingTime: '10 min' },
  { id: 'hornsdale',                number: 5,  title: 'Origins: Hornsdale and the Tesla bet',                subtitle: 'How a Twitter bet rewrote the orthodoxy',              readingTime: '10 min' },
  { id: 'how-earns',                number: 6,  title: 'How a battery actually earns',                        subtitle: 'Arbitrage, FCAS, capacity, with real AURES numbers',   readingTime: '11 min' },
  { id: 'duration-records',         number: 7,  title: 'The duration evolution and BESS records',             subtitle: '1-hour to 8-hour and the state-by-state leaderboard',  readingTime: '10 min' },
  { id: 'hybrid-architecture',      number: 8,  title: 'Hybrid architectures — what "hybrid" actually means',  subtitle: 'AC vs DC coupling, shared connection, charge sources', readingTime: '11 min' },
  { id: 'hybrid-economics',         number: 9,  title: 'Hybrid economics — solar+BESS vs standalone',         subtitle: 'Unit economics, bull/bear cases, what you must believe', readingTime: '12 min' },
  { id: 'hybrid-cis-push',          number: 10, title: 'Hybrids in the CIS — the policy push',                subtitle: 'T1 → T4 → T6: how Capacity Investment Scheme is reshaping the pipeline', readingTime: '10 min' },
  { id: 'spread-reduction',         number: 11, title: 'BESS spread reduction — does arbitrage eat itself?',  subtitle: 'Saturation dynamics and the California parallel',      readingTime: '9 min' },
  { id: 'outlook',                  number: 12, title: 'Where this is going — more solar, more batteries',    subtitle: 'Residential battery boom and ISP storage targets',     readingTime: '9 min' },
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
// Lesson 1 — The Australian rooftop solar boom
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>A genuine global outlier</H2>
      <P>
        Australia has more rooftop solar per capita than any country on earth. As of 2026, roughly{' '}
        <Em>one in three Australian dwellings has rooftop PV</Em> — about 4 million homes — adding up to
        more than 24 GW of installed capacity. That fleet generates 10-15% of all NEM electricity in any
        given year, more than 25% in summer afternoons, and more than 100% of South Australia's local
        load on perfect-condition days. None of this was foreseen in any official planning document
        from 2010, 2015, or even 2020. The Australian rooftop boom kept exceeding forecasts because three
        independent forces compounded: government support, falling module costs, and a uniquely
        competitive installer market.
      </P>

      <Callout type="key">
        The headline reason rooftop solar in Australia is so much bigger than in any comparable country
        is that <Em>Australian residential systems cost roughly $1.00-1.30 per watt installed</Em>,
        whereas US residential is $3.00-4.00/W and UK residential is around £1.50/W (~$2.80 AUD).
        The same 6.6 kW system costs ~$7,000 here and ~$22,000 in the US. The economics are simply
        different — and they are different not because Australians have lower wages (we don't) but
        because of a specific industry structure described below.
      </Callout>

      <H2>Phase 1 — the premium feed-in tariff era (2008-2014)</H2>
      <P>
        Australian rooftop solar started small and was kicked off by state government feed-in tariff
        (FIT) schemes that paid premium rates for solar exports. The most famous were:
      </P>
      <Table
        emphasizeFirst
        headers={['State', 'Scheme', 'Rate', 'Open period', 'Notes']}
        rows={[
          ['NSW', 'Solar Bonus Scheme', '60 c/kWh gross (later 20 c)', 'Jan 2010 – Apr 2011 closed to new applicants', 'Expensive in retrospect — locked NSW consumers into ~$1.7B of payments through 2016'],
          ['VIC', 'Premium FIT', '60 c/kWh net', 'Nov 2009 – Sep 2011', 'Tied to gross export only; closed to new entrants 2011'],
          ['SA', 'Solar FIT', '44-54 c/kWh', '2008-2013 (multiple revisions)', 'Closed cohort still benefiting through 2028'],
          ['QLD', 'Solar Bonus Scheme', '44 c/kWh net', 'Jul 2008 – Jul 2012', 'Closed in 2012; legacy customers grandfathered to 2028'],
          ['ACT, WA, TAS', 'Various FITs', '20-50 c/kWh', '2010-2013', 'All closed to new entrants by 2013'],
          ['Federal SHCP', 'Solar Homes & Communities Plan rebate', '$8,000 cash rebate', '2008-2009', 'Cash up-front rebate that kicked off the first wave'],
        ]}
      />
      <P>
        These FITs were rationalised down (sometimes abruptly, generating political controversy) once
        the cost of solar dropped enough that lower export rates were sufficient. By 2013-14, premium
        FITs were closed to new customers; what remained were 1:1 net feed-in tariffs at ~10-15 c/kWh,
        which are still the dominant retail offering today.
      </P>

      <H2>Phase 2 — STCs and the regulated subsidy (2011-present)</H2>
      <P>
        From 2011, the Renewable Energy Target's small-scale component was carved out as the{' '}
        <Em>Small-scale Renewable Energy Scheme (SRES)</Em>, generating Small-scale Technology
        Certificates (STCs). Each STC represents 1 MWh of expected lifetime generation. A typical 6.6 kW
        residential system in Sydney generates ~80 STCs at installation. Liable retailers (those who sell
        electricity) must surrender STCs in proportion to their sales, creating demand. STC prices have
        traded in the $30-40 range for most of the past decade — meaning the average residential install
        receives an upfront subsidy of roughly $2,400-3,200 (paid by the installer to the customer as a
        point-of-sale discount).
      </P>
      <P>
        The SRES is scheduled to wind down in 2030. A 6.6 kW system installed in 2026 will receive only
        4 years' worth of STCs (one per remaining year). This is one of the reasons the residential
        solar industry has been pushing customers to install <Em>now</Em> — and why the Federal
        Government's 2025 Cheaper Home Batteries policy was timed to extend support past the SRES
        sunset.
      </P>

      <H2>Phase 3 — the Australian installer cost advantage</H2>
      <P>
        This is the most under-appreciated piece of the story. Australia has approximately{' '}
        <Em>10,000+ accredited solar installers</Em>, the vast majority of which are sole operators or
        small partnerships of 2-10 electricians. The Clean Energy Council accreditation regime requires
        a licensed electrician with solar PV training, but otherwise has very few barriers to entry. The
        result is a hyper-competitive installer market.
      </P>
      <P>
        Compare to the US, where:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>State-level licensing plus city-level permitting take 60-90 days for a typical residential install</li>
        <li>Two large companies (Sunrun and SunPower historically; Tesla via Solar Roof; some
          regional players) dominate residential</li>
        <li>Soft costs (permitting, customer acquisition, sales commissions) are 50-60% of total install
          cost</li>
        <li>Module costs are similar to Australia, but everything else is 2-3× more expensive</li>
      </ul>
      <P>
        Compare to the UK and most of Europe, where:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Electrical regulation is stricter and licensing burden higher</li>
        <li>The installer market is less fragmented — fewer single-electrician operators</li>
        <li>VAT and other taxes are higher</li>
        <li>Result: ~£1.50/W vs Australia's ~$1.10/W — but with much lower roof orientations
          economics due to higher latitude and weather</li>
      </ul>
      <P>
        Australia's combination of <Em>(a) low installer overhead, (b) no permitting friction, and{' '}
        (c) standardised AS/NZS-compliant equipment</Em> means a 6.6 kW install is a 1-2 day job by a
        single electrician + apprentice, completed end-to-end within 2-4 weeks of customer enquiry. That
        is the single biggest cost advantage and is structurally hard to replicate elsewhere.
      </P>

      <Callout type="info">
        The Australian electrician industry has historically been adversarial about &ldquo;solar
        cowboys&rdquo; — installers who cut corners on safety. The Clean Energy Council does enforce
        accreditation removal for repeat offenders, and the most egregious operators have been
        prosecuted. But the broader pattern — many small operators competing aggressively on price —
        has been a powerful force keeping costs down. It's an example where labour-market structure
        beat regulatory consolidation.
      </Callout>

      <H2>Phase 4 — Chinese modules and the dumping question</H2>
      <P>
        The other half of the cost story is module pricing. Module prices have collapsed about{' '}
        <Em>90% over the past decade</Em>:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'Module spot price (US$/W)', 'Driver']}
        rows={[
          ['2010', '~$2.00/W', 'First-generation crystalline silicon, mostly European and US makers'],
          ['2014', '~$0.65/W', 'Chinese manufacturing scale, US/EU anti-dumping tariffs in place'],
          ['2018', '~$0.30/W', 'Continued Chinese scale, automation, polysilicon glut'],
          ['2022', '~$0.22/W', 'COVID-era supply chain pressure briefly reversed the decline'],
          ['2024', '~$0.10/W', 'Significant overcapacity in Chinese manufacturing, polysilicon prices crashed'],
          ['2026', '~$0.10/W (with PERC) — bifacial / TOPCon at $0.12-0.14/W', 'Industry oversupply continues'],
        ]}
      />
      <P>
        Chinese manufacturers (Trina, Jinko, Longi, JA Solar, Canadian Solar — though &ldquo;Canadian&rdquo;
        Solar is mostly Chinese-manufactured) dominate global supply, with roughly 80-85% of world
        production by capacity in 2024. The question of whether this is <Em>dumping</Em> — selling
        below cost to capture market share — is genuinely contested:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Yes:</Em> the US Department of Commerce, the European Commission, and India have all
          formally found dumping and applied tariffs. The 2022-24 anti-dumping investigations in the US
          extended to Chinese modules manufactured in Cambodia, Malaysia, Thailand, and Vietnam — finding
          circumvention was widespread.</li>
        <li><Em>No (Chinese position):</Em> low prices reflect genuine manufacturing efficiency, vertical
          integration with polysilicon, scale economies, and currency. Recent industry losses among
          Chinese makers (Longi, Jinko reporting losses 2024) suggest prices are at or below break-even
          even before subsidies.</li>
        <li><Em>Australia's position:</Em> Australia has not imposed anti-dumping duties on Chinese
          solar modules. The Australian Competition and Consumer Commission and Anti-Dumping
          Commission have considered cases, but no duties have been applied to PV modules to date.
          This means Australian installers source the same modules as global markets do, but pay no
          tariff premium on top.</li>
      </ul>

      <Callout type="warn">
        It is fair to say that <Em>the absence of Australian anti-dumping action has been a material
        cost advantage</Em> for Australian residential solar relative to the US/EU. Whether that is
        good policy is a separate question — supporters argue it speeds the transition; critics argue
        it accepts subsidised supply chains and forecloses domestic manufacturing options. As of 2026
        the question remains live, with the Federal Government's Future Made in Australia agenda
        funding pilot Australian module manufacturing.
      </Callout>

      <H2>The cumulative effect — the world's biggest rooftop fleet</H2>
      <Table
        emphasizeFirst
        headers={['Year', 'Installed rooftop capacity (GW)', 'Households (m)', 'Share of dwellings']}
        rows={[
          ['2014', '~3 GW', '~1.6 m', '~17%'],
          ['2018', '~8 GW', '~2 m', '~22%'],
          ['2022', '~17 GW', '~3 m', '~28%'],
          ['2024', '~22 GW', '~3.6 m', '~31%'],
          ['2026', '~26 GW', '~4 m', '~33-35%'],
        ]}
      />
      <P>
        For comparison: Germany has roughly 12 GW of residential rooftop on a population three times
        the size. The US has ~25 GW of residential rooftop on a population 13× larger. The UK has
        roughly 5 GW. Australia's rooftop fleet, on a per-capita basis, is comfortably the world's
        largest.
      </P>

      <Callout type="source">
        Sources: Clean Energy Regulator <em>Postcode data</em> ·
        Australian PV Institute <em>APVI dashboard</em> ·
        Clean Energy Council <em>Clean Energy Australia annual report</em> ·
        BloombergNEF <em>Solar Module Price Index</em> ·
        IEA-PVPS <em>Trends in Photovoltaic Applications</em> ·
        US ITC anti-dumping decisions on Chinese modules (2012, 2014, 2022-24) ·
        SunWiz <em>Australian PV market reports</em> ·
        AEMC <em>Residential Electricity Price Trends</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — Commercial solar and behind-the-meter scale
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>The commercial scale-up</H2>
      <P>
        Once residential solar hit saturation in any given suburb, the installer industry moved to the
        commercial segment — schools, factories, supermarkets, warehouses, council buildings. Commercial
        systems are typically <Em>30 kW – 1 MW</Em> in scale, sit on flat or low-pitched roofs, and are
        installed in days rather than weeks. They share the residential cost-advantage thesis (small,
        competitive installers; standardised equipment; light permitting) but with bigger systems and
        often more sophisticated financing — solar PPAs at the building level, performance guarantees,
        and increasingly battery co-location.
      </P>
      <P>
        As of 2026, commercial PV adds roughly <Em>4-5 GW</Em> on top of the residential 26 GW, for a
        total behind-the-meter (BTM) fleet of ~30-31 GW. That is more than half of total installed
        renewable capacity in Australia and substantially more than all utility-scale solar combined
        (~10-12 GW utility solar in the NEM).
      </P>

      <Table
        emphasizeFirst
        headers={['Sector', 'Approx capacity', 'Typical system', 'Trend']}
        rows={[
          ['Residential', '~26 GW', '6-13 kW', 'Mature; growth slowing in saturated areas; battery attach picking up'],
          ['Commercial mid-scale', '~3-4 GW', '30 kW – 1 MW', 'Strongest growth segment; PPA financing increasingly available'],
          ['Industrial / large commercial', '~1 GW', '1-5 MW (sometimes ground-mounted)', 'Emerging — major retailers, miners, agribusiness'],
        ]}
      />

      <H2>Operational demand vs underlying demand</H2>
      <P>
        AEMO publishes two demand metrics for the NEM:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Operational demand</Em> — what the grid sees. The energy actually drawn from the
          transmission network, after rooftop solar has been netted off behind-the-meter consumption.</li>
        <li><Em>Underlying demand</Em> — total energy actually consumed. The sum of grid imports plus
          rooftop generation that was self-consumed. This is the &ldquo;real&rdquo; consumption — the
          number you'd see if rooftop solar didn't exist.</li>
      </ul>

      <Callout type="key">
        The gap between underlying demand and operational demand is what behind-the-meter solar
        contributes. In Q1 2026, the gap was roughly <Em>15-20% of underlying demand on average</Em>,
        and as much as <Em>40-50% during midday solar peaks in SA, VIC and QLD</Em>. AEMO's grid view
        of demand is therefore systematically smaller than the underlying load — and getting more so
        every year as new rooftop comes online.
      </Callout>

      <H2>The hidden demand growth problem</H2>
      <P>
        Behind-the-meter solar masks an important fact: <Em>total electricity consumption is growing
        again</Em>. After fifteen years of flat or declining operational demand (driven by rooftop
        offset, energy efficiency, and economic restructuring away from heavy industry), the grid is
        starting to see structural demand growth from three sources:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Data centres</Em> — Australia is forecast to need 2-4 GW of additional data-centre
          capacity by 2030 to host hyperscale (AWS, Microsoft, Google) workloads, plus AI training
          loads. Sydney and Melbourne are the hubs.</li>
        <li><Em>Electric vehicles</Em> — by mid-2026, ~10% of new car sales are EVs and growing. EV
          home charging is largely overnight and behind-the-meter, so the visible demand impact is
          small today but compounds.</li>
        <li><Em>Heating and cooking electrification</Em> — gas-to-electric switching for hot water,
          heating, and stoves. State policies (VIC mandating no new gas connections for new homes
          from 2024) are accelerating this.</li>
      </ul>
      <P>
        The combination — <Em>underlying demand rising, rooftop solar offsetting most of the
        growth</Em> — means operational demand has stayed flat-ish even as the actual use of
        electricity has grown. AEMO's 2024 ESOO and 2026 ISP both flagged this divergence. Forecasting
        is harder when the visible signal (operational demand) and the underlying reality (consumption)
        are pulling apart.
      </P>

      <H2>Minimum demand events</H2>
      <P>
        At the extreme end, behind-the-meter solar can push <Em>operational demand to record lows</Em>.
        The phenomenon is called a minimum demand event, and it has gone from theoretical to routine
        in the last five years:
      </P>
      <Table
        emphasizeFirst
        headers={['Region', 'First minimum demand event', 'Recent record', 'Notes']}
        rows={[
          ['SA', 'Sun 11 Oct 2020 — first negative operational demand in any NEM region', '~−330 MW (~Q4 2024)', 'SA exports to VIC during these events; PEC adds export capacity'],
          ['QLD', 'Late 2022 — operational demand dipped below 4 GW', 'Q1 2025 - dipped to ~3.8 GW', 'Hot mid-day peaks remain high'],
          ['VIC', 'Q4 2023 — operational demand below 3 GW', 'Q1 2026 — sustained below 3.5 GW for several spring weekends', 'High rooftop density'],
          ['NSW', 'Not yet — but trending', 'Lowest operational demand recorded ~6 GW', 'Larger fleet of industrial loads keeps NSW underlying demand higher'],
          ['TAS', 'N/A — different system, low rooftop density', '—', 'Hydro-dominant; rooftop is smaller share'],
        ]}
      />

      <Callout type="warn">
        Minimum demand events stress the grid in ways that maximum demand events don't. With low load
        and high renewable injection, frequency stability becomes harder, system strength weakens, and
        thermal generators face the choice of operating below technical minimums or shutting down. The
        AEMC has been working through frequency response services, system strength services, and
        emergency-load mechanisms to manage them. The grid was not designed for this; it is being
        retrofitted.
      </Callout>

      <H2>Why this matters for the BESS story</H2>
      <P>
        Three implications flow from the behind-the-meter scale that the BESS story will pick up:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Cannibalisation</Em> — every GW of rooftop solar pushes midday wholesale prices closer
          to zero, which makes utility-scale solar economics worse, which creates the BESS opportunity
          (Lesson 3).</li>
        <li><Em>The duck curve</Em> — operational demand has a pronounced midday dip and an evening
          peak. Steeper than California's famous duck curve. The shape favours storage that can charge
          midday and discharge evening.</li>
        <li><Em>Regulatory complexity</Em> — AEMO and the AEMC have had to invent rules for
          behind-the-meter that they didn't expect. Distributed Energy Resources (DER) management,
          dynamic operating envelopes, and flexible export limits are all responses to the BTM scale
          that nobody planned for in 2010.</li>
      </ul>

      <Callout type="source">
        Sources: AEMO <em>Quarterly Energy Dynamics</em> ·
        AEMO <em>2024 Electricity Statement of Opportunities (ESOO)</em> ·
        AEMO <em>Integrated System Plan 2024 + 2026</em> ·
        Australian PV Institute <em>operational vs underlying demand reports</em> ·
        AEMC <em>System security and reliability rule changes</em> ·
        Clean Energy Council <em>Distributed Energy Resources strategy</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — The cannibalisation mechanic (deep dive)
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>The headline equation</H2>
      <P>
        Cannibalisation isn't a metaphor or a marketing phrase — it's a specific economic phenomenon
        with a specific measurement. The standard metric is{' '}
        <Em>value factor</Em>:
      </P>
      <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-4 my-4 font-mono text-sm leading-relaxed">
        <Em>Value factor</Em> = <code>capture price</code> ÷ <code>time-averaged regional reference price</code>
      </div>
      <P>
        A value factor of 1.00 means the project earns exactly the pool average — the energy gets paid
        the same as if it had been sold steadily across all hours. A value factor of 0.65 means the
        project earns 35% less than the pool average, because it generates concentrated in low-price
        hours. Utility-scale solar in Australia typically sits at 0.50-0.85 today, down from 0.90+ in
        2018-2019. That decline is cannibalisation, in a single number.
      </P>

      <Callout type="key">
        The mechanic in plain language: every solar farm in a region generates at almost exactly the
        same time of day — when the sun is up — because they all rely on the same underlying resource.
        That perfect correlation means their generation is concentrated in a narrow daily window.
        Concentrated supply hitting a finite demand pushes the local price down. The more solar there
        is, the steeper the price collapse. Each farm therefore earns less per MWh as more solar joins
        the system. That is cannibalisation.
      </Callout>

      <H2>The merit-order effect, formally</H2>
      <P>
        Markets clear at the marginal generator's offer price — the price of the next MWh of supply
        needed to meet demand. In the NEM, generators submit bids representing the price at which they
        are willing to dispatch, and NEMDE (the dispatch engine) selects the cheapest bids that
        collectively meet demand. Solar's marginal cost is essentially zero (no fuel; the sun is free),
        so solar bids at very low prices — typically $-50 to $0/MWh. When solar output ramps up, it
        displaces the most expensive marginal generator at the time.
      </P>
      <P>
        Pre-2015, solar displaced gas peakers, which were typically the marginal generator on hot
        midday-summer afternoons. The merit-order effect was modest: a 100 MW solar farm operating at
        peak would reduce wholesale prices by maybe $5-10/MWh during its dispatch hours. The first
        order economics looked fine for the new entrant. But as solar capacity grew:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Solar started displacing coal — coal's marginal cost is ~$15-25/MWh. Solar bidding below
          that pushed coal off-line during peak solar hours, dropping prices.</li>
        <li>Eventually solar started displacing <Em>other solar</Em> — bidding negative to ensure
          dispatch. Wholesale prices crashed to floor or below.</li>
        <li>The marginal generator setting price during solar peak became <Em>another solar generator
          bidding negative</Em>. At that point the price-setting mechanism is unstable: the market
          is signalling there is too much supply, and someone has to leave.</li>
      </ul>

      <H2>Why solar is perfectly correlated within a region</H2>
      <P>
        The unique feature of solar (vs wind) is that within any reasonable geographic region, every
        solar farm has nearly the same hourly output profile. The sun is essentially a synchronous
        signal: it rises at the same time across a state, peaks at the same time, sets at the same
        time. Cloud cover varies, but the underlying envelope is identical. By contrast, wind output
        across NSW is much more decorrelated — a wind farm in the New England Tablelands can be
        flat-out when one in the Riverina is becalmed. That's why <Em>wind has a much smaller
        cannibalisation problem than solar</Em>, and why the wind value factor decline has been
        gentler.
      </P>

      <H2>The hourly profile and the duck</H2>
      <P>
        Plot operational demand over a typical day in 2026 and you get the famous &ldquo;duck curve&rdquo;
        — a deep midday belly (solar offsetting load) followed by a steep evening shoulder (sun setting,
        load rising). The deeper the duck, the worse cannibalisation gets. AEMO's QED reports a
        typical mid-spring weekday in NSW now shows operational demand dropping from ~10 GW morning
        peak to ~5-6 GW midday trough, then ramping to ~12 GW evening peak — a 6-7 GW swing across
        ~5 hours. That swing is exactly the spread that batteries arbitrage.
      </P>

      <H2>Negative spot prices — mechanism and who pays</H2>
      <P>
        Negative prices happen when there is more supply than demand AND non-zero-cost producers are
        unwilling to shut down. Coal and gas plants with minimum stable load requirements would rather
        pay to keep running than incur the cost of stopping and restarting. So they bid down toward
        zero, even into negative territory, to ensure they stay in the dispatch order. Solar generators
        with contracted offtake or LGC-bundled revenue have positive non-market revenue per MWh, so
        they too bid below the cost of curtailment.
      </P>
      <P>
        Who pays for negative prices? The generator with merchant exposure absorbs the loss directly.
        Retailers benefit (they pay nothing or are paid to take energy). Consumers see the effect later
        — wholesale price savings flow through to retail prices over time. The big losers are merchant
        solar farms without long-term offtake, which are increasingly rare because new build-out
        requires contracted revenue floors (CIS, LTESA, PPAs).
      </P>

      <Callout type="numbers">
        Worked example. A 200 MW solar farm in SA generates 50,000 MWh in a quarter. The
        capacity-weighted average NEM SA RRP for that quarter is $65/MWh. If the farm captured the
        time-weighted average, it would earn $65 × 50,000 = $3.25M. But its volume-weighted capture
        price (because it produces during midday troughs) is $35/MWh, so it actually earns $35 ×
        50,000 = $1.75M. The difference — $1.5M — is the cannibalisation gap. Value factor =
        35/65 = 0.54.
      </Callout>

      <H2>The math of cannibalisation vs penetration</H2>
      <P>
        Empirically, value factor declines roughly linearly with solar penetration up to a point, then
        accelerates as penetration approaches local market saturation. Aurora Energy Research and
        Cornwall Insight have published curves showing:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>0-15% solar share of generation</Em> — VF stays near 0.95-1.00 (modest discount)</li>
        <li><Em>15-25% solar share</Em> — VF declines ~0.5 pp per percentage point of solar growth, so
          VF reaches roughly 0.85 at 20% solar share</li>
        <li><Em>25-40% solar share</Em> — VF declines accelerate, ~1 pp VF per 1 pp solar. SA today is
          at ~40% solar share and VF for utility solar is 0.50-0.60.</li>
        <li><Em>40%+ solar share</Em> — saturation. Additional solar is largely curtailed or
          self-cannibalises. New solar without storage becomes uneconomic.</li>
      </ul>

      <Callout type="source">
        Sources: AEMO <em>Quarterly Energy Dynamics</em> with regional price-duration curves ·
        Aurora Energy Research <em>Australia capture price modelling</em> ·
        Cornwall Insight <em>Australia solar value factor reports</em> ·
        UNSW CEEM <em>cannibalisation literature</em> ·
        Joachim Seel et al, LBNL <em>cannibalisation curves international</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — Capture price decay (with AURES data)
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>What the numbers actually look like</H2>
      <P>
        Lesson 3 explained the cannibalisation mechanic in theory. This lesson shows the empirical
        reality using AURES data from operating solar farms across the NEM. Every utility-scale solar
        farm tracked by AURES has a value factor, a capture price, and a year-by-year trajectory; we
        present the patterns here and link to the underlying farm-level data.
      </P>

      <Callout type="info">
        For per-project capture price, value factor, and seasonal breakdowns, see the AURES{' '}
        <Link to="/intelligence/revenue" className="text-[var(--color-primary)] hover:underline">
          Revenue Intelligence
        </Link>{' '}
        page or any individual solar project's Performance tab in the project database.
      </Callout>

      <H2>Value factor by region, 2018-2026</H2>
      <P>
        Capacity-weighted average value factor for utility solar in each NEM region:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'SA', 'VIC', 'NSW', 'QLD', 'NEM avg']}
        rows={[
          ['2018', '0.92', '0.95', '0.96', '0.97', '0.95'],
          ['2020', '0.78', '0.85', '0.88', '0.89', '0.86'],
          ['2022', '0.64', '0.74', '0.81', '0.81', '0.76'],
          ['2024', '0.52', '0.66', '0.74', '0.73', '0.67'],
          ['2026 (est)', '0.48', '0.60', '0.68', '0.67', '0.62'],
        ]}
      />
      <P>
        SA went from 0.92 to 0.48 in eight years — a 47% decline. Every region declined materially.
        The trajectories track solar penetration: SA has the highest solar share (~40% of generation),
        QLD and VIC have caught up rapidly, NSW lags slightly because its larger underlying load
        absorbs more solar before saturation.
      </P>

      <H2>Worst capture-price farms in 2024-25</H2>
      <P>
        The farms with the lowest capture prices are typically large, early-builds in SA or VIC's
        Mallee region where local solar density is highest. From AURES data:
      </P>
      <Table
        emphasizeFirst
        headers={['Farm', 'State', 'Size', 'VF 2024', 'Why this low']}
        rows={[
          ['Bungala Solar', 'SA', '275 MW', '~0.42', 'Among earliest-build SA solar; co-located with another large solar farm; heavy local oversupply'],
          ['Daydream Solar', 'QLD', '180 MW', '~0.55', 'North QLD; far from major load; constrained transmission limits export during peak generation'],
          ['Hayman Solar', 'QLD', '50 MW', '~0.55', 'Co-located with Daydream — same constraints'],
          ['Limondale Solar', 'NSW (SW REZ)', '349 MW', '~0.62', 'PEC pre-energisation suffered curtailment; post-PEC capture should improve materially'],
          ['Yatpool Solar', 'VIC', '88 MW', '~0.58', 'Mallee region — VIC\'s solar belt — heavy local oversupply'],
        ]}
      />

      <H2>Best capture-price solar — the regional outliers</H2>
      <P>
        Some farms buck the trend. They tend to be either (a) in areas with strong local industrial
        load, (b) in transmission-constrained regions where exports cap local oversupply, or (c)
        co-located with storage that captures the cannibalised value:
      </P>
      <Table
        emphasizeFirst
        headers={['Farm', 'State', 'Size', 'VF 2024', 'Why this high']}
        rows={[
          ['Bomen Solar', 'NSW (SW REZ)', '120 MW', '~0.78', 'Near Wagga industrial load + good network position'],
          ['Sunraysia Solar', 'NSW', '255 MW', '~0.75', 'Operational improvements + transmission position'],
          ['Glenrowan West Solar', 'VIC', '132 MW', '~0.77', 'Smaller VIC fleet share + good network position'],
          ['Goulburn River Solar', 'NSW', '450 MW (in construction)', 'Targeted 0.80+', 'Co-located battery (3-hour) recovers cannibalised midday value'],
        ]}
      />

      <H2>Curtailment — economic vs technical</H2>
      <P>
        Curtailment is when a solar farm is dispatched <Em>below</Em> what it could physically produce.
        There are two distinct types:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Economic curtailment</Em> — the farm voluntarily bids high to avoid being dispatched
          at negative prices. This is bid-driven. It's a strategy, not a system failure. Negative
          prices force this on uncontracted merchant farms.</li>
        <li><Em>Technical curtailment</Em> — AEMO directs the farm to reduce output because of
          network constraints, system strength shortages, or thermal-line limits. This is
          dispatch-driven. The farm receives no revenue for the curtailed MWh and has no economic
          choice.</li>
      </ul>
      <P>
        AURES tracks both. The Solar Value Analysis page on each operating project shows the split.
        For SA solar farms, technical curtailment was ~10-15% of capable MWh in 2023; for QLD it was
        ~5-8%. Post-PEC, SA technical curtailment has dropped to ~5-8%.
      </P>

      <H2>The "diversity capture premium" metric</H2>
      <P>
        AURES tracks a per-farm metric called the <Em>Diversity Capture Premium</Em>: the $/MWh by
        which a farm's capture price exceeds (or trails) the volume-weighted state fleet average. A
        positive premium means the farm is somehow capturing better than the fleet — usually because
        of generation profile differences (e.g. tracker vs fixed-tilt, different shading patterns) or
        network-position advantages. As of 2026, the largest diversity capture premium for an
        operating Australian solar farm is around +$4/MWh (Glenrowan West VIC); the worst is around
        −$8/MWh (Bungala). See any solar farm's individual Solar Value Analysis page for its value.
      </P>

      <Callout type="warn">
        Capture price decay is not symmetric — it is biased toward decline. Once cannibalisation
        kicks in, recovery is slow and depends on storage build-out, demand growth, or coal closures.
        In SA the value factor decline of 0.04-0.05 pp/yr has been steady for eight years; only
        Hornsdale's expansion and the broader BESS build-out has slowed but not reversed it.
      </Callout>

      <Callout type="source">
        Sources: AURES{' '}
        <Link to="/intelligence/revenue" className="text-[var(--color-primary)] hover:underline">
          Revenue Intelligence
        </Link>{' '}
        and individual project Solar Value Analysis pages ·
        AEMO Quarterly Energy Dynamics — capture-price disclosures ·
        Aurora Energy Research <em>Australia solar capture-price reports</em> ·
        Cornwall Insight <em>Australia capture price reports</em> ·
        Modo Energy <em>solar value factor by region</em> ·
        Operator quarterly disclosures (Tilt, Genex, Edify).
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — Hornsdale (renumbered from old Lesson 4)
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>The 28 September 2016 South Australia blackout</H2>
      <P>
        It started with severe weather. On 28 September 2016, three tornadoes hit transmission towers
        north of Adelaide. Within seconds, multiple 275 kV lines tripped, voltage and frequency excursions
        cascaded across the SA grid, and several wind farms tripped offline en masse via their (then
        relatively new) low-voltage ride-through settings. SA was islanded from the rest of the NEM,
        underfrequency load shedding triggered, and the entire state went black for several hours.
      </P>
      <P>
        The political reaction was severe. Then-PM Malcolm Turnbull blamed renewable energy publicly
        within days; AEMO's review eventually placed the cause on the cumulative effect of multiple
        line failures plus the ride-through configurations on wind farms. SA's response — coordinated
        by Premier Jay Weatherill — was to commission a 100 MW grid-scale battery as part of a broader
        package of grid reliability measures. The battery would provide rapid-response frequency
        control to prevent a similar cascade in future.
      </P>

      <Callout type="info">
        Important context: the 100 MW battery was conceived as a <Em>grid stability asset</Em> first,
        an arbitrage asset second. Its primary value proposition was preventing future blackouts via
        sub-second frequency response. The arbitrage and FCAS revenue that turned out to dominate its
        actual returns was a happy surprise.
      </Callout>

      <H2>The Twitter bet</H2>
      <P>
        In March 2017, Atlassian co-founder Mike Cannon-Brookes had a Twitter exchange with Tesla CEO
        Elon Musk about whether Tesla could deliver a 100 MW battery to SA. Musk responded famously:
        &ldquo;Tesla will get the system installed and working 100 days from contract signature or it
        is free.&rdquo; Cannon-Brookes engaged then-PM Turnbull and Weatherill in the exchange, and the
        promise became politically binding.
      </P>
      <P>
        Tesla won the SA tender in July 2017 in partnership with Neoen, the French renewable developer.
        The site was at Neoen's Hornsdale Wind Farm near Jamestown, ~200 km north of Adelaide. Final
        contract signature was 29 September 2017. Construction commenced immediately. The 100 MW /
        129 MWh battery was energised on <Em>1 December 2017 — 60 days under the deadline</Em>. It was
        the largest grid-scale lithium-ion battery in the world at the time, and the fastest delivery
        of any major energy infrastructure project in Australian history.
      </P>

      <H2>The FCAS surprise</H2>
      <P>
        Hornsdale Power Reserve started commercial operation in December 2017. Within weeks, it had
        captured an outsized share of SA's contingency frequency control market — the FCAS markets that
        pay generators to respond to frequency excursions. The reason: a battery's response is{' '}
        <Em>sub-second</Em> and arbitrarily precise, whereas thermal and hydro plant has multi-second
        delays and physical lag. AEMO's market dispatch optimiser preferred Hornsdale's FCAS bids for
        almost every interval where it was available.
      </P>

      <Callout type="numbers">
        Hornsdale's 2018 financials (per Neoen's annual report): <Em>~$24M of revenue from a $90M
        capex base in its first full year</Em>, of which ~70% came from FCAS contingency markets and
        ~25% from energy arbitrage. Pre-Hornsdale, the SA contingency-raise prices had averaged
        ~$8-12/MW/hr. Post-Hornsdale, prices fell to $1-3/MW/hr — Hornsdale alone had collapsed the
        market price for the service it provided. AEMO published reports showing SA consumers had
        benefited by an estimated $116M in the first 24 months.
      </Callout>

      <H2>The 2019 expansion</H2>
      <P>
        The success of the original 100 MW prompted a 50% expansion. In November 2019, Neoen and Tesla
        commissioned an additional 50 MW / 64.5 MWh, bringing Hornsdale to{' '}
        <Em>150 MW / 193.5 MWh total</Em>. The expansion was funded partly by ARENA, partly by Neoen,
        and partly by SA Government grants — a structure that became the template for several
        subsequent batteries (Victorian Big Battery, Wallgrove, Bouldercombe).
      </P>

      <H2>Why Hornsdale broke the orthodoxy</H2>
      <P>
        Before Hornsdale, the consensus view was that grid-scale batteries were not economic. The
        battery industry had been promising &ldquo;within 5 years&rdquo; for ~15 years running.
        Hornsdale changed three beliefs:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Speed of delivery</Em> — 100 MW in 100 days demonstrated that grid-scale batteries
          could be built faster than any thermal or hydro project. Lower regulatory friction, modular
          equipment, factory-built components.</li>
        <li><Em>Revenue stack reality</Em> — FCAS revenue alone could pay back a battery's capex in
          under 5 years. The arbitrage opportunity was the cherry on top, not the main course.</li>
        <li><Em>Market response speed</Em> — a single asset can transform the price of a market service.
          Hornsdale's effect on SA contingency prices was instantaneous and dramatic.</li>
      </ul>
      <P>
        Within 18 months of Hornsdale's commissioning, six more grid-scale battery projects had been
        announced or commenced in Australia. Within 5 years, Australia had more grid-scale battery
        capacity per capita than any country except possibly South Korea. Hornsdale was the proof
        point that turned the industry on.
      </P>

      <Callout type="source">
        Sources: AEMO <em>Black System South Australia 28 September 2016 final report</em> ·
        Neoen <em>annual reports 2017-2019</em> ·
        Tesla press releases ·
        AEMO <em>Hornsdale Power Reserve Year 1 and Year 2 reports</em> ·
        ARENA <em>Knowledge Sharing Hornsdale series</em> ·
        Aurecon <em>Hornsdale impact study</em> for Neoen.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — How a battery actually earns (renumbered from old Lesson 5)
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>The four revenue streams</H2>
      <P>
        A grid-scale battery in the NEM has four distinct revenue streams. The mix between them
        determines bid strategy, asset sizing (MW vs MWh), and operating profile. The four:
      </P>
      <Table
        emphasizeFirst
        headers={['Stream', 'What it pays for', 'Best suited to', 'Typical share of revenue']}
        rows={[
          ['Energy arbitrage', 'Charging at low price, discharging at high price', '2-4 hour batteries with high cycle count', '40-70% in 2024-26'],
          ['FCAS markets', 'Sub-second frequency response (raise/lower 6 sec, 60 sec, 5 min)', '1-hour batteries — fast response, low energy throughput', '15-40% (was 70%+ at Hornsdale Y1)'],
          ['Capacity / contracted offtake', 'CIS, LTESA, or corporate firmness contract — guaranteed revenue', 'All durations; 4+ hour for dispatchable contracts', '0-50% depending on contract'],
          ['System strength / inertia services', 'Network support contracts, mainly via TNSPs and SA AESIPS', 'Specialist sites — geographic placement matters', '0-15% (rare; site-specific)'],
        ]}
      />

      <H2>Arbitrage spread — the headline metric</H2>
      <P>
        The simplest way to read a battery's economics is the <Em>arbitrage spread</Em>: average
        discharge price minus average charge price, measured per MWh delivered. AURES tracks this
        per-battery across the NEM and presents it on the{' '}
        <Link to="/intelligence/bess-records" className="text-[var(--color-primary)] hover:underline">
          BESS Records Leaderboard
        </Link>
        . Typical 2024-26 numbers for Australian batteries:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>$120-180/MWh</Em> spread for SA batteries — best in the NEM, driven by SA's deeper
          midday solar trough and strong evening peak</li>
        <li><Em>$80-130/MWh</Em> spread for QLD and VIC batteries</li>
        <li><Em>$60-100/MWh</Em> spread for NSW batteries — typically lower because NSW's price spread
          is less extreme</li>
        <li><Em>$40-80/MWh</Em> spread for TAS — smallest market, less volatile</li>
      </ul>
      <P>
        Those numbers are <Em>before</Em> round-trip losses. A battery with an 85% RTE delivers about
        85% of the energy it absorbs, which is equivalent to a 15% discount on the spread. Real
        per-MWh-delivered margin is therefore ~85% of the headline spread.
      </P>

      <Callout type="numbers">
        Hornsdale 2018 economics (worked example): 100 MW × 1.29 hours = 129 MWh. Average ~250
        cycles/yr in Y1 (heavy FCAS, light arbitrage cycling) = ~32,000 MWh/year throughput. Energy
        margin ~$90/MWh. Energy revenue ~$2.9M. FCAS revenue ~$17M. Total ~$24M, against ~$90M capex
        + ~$1M/yr OPEX. Pre-tax payback ~4 years. By 2020, FCAS market saturation reduced FCAS
        revenue, but arbitrage revenue grew as cannibalisation deepened and the battery cycled more
        aggressively. Net effect: total revenue stayed in the $20-30M range.
      </Callout>

      <H2>The FCAS evolution</H2>
      <P>
        FCAS — Frequency Control Ancillary Services — is what made Hornsdale economic. The market has
        eight separate FCAS products in the NEM:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Regulation Raise + Lower</Em> — continuous fine-grained frequency adjustment</li>
        <li><Em>Contingency Raise / Lower at 6 seconds</Em> — fastest response to a major event</li>
        <li><Em>Contingency Raise / Lower at 60 seconds</Em> — sustained response</li>
        <li><Em>Contingency Raise / Lower at 5 minutes</Em> — recovery and restoration</li>
      </ul>
      <P>
        Pre-Hornsdale, hydro and gas dominated. Post-Hornsdale, batteries dominated the contingency
        markets within 18 months. Today FCAS prices are close to floor for most intervals because
        battery supply has saturated the markets. <Em>FCAS arbitrage is no longer a profitable
        anchor for new batteries</Em> — the next battery to commission will earn its first dollar from
        energy arbitrage, not from FCAS.
      </P>

      <H2>Cycle counts and degradation</H2>
      <P>
        Batteries degrade with cycling. A typical lithium-ion BESS today has:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Warranty for 350-500 full-equivalent cycles per year</li>
        <li>Designed degradation curve to ~70-80% of original capacity at end of warranty (~10-15 years)</li>
        <li>Replacement and augmentation cycles built into the operations plan</li>
      </ul>
      <P>
        A battery cycling more aggressively than warranty earns more money but degrades faster. A
        battery cycling less still loses some calendar-life capacity even if untouched. The optimal
        cycle rate depends on the spread and the battery's revenue stack. AURES tracks{' '}
        <Em>average cycles per year</Em> per battery in the leaderboard.
      </P>

      <Callout type="key">
        For a developer evaluating a BESS investment, the key economic levers are:<br/>
        (1) <Em>$/MW capex</Em> — currently $700k-$900k/MW for 4-hour, falling 5-8% per year;<br/>
        (2) <Em>arbitrage spread $/MWh</Em> in the connection point's region — varies as above;<br/>
        (3) <Em>cycle rate</Em> — function of spread and contracted profile;<br/>
        (4) <Em>round-trip efficiency</Em> — function of equipment and operating temperature;<br/>
        (5) <Em>contracted revenue floor</Em> — CIS, LTESA, or corporate offtake.<br/>
        Plug those into the AURES BESS Value Analysis on any operating BESS to see actual numbers.
      </Callout>

      <Callout type="source">
        Sources: AEMO <em>Quarterly Energy Dynamics</em> · AEMO <em>FCAS market design papers</em> ·
        Modo Energy <em>Australia BESS revenue reports</em> · Aurora Energy Research <em>BESS
        outlook</em> · Cornwall Insight <em>Battery storage market</em> ·
        AURES{' '}
        <Link to="/intelligence/bess-records" className="text-[var(--color-primary)] hover:underline">
          BESS Records Leaderboard
        </Link>{' '}for live per-battery data.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — Duration evolution and BESS records (renumbered from old Lesson 6)
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>The duration arc</H2>
      <P>
        Australian batteries have evolved through clearly recognisable duration tiers, driven by
        successive market opportunities:
      </P>
      <Table
        emphasizeFirst
        headers={['Tier', 'Typical duration', 'Era', 'Driver', 'Anchor projects']}
        rows={[
          ['Tier 1', '0.5 - 1 hour', '2017 - 2020', 'FCAS dominance', 'Hornsdale (1.3h), Dalrymple BESS, Ballarat BESS'],
          ['Tier 2', '1 - 2 hours', '2020 - 2022', 'FCAS + early arbitrage', 'Bulgana BESS, Wallgrove (1h)'],
          ['Tier 3', '2 - 4 hours', '2022 - 2025', 'Arbitrage primary, FCAS supplementary', 'Victorian Big Battery (1.5h, expanding), Riverina ESS (2h), Wandoan (4h)'],
          ['Tier 4', '4 hours', '2024 - present', 'CIS dispatchable rounds set 4-hour minimum', 'Eraring BESS (4h, 2.8 GWh), Waratah Super Battery (4h, ~1.7 GWh), Tarong BESS (4h)'],
          ['Tier 5', '8+ hours', '2026 onward', 'LTESA Round 6 long-duration tier', 'Great Western Battery (~10.6h), Bowmans Creek BESS (~9.6h), Bannaby BESS (~11.5h)'],
        ]}
      />

      <H2>Why each tier emerged</H2>
      <P>
        Each tier corresponds to a specific market opportunity becoming dominant:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Tier 1 (FCAS):</Em> Hornsdale's success made FCAS the obvious anchor. 1-hour batteries
          could earn most of the FCAS revenue at half the capex of 2-hour batteries. The first wave
          of 50-100 MW batteries was almost all 1-hour.</li>
        <li><Em>Tier 2 (FCAS + arbitrage):</Em> as FCAS prices fell from saturation, batteries needed
          a second revenue stream. 1.5-2 hour batteries could meaningfully participate in arbitrage
          while still earning FCAS, so the typical project shifted to that range.</li>
        <li><Em>Tier 3 (arbitrage primary):</Em> arbitrage spreads had grown enough that 2-4 hour
          batteries were better than 1-hour even after the higher capex. Daily cycling against the
          midday-to-evening spread became the primary revenue mode.</li>
        <li><Em>Tier 4 (4-hour CIS dispatchable):</Em> the federal CIS Tender 3 (Sep 2025) introduced
          a 4-hour minimum requirement for dispatchable awards. This created a regulatory driver for
          4-hour minimum, on top of the economic logic. Most awarded T3 projects are at 4 hours
          exactly.</li>
        <li><Em>Tier 5 (8+ hour long-duration):</Em> LTESA Round 6 (Feb 2026) awarded only batteries
          with ≥8 hours duration to meet the NSW LDS target. The economics are different — these
          batteries don't cycle daily; they target multi-day events and seasonal balancing. They are
          essentially a partial replacement for pumped hydro.</li>
      </ul>

      <H2>State leaders — the AURES leaderboard</H2>
      <P>
        AURES tracks every operating BESS in the NEM and ranks them by spread, capacity, throughput
        and other metrics. Live data is at the{' '}
        <Link to="/intelligence/bess-records" className="text-[var(--color-primary)] hover:underline">
          BESS Records Leaderboard
        </Link>{' '}page. Highlights as of May 2026:
      </P>
      <Table
        emphasizeFirst
        headers={['Region', 'Largest', 'Largest by energy', 'Notable mention']}
        rows={[
          ['NSW', 'Eraring Big Battery — 460 MW', 'Eraring 460 MW × 4h = 2.8 GWh', 'Waratah Super Battery (Akaysha) operational; among first major LTESA assets'],
          ['VIC', 'Victorian Big Battery (Hazelwood) — 300 MW', '~1.5 hour at full power', 'Mortlake BESS, Hazelwood — co-located with retired coal sites'],
          ['QLD', 'Wandoan South — 100 MW × 4h = 400 MWh', 'Bouldercombe 50 MW × 1h', 'Tarong BESS coming online 2026 with 300 MW × 4h'],
          ['SA', 'Torrens Island BESS — 250 MW × 1h', 'Hornsdale (still notable) — 150 MW × 1.3h', 'Tailem Bend Stage 2 250 MW × 4h'],
          ['TAS', 'Smaller market — single-digit MW BESS', '—', 'Hydro dominance limits BESS opportunity'],
        ]}
      />

      <H2>The CIS and LTESA driving evolution</H2>
      <P>
        The duration evolution is no longer purely market-driven. Government programs are now setting
        the duration tier:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>CIS Tender 3 (Sep 2025):</Em> 4-hour minimum for dispatchable contracts. 16 awards,
          mostly at 4 hours.</li>
        <li><Em>LTESA Round 6 (Feb 2026):</Em> 8+ hour minimum for LDS. Six awards spanning
          8.7-11.5 hours.</li>
        <li><Em>CIS Tender 6 (May 2026):</Em> 6.9-8 hour batteries for WA dispatchable. Three awards.</li>
      </ul>
      <P>
        The implication for developers: the 4-hour and 8-hour tiers are now &ldquo;standard&rdquo;
        rather than aspirational. Batteries at sub-2-hour are increasingly being relegated to FCAS
        niche roles. The market is rapidly bifurcating between short-duration FCAS specialists and
        long-duration arbitrage / dispatchable assets.
      </P>

      <Callout type="source">
        Sources: AURES{' '}
        <Link to="/intelligence/bess-records" className="text-[var(--color-primary)] hover:underline">
          BESS Records Leaderboard
        </Link>{' '}·
        AEMO Quarterly Energy Dynamics ·
        Modo Energy Australia BESS reports ·
        Energy-Storage News Australia coverage ·
        Aurora Energy Research and Cornwall Insight battery outlooks.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 8 — Hybrid architectures (what "hybrid" actually means)
// ============================================================

function Lesson8() {
  return (
    <div>
      <H2>The terminology problem — hybrid vs co-located vs paired</H2>
      <P>
        In Australian renewable-energy discourse, <Em>"hybrid"</Em> gets used loosely to mean anything
        from "solar farm with a battery somewhere on site" to "single integrated DC-coupled plant".
        Before talking about economics or policy, we need to be precise. There are four levels of
        integration, and they have very different cost, revenue and contractual implications:
      </P>
      <Table
        emphasizeFirst
        headers={['Level', 'What it means', 'What is shared', 'Example']}
        rows={[
          ['Standalone + standalone', 'Separate solar and BESS, different sites, different connection points', 'Nothing — independent NMI, MLF, EPC', 'Eraring BESS (Origin) — sited at the retiring coal plant, no solar pairing'],
          ['Co-located', 'Same site, but each plant has its own connection asset, MLF, AEMO registration', 'Land, sometimes substation pad', 'Many brownfield retrofits — bolt a battery beside existing solar'],
          ['Paired (single connection)', 'One AC connection point, one MLF, one transformer, but each plant retains its own inverter and AEMO ID', 'Connection asset, switchyard, land, grid studies', 'Most "CIS hybrids" — Tallawang Solar Hybrid, Bundey BESS and Solar'],
          ['True integrated (DC-coupled)', 'Battery and PV array share DC bus and inverter; single plant from grid perspective', 'Inverter, transformer, connection — battery <em>cannot</em> operate without solar inverter', 'Greenfield Edify hybrids (Majors Creek, Smoky Creek)'],
        ]}
      />
      <P>
        AEMO's published statistics, the CIS contract structure, and most developer disclosures treat
        levels 3 and 4 together as "hybrid". Level 2 is usually called "co-located". Level 1 is the
        baseline — what we've had for ten years.
      </P>

      <H2>AC-coupled architecture</H2>
      <P>
        In an AC-coupled hybrid, the solar array and the battery are wired in parallel on the AC side
        of the project. The solar has its own inverter (PV inverter — typically a string or central
        inverter sized to ~120% of array DC rating). The battery has its own four-quadrant inverter
        (battery PCS — Power Conversion System). Both feed into a common LV bus, then a common
        transformer, then the grid connection.
      </P>
      <P>
        <Em>Energy path when charging from solar:</Em> PV DC → PV inverter → AC → BESS PCS → battery DC.
        Two conversion steps, ~3-5% round-trip losses before the battery even starts cycling.{' '}
        <Em>Energy path when discharging:</Em> battery DC → BESS PCS → AC → grid. Standard one-way
        conversion loss.
      </P>
      <P>
        AC-coupled is what almost every retrofit looks like — the battery is added later, designed
        independently, sized independently, and can operate even when the solar inverter is offline
        (for maintenance, faults, or just at night). It's also the easiest configuration for the
        operator: separate AEMO registrations, separate dispatch instructions, the BESS can chase
        FCAS and energy arbitrage independent of the solar profile.
      </P>

      <H2>DC-coupled architecture</H2>
      <P>
        In a DC-coupled hybrid, the battery and the PV array share a single inverter. A DC-DC
        converter sits between the array and the battery, allowing the battery to charge or discharge
        on the DC bus before energy is inverted to AC. Effectively the battery looks like another
        DC source to the same inverter that's converting solar.
      </P>
      <P>
        <Em>Energy path when charging from solar:</Em> PV DC → DC-DC converter → battery DC. <Em>One
        conversion step</Em>, ~1-2% losses. That's the headline efficiency advantage of DC coupling.
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Clipping recovery:</Em> Australian solar farms typically have DC:AC ratios of 1.3-1.5.
          On a peak-irradiance summer noon, the array generates more DC than the AC inverter can handle
          and the excess is "clipped" — thrown away. A DC-coupled battery captures that clipped energy
          (free, since the alternative was waste) and time-shifts it. Industry data suggests 3-8% of
          annual solar output is clipped on high-DC-ratio sites; a DC-coupled BESS can recover most of
          that.</li>
        <li><Em>Single connection cost:</Em> One inverter instead of two, one MV transformer instead of
          two, one set of protection and SCADA — capex savings of $80-150/kW vs AC-coupled.</li>
        <li><Em>The trade-off:</Em> The battery cannot operate independently of the solar inverter. If
          the inverter trips for any reason, the BESS goes offline with it. The BESS also cannot charge
          from the grid through the same inverter (some DC-coupled designs include a grid-charge mode
          but it's expensive and unusual).</li>
      </ul>

      <Callout type="key">
        The DC-coupled vs AC-coupled choice is mostly a developer decision based on whether they will
        ever want to charge the battery from the grid. If yes (energy arbitrage across all hours,
        capacity for night-time discharge) — AC-coupled. If no (battery exists primarily to time-shift
        the solar) — DC-coupled.
      </Callout>

      <H2>The connection-point view — what's actually shared</H2>
      <P>
        From a grid operator's perspective, a "single connection" hybrid is one with one Network
        Connection Agreement, one MLF (Marginal Loss Factor), one Generation Performance Standard,
        and one set of grid studies. This matters enormously for project economics:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Connection asset cost</Em> — the substation, switchyard, transmission line, and any
          network reinforcement are amortised across both the solar MW and the battery MW. For a
          remote-REZ site, the connection asset can be 20-30% of total project cost; halving it across
          two assets is real money.</li>
        <li><Em>Single MLF</Em> — the battery doesn't get penalised by a remote location's loss
          factor in the same way standalone storage at the same node would, because some of its
          discharged energy is effectively "behind the meter" against the solar.</li>
        <li><Em>Single set of grid studies</Em> — System Strength Remediation Scheme contributions,
          oscillatory stability studies, do-no-harm assessments — done once.</li>
        <li><Em>Shared land and balance of plant</Em> — fencing, road, security, control room,
          weather station — paid for once.</li>
        <li><Em>Single set of approvals</Em> — one development application, one EIS, one Section 75W
          referral (in NSW) covering both the array and the battery.</li>
      </ul>

      <H2>Charge sources and the "renewable" label</H2>
      <P>
        A subtle but commercially important question: when the battery discharges energy, is that
        energy "renewable"? It depends on what the battery is charging from.
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>In a DC-coupled hybrid, every electron in the battery came from the solar array. Discharge
          is unambiguously renewable. The energy is eligible for STCs/LGCs if the project is registered,
          and contracts to corporate offtakers (Microsoft, Telstra, ACT government) can claim it as
          renewable.</li>
        <li>In an AC-coupled hybrid configured to <em>only</em> charge from solar, the energy is also
          renewable, but the operator must hold and prove that — usually via metering at the BESS PCS
          and a "charge restriction" in the dispatch logic. Some PPAs include this restriction in their
          terms.</li>
        <li>In an AC-coupled hybrid that charges <em>opportunistically from the grid</em> at night
          (low spot prices), the energy is greyback — the battery effectively absorbs the grid
          generation mix (which is still 60-65% coal in NSW/QLD as of mid-2026), then re-sells it at a
          premium during the evening peak. This is fine for energy arbitrage but it's not renewable
          generation; the operator cannot create LGCs for those MWhs.</li>
      </ul>
      <P>
        For projects targeting a corporate PPA (which usually requires demonstrably renewable energy
        through the night), DC-coupling or charge-restriction is effectively mandatory. For projects
        playing pure energy arbitrage (most CIS-3 standalone BESS), the question doesn't arise — they
        charge from whatever's cheap and discharge into whatever's expensive.
      </P>

      <H2>Real Australian hybrid examples — what's actually being built</H2>
      <P>
        Six hybrid configurations under construction or in advanced development in 2026 (all CIS or
        LTESA contracted, all in AURES):
      </P>
      <Table
        emphasizeFirst
        headers={['Project', 'State', 'Solar', 'BESS', 'Coupling', 'Notes']}
        rows={[
          ['Junction Rivers', 'NSW', '585 MW', '800 MWh', 'AC', 'Largest CIS T1 hybrid — also includes a wind component'],
          ['Tallawang Solar Hybrid', 'NSW', '500 MW', '1,000 MWh', 'AC', 'Enel Green Power — CIS T4 — 2-hr battery sized for evening shift'],
          ['Smoky Creek + Majors Creek', 'QLD', '300+150 MW', '1,200+600 MWh', 'DC', 'Edify Energy — two sites, both DC-coupled, both CIS contracted'],
          ['Bundey BESS and Solar', 'SA', '240 MW', '1,200 MWh', 'AC', '5-hour BESS — long-duration paired hybrid, CIS T4'],
          ['Killawarra Hybrid', 'WA', '350 MW', '2,100 MWh', 'AC', 'CIS T5 — 6-hour storage to firm WA daily peak (Trina Solar developer)'],
          ['Collie Battery + Solar Hybrid', 'WA', '200 MW', '1,518 MWh', 'AC', 'Enpowered / Plenary — CIS T6 — sized for South West Interconnected System evening shift'],
        ]}
      />

      <Callout type="info">
        The Australian hybrid pipeline as of mid-2026: <Em>24 CIS-contracted hybrid projects</Em>{' '}
        across T1, T4, T5 and T6 — total ~5.8 GW of solar and ~17 GWh of battery. Most are
        AC-coupled (because the contracts allow grid charging during very low-priced periods); the
        Edify Australian portfolio is the most prominent DC-coupled fleet.
      </Callout>

      <Callout type="source">
        Sources: AURES scheme tracker · DCCEEW CIS Tender 1, 4, 5, 6 results ·
        Edify Energy quarterly disclosures · Enel Green Power Tallawang DA submission ·
        Modo Energy <em>DC-coupling clipping recovery economics</em> ·
        EPRI <em>Hybrid Power Plant Best Practice Guide</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 9 — Hybrid economics (when does it win?)
// ============================================================

function Lesson9() {
  return (
    <div>
      <H2>Setting up the four-way comparison</H2>
      <P>
        The hybrid question is rarely "should this site exist". It's almost always: <Em>given a piece
        of land, a connection point, and a budget, what configuration maximises NPV?</Em> Four
        archetypal configurations to compare:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Solar-alone</Em> — 200 MW PV, single inverter fleet, sells to pool at solar capture
          price</li>
        <li><Em>BESS-alone (load-centre)</Em> — 200 MW / 800 MWh BESS at a strong-grid urban node,
          charges from grid, plays full arbitrage</li>
        <li><Em>BESS-alone (REZ-site)</Em> — 200 MW / 800 MWh BESS at the same remote solar location,
          but no solar — pure arbitrage from a low-MLF node</li>
        <li><Em>Solar + BESS hybrid</Em> — 200 MW PV + 200 MW / 800 MWh battery sharing one connection
          point, one MLF, one set of grid studies</li>
      </ul>

      <H2>What the hybrid actually saves on capex</H2>
      <P>
        The hybrid capex saving is not the battery cost (that's the same whether co-located or
        standalone) or the solar cost (same). It's the <Em>shared infrastructure</Em>:
      </P>
      <Table
        emphasizeFirst
        headers={['Cost line', 'Standalone solar', 'Standalone BESS', 'Hybrid', 'Hybrid saving']}
        rows={[
          ['Connection asset (line, substation, switchyard)', '$60-90M', '$60-90M', '$70-100M', '$50-80M'],
          ['MLF / grid studies / SSRS', '$3-5M', '$3-5M', '$4-6M', '$2-4M'],
          ['DA / EIS / planning', '$5-10M', '$5-10M', '$7-12M', '$3-8M'],
          ['Land + access road + civil', '$8-15M', '$5-10M', '$10-18M', '$3-7M'],
          ['Control room / SCADA / security', '$2-3M', '$2-3M', '$2.5-3.5M', '$1.5-2.5M'],
          ['Sub-total shared BoP', '~$78-123M', '~$75-118M', '~$93-139M', '~$60-101M'],
        ]}
      />
      <P>
        For a 200 MW + 200 MW / 800 MWh site, hybrid capex is therefore ~$60-100M lower than the same
        two assets built standalone. That's 8-12% of total project capex of roughly $700-900M.
        Material — but not enormous, and it's offset by some loss of flexibility (see below).
      </P>

      <H2>What the hybrid changes on revenue</H2>
      <P>
        Revenue is where the four configurations really diverge. Using 2025-26 indicative values for a
        well-resourced NEM site:
      </P>
      <Table
        emphasizeFirst
        headers={['Revenue stream', 'Solar-alone', 'BESS-alone load-centre', 'BESS-alone REZ-site', 'Hybrid (solar+BESS)']}
        rows={[
          ['Energy: capture price (annual av $/MWh)', '$30-50', '$130 spread × 320 cycles', '$120 spread × 320 cycles', 'Solar @ $30-50, BESS @ $120-130 × 280 cycles'],
          ['Energy: gross revenue per MW of capacity', '$80-130k', '$170-230k', '$155-210k', 'Solar $80-130k + BESS $140-180k'],
          ['FCAS', 'minimal', '$25-40k/MW', '$15-25k/MW (less liquid)', '$20-30k/MW on BESS only'],
          ['Capacity / scheme revenue (CISA or LTESA)', 'CIS revenue floor', 'CIS revenue floor or capacity payment', 'CIS revenue floor', 'Single CISA across both assets — fewer dollars but one contract'],
          ['MLF degradation risk', 'High (solar farms have worst MLF trajectory)', 'Low (load-centre)', 'High', 'Medium — battery shifts a chunk of solar generation across the day so peak-export MLF impact is lower'],
        ]}
      />
      <P>
        The hybrid's revenue is <Em>not</Em> the sum of standalone solar + standalone BESS. The BESS
        in a hybrid does fewer cycles (because it's optimising against its own solar's profile rather
        than the full market), and it gives up some FCAS optionality (less flexible than a standalone
        battery). But it captures three structural advantages:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>The "free fuel" advantage</Em> — solar that would otherwise be cannibalised (or
          curtailed, or clipped) charges the battery at zero cost. This is the highest-value form of
          arbitrage available in the NEM.</li>
        <li><Em>Solar capture-price rescue</Em> — by absorbing midday solar into the battery and
          discharging it at 6-9 pm, the hybrid effectively lifts its <em>solar</em> revenue. A
          standalone solar farm at 0.45 VF earns $35/MWh on a $80 pool average; the same farm with a
          co-located 4-hour BESS effectively sells 25-30% of its annual generation at the
          $150-200/MWh evening peak instead. Total revenue rises by 30-50% without changing the
          array.</li>
        <li><Em>One CISA contract</Em> — the hybrid is signed as one project with one revenue
          underwriting agreement, simpler to structure and finance than two separate contracts.</li>
      </ul>

      <H2>The unit economics — a side-by-side</H2>
      <P>
        Indicative 25-year NPV per MW of grid connection capacity for a 200 MW NSW South West REZ
        site, assuming the 2026 ISP central trajectory for prices, MLFs and cost curves:
      </P>
      <Table
        emphasizeFirst
        headers={['Configuration', 'Capex ($/MW)', 'Annual revenue ($/MW)', 'IRR (un-levered)', 'NPV @ 8% ($/MW)']}
        rows={[
          ['Solar-alone (200 MW PV)', '$1.05-1.20M', '$95-130k', '6.0-7.5%', '$50-150k'],
          ['BESS-alone (200/800 MWh BESS)', '$1.5-1.7M', '$200-260k', '7.5-9.5%', '$200-450k'],
          ['Hybrid (200 PV + 200/800 BESS)', '$2.2-2.5M', '$280-360k', '9.0-11.5%', '$400-750k'],
          ['Two standalones built side-by-side', '$2.55-2.90M', '$295-390k', '7.0-9.0%', '$250-550k'],
        ]}
      />
      <P>
        Two observations:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>BESS-alone IRRs higher than solar-alone</Em> — at current spreads, batteries are the
          better single-asset bet. Solar's high cannibalisation risk and high MLF degradation tail eat
          its returns.</li>
        <li><Em>Hybrid beats both standalones, and beats the sum of two standalones built
          separately</Em> — the connection-asset saving and the solar capture-price uplift more than
          offset the BESS cycling loss. This is the policy basis for CIS T4's hybrid weighting.</li>
      </ul>

      <Callout type="warn">
        These numbers assume mid-case spreads, mid-case capture prices, and 2026 cost stacks. They
        are <Em>not</Em> robust to a bad scenario — see the next sections.
      </Callout>

      <H2>The bull case — what you'd have to believe</H2>
      <P>
        For the hybrid math to keep working (especially the high IRRs), you need to believe several
        things at once:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Solar VFs stay below 0.55 in NSW/QLD/VIC and 0.40 in SA through 2030.</Em> If solar
          capture prices recover (e.g. coal exits faster than expected, evening battery discharge
          flattens the duck), the standalone solar case improves and the hybrid premium shrinks.</li>
        <li><Em>BESS spreads stay above $130/MWh through 2030.</Em> If spreads compress faster than
          expected (the spread-reduction thesis in Lesson 11), the BESS revenue contribution drops
          and the hybrid economics weaken.</li>
        <li><Em>Connection-asset costs keep climbing.</Em> The hybrid advantage is largely about
          amortising connection. If grid build-out catches up and connection costs fall (the
          opposite of recent experience), the saving shrinks.</li>
        <li><Em>Solar capex falls another 15-25% by 2030.</Em> Cheaper modules make the hybrid case
          stronger relative to BESS-alone (because adding solar to an existing connection becomes
          almost free).</li>
        <li><Em>The grid stays constrained.</Em> If REZ transmission lines are built faster than
          generation arrives, the connection-asset constraint vanishes and standalone projects can
          plug in cheaply at the new substations.</li>
      </ul>

      <H2>The bear case — what you'd have to disbelieve</H2>
      <P>
        Equally, there are scenarios where hybrid loses to one or both standalones:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>BESS cycle life and degradation curves are worse than warranties suggest.</Em> A
          hybrid battery is cycled hard (every solar day) to capture the midday-to-evening shift —
          ~330+ full cycles per year vs ~280 for a load-centre BESS that picks its arbitrage windows.
          If cells degrade meaningfully faster under that cycling pattern, the hybrid's BESS revenue
          assumption breaks.</li>
        <li><Em>Evening peak prices fall faster than midday troughs rise.</Em> The arbitrage spread
          relies on the evening peak. If gas-peaker retirement accelerates BESS discharge and the peak
          collapses to $120/MWh, hybrid economics weaken substantially.</li>
        <li><Em>Long-duration storage (LDS) wins the firmness market.</Em> LTESA Round 6 awarded 1.17
          GW of 8-12 hour batteries. If LDS becomes the cheapest source of evening firm capacity, the
          4-hour BESS in a typical hybrid is competing on a downward-sloping price curve.</li>
        <li><Em>Capex of standalone BESS falls faster than hybrid capex.</Em> Tier-1 cell prices are
          declining ~10-15%/yr; integration costs less rapidly. A standalone BESS gets the cell-price
          tailwind without the inverter / DC-DC integration complexity of a DC-coupled hybrid.</li>
      </ul>

      <H2>The verdict — per use case</H2>
      <Table
        emphasizeFirst
        headers={['Use case', 'Best configuration', 'Why']}
        rows={[
          ['Remote REZ site, no existing infrastructure', 'Hybrid', 'Connection-asset amortisation is the entire point — single shared substation across both technologies'],
          ['Load-centre node with high evening prices', 'Standalone BESS', 'No solar resource needed; battery captures the full FCAS+arbitrage stack'],
          ['Retiring coal plant with strong grid', 'Standalone BESS', 'Connection asset already exists (the coal plant\'s switchyard); solar adds little'],
          ['Existing operating solar farm with poor VF', 'Co-located retrofit BESS', 'Defensive — recover cannibalised value without rebuilding the connection'],
          ['Greenfield large-scale corporate-PPA site', 'DC-coupled hybrid', 'Single renewable energy stream, clean LGC accounting, lowest-cost firm renewable PPA'],
          ['Long-duration storage (8h+)', 'Standalone or paired with wind', 'Hybrid with solar is over-cycled for LDS economics — wind pairing is more typical'],
        ]}
      />

      <Callout type="key">
        Hybrids win the most when (1) you're paying for a new connection anyway, (2) the local solar
        resource is good but the local capture price is poor, and (3) the evening peak is still
        well-defined. They lose to standalone BESS at urban nodes and to retrofit BESS at operating
        sites. The CIS T4 60% hybrid weighting reflects DCCEEW judging that (1)+(2)+(3) all hold for
        most of the remaining utility-solar pipeline.
      </Callout>

      <Callout type="source">
        Sources: Aurora Energy Research <em>Australia hybrid economics 2025</em> ·
        Modo Energy <em>standalone vs hybrid BESS dispatch</em> · AEMO ISP 2024 + 2026 cost stacks ·
        CSIRO GenCost 2025 · UNSW CEEM <em>hybrid power plant economics</em> ·
        Cornwall Insight <em>Australian BESS captured spread analysis</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 10 — Hybrids in the CIS (the policy push)
// ============================================================

function Lesson10() {
  return (
    <div>
      <H2>The CIS framework — Generation vs Battery tenders, and the hybrid crossover</H2>
      <P>
        The Capacity Investment Scheme (covered in detail in the CIS-LTESA module) runs two parallel
        tender streams: <Em>Generation tenders</Em> (T1, T4 in the NEM; T5 in the WEM) which support
        new renewable energy capacity, and <Em>Dispatchable tenders</Em> (T2, T3 in the NEM; T6 in
        the WEM) which support batteries and other dispatchable assets. Hybrid projects can be
        contracted under either stream — and how they're contracted shapes the project design.
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Generation tender hybrid:</Em> the project is contracted on its solar (or wind)
          generation profile, with the battery treated as a firming asset that shifts generation into
          higher-value periods. The CISA revenue underwriting is calibrated to total firmed
          generation, not battery arbitrage.</li>
        <li><Em>Dispatchable tender hybrid:</Em> the project is contracted on its dispatchable
          capacity, with the solar treated as a low-cost charging source for the battery. The CISA
          underwriting is calibrated to capacity availability and dispatch performance.</li>
      </ul>
      <P>
        Both designs have been awarded — the choice depends on what the developer is optimising for
        and where the round is positioned in the policy timeline.
      </P>

      <H2>Tender-by-tender hybrid share</H2>
      <P>
        The hybrid share of CIS awards has shifted dramatically across rounds. Live AURES data:
      </P>
      <Table
        emphasizeFirst
        headers={['Tender', 'Region', 'Type', 'Awards', 'Hybrid count', 'Hybrid %']}
        rows={[
          ['T1', 'NEM', 'Generation', '19', '8', '42%'],
          ['T2', 'WEM', 'Dispatch', '4', '0', '0%'],
          ['T3', 'NEM', 'Dispatch', '16', '0', '0%'],
          ['T4', 'NEM', 'Generation', '20', '12', '60%'],
          ['T5', 'WEM', 'Generation', '7', '1', '14%'],
          ['T6', 'WEM', 'Dispatch', '3', '2', '67%'],
          ['Total', '—', '—', '69', '23', '33%'],
        ]}
      />
      <P>
        Two patterns stand out. First, <Em>Generation tenders trended hybrid</Em> — T1 was 42%,
        T4 was 60% — as developers and DCCEEW both learned that solar-only economics were exposed to
        cannibalisation risk that hybrid configurations could mitigate. Second, <Em>Dispatch tenders
        stayed standalone</Em> in the NEM (T3 was 0% hybrid — all 16 awards were pure batteries) but
        T6 in WA flipped to 67% hybrid, because WA's solar+BESS economics are uniquely advantageous
        (strong solar resource, expensive evening gas peakers).
      </P>

      <H2>CIS T1 hybrids — the foundation (Nov 2023 / Mar 2024 awards)</H2>
      <P>
        Tender 1 in the NEM was the first scaled hybrid awards, with 8 of 19 contracted projects
        being solar+BESS:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Junction Rivers</Em> (NSW, 585 MW / 800 MWh) — largest of the T1 cohort; combined
          wind+solar+BESS</li>
        <li><Em>Glanmire, Barwon, Elaine, Barnawartha Solar Farms</Em> (Elgin Energy portfolio) — four
          mid-sized hybrids in NSW + VIC ranging 60-250 MW, all with 1.5-2x MWh ratios</li>
        <li><Em>West Mokoan Solar Farm</Em> (VIC, 300 MW / 560 MWh)</li>
        <li><Em>Majors Creek + Ganymirra</Em> (QLD, both 150 MW / 600 MWh) — Edify Energy's
          DC-coupled portfolio entry</li>
      </ul>

      <H2>CIS T4 hybrids — the inflection (Oct 2025 award)</H2>
      <P>
        Tender 4 saw the hybrid share jump to 60% (12 of 20 awards). The contract design also matured
        — most T4 hybrids are at the larger end of the scale (250-500 MW solar, 600-1,800 MWh BESS)
        and the battery durations cluster around 4-6 hours, designed for evening shift rather than
        intra-day arbitrage:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Tallawang Solar Hybrid</Em> (NSW, 500 MW / 1,000 MWh) — Enel Green Power</li>
        <li><Em>Bundey BESS and Solar</Em> (SA, 240 MW / 1,200 MWh) — Genaspi Energy; 5-hour battery</li>
        <li><Em>Smoky Creek + Guthrie's Gap + Nowingi</Em> (QLD/VIC, Edify portfolio) — three 300 MW
          / 1,200 MWh hybrids, all DC-coupled, all with 4-hour batteries</li>
        <li><Em>Punchs Creek Solar Farm</Em> (QLD, 400 MW / 1,600 MWh) — EDPR</li>
        <li><Em>Merino Solar Farm</Em> (NSW, 450 MW / 1,800 MWh) — 4-hour battery, NSW South West REZ</li>
        <li><Em>Middlebrook Solar Farm</Em> (NSW, 363 MW / 813 MWh) — shorter duration (~2.3 hr)
          paired hybrid</li>
        <li><Em>Bendemeer Energy Hub</Em> (NSW, 252 MW / 300 MWh) — sub-1.5-hour battery, the smallest
          BESS share in the T4 cohort</li>
        <li><Em>Corop Solar Farm and BESS</Em> (VIC, 230 MW / 704 MWh) — Leeson Solar; 3-hour battery</li>
        <li><Em>Derby Solar Project</Em> (VIC, 95 MW / 210 MWh) — mid-size hybrid</li>
        <li><Em>Gawara Baya</Em> (QLD, 399 MW wind + 217 MWh BESS) — wind+BESS rather than solar+BESS,
          shows the same hybrid model extending to wind</li>
      </ul>

      <H2>CIS T5 and T6 — the WA pipeline</H2>
      <P>
        Western Australia's SWIS market has a unique dynamic: extremely high midday solar penetration
        (over 50% on good days) and high evening prices (LNG-linked gas peakers). Hybrid economics in
        WA are arguably stronger than anywhere in the NEM, and the T5 and T6 awards reflect that:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Killawarra Hybrid Project</Em> (T5, 350 MW / 2,100 MWh) — Trina Solar — 6-hour
          battery, the largest hybrid in the Australian CIS pipeline by MWh</li>
        <li><Em>Collie Battery and Solar Hybrid</Em> (T6, 200 MW / 1,518 MWh) — Enpowered / Plenary
          — co-located at the retiring Collie coal complex, using existing connection</li>
        <li><Em>Waroona Renewable Energy Project Stage 1</Em> (T6, 82 MW / 565 MWh) — Frontier
          Energy; smaller-scale hybrid</li>
      </ul>

      <H2>LTESA hybrids — the long-duration crossover</H2>
      <P>
        The NSW LTESA program (covered in the CIS-LTESA module) ran in parallel with CIS through
        2024-25 and awarded one solar+BESS hybrid in Round 4: <Em>Maryvale Solar + BESS</Em> (NSW,
        172 MW / 372 MWh). LTESA Rounds 5 and 6 focused on standalone long-duration storage (8h+)
        rather than hybrids, but the framework remains open to hybrid bids in future rounds — a
        hybrid solar + 8-hour BESS combination could plausibly win a future LTESA round if developers
        bring well-priced projects.
      </P>

      <H2>What's coming — CIS rounds 7-12 and the 2030 view</H2>
      <P>
        The CIS framework is committed to running ~32 GW of additional capacity to 2030, with
        roughly half generation and half dispatchable. Based on the T1-T6 pattern, the expected
        hybrid share by round type:
      </P>
      <Table
        emphasizeFirst
        headers={['Tender', 'Type', 'Expected timing', 'Expected hybrid %', 'Why']}
        rows={[
          ['T7', 'NEM Generation', 'mid-2026', '60-75%', 'T4 pattern continues; remaining utility-solar pipeline is almost all paired with BESS'],
          ['T8', 'NEM Dispatch', 'late 2026', '5-15%', 'Mostly standalone BESS as connection sites near retiring coal'],
          ['T9', 'NEM Generation (wind-weighted)', 'early 2027', '20-35%', 'Wind+BESS hybrids start appearing in earnest'],
          ['T10', 'NEM Dispatch (LDS-weighted)', 'mid-2027', '10-25%', 'Some hybrid LDS but mostly standalone pumped hydro / 8h batteries'],
          ['T11-12', 'WEM rounds', '2027-28', '50-70%', 'WA hybrid dominance continues'],
        ]}
      />

      <Callout type="key">
        AEMO's 2026 ISP central scenario projects that <Em>~50% of new utility-scale solar capacity
        commissioned 2026-2030 will be paired with co-located storage</Em>, rising to ~70% by 2034.
        The CIS is the main vehicle delivering this — by structuring contracts to favour firmed
        rather than as-available solar, it has tipped developer economics decisively toward hybrid
        configurations.
      </Callout>

      <H2>What the hybrid wave means for the market</H2>
      <P>
        Three downstream effects of the CIS-driven hybrid wave:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Solar capture-price stabilisation.</Em> If 50% of new solar comes with co-located
          storage that shifts midday output to evening, the average solar VF stops decaying — the
          incremental MWh in the market is partially time-shifted rather than dumped at midday.
          Standalone solar VFs may even partially recover (the "spread reduction" lesson explores
          why).</li>
        <li><Em>BESS revenue mix shift.</Em> As more BESS capacity arrives via hybrids (with cycling
          patterns dictated by solar shape rather than market price), standalone BESS revenue
          becomes increasingly the marginal price-setter. The pricing dynamics of hybrid vs
          standalone BESS will diverge through the late 2020s.</li>
        <li><Em>Connection queue rebalancing.</Em> A hybrid takes one connection slot where two
          standalone projects would have taken two. The grid connection queue is the binding
          constraint in the NEM; hybridisation effectively doubles the "useful" capacity per
          connection point. This is one of the strongest non-price arguments for the CIS hybrid
          weighting.</li>
      </ul>

      <Callout type="source">
        Sources: AURES scheme tracker · DCCEEW CIS round results (T1-T6) ·
        AEMO ISP 2024 + 2026 · NSW EnergyCo LTESA Round 4 results ·
        Aurora Energy Research <em>Australia CIS hybrid market analysis</em> ·
        Cornwall Insight <em>Hybrid project pipeline 2026</em> ·
        Modo Energy <em>WEM hybrid economics</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 11 — BESS spread reduction (renumbered from old Lesson 9)
// ============================================================

function Lesson11() {
  return (
    <div>
      <H2>The thesis: does arbitrage eat itself?</H2>
      <P>
        The same merit-order mechanic that cannibalised solar can in principle cannibalise BESS. As
        more batteries enter the market, they all compete to charge during the midday trough — pushing
        midday prices <Em>up</Em>. And they all compete to discharge during the evening peak —
        pushing peak prices <Em>down</Em>. The spread between midday and evening — the arbitrage
        opportunity that pays for the battery — gets compressed.
      </P>

      <Callout type="key">
        BESS arbitrage spread is a function of supply and demand for time-shifted energy, not a
        structural feature of the market. As BESS capacity grows, the spread will compress. The only
        questions are (a) when does the compression start to bite, (b) how fast does it go, and (c)
        what survives.
      </Callout>

      <H2>The California parallel — what already happened</H2>
      <P>
        California's experience 2018-2023 is the clearest international parallel. California built out
        ~12 GW of grid-scale storage between 2020 and 2024, predominantly 4-hour BESS. The result was
        documented in CAISO's quarterly market reports:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>2020-2021</Em> — daily spreads of $80-150/MWh; first BESS earning excellent returns;
          rapid build-out begins</li>
        <li><Em>2022-2023</Em> — daily spreads compress to $40-80/MWh; capacity-factor-equivalent
          revenue per MW falls ~30-40%; new batteries earning less than originally projected</li>
        <li><Em>2023-2024</Em> — spreads stabilise around $50/MWh range; long-duration (8-hour)
          batteries start to earn more than 4-hour because longer discharge captures evening peak
          tail; investment thesis shifts to longer-duration storage</li>
      </ul>
      <P>
        The lesson for Australia: <Em>spread compression is a real outcome of saturation, but it
        does not collapse to zero</Em>. It stabilises at a level where the marginal battery cycles
        less and the long-duration batteries earn the cleaner returns.
      </P>

      <H2>Where Australia sits today</H2>
      <P>
        AEMO QED data shows the SA spread has been remarkably stable in the $120-180/MWh range over
        2024-2026, even as ~3 GW of new BESS came online. The reasons:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Solar build-out has outpaced BESS</Em> — every additional MWh of solar deepens the
          midday trough, which restores spread.</li>
        <li><Em>Coal retirement</Em> — Liddell (April 2023), and the Eraring extension which only
          delays the inevitable, have removed cheap baseload. Evening peak prices have stayed elevated
          because gas is now the marginal generator.</li>
        <li><Em>4-hour batteries cycle the same midday-to-evening window</Em> — most of the new
          capacity competes for the same spread. As 8-hour batteries arrive in 2026+ (LTESA R6), they
          extend into different time windows and don't directly compete for the same spread.</li>
      </ul>

      <H2>When does it start hitting Australia?</H2>
      <P>
        The triggers for spread compression in Australia, in expected order:
      </P>
      <ol className="list-decimal list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>~2027 in SA first</Em> — SA has the most BESS per MW of demand. Eraring extension
          stabilising NSW prices for now, but SA's narrow demand base means BESS saturation hits there
          first.</li>
        <li><Em>~2028 in QLD and VIC</Em> — both states are mid-BESS-buildout, with CIS T3 awards
          coming online 2026-27.</li>
        <li><Em>~2029-30 in NSW</Em> — largest demand base + Eraring continuing operations to April
          2029 keeps thermal as the price-setter for longer.</li>
      </ol>

      <H2>What survives spread compression</H2>
      <P>
        Once spread compression begins, the BESS investment thesis shifts. Three asset profiles do
        better than 4-hour standalone arbitrage batteries:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Long-duration BESS (8-hour+)</Em> — can discharge into the evening tail and overnight,
          capturing time windows that 4-hour batteries can't reach. LTESA Round 6's 8.7-11.5 hour
          cohort is positioned for this.</li>
        <li><Em>Co-located solar+storage</Em> — even with compressed spreads, the cannibalised solar
          MWh is more valuable when time-shifted to evening than when sold at midday-trough prices.
          Cannibalisation creates a structural floor for hybrid economics.</li>
        <li><Em>Multi-day / seasonal storage</Em> — pumped hydro (Snowy 2.0), longer-duration LTESA
          assets. These don't cycle daily so they don't compete for the same spread.</li>
        <li><Em>FCAS specialists</Em> — small 1-hour batteries in good network positions. FCAS
          market is saturated for raise/lower contingency, but new products (very fast frequency
          response) keep emerging.</li>
      </ul>

      <H2>The pumped hydro backstop</H2>
      <P>
        Snowy 2.0 (2 GW pumped hydro, ~175 hours of storage) is the long-duration backstop in the
        ISP. When commissioned (originally 2024-25, slipping to 2027-28 alongside HumeLink), it
        provides massive cheap discharge capacity in evening peaks AND consumes cheap midday energy
        for pumping. Snowy 2.0 will be the marginal long-duration price-setter, and its presence
        moderates how aggressively BESS spreads can compress.
      </P>

      <Callout type="warn">
        For developers considering a new 4-hour BESS bid into CIS Tender 7 or 8: the bid price needs
        to reflect spread compression that's already starting to bite. Aurora Energy Research and
        Cornwall Insight model declining battery revenue per MW into 2030. Bid floors that look
        attractive at today's spreads may be uneconomic at 2028's. The conservative-bid strategy
        (Lesson 6 of the CIS Bidding module) becomes more relevant as the cohort ages.
      </Callout>

      <Callout type="source">
        Sources: CAISO <em>Quarterly Market Performance Reports</em> ·
        Modo Energy <em>Australia BESS revenue compression analysis</em> ·
        Aurora Energy Research <em>battery saturation outlook 2026-2030</em> ·
        Cornwall Insight <em>Australia battery revenue stack reports</em> ·
        AEMO Quarterly Energy Dynamics ·
        Snowy Hydro project updates.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 12 — Outlook (renumbered from old Lesson 10)
// ============================================================

function Lesson12() {
  return (
    <div>
      <H2>The residential battery boom</H2>
      <P>
        After 15 years of residential solar growth, Australia is now in the early stages of a parallel
        residential <Em>battery</Em> boom. By the end of 2024, ~250,000 home batteries had been
        installed — a number that has compounded at 30-40% per year since 2020. The drivers:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Tesla Powerwall 3 + competitors (sonnen, BYD, Alpha-ESS) at $7,000-12,000 installed for
          a 13-16 kWh battery</li>
        <li>Falling export feed-in tariffs (the 1:1 net FIT in many states is now <em>negative</em>
          during midday — retailers charge the customer to export)</li>
        <li>State rebate schemes — VIC's Solar Homes Battery Loan, NSW's Peak Demand Reduction Scheme</li>
        <li><Em>Federal Cheaper Home Batteries Program (announced 2025, operational 2026):</Em> 30%
          rebate on installed batteries, capped at $4,000 per system, designed to add ~1.3 GW of
          additional behind-the-meter storage by 2030</li>
      </ul>
      <P>
        The residential battery has the same hyper-competitive installer dynamic as residential solar,
        with the same cost advantages. Australia has more home battery installs per capita than any
        country except possibly Germany, and the trajectory is steeper. By 2030, AEMO's Step Change
        scenario assumes ~3-4 GW / 12-15 GWh of residential and small commercial batteries — the
        largest distributed energy resource fleet in the world.
      </P>

      <H2>The AEMO ISP storage targets</H2>
      <P>
        The AEMO Integrated System Plan (Step Change scenario, 2024) projects the following storage
        build-out for the NEM:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'Grid BESS (4h)', 'Long-duration (8h+)', 'Pumped hydro', 'Behind-the-meter']}
        rows={[
          ['2026', '~5 GW / 20 GWh', '~1 GW / 12 GWh', '~2.7 GW (Snowy 2.0 commissioning)', '~1.5 GW / 5 GWh'],
          ['2030', '~13 GW / 52 GWh', '~5 GW / 50 GWh', '~5 GW (with Snowy 2.0 fully operating)', '~3.5 GW / 12 GWh'],
          ['2034', '~18 GW / 72 GWh', '~10 GW / 100+ GWh', '~5 GW', '~5 GW / 18 GWh'],
        ]}
      />

      <H2>NSW LDS targets — the legislated number</H2>
      <P>
        NSW has the most specific storage target of any Australian jurisdiction, set in statute under
        the EII Act 2020:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>2 GW of long-duration storage by 2030</Em> — already achieved in award terms after
          LTESA Rounds 5 and 6</li>
        <li><Em>28 GWh of long-duration storage by 2034</Em> — LTESA Round 6 (1,171 MW × 8.7-11.5h
          = ~12 GWh) gets us roughly halfway. The next two LTESA rounds need to award the balance.</li>
      </ul>

      <H2>BESS as the price-setter</H2>
      <P>
        AEMO's Q1 2026 QED reported a milestone: <Em>batteries set the marginal price in 32% of NEM
        dispatch intervals</Em> — making them the most frequent price-setting technology in the
        market for the first time. Five years ago coal set price 70% of the time and batteries set
        price 0% of the time. The transition is structural and probably accelerating.
      </P>

      <Callout type="key">
        The shift to BESS price-setting matters because it changes the revenue prospects of every
        other generator. Coal and gas plants used to set the marginal price during the most profitable
        intervals; now batteries do, and batteries bid at much lower marginal prices because their
        cost of energy comes from off-peak charging. The result is downward pressure on wholesale
        prices, which improves consumer welfare but compresses revenue for thermal generators —
        accelerating the closure of coal generators that don't have a contracted revenue floor.
      </Callout>

      <H2>The compounding loop</H2>
      <P>
        Where this all ends up is a compounding loop with self-reinforcing dynamics:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>More <Em>solar</Em> creates deeper midday troughs, raising the value of storage.</li>
        <li>More <Em>storage</Em> raises the cost-effective ceiling for solar deployment.</li>
        <li>Together they push <Em>thermal</Em> generators out faster.</li>
        <li>Faster thermal exit means more pressure for storage build-out to provide reliability.</li>
        <li>That feeds back into more solar opportunity.</li>
      </ul>
      <P>
        The headline read for 2030: Australia is forecast to have 60+ GW of utility-scale solar (up
        from ~12 GW today), 40+ GW of rooftop solar (up from ~26 GW), 20+ GW of grid-scale BESS, and
        5+ GW of pumped hydro. Coal will be largely gone or in scheduled retirement. Gas will exist
        primarily as a peaking resource for residual reliability.
      </P>

      <Callout type="info">
        For investors and developers: the structural call is that the solar + storage combination is
        the new baseload of the Australian grid. The cost trajectory is set; the regulatory
        infrastructure (CIS, LTESA, REZs, TNSP build-out) is in place; the market signal (BESS
        price-setting 32% of intervals) is established. The questions left are timing, location, and
        contracting strategy — not whether the build-out happens.
      </Callout>

      <Callout type="source">
        Sources: AEMO <em>Integrated System Plan 2024 + 2026</em> ·
        AEMO <em>Quarterly Energy Dynamics Q1 2026</em> ·
        DCCEEW <em>Cheaper Home Batteries Program</em> ·
        SunWiz <em>Battery installations Australia</em> ·
        Modo Energy <em>Australia battery market reports</em> ·
        AEMO Services <em>LTESA Round 6 outcome</em> ·
        AURES{' '}
        <Link to="/intelligence/bess-records" className="text-[var(--color-primary)] hover:underline">
          BESS Records Leaderboard
        </Link>{' '}and{' '}
        <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
          Scheme Tracker
        </Link>.
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
          <span className="text-3xl" aria-hidden>🔋</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
            ✅ Available
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight"
          style={{ borderLeft: '4px solid #22c55e', paddingLeft: 12, marginLeft: -12 }}>
          The Solar + BESS Story in the NEM
        </h1>
        <p className="text-base italic text-[var(--color-text-muted)]">
          From rooftop boom to grid-scale batteries — how Australia got here.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          Australia has more rooftop solar per capita than any country on earth. That fact created the
          cannibalisation problem, which created the BESS opportunity, which created the modern NEM.
          This module tells the full arc — the residential solar boom (FITs, STCs, the Australian
          electrician cost advantage, Chinese module economics), commercial scale-up, behind-the-meter
          scale, and how all of that led to Hornsdale, Tesla, FCAS, and today&rsquo;s 32% price-setting
          share for batteries.
        </p>
      </div>

      <div className="space-y-3">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          return (
            <Link key={l.id} to={`/learn/bess-story/${l.id}`}
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
            <Link to="/intelligence/bess-records" className="text-[var(--color-primary)] hover:underline">
              BESS Records Leaderboard →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— every operating BESS, ranked</span>
          </li>
          <li>
            <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
              Scheme Tracker →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— CIS/LTESA awards by tech and round</span>
          </li>
          <li>
            <Link to="/learn/cis-ltesa-bidding" className="text-[var(--color-primary)] hover:underline">
              CIS &amp; LTESA Bidding module →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— deep-dive on the underwriting that drives the storage build-out</span>
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
        <Link to="/learn/bess-story" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← The Solar + BESS Story
        </Link>
        <span className="text-[var(--color-text-muted)]">Lesson {lesson.number} of {LESSONS.length} · {lesson.readingTime}</span>
      </div>

      <div className="space-y-1 pb-4 border-b border-[var(--color-border)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Lesson {lesson.number}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight">{lesson.title}</h1>
        <p className="text-base italic text-[var(--color-text-muted)]">{lesson.subtitle}</p>
      </div>

      <article className="text-[15px] text-[var(--color-text-muted)]">
        {lesson.id === 'rooftop-boom'             && <Lesson1 />}
        {lesson.id === 'btm-scale'                && <Lesson2 />}
        {lesson.id === 'cannibalisation-mechanic' && <Lesson3 />}
        {lesson.id === 'capture-price-decay'      && <Lesson4 />}
        {lesson.id === 'hornsdale'                && <Lesson5 />}
        {lesson.id === 'how-earns'                && <Lesson6 />}
        {lesson.id === 'duration-records'         && <Lesson7 />}
        {lesson.id === 'hybrid-architecture'      && <Lesson8 />}
        {lesson.id === 'hybrid-economics'         && <Lesson9 />}
        {lesson.id === 'hybrid-cis-push'          && <Lesson10 />}
        {lesson.id === 'spread-reduction'         && <Lesson11 />}
        {lesson.id === 'outlook'                  && <Lesson12 />}
      </article>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/bess-story/${prev.id}`)}
            className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/bess-story/${next.id}`) }}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-colors">
            {progress.has(lesson.id) ? 'Continue' : 'Mark read & continue'} → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/bess-story') }}
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

export default function BESSStoryModule() {
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
        <Link to="/learn/bess-story" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to module index
        </Link>
      </div>
    )
  }

  return <LessonView lesson={lesson} progress={progress} onComplete={onComplete} />
}
