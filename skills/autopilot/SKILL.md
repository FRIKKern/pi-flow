---
name: autopilot
description: >-
  pi-flow · paperflow autopilot. Use for "autopilot", "run the whole flow", "do goal through review".
  Chains goal → plan → grill (MANDATORY pause) → revise → build → review. Does not auto-archive.
argument-hint: "<one-line goal vision>" [--skip-grill]
---

# autopilot (pi-flow)

Port av [paperflow autopilot](https://github.com/FRIKKern/paperflow/blob/main/skills/autopilot/SKILL.md).

## Chain

```text
/skill:goal "<vision>"
/skill:plan          # draft
[GRILL PAUSE]
/skill:plan          # revise with answers
/skill:build         # drain build phase
/skill:review
summary (no archive unless user asks)
```

## Mandatory grill pause

After plan draft: **stop** until grill answers — unless user passed `--skip-grill`.

## CMUX + host

1. `paperflow_host` `{ action: "ensure" }` at start
2. cmux layout — `scripts/cmux-layout.sh` or `/pi-flow-cmux-layout`
3. `/skill:cmux` if bridge/verify fails
4. Session auto-registers on Pi start → grill Submit → this pane

## Transparency

Every phase leaves a readable HTML artifact when host is installed — not one opaque orchestrator blob.
