---
name: paperflow-autopilot
description: >-
  Hele paperflow-kjeden i ett løp: goal → plan → grill (PAUSE) → revise → build → review.
  "autopilot", "kjør hele flyten", momentum mode i CMUX.
---

# paperflow-autopilot (pi-cursor)

Fra [paperflow autopilot](https://github.com/FRIKKern/paperflow/blob/main/skills/autopilot/SKILL.md).

## Sekvens

```mermaid
sequenceDiagram
  participant U as User
  participant P as Pi orchestrator
  U->>P: vision
  P->>P: /skill:paperflow-goal
  P->>P: /skill:paperflow-plan (draft)
  P->>U: GRILL PAUSE
  U->>P: grill answers
  P->>P: /skill:paperflow-plan (revise)
  P->>P: /skill:paperflow-build (drain phase)
  P->>P: /skill:paperflow-review
  P->>U: summary (does not auto-archive)
```

## Obligatorisk grill-pause

Etter draft: **stopp** til bruker har svart grill (browser Submit eller chat). `--skip-grill` kun ved eksplisitt bruker-forespørsel.

## CMUX + paperflow host

Anbefalt stack i cmux:

1. `paperflow` installert (daemon :8767, bridge, cmux dock)
2. `pi` med `pi-cursor` i workspace-pane
3. Autopilot åpner HTML underveis; grill Submit lander i Pi via bridge

Uten host: autopilot bruker samme skills men grill/revise i chat; plan HTML i `docs/paperflow/`.

## Preflight (når host finnes)

```bash
~/.local/bin/paperflow-preflight
~/.local/bin/paperflow-doctor --fast
```

Abort ved exit 2; advar ved exit 1.

## Transparens

Hvert steg skal etterlate lesbar artifact (HTML foretrukket) — ikke "alt i én orchestrator-blob".
