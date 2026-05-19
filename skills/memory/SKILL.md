---
name: memory
description: >-
  Durable pi-flow session memory — continuous journal, named agents, chronicler.
  Use for handoff, recall, never losing context across Pi restarts.
---

# memory (pi-flow)

pi-flow **never relies on Pi session JSON alone** for history. A passive extension journals everything under `.pi-flow/memory/`.

## Always on (extension)

| Path | Purpose |
|------|---------|
| `session/journal.jsonl` | Append-only session log (turns, tools, subagents) |
| `session/SUMMARY.md` | Rolling narrative (chronicler-maintained) |
| `agents/<slug>/MEMORY.md` | Dedicated memory for a **named** agent |
| `agents/<slug>/journal.jsonl` | Named-agent event tail |
| `registry.json` | Slug → bindings (run IDs, session files) |

## Commands

| Command | Action |
|---------|--------|
| `/pf-memory` | Status — entry counts, named agents |
| `/pf-name <slug> [builtin]` | Name/bind agent (e.g. `storm-19 researcher`) |
| `/pf-recall [slug]` | Print recall block |
| `/pf-note [slug] text` | Manual fact into journal + agent memory |
| `/pf-chronicler [focus]` | Dispatch `pi-flow.chronicler` to compress journals |

Boss turns auto-inject a short **recall** block when `piFlow.memory.recallOnStart` is true (default).

## Named agents (never lose a persona)

```text
/pf-name storm-19 researcher
/pf-note storm-19 Blocked on browse doctor — use curl + llms.txt first
/pf-recall storm-19
```

After a subagent run, name it while the roster still has the run ID — bindings link future journal lines.

## Chronicler workflow

1. Extension journals passively (no LLM cost per turn)
2. After a long session or before handoff: `/pf-chronicler`
3. Chronicler updates `SUMMARY.md` + each `agents/*/MEMORY.md`
4. New session: recall injects summary automatically

## Handoff

Pair with `/pi-flow-handoff` — handoff gives goal/beads; memory gives **what we did and decided**.

## Settings (`settings/defaults.json`)

```json
"piFlow": {
  "memory": {
    "enabled": true,
    "recallOnStart": true,
    "maxRecallChars": 2400
  }
}
```

See `lib/orchestrator.md` · `docs/SUBAGENTS-UX.md`.
