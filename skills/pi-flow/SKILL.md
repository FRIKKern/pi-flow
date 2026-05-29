---
name: pi-flow
description: >-
  Router only — which pi-flow skill or command to use. Use when the user is unsure where to start.
---

# pi-flow (router)

Read `lib/orchestrator.md` for dispatch rules. **Lazy load:** read each skill's `SKILL.md` (or `skill://name`) when executing — do not rely on this table alone (`lib/lazy-skills.md`).

## Start here

| User intent | Invoke |
|-------------|--------|
| Full flow from vision | `/skill:autopilot "…"` |
| New goal | `/skill:goal "…"` |
| Plan only | `/skill:plan` |
| Execute tasks | `/skill:build` |
| Review / ship | `/skill:review` |
| Switch goal | `/skill:resume` |
| First time / broken install | `/pi-flow-setup` then `/pi-flow-status` |
| Long session / context full | `/pi-flow-handoff [focus]` |
| Update pi-flow | `/pi-flow-update` |
| Browserbase / cloud browser | `/pi-flow-browserbase-setup` · `/skill:browserbase` |
| Many parallel subagents (agentstorm) | `/pf-storm …` · `/skill:agentstorm` (default 20) |
| Session memory / named agents | `/pf-memory` · `/pf-name` · `/pf-chronicler` · `/skill:memory` |
| Session title / resume | `/pf-rename` · `/name` · `/skill:session` (auto-name on first prompt) |
| paperflow HTML in cmux | `/skill:cmux-browser` |

## Lifecycle

```text
/skill:goal → /skill:plan → grill → revise → /skill:build → /skill:review
```

## Agents (only four are pi-flow-specific)

- `pi-flow.doc-writer` · `pi-flow.bd-keeper` · `pi-flow.cmux-verifier` · `pi-flow.chronicler` (compresses session journals → SUMMARY.md, dispatched via `/pf-chronicler`)
- Everything else: **pi-subagents** builtins (`worker`, `reviewer`, `scout`, …)
- Follow child chats: `/pf-agents` · `/pf-follow` · `/pf-boss` (`docs/SUBAGENTS-UX.md`)

## Tools

`lib/paperflow-tools.md`
