---
name: paperflow-goal
description: >-
  Åpne eller bytte Goal (paperflow). Beads epic + tre faser (pre-flight, build, review),
  pointer-filer, Goal HTML. Bruk ved "start goal", "nytt mål", multi-artifact arbeid i CMUX.
---

# paperflow-goal (pi-cursor)

Lært fra [FRIKKern/paperflow](https://github.com/FRIKKern/paperflow) `/paperflow:goal`. Kjør i **Pi** med Composer 2.5.

## Før du starter

1. `bd` installert; `bd init` i repo om nødvendig
2. Valgfritt: paperflow host (`curl …/quickstart.sh`) for HTML @ :8767 + cmux auto-open
3. Les `lib/paperflow-thresholds.md` — deleger tung skriving til `doc-writer`

## Åpne ny Goal

1. **bd-keeper** (eller inline om kun seremoni):
   - `bd create "<vision>" --type epic --label goal-<slug>`
   - Tre faser: `pre-flight`, `build`, `review` med `kind:phase`, `--parent <goal>`
2. Skriv pointers:
   - `.paperflow/active-goal` → goal id
   - `.paperflow/active-phase` → pre-flight phase id
3. **doc-writer**: Goal HTML → `~/docs/paperflow/goals/<slug>/index.html` (se `lib/paperflow-paths.md`)
4. I **cmux**: åpne URL i browser (`cmux browser open http://localhost:8767/paperflow/goals/...`) eller la paperflow hooks gjøre det

## Resume / bytte Goal

- `bd list --type epic --json` → nummerert meny til bruker
- Ved valg: oppdater kun pointer-filer (ingen bd-sletting)

## Snapshot / archive

- Snapshot: doc-writer refresher Goal HTML + sidecar
- Archive: `bd epic close` når ferdig (etter review)

## CMUX

Paperflow i cmux gir dock-feeds og `paperflow-doc-verify`. Uten host: Pi + filer i `docs/paperflow/` er nok for plan/grill i chat.
