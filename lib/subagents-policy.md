# Subagent policy (oh-my-pi task-tool patterns, pi-flow scoped)

## Principles

1. **MCP where digging matters** — `scout` and `researcher` get MCP/read tools; parent orchestrator delegates early.
2. **One worker, one task** — each `worker` dispatch = one Beads work-task, self-contained brief.
3. **Isolation by default** — parallel workers use git worktree isolation (`subagents.isolation` in pi-flow settings).
4. **Full output** — if subagent output truncates, re-read via pi-subagents `agent://` resources (see pi-subagents docs).

## Dispatch matrix

| Subagent | Use when | MCP | May write files |
|----------|----------|-----|-----------------|
| `scout` | Repo map, find symbols | Read tools | No |
| `researcher` | External docs, APIs, web (Browserbase MCP) | Yes | No |
| `planner` | Implementation plan from approved spec | Optional | No (plan text only) |
| `worker` | Single work-task implementation | Optional | Yes (scoped) |
| `reviewer` | Evidence review, ship gate | Read | No |
| `oracle` | Plan/grill critique before build | Optional | No |

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
