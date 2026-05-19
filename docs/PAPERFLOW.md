# Paperflow × pi-cursor

pi-cursor porter [paperflow](https://github.com/FRIKKern/paperflow) sin **orkestreringsdisiplin** til Pi. Vi fork-er ikke paperflow-repoet; vi lærer av skills, agents, HTML-kontrakt og Beads-grafen.

## Hva vi kopierer

| paperflow | pi-cursor |
|-----------|-----------|
| goal → plan → grill → build → review | `/skill:paperflow-*` |
| `paperflow-doc-writer` | `pi-cursor.doc-writer` |
| `paperflow-bd-keeper` | `pi-cursor.bd-keeper` |
| `shared-thresholds.md` | `lib/paperflow-thresholds.md` |
| HTML under `~/docs/paperflow/` | Samme paths når host installert |
| autopilot med grill-pause | `skills/paperflow-autopilot` |

## Hva vi ikke porter til Pi

- `paperflow-daemon`, `claude-bridge` (Claude Code-spesifikt)
- Claude hooks (`PostToolUse` auto-open)
- cmux dock feeds (krever paperflow host)

Installer host separat for full opplevelse:

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh | bash
```

## Grill uten bridge

1. doc-writer skriver grill HTML
2. Orchestrator viser sti + åpner i cmux browser
3. Bruker svarer i Pi: `Grill answers for <plan>:` + strukturerte svar
4. Revise-fase som normalt

## Beads hierarchy

```text
Goal (epic, label goal-<slug>)
 ├── phase-pre-flight | phase-build | phase-review
 │    └── work-tasks (bd dep add)
 └── kind:event (goal-path rail, optional)
```

Se paperflow `ARCHITECTURE.md` for detaljer.

## Læringsressurser i upstream

- `skills/plan/SKILL.md` — questionnaire, draft, grill, revise
- `skills/autopilot/SKILL.md` — momentum chain
- `examples/example-questionnaire.html` — HTML mal
- `lib/grill.js`, `lib/doc.js` — interaktiv grill/plan UI
