# Subagent policy (oh-my-pi task-tool patterns, pi-flow scoped)

**UX:** `docs/SUBAGENTS-UX.md` — boss/follow/mirror commands.

## Principles

1. **MCP where digging matters** — `scout` and `researcher` get MCP/read tools; parent orchestrator delegates early.
2. **One worker, one task** — each `worker` dispatch = one Beads work-task, self-contained brief.
3. **Isolation by default** — parallel workers use git worktree isolation (`subagents.isolation` in pi-flow settings).
4. **Full output** — if subagent output truncates, re-read via pi-subagents `agent://` resources (see pi-subagents docs).
5. **Follow the work** — orchestrator tells the user `/pf-follow <agent>`; boss session stays the coordination anchor (`/pf-boss`).

## Dispatch matrix

| Subagent | Use when | MCP | May write files |
|----------|----------|-----|-----------------|
| `scout` | Repo map, find symbols | Read tools | No |
| `researcher` | External docs, APIs, web (Browserbase MCP) | `read, bash, mcp:browserbase` + `browserbase` skill | No |
| `chronicler` | Compress `.pi-flow/memory/` journals → SUMMARY + agent MEMORY | `read, write, bash` (memory dir only) | Yes (`.pi-flow/memory/` only) |
| `planner` | Implementation plan from approved spec | Optional | No (plan text only) |
| `worker` | Single work-task implementation | Optional | Yes (scoped) |
| `reviewer` | Evidence review, ship gate | Read | No |
| `oracle` | Plan/grill critique before build | Optional | No |

**Researcher must have Browserbase tools** — pi-flow `settings/defaults.json` sets `subagents.agentOverrides.researcher.tools` to `read, bash, mcp:browserbase`. Without this, the builtin only gets `web_search` and Browserbase agentstorms appear to "not work". Restart Pi after settings change.

## Agentstorm

**Agentstorm** = many parallel subagents at once. Defaults in `piFlow.agentstorm`:

| Setting | Default |
|---------|---------|
| `defaultCount` | 20 |
| `defaultAgent` | `researcher` |
| `defaultConcurrency` | 4 |
| `maxCount` | 128 |

Invoke: `/pf-storm [count] [agent] <task>` or `/skill:agentstorm`. Pass `count` = storm size and `concurrency` = `defaultConcurrency` (4) so browse/MCP work queues instead of 8×3 parallel waves.

**Never** dispatch `subagent({ tasks: [{ agent: "researcher", count: 20 }] })` — the builtin defaults to `output: research.md` and all slots collide. Use `/pf-storm` / `buildAgentstormPayload()` so each slot writes `.pi-flow/browserstorm/<stamp>/slot-NN.md` with `progress: false`.

**Memory recall:** `pi-flow-memory` does not inject recall into `PI_SUBAGENT_CHILD` sessions (prevents slot files filled with "session recalled" text). Task text includes `STORM_OUTPUT_GUARD` — see `docs/PI-EXTENSIONS.md`.

**Child sessions:** `pi-flow-statusline` and `pi-flow-progress` are disabled when `PI_SUBAGENT_CHILD=1` so deferred UI timers cannot crash parallel researchers after session fork.

**Recovery:** `piFlow.agentstorm.recovery` (defaults on) re-dispatches failed slots after `completion_guard` / run end — up to `maxRetriesPerSlot` (default 2), `failFast: false`, per-slot outputs under `.pi-flow/browserstorm/`.

Subagent `config.json` should set `control.needsAttentionAfterMs`: **180000** (3 min) — merged by `/pi-flow-setup` — to avoid idle alerts during long browser sessions.

## pi-flow-only agents

| Agent | Never |
|-------|-------|
| `pi-flow.doc-writer` | bd mutations, code implementation |
| `pi-flow.bd-keeper` | HTML authoring, code |
| `pi-flow.cmux-verifier` | Anything except one-shot verify |

## Parallel build

When multiple `bd ready` tasks exist:

- Dispatch up to N workers (one task each), not one mega-task.
- Prefer worktree isolation so branches do not stomp.
- Orchestrator merges results and runs `paperflow_verify` / `reviewer` once per phase.

## Destructive git

Extension policy blocks `git push --force` and `git reset --hard` in bash unless `PI_FLOW_ALLOW_DESTRUCTIVE=1`.
