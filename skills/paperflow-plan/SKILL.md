---
name: paperflow-plan
description: >-
  Planlegging paperflow-stil: questionnaire (valgfri) → draft HTML plan → grill (obligatorisk pause)
  → revise → materialiser bd work-tasks. "plan X", "grill planen", "revise etter grill".
---

# paperflow-plan (pi-cursor)

Port av [paperflow plan skill](https://github.com/FRIKKern/paperflow/blob/main/skills/plan/SKILL.md).

## Forutsetninger

- Aktiv Goal: `cat .paperflow/active-goal`
- Les `lib/paperflow-thresholds.md` og `lib/paperflow-paths.md`

## Fase 0 — Questionnaire (valgfri)

Skriv questionnaire når scope er uklart (ikke samme plan som grill).

- **doc-writer** → `~/docs/paperflow/questionnaires/<date>-<slug>-questionnaire.html`
- Vent på svar (cmux: Submit i browser; Pi-only: bruker svarer i chat med "Questionnaire answers for …")

## Fase A — Draft

1. `bd show` goal + active phase
2. **doc-writer**: plan HTML med steg-liste + Mermaid, `PAPERFLOW_GOAL_ID` satt
   - `~/docs/paperflow/plans/<date>-<slug>.html`
3. **researcher** om ekstern docs trengs før draft
4. Orchestrator (inline bd): materialiser steg som work-tasks:

```bash
bd create "<step>" --label goal-<slug>
bd dep add <work-task> <phase-id>
bd dep add <child> <parent>   # intra-phase order
```

5. cmux + paperflow host: kjør `paperflow-doc-verify <url>` eller delegér til reviewer med browser MCP

## Fase B — Grill (mandatory)

1. **researcher** + **doc-writer**: 8–15 spørsmål → grill HTML
   - `~/docs/paperflow/grills/<date>-<slug>-grill.html`
2. **PAUSE** — ikke fortsett før svar:
   - **Med paperflow bridge**: bruker Submit → melding `Grill answers for <plan>:`
   - **Pi i cmux uten bridge**: lim inn grill i chat, eller åpne HTML og svar i chat med strukturert liste
3. Eksplisitt "skip grill" kun for trivial revise-only

## Fase C — Revise

1. **doc-writer**: oppdater plan HTML med grill-svar
2. **bd-keeper**: nye/stengte work-tasks, oppdaterte `bd dep add`
3. Tilby: re-grill | `/skill:paperflow-build` | stopp

## HTML er planleggingsformatet

Ikke erstatt med ren Markdown med mindre paperflow host mangler — da skriv HTML til `docs/paperflow/` likevel (lettere å migrere når daemon installeres).
