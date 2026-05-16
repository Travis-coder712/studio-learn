# Studio Learn

A standalone copy of the AURES learning curriculum, hosted under the
[Studio](https://travis-coder712.github.io/studio/) brand for sharing
and reuse.

**Live:** https://travis-coder712.github.io/studio-learn/

## What's here

Eleven renewable-energy curricula mirrored from AURES, with the
interactive calculators included:

- Energy transition — the big picture
- The Solar + BES boom
- NSW REZ + transmission
- CIS & LTESA bidding parameters (with the PPA × CISA settlement
  calculator, the single-hour explorer, and the MC1 Benefit-Cost
  Ratio deep dive)
- PPAs — anatomy, structures, modern market
- Project financing
- Planning approvals
- AEMO grid connections
- Constraints in the NEM
- Valuing renewable projects (wind, solar, BESS, hybrid)
- Summing it up — market implications through 2030

## Canonical source

The maintained version lives in
[AURES](https://travis-coder712.github.io/aures-db/) — same content,
plus the live project tracker, scheme intelligence dashboards,
developer scoring, BESS capex tracker, and value-analysis dashboards.

Studio Learn carries the curriculum only and is updated by manual
sync from AURES from time to time. For anything beyond the lessons,
go to AURES.

## Local development

```bash
npm install
npm run dev
```

Visit http://localhost:5173/studio-learn/.

## Build

```bash
npm run build
```

## Refreshing from AURES

To re-sync from the AURES canonical version, run rsync from the
AURES frontend folder into this directory, excluding the files
specific to Studio Learn (`App.tsx`, `Layout.tsx`, `Home.tsx`,
`package.json`, `vite.config.ts`, `index.html`, `README.md`). Then
bump the version in `package.json` and push.

## Origin

Originally part of
[github.com/Travis-coder712/aures-db](https://github.com/Travis-coder712/aures-db).
Studio Learn is a standalone snapshot, not a fork.
