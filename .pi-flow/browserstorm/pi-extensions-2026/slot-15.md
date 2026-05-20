# Version pinning strategy — Research (Browserstorm 15/20)

**Source:** pi-flow `package.json`, `scripts/verify-bundled-deps.mjs`, `/pi-flow-update`  
**Stack:** `@earendil-works/pi-coding-agent`, `pi-subagents`, `pi-mcp-adapter`, `pi-cursor-provider`, `@beads/bd`

---

## Summary

pi-flow uses **caret semver** on agent-stack npm deps (`^0.75.3`, `^0.24.3`, etc.) plus **postinstall verification** — not a checked-in `package-lock.json` in the published package files list. Operators should treat **lockfile at install site** + **`/pi-flow-update`** as the source of truth for reproducible boss sessions.

---

## Current pins (package.json)

| Package | Range | Role |
|---------|-------|------|
| `@earendil-works/pi-coding-agent` | `^0.75.3` | Pi CLI + ExtensionAPI |
| `pi-subagents` | `^0.24.3` | Delegation |
| `pi-mcp-adapter` | `^2.6.1` | MCP proxy |
| `pi-cursor-provider` | `^0.1.11` | Cursor OAuth (optional UX) |
| `@beads/bd` | `^1.0.4` | beads CLI |
| `typebox` | `^1.0.0` | Host tool schemas |
| **engines** | `node >=20` | Floor; **use 22.19+** for 0.75.x |

---

## Semver policy for agent stacks

| Range | Meaning | pi-flow use |
|-------|---------|-------------|
| `^0.75.3` | Allow 0.75.x patches/minors | Pi core — bump after reading changelog |
| `^0.24.3` | subagents patch/minor | Must stay earendil-aligned (≥0.24.1) |
| `^2.6.1` | mcp-adapter 2.x line | Avoid 1.x (obsolete) |
| **Exact pin** | `"0.75.3"` | Stricter CI/docker only |

**Rule:** Minor bumps on `0.x` packages may break extension imports — test `/reload` + one subagent storm after any `npm update`.

---

## Lockfile

| Fact | Implication |
|------|-------------|
| pi-flow `files` omit lockfile | Consumers get ranges resolved at `npm install` |
| **Recommendation** | Commit `package-lock.json` in **your fork** or run `npm ci` in deployment image |
| **verify-bundled-deps.mjs** | Warns missing `node_modules` paths after install |

---

## `/pi-flow-update` behavior

Registered in `pi-flow-setup`:

1. `updatePiFlowPackage()` — git/npm pull pi-flow
2. `applyPiFlowSettings` global + project
3. `installAgents` — sync agent markdown
4. `ensurePiFlowDeps` — bd, jq, bundled paths, beads init
5. `ensurePaperflowHost`, `runBrowserbaseSetup`
6. Tip: **`/reload`** if extensions feel stale

Does **not** auto-bump major Pi versions without operator intent.

---

## Best practices

1. **Boss machine:** `node -v` ≥ 22.19 before upgrading to latest 0.75.x.
2. **After update:** `npm ls @earendil-works/pi-coding-agent pi-subagents pi-mcp-adapter`
3. **Global Pi:** `pi update --self` aligned with pi-flow's pinned range.
4. **Storm / CI:** Pin exact versions in Docker; run `verify-bundled-deps.mjs`.
5. **Avoid** mixing `@oh-my-pi` or `@mariozechner` scopes (slot-10).

---

## References

- pi-flow: `package.json`, `extensions/pi-flow-setup/index.ts`, `scripts/verify-bundled-deps.mjs`
- slot-01, slot-02, slot-03, slot-19
