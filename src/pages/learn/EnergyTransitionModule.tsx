/**
 * The Energy Transition in the NEM — AURES Learning Module
 *
 * 11 lessons spanning the privatisation era through the rise of the gentailer
 * and the current decarbonisation arc. Includes deep-dives on AGL, Origin,
 * EnergyAustralia and Alinta as the four organisations that dominate the
 * generation+retail picture.
 */
import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

// ============================================================
// Progress persistence
// ============================================================

const STORAGE_KEY = 'aures-energy-transition-progress'

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
  { id: 'pre-nem',          number: 1,  title: 'Pre-NEM Australia — state monopolies and COAG reform',     subtitle: 'How electricity was structured before 1998 and why it changed',     readingTime: '11 min' },
  { id: 'vic-selloff',      number: 2,  title: 'The Victorian sell-off (1992-96)',                          subtitle: 'Kennett, the SECV breakup, and who bought Loy Yang, Hazelwood, Yallourn', readingTime: '12 min' },
  { id: 'nsw-sa-priv',      number: 3,  title: 'NSW and SA — partial privatisation and the gentrader era', subtitle: 'Carr, Iemma, Keneally, O\'Farrell, and the SA long-lease',           readingTime: '12 min' },
  { id: 'qld-wa',           number: 4,  title: 'Queensland GOCs and Western Australia — the alternatives',  subtitle: 'Why QLD kept state ownership and why WA disaggregated then re-merged', readingTime: '12 min' },
  { id: 'gentailer',        number: 5,  title: 'What is a gentailer (and why it works)',                    subtitle: 'Vertical integration, hedging, churn and the structural advantage', readingTime: '10 min' },
  { id: 'agl-history',      number: 6,  title: 'AGL — the 187-year arc (1837 → 2026)',                      subtitle: 'Sydney streetlights, Loy Yang, Macquarie Generation, the demerger that wasn\'t', readingTime: '15 min' },
  { id: 'agl-today',        number: 7,  title: 'AGL today and 2030 — geographic mismatch and rebalance',    subtitle: 'State-by-state customers vs generation, pipeline, revenue shift', readingTime: '11 min' },
  { id: 'origin',           number: 8,  title: 'Origin Energy — Boral, APLNG, Eraring, and the Brookfield bid', subtitle: 'How a building-materials spin-off became a NEM giant',           readingTime: '12 min' },
  { id: 'energy-australia', number: 9,  title: 'EnergyAustralia — Sydney County Council to Hong Kong-owned', subtitle: 'TRUenergy, CLP, Yallourn closure and Tallawarra B',                  readingTime: '11 min' },
  { id: 'alinta',           number: 10, title: 'Alinta Energy — SECWA roots to Chow Tai Fook',              subtitle: 'Babcock & Brown, TPG, Loy Yang B and the WA stronghold',            readingTime: '10 min' },
  { id: 'ret-era',          number: 11, title: 'RET Era (2001-2016) — the LGC mechanism and the first wind boom', subtitle: 'MRET, LRET, the Warburton freeze, and the post-2020 LGC collapse', readingTime: '11 min' },
  { id: 'carbon-price',     number: 12, title: 'Carbon Price Era (2012-2014) — 25 months that re-shaped coal', subtitle: 'Clean Energy Act, the merit-order shift, why repeal didn\'t fully reverse it', readingTime: '11 min' },
  { id: 'closure-decade',   number: 13, title: 'Coal Closure Decade (2016-2024) — from Northern + Hazelwood to managed exits', subtitle: 'The shocks that forced government coordination of every subsequent closure', readingTime: '12 min' },
  { id: 'external-drivers', number: 14, title: 'External drivers — solar costs, BESS learning curves, drought', subtitle: 'Why Chinese manufacturing scale matters more than Australian policy', readingTime: '11 min' },
  { id: 'data-centres',     number: 15, title: 'Data centres — the demand wildcard', subtitle: 'Global growth, TNSP connection-application surge, the materialisation question', readingTime: '13 min' },
  { id: 'coal-exit',        number: 16, title: 'Coal exit and the 2030-35 NEM landing',                     subtitle: 'Who closes when, federal/state interventions, what fills the gap', readingTime: '13 min' },
  { id: 'where-going',      number: 17, title: 'Where we go from here — synthesis',                         subtitle: 'Four 2035 scenarios, gentailer trajectories, the second-half transition', readingTime: '11 min' },
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
// Lesson 1 — Pre-NEM Australia (state monopolies and COAG reform)
// ============================================================

function Lesson1() {
  return (
    <div>
      <H2>The state monopoly era — six fortresses</H2>
      <P>
        For most of the 20th century, Australia's electricity system was not one industry but six —
        one per state, each a vertically-integrated public monopoly. Each state owned everything: the
        coal mines that fuelled the generators, the generators themselves, the transmission lines that
        connected them, the distribution networks that ran down the suburban street, and (in most
        states) the retail relationship with the customer.
      </P>
      <Table
        emphasizeFirst
        headers={['State', 'Vertically-integrated utility', 'Primary fuel base']}
        rows={[
          ['NSW', 'Electricity Commission of NSW (Elcom) → Pacific Power', 'Black coal — Hunter Valley, Lithgow'],
          ['VIC', 'State Electricity Commission of Victoria (SECV)', 'Brown coal — Latrobe Valley'],
          ['QLD', 'Queensland Electricity Commission (QEC)', 'Black coal — Bowen Basin, Callide / Tarong fields'],
          ['SA', 'Electricity Trust of South Australia (ETSA)', 'Brown coal (Leigh Creek) + gas'],
          ['WA', 'State Electricity Commission of WA (SECWA)', 'Black coal — Collie + Pilbara gas'],
          ['TAS', 'Hydro-Electric Commission (HEC)', 'Hydropower — Central Plateau dams'],
        ]}
      />
      <P>
        These were not just utilities. They were instruments of state economic policy. NSW's Elcom
        bankrolled the development of the Hunter Valley coal industry. Victoria's SECV literally
        invented the brown-coal mining town (Yallourn, Morwell, Traralgon). Queensland's QEC built
        regional Queensland through rural electrification. The idea of selling them was, for decades,
        politically unthinkable.
      </P>

      <H2>Why vertical integration was the default</H2>
      <P>
        Three arguments held the system together for fifty years:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Capital intensity.</Em> A 660 MW coal unit cost the 1970s equivalent of $2-3B and had
          a 50-year planning horizon. No private investor would commit that without a guaranteed
          return — which only a government with rate-setting power could deliver.</li>
        <li><Em>Natural monopoly.</Em> A second set of transmission lines competing with the first
          made no economic sense. If the wires were a monopoly, the argument went, so should the rest
          be.</li>
        <li><Em>Public-good framing.</Em> Universal access at uniform pricing was treated as a social
          contract. Cross-subsidising remote rural consumers from urban consumers was easier inside a
          single integrated utility than across competitive markets.</li>
      </ul>

      <H2>Why it broke</H2>
      <P>
        By the late 1980s the model was failing on three measures at once. <Em>Costs</Em> were
        ballooning — overbuild in the 1970s under "build for the next thirty years" assumptions left
        states with massive surplus capacity and capital tied up in plants the demand didn't justify.
        <Em>Productivity</Em> was poor — public utilities had workforces 2-3× the headcount of
        comparable private utilities in the US or UK. <Em>Cross-state inefficiency</Em> was
        invisible — Victoria's brown coal was being burned to meet evening peaks while South
        Australia's gas plants sat idle, or NSW exported in the dead of night while Queensland imported,
        because there was no integrated market to dispatch the most efficient plant.
      </P>

      <H2>The Hilmer Review and the COAG reform of 1991</H2>
      <P>
        The 1991 Council of Australian Governments (COAG) reform package — guided by the
        <em> Independent Committee of Inquiry into National Competition Policy</em> chaired by
        Professor Frederick Hilmer — laid out a framework that would reshape every infrastructure
        sector in Australia, but it landed hardest on electricity. The five core principles:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Structural separation</Em> — vertically integrated utilities must be split into
          generation, transmission, distribution and retail businesses</li>
        <li><Em>Open access</Em> — transmission and distribution networks must allow any generator or
          retailer to use them, at regulated prices</li>
        <li><Em>Competitive neutrality</Em> — state-owned businesses competing with private firms
          must do so on equivalent terms (tax, regulation, cost of capital)</li>
        <li><Em>Independent economic regulation</Em> — prices for the monopoly network components
          would be set by a regulator at arm's length from political pressure</li>
        <li><Em>Cross-border competition</Em> — generators in one state should be able to sell to
          retailers and large consumers in another, via a national wholesale market</li>
      </ul>

      <H2>The NEM begins — 13 December 1998</H2>
      <P>
        The National Electricity Market started trading on 13 December 1998 with three founding
        regions: NSW, Victoria, and the ACT. Queensland joined when the QNI interconnector to NSW was
        commissioned in 2001; South Australia joined when the Heywood interconnector to Victoria came
        online (also 2001). Tasmania joined when the Basslink cable to Victoria entered service in
        2005. Western Australia and the Northern Territory remain separate to this day — WA runs the
        South West Interconnected System (SWIS) and the North West Interconnected System (NWIS), the
        NT runs three small isolated systems.
      </P>
      <P>
        The NEM is fundamentally a <Em>gross pool</Em>: every megawatt-hour generated in the NEM
        regions is offered to AEMO (the Australian Energy Market Operator), which then dispatches
        plant in 5-minute intervals to meet demand at lowest cost, subject to security constraints.
        The settlement price for each 5-minute interval is the regional reference price, paid to all
        dispatched generators in that region. Retailers buy from the pool at that same price.
      </P>

      <Callout type="key">
        The structural separation mandated by COAG meant generators could no longer rely on a captive
        retail customer base to recover their costs. They had to compete in the spot market every
        five minutes. This is the foundational fact of the modern Australian energy market —
        everything that follows (the rise of the gentailer, capture-price decay, BESS economics,
        the CIS) is downstream of this reform.
      </Callout>

      <H2>Three paths from one starting point</H2>
      <P>
        COAG didn't tell each state <em>how</em> to disaggregate or whether to privatise. That was
        left to state governments. Three distinct paths emerged: Victoria's complete and rapid
        privatisation (1992-99), NSW and SA's contested partial privatisation (1996-2014), and
        Queensland's retention of state ownership (the GOC model). Western Australia carved a fourth
        path, disaggregating and then re-aggregating its sector inside fifteen years. The next four
        lessons cover each path.
      </P>

      <Callout type="source">
        Sources: Hilmer Report 1993 · COAG energy reform agreement July 1991 ·
        AEMC <em>History of the NEM</em> · Productivity Commission <em>Energy Market Reforms 1998</em> ·
        IEA <em>Australia Electricity Sector Review</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 2 — The Victorian sell-off (1992-96)
// ============================================================

function Lesson2() {
  return (
    <div>
      <H2>Kennett and the great Victorian sell-off</H2>
      <P>
        Jeff Kennett's Liberal-National Coalition won the 1992 Victorian election on a debt-reduction
        platform. Victoria was carrying ~$32B in state debt — much of it loaded onto the State
        Electricity Commission's overbuilt 1980s generation fleet. The SECV was, depending on the
        accounting, between $20B and $25B of that debt. Selling it would simultaneously retire debt
        and remove the political problem of a money-losing monopoly.
      </P>
      <P>
        Within four years (1995-99), Kennett's government broke up the SECV into 14 separate
        businesses and sold every one of them. No other state attempted privatisation at this scale
        or speed. Victoria became — and remains — the most privatised electricity market in the world.
      </P>

      <H2>The generation breakup</H2>
      <P>
        The SECV's generation portfolio was disaggregated into five companies, each centred on one
        major brown-coal complex:
      </P>
      <Table
        emphasizeFirst
        headers={['Plant', 'Capacity', 'Sale year', 'Sale price', 'Buyer']}
        rows={[
          ['Yallourn Energy', '1,480 MW', '1996', '~$2.1B', 'Powergen UK (later sold on)'],
          ['Hazelwood', '1,600 MW', '1996', '~$2.4B', 'International Power UK consortium'],
          ['Loy Yang B', '1,000 MW', '1992 (partial) / 1997 (full)', '~$1.0B', 'Mission Energy + Tokyo Electric consortium'],
          ['Loy Yang A', '2,000 MW', '1997', '~$4.74B', 'Horizon Energy Investment Group'],
          ['Energy Brix', '150 MW', '1996', '~$50M', 'HRL Limited'],
          ['Southern Hydro', '479 MW', '1997', '~$391M', 'Infratil / Meridian'],
        ]}
      />
      <P>
        Loy Yang A's sale price — $4.74B — was the largest single asset sale in Australian history at
        the time. The buyer, Horizon Energy Investment Group, was a consortium of US power developers
        (CMS Energy, NRG Energy, Mission Energy) and Australian financial buyers. Loy Yang A would
        change hands three more times over the next decade as the original 1997 capital structure
        proved too aggressive for the prices that materialised in the early NEM.
      </P>

      <H2>The distribution breakup</H2>
      <P>
        Victoria's electricity distribution networks — the poles and wires that run down each
        suburban street — were split into five geographical zones. Each was sold as a long-term
        regulated monopoly to private buyers:
      </P>
      <Table
        emphasizeFirst
        headers={['Network', 'Territory', 'Buyer (1995-96)', 'Current owner']}
        rows={[
          ['CitiPower', 'Inner Melbourne', 'Entergy (US)', 'Spark Infrastructure / Power Assets HK'],
          ['Powercor', 'Western Victoria', 'PacifiCorp (US)', 'Spark Infrastructure / Power Assets HK'],
          ['Eastern Energy', 'Eastern Melbourne', 'TXU (US)', 'Ausnet Services (later sold to Singapore Power)'],
          ['Solaris Power', 'Northern Melbourne', 'GPU (US)', 'Jemena (now SGSP / Singapore-China)'],
          ['United Energy', 'Southern Melbourne', 'UtiliCorp (US) + AMP', 'CKI / Spark Infrastructure'],
        ]}
      />
      <P>
        Notice the buyers: <Em>every single Victorian distribution network was sold to a foreign
        buyer in 1995-96</Em>, mostly US utilities. By 2026, none of the original US buyers remain —
        ownership has churned through US, UK, Singaporean, Chinese and Hong Kong investors. This is
        partly because regulated network returns proved less attractive than the original buyers
        modelled, partly because Asian utility capital was searching for yield through the 2000s.
      </P>

      <H2>The retail breakup</H2>
      <P>
        The SECV's retail business was split into five customer franchises — initially aligned with
        the distribution zones, then progressively opened to competition. The original retail
        ownership map at full contestability in 2002:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Eastern Energy retail</Em> → TXU Australia → TRUenergy (CLP, 2005) → <Em>EnergyAustralia</Em></li>
        <li><Em>CitiPower retail</Em> → Origin Energy (acquired 2002)</li>
        <li><Em>Solaris / Powercor retail</Em> → AGL Energy</li>
        <li><Em>Pulse Energy</Em> (newcomer) → AGL (acquired 2008)</li>
      </ul>
      <P>
        By 2005, the three retail brands that remained — AGL, Origin and TRUenergy — had each
        acquired generation assets in Victoria, NSW or SA. The vertical integration that COAG had
        deliberately broken apart in 1998 was being reassembled by 2005, but now in private hands.
        This is the moment the <Em>gentailer</Em> structure begins (covered in Lesson 5).
      </P>

      <H2>The fate of the original buyers</H2>
      <P>
        The most consequential post-1997 sale was Loy Yang A. The Horizon consortium proved over-
        levered relative to actual NEM revenues, and after the 2001 Enron collapse Mission Energy
        (one of the consortium partners) was forced into receivership. Horizon followed in 2003.
        Loy Yang A was repackaged and sold to <Em>Great Energy Alliance Corporation (GEAC)</Em> in
        2004 — a consortium of AGL Energy (32.5%), Tokyo Electric Power Co (TEPCO, 32.5%), Tokyo Gas,
        Marubeni and Macquarie Bank. This consortium would in turn unwind a decade later, leaving
        AGL the sole owner — the subject of Lesson 6.
      </P>

      <H2>The legacy</H2>
      <P>
        Victoria emerged from the Kennett sell-off with the cheapest electricity prices in Australia
        for about a decade (1998-2008) — the result of selling brown-coal generators at fire-sale
        prices to debt-funded buyers who then competed each other into thin margins. By 2010 those
        same generators were under-investing in maintenance, and by 2017 Hazelwood closed abruptly
        with two months' notice when French parent Engie ran out of capital to recover its
        boiler-pressure issues. Brown coal had been mispriced from day one; the sell-off accelerated
        the under-investment cycle that ended with Hazelwood's exit and made VIC the most coal-
        dependent state at exactly the moment coal began to retreat.
      </P>

      <Callout type="key">
        Victoria's privatisation produced two enduring features of the NEM: (1) the brown-coal
        generators of the Latrobe Valley are <Em>privately owned, foreign-controlled, and operating
        on assets older than 1985</Em> — a recipe for forced unscheduled outages, which is exactly
        what unfolded 2017-2024; and (2) the retail brands that survived the consolidation — AGL,
        Origin, EnergyAustralia — gained the customer relationships that would let them re-integrate
        into private gentailers over the next decade.
      </Callout>

      <Callout type="source">
        Sources: Kennett Government final budget papers 1999 · Productivity Commission
        <em> Victorian Electricity Industry Inquiry 1996</em> · Department of Treasury & Finance VIC
        <em> Electricity Privatisation Outcomes</em> · ACCC <em>Reports on State Privatisations</em> ·
        Wikipedia / company histories cross-checked.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 3 — NSW and SA privatisation
// ============================================================

function Lesson3() {
  return (
    <div>
      <H2>The NSW privatisation that took 20 years</H2>
      <P>
        Where Victoria's privatisation was decisive, NSW's was a 20-year political war fought
        inside the Labor Party as much as between the parties. Three separate Labor premiers attempted
        electricity privatisation, three were defeated by their own caucus or party conference, and a
        Liberal premier eventually completed the job in 2014.
      </P>

      <H2>The Carr attempt (1997)</H2>
      <P>
        Bob Carr's Labor government had been elected 1995 with a centre-left mandate. By 1997, with
        NSW state debt rising and energy reform underway nationally, Carr proposed selling Pacific
        Power's generation assets and the NSW distribution networks. The May 1997 ALP State
        Conference rejected the proposal by a 3:1 margin. Carr withdrew the plan and did not raise
        electricity privatisation again during his premiership.
      </P>

      <H2>The Iemma attempt (2008)</H2>
      <P>
        Morris Iemma, who succeeded Carr, made a second attempt in 2007-2008. The proposal was more
        modest: lease the generators (rather than sell outright) and sell the retailers. The May 2008
        ALP State Conference rejected it 702 votes to 107. The defeat triggered Iemma's resignation
        in September 2008. NSW's electricity sector remained state-owned for two more years.
      </P>

      <H2>The Keneally "Gentrader" compromise (2010)</H2>
      <P>
        Kristina Keneally, succeeding Iemma, found a structure that bypassed the ALP conference's
        outright opposition to selling the plants. Under the <Em>Gentrader</Em> model, the NSW
        government retained ownership of the physical power stations but sold the long-term rights
        to trade their output. The 2010 transactions:
      </P>
      <Table
        emphasizeFirst
        headers={['Gentrader contract', 'Plants covered', 'Buyer', 'Price', 'Term']}
        rows={[
          ['Macquarie Generation', 'Bayswater 2,640 MW + Liddell 2,000 MW', 'AGL Energy', '$1.5B (later)', 'Indefinite output rights'],
          ['Delta Electricity (Western)', 'Mt Piper 1,400 MW + Wallerawang 1,000 MW', 'TRUenergy (CLP)', '$2.04B', '36-year offtake'],
          ['Delta Electricity (Coastal)', 'Vales Point 1,320 MW + Munmorah 600 MW', 'Origin Energy (later)', 'Retained for sale', '—'],
          ['NSW retail (EnergyAustralia)', 'Sydney + Hunter retail customers', 'TRUenergy (CLP)', '$2.04B (combined)', 'Asset sale'],
          ['NSW retail (Country Energy)', 'Regional NSW retail customers', 'Origin Energy', '$1.07B', 'Asset sale'],
          ['NSW retail (Integral Energy)', 'Western Sydney retail customers', 'Origin Energy', '(part of $1.07B)', 'Asset sale'],
        ]}
      />
      <P>
        The Gentrader deal was simultaneously the largest single electricity transaction in
        Australian history (~$5.3B across all parts) and a political disaster. Treasurer Eric
        Roozendaal pushed the deal through Cabinet without the ALP conference's prior approval. The
        deal was signed at midnight on 14 December 2010 — at which point eight Labor MLCs resigned
        from the board of Eraring Energy in protest. The Labor government lost the next election in
        March 2011 in a landslide.
      </P>

      <H2>The O'Farrell completion (2013-2014)</H2>
      <P>
        Barry O'Farrell's Liberal government, elected 2011, completed what Carr, Iemma and Keneally
        couldn't. The 2013-14 transactions sold the underlying power stations to their existing
        gentraders:
      </P>
      <Table
        emphasizeFirst
        headers={['Asset', 'Year', 'Buyer', 'Price', 'Note']}
        rows={[
          ['Eraring Power Station 2,880 MW', '2013', 'Origin Energy', '~$50M', 'Already had gentrader rights via Eraring Energy; NSW Govt wanted to exit ownership'],
          ['Vales Point Power Station 1,320 MW', '2015', 'Sunset Power / Delta Electricity (private)', '~$1M (yes, $1 million)', 'Private buyers Trevor St Baker + Brian Flannery; subsequent transactions'],
          ['Macquarie Generation (Bayswater + Liddell)', '2014', 'AGL Energy', '$1.505B', 'Made AGL the largest single generator in the NEM'],
          ['Mt Piper + Wallerawang', '2014', 'EnergyAustralia (CLP)', '$160M', 'Wallerawang demolished 2015; Mt Piper retained'],
        ]}
      />
      <P>
        Two prices stand out for sheer cheapness: Eraring at $50M (for 2,880 MW of plant on a fully
        consented site) and Vales Point at $1M. Both reflect how poorly NSW black coal was viewed in
        2013 — the Carbon Pricing Mechanism had just been repealed, but the writing was already on
        the wall. Both buyers ended up with assets worth far more in subsequent years as wholesale
        prices recovered.
      </P>

      <H2>The South Australian long-lease (1999)</H2>
      <P>
        John Olsen's Liberal government in SA went a different route. Rather than sell the assets
        outright, the government granted <Em>long-term leases</Em> (mostly 100 years) — politically
        more palatable, economically near-equivalent. The 1999 transactions raised $5.4B for the
        state and transferred control of essentially the entire SA electricity system:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>ETSA Utilities</Em> (distribution) → 200-year lease to Cheung Kong Infrastructure
          (CKI, Hong Kong). Now operates as <Em>SA Power Networks</Em>.</li>
        <li><Em>ETSA Power</Em> (Pelican Point + Torrens Island gas generators) → 100-year lease to
          NRG Energy (US). NRG later sold to International Power (UK), then GDF Suez, then Engie.</li>
        <li><Em>Optima Energy</Em> (Northern + Playford brown coal) → 100-year lease to NRG.
          Both plants closed 2016 — Northern was SA's last operating coal generator.</li>
        <li><Em>SA retail (origin point)</Em> → AGL acquired the customer base through subsequent
          consolidation.</li>
      </ul>
      <P>
        SA emerged from privatisation with the highest retail electricity prices in the NEM —
        a position it has held almost continuously since 2000. Three structural reasons: (1) SA
        relied disproportionately on expensive gas peaking generation, (2) the state imported
        roughly a third of its electricity from VIC via the Heywood interconnector and paid a premium
        for it, and (3) the privatised gas plants had concentrated ownership and consequent market
        power.
      </P>

      <Callout type="warn">
        SA's high electricity prices were a major political headache through the 2000s and 2010s and
        directly motivated Jay Weatherill's Labor government to chase renewable energy aggressively
        — Hornsdale Power Reserve (the original Tesla Big Battery), the world's largest wind farm
        portfolio per-capita, and the 2017 systemwide blackout that pushed the state into accelerated
        grid-scale storage investment. The privatisation legacy in SA is therefore directly upstream
        of both Australia's first big battery and the broader battery-storage industry.
      </Callout>

      <H2>What NSW and SA had in common</H2>
      <P>
        Both privatisations transferred assets cheap to buyers who were betting on long-term wholesale
        price appreciation. Both produced ownership chains that ended in foreign hands or in
        gentailer hands (AGL, Origin, EnergyAustralia). And both consolidated retail and generation
        ownership in ways that COAG had deliberately tried to prevent — Origin owned Eraring AND
        retail customers in NSW; AGL owned Macquarie Gen AND retail customers; EnergyAustralia owned
        Mt Piper AND retail customers. The competitive separation that justified privatisation in the
        first place lasted barely fifteen years.
      </P>

      <Callout type="source">
        Sources: NSW Treasury <em>Electricity Privatisation Final Report 2014</em> · Government of SA
        <em> ETSA Lease Transactions 1999</em> · ABC News archives · AFR
        <em> Gentrader Files</em> · Origin Energy and AGL annual reports · Wikipedia /
        Australian Parliamentary Library cross-checked.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 4 — Queensland GOCs and Western Australia
// ============================================================

function Lesson4() {
  return (
    <div>
      <H2>Queensland — the GOC model that stuck</H2>
      <P>
        Of the original six state-owned electricity systems, Queensland is the only one where
        <em> generation remains entirely in state hands in 2026</em>. The story of how that happened
        is a study in Queensland Labor's resistance to privatisation, the political defeat of the one
        attempt to change course, and the institutional pattern that emerged: <Em>Government Owned
        Corporations (GOCs)</Em> running the generation, transmission, distribution and retail
        functions in parallel with private-sector competition where it could be tolerated.
      </P>

      <H2>The Beattie / Bligh era (1998-2012)</H2>
      <P>
        Peter Beattie's Labor government, elected 1998, made an early decision: no electricity
        privatisation. Beattie saw what Carr was attempting in NSW and the political cost being paid
        in Victoria, and judged that Queensland's regional Labor base (Ipswich, Bundaberg, Rockhampton,
        Mackay) would not tolerate it. Generation stayed government-owned, restructured into two
        competing GOCs (CS Energy and Stanwell) plus a third (Tarong) that was later merged.
      </P>
      <P>
        Anna Bligh's Labor government did sell some assets — Queensland Rail freight (2010) and
        Queensland Motorways (2010) — but kept electricity off the privatisation list. The 2010 ALP
        State Conference explicitly resolved against electricity privatisation, mirroring NSW's
        position but with effective enforcement.
      </P>

      <H2>The Newman attempt and the 2015 election (2014-2015)</H2>
      <P>
        Campbell Newman's LNP government, elected in a 2012 landslide (78 of 89 seats), took the
        electricity privatisation idea to the 2015 election as the centrepiece of its second-term
        agenda — proposing 99-year leases of the generators, transmission (Powerlink) and the urban
        distribution networks for an expected $37B. The 31 January 2015 election was a political
        earthquake: the LNP lost 36 seats, Newman lost his own seat, and the ALP under Annastacia
        Palaszczuk formed minority government with 44 seats. Electricity privatisation was the
        dominant single issue and the dominant political postmortem.
      </P>
      <P>
        Palaszczuk's three successive election wins (2015, 2017, 2020) cemented the GOC model. The
        2022 <Em>Queensland Energy and Jobs Plan</Em> went further — it committed the state to
        retaining majority public ownership of generation through the renewable transition, with
        $62B of state-led investment in renewables, storage and transmission.
      </P>

      <H2>The current Queensland GOC structure</H2>
      <Table
        emphasizeFirst
        headers={['GOC', 'Role', 'Major assets']}
        rows={[
          ['Stanwell Corporation', 'Coal + gas generation, soon-to-be renewables', 'Stanwell PS 1,460 MW, Tarong PS 1,400 MW, Tarong North 443 MW, Meandu coal mine, Wivenhoe wholesale role'],
          ['CS Energy', 'Coal + gas generation, soon-to-be renewables', 'Callide B 700 MW, Callide C 810 MW (post-Unit C4 explosion 2021), Kogan Creek 750 MW, Gladstone Power Station role'],
          ['CleanCo Queensland', 'Clean energy (created 2019)', 'Wivenhoe pumped hydro 570 MW, Kareeya hydro 88 MW, Borumba pumped hydro 2 GW (under development), MacIntyre wind farm 1,026 MW (operating)'],
          ['Energy Queensland', 'Distribution + retail', 'Energex (SE QLD distribution), Ergon Energy (regional distribution + retail), Yurika (retail brand for commercial customers)'],
          ['Powerlink Queensland', 'Transmission', 'All Queensland high-voltage transmission, plus QNI interconnector to NSW'],
        ]}
      />

      <H2>Why the GOC model has worked for Queensland</H2>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Scale and diversification.</Em> Queensland's generation fleet is geographically and
          technically diverse (coal at Stanwell, Tarong, Callide, Kogan; gas at Swanbank, Yarwun;
          hydro at Wivenhoe, Kareeya). State ownership lets the portfolio cross-subsidise — the
          coal generators fund the renewables build, the hydro hedges the coal exit risk.</li>
        <li><Em>Retail competition is allowed.</Em> AGL, Origin, EnergyAustralia all operate in
          Queensland's retail market alongside Yurika and Ergon Retail. The GOC model isn't a
          monopoly — it's a state-owned set of competitive businesses.</li>
        <li><Em>Capital is cheaper.</Em> Queensland Treasury's borrowing rates are 100-200 bps below
          what private generators can secure. This matters enormously for capital-intensive
          renewables and storage build-out.</li>
        <li><Em>Political durability.</Em> The 2015 election made electricity privatisation a
          near-impossible issue for any major Queensland political party. Both Labor and LNP have
          since committed to majority public ownership of the renewable transition assets.</li>
      </ul>

      <Callout type="key">
        Queensland's GOC structure has become the unintended template for what other states are now
        trying to recreate via EnergyCo (NSW), VicGrid (VIC) and the federal CIS. The realisation
        that <Em>large-scale renewable build-out works best with government balance-sheet support
        and coordination</Em> has effectively re-introduced state-led energy investment in every
        NEM jurisdiction by 2026.
      </Callout>

      <H2>Western Australia — disaggregation and re-merge</H2>
      <P>
        Western Australia is structurally separate from the NEM (it runs the SWIS and NWIS as
        independent systems), but its reform journey is instructive. The Court Liberal government
        broke up SECWA in 1995 into separate entities — but unlike Victoria, it did not privatise
        them outright. The Carpenter Labor government completed the disaggregation in 2006:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Verve Energy</Em> — generation</li>
        <li><Em>Synergy</Em> — retail</li>
        <li><Em>Western Power</Em> — transmission and distribution (urban SWIS)</li>
        <li><Em>Horizon Power</Em> — regional WA (transmission, distribution, retail combined for
          regional towns)</li>
      </ul>
      <P>
        WA's gas-retail business was privatised separately and became <Em>Alinta Gas</Em> in 2000 —
        the foundation of what would become Alinta Energy (Lesson 10).
      </P>

      <H2>WA's 2014 re-merger</H2>
      <P>
        The Barnett Liberal government undid much of the disaggregation in 2014. Verve Energy
        (generation) and Synergy (retail) were merged back into a single state-owned gentailer
        called <Em>Synergy</Em>. The argument: WA's small market (~5,000 MW peak demand vs 35,000+
        in the NEM) made true competition impractical, and vertical separation was producing
        retail-margin compression that risked making the state utility insolvent.
      </P>
      <P>
        Today, WA's SWIS structure is:
      </P>
      <Table
        emphasizeFirst
        headers={['Entity', 'Function', 'Ownership']}
        rows={[
          ['Synergy', 'Government-owned gentailer (gen + retail)', 'WA Government'],
          ['Western Power', 'Transmission + urban distribution', 'WA Government'],
          ['Horizon Power', 'Regional generation + distribution + retail', 'WA Government'],
          ['Alinta Energy', 'Private gentailer competitor to Synergy', 'Chow Tai Fook (Hong Kong)'],
          ['Bluewaters / Sumitomo', 'Private coal generation (Collie)', 'Sumitomo / Kansai consortium'],
          ['AEMO (WA division)', 'Market operator', 'Federal'],
        ]}
      />

      <Callout type="info">
        WA's re-merger of Synergy in 2014 went almost unnoticed nationally but it's a useful case
        study: it shows that even where structural separation was achieved, in a small market the
        benefits of vertical integration can outweigh the costs of reduced retail competition. The
        same logic explains why the NEM's gentailers (AGL, Origin, EnergyAustralia) survived and
        consolidated after privatisation despite COAG's original intent.
      </Callout>

      <Callout type="source">
        Sources: Queensland Energy and Jobs Plan 2022 · Queensland Treasury <em>GOC annual reports</em> ·
        WA Department of Energy <em>SWIS Reform Final Report 2014</em> ·
        Synergy and Western Power annual reports · ABC News election coverage 2015.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 5 — What is a gentailer (and why it works)
// ============================================================

function Lesson5() {
  return (
    <div>
      <H2>The word and what it actually means</H2>
      <P>
        A <Em>gentailer</Em> is a vertically-integrated business that owns both <em>generation</em>
        (power stations) and <em>retail</em> (the relationship with end-use electricity customers).
        Within the NEM, three companies have dominated the gentailer model for the past 20 years:
        AGL Energy, Origin Energy, and EnergyAustralia. A fourth — Alinta Energy — has scale in
        Western Australia and growing scale on the east coast. These four collectively serve roughly
        <Em> 75-80% of NEM electricity customers</Em> and own roughly <Em>55% of the dispatchable
        generation fleet</Em>.
      </P>

      <H2>Why vertical integration works in electricity</H2>
      <P>
        The structural argument for the gentailer model comes down to <Em>basis risk</Em>. A retailer
        without owned generation must buy electricity from the NEM pool at the regional reference
        price (RRP), which can swing from negative $1,000/MWh to $17,500/MWh in adjacent five-minute
        intervals. Customers, meanwhile, pay a fixed retail tariff. The retailer is short the
        difference and must hedge.
      </P>
      <P>
        Hedging instruments exist — swaps, caps, futures (traded on the ASX 24 platform) — but
        they have basis risk against the actual physical position. A retailer that hedges with a
        12-month $80/MWh swap is fully protected only if its actual customer load profile and
        regional price exposure exactly matches the swap reference. They never do.
      </P>
      <P>
        A retailer with owned generation has a <Em>natural hedge</Em>: when wholesale prices spike,
        retail margins compress, but generation margins expand. The two largely offset. The
        gentailer model effectively internalises the hedge — every MWh of customer load that's
        served by an owned MWh of generation eliminates both the retailer's basis risk and the
        generator's offtake risk.
      </P>

      <H2>The 2017-19 lesson — when non-gentailers got crushed</H2>
      <P>
        The structural advantage of the gentailer model was most visible during the 2017-19 NEM
        wholesale price spike. NEM average prices rose from ~$60/MWh in 2015-16 to ~$110-140/MWh in
        2018-19. Customers were on fixed retail tariffs set 12-18 months earlier. Non-gentailer
        retailers — pure resellers buying from the pool at spot or contract — saw their margins
        compress to negative. The casualty list:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Sumo Power</Em> — sold to Origin 2017</li>
        <li><Em>Powerdirect</Em> — sold to AGL 2007 (under previous price spike)</li>
        <li><Em>Pulse Energy</Em> — collapsed 2018, customers transferred</li>
        <li><Em>Urth Energy</Em> — went into liquidation 2019</li>
        <li><Em>One Big Switch / Energy Locals</Em> — squeezed, survived but at small scale</li>
        <li><Em>Click Energy</Em> — sold to AGL 2017</li>
        <li><Em>1st Energy</Em> — sold to ERM Power 2018</li>
        <li><Em>Diamond Energy</Em> — survived, but on retail-only model with constant capital raises</li>
      </ul>
      <P>
        The pattern is consistent: <Em>vertically-integrated incumbents bought out distressed
        retail-only competitors at depressed valuations.</Em> Every wholesale price cycle since 2007
        has produced this same pattern. The Big 4 gentailers' market share has therefore <em>grown</em>
        through periods of high wholesale prices, not shrunk.
      </P>

      <H2>Why the regulator hasn't intervened</H2>
      <P>
        The ACCC's 2018 <Em>Retail Electricity Pricing Inquiry</Em> identified gentailer dominance
        as a competition concern but stopped short of recommending structural separation. The
        argument:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Forced separation would destroy the natural hedge and increase capital costs for both
          generation and retail businesses</li>
        <li>The Default Market Offer (DMO, introduced 2019) caps retail price gouging in the
          standing-offer market</li>
        <li>Retail competition <em>exists</em> — there are ~75 active electricity retailers in the
          NEM. The Big 4 don't control 100% of customers.</li>
        <li>The transition to renewables requires gentailers to invest in new generation, and
          breaking up their balance sheets would make that harder</li>
      </ul>
      <P>
        The DMO has been the main regulatory lever. Set annually by the AER (federal) and ESC
        (Victoria), it caps what gentailers can charge standing-offer customers in each distribution
        network area. Market-offer customers (those on advertised plans) can be charged less, but
        not materially more. The DMO has tracked wholesale costs reasonably closely since 2019.
      </P>

      <H2>The Big 4 market share today</H2>
      <Table
        emphasizeFirst
        headers={['Gentailer', 'NEM retail accounts', 'NEM share', 'Owned generation (MW)', 'Generation share']}
        rows={[
          ['AGL Energy', '~4.5M', '28%', '~9,000 MW (incl. Bayswater + Loy Yang A)', '~18%'],
          ['Origin Energy', '~4.3M', '27%', '~6,000 MW (incl. Eraring)', '~12%'],
          ['EnergyAustralia', '~2.5M', '15%', '~3,200 MW (Yallourn + Mt Piper)', '~6%'],
          ['Alinta Energy', '~1.1M', '7%', '~1,500 MW (Loy Yang B + WA assets)', '~3%'],
          ['Big 4 total', '~12.4M', '77%', '~19,700 MW', '~39%'],
          ['~75 other retailers / generators', '~3.7M', '23%', '~30 GW (renewables + others)', '~61%'],
        ]}
      />
      <P>
        Two important things to read into this table. First, <Em>retail is more concentrated than
        generation</Em>: the Big 4 control 77% of customers but only ~39% of generation capacity.
        That's because renewables developers (Tilt, Goldwind, Neoen, ACEN, Iberdrola, ENGIE,
        Pacific Hydro etc.) own large chunks of new-build capacity but no retail. Second,
        <Em> generation share is falling fast</Em> — the Big 4's coal fleet is retiring, and they
        are competing with hundreds of new renewables developers for the replacement capacity.
      </P>

      <H2>What the gentailer model becomes in 2030</H2>
      <P>
        Two scenarios for what gentailers look like in 2030:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Status quo extended</Em> — Big 4 retain ~70-75% retail share, rebuild their
          generation portfolios around renewables + storage, run lower margins but on bigger
          customer bases. AGL and Origin pursue this path actively.</li>
        <li><Em>Customer-platform disruption</Em> — Amber, Powershop, OVO and others build retail
          businesses around customer-side optimisation (EV charging, BTM batteries, demand response).
          The Big 4 lose share to platforms but retain wholesale market power via owned generation.
          The retail margin <em>moves</em> from gentailer to platform.</li>
      </ul>

      <Callout type="key">
        The next five lessons profile the Big 4 in detail. The key question to keep in mind: each
        gentailer faces the same structural choice — defend the retail business with new owned
        generation, or accept that the generation business is becoming a separate (lower-return,
        higher-capital-intensity) infrastructure asset. AGL and Origin have committed to the first
        path. EnergyAustralia is hedging. Alinta is moving slower than the others.
      </Callout>

      <Callout type="source">
        Sources: ACCC <em>Retail Electricity Pricing Inquiry 2018</em> · AER <em>State of the
        Energy Market 2024</em> · AEMO retail market data · Company annual reports · AFR
        <em> Retail Casualty List 2017-2020</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 6 — AGL — the 187-year arc
// ============================================================

function Lesson6() {
  return (
    <div>
      <H2>1837 — The oldest company in Australia</H2>
      <P>
        The <Em>Australian Gas Light Company</Em> was chartered by the New South Wales colonial
        legislature in 1837 — eight years before the colony of Victoria was carved out, fifteen
        years before the discovery of gold at Ballarat, sixty-four years before federation. Its
        founding purpose was singular: provide gaslight for Sydney's streets. The first gasworks at
        Darling Harbour fired up in 1841 and lit George Street with whale-oil-derived town gas
        within the year.
      </P>
      <P>
        AGL is therefore the second-oldest company in Australia (behind only Tooth & Co Brewery) and
        among the oldest continuously-operating gas companies in the English-speaking world. For
        most of its first 150 years it was a pure gas business — town gas from coal carbonisation,
        then natural gas from Bass Strait after 1976. Through the Great Depression, both World Wars,
        nationalisation efforts and the 1970s oil shocks, AGL stayed a Sydney-centric gas retailer.
        Generation was someone else's problem.
      </P>

      <H2>2000-2006 — The pivot to electricity</H2>
      <P>
        Australia's electricity privatisation created a one-time opportunity. AGL had:
        a large existing customer base (~1.5M gas accounts in NSW and VIC), brand trust, and an
        established billing/credit infrastructure that could be repurposed for electricity. What it
        didn't have was generation.
      </P>
      <P>
        The transition happened in three stages:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>2000-2003:</Em> AGL acquires retail rights to Victorian distribution-network
          customers from Pulse Energy and Solaris Power (the Victorian retailers spun out of SECV).
          Cross-sells electricity into existing gas customer base.</li>
        <li><Em>2003:</Em> AGL Power Generation formed as a subsidiary; AGL begins acquiring small
          gas peaker and wind portfolios.</li>
        <li><Em>2006:</Em> Corporate restructure creates <Em>AGL Energy Ltd</Em> as the modern
          listed gentailer. AGL formally becomes a vertically-integrated electricity + gas business
          for the first time in 169 years.</li>
      </ul>

      <H2>2007 — The Loy Yang stake</H2>
      <P>
        Loy Yang A — the largest power station in Victoria, 2,210 MW of brown coal generation at
        Traralgon — had been privatised by Kennett in 1997. The original Horizon Energy consortium
        collapsed by 2003 under the weight of post-Enron deleveraging. Loy Yang A was reorganised
        into a new vehicle called <Em>Great Energy Alliance Corporation (GEAC)</Em> in 2004. GEAC's
        ownership in 2007:
      </P>
      <Table
        emphasizeFirst
        headers={['Shareholder', 'Stake', 'Role']}
        rows={[
          ['AGL Energy', '32.54%', 'Australian off-taker, retail customer base'],
          ['Tokyo Electric Power Company (TEPCO)', '32.54%', 'Japanese strategic investor — coal-fired expertise'],
          ['Tokyo Gas', '11.50%', 'Japanese energy company'],
          ['Marubeni Corporation', '13.61%', 'Japanese trading house'],
          ['Macquarie Bank', '9.81%', 'Financial investor'],
        ]}
      />
      <P>
        AGL paid approximately $448M for its 32.54% stake in 2007 and immediately signed a long-term
        contract for 60% of Loy Yang A's output — making the plant a critical hedge against AGL's
        growing Victorian retail customer base.
      </P>

      <H2>11 March 2011 — Fukushima Daiichi</H2>
      <P>
        On 11 March 2011, the Tōhoku earthquake and tsunami struck Japan's northeast coast. The
        Fukushima Daiichi nuclear power plant, operated by Tokyo Electric Power Company (TEPCO),
        suffered cooling-system failures across three reactors and partial meltdowns over the
        following days. TEPCO's losses from the disaster eventually totalled an estimated
        ¥21 trillion (~A$280 billion). TEPCO was nationalised in 2012 to manage the cleanup. As
        part of its forced asset sale, TEPCO began divesting non-core international holdings —
        including its 32.54% stake in Loy Yang A.
      </P>
      <P>
        Tokyo Gas and Marubeni also signalled exit. The GEAC consortium was unwinding.
      </P>

      <Callout type="key">
        Fukushima is the proximate cause of AGL becoming Australia's largest single power generator.
        TEPCO's forced divestment after the disaster created a once-in-a-generation opportunity for
        AGL to consolidate full ownership of Loy Yang A. Whether AGL would have made the same move
        without Fukushima is impossible to say — but the timing was no coincidence.
      </Callout>

      <H2>2012 — AGL takes full ownership of Loy Yang A</H2>
      <P>
        In June 2012, AGL announced it would acquire the remaining 67.46% of Loy Yang A for
        approximately $448M (plus assumption of project debt). The transaction closed in December
        2012, giving AGL 100% ownership of:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Loy Yang A power station — 2,210 MW of brown-coal generation</li>
        <li>The adjacent Loy Yang coal mine — 30 Mt/yr of brown coal reserves</li>
        <li>The associated 500 kV transmission connection to the Latrobe Valley network</li>
      </ul>
      <P>
        Loy Yang A's brown-coal LCOE in 2012-15 was approximately $28-35/MWh. Wholesale prices
        averaged $50-60/MWh during the post-Carbon-Price period. The plant generated approximately
        16 TWh per year, implying gross margin of $230-450M per annum. The acquisition paid back its
        nominal price within 2-3 years and became AGL's largest single profit centre. It would
        remain so for the next decade.
      </P>

      <H2>2014 — Macquarie Generation</H2>
      <P>
        Twelve months after Loy Yang A consolidation, the NSW O'Farrell government put Macquarie
        Generation on the block. Macquarie Generation owned <Em>Bayswater Power Station</Em> (2,640
        MW, Hunter Valley, NSW black coal) and <Em>Liddell Power Station</Em> (2,000 MW, Hunter
        Valley, NSW black coal). AGL bid $1.505B and won the September 2014 auction against ERM
        Power, Marubeni and others.
      </P>
      <P>
        The Macquarie Generation acquisition made AGL:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The <Em>largest single generator in the National Electricity Market</Em> — ~11,000 MW
          of installed capacity across Loy Yang A, Bayswater, Liddell, Torrens Island (SA gas),
          Newport (VIC gas), Macarthur wind, Hallett wind, and smaller hydro</li>
        <li>The <Em>largest single greenhouse gas emitter in Australia</Em> — approximately 42
          million tonnes CO₂-equivalent per annum, larger than any other entity in the Clean Energy
          Regulator's NGERS database</li>
        <li>A national gentailer in every NEM state (except Tasmania), with ~3.7M retail customers</li>
      </ul>

      <H2>2022 — The demerger that wasn't</H2>
      <P>
        By 2021, the strategic tension inside AGL had become impossible to manage. The coal-heavy
        generation portfolio was producing the cash that the renewables build-out needed, but it was
        also producing the emissions intensity that institutional investors increasingly couldn't
        hold. The AGL board, led by chair Peter Botten, proposed a structural demerger in mid-2021:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Accel Energy</Em> — the coal generation business (Loy Yang A, Bayswater, Liddell,
          Torrens Island, Newport). Designed to run the coal plants until close-down dates, then
          wind up.</li>
        <li><Em>AGL Australia</Em> — the retail business plus the renewables pipeline and gas
          peakers. Designed to be a forward-looking gentailer transitioning to clean energy.</li>
      </ul>
      <P>
        The demerger required 75% shareholder approval and was scheduled for a June 2022 vote.
      </P>

      <H2>Cannon-Brookes and the takedown</H2>
      <P>
        In February 2022, Mike Cannon-Brookes (co-founder of Atlassian) via his investment vehicle
        <Em> Grok Ventures</Em> joined with Brookfield Asset Management in a $5B takeover bid for the
        entire AGL business. The AGL board rejected it as undervaluing the company. The bidders
        withdrew.
      </P>
      <P>
        Cannon-Brookes then changed tactics. Grok Ventures spent approximately $650M acquiring
        <Em> 11.28% of AGL shares</Em> on-market through April-May 2022 — making Grok the single
        largest shareholder. Cannon-Brookes publicly opposed the demerger on the grounds that
        splitting the company would slow the closure of the coal plants (because Accel Energy would
        be capitalised specifically to run them out to schedule).
      </P>
      <P>
        AustralianSuper (10.1% holding) and HESTA (institutional super funds with combined ~13%)
        sided with Grok. With 30%+ of the register publicly opposed, the demerger could not reach
        75% approval. On 11 May 2022, the AGL board pulled the proposal and announced a major
        strategy review. Chair Peter Botten resigned within a week; CEO Graeme Hunt followed.
        Four other non-executive directors followed by mid-2022.
      </P>

      <H2>The Climate Transition Action Plan (2022-present)</H2>
      <P>
        The post-demerger AGL board (chaired by Patricia McKenzie from 2022) and the new CEO Damien
        Nicks pursued a strategy that the original demerger had ruled out: <Em>accelerate the coal
        exit using the cash that the coal business itself is generating</Em>.
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Liddell</Em> closed April 2023 — one year ahead of the original 2024 schedule, two
          years ahead of the post-Macquarie-Gen plan</li>
        <li><Em>Bayswater</Em> closure brought forward to 2033 (was 2035)</li>
        <li><Em>Loy Yang A</Em> closure brought forward to 2035 (was originally 2045-48)</li>
        <li><Em>Torrens Island</Em> closure brought forward to 2026 (was 2035)</li>
        <li><Em>Replacement build pipeline</Em>: ~12 GW of renewables and storage by 2035, with
          ~$20B of investment committed to the transition</li>
      </ul>
      <P>
        The 2024 Climate Transition Action Plan represents the largest single-company decarbonisation
        commitment in Australian corporate history — and a remarkable case study in shareholder
        activism reshaping a 187-year-old company's strategy in twelve months.
      </P>

      <Callout type="key">
        AGL's 2022 demerger battle is the most consequential corporate governance event in Australian
        energy industry history. Without it, AGL Energy would likely still be running its coal fleet
        to its original 2045-2048 closure dates. With it, AGL has accelerated coal closure by 7-10
        years and committed $20B to renewables — making it the single largest investor in
        Australia's energy transition. Lesson 7 examines what that pipeline actually looks like
        and how it's changing AGL's customer-vs-generation geography.
      </Callout>

      <Callout type="source">
        Sources: AGL Energy annual reports 2007-2025 · AGL Demerger Scheme Booklet 2021 ·
        Grok Ventures public correspondence 2022 · AustralianSuper public position 2022 ·
        Clean Energy Regulator NGERS database · Mike Cannon-Brookes public statements ·
        AFR <em>The Cannon-Brookes Files</em> · Reuters <em>TEPCO Loy Yang Sale</em> 2012.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 7 — AGL today and 2030 (geographic mismatch and rebalance)
// ============================================================

function Lesson7() {
  return (
    <div>
      <H2>AGL today — the customer footprint</H2>
      <P>
        As of mid-2026, AGL Energy serves approximately <Em>4.5 million electricity and gas
        customers</Em> across five jurisdictions (it does not operate in Tasmania or Western
        Australia). The customer mix:
      </P>
      <Table
        emphasizeFirst
        headers={['State', 'Approx. accounts', 'Share of AGL retail', 'Approx. AGL retail market share in that state']}
        rows={[
          ['VIC', '~1.5M', '33%', '~32% (gas + electricity combined)'],
          ['NSW', '~1.3M', '29%', '~24% (electricity), ~28% (gas)'],
          ['QLD', '~1.0M', '22%', '~30% (electricity)'],
          ['SA', '~0.6M', '13%', '~38% (electricity, largest of all gentailers)'],
          ['ACT', '~0.1M', '3%', '~25% (electricity)'],
        ]}
      />
      <P>
        Three patterns to note. First, <Em>AGL is over-indexed in Victoria</Em> — both because of
        its long history as a gas retailer in Sydney/Melbourne and because of the Pulse Energy
        acquisition. Second, <Em>AGL is the dominant retailer in SA</Em>, which has the highest
        average household bill in the NEM — making SA disproportionately important to AGL's retail
        margin. Third, <Em>AGL is meaningfully smaller in QLD</Em> than its national share, because
        Energy Queensland (Ergon Retail + Yurika) retains a strong regional presence.
      </P>

      <H2>AGL today — the generation footprint</H2>
      <P>
        AGL's generation portfolio as of mid-2026:
      </P>
      <Table
        emphasizeFirst
        headers={['Asset', 'State', 'Type', 'Capacity', 'Status']}
        rows={[
          ['Loy Yang A', 'VIC', 'Brown coal', '2,210 MW', 'Operating; close 2035 (planned)'],
          ['Bayswater', 'NSW', 'Black coal', '2,640 MW', 'Operating; close 2033 (planned)'],
          ['Liddell', 'NSW', 'Black coal', '2,000 MW', 'Closed April 2023'],
          ['Torrens Island A+B', 'SA', 'Gas', '1,280 MW', 'A retired; B operating, close 2026'],
          ['Newport', 'VIC', 'Gas peaker', '510 MW', 'Operating'],
          ['Somerton', 'VIC', 'Gas peaker', '150 MW', 'Operating'],
          ['Hallett Power Station', 'SA', 'Gas peaker', '203 MW', 'Operating'],
          ['Barker Inlet', 'SA', 'Gas peaker', '210 MW', 'Operating (commissioned 2019)'],
          ['Macarthur Wind Farm (50%)', 'VIC', 'Wind', '210 MW (AGL share)', 'Operating'],
          ['Hallett Wind Cluster', 'SA', 'Wind', '350 MW', 'Operating'],
          ['Coopers Gap Wind Farm', 'QLD', 'Wind', '453 MW (offtake)', 'Operating via PPA'],
          ['Broken Hill Solar', 'NSW', 'Solar', '53 MW', 'Operating (Cape Cluster)'],
          ['Nyngan + Broken Hill Solar PPAs', 'NSW', 'Solar', '300 MW (offtake)', 'Operating via PPA'],
          ['Liddell BESS', 'NSW', 'Battery', '500 MW / 2,000 MWh', 'Under construction; first 250 MW online late 2026'],
          ['Loy Yang BESS', 'VIC', 'Battery', '200 MW / 800 MWh', 'Under construction; online 2026-27'],
          ['Torrens Island BESS', 'SA', 'Battery', '250 MW / 1,000 MWh', 'Operating (commissioned 2023)'],
        ]}
      />

      <H2>The geographic mismatch — customers vs generation by state</H2>
      <P>
        Map AGL's customer footprint against its generation footprint and a clear mismatch emerges:
      </P>
      <Table
        emphasizeFirst
        headers={['State', 'AGL customer load (TWh)', 'AGL operating generation (TWh)', 'Net position', 'Implication']}
        rows={[
          ['VIC', '~10', '~14-16', 'Long generation (~+4-6 TWh)', 'AGL sells surplus into pool / contracts'],
          ['NSW', '~9', '~14-17', 'Long generation (~+5-8 TWh, falls to ~+5 by 2030 as Bayswater closes)', 'AGL sells surplus into pool / contracts'],
          ['QLD', '~7', '~3 (PPA offtake)', 'Short generation (~-4 TWh)', 'AGL buys from QLD pool / GOC contracts to serve customers'],
          ['SA', '~4', '~2-3', 'Short generation (~-1-2 TWh)', 'AGL buys from SA pool / Hornsdale-area generation'],
          ['ACT', '~1', '0', 'Short generation (~-1 TWh)', 'AGL buys from NSW pool / ACT 100% renewable contracts'],
        ]}
      />
      <P>
        Two observations. First, AGL is <Em>structurally long</Em> in VIC and NSW (more generation
        than load) and structurally <Em>short</Em> in QLD, SA and ACT (more load than generation).
        This is fine when wholesale prices are spread evenly across regions — AGL captures the
        difference. But it creates a vulnerability: regional price divergence (as happens during
        transmission congestion or interconnector outages) flows directly into AGL's earnings.
      </P>
      <P>
        Second, AGL's NSW long position is <Em>about to collapse</Em>. Bayswater closes in 2033; once
        it does, AGL loses ~16 TWh per year of NSW generation. To preserve its hedge against ~9 TWh
        of NSW customer load, AGL needs to replace not all 16 TWh but at least ~9 TWh of firm
        renewable generation. That's the core driver of the AGL renewables pipeline.
      </P>

      <H2>The AGL renewables pipeline — where the rebalance happens</H2>
      <P>
        AGL's announced Climate Transition Action Plan pipeline targets ~12 GW of new renewable and
        storage capacity by 2035. The geographic distribution is deliberately rebalanced:
      </P>
      <Table
        emphasizeFirst
        headers={['Project', 'State', 'Capacity', 'Type', 'Status / target online']}
        rows={[
          ['Liddell BESS', 'NSW', '500 MW / 2,000 MWh', 'Battery (4h)', 'Construction; first units late 2026'],
          ['Loy Yang BESS Phase 1', 'VIC', '200 MW / 800 MWh', 'Battery (4h)', 'Construction; 2026-27'],
          ['Loy Yang BESS Phase 2+3', 'VIC', '500 MW / 2,000 MWh', 'Battery (4h)', 'FID expected 2026-27'],
          ['Macquarie Energy Hub', 'NSW', '1,000 MW+', 'Solar + BESS hybrid', 'Planning; FID 2027'],
          ['Bowmans Creek Wind', 'NSW', '270 MW', 'Wind', 'Construction; online 2027'],
          ['Pottinger Wind Farm (offtake)', 'NSW', '~400 MW', 'Wind (PPA)', 'Development'],
          ['Bayswater Hub', 'NSW', '500 MW', 'Solar + BESS', 'Planning; uses Bayswater connection post-2033'],
          ['Hunter Renewable Energy Hub', 'NSW', '1,500 MW', 'Wind + solar + BESS', 'Planning'],
          ['Forest Wind (offtake)', 'QLD', '450 MW', 'Wind (PPA)', 'Construction'],
          ['Coopers Gap Wind expansion', 'QLD', 'TBA', 'Wind', 'Planning'],
          ['Aldoga Solar (offtake)', 'QLD', '~600 MW', 'Solar (PPA)', 'Construction'],
        ]}
      />

      <H2>What the rebalance looks like in 2030</H2>
      <P>
        Project the AGL pipeline forward to a 2030 generation footprint:
      </P>
      <Table
        emphasizeFirst
        headers={['State', 'AGL load 2030 (TWh)', 'AGL gen 2030 (TWh)', 'Net 2030', 'Comparison vs 2026']}
        rows={[
          ['VIC', '~11', '~10-12 (Loy Yang + new BESS + offtakes)', 'Roughly balanced', 'From +5 long → balanced'],
          ['NSW', '~10', '~15-17 (Bayswater still + new build)', 'Still long, +5-7', 'Similar; will collapse after 2033'],
          ['QLD', '~8', '~4 (new PPAs)', 'Still short, -4', 'Marginally better; remains primary growth focus'],
          ['SA', '~4', '~3 (firmed renewables)', 'Roughly balanced', 'From -2 short → balanced'],
          ['ACT', '~1', '0', 'Short', 'Unchanged'],
        ]}
      />
      <P>
        By 2030, AGL's portfolio looks meaningfully different: roughly balanced in VIC and SA, still
        long in NSW (until Bayswater retires), still short in QLD and ACT. The renewable build is
        therefore geographically targeted to fix the structural shortfall — not to replace
        coal-MWh-for-MWh, but to <em>match retail load to firm renewable generation in each region</em>.
      </P>

      <H2>What this does to AGL's revenue mix</H2>
      <P>
        AGL's FY25 underlying earnings ($1.4B EBIT) came roughly 65% from coal generation, 20% from
        retail margin, 10% from gas generation, and 5% from renewables + storage. By 2030 (with
        Bayswater still operating), this mix shifts to roughly: 40% from coal generation (declining),
        25% from renewable + storage generation, 20% from retail margin, 10% from gas peakers, 5%
        from carbon credits / other. By 2035 (post-Bayswater), coal drops to zero, renewables +
        storage rise to ~55-60% of earnings, retail margin remains ~20%, gas peakers ~15%, other ~5%.
      </P>

      <Callout type="key">
        The AGL transition story is therefore as much about <Em>geographic rebalancing</Em> as
        about replacing coal with renewables. The new build is concentrated in QLD (where AGL is
        short of generation) and in NSW (where Bayswater's eventual exit needs to be replaced). The
        VIC and SA fleets get firmed via storage rather than replaced. This pattern — replacing
        coal in some states, growing into others — will define the next decade of AGL's strategic
        story.
      </Callout>

      <Callout type="source">
        Sources: AGL Energy FY25 Investor Briefing · AGL Climate Transition Action Plan 2024 ·
        AEMO ISP 2026 generation forecast · AURES scheme tracker · AGL FY25 generation summary ·
        Reuters / AFR <em>AGL Strategy Update 2024-2025</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 8 — Origin Energy
// ============================================================

function Lesson8() {
  return (
    <div>
      <H2>1946-2000 — Boral and the Australian energy slice</H2>
      <P>
        Origin Energy doesn't trace back to 1837 — it traces back to <Em>Boral Limited</Em>, founded
        1946 as Bituminous Oil Refineries Australia Ltd, a wartime petroleum-refining venture that
        pivoted to building materials in peacetime. Through the 1970s and 1980s, Boral built one of
        Australia's largest diversified industrial groups: bricks, cement, plasterboard, asphalt,
        timber, oil & gas. By the late 1990s, Boral's energy business included gas distribution
        networks, oil & gas exploration acreage, and a small electricity retail operation.
      </P>
      <P>
        In February 2000, Boral demerged its energy assets into a separately-listed company called
        <Em> Origin Energy Ltd</Em>. The board appointed Grant King as foundation CEO. Origin
        started life with: $1.3B revenue, ~150,000 retail customers (mostly gas), upstream gas
        exploration tenements in the Cooper Basin and Queensland's Surat Basin, and minority
        interests in three small gas-fired power stations.
      </P>

      <H2>2002-2007 — Vertical integration via retail acquisition</H2>
      <P>
        Grant King's strategy was to acquire retail at scale while building generation behind it.
        Key acquisitions:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>2002:</Em> Origin acquires CitiPower retail from US Edison Mission Energy</li>
        <li><Em>2004:</Em> Origin acquires Sun Retail (Queensland) from Ergon Energy as part of
          Bligh Labor's partial QLD retail privatisation</li>
        <li><Em>2006:</Em> Origin acquires Powerdirect retail from CS Energy</li>
        <li><Em>2007:</Em> Origin acquires the New Zealand operations of Contact Energy (~60%
          stake), making it briefly a trans-Tasman gentailer</li>
      </ul>
      <P>
        By 2007 Origin had grown from 150,000 to ~3 million retail customers. Its generation portfolio
        had also expanded — Roma Power Station (gas, QLD), Worsley Cogen (industrial), Mortlake gas
        plant (under construction VIC). But the major strategic move came from gas, not electricity.
      </P>

      <H2>2008-2013 — APLNG and the LNG bet</H2>
      <P>
        Origin's largest strategic move was the <Em>Australia Pacific LNG (APLNG)</Em> project — an
        export-LNG venture monetising Origin's Queensland coal-seam-gas reserves via a $20B
        gas-liquefaction plant on Curtis Island, Gladstone. The structure:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Origin Energy</Em> — 37.5% — upstream CSG resource provider, project operator</li>
        <li><Em>ConocoPhillips</Em> — 37.5% — LNG facility operator</li>
        <li><Em>Sinopec</Em> — 25% — anchor LNG offtake customer</li>
      </ul>
      <P>
        APLNG was sanctioned in July 2011, construction ran 2011-2015, and first cargo shipped
        January 2016. The project produced ~9 million tonnes per annum of LNG and locked in
        approximately A$70B of contracted offtake revenue (Sinopec + Kansai Electric + others) over
        20 years. APLNG immediately became Origin's largest single financial asset and the single
        largest source of group cash flow.
      </P>
      <P>
        The pivot to LNG had a side effect: Origin's domestic gas customers in eastern Australia
        were now competing for the same gas molecules that APLNG was exporting to Asia at oil-linked
        prices. This is the structural origin of Australia's east-coast gas-price problem, which
        peaked 2017-19 and remains contested in 2026.
      </P>

      <H2>2013 — Eraring</H2>
      <P>
        The September 2013 NSW Government sale of Eraring Power Station to Origin Energy is, in
        hindsight, one of the most lopsided transactions in Australian energy history. NSW sold
        Eraring (2,880 MW black coal at Lake Macquarie) for approximately $50M — a price that
        reflected:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The Carbon Pricing Mechanism had just been repealed (July 2014 effective)</li>
        <li>NSW had already sold the output rights via the 2010 Gentrader deal — Origin owned the
          economic exposure, NSW owned the physical depreciation risk</li>
        <li>Wholesale prices were depressed (~$45-55/MWh)</li>
        <li>The Hunter Valley fuel supply was tightening</li>
      </ul>
      <P>
        Eraring became Origin's largest single asset. At ~$50/MWh wholesale and $25/MWh fuel cost,
        the plant generated ~$650M/year gross margin within five years — making it a 13:1 cash
        payback on the purchase price.
      </P>

      <H2>2020-2023 — Eraring closure and the Brookfield bid</H2>
      <P>
        Origin announced the early closure of Eraring (2025 target) in February 2022 — three years
        ahead of the previous 2032 schedule. The decision reflected the collapsing economics of NSW
        black coal as renewables share rose and wholesale prices fell. The announcement triggered an
        immediate political backlash and prompted negotiations with the NSW Government.
      </P>
      <P>
        Meanwhile, in March 2022, a consortium of <Em>Brookfield Asset Management</Em> (Canadian
        renewables-focused infrastructure investor) and <Em>EIG Partners</Em> (US energy-focused PE)
        made an unsolicited $9/share takeover offer for Origin — valuing the company at ~$18.4B.
        Origin's board rejected the offer. Over the following 18 months the bidders raised their
        offer multiple times, eventually reaching $9.53/share (~$19.5B) with revised
        scheme-of-arrangement terms.
      </P>

      <H2>November 2023 — The AustralianSuper veto</H2>
      <P>
        Brookfield/EIG's revised scheme of arrangement required 75% of votes by share count.
        <Em> AustralianSuper</Em>, holding 17.45% of Origin shares, publicly announced in October
        2023 that it would vote against — arguing the offer materially undervalued APLNG and the
        renewables pipeline. At a 17.45% no vote, the scheme could not reach 75% approval. The
        2 November 2023 scheme meeting confirmed the rejection: ~68% in favour, against the 75%
        threshold.
      </P>
      <P>
        Origin remained independent. Brookfield walked away. Frank Calabria continued as CEO.
        Within six months, Origin and the NSW Government signed an Eraring extension agreement that
        kept the plant running to 2027 (with optionality to 2029) under a profit/loss-share
        underwriting structure.
      </P>

      <H2>The Eraring underwriting deal (August 2024)</H2>
      <P>
        The August 2024 NSW-Origin agreement structured Eraring's continued operation as follows:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Origin agreed to keep Eraring running through August 2027 (and optionally 2029)</li>
        <li>NSW Government provided an opt-in profit/loss-share mechanism: if Eraring's operation
          generated profit above $40M/year, NSW would share in the upside; if losses exceeded a cap,
          NSW would cover them up to $225M</li>
        <li>The opt-in is annual — Origin chooses each year whether to invoke the protection. For
          FY26 and FY27, Origin chose <em>not</em> to opt in (because wholesale prices remained
          high enough to make the mechanism unnecessary)</li>
      </ul>
      <P>
        The Eraring deal is structurally similar to the federal CIS — a contract-for-difference
        revenue floor protecting against downside, with the operator retaining most upside. It
        effectively crystallises Origin's exit path from coal while preserving optionality to extend
        if firmness is needed.
      </P>

      <H2>Origin today and the 2030 pipeline</H2>
      <P>
        Origin's current generation footprint:
      </P>
      <Table
        emphasizeFirst
        headers={['Asset', 'State', 'Type', 'Capacity', 'Status']}
        rows={[
          ['Eraring', 'NSW', 'Black coal', '2,880 MW', 'Operating; close 2027 (opt-in 2029)'],
          ['Mortlake', 'VIC', 'Gas', '550 MW', 'Operating'],
          ['Quarantine', 'SA', 'Gas peaker', '224 MW', 'Operating'],
          ['Darling Downs', 'QLD', 'Gas', '644 MW', 'Operating'],
          ['Shoalhaven Pumped Hydro', 'NSW', 'Hydro', '240 MW', 'Operating'],
          ['Eraring BESS', 'NSW', 'Battery', '700 MW / 2,800 MWh', 'Construction; phase 1 online 2025, phase 2 2026'],
          ['Mortlake BESS', 'VIC', 'Battery', '300 MW / 1,200 MWh', 'Planning'],
          ['Yarwun (offtake)', 'QLD', 'Solar', '~150 MW', 'PPA'],
          ['Stockyard Hill (offtake)', 'VIC', 'Wind', '530 MW', 'Operating via PPA'],
          ['Cherry Tree Wind', 'VIC', 'Wind', '57 MW', 'Operating'],
        ]}
      />
      <P>
        Origin's 2030 strategic focus is narrower than AGL's: Eraring BESS at scale, Mortlake BESS,
        more offtake PPAs to feed retail load, and continued growth of APLNG as the cash engine.
        Origin has not committed to building utility-scale solar or wind itself — preferring to
        contract with developers like Tilt, Goldwind, and Iberdrola via long-term PPAs.
      </P>

      <Callout type="key">
        Origin Energy is structurally different from AGL: it's a <Em>retail-and-LNG company that
        happens to own one big coal plant</Em>, where AGL is a <Em>coal-generation company that
        owns a big retail business</Em>. Origin's coal exit is therefore simpler — once Eraring
        closes, Origin's emissions profile collapses dramatically. AGL's transition is bigger and
        more complex because it has more coal to replace and a less profitable export-LNG hedge.
      </Callout>

      <Callout type="source">
        Sources: Origin Energy annual reports 2010-2025 · Origin Scheme Booklet 2023 ·
        AustralianSuper public statements October 2023 · NSW Government Eraring Agreement 2024 ·
        APLNG joint venture disclosures · AFR <em>The Brookfield Files</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 9 — EnergyAustralia
// ============================================================

function Lesson9() {
  return (
    <div>
      <H2>1935-1996 — Sydney County Council</H2>
      <P>
        EnergyAustralia is the unusual case: its origins are not a private gas company (like AGL) or
        an industrial spin-off (like Origin), but a Sydney local-government electricity utility. The
        <Em> Sydney County Council Electricity Department</Em> was established in 1935 to operate
        Sydney's electricity supply on behalf of 39 metropolitan municipalities. Through 1935-1996
        it grew into one of the largest electricity distributors in the country — serving 1.4M
        accounts across Sydney, the Central Coast and the Hunter region.
      </P>

      <H2>1996-2011 — From county council to corporatisation to privatisation</H2>
      <P>
        Sydney County Council was corporatised by the Greiner-Fahey Liberal NSW government in 1995-96
        as <Em>EnergyAustralia Pty Ltd</Em>, a state-owned corporation. The corporatisation kept
        EnergyAustralia 100% state-owned but separated it from local-government control. Through
        1996-2010 EnergyAustralia operated as NSW's largest electricity retailer and distribution
        network operator — the latter focused on inner Sydney.
      </P>
      <P>
        The 2010 Keneally Gentrader deal split EnergyAustralia in two:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>The <Em>distribution network</Em> portion (poles and wires inner Sydney) stayed
          state-owned and was renamed <Em>Ausgrid</Em> in 2011. Ausgrid was later partially
          privatised by the Baird Liberal government in 2016 — sold as a 99-year lease to a
          consortium including Australian Super, IFM Investors and CKI.</li>
        <li>The <Em>retail</Em> business (~2.4M accounts) was sold to <Em>TRUenergy</Em> for $2.04B
          as part of the same December 2010 transaction that sold Mt Piper and Wallerawang gentrader
          rights to TRUenergy.</li>
      </ul>

      <H2>2011-2012 — The TRUenergy / CLP transition</H2>
      <P>
        TRUenergy was the Australian operating subsidiary of <Em>CLP Group</Em> (originally China
        Light & Power Hong Kong), a Hong Kong-listed Asian utility holding company. CLP had
        acquired TRUenergy in 2005 from TXU Australia. TRUenergy's pre-2011 portfolio included
        Yallourn (VIC brown coal), Iona gas plant (VIC), and a smaller retail business.
      </P>
      <P>
        After acquiring EnergyAustralia retail from NSW in December 2010, CLP rebranded the merged
        entity in 2012 under the <Em>EnergyAustralia</Em> brand — adopting the more recognisable
        name and quietly retiring TRUenergy. The 2012 rebrand merged:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Yallourn 1,480 MW brown coal (acquired by TRUenergy from PowerGen UK in 2005)</li>
        <li>Mt Piper 1,400 MW black coal (gentrader rights from 2010, full ownership 2014)</li>
        <li>EnergyAustralia retail ~2.4M customers</li>
        <li>Several gas peakers (Tallawarra A in NSW, Iona in VIC, Newport contracts)</li>
      </ul>
      <P>
        EnergyAustralia from 2012 onward has been, technically, a Hong Kong-owned company — making it
        the only one of Australia's Big 4 gentailers under foreign ultimate ownership. CLP Holdings
        remains the parent, listed on the Hong Kong Stock Exchange (HKEX: 0002).
      </P>

      <H2>The CLP problem — capital allocation conflict</H2>
      <P>
        CLP's global portfolio includes Hong Kong electricity supply (the original CLP Power Hong
        Kong), Indian renewables, Chinese coal generation, and Taiwanese power. Within that group,
        EnergyAustralia is one of several subsidiaries competing for capital. The result has been a
        consistently smaller renewables build-out than either AGL or Origin: where AGL committed
        ~$20B to its transition pipeline, EnergyAustralia's announced spend is ~$3-4B. This isn't
        because EnergyAustralia is smaller in scale — its NSW + VIC generation portfolio is larger
        than Alinta's — but because CLP can deploy capital in Asian markets at higher return.
      </P>

      <H2>2021 — The Yallourn closure agreement</H2>
      <P>
        Yallourn Power Station is one of Australia's oldest operating coal plants (commissioned in
        stages from 1973, units progressively retired and replaced). Its closure date was originally
        2032, but in March 2021 EnergyAustralia and the Victorian Government announced an
        accelerated closure agreement for <Em>mid-2028</Em>. The terms were never made public — but
        the deal includes confidential payments from the VIC government to EnergyAustralia in
        exchange for closure-date certainty.
      </P>
      <P>
        EnergyAustralia in exchange committed to:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Build the <Em>Wooreen Energy Storage Project</Em> (350 MW / 1,400 MWh BESS) on the
          Yallourn site by 2028 to replace some of the closure-period firmness</li>
        <li>Build or contract <Em>Tallawarra B</Em> (320 MW gas peaker) in NSW — commissioned
          October 2023, hydrogen-capable</li>
        <li>Commit to a renewable energy transition plan with milestone reporting</li>
      </ul>

      <H2>2026 outlook — Mt Piper and the slow transition</H2>
      <P>
        Mt Piper Power Station (1,400 MW, NSW black coal, near Lithgow) remains EnergyAustralia's
        largest operating asset post-Yallourn closure. Its official close date is 2040 — the latest
        of the major NSW coal plants. Whether it actually reaches that date depends on:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>NSW black coal availability (Springvale mine supplies Mt Piper; Centennial Coal has
          flagged reserve depletion concerns)</li>
        <li>Whether the NSW Government extends LTESA-style underwriting to Mt Piper as Bayswater
          approaches closure</li>
        <li>Whether CLP allocates capital to extend the plant's life vs deploying that capital in
          Indian or Hong Kong assets</li>
      </ul>

      <H2>EnergyAustralia today</H2>
      <P>
        Generation portfolio mid-2026:
      </P>
      <Table
        emphasizeFirst
        headers={['Asset', 'State', 'Type', 'Capacity', 'Status']}
        rows={[
          ['Mt Piper', 'NSW', 'Black coal', '1,400 MW', 'Operating; close 2040 (planned)'],
          ['Yallourn', 'VIC', 'Brown coal', '1,480 MW', 'Operating; close mid-2028'],
          ['Tallawarra B', 'NSW', 'Gas peaker', '320 MW', 'Operating (commissioned Oct 2023)'],
          ['Hallett Power Station (lease)', 'SA', 'Gas peaker', '203 MW', 'Operating via lease'],
          ['Cathedral Rocks Wind (offtake)', 'SA', 'Wind', '66 MW', 'Operating via PPA'],
          ['Boco Rock Wind (offtake)', 'NSW', 'Wind', '113 MW', 'Operating via PPA'],
          ['Wooreen BESS', 'VIC', 'Battery', '350 MW / 1,400 MWh', 'Construction; online 2028'],
          ['Hallett BESS', 'SA', 'Battery', '50 MW / 200 MWh', 'Planning'],
          ['Lake Lyell Pumped Hydro', 'NSW', 'Pumped hydro', '335 MW (proposed)', 'Pre-feasibility; delayed'],
        ]}
      />
      <P>
        Retail footprint: ~2.5M accounts across NSW (most), VIC, QLD, SA, ACT. Stronger in NSW than
        VIC despite the major generation asset being VIC-based.
      </P>

      <Callout type="key">
        EnergyAustralia's strategic position is the most uncertain of the Big 4. Its parent (CLP)
        has higher-return Asian investment options. Its NSW asset (Mt Piper) faces fuel-supply
        risk. Its VIC asset (Yallourn) closes in 2028 with limited replacement build. Its retail
        base is stable but vulnerable to disintermediation. Of the four major gentailers, it has
        the smallest committed renewables pipeline and the weakest transition story.
      </Callout>

      <Callout type="source">
        Sources: CLP Holdings annual reports · EnergyAustralia annual reports 2012-2025 ·
        NSW Treasury <em>Privatisation Final Report 2014</em> · Victorian Government Yallourn deal
        2021 · AURES scheme tracker · AFR <em>Inside EnergyAustralia</em> 2024.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 10 — Alinta Energy
// ============================================================

function Lesson10() {
  return (
    <div>
      <H2>2000 — Alinta Gas privatised from SECWA</H2>
      <P>
        Alinta's origins trace to the breakup of the State Electricity Commission of Western
        Australia (SECWA) in 1995-2000. The Court Liberal government separated SECWA into Western
        Power (transmission/distribution), Verve Energy (generation) and AlintaGas (gas
        distribution + retail). AlintaGas was floated on the ASX in 2000 as a privatised gas
        utility — initially focused on the WA gas pipeline network and retail business.
      </P>
      <P>
        The 2000 IPO valued the company at $1.4B. Bob Browning was the foundation CEO.
      </P>

      <H2>2000-2007 — The Browning expansion</H2>
      <P>
        Under Browning, Alinta expanded aggressively from a WA gas utility into a national
        diversified infrastructure group. Acquisitions over 2000-2006 included:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Duke Energy's Australian assets (gas pipelines + storage)</li>
        <li>Multinet Gas (Victorian distribution network)</li>
        <li>United Energy Distribution (Victorian electricity network)</li>
        <li>AGL's NSW gas distribution networks (asset swap, 2006)</li>
        <li>Stake in Eastern Star Gas (CSG exploration)</li>
      </ul>
      <P>
        By 2007 Alinta was Australia's largest diversified energy infrastructure group, with assets
        spanning gas pipelines, electricity networks and CSG development. The growth was funded
        primarily through debt and a stretched balance sheet.
      </P>

      <H2>2007 — Babcock & Brown and the peak</H2>
      <P>
        In August 2007, at the height of the pre-GFC infrastructure boom, a consortium led by
        <Em> Babcock & Brown Infrastructure</Em> (the listed infrastructure arm of Babcock & Brown
        merchant bank) and <Em>Singapore Power</Em> agreed a $7.4B takeover of Alinta. The deal
        valued Alinta at a 27% premium to its pre-bid trading price.
      </P>
      <P>
        Almost immediately after the transaction closed, the global financial crisis arrived. By
        2009 Babcock & Brown Group was in administration. The Alinta assets were progressively
        broken up and sold to repay debt — distributing the gas pipelines to APA Group, the
        Victorian distribution networks to Spark Infrastructure, and the WA generation and retail
        business into a separately-managed entity.
      </P>

      <H2>2011 — TPG buys what's left</H2>
      <P>
        In December 2011, US private equity firm <Em>TPG Capital</Em> acquired the rump Alinta
        Energy business — by then primarily WA retail customers plus the Loy Yang B 1,070 MW brown
        coal plant in Victoria and some smaller WA generation. The price was approximately $2.1B
        (vs the 2007 sale price of $7.4B for the larger pre-breakup entity).
      </P>
      <P>
        TPG ran Alinta for 6 years, focusing on operational efficiency rather than expansion. The
        rebuild work positioned Alinta for a second sale at higher valuation.
      </P>

      <H2>2017 — Chow Tai Fook acquires Alinta</H2>
      <P>
        In April 2017, TPG sold Alinta Energy to <Em>Chow Tai Fook Enterprises</Em> (CTFE), the
        private investment holding company of Hong Kong's Cheng family. CTFE's primary business is
        the listed jewelry chain <em>Chow Tai Fook Jewellery Group</em> (HKEX: 1929), but the
        family's broader portfolio spans property, utilities, ports and infrastructure across Asia.
        The acquisition price was approximately $4B.
      </P>
      <P>
        In the same year (October 2017), Alinta acquired <Em>Loy Yang B</Em> from China Power
        International Development Ltd (a subsidiary of China Energy Investment Corporation) for
        approximately A$1.07B. Loy Yang B (1,070 MW brown coal, adjacent to AGL's Loy Yang A in the
        Latrobe Valley) became Alinta's largest single asset.
      </P>

      <H2>Alinta today — WA strongest, east coast growing</H2>
      <P>
        Generation portfolio mid-2026:
      </P>
      <Table
        emphasizeFirst
        headers={['Asset', 'State', 'Type', 'Capacity', 'Status']}
        rows={[
          ['Loy Yang B', 'VIC', 'Brown coal', '1,070 MW', 'Operating; official close 2047 (likely earlier)'],
          ['Pinjarra Cogen', 'WA', 'Gas cogen', '240 MW', 'Operating (Alcoa industrial offtake)'],
          ['Wagerup Cogen', 'WA', 'Gas cogen', '240 MW', 'Operating (Alcoa industrial offtake)'],
          ['Newman Power Station', 'WA NWIS', 'Gas', '178 MW', 'Operating (Pilbara, BHP supply)'],
          ['Port Hedland Power Station', 'WA NWIS', 'Gas', '212 MW', 'Operating'],
          ['Reeves Plains Power Station', 'SA', 'Gas peaker', '198 MW', 'Operating'],
          ['Glenrowan West Solar', 'VIC', 'Solar', '65 MW', 'Operating'],
          ['Yandin Wind Farm', 'WA SWIS', 'Wind', '214 MW', 'Operating'],
          ['Chichester Solar Farm', 'WA SWIS', 'Solar', '60 MW', 'Operating'],
          ['Reeves Plains BESS', 'SA', 'Battery', '111 MW / 222 MWh', 'Construction; online 2026'],
        ]}
      />
      <P>
        Retail base: approximately 1.1M accounts. Strong in WA (where Alinta is the primary
        challenger to state-owned Synergy on the SWIS) and growing on the east coast (NSW, VIC, QLD,
        SA combined ~700,000 accounts).
      </P>

      <H2>Where Alinta sits in the transition story</H2>
      <P>
        Alinta is the most coal-heavy of the Big 4 by share of total generation (Loy Yang B
        represents ~60% of its operating output). It is also the most under-invested in renewables
        relative to its size — committing roughly $1B to its energy transition pipeline vs AGL's
        $20B and Origin's ~$5B. CTFE's investment thesis appears to be: <Em>run the coal asset
        through to a profitable exit, build modest renewables, and avoid the high-capex
        transformation that AGL is undertaking</Em>.
      </P>
      <P>
        Loy Yang B's official 2047 closure date is widely regarded as a planning placeholder. The
        plant is the youngest of the Latrobe Valley brown-coal generators (commissioned 1996), so
        physical asset life is real. But AEMO's 2026 ISP forecasts Loy Yang B exit by 2035-37 as
        wholesale prices and brown-coal LCOE diverge under high renewable penetration. Alinta's
        actual closure decision will likely come in the early 2030s.
      </P>

      <Callout type="key">
        Alinta is the dark horse of the Big 4. Its WA business is structurally strong — Synergy
        (state-owned) faces capital allocation constraints, leaving Alinta as the primary growth
        gentailer in the SWIS. Its east-coast business is smaller but growing. Its parent (CTFE) is
        opaque about long-term strategy and has shown willingness to hold the asset through a
        slow transition rather than accelerate spend. Whether Alinta becomes a credible challenger
        to AGL/Origin nationally, or remains a regional player, will hinge on Loy Yang B's exit
        timing and CTFE's appetite for east-coast renewable investment.
      </Callout>

      <Callout type="source">
        Sources: Alinta Energy annual reports 2017-2025 · Chow Tai Fook Enterprises corporate
        disclosures (limited) · TPG Capital exit announcement 2017 · ABC <em>Babcock &amp; Brown
        Collapse</em> 2009 · AEMO ISP 2026 · AFR <em>Inside Alinta</em> 2023.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 11 — RET Era (2001-2016)
// ============================================================

function Lesson11() {
  return (
    <div>
      <H2>The MRET — Australia's first renewables instrument</H2>
      <P>
        The Howard Coalition government legislated the <Em>Mandatory Renewable Energy Target
        (MRET)</Em> in 2000-2001 as Australia's response to obligations under the Kyoto Protocol. The
        target was modest by today's standards: 9,500 GWh of additional renewable generation by 2010,
        equivalent to ~2% of national electricity consumption. The MRET would become the dominant
        policy lever shaping renewable investment for the next 15 years — through five different
        federal governments and at least four major design changes.
      </P>

      <H2>How the LGC market works</H2>
      <P>
        The MRET (and from 2010 the expanded LRET — Large-scale Renewable Energy Target) operates
        through a tradable certificate market called the <Em>Large-scale Generation Certificate
        (LGC)</Em>. Every megawatt-hour of eligible renewable energy generated creates one LGC.
        Liable retailers (and large electricity buyers) must surrender LGCs each calendar year equal
        to their proportional share of the national target — or pay a shortfall charge (~$65/MWh in
        2010-15, set well above the expected market price as a stick).
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Eligibility:</Em> wind, solar, biomass, geothermal, large hydro (existing hydro
          excluded for additionality)</li>
        <li><Em>Price formation:</Em> LGCs traded on a small spot market; long-dated LGC contracts
          underpinned project finance</li>
        <li><Em>The bundling logic:</Em> a wind farm sells wholesale energy at pool price <em>plus</em>
          LGCs separately — the LGC revenue is the marginal economics that makes the project bankable</li>
      </ul>

      <H2>2010 — The expanded LRET (41,000 GWh by 2020)</H2>
      <P>
        The Rudd-Gillard Labor government dramatically expanded the target in 2010 — the Large-scale
        Renewable Energy Target (LRET) was set at 41,000 GWh by 2020, broadly equivalent to a 20%
        renewable share of national electricity consumption (using 2000-era demand projections).
        Combined with the Small-scale Renewable Energy Scheme (SRES — the residential rooftop solar
        side), the total renewable energy target was structured to drive ~15 GW of new renewable
        capacity by 2020.
      </P>
      <P>
        The expansion triggered the first major Australian wind boom — projects sanctioned 2010-2014
        included Macarthur Wind Farm (420 MW, AGL/Meridian, then-largest in the southern hemisphere),
        Snowtown Stage 2 (270 MW, TrustPower), Hornsdale Wind Farm (310 MW, Neoen), Mt Mercer (131 MW),
        Mt Emerald (180 MW), Ararat (240 MW) and dozens of smaller projects. By 2014, ~1 GW per year
        of new wind capacity was reaching financial close.
      </P>

      <H2>2014-15 — The Warburton Review and the investment freeze</H2>
      <P>
        The Abbott Coalition government, elected 2013, commissioned the <Em>Warburton Review</Em>
        into the RET in February 2014 — chaired by former Caltex CEO Dick Warburton. The review's
        June 2014 report recommended reducing the LRET from 41,000 GWh to between 20,000 and 30,000
        GWh ("real 20%"), with options to close it to new entrants entirely.
      </P>
      <P>
        The immediate market response was severe: LGC long-dated prices fell from ~$45/MWh to
        ~$25/MWh in three months. New wind farm financial close decisions paused. Industry
        association Clean Energy Council reported $20B+ of pipeline projects on hold. The investment
        freeze lasted ~18 months until political compromise was reached in mid-2015.
      </P>
      <P>
        The June 2015 bipartisan compromise reduced the LRET to 33,000 GWh by 2020 (down from
        41,000) but preserved the scheme structure. Investment resumed almost immediately. LGC spot
        prices spiked from $50/MWh to $90/MWh as retailers scrambled to procure LGCs before the
        2020 deadline — the price peak in 2016-17 made many post-Warburton-freeze projects highly
        profitable.
      </P>

      <H2>2016-2020 — The LRET delivery sprint</H2>
      <P>
        The 33,000 GWh target was effectively achieved by mid-2020 with combined wind and large-scale
        solar capacity reaching ~16 GW. Key projects commissioned in the sprint:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Coopers Gap Wind Farm</Em> (453 MW, AGL, QLD 2019)</li>
        <li><Em>Stockyard Hill Wind Farm</Em> (530 MW, Goldwind, VIC 2020)</li>
        <li><Em>Murra Warra Wind Farm Stage 1+2</Em> (435 MW, Renewable Energy Systems, VIC 2019-21)</li>
        <li><Em>Bungala Solar Farm</Em> (220 MW, Enel Green Power, SA 2018-19)</li>
        <li><Em>Sun Cable + Limondale Solar Farm</Em> (~350 MW combined, NSW 2020)</li>
        <li><Em>Beryl Solar Farm</Em> (87 MW, New Energy Solar, NSW 2019)</li>
      </ul>

      <H2>The LGC market after 2020</H2>
      <P>
        Post-2020, the LRET became a closed scheme — no new target growth, the existing target
        continued to be met by cumulative generation. LGC prices collapsed:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'LGC spot price', 'Comment']}
        rows={[
          ['2010', '~$30/MWh', 'New scheme, modest demand'],
          ['2014', '~$25/MWh', 'Warburton uncertainty'],
          ['2016', '~$80/MWh', 'Pre-deadline scarcity'],
          ['2017', '~$85-90/MWh (peak)', 'Maximum scarcity pricing'],
          ['2019', '~$45/MWh', 'Supply catching up'],
          ['2021', '~$30/MWh', 'Surplus emerging'],
          ['2024', '~$10/MWh', 'Severe oversupply'],
          ['2026', '~$5/MWh', 'Functionally zero'],
        ]}
      />

      <Callout type="key">
        The RET era achieved what it was designed to do — Australia's first ~15 GW of utility-scale
        renewables — but it did so via a market mechanism (LGCs) that was inherently temporary.
        Once the 33,000 GWh target was met, the price signal collapsed and new investment lost its
        primary subsidy. The transition from RET-era support to Carbon Price era and ultimately to
        the CIS framework reflects this evolution.
      </Callout>

      <Callout type="source">
        Sources: Clean Energy Regulator <em>LRET market data</em> · Warburton Review 2014 ·
        AEMO renewables capacity tracking · Clean Energy Council
        <em> Renewables Industry Reports 2010-2024</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 12 — Carbon Price Era (2012-2014)
// ============================================================

function Lesson12() {
  return (
    <div>
      <H2>Two years that re-shaped the NEM</H2>
      <P>
        Australia operated a national carbon price for exactly 25 months: from 1 July 2012 to 17 July
        2014. The Gillard Labor government legislated the Clean Energy Act 2011 — negotiated with the
        Greens, the independents, and the Coalition's strenuous opposition — and the Abbott Coalition
        government repealed it in their first parliamentary year. Yet in those 25 months the carbon
        price re-set generator economics in ways that outlasted the policy by a decade.
      </P>

      <H2>How the carbon price worked</H2>
      <P>
        Under the Clean Energy Act:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Fixed-price period (2012-2015)</Em>: $23/tCO₂-equivalent from July 2012, escalating
          to $24.15 in 2013-14, $25.40 in 2014-15</li>
        <li><Em>Floating-price period (2015 onward)</Em>: linked to the EU Emissions Trading Scheme
          (never reached — repealed first)</li>
        <li><Em>Coverage</Em>: ~370 largest emitters, including all major electricity generators</li>
        <li><Em>Pass-through</Em>: generators passed the cost through to wholesale electricity prices
          via the merit-order effect — high-emissions generators (brown coal) were displaced from
          dispatch as their effective marginal cost rose</li>
      </ul>

      <H2>The merit-order impact — by fuel type</H2>
      <Table
        emphasizeFirst
        headers={['Generator type', 'Emissions intensity (t/MWh)', 'Carbon cost added ($/MWh @ $23)', 'Effect']}
        rows={[
          ['Brown coal (VIC Latrobe Valley)', '~1.20-1.30', '~$28-30/MWh', 'Worst-hit; significant margin compression'],
          ['Black coal (NSW Hunter Valley)', '~0.85-1.00', '~$20-23/MWh', 'Significant margin compression'],
          ['Black coal (QLD)', '~0.75-0.90', '~$17-21/MWh', 'Margin compression'],
          ['CCGT gas', '~0.40-0.45', '~$9-10/MWh', 'Modest cost increase; relatively advantaged'],
          ['OCGT gas peaker', '~0.55-0.65', '~$13-15/MWh', 'Cost increase but rare dispatch'],
          ['Wind / solar / hydro', '0', '$0/MWh', 'Relatively advantaged'],
        ]}
      />

      <H2>What happened to wholesale prices</H2>
      <P>
        Wholesale electricity prices rose by approximately $25-30/MWh on average across the NEM
        during 2012-14, reflecting the partial pass-through of carbon cost into the merit order.
        Some highlights:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>2011-12 (pre-CP):</Em> NEM-wide average ~$30-35/MWh</li>
        <li><Em>2012-13 (CP year 1):</Em> NEM-wide average ~$55-60/MWh</li>
        <li><Em>2013-14 (CP year 2):</Em> NEM-wide average ~$50-60/MWh</li>
        <li><Em>2014-15 (post-repeal):</Em> NEM-wide average ~$35-40/MWh — partial reversion</li>
        <li><Em>Brown coal margins</Em> compressed from ~$15-20/MWh to ~$5/MWh during CP era;
          recovered partially after repeal but never fully</li>
      </ul>

      <H2>The Loy Yang A timing — counter-intuitive but explainable</H2>
      <P>
        AGL's decision in 2012 to acquire the remaining 67.5% of Loy Yang A — closing the
        transaction in December 2012, six months into the carbon price era — looks counter-intuitive
        on its face. Brown coal economics had just been crushed by ~$28/MWh of carbon cost. Yet AGL
        paid ~$448M for the remaining equity and assumed the project debt.
      </P>
      <P>
        AGL's thesis at the time was three-part: (1) the carbon price would likely be repealed
        within 2-3 years if the Coalition won government, (2) Loy Yang A's LCOE was so low that
        even fully-priced carbon left positive operating margin, and (3) the asset would deliver
        decades of cash flow even under continued carbon pricing. AGL's bet paid off — the price
        was repealed within 18 months of acquisition, and Loy Yang A delivered approximately $230-
        450M/year of gross margin for the next decade.
      </P>

      <H2>July 2014 — The repeal</H2>
      <P>
        The Abbott Coalition government had campaigned on "axe the tax" since 2010, won the 2013
        election decisively, and repealed the Clean Energy Act in July 2014. The Direct Action Plan
        / Emissions Reduction Fund was introduced as a replacement — a reverse-auction mechanism
        paying carbon abatement projects a per-tonne price, funded from general revenue. The
        differences in market impact were stark:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Carbon price:</Em> universal coverage, market price signal, structural — touched
          every MWh dispatched</li>
        <li><Em>Direct Action:</Em> opt-in for project-by-project abatement contracts, taxpayer-
          funded, did not change merit-order economics</li>
      </ul>
      <P>
        The ERF/Direct Action mechanism continued under various rebranding (Climate Solutions Fund,
        then Safeguard Mechanism reforms in 2023) but never replaced the structural impact of a
        universal carbon price.
      </P>

      <H2>The long tail of the carbon price era</H2>
      <P>
        The carbon price was active for only 25 months — but its effects on coal generator
        investment economics outlasted the policy by a decade. Three lasting impacts:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Capital expenditure deferred:</Em> brown-coal generators deferred boiler tube
          replacements and major maintenance during 2012-14 expecting closure. Hazelwood's 2017
          closure was partly precipitated by these deferred works — equipment failures piled up.</li>
        <li><Em>Closure planning accelerated:</Em> Engie's decision to close Hazelwood was made
          in 2016 but the analytical work began during the carbon price era. The CP made closure
          look economically inevitable; the repeal didn't fully restore the prior margin.</li>
        <li><Em>Investor mental model shifted:</Em> Australian electricity investors stopped
          modelling coal as a long-life asset class after 2014. Even with the price repealed, the
          permanent-impairment risk had become real.</li>
      </ul>

      <Callout type="key">
        The Carbon Price era illustrates a counterintuitive truth about Australian energy policy —
        even policies that get repealed reshape investment expectations permanently. The 2012-14
        carbon price didn't survive politically, but it crystallised the market's view that
        coal's long-term cost structure was vulnerable to future carbon pricing. Every major coal
        closure announcement since 2014 (Hazelwood, Liddell, Eraring, Yallourn, Bayswater, Loy Yang
        A) traces back to the economics revealed during those 25 months.
      </Callout>

      <Callout type="source">
        Sources: Clean Energy Act 2011 + Repeal Act 2014 · Productivity Commission
        <em> Carbon Price Impacts Review</em> · AEMO QED archives 2012-2015 ·
        Treasury <em>Mid-Year Economic and Fiscal Outlook 2014</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 13 — Coal Closure Decade (2016-2024)
// ============================================================

function Lesson13() {
  return (
    <div>
      <H2>The decade Australia exited 7 GW of coal</H2>
      <P>
        Between mid-2016 and early-2024, Australian coal capacity went from approximately 24 GW
        operating to approximately 17 GW — a reduction of 7 GW (~30% of the fleet) in less than a
        decade. Most of this was unplanned by the system operator, politically chaotic for state
        and federal governments, and unaccompanied by sufficient replacement build. The lesson
        of those eight years is that <Em>coal closures cannot be left to private owners alone</Em> —
        a lesson now embedded in the CIS and state-level underwriting frameworks.
      </P>

      <H2>Northern + Playford — the SA exit (2016)</H2>
      <P>
        Engie's decision to close Northern Power Station (520 MW) and Playford B (240 MW, already
        mothballed) in May 2016 was the first major signal. Both were Leigh Creek brown coal — the
        only operating coal generators in South Australia. Their closure made SA the first
        Australian state without any operating coal generation, and forced SA to rely on the
        Heywood interconnector to VIC plus gas peakers plus the rapidly-growing wind fleet.
      </P>
      <P>
        The 28 September 2016 SA system black blackout — covered in detail in the BESS Story
        module — happened five months after Northern's closure, and the connection was not lost on
        federal policy makers. The Tesla / Hornsdale / "Tesla bet" episode followed within months.
      </P>

      <H2>Hazelwood — the November 2016 shock</H2>
      <P>
        Engie's 3 November 2016 announcement that Hazelwood Power Station (1,600 MW, VIC brown coal)
        would close on 31 March 2017 was the watershed moment. Five months' notice. The fifth-
        biggest coal generator in the NEM. The decision was made by the French parent on capital
        allocation grounds — Engie had been told by its global board to exit coal globally.
      </P>
      <P>
        The market response over the following 12 months:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>VIC wholesale prices</Em> rose from ~$60/MWh (Q1 2017) to ~$110-120/MWh (Q3 2017) —
          near-doubling within 6 months</li>
        <li><Em>NSW prices</Em> rose by ~30% via interconnector flow effects</li>
        <li><Em>SA prices</Em> spiked, hitting summer 2017-18 record highs</li>
        <li><Em>National wholesale average</Em> reached ~$100/MWh — highest since the carbon price era</li>
        <li><Em>AEMO declared a system adequacy warning</Em> for VIC and SA summer 2017-18</li>
      </ul>

      <H2>The Turnbull policy response</H2>
      <P>
        The political response to Hazelwood was rapid and reshaped Australian energy policy:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>March 2017 — Snowy 2.0 announcement</Em> by Malcolm Turnbull at Cooma. A $4-6B
          (later $12B+) pumped hydro project as the federal response to firmness gap</li>
        <li><Em>Finkel Review (June 2017)</Em> — Chief Scientist Alan Finkel's comprehensive
          review of NEM design, recommending a Clean Energy Target (CET) and notice-of-closure rules</li>
        <li><Em>2018 NEG (National Energy Guarantee)</Em> — Turnbull's attempted replacement for
          CET, requiring retailers to maintain both reliability and emissions targets. Killed by
          Coalition party room August 2018, contributing to Turnbull's ouster.</li>
        <li><Em>Three years' closure notice rule</Em> — implemented via NEM Rules amendment 2018,
          requiring generators to give AEMO three years' notice of intended closure</li>
      </ul>

      <H2>Liddell — the policy chess match (2015-2023)</H2>
      <P>
        AGL announced Liddell's closure in 2015 (originally scheduled 2022, later extended to April
        2023). The federal Coalition government pressured AGL relentlessly to keep it open or sell
        it to a buyer willing to extend operations:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>2017</Em> — Turnbull asked AGL to consider extending Liddell to 2027 or selling it</li>
        <li><Em>2018</Em> — Frydenberg (Energy Minister) considered compulsory acquisition under the
          Petroleum and Other Fuels Reporting Act</li>
        <li><Em>2019</Em> — Alinta Energy (then-TPG-owned) made a public bid for Liddell that AGL
          rejected</li>
        <li><Em>2020</Em> — Morrison government considered direct purchase / underwriting; AGL
          declined to sell</li>
        <li><Em>2022</Em> — AGL's demerger collapse and new strategy confirmed Liddell would close
          April 2023 as planned</li>
        <li><Em>April 2023</Em> — Liddell closed on schedule. Replacement: 500 MW BESS being built
          on the same site by 2026-27.</li>
      </ul>

      <H2>The 2021-2024 cascade — managed but compressed</H2>
      <P>
        From 2021 onwards, every major coal closure announcement was wrapped in a government
        coordination mechanism:
      </P>
      <Table
        emphasizeFirst
        headers={['Plant', 'Original closure', 'Negotiated closure', 'Government deal']}
        rows={[
          ['Yallourn (EA)', '2032', 'Mid-2028', 'VIC confidential payments (2021)'],
          ['Eraring (Origin)', '2025', '2027-2029', 'NSW opt-in profit/loss share (2024)'],
          ['Bayswater (AGL)', '2035', '2033', 'Climate Transition Action Plan (2024)'],
          ['Loy Yang A (AGL)', '2045-48', '2035', 'Climate Transition Action Plan (2024)'],
          ['QLD GOC fleet', 'Various', '2028-37', 'Queensland Energy & Jobs Plan ($62B, 2022)'],
        ]}
      />

      <H2>Wholesale price trajectory through the decade</H2>
      <Table
        emphasizeFirst
        headers={['Period', 'NEM avg wholesale $/MWh', 'Defining event']}
        rows={[
          ['2014-15', '~$35-40', 'Post-carbon-price repeal'],
          ['2016', '~$60', 'Pre-Hazelwood'],
          ['2017', '~$100', 'Hazelwood shock'],
          ['2018-19', '~$110-130', 'Tight market, gas price spike'],
          ['2020-21', '~$60-70', 'COVID demand drop, mild winters'],
          ['2022', '~$140-200', 'Russia-Ukraine, gas supply shock, Callide C explosion'],
          ['2023', '~$100', 'Eraring announcement, gas peaker stress'],
          ['2024', '~$80', 'Renewable build catching up, mild weather'],
          ['2026', '~$95-100', 'Tight margins, data centre load growth pressure'],
        ]}
      />

      <Callout type="key">
        The Coal Closure Decade is the period during which Australian governments learned — at
        considerable political and economic cost — that <Em>coal exits cannot be left to private
        capital decisions alone</Em>. The Hazelwood shock (2017), the Eraring near-miss (2024-25),
        and the Callide C explosion (May 2021, blacked out QLD for hours) each generated political
        crises severe enough to embed the modern federal/state coordination model — CIS, LTESA,
        state underwriting deals, three-years-notice rules. The next generation of coal closures
        (Yallourn 2028, Eraring 2027-29, Bayswater 2033, Loy Yang A 2035) will all happen inside
        this framework.
      </Callout>

      <Callout type="source">
        Sources: AEMO QED archives 2016-2024 · Finkel Review 2017 · NSW EnergyCo
        <em> Eraring Agreement 2024</em> · Engie Hazelwood Closure Announcement Nov 2016 ·
        Queensland Energy and Jobs Plan 2022 · AFR <em>Coal Closure Files</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 14 — External Drivers (solar costs, drought, learning curves)
// ============================================================

function Lesson14() {
  return (
    <div>
      <H2>The three external forces</H2>
      <P>
        Policy alone didn't drive Australia's renewable transition. Three external forces —
        falling solar costs, the BESS learning curve, and drought-induced hydro reduction — shifted
        the economic landscape underneath the policy machinery. By 2018, renewables had become the
        cheapest source of new electricity in Australia regardless of subsidy or carbon pricing.
        This lesson covers what drove that.
      </P>

      <H2>Solar PV cost decline — the dominant force</H2>
      <P>
        Module prices have followed an extraordinary 80-90% decline over 15 years, far steeper than
        any other major energy technology:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'Mono-Si module ($/W)', 'Utility-scale PV LCOE ($/MWh)', 'Comment']}
        rows={[
          ['2010', '~$2.00', '~$200-250', 'First Solar dominant; Chinese ramp beginning'],
          ['2012', '~$1.00', '~$140-180', 'Trina, Yingli, Jinko emerging'],
          ['2015', '~$0.60', '~$90-110', 'Anti-dumping tariffs in US, irrelevant globally'],
          ['2018', '~$0.35', '~$55-70', 'Mono PERC commodity'],
          ['2020', '~$0.22', '~$40-55', 'Bifacial widespread'],
          ['2022', '~$0.26 (supply shock)', '~$50-60', 'Polysilicon shortage briefly reversed trend'],
          ['2024', '~$0.12', '~$35-45', 'Resolved supply chains; TOPCon technology'],
          ['2026', '~$0.08-0.10', '~$30-40', 'HJT + TOPCon at scale; commodity floor'],
        ]}
      />
      <P>
        The learning rate (Wright's law) for solar PV has held at approximately 20-22% cost
        reduction per doubling of cumulative installed capacity over five decades. Global cumulative
        installed solar has gone from ~50 GW in 2010 to ~1,800 GW in 2026 (~5.2 doublings) —
        producing the observed ~85% module price decline.
      </P>

      <H2>Why Chinese manufacturing scale drove the decline</H2>
      <P>
        Chinese module manufacturers (Trina, Jinko, Longi, JA Solar, Canadian Solar — all Chinese
        despite the latter's name) achieved economies of scale and supply-chain integration that
        Western manufacturers could not match. Key drivers:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Vertical integration</Em> — polysilicon → ingot → wafer → cell → module all under
          one company, eliminating intermediate margin layers</li>
        <li><Em>State-backed capex</Em> — Chinese provincial governments funded factory expansion
          on subsidised terms</li>
        <li><Em>Cluster effects</Em> — Jiangsu province alone hosts most of the world's solar
          supply chain; logistics costs minimised</li>
        <li><Em>Operational scale</Em> — single Chinese mega-factory now produces 30+ GW/yr,
          vs maximum Western factory at 5 GW/yr</li>
        <li><Em>R&D pace</Em> — TOPCon, HJT, bifacial, perovskite tandem all entered commercial
          production within 18-24 months of lab demonstration</li>
      </ul>

      <H2>The BESS learning curve</H2>
      <P>
        Battery storage has followed an even steeper cost-decline curve than solar:
      </P>
      <Table
        emphasizeFirst
        headers={['Year', 'Cell price ($/kWh)', 'Installed BESS ($/kWh)', 'Comment']}
        rows={[
          ['2015', '~$300/kWh', '~$1,400/kWh', 'Tesla Powerwall launch year'],
          ['2018', '~$180/kWh', '~$700/kWh', 'Hornsdale Power Reserve era'],
          ['2020', '~$130/kWh', '~$450/kWh', 'CATL, BYD dominant'],
          ['2022', '~$140/kWh (supply shock)', '~$500/kWh', 'Lithium spot price spike'],
          ['2024', '~$80/kWh', '~$350/kWh', 'LFP commodity'],
          ['2026', '~$60-70/kWh', '~$280-320/kWh', 'CATL Shenxing, BYD Blade at scale'],
        ]}
      />
      <P>
        BESS learning rate has run at approximately 22-25% per doubling — slightly faster than
        solar. The 2022 supply shock (lithium carbonate spot price spiked from $20,000/t to
        $80,000/t before falling back to $10,000-12,000/t by 2024) was a temporary deviation that
        reset by 2024.
      </P>

      <H2>Drought — the hydro problem</H2>
      <P>
        Australia's drought cycles have meaningfully reduced hydro firmness over the transition
        decade. Key episodes:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>2015-16 Tasmania crisis</Em>: Basslink interconnector cable failure (Dec 2015) +
          dry conditions reduced Tasmanian hydro storage from 39% to 12% by April 2016. Tasmania
          required emergency diesel imports.</li>
        <li><Em>2017-19 Murray-Darling drought</Em>: Snowy Hydro output reduced; Hume and Dartmouth
          storage volumes hit historic lows. Mainland hydro firmness reduced through summer 2018-19
          peak demand period.</li>
        <li><Em>2019-20 Black Summer</Em>: smoke + heat + bushfires reduced solar output by 20-30%
          in NSW/VIC for weeks; coordinated with low hydro storage; multiple AEMO directions to
          maintain reliability</li>
        <li><Em>2022-23 La Niña recovery</Em>: returned hydro storages to &gt;80% capacity; storage
          firmness recovered</li>
      </ul>
      <P>
        The implication: pumped hydro firmness (Tumut 3, Wivenhoe, Shoalhaven, Snowy 2.0 coming
        online) has had to scale to meet the system's replacement-firmness needs, partly because
        existing run-of-river hydro became less dependable.
      </P>

      <H2>Why these external forces matter together</H2>
      <P>
        Three independent cost curves compounded over the transition decade:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Solar PV got 85% cheaper</li>
        <li>BESS got 80% cheaper</li>
        <li>Onshore wind capex got 25% cheaper (slower curve, more mature technology)</li>
      </ul>
      <P>
        The combined effect: a 4-hour firmed solar + storage project that LCOE'd at ~$200/MWh in
        2015 now LCOEs at ~$80-100/MWh. That's the structural breakthrough — not policy. By 2024,
        firmed renewables undercut new-build gas peakers in every NEM region. By 2026, firmed
        renewables undercut even the marginal cost of existing coal during sunlight hours.
      </P>

      <Callout type="key">
        The energy transition is fundamentally a story of <Em>learning curves running through
        Chinese manufacturing scale</Em>. Australian policy (RET, CIS, LTESA, state schemes) has
        deployed the capacity; Chinese supply chain has made the deployment economically viable.
        The next phase of the transition (LDS, hydrogen, advanced storage) is similarly dependent
        on continuing cost decline — and similarly exposed to supply chain risk if those declines
        slow or reverse.
      </Callout>

      <Callout type="source">
        Sources: BloombergNEF <em>Solar PV cost benchmark 2010-2026</em> ·
        IEA <em>Renewables 2024 outlook</em> · CSIRO GenCost annual reports ·
        AEMO QED hydro storage data · Wood Mackenzie <em>Battery storage cost curve</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 15 — Data Centres (the demand wildcard)
// ============================================================

function Lesson15() {
  return (
    <div>
      <H2>The new demand story</H2>
      <P>
        For two decades, Australian electricity demand was projected to grow slowly or flatten. The
        2010s actually saw declining grid demand in some years as rooftop solar offset behind-the-
        meter load. AEMO's ISP forecasts as recently as 2022 modelled total NEM consumption staying
        below 200 TWh until 2030. That story is now under serious challenge from one demand
        source: <Em>data centres</Em>. The connection-application volumes seen by transmission
        network service providers (TNSPs) since 2023 — particularly Transgrid (NSW) and Powerlink
        (QLD) — suggest the next decade of NEM demand may be reshaped by hyperscale infrastructure.
      </P>

      <H2>The global story — what's happening overseas</H2>
      <P>
        Data centre electricity consumption has been one of the fastest-growing global demand
        segments since 2018:
      </P>
      <Table
        emphasizeFirst
        headers={['Country / region', '2020 DC share of electricity', '2025 share', '2030 projection']}
        rows={[
          ['United States', '~2.0%', '~4.0%', '~9-12%'],
          ['Ireland', '~9%', '~21%', '~30% (build paused)'],
          ['Singapore', '~7%', '~7% (build moratorium)', '~10% post-moratorium lift'],
          ['Netherlands', '~3%', '~5%', '~8-10%'],
          ['EU (avg)', '~2%', '~3%', '~6%'],
          ['Australia', '~3%', '~4%', '~8-15% (high uncertainty)'],
          ['Global average', '~1.5%', '~2.5%', '~5%'],
        ]}
      />
      <P>
        The Ireland case is instructive. Data centre load grew so fast that the country's grid
        operator (EirGrid) imposed a de facto moratorium on new connections in the Dublin region
        from 2022. Singapore did similarly 2019-2022. Both moratoriums have since partially eased
        but with strict efficiency and renewable-energy conditions. The pattern: <Em>uncontrolled
        data centre demand growth strains local grids faster than network operators expected</Em>.
      </P>

      <H2>The driver — AI and hyperscale compute</H2>
      <P>
        Three categories of data centre load drive the global growth:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Hyperscale (cloud) — NextDC, Equinix, AirTrunk, DigitalRealty, AWS, Microsoft,
          Google.</Em> Steady-state ~10-15%/yr growth. Per-rack power density rising from ~5 kW
          to ~30 kW.</li>
        <li><Em>AI training infrastructure — large dedicated clusters.</Em> NVIDIA H100/B200/B300
          racks consume 60-130 kW per rack. Training a frontier LLM consumes 25-50 MW for
          months. Roughly doubling capacity per ~14 months globally through 2025-2027.</li>
        <li><Em>AI inference workloads.</Em> Smaller per-rack but distributed; total scaling with
          consumer + enterprise AI adoption</li>
      </ul>
      <P>
        AI workloads are the new variable. Pre-2022, data centre electricity demand grew predictably
        at 10-15%/yr globally. Post-ChatGPT (Nov 2022), industry analysts have repeatedly revised
        forecasts upward. McKinsey, BCG and IEA now all forecast data centre electricity demand to
        rise 100-200% globally by 2030 vs 2024.
      </P>

      <H2>Australia today — the existing footprint</H2>
      <P>
        Australian data centre load in 2025-26:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Existing operating capacity:</Em> ~1,200-1,500 MW across the NEM</li>
        <li><Em>Annual consumption:</Em> ~8-10 TWh (about 4% of total NEM consumption)</li>
        <li><Em>Sydney basin:</Em> ~700-800 MW (dominant cluster)</li>
        <li><Em>Melbourne:</Em> ~300-400 MW</li>
        <li><Em>Brisbane:</Em> ~100-150 MW (growing fastest)</li>
        <li><Em>Perth (SWIS, separate market):</Em> ~80-100 MW</li>
      </ul>
      <P>
        Major operators in Australia: NextDC (ASX-listed, largest pure-play), AirTrunk (acquired by
        Blackstone Sept 2024 for $24B), Equinix (US-listed global), DigitalRealty, Macquarie Data
        Centres, Canberra Data Centres (Federal Government / Infratil), AWS direct operations,
        Microsoft Azure direct operations, Google direct operations.
      </P>

      <H2>The connection application surge — what the TNSPs are seeing</H2>
      <P>
        The data centre demand story is most clearly visible in transmission and distribution
        connection applications. The numbers reported by Australian TNSPs and DNSPs since 2023
        are striking:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Transgrid (NSW transmission).</Em> Connection applications received by Transgrid
          for the Sydney basin exceed available transmission capacity by approximately 3-4x.
          Specific application data shows ~6-8 GW of data centre connection enquiries in 2024-25
          alone, against a Sydney metropolitan load base of ~10 GW.</li>
        <li><Em>Ausgrid (NSW distribution).</Em> Connection applications for data centres up
          approximately 600% from 2023 to 2025. The Northern Sydney transmission corridor (Western
          Sydney + Hunter axis) is reportedly fully subscribed for the rest of the decade.</li>
        <li><Em>Endeavour Energy (NSW Western Sydney distribution).</Em> Several large data centre
          development applications pending in Western Sydney, totaling ~2 GW of nameplate load if
          all proceed.</li>
        <li><Em>Powerlink Queensland (QLD transmission).</Em> Brisbane / Gold Coast applications
          totalling ~3-4 GW received 2023-2025. The Gladstone industrial precinct is being
          actively targeted for AI / hyperscale clusters.</li>
        <li><Em>AusNet (VIC transmission).</Em> Melbourne metropolitan applications totalling ~2-3
          GW. The Geelong corridor is being marketed as a data centre destination.</li>
        <li><Em>SA Power Networks + ElectraNet (SA).</Em> Smaller volume but growing — Adelaide
          northern suburbs / Edinburgh corridor seeing applications</li>
      </ul>

      <Callout type="numbers">
        Aggregate connection application volume across NEM TNSPs/DNSPs as of mid-2026 is
        approximately <Em>15-20 GW of nameplate data centre load</Em>. To put that in context: the
        entire NEM peak demand is approximately 35 GW. If even half of these applications
        materialised, it would represent a ~50% increase in NEM consumption.
      </Callout>

      <H2>The materialisation question — will it actually arrive?</H2>
      <P>
        Connection applications are not commitments. Industry rule-of-thumb conversion rates from
        connection application to actual operating load:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Hyperscale operators (AWS, Microsoft, Google direct):</Em> ~70-80% conversion —
          generally only file applications when site selection is locked</li>
        <li><Em>Co-location operators (NextDC, Equinix, AirTrunk):</Em> ~40-60% conversion —
          speculative site reservation is common</li>
        <li><Em>Development capital / property developers:</Em> ~20-30% conversion — many applications
          are option-value plays without committed tenants</li>
      </ul>
      <P>
        Applying these to the ~15-20 GW pipeline gives a probabilistic range of:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Conservative (30% conversion):</Em> ~5 GW of new firm load by 2030. Roughly
          doubles current data centre demand.</li>
        <li><Em>Central (50% conversion):</Em> ~8 GW of new firm load by 2030. Triples current data
          centre demand. Adds ~50-60 TWh annual consumption (~25-30% of current NEM total).</li>
        <li><Em>Aggressive (70% conversion):</Em> ~12 GW of new firm load by 2030. Adds ~80-90 TWh
          annual consumption (~40% of current NEM total).</li>
      </ul>

      <H2>What this means for coal exit</H2>
      <P>
        Here is the structural question that the data centre demand wildcard introduces:
        <Em> Will the prospect of high, firm, long-dated demand encourage coal extension and slow
        the renewable transition?</Em>
      </P>
      <P>
        The argument that it might:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Coal generators currently making marginal economic returns become solidly profitable at
          $100-130/MWh wholesale prices</li>
        <li>State and federal governments under pressure to maintain reliability will be more
          willing to fund extensions (Eraring 2027 → 2029 → 2031; Yallourn 2028 → 2030)</li>
        <li>Bayswater's 2033 closure date could shift right if NSW load grows faster than ISP
          forecasts</li>
        <li>The renewable build is supply-constrained (transmission, supply chain) regardless of
          demand — additional demand cannot be met purely by renewables in the next 5-7 years</li>
        <li>Returning baseload coal to profitability while wind/solar is built out is a credible
          path for the gentailers, particularly AGL and EnergyAustralia</li>
      </ul>
      <P>
        The argument that it won't:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li>Hyperscale data centre operators (Microsoft, Google, AWS) have <Em>24/7 carbon-free
          energy commitments</Em> tied to their global net-zero plans. They explicitly avoid grids
          where they cannot procure firm renewable energy.</li>
        <li>Corporate PPA demand from these operators is driving firmed-renewable + storage
          investment that wouldn't otherwise happen (e.g. Goldwind/Stockyard Hill + BESS,
          NextDC behind-the-meter solar at the Sun Cable site)</li>
        <li>Australian coal capacity is fundamentally too old to extend at scale — Bayswater is
          1985-86 commissioned, Loy Yang A is 1984-88 — the physical assets are at end-of-life
          regardless of demand</li>
        <li>Data centre operators in Singapore and Ireland have shown willingness to pause or
          redirect investment when local grids cannot meet 24/7 clean energy commitments</li>
      </ul>

      <H2>AEMO's response</H2>
      <P>
        AEMO's 2024 Integrated System Plan (ISP) raised the central case for data centre demand
        from ~10 TWh in 2030 to ~18 TWh, reflecting early evidence of the connection-application
        surge. The 2026 ISP update — being finalised through 2026 — is expected to raise this
        further, possibly to ~30-40 TWh in 2030. AEMO's "high demand" sensitivity scenario already
        models a ~3 GW system adequacy gap by 2028-2030 if coal exits on schedule and data centre
        demand materialises at the upper bound.
      </P>

      <H2>Implications for the gentailers</H2>
      <P>
        For AGL, Origin, EnergyAustralia and Alinta, the data centre demand wildcard creates an
        interesting strategic question. The traditional play is to bid for data centre wholesale
        contracts (24/7 firm electricity supply at $80-110/MWh, ~10-year terms). Such contracts
        underwrite renewable + storage investment far more efficiently than spot-market exposure.
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>AGL</Em> — most aggressive positioning, particularly for Hunter / Sydney basin data
          centres co-located with the AGL transmission asset base</li>
        <li><Em>Origin</Em> — Eraring + Eraring BESS as a Sydney-basin firmness asset; Mortlake +
          Shoalhaven as a Melbourne-basin firmness asset</li>
        <li><Em>EnergyAustralia</Em> — Mt Piper as a NSW central-west firmness asset (potentially
          attractive to operators considering Bathurst / Lithgow data centre locations)</li>
        <li><Em>Alinta</Em> — least exposed to NEM data centre opportunity; WA SWIS data centre
          growth is real but smaller scale</li>
      </ul>

      <Callout type="key">
        The data centre demand wildcard is the largest single unknown in Australia's energy
        transition outlook for the next 5-10 years. If demand grows at the upper bound of the
        connection-application pipeline, the coal exit schedule will slow, coal will return to
        profitability for the gentailers running it, and the renewable build will need to
        accelerate substantially to meet both replacement and growth. If demand grows at the lower
        bound, the existing 2030-35 transition plan is achievable with current commitments. Which
        scenario plays out depends on global hyperscaler capital allocation decisions made
        primarily in San Francisco, Seattle and Redmond — not Sydney or Canberra.
      </Callout>

      <Callout type="source">
        Sources: Transgrid <em>Annual Performance Report 2024</em> · Ausgrid <em>Network Investment
        Plan 2024-29</em> · Powerlink Queensland <em>Network Plan 2024</em> ·
        AEMO ISP 2024 + 2026 · NextDC + AirTrunk + Equinix annual reports ·
        IEA <em>Electricity 2024</em> · BloombergNEF <em>Data Center Electricity Demand 2025</em>.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 16 — Coal exit and the 2030-35 NEM landing
// (renumbered from old Lesson 11; the policy-era + data-centre lessons
//  L11-L15 insert before this, and L17 closes the module)
// ============================================================

function Lesson16() {
  return (
    <div>
      <H2>The coal closure schedule</H2>
      <P>
        Australia's NEM coal fleet peaked at approximately 24 GW in the mid-2010s. As of mid-2026,
        operating coal is approximately 17 GW. By 2030 it will be approximately 11-13 GW. By 2035,
        approximately 4-5 GW. By 2040, approximately 1.4 GW (Mt Piper if it stays). The schedule:
      </P>
      <Table
        emphasizeFirst
        headers={['Plant', 'State', 'Owner', 'Capacity', 'Close date']}
        rows={[
          ['Hazelwood', 'VIC', 'ENGIE (was International Power)', '1,600 MW', 'Mar 2017 (already closed)'],
          ['Northern', 'SA', 'ENGIE (was NRG)', '520 MW', 'May 2016 (already closed)'],
          ['Wallerawang', 'NSW', 'EnergyAustralia', '1,000 MW', '2014 (already closed)'],
          ['Munmorah', 'NSW', 'Delta', '600 MW', '2010 (already closed)'],
          ['Liddell', 'NSW', 'AGL', '2,000 MW', 'April 2023 (already closed)'],
          ['Torrens Island A', 'SA', 'AGL', '480 MW (gas)', '2024 (already closed)'],
          ['Eraring', 'NSW', 'Origin', '2,880 MW', '2027 (opt-in to 2029)'],
          ['Yallourn', 'VIC', 'EnergyAustralia', '1,480 MW', 'Mid-2028'],
          ['Vales Point', 'NSW', 'Delta (Sev.en Global)', '1,320 MW', '2033 (committed)'],
          ['Bayswater', 'NSW', 'AGL', '2,640 MW', '2033'],
          ['Loy Yang A', 'VIC', 'AGL', '2,210 MW', '2035'],
          ['Callide B', 'QLD', 'CS Energy', '700 MW', '2028 (target)'],
          ['Stanwell', 'QLD', 'Stanwell Corp', '1,460 MW', '2035 (target)'],
          ['Callide C', 'QLD', 'CS Energy', '810 MW', '2035 (target)'],
          ['Gladstone', 'QLD', 'NRG Gladstone consortium', '1,680 MW', '2029 (target)'],
          ['Kogan Creek', 'QLD', 'CS Energy', '750 MW', '2030 (target)'],
          ['Tarong', 'QLD', 'Stanwell Corp', '1,400 MW', '2035-37 (target)'],
          ['Tarong North', 'QLD', 'Stanwell Corp', '443 MW', '2037 (target)'],
          ['Mt Piper', 'NSW', 'EnergyAustralia', '1,400 MW', '2040 (planned, uncertain)'],
          ['Loy Yang B', 'VIC', 'Alinta', '1,070 MW', '2047 (planned, likely 2035-37)'],
        ]}
      />

      <H2>Federal and state interventions in the coal exit</H2>
      <P>
        The unmanaged coal exit has been a political nightmare. Hazelwood's surprise March 2017
        closure (announced November 2016 with five months' notice) sent wholesale prices in
        Victoria from ~$60/MWh to ~$110/MWh almost overnight and was a defining political event for
        the 2017-19 energy debate. To prevent repetition, every subsequent major closure has been
        wrapped in some form of government underwriting or coordination mechanism:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Liddell (AGL)</Em> — closure scheduled with 5+ years' notice; replacement via the
          AGL Hunter Energy Hub (Liddell BESS now being built on the site). No direct underwriting
          but the federal Coalition Government threatened compulsory acquisition in 2018 to keep it
          open. AGL closed it on time.</li>
        <li><Em>Yallourn (EnergyAustralia)</Em> — March 2021 confidential VIC Government deal to
          bring closure forward from 2032 to 2028, in exchange for confidential payments. The
          structure has been criticised as opaque but it secured the closure date.</li>
        <li><Em>Eraring (Origin)</Em> — August 2024 NSW Government opt-in profit/loss share
          underwriting. $40M annual profit threshold, $225M loss cap. Origin chose not to opt in
          for FY26 and FY27 because prices stayed high. Origin chose not to opt in for FY26 and FY27
          (price stayed high enough). Closure 2027 or 2029 depending on annual decision.</li>
        <li><Em>Bayswater (AGL)</Em> — committed close date 2033; no specific underwriting yet.
          Likely to attract CIS-style firmness payments in the late 2020s as the closure date
          approaches.</li>
        <li><Em>Queensland fleet</Em> — coordinated via the 2022 Queensland Energy and Jobs Plan
          ($62B state-led transition). State ownership of CS Energy, Stanwell and CleanCo means the
          closure schedule can be coordinated without market underwriting — losses absorbed by
          Queensland Treasury.</li>
        <li><Em>Loy Yang A (AGL)</Em> — 2035 close date in AGL Climate Transition Action Plan. Likely
          to attract a Victorian Government deal similar to Yallourn 2021 in the early 2030s.</li>
      </ul>

      <H2>What's replacing coal</H2>
      <P>
        The 2024 + 2026 AEMO Integrated System Plans (ISPs) lay out what will replace ~20 GW of coal
        by 2035. Approximate magnitudes (Step Change scenario, NEM-wide):
      </P>
      <Table
        emphasizeFirst
        headers={['Technology', '2026 capacity', '2030 capacity', '2035 capacity', 'Growth']}
        rows={[
          ['Operating coal', '~17 GW', '~11-13 GW', '~4-5 GW', '−12 GW'],
          ['Utility-scale solar', '~7 GW', '~18 GW', '~28 GW', '+21 GW'],
          ['Utility wind', '~12 GW', '~22 GW', '~30 GW', '+18 GW'],
          ['Rooftop solar (DPV)', '~24 GW', '~32 GW', '~40 GW', '+16 GW'],
          ['Grid BESS (4-8h)', '~3 GW', '~13 GW', '~25 GW', '+22 GW'],
          ['Long-duration storage (8h+)', '~1 GW', '~5 GW', '~12 GW', '+11 GW'],
          ['Pumped hydro', '~2.5 GW (excl. Snowy 2.0)', '~4.5 GW (with Snowy 2.0)', '~5 GW', '+2.5 GW'],
          ['Gas (peakers + open cycle)', '~10 GW', '~10 GW', '~10 GW', 'flat'],
          ['Behind-the-meter batteries', '~2 GW', '~6 GW', '~12 GW', '+10 GW'],
        ]}
      />
      <P>
        Three things to read from this. First, <Em>the replacement build is bigger than the coal
        being replaced</Em> — roughly 80 GW of new generation and storage versus 12 GW of coal exit.
        This reflects (a) lower capacity factor of renewables vs coal, (b) demand growth (data
        centres, electrification, EVs) absorbing the gap, and (c) the need for storage to firm
        intermittent generation.
      </P>
      <P>
        Second, <Em>storage is the fastest-growing category by far</Em> — grid BESS plus LDS plus
        BTM batteries combined grow from ~6 GW in 2026 to ~49 GW in 2035, an eight-fold increase.
        This is the storage-saturation thesis from the BESS module's Lesson 11.
      </P>
      <P>
        Third, <Em>gas stays flat at ~10 GW</Em> through 2035. The gas peakers don't grow but they
        also don't retire — they're the residual firmness that the storage build-out can't
        economically displace until long-duration storage matures further. The 2035-40 period is
        when gas itself starts retiring in earnest.
      </P>

      <H2>The 2030-2035 NEM in numbers</H2>
      <P>
        A snapshot of the AEMO Step Change scenario at 2030:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Generation mix:</Em> ~70-78% from variable renewables (wind + solar + rooftop), ~8%
          gas, ~10-15% coal (declining), ~3-5% pumped hydro and storage discharge</li>
        <li><Em>Annual demand:</Em> ~215 TWh (vs ~190 TWh in 2024) — modest growth despite
          electrification, because demand response and BTM solar offset most load growth</li>
        <li><Em>Peak demand:</Em> ~37 GW (vs ~35 GW today) — modest growth, but shifting from summer
          evening to summer afternoon as EV charging and AC load patterns shift</li>
        <li><Em>Minimum demand:</Em> approaching 0 GW (or even negative) on shoulder-season weekends
          as rooftop solar overwhelms operational load</li>
      </ul>

      <H2>What this means for the gentailers</H2>
      <P>
        The four gentailers profiled in Lessons 6-10 face the same structural transition with
        different starting positions:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>AGL</Em> — biggest coal exit (4,850 MW), biggest replacement spend ($20B), most
          aggressive timeline. By 2035 will be a primarily renewables + storage gentailer.</li>
        <li><Em>Origin</Em> — single largest coal asset (Eraring 2,880 MW) but earliest exit (2027-
          29). Smallest replacement spend relative to coal exit because LNG revenue continues. By
          2030, primarily LNG + Eraring BESS + retail.</li>
        <li><Em>EnergyAustralia</Em> — moderate coal exit (Yallourn 2028 + Mt Piper 2040), smallest
          replacement spend, most exposed to a slow-transition scenario. CLP parent capital
          allocation is the swing variable.</li>
        <li><Em>Alinta</Em> — last coal exit (Loy Yang B 2047 official, likely earlier), smallest
          replacement spend by share of generation, strong WA stronghold. By 2035, primarily a WA
          gentailer with declining east-coast presence unless investment accelerates.</li>
      </ul>

      <H2>Risk: what could break the schedule</H2>
      <Table
        emphasizeFirst
        headers={['Risk', 'Trigger', 'Likely consequence']}
        rows={[
          ['Forced unscheduled coal closure', 'Boiler failure, mine depletion, owner financial distress', 'Wholesale price spike; emergency LTESA-style underwriting'],
          ['Transmission build delays', 'EnergyConnect, HumeLink, Marinus running 3+ years late', 'REZ generation stranded; coal extension required'],
          ['Replacement build delays', 'CIS contracts not converting to FID, supply chain bottlenecks', 'Reliability gap 2028-32; gas peaker build accelerated'],
          ['Demand shock', 'AI data centre load growing faster than ISP forecasts', 'Tight market 2026-30; coal extension or accelerated peaker build'],
          ['Gentailer balance sheet stress', 'AGL or Origin transition spend overruns', 'Slowed renewable build; reliance on developer-led capacity'],
        ]}
      />

      <Callout type="key">
        The energy transition in the NEM is fundamentally a transition <em>between corporate
        balance sheets</em>: from the integrated gentailer model that owned the coal fleet, to a
        more fragmented model where developers (Tilt, Neoen, ACEN, Iberdrola, Goldwind, Squadron,
        SunCable, Engie Australia, EDF Renewables, EDP Renewables) own most new-build renewables
        while the gentailers retain retail relationships and provide firmness. The Big 4
        gentailers' challenge is to retain enough <em>generation</em> ownership to keep their natural
        retail hedge — a challenge AGL and Origin are tackling head-on, EnergyAustralia is hedging,
        and Alinta is mostly avoiding.
      </Callout>

      <Callout type="source">
        Sources: AEMO Integrated System Plan 2024 + 2026 · AURES coal closure tracker ·
        Clean Energy Regulator NGERS data · NSW Government Eraring Agreement 2024 ·
        Queensland Energy and Jobs Plan 2022 · Victorian Yallourn Agreement 2021 ·
        AGL Climate Transition Action Plan · Origin Energy Investor Day 2025.
      </Callout>
    </div>
  )
}

// ============================================================
// Lesson 17 — Where we go from here (synthesis)
// ============================================================

function Lesson17() {
  return (
    <div>
      <H2>The convergence — four forces meeting at once</H2>
      <P>
        The energy transition in the NEM is not driven by a single force but by four converging
        ones: <Em>structural privatisation</Em> (the 1992-2014 reform whose unfinished consolidation
        produced today's Big 4 gentailers); <Em>policy eras</Em> (RET, Carbon Price, CIS) that
        each underwrote a different generation of investment; <Em>external drivers</Em> (solar PV
        and BESS learning curves, drought-induced hydro reduction); and now <Em>data centre demand
        growth</Em> as a potential demand wildcard. Where these forces meet over the next decade
        determines what the NEM looks like in 2035.
      </P>

      <H2>Four plausible 2035 scenarios</H2>
      <P>
        Four working scenarios for the NEM at 2035, ordered roughly from "policy mainstream" to
        "outlier":
      </P>
      <Table
        emphasizeFirst
        headers={['Scenario', 'Renewable share', 'Coal at 2035', 'Defining trigger']}
        rows={[
          ['Step Change (AEMO base)', '~75-80%', '~4-5 GW (Mt Piper + Loy Yang B)', 'Current CIS pipeline converts on schedule'],
          ['Hydrogen Superpower', '~80-85%', '~3-4 GW', 'Green H2 industry adds 10-15 TWh load + co-located renewables'],
          ['Data Centre Dominant', '~65-70%', '~8-12 GW (Bayswater extended)', 'Connection applications materialise at upper bound; coal extends'],
          ['Slow Build', '~55-65%', '~10-14 GW (multiple extensions)', 'Transmission bottlenecks + supply chain delays slow renewable build'],
        ]}
      />
      <P>
        AEMO's base case (Step Change) is the central planning assumption but it implicitly bets
        that data centre demand stays near the lower bound of the connection-application pipeline.
        The "Data Centre Dominant" scenario is increasingly plausible and would meaningfully
        reshape the trajectory of coal exit and gentailer profitability.
      </P>

      <H2>What each scenario means for the Big 4 gentailers</H2>
      <Table
        emphasizeFirst
        headers={['Gentailer', 'Step Change outcome', 'Data Centre Dominant outcome']}
        rows={[
          ['AGL', 'Coal exit on schedule; ~$20B renewables build delivers 12 GW; transformed into renewable+storage gentailer by 2035', 'Bayswater extended to 2038; coal profits fund renewable build faster; net debt lower'],
          ['Origin', 'Eraring closes 2027-29; Eraring BESS + Mortlake BESS firm renewable PPAs; APLNG continues as cash engine', 'Eraring extended to 2031; coal profits boost FY29-31 returns; renewable build pace unchanged'],
          ['EnergyAustralia', 'Yallourn closes 2028 on schedule; Mt Piper exits ~2040; smaller renewable build vs AGL/Origin', 'Mt Piper attractive to data centres; CLP allocates more capital; renewable build accelerates'],
          ['Alinta', 'Loy Yang B exits ~2035-37; minimal east-coast renewable build; WA-focused', 'Loy Yang B extended to 2042; coal profits enable second-tier east-coast renewable push'],
        ]}
      />

      <H2>Risk drivers for the next decade</H2>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Federal policy continuity.</Em> The CIS is a Labor government program. A future
          Coalition government could reduce its scale or alter the contract structure — though
          unwinding existing contracts is legally difficult and politically costly. Risk is in
          rounds T7+ rather than committed projects.</li>
        <li><Em>Transmission build pace.</Em> Project EnergyConnect (NSW-SA), HumeLink (NSW),
          VNI West (NSW-VIC), Marinus Link (TAS-VIC), Copperstring (QLD) are all running behind
          original schedule. Delays of 12-24 months are now baseline assumption. Each year of
          delay strands hundreds of MW of REZ generation and indirectly extends coal.</li>
        <li><Em>Supply chain disruption.</Em> Chinese module export controls, US tariff measures,
          or BESS cell supply constraints could slow Australia's renewable build by 6-18 months
          per cycle. The 2022 polysilicon spike was the trial run.</li>
        <li><Em>Demand surprises.</Em> Data centres on the upside; EV adoption faster than
          forecast; electrification of industrial heat. AEMO's demand forecasts have been wrong
          in both directions every year since 2018.</li>
        <li><Em>Gentailer balance sheet stress.</Em> AGL's $20B Climate Transition Action Plan
          assumes continued coal cash flow plus debt capacity. A weak 2027-29 wholesale price
          environment plus a forced Bayswater early closure could compress that pipeline by 30-50%.</li>
      </ul>

      <H2>What this means for the developer pipeline</H2>
      <P>
        The 2026-2035 developer landscape will be shaped by three factors:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>CIS becomes the marginal price-setter.</Em> Most utility-scale renewable projects
          will be CIS-contracted by 2030. Merchant exposure becomes a minority of the developer
          pipeline (covered in detail in the CIS &amp; LTESA Bidding module).</li>
        <li><Em>Standalone storage is the most resilient asset class.</Em> 4-hour and 8-hour
          batteries at strong-grid nodes have multiple revenue stacks (arbitrage, FCAS, CISA,
          capacity contracts). Standalone BESS at urban nodes is the highest-IRR asset class.</li>
        <li><Em>Hybrid projects gain premium.</Em> Solar + BESS hybrids covered in the BESS Story
          module Lessons 8-10 reflect a CIS structural preference. Wind + BESS hybrids are next.</li>
        <li><Em>Long-duration storage emerging.</Em> LTESA Round 6 (2025) awarded 1.17 GW of 8.7-
          11.5 hour batteries. LDS will be 10-15 GW of the 2030-2035 build.</li>
      </ul>

      <H2>The closing question — halfway there</H2>
      <P>
        Australia has crossed the 47% renewable share milestone in 2026. The transition is roughly
        half-complete. The second half — moving from ~50% renewable to 80%+ — is structurally
        harder because:
      </P>
      <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1.5 mb-3 ml-2">
        <li><Em>Easy renewables are largely deployed.</Em> The best wind sites and solar sites in
          each REZ are committed or built. The next 50% is in lower-resource sites with worse MLFs
          and higher transmission cost.</li>
        <li><Em>Storage requirements escalate non-linearly.</Em> Adding renewable generation to a
          system that's already 50% renewable requires proportionally more storage per MWh of
          renewable than adding the first 50% did. Long-duration storage is the binding
          constraint.</li>
        <li><Em>Coal exit creates firmness gaps.</Em> The remaining ~17 GW of coal does the heavy
          lifting on system inertia, voltage support, fault current. Replacing those system
          services with synchronous condensers, grid-forming BESS, and pumped hydro is technically
          solvable but takes time and capital.</li>
        <li><Em>Demand growth from data centres + electrification</Em> means renewables must be
          built faster than coal exits — not just replace MWh for MWh.</li>
      </ul>
      <P>
        Whether Australia gets to 80%+ renewables by 2035, 2040 or 2045 depends on continuing cost
        decline (especially long-duration storage), transmission build-out at pace, demand growth
        management (especially data centres), federal/state policy continuity, and gentailer
        balance sheet capacity to fund the build. The first 47% took 25 years. The next 33%
        probably takes 10-15 years if everything goes well, longer if the data centre wildcard,
        political reversal or supply chain shock intervenes.
      </P>

      <Callout type="key">
        The Energy Transition in the NEM module ends here, but the underlying story is unfinished.
        The CIS and state-level underwriting frameworks now in place are the most ambitious
        national energy investment commitment in Australian history — committing roughly $200-
        300B of public-and-private capital between 2024 and 2035. Whether that scale is enough
        depends in part on the data centre demand wildcard, in part on global supply chains, and
        in part on whether the post-1990s gentailer model — AGL, Origin, EnergyAustralia,
        Alinta — can simultaneously decarbonise their fleets while serving customers profitably.
        These are the open questions the AURES platform is built to track.
      </Callout>

      <Callout type="source">
        Sources: AEMO Integrated System Plan 2024 + 2026 (forthcoming) · DCCEEW
        <em> Australian Energy Statistics 2025</em> · AURES intelligence dashboards ·
        AGL Climate Transition Action Plan 2024 · Origin Energy Investor Day 2025 ·
        Grattan Institute <em>Energy Transition Risks 2025</em> ·
        Clean Energy Council <em>Outlook to 2035</em>.
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
          <span className="text-3xl" aria-hidden>🔄</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
            ✅ Available
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight"
          style={{ borderLeft: '4px solid #0ea5e9', paddingLeft: 12, marginLeft: -12 }}>
          The Energy Transition in the NEM
        </h1>
        <p className="text-base italic text-[var(--color-text-muted)]">
          Privatisation, the rise of the gentailer, and the decarbonisation arc.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          The modern NEM is the product of a structural reform that started in 1991 and a series
          of state-by-state privatisations that ran from 1992 to 2014 — and the four corporate
          empires (AGL, Origin, EnergyAustralia, Alinta) that grew up inside it. This 11-lesson
          module walks through the pre-NEM era, each state's privatisation path, the rise of the
          gentailer business model, and deep-dive profiles of the four organisations that dominate
          generation and retail today. The closing lesson maps the 2030-2035 coal exit and what
          replaces it.
        </p>
      </div>

      <div className="space-y-3">
        {LESSONS.map(l => {
          const done = progress.has(l.id)
          return (
            <Link key={l.id} to={`/learn/energy-transition/${l.id}`}
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
            <Link to="/intelligence/scheme-tracker" className="text-[var(--color-primary)] hover:underline">
              Scheme Tracker →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— CIS/LTESA awards including the gentailer wins</span>
          </li>
          <li>
            <Link to="/intelligence/asset-lifecycle" className="text-[var(--color-primary)] hover:underline">
              Asset Lifecycle →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— coal closure schedule by plant</span>
          </li>
          <li>
            <Link to="/learn/bess-story" className="text-[var(--color-primary)] hover:underline">
              Solar + BESS Story module →
            </Link>
            <span className="text-[var(--color-text-muted)] ml-2">— how renewables + storage fill the gap</span>
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
        <Link to="/learn/energy-transition" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← The Energy Transition in the NEM
        </Link>
        <span className="text-[var(--color-text-muted)]">Lesson {lesson.number} of {LESSONS.length} · {lesson.readingTime}</span>
      </div>

      <div className="space-y-1 pb-4 border-b border-[var(--color-border)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Lesson {lesson.number}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight">{lesson.title}</h1>
        <p className="text-base italic text-[var(--color-text-muted)]">{lesson.subtitle}</p>
      </div>

      <article className="text-[15px] text-[var(--color-text-muted)]">
        {lesson.id === 'pre-nem'          && <Lesson1 />}
        {lesson.id === 'vic-selloff'      && <Lesson2 />}
        {lesson.id === 'nsw-sa-priv'      && <Lesson3 />}
        {lesson.id === 'qld-wa'           && <Lesson4 />}
        {lesson.id === 'gentailer'        && <Lesson5 />}
        {lesson.id === 'agl-history'      && <Lesson6 />}
        {lesson.id === 'agl-today'        && <Lesson7 />}
        {lesson.id === 'origin'           && <Lesson8 />}
        {lesson.id === 'energy-australia' && <Lesson9 />}
        {lesson.id === 'alinta'           && <Lesson10 />}
        {lesson.id === 'ret-era'          && <Lesson11 />}
        {lesson.id === 'carbon-price'     && <Lesson12 />}
        {lesson.id === 'closure-decade'   && <Lesson13 />}
        {lesson.id === 'external-drivers' && <Lesson14 />}
        {lesson.id === 'data-centres'     && <Lesson15 />}
        {lesson.id === 'coal-exit'        && <Lesson16 />}
        {lesson.id === 'where-going'      && <Lesson17 />}
      </article>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--color-border)]">
        {prev ? (
          <button onClick={() => navigate(`/learn/energy-transition/${prev.id}`)}
            className="text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors">
            ← {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => { onComplete(lesson.id); navigate(`/learn/energy-transition/${next.id}`) }}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-colors">
            {progress.has(lesson.id) ? 'Continue' : 'Mark read & continue'} → {next.title}
          </button>
        ) : (
          <button onClick={() => { onComplete(lesson.id); navigate('/learn/energy-transition') }}
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

export default function EnergyTransitionModule() {
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
        <Link to="/learn/energy-transition" className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block">
          ← Back to module index
        </Link>
      </div>
    )
  }

  return <LessonView lesson={lesson} progress={progress} onComplete={onComplete} />
}
