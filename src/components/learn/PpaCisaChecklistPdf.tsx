/**
 * PPA × CISA Interactions Reference Guide — PDF template
 *
 * Renders the full 14-point checklist with worked numerical examples
 * for offline reference. Designed to be captured by exportElementToPdf
 * (off-screen DOM capture → html2canvas → multi-page PDF).
 *
 * Styling is explicit hex / Tailwind utilities — the PDF capture forces
 * light-mode CSS variable overrides anyway, but the explicit colours
 * here remove any dependence on theme variables for the PDF render.
 *
 * Mirrors the in-module checklist (CIS/LTESA Module Lesson 8 — display)
 * but expands every item to include a worked example.
 */

const COLOR = {
  text: '#0f172a',
  textMuted: '#475569',
  border: '#cbd5e1',
  cardBg: '#f8fafc',
  elevatedBg: '#e2e8f0',
  primary: '#0369a1',
  warn: '#d97706',
  key: '#0369a1',
  numbers: '#0f766e',
  source: '#64748b',
  hl: '#fef3c7',
}

function PdfH1({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontSize: 28, fontWeight: 700, color: COLOR.text, marginBottom: 6 }}>
      {children}
    </h1>
  )
}

function PdfH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 17, fontWeight: 700, color: COLOR.text,
      marginTop: 24, marginBottom: 8, borderBottom: `1px solid ${COLOR.border}`, paddingBottom: 4,
    }}>{children}</h2>
  )
}

function PdfH3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 13, fontWeight: 700, color: COLOR.text, marginTop: 14, marginBottom: 5 }}>
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, lineHeight: 1.55, color: COLOR.text, marginBottom: 8 }}>{children}</p>
}

function Em({ children }: { children: React.ReactNode }) {
  return <span style={{ fontWeight: 600, color: COLOR.text }}>{children}</span>
}

function Code({ children }: { children: React.ReactNode }) {
  return <code style={{
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 10.5, background: COLOR.elevatedBg, padding: '1px 4px', borderRadius: 3,
  }}>{children}</code>
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ marginLeft: 18, marginTop: 4, marginBottom: 8 }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: 11, lineHeight: 1.55, color: COLOR.text, marginBottom: 3 }}>
          {it}
        </li>
      ))}
    </ul>
  )
}

function Box({
  variant, title, children,
}: {
  variant: 'worked' | 'key' | 'warn' | 'source'
  title?: string
  children: React.ReactNode
}) {
  const palette = {
    worked: { bg: '#ecfeff', border: '#0e7490', accent: '#0e7490' },
    key:    { bg: '#eff6ff', border: '#0369a1', accent: '#0369a1' },
    warn:   { bg: '#fffbeb', border: '#d97706', accent: '#92400e' },
    source: { bg: '#f8fafc', border: '#94a3b8', accent: '#475569' },
  }[variant]
  return (
    <div style={{
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderLeftWidth: 4, borderRadius: 6, padding: 10, margin: '8px 0',
    }}>
      {title && (
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
          color: palette.accent, marginBottom: 5 }}>
          {title}
        </p>
      )}
      <div style={{ fontSize: 11, lineHeight: 1.55, color: COLOR.text }}>{children}</div>
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, margin: '8px 0' }}>
      <thead>
        <tr style={{ background: COLOR.elevatedBg }}>
          {headers.map((h, i) => (
            <th key={i} style={{
              border: `1px solid ${COLOR.border}`, padding: '4px 6px',
              textAlign: 'left', color: COLOR.text, fontWeight: 700,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{
                border: `1px solid ${COLOR.border}`, padding: '4px 6px',
                color: j === 0 ? COLOR.text : COLOR.textMuted,
                fontWeight: j === 0 ? 600 : 400,
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================================
// The PDF — the structural facts + 14 items
// ============================================================

export function PpaCisaChecklistPdf() {
  const today = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div style={{
      background: '#ffffff', color: COLOR.text,
      padding: '32px 40px', width: 900,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    }}>
      {/* Cover / intro */}
      <PdfH1>PPA × CISA Interactions Reference Guide</PdfH1>
      <p style={{ fontSize: 13, color: COLOR.textMuted, marginBottom: 16 }}>
        14-point checklist with worked examples · AURES Intelligence · {today}
      </p>
      <P>
        This guide expands the 14 critical interactions between a corporate or
        gentailer PPA and a Capacity Investment Scheme Agreement (CISA). Each
        item below includes a numerical worked example you can adapt to your own
        project. The guide assumes the standard 2026 CISA template structure.
      </P>

      {/* The three structural facts */}
      <Box variant="key" title="Before you read further — the three structural facts">
        <p style={{ margin: 0 }}>
          The CISA template fixes three rules. They are <Em>not bid parameters</Em>:
        </p>
        <ul style={{ marginLeft: 18, marginTop: 6, marginBottom: 2 }}>
          <li style={{ marginBottom: 3 }}>
            <Em>90% floor coverage</Em> — Commonwealth tops up 90% of the gap between the floor
            strike and the CISA reference price. The project absorbs the remaining 10%.
          </li>
          <li style={{ marginBottom: 3 }}>
            <Em>50% ceiling sharing</Em> — Commonwealth claws back 50% of revenue above the
            ceiling. The project keeps the other 50%.
          </li>
          <li style={{ marginBottom: 3 }}>
            <Em>Negative deemed zero</Em> — the CISA reference price is{' '}
            <Code>max(0, RRP)</Code>. Negative spot pays nothing extra; the project bears the
            full merchant loss (or curtails).
          </li>
        </ul>
        <p style={{ marginTop: 8, marginBottom: 0 }}>
          Only <Em>floor strike</Em>, <Em>ceiling strike</Em>, and <Em>annual cap</Em> are bid.
        </p>
      </Box>

      {/* Sample project used throughout */}
      <Box variant="source" title="Sample project used throughout">
        Where a worked example does not specify otherwise, assume: <Em>200 MW solar in NSW</Em>,
        30% capacity factor (525,600 MWh/yr), connected via a 200 MW connection at the regional
        boundary, MLF 0.95, CISA floor $55/MWh, ceiling $130/MWh, annual cap $25M, term 15 yrs.
        Where a PPA is added: <Em>50% volume coverage at $70/MWh strike, 12-yr term</Em>.
      </Box>

      {/* ============== Item 1 ============== */}
      <PdfH2>1. Volume / offtake amount alignment</PdfH2>
      <P>
        The PPA covers a percentage of generation; the CISA covers all of it. The choice of
        PPA coverage % shifts where the CISA actually bites.
      </P>
      <Box variant="worked" title="Worked example — three PPA depths">
        <P>Same project. Spot RRP averages $40/MWh.</P>
        <Table
          headers={['PPA depth', 'PPA revenue', 'Merchant revenue', 'Blended $/MWh', 'CISA make-up', 'Total $/MWh']}
          rows={[
            ['30% @ $70',  '$11.0M', '$14.7M', '$48.96', '$2.86', '$51.82'],
            ['50% @ $70',  '$18.4M', '$10.5M', '$55.00', '$0.00', '$55.00'],
            ['90% @ $70',  '$33.1M', '$2.1M',  '$67.00', '$0.00', '$67.00'],
          ]}
        />
        <P>
          With low PPA coverage the project's blended $/MWh dips below the floor and the CISA fires.
          With high PPA coverage the floor is irrelevant — the blended price sits well above it.
          The ceiling becomes the binding constraint only at extreme PPA strikes or in scarcity periods.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'How is "generation" defined for CISA volume — net of station service, gross, AEMO-revenue MWh?',
        'Does PPA volume coverage apply pre-curtailment or post-curtailment?',
        'Does the PPA reset coverage % if the project upsizes or de-rates over time?',
      ]} />

      {/* ============== Item 2 ============== */}
      <PdfH2>2. Tenor mismatch — what happens at PPA or CISA expiry</PdfH2>
      <P>
        PPAs typically run 10–15 years; CISAs are 12–15 years (LTESA up to 20). When one
        expires before the other, the revenue stack reshapes substantially.
      </P>
      <Box variant="worked" title="Worked example — 12-yr PPA + 15-yr CISA, post-PPA tail">
        <P>
          Years 1–12: 50% PPA at $70 + 50% merchant at $50 RRP. Blended $/MWh = $60. Above floor,
          below ceiling — CISA inactive. Annual revenue ≈ $31.5M.
        </P>
        <P>
          Years 13–15: PPA expired. 100% merchant at $40 RRP (cannibalised by then). CISA make-up:
          0.90 × ($55 − $40) × 525,600 = $7.1M. Annual revenue: $21.0M + $7.1M = $28.1M. <Em>Floor
          is now the binding revenue line</Em> — the project lives on the CISA's 90% protection for
          the last 3 years.
        </P>
        <P>
          Years 16+: both contracts expired. Pure merchant. Bankability of this tail is what
          determines whether the project carries any debt into it.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Does the CISA tenor count from CISA execution, or from project COD?',
        'Is there a re-opener at year-N to re-bid the CISA strike or extend term?',
        'How does the merchant tail map onto the debt amortisation profile?',
      ]} />

      {/* ============== Item 3 ============== */}
      <PdfH2>3. Negative prices — CISA pays nothing extra in the loss zone</PdfH2>
      <P>
        When RRP &lt; 0, the CISA reference is deemed $0 for the make-up calculation. The make-up
        is at most <Code>0.90 × Floor × MWh</Code>, regardless of how deep negative spot goes. The
        project bears the merchant loss in full unless it curtails.
      </P>
      <Box variant="worked" title="Worked example — when to curtail">
        <P>
          Floor $55. RRP averages −$30/MWh in a heavy-cannibalisation period.
        </P>
        <Table
          headers={['Scenario', 'Merchant $/MWh', 'CISA make-up $/MWh', 'Net $/MWh']}
          rows={[
            ['Dispatch through negative',  '−$30.00', '$49.50',  '$19.50'],
            ['Curtail',                    '$0.00',   '$0.00',   '$0.00'],
            ['Spot at −$60',               '−$60.00', '$49.50',  '−$10.50 (curtail!)'],
          ]}
        />
        <P>
          The dispatch-vs-curtail crossover happens when <Code>|spot| &gt; 0.90 × Floor</Code>. For
          a $55 floor, that's when spot falls below <Em>−$49.50/MWh</Em>. Above that depth (i.e.
          mild negative), keep dispatching and collect the CISA top-up. Below it, curtail.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Does the PPA buyer pay strike during negative-priced hours, or is there a carve-out?',
        'Is the project free to curtail merchant volume without buyer notification?',
        'Annual exposure: NEM negative-price hours rose from ~2% (2019) to 12–18% in solar-heavy regions (mid-2025).',
      ]} />

      {/* ============== Item 4 ============== */}
      <PdfH2>4. CISA annual cap — when government's wallet has a floor of its own</PdfH2>
      <P>
        The annual cap is the dollar ceiling on Commonwealth payments in any one financial year.
        It binds in sustained low-positive-price periods with high generation — not in negative-
        price periods (since CISA pays nothing extra there anyway).
      </P>
      <Box variant="worked" title="Worked example — when the cap binds">
        <P>Floor $55, annual cap $25M.</P>
        <Table
          headers={['Year scenario', 'Gen MWh', 'RRP avg', 'Uncapped make-up', 'Cap binds?', 'Effective floor']}
          rows={[
            ['Normal',           '525,600', '$40', '$7.1M',  'No', '$54.50'],
            ['Bumper resource',  '700,800', '$20', '$22.1M', 'No', '$53.97'],
            ['Stress',           '700,800', '$10', '$28.4M', 'Yes — $3.4M shortfall', '$50.15'],
            ['Severe stress',    '700,800', '$5',  '$31.5M', 'Yes — $6.5M shortfall', '$45.71'],
          ]}
        />
        <P>
          The cap acts as a <Em>second deductible</Em> on top of the 10% floor deductible. Bidders
          propose the cap; higher cap = stronger protection but worse MC2 scoring (larger
          contingent Commonwealth liability).
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Is the cap a calendar-year or financial-year construct?',
        'Does unused cap roll forward, or is it lost?',
        'Is the cap denominated in nominal or real dollars (CPI-linked)?',
      ]} />

      {/* ============== Item 5 ============== */}
      <PdfH2>5. Aggregation period — daily, monthly, annual</PdfH2>
      <P>
        How the CISA settlement period averages prices materially affects cash flow timing — and
        in some cases the total settled amount.
      </P>
      <Box variant="worked" title="Worked example — annual vs monthly aggregation">
        <P>
          Project has split-year prices: 6 months at $30/MWh (well below $55 floor), 6 months at
          $120/MWh (between floor and ceiling). Volume split 50/50 across both halves.
        </P>
        <Table
          headers={['Aggregation', 'Calc', 'CISA make-up']}
          rows={[
            ['Annual', '$75 simple avg; no period below floor', '$0'],
            ['Monthly', '6 months × 0.90 × ($55 − $30) × 262,800/6 MWh', '$5.91M'],
            ['Per-interval (granular)', 'Same volumetric outcome, smoother cash flow', '~$5.91M'],
          ]}
        />
        <P>
          Monthly aggregation pays more in this volatile year because it doesn't let high-price
          months offset low-price months. Annual aggregation is smoother but defers cash. For most
          modern CIS contracts the practical pattern is <Em>annual settlement, monthly progress
          reporting</Em>, which combines the cash-smoothness of annual with the granularity needed
          for cap-monitoring.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Settlement frequency — annual, monthly, or interval-by-interval?',
        'How is the annual cap allocated across months if aggregation is monthly?',
        'Lag between settlement period close and payment (typical: 30–60 days).',
      ]} />

      {/* ============== Item 6 ============== */}
      <PdfH2>6. The "reference price" choice</PdfH2>
      <P>
        Standard CISAs reference regional RRP. The project's actual realised price (capture price)
        is typically lower than RRP due to MLF and intra-regional constraints. The make-up calculation
        uses RRP, not the project's capture price.
      </P>
      <Box variant="worked" title="Worked example — RRP-referenced vs capture-referenced CISA">
        <P>
          Same 200 MW solar. RRP averages $50/MWh. Project capture price $42/MWh (MLF 0.95 + 3%
          intra-regional discount). Floor $55.
        </P>
        <Table
          headers={['Reference', 'RRP used?', 'Make-up calc', 'Make-up $/MWh', 'Net to project']}
          rows={[
            ['Standard (RRP)',  'Yes', '0.90 × ($55 − $50)', '$4.50', '$42 + $4.50 = $46.50'],
            ['Capture-price (rare)', 'No', '0.90 × ($55 − $42)', '$11.70', '$42 + $11.70 = $53.70'],
          ]}
        />
        <P>
          The standard CISA leaves the project ~$7.20/MWh short of where a capture-referenced CISA
          would land them. AEMO Services has not adopted capture-price referencing — partly to
          avoid rewarding poor siting decisions.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Reference price source — AEMO RRP, sub-regional reference, or other?',
        'Treatment of intra-regional constraints (causer-pays-style adjustments)?',
        'Are there time-weighting adjustments for storage-style contracts?',
      ]} />

      {/* ============== Item 7 ============== */}
      <PdfH2>7. MLF treatment — the project keeps the MLF risk</PdfH2>
      <Box variant="warn" title="Correction (v2.88.0)">
        Earlier versions of this guide stated that CISAs "settle gross of MLF". That was wrong.
        The standard CISA references regional RRP, not the project's capture price. MLF erosion
        stays with the project.
      </Box>
      <P>
        The project's actual market revenue is <Code>RRP × MLF × volume</Code>. The CISA make-up
        is <Code>0.90 × (Floor − RRP) × volume</Code>. The make-up closes the RRP-to-floor gap,
        not the project-capture-to-RRP gap.
      </P>
      <Box variant="worked" title="Worked example — MLF erosion over 10 years">
        <P>200 MW solar, 30% CF. Floor $55, RRP averages $40 throughout. MLF degrades 1.00 → 0.85.</P>
        <Table
          headers={['Year', 'MLF', 'Market revenue', 'CISA make-up', 'Total', 'Effective $/MWh']}
          rows={[
            ['Year 1',  '1.00', '$21.0M', '$7.1M', '$28.1M', '$53.50'],
            ['Year 5',  '0.93', '$19.5M', '$7.1M', '$26.6M', '$50.65'],
            ['Year 10', '0.85', '$17.9M', '$7.1M', '$25.0M', '$47.50'],
          ]}
        />
        <P>
          The CISA make-up is constant across all three years (calculated against RRP, not
          MLF-adjusted volume). The ~$3.1M/yr revenue loss from MLF erosion is uncovered. Over a
          15-year contract this can easily reach $20–30M cumulative.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Is the make-up calculation explicitly against RRP × volume, or against settlement income?',
        'Is there an MLF re-opener at year-N if MLF degrades below a threshold?',
        'For projects in heavily-renewable REZs, model the MLF trajectory before bidding the floor.',
      ]} />

      {/* ============== Item 8 ============== */}
      <PdfH2>8. Curtailment allocation — CISA settles on actual MWh, not deemed</PdfH2>
      <Box variant="warn" title="Correction (v2.88.0)">
        Earlier versions of this guide stated that "CISAs deem technical curtailment as generated".
        That was wrong — and confused the PPA treatment with the CISA treatment. Standard CISAs
        settle on actual generated MWh.
      </Box>
      <P>
        If AEMO or the NSP curtails the project for system-security or constraint reasons, the
        foregone MWh is simply lost — no merchant revenue, no CISA top-up. PPAs commonly deem
        technical curtailment to the buyer; CISAs do not.
      </P>
      <Box variant="worked" title="Worked example — 10% technical curtailment year">
        <P>
          Same 200 MW solar. RRP $40. 50% PPA at $65 with deemed-technical-curtailment, 50% merchant.
          Floor $55.
        </P>
        <Table
          headers={['Scenario', 'Gen MWh', 'PPA revenue', 'Merchant rev', 'Blended', 'CISA', 'Total']}
          rows={[
            ['Un-curtailed',  '525,600', '$17.1M (full)',     '$10.5M', '$52.50', '$1.20M', '$28.80M'],
            ['10% curtail',   '472,500', '$17.1M (PPA-deemed)', '$9.45M', '$56.20', '$0',     '$26.60M'],
          ]}
        />
        <P>
          Net loss from curtailment: <Em>$2.2M</Em>. The PPA cushioned half via deeming; the
          merchant half plus a sliver of CISA-protected floor evaporated with the foregone MWh.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Standard CISA: no deeming of technical or economic curtailment.',
        'Modern PPAs typically deem technical curtailment to buyer; older PPAs may pro-rata.',
        'Economic curtailment (project choice to avoid negative prices) is project-absorbed under both.',
      ]} />

      {/* ============== Item 9 ============== */}
      <PdfH2>9. LGC treatment and bundling</PdfH2>
      <P>
        The CISA does not pay for LGCs. LGCs are a separate revenue stream — at ~$5–10/MWh in
        2026, down from a $90/MWh 2017 peak. The interaction with the PPA matters more than the
        CISA.
      </P>
      <Box variant="worked" title="Worked example — bundled vs stripped PPA + LGC market move">
        <P>
          Two identical projects. Project A: PPA at $75/MWh bundled (LGCs go with energy). Project
          B: PPA at $68/MWh stripped + LGCs sold separately.
        </P>
        <Table
          headers={['LGC market', 'Project A (bundled $75)', 'Project B (stripped $68 + LGC)', 'Difference']}
          rows={[
            ['$8/MWh',  '$75.00/MWh', '$68 + $8 = $76.00/MWh',  '+$1.00'],
            ['$2/MWh',  '$75.00/MWh', '$68 + $2 = $70.00/MWh',  '−$5.00'],
            ['$15/MWh', '$75.00/MWh', '$68 + $15 = $83.00/MWh', '+$8.00'],
          ]}
        />
        <P>
          Bundled trades LGC upside for LGC downside protection. Stripped lets the project chase
          LGC prices but exposes it to market crashes. With LRET expiring (2030) and post-2030 LGC
          policy uncertain, bundled is more bankable for project finance.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Who holds title to the LGCs created — project or PPA buyer?',
        'If the PPA strips LGCs, what is the project\'s LGC marketing right (spot, OTC, ESG-bundled)?',
        'Does the CISA reference price include or exclude LGC value?',
      ]} />

      {/* ============== Item 10 ============== */}
      <PdfH2>10. Annual cap interaction with low-positive-price years</PdfH2>
      <P>
        The annual cap binds in extended low-positive-price years, <Em>not</Em> in negative-price
        years. Volume × price gap can easily exceed the dollar cap, leaving the project with a
        partial uncovered downside.
      </P>
      <Box variant="worked" title="Worked example — pushing the cap to bind">
        <P>Same project. Cap $25M.</P>
        <Table
          headers={['Year', 'CF', 'RRP avg', 'Gen MWh', 'Uncapped make-up', 'Cap shortfall', 'Effective floor']}
          rows={[
            ['Y1', '30%', '$20', '525,600', '$16.6M', '$0',    '$54.50'],
            ['Y2', '40%', '$20', '700,800', '$22.1M', '$0',    '$53.97'],
            ['Y3', '40%', '$10', '700,800', '$28.4M', '$3.4M', '$50.15'],
            ['Y4', '40%', '$5',  '700,800', '$31.5M', '$6.5M', '$45.71'],
          ]}
        />
        <P>
          Y3 and Y4 carry meaningful uncovered exposure. Project teams should size <Em>downside
          reserves</Em> to cover both the 10% floor deductible and the worst-case cap shortfall.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'Bidders propose the cap — higher cap = more protection, worse MC2 score.',
        'A 2× P50 generation × 90% × (floor − P10 RRP) is a reasonable lower-bound for cap sizing.',
        'Is the cap renegotiable mid-tenor if MLF or capture-price assumptions prove materially wrong?',
      ]} />

      {/* ============== Item 11 ============== */}
      <PdfH2>11. Force majeure, change in law, and contract event triggers</PdfH2>
      <P>
        Standard contract events affect both PPA and CISA. The interaction matters when one is
        triggered but not the other.
      </P>
      <Box variant="worked" title="Worked example — Cat-1 cyclone, 2-month outage">
        <P>
          QLD wind farm. 2 months of zero generation (~17% of annual). Annual revenue baseline
          $35M.
        </P>
        <Table
          headers={['Treatment', 'PPA outcome', 'CISA outcome', 'Net annual revenue']}
          rows={[
            ['Both deem FM', '$0 PPA penalty; no make-up paid on zero MWh', 'Excused — no penalty',     '~$29M (no penalty either side)'],
            ['Only PPA deems FM', 'Buyer pays for nominal energy', 'No make-up — no MWh', '~$30M'],
            ['Neither deems',   'PPA shortfall penalty (LD)', 'No payment; possible bond impact', '~$25M after LD'],
          ]}
        />
        <P>
          Always check that PPA and CISA force-majeure definitions <Em>match</Em>. Mismatch creates
          gap exposure — the project may be penalised on one contract without protection on the other.
        </P>
      </Box>
      <Box variant="worked" title="Worked example — change in law (new system-strength charge)">
        <P>
          AEMC introduces a new $3/MWh system-strength service charge. With pass-through clauses:
        </P>
        <ul style={{ marginLeft: 18, marginTop: 4, marginBottom: 4 }}>
          <li style={{ fontSize: 11, lineHeight: 1.55, color: COLOR.text, marginBottom: 3 }}>
            <Em>PPA pass-through:</Em> buyer absorbs the $3/MWh — project unaffected.
          </li>
          <li style={{ fontSize: 11, lineHeight: 1.55, color: COLOR.text, marginBottom: 3 }}>
            <Em>No pass-through:</Em> project absorbs $3/MWh × 525,600 = $1.6M/yr. CISA does not
            compensate for compliance costs.
          </li>
          <li style={{ fontSize: 11, lineHeight: 1.55, color: COLOR.text, marginBottom: 3 }}>
            <Em>CISA re-opener:</Em> some CIS contracts have re-opener clauses for material
            market-design changes (e.g. 5-minute settlement transition).
          </li>
        </ul>
      </Box>

      {/* ============== Item 12 ============== */}
      <PdfH2>12. Stacking with multiple PPAs or sleeved arrangements</PdfH2>
      <P>
        Some projects have multiple PPA tranches. The CISA settles on the blended realised price
        across all tranches. Sleeved structures (gentailer middle-layer) can obscure the actual
        realised price the CISA depends on.
      </P>
      <Box variant="worked" title="Worked example — three-tranche stack">
        <P>
          200 MW solar, 525,600 MWh. RRP averages $50.
        </P>
        <Table
          headers={['Tranche', 'Volume', 'Strike', 'Revenue']}
          rows={[
            ['PPA-A (Coles)',   '30%', '$75', '$11.83M'],
            ['PPA-B (Telstra)', '30%', '$72', '$11.35M'],
            ['Merchant',        '40%', '$50', '$10.51M'],
            ['Total',           '100%', '—',  '$33.69M'],
          ]}
        />
        <P>
          Blended $/MWh = $64.10. Above floor $55 — no make-up. The CISA settles on the blend, not
          on each tranche individually.
        </P>
      </Box>
      <Box variant="key" title="What is sleeving?">
        A <Em>sleeved PPA</Em> uses a gentailer (AGL, Origin, etc.) as a middle layer between the
        project and the corporate buyer. The project signs a physical PPA with the gentailer, who
        signs a back-to-back arrangement with the corporate. The gentailer takes a margin for
        managing dispatch and settlement complexity.<br /><br />
        For the CISA, sleeved structures can be opaque about the project's <Em>actual</Em>
        realised $/MWh. If the gentailer's margin is variable (e.g. profit-sharing on dispatch),
        the make-up calculation depends on knowing the true upstream price. AURES recommends
        treating sleeved structures with extra documentation discipline.
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'How is "blended realised $/MWh" defined and reported for CISA settlement?',
        'For sleeved PPAs: who certifies the project\'s revenue to the CIS administrator?',
        'Are there caps on aggregate PPA strikes that could conflict with CISA pricing?',
      ]} />

      {/* ============== Item 13 ============== */}
      <PdfH2>13. The bankability question</PdfH2>
      <P>
        Lenders look at the combined PPA + CISA when sizing debt. The CISA floor — discounted by
        the 10% deductible — sets the bottom of the revenue envelope that debt service must clear.
      </P>
      <Box variant="worked" title="Worked example — DSCR under different financing structures">
        <P>
          Same project. Operating costs $8/MWh. Compare 60% gearing (no CISA) vs 75% gearing (with
          CISA).
        </P>
        <Table
          headers={['Scenario', 'Gearing', 'Annual debt service', 'Floor-case revenue', 'DSCR']}
          rows={[
            ['Merchant only — P50',          '60%', '$11.5M', '$26.3M (RRP $50)', '2.29×'],
            ['Merchant only — P90 down',     '60%', '$11.5M', '$13.1M (RRP $25)', '1.14×'],
            ['CISA-backed — P50',            '75%', '$14.4M', '$28.9M (blend)',   '2.01×'],
            ['CISA-backed — P90 down',       '75%', '$14.4M', '$25.4M (floor − deductible)', '1.77×'],
          ]}
        />
        <P>
          With merchant-only financing, the bank caps gearing at 60% because the P90 downside
          DSCR is too thin. With CISA backing, the 90%-protected floor lifts the P90 DSCR enough
          that 75% gearing is acceptable. <Em>15 percentage points of extra debt replaces equity</Em>
          — magnifying equity sponsor IRR by ~3–6pp on the same project economics.
        </P>
      </Box>
      <PdfH3>Verify in your term sheet</PdfH3>
      <Bullets items={[
        'CISA tenor ≥ debt tenor — preferred. Sized debt amortisation should fit within CISA term.',
        'CISA cap appropriate for project size — cap should cover worst-case make-up on at least 80–90% of P90 generation × (floor − P90 spot price).',
        'Lender DSCR sizing — check whether the bank uses floor (10% deductible) or floor (100%) in its downside model.',
      ]} />

      {/* ============== Item 14 ============== */}
      <PdfH2>14. Strategic considerations at bid time</PdfH2>
      <P>
        When designing your CISA bid, the PPA already-in-place shapes:
      </P>
      <Box variant="worked" title="Decision matrix">
        <Table
          headers={['Existing PPA', 'Optimal floor', 'Optimal ceiling', 'Optimal cap', 'Rationale']}
          rows={[
            ['None / weak',          'High ($55–65)',     'Wide ($140–170)', 'Large ($35–50M)', 'CISA is primary protection'],
            ['Mid-depth (50% @ mid-strike)', 'Mid ($45–55)',  'Mid ($120–140)',  'Mid ($20–35M)',   'CISA fills downside; PPA fills mid-band'],
            ['Deep (80%+ at high strike)', 'Low ($35–45)',  'Tight ($110–125)','Small ($10–20M)', 'CISA is backstop only; better MC2 score'],
            ['Stacked corporate + hyperscaler', 'Low ($35–45)', 'Wide ($150+)',   'Large for tail',  'Hyperscaler captures upside; CISA covers tail merchant period'],
          ]}
        />
      </Box>
      <PdfH3>Common pitfalls to avoid</PdfH3>
      <Bullets items={[
        <span>Bidding a floor below your <Em>capture price net of MLF</Em> — the floor must clear realised revenue, not RRP.</span>,
        <span>Sizing the annual cap to P50 — should be sized to P90 downside with a 1.2× safety margin.</span>,
        <span>Forgetting the 10% floor deductible — it bites in every below-floor year, including extreme negative-price scenarios.</span>,
        <span>Assuming negative prices are covered — they are not. The CISA reference is deemed $0.</span>,
        <span>Bidding ceiling without modelling the 50% clawback impact on equity IRR through a high-price decade.</span>,
      ]} />

      {/* Quick reference */}
      <PdfH2>Quick reference — one line each</PdfH2>
      <Table
        headers={['#', 'Item', 'One-line rule']}
        rows={[
          ['1',  'Volume alignment',      'PPA depth shifts where the CISA actually bites'],
          ['2',  'Tenor mismatch',        'Plan for the merchant tail after PPA expiry'],
          ['3',  'Negative prices',       'CISA pays nothing extra; curtail when |spot| > 0.9 × Floor'],
          ['4',  'Annual cap',            'A second deductible in bumper-resource × low-price years'],
          ['5',  'Aggregation period',    'Monthly pays more in volatile years; annual smooths cash'],
          ['6',  'Reference price',       'RRP, not capture price — you carry the basis risk'],
          ['7',  'MLF treatment',         'CISA does NOT cover MLF erosion'],
          ['8',  'Curtailment',           'CISA does NOT deem; only actual MWh settle'],
          ['9',  'LGCs',                  'Separate revenue; bundled trades upside for protection'],
          ['10', 'Cap × low-positive',    'Cap binds in high-output low-price years'],
          ['11', 'Force majeure / CIL',   'PPA and CISA definitions must match; check pass-through'],
          ['12', 'Multi-PPA / sleeving',  'CISA settles on blended realised — sleeved needs extra audit'],
          ['13', 'Bankability',           'CISA backing supports ~15pp extra gearing'],
          ['14', 'Bid strategy',          'Existing PPA depth dictates optimal CISA structure'],
        ]}
      />

      {/* Sources */}
      <PdfH2>Sources and further reading</PdfH2>
      <Box variant="source">
        <ul style={{ marginLeft: 18, marginTop: 0, marginBottom: 0 }}>
          <li style={{ fontSize: 10.5, lineHeight: 1.5, color: COLOR.textMuted, marginBottom: 3 }}>
            DCCEEW — <Em>Capacity Investment Scheme</Em> tender guidelines and contract template materials
          </li>
          <li style={{ fontSize: 10.5, lineHeight: 1.5, color: COLOR.textMuted, marginBottom: 3 }}>
            Clayton Utz (June 2024) — <Em>Capacity investment in Australian renewable energy projects — applications now open</Em> — confirms 90% floor coverage, 50% ceiling sharing, negative deemed-zero
          </li>
          <li style={{ fontSize: 10.5, lineHeight: 1.5, color: COLOR.textMuted, marginBottom: 3 }}>
            HSF Kramer — <Em>Capacity Investment Scheme update and the release of the Dispatchable CISA</Em> 2024
          </li>
          <li style={{ fontSize: 10.5, lineHeight: 1.5, color: COLOR.textMuted, marginBottom: 3 }}>
            Allens — <Em>Capacity Investment Scheme kicks off: what you need to know</Em> 2023
          </li>
          <li style={{ fontSize: 10.5, lineHeight: 1.5, color: COLOR.textMuted, marginBottom: 3 }}>
            King &amp; Wood Mallesons — <Em>CISA / PPA Interaction</Em> 2024
          </li>
          <li style={{ fontSize: 10.5, lineHeight: 1.5, color: COLOR.textMuted, marginBottom: 3 }}>
            Norton Rose Fulbright — <Em>Sovereign Offtake Practice Notes</Em>
          </li>
          <li style={{ fontSize: 10.5, lineHeight: 1.5, color: COLOR.textMuted, marginBottom: 3 }}>
            AEMO Services — CISA template documents (per round)
          </li>
          <li style={{ fontSize: 10.5, lineHeight: 1.5, color: COLOR.textMuted }}>
            AURES Intelligence — interactive CIS &amp; LTESA Bidding learning module
          </li>
        </ul>
      </Box>

      <p style={{ fontSize: 9, color: COLOR.source, textAlign: 'center', marginTop: 24 }}>
        AURES Intelligence · No investment advice · Verify all clauses against the executed contract.
      </p>
    </div>
  )
}
