# pi-flow — paperflow in CMUX

**Simple stack:** 6 lifecycle skills · **3 pi-flow agents** · pi-subagents builtins · external paperflow host.

**Activity + auto-rescue:** `pi-flow-progress` tracks usage signals (stream deltas, ctx tokens, tool updates, HTTP). Spinner shows `LIVE` vs `DEAD?`. Rescue runs only when there are **no** meaningful signals for ~90s — then abort, optional compact, auto-resume. `/pf-activity` · `/pf-rescue`. Tune `piFlow.progress`.

## Lifecycle

```text
/skill:goal → /skill:plan → grill → revise → /skill:build → /skill:review
```

Or `/skill:autopilot "vision"`. Router: `/skill:pi-flow` · policy: `lib/orchestrator.md`.

## Agents

| pi-flow only (3) | Role |
|------------------|------|
| `pi-flow.doc-writer` | HTML artifacts |
| `pi-flow.bd-keeper` | Beads + pointers |
| `pi-flow.cmux-verifier` | One-shot doc verify |

| pi-subagents (builtins) | Role |
|-------------------------|------|
| `worker` | Implement |
| `reviewer` | Review |
| `oracle` | Second opinion |
| `planner` | Implementation plan |
| `scout` · `researcher` | Recon · web/MCP |

**Boss/follow:** `/pf-agents` · `/pf-follow` · `/pf-boss` — `docs/SUBAGENTS-UX.md`

## Tools

`paperflow_host` · `paperflow_verify` · `paperflow_beads` · `paperflow_cmux` · `paperflow_active_goal`

**Browser:** cmux → `:8767` paperflow · Browserbase MCP → external web (`/skill:browserbase`)

## Install / update

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/update.sh | bash
```

In Pi: `/pi-flow-setup` · `/pi-flow-status` · `/pi-flow-handoff` · `/pi-flow-update`

## Docs

`docs/SUBAGENTS-UX.md` · `docs/CMUX.md` · `docs/BROWSERBASE.md` · `docs/BEST-PRACTICES.md` · `docs/EDITING.md` · `docs/BEADS.md` · `docs/HOST.md`

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
