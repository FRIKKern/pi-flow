---
name: paperflow-build
description: >-
  Byggeløkke: bd ready → claim → worker subagent → verify → close. Gjenta til phase tom.
  "build", "neste task", "ship", "kjør planen".
---

# paperflow-build (pi-cursor)

Fra [paperflow build](https://github.com/FRIKKern/paperflow/blob/main/skills/build/SKILL.md).

## Løkke

```text
bd ready --label goal-<slug> --label phase-<active>
  → claim (bd update --claim)
  → worker (implementer ÉN task, self-contained brief)
  → verify (bash -n, tester, eller reviewer ved >500 token evidence)
  → close (bd update --close)
  → repeat
```

## Regler

- **Én work-task per worker-dispatch**
- >30 LOC / >50 prose / >500 token evidence → subagent (se thresholds)
- Commit med `Subagent-Run: <task-id>` når >30 LOC
- File-claim: `file-claim:<path>` labels når plan navngir filer

## Verifikasjon

| Evidence size | Handling |
|---------------|----------|
| Liten | Orchestrator kjører kort kommando inline |
| Stor | **reviewer** eller dedikert verify-pass |

## CMUX

Ved UI-endringer: worker kan bruke `mcp:chrome-devtools` hvis konfigurert; ellers manuell sjekk i cmux browser.

## Phase advance

Når `bd ready` tom for aktiv phase → oppdater `.paperflow/active-phase` til neste fase eller foreslå `/skill:paperflow-review`.
