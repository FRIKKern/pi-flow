# Security & update policy — Research (Browserstorm 19/20)

**Scope:** `@earendil-works/pi-coding-agent`, `pi-subagents`, `pi-mcp-adapter`, bundled pi-flow extensions  
**Cadence:** Practical policy for production boss sessions

---

## Summary

The agent stack moves fast on **`0.x` semver**. pi-flow should **review changelogs monthly**, apply **patch bumps** within the pinned caret range after smoke tests, and treat **minor Pi bumps** (0.75 → 0.76) as a coordinated upgrade across `pi-subagents` + `pi-mcp-adapter` + first-party extensions.

---

## What to bump how often

| Package | Suggested cadence | Breaking signals |
|---------|-------------------|------------------|
| `@earendil-works/pi-coding-agent` | **Monthly** check; patch within `^0.75` weekly OK | Import scope, `ExtensionAPI` hook renames, Node engines bump |
| `pi-subagents` | **With Pi** — same PR/session | `<0.24.1` wrong scope; tool schema changes |
| `pi-mcp-adapter` | **Quarterly** or when MCP SDK security advisory | 1.x → 2.x already done; watch `mcp` tool params |
| `pi-cursor-provider` | **As needed** for model list patches | postinstall patch script in pi-flow |
| `@beads/bd` | **Low** — patch only | CLI schema changes |
| **pi-flow itself** | `/pi-flow-update` when shipping features | Extension hook behavior |

---

## Changelog sources

| Project | Where |
|---------|--------|
| pi-mono (coding-agent, agent-core) | GitHub releases / `packages/coding-agent/CHANGELOG` |
| pi-subagents | npm version dates + GitHub releases |
| pi-mcp-adapter | GitHub nicobailon/pi-mcp-adapter |
| pi-flow | `git log`, GitHub releases |

**Watch for:** `extension ctx is stale` fixes, subagent fork API changes, MCP auth URL changes (Browserbase).

---

## Security practices

1. **Do not commit** `browserbase.env`, API keys, or `~/.pi` session tokens.
2. **MCP hosted URL** — rotate Browserbase keys if leaked; prefer env over committed JSON.
3. **npm supply chain** — install from scoped `@earendil-works/*` and known maintainers; avoid typosquat `pi-coding-agent` unscoped placeholder.
4. **Subagent storms** — children inherit env; sandbox secrets per machine profile.
5. **postinstall scripts** — pi-flow runs `patch-cursor-provider.mjs` + `verify-bundled-deps.mjs` only; review on upgrade.

---

## Upgrade procedure (boss session)

1. Read Pi + pi-subagents release notes.
2. `node -v` ≥ 22.19.
3. `/pi-flow-update` or `npm update` in pi-flow checkout.
4. `/reload` in Pi.
5. Run **`subagent({ action: "doctor" })`** or small 2-slot storm smoke test.
6. Commit lockfile bump in deployment repos.

---

## When to stay pinned

| Situation | Action |
|-----------|--------|
| Production demo / conference | Exact versions in lockfile |
| Active agentstorm | Finish storm before upgrading |
| Breaking Pi pre-release | Wait for `pi-subagents` matching release |

---

## References

- slot-15 (semver), slot-10 (fork risk), slot-01 (Pi 0.75.x)
- pi-flow: `FORKS.md`, `scripts/verify-bundled-deps.mjs`
