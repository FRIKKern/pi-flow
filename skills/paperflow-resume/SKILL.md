---
name: paperflow-resume
description: >-
  List og bytt aktiv Goal (Beads epics). Kun pointer-filer — ingen bd-mutasjon ved bytte.
  "resume", "list goals", "bytt goal".
---

# paperflow-resume (pi-cursor)

Fra [paperflow resume](https://github.com/FRIKKern/paperflow/blob/main/skills/resume/SKILL.md).

## Prosess

1. `bd list --type epic --json` (eller `bd list --label goal-*`)
2. Presenter nummerert meny med tittel + id + åpen/lukket
3. Ved valg: skriv `.paperflow/active-goal` og sett `active-phase` til første uferdige phase (eller siste aktive fra bruker)
4. Åpne Goal HTML i cmux browser hvis tilgjengelig

## CMUX

Ny Pi-session i samme workspace: pointers er per repo — resume skill gjenoppretter kontekst uten ny epic.
