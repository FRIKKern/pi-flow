# pi-subagents — Research (Browserstorm 2/20)

**Package:** [pi-subagents](https://www.npmjs.com/package/pi-subagents)  
**Repository:** [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents)  
**pi-flow context:** `lib/subagents-policy.md`, `.pi-flow/subagent-roster.json`, agentstorm / researcher delegation

---

## Summary

`pi-subagents` is a Pi extension that adds a `subagent` tool for delegating work to focused child Pi sessions: single runs, parallel fan-out, sequential chains, background async jobs, and a clarify TUI. **Latest npm version is `0.24.3`** (published 2026-05-15). For **`@earendil-works/pi-coding-agent` 0.75.x**, use **`pi-subagents@0.24.3`** (or at minimum **`0.24.1+`**): only those builds import the `@earendil-works/*` scope that 0.75 uses. Older `0.24.0` and below still target `@mariozechner/*` and are the wrong pairing.

Install: `pi install npm:pi-subagents`

---

## Version

| Field | Value |
|-------|--------|
| **Latest** | `0.24.3` |
| **dist-tag** | `latest` → `0.24.3` |
| **License** | MIT |
| **Type** | `module` |
| **Extension entry** | `./src/extension/index.ts` (via `package.json` → `pi.extensions`) |
| **Runtime deps** | `jiti`, `typebox` |
| **Peer deps** | `@earendil-works/pi-agent-core`, `pi-ai`, `pi-coding-agent`, `pi-tui` — all optional `*` |

### Version line vs pi-coding-agent 0.75.x

| pi-subagents | Pi SDK scope in package | Pair with pi-coding-agent 0.75.x? |
|--------------|-------------------------|----------------------------------|
| `≤0.24.0` | `@mariozechner/*` (^0.65 devDeps) | **No** — wrong package scope |
| `0.24.1`–`0.24.3` | `@earendil-works/*` (^0.74 devDeps) | **Yes** |
| **Recommended** | `0.24.3` + `@earendil-works/pi-coding-agent@0.75.3` | **Best** — latest patches on both sides |

`0.24.1` migrated imports to `@earendil-works/*`, switched async TS execution to upstream `jiti`, and hardened forked sessions via `SessionManager.open()`. Peer dependencies are wildcard-optional, so npm does not pin a maximum Pi version; devDependencies track `^0.74.0`, which is the maintainer's tested floor — **0.75.x is the intended upgrade path**, not a separate fork.

`pi-coding-agent` on npm without scope is a **placeholder**; 0.75.x lives at **`@earendil-works/pi-coding-agent`** (`0.75.0`–`0.75.3` as of research date).

---

## Builtin agents (scout / researcher / worker)

Eight builtins ship in the package `agents/` directory. All inherit the **parent's default model** unless overridden via `subagents.agentOverrides` in settings (no pinned provider in builtins as of 0.22+).

### `scout`

| Aspect | Detail |
|--------|--------|
| **Role** | Fast codebase recon → compressed handoff |
| **Tools** | `read`, `grep`, `find`, `ls`, `bash`, `write`, `intercom` |
| **Thinking** | `low` |
| **Defaults** | `output: context.md`, `defaultProgress: true`, `inheritProjectContext: true` |
| **Prompt mode** | `replace` (no full Pi base prompt) |

Produces `context.md` with files retrieved, key code, architecture, and "start here" for the next agent.

### `researcher`

| Aspect | Detail |
|--------|--------|
| **Role** | Web/docs research → sourced brief |
| **Tools** | `read`, `write`, `web_search`, `fetch_content`, `get_search_content`, `intercom` |
| **Thinking** | `medium` |
| **Defaults** | `output: research.md`, `defaultProgress: true` |
| **Requires** | [pi-web-access](https://github.com/nicobailon/pi-web-access) for web tools (`pi install npm:pi-web-access`) |

### `worker`

| Aspect | Detail |
|--------|--------|
| **Role** | Implementation agent (approved plans / oracle handoffs) |
| **Tools** | `read`, `grep`, `find`, `ls`, `bash`, `edit`, `write`, `contact_supervisor` |
| **Thinking** | `high` |
| **Defaults** | `defaultContext: fork`, `defaultReads: context.md, plan.md`, `defaultProgress: true` |
| **Safety** | Single writer; escalates unapproved product/architecture decisions via `contact_supervisor` |

### Other builtins (reference)

| Agent | Purpose |
|-------|---------|
| `planner` | Implementation plan from context; read/plan only |
| `reviewer` | Code review + small fixes |
| `context-builder` | Heavier pre-plan context → `context.md` / `meta-prompt.md` |
| `oracle` | Second opinion before edits; `defaultContext: fork` |
| `delegate` | General delegate close to parent; `systemPromptMode: append` |

**Orchestration pattern (docs):** `clarify → planner → worker → fresh reviewers → worker`. Packaged `planner`, `worker`, and `oracle` default to **forked** context when `context` is omitted.

---

## Parallel limits

Limits apply at **top-level** `tasks` / `parallel` tool calls and in **chain parallel steps**. Per-call `concurrency` wins over config.

| Limit | Default | Config override | Source constant |
|-------|---------|-----------------|-----------------|
| **Max parallel tasks** | `8` | `parallel.maxTasks` in `config.json` | `MAX_PARALLEL` |
| **Concurrency (simultaneous)** | `4` | `parallel.concurrency` in `config.json` | `MAX_CONCURRENCY` |
| **Per-call concurrency** | inherits above | `concurrency` on tool param / parallel step | — |
| **Task repeat** | — | `count` on parallel task items | — |

Example `~/.pi/agent/extensions/subagent/config.json`:

```json
{
  "parallel": {
    "maxTasks": 12,
    "concurrency": 6
  }
}
```

**Worktree isolation:** `worktree: true` on parallel runs requires a clean git repo; each parallel child gets its own worktree (see README). Separate from concurrency caps.

**Output truncation (all modes):** default `maxOutput` ≈ **200 KB** and **5000 lines** unless overridden per call.

---

## Control config

Parent-session **attention / long-running** signaling for foreground and async child runs. Resolved in `src/runs/shared/subagent-control.ts`.

**Global file:** `~/.pi/agent/extensions/subagent/config.json`  
**Per-call override:** `control` on `subagent({ ... })` tool params

### Defaults (`DEFAULT_CONTROL_CONFIG`)

| Field | Default | Meaning |
|-------|---------|---------|
| `enabled` | `true` | Master switch |
| `needsAttentionAfterMs` | `60000` | No observed activity → `needs_attention` |
| `activeNoticeAfterMs` | `240000` | Still running but long → `active_long_running` |
| `activeNoticeAfterTurns` | *(unset)* | Optional turn threshold |
| `activeNoticeAfterTokens` | *(unset)* | Optional token threshold |
| `failedToolAttemptsBeforeAttention` | `3` | Failed tool streak → attention |
| `notifyOn` | `["active_long_running", "needs_attention"]` | Event types |
| `notifyChannels` | `["event", "async", "intercom"]` | Delivery paths |

### Example override

```json
{
  "control": {
    "enabled": true,
    "needsAttentionAfterMs": 90000,
    "activeNoticeAfterMs": 300000,
    "notifyOn": ["needs_attention"],
    "notifyChannels": ["event", "intercom"]
  }
}
```

**Related control surfaces (not `control` block):**

| Key | Purpose |
|-----|---------|
| `asyncByDefault` | Top-level runs background unless `async: false` |
| `forceTopLevelAsync` | Force depth-0 async + skip clarify |
| `maxSubagentDepth` | Nested delegation cap (default **2** levels: parent → child → sub-child) |
| `PI_SUBAGENT_MAX_DEPTH` | Env override for depth |
| `intercomBridge` | `mode`: `always` \| `fork-only` \| `off`; needs `pi-intercom` |

**Management actions:** `subagent({ action: "status" | "interrupt" | "resume" | "doctor" })`

---

## Other configuration surfaces

| Surface | Path | Use |
|---------|------|-----|
| Extension config | `~/.pi/agent/extensions/subagent/config.json` | parallel, control, async, depth, intercom, worktree hook |
| Agent overrides | `~/.pi/agent/settings.json` or `.pi/settings.json` → `subagents.agentOverrides` | per-builtin model, tools, skills, disable |
| Disable all builtins | `subagents.disableBuiltins: true` | settings |
| Custom agents | `~/.pi/agent/agents/**/*.md`, `.pi/agents/**/*.md` | override builtins by name |
| Chains | `~/.pi/agent/chains/`, `.pi/chains/**/*.chain.md` | saved workflows |

---

## Pairing recommendation for pi-coding-agent 0.75.x

```bash
# Ensure core agent is 0.75.x (scoped package)
npm install -g @earendil-works/pi-coding-agent@0.75.3

pi install npm:pi-subagents@0.24.3
pi install npm:pi-web-access    # if using researcher builtin
pi install npm:pi-intercom      # optional: child ↔ parent coordination
```

| Goal | Version |
|------|---------|
| **Production default** | `pi-subagents@0.24.3` + `@earendil-works/pi-coding-agent@0.75.3` |
| **Minimum for 0.75** | `pi-subagents@0.24.1` (earendil migration) |
| **Avoid** | `≤0.24.0` with 0.75 (mariozechner imports) |

No npm `peerDependencies` conflict is declared against 0.75; compatibility is structural (import scope + session fork APIs). If issues appear, check `/subagents-doctor` or `subagent({ action: "doctor" })`.

---

## pi-flow relevance

- **agentstorm / parallel researchers** share the same concurrency reality as Browserbase: plan limits matter; `pi-subagents` caps parallel **Pi child processes** separately (`maxTasks` / `concurrency`).
- **researcher** builtin aligns with Browserstorm research slots; **scout** for repo recon before implementation; **worker** for gated implementation after plan approval.
- Roster tracking (`.pi-flow/subagent-roster.json`) is pi-flow-local; pi-subagents async state lives under temp dirs (`pi-subagents-<scope>/async-subagent-runs/`).

---

## Sources

- npm: `pi-subagents@0.24.3` metadata and README (2026-05-15)
- npm: `@earendil-works/pi-coding-agent` versions `0.75.0`–`0.75.3`
- Packaged agents: `agents/scout.md`, `agents/researcher.md`, `agents/worker.md`
- Source defaults: `src/shared/types.ts` (`MAX_PARALLEL=8`, `MAX_CONCURRENCY=4`, `DEFAULT_SUBAGENT_MAX_DEPTH=2`), `src/runs/shared/subagent-control.ts`
