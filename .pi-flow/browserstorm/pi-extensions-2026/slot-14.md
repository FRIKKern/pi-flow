# gitnexus & @astrofoundry/pi-astro — Research (Browserstorm 14/20)

**Packages:** [gitnexus](https://www.npmjs.com/package/gitnexus) · [pi-gitnexus](https://www.npmjs.com/package/pi-gitnexus) · [@astrofoundry/pi-astro](https://www.npmjs.com/package/@astrofoundry/pi-astro)  
**pi-flow:** Not bundled; evaluate as optional add-ons

---

## Summary

Two optional ecosystem packages address **code intelligence** (GitNexus) and **opinionated Pi customization** (pi-astro). Neither is required for paperflow. **pi-flow should not bundle them by default** — add only when a team commits to their extra CLIs and agent rosters.

---

## gitnexus (core) — `1.6.5`

| Field | Value |
|-------|--------|
| **Description** | Graph-powered code intelligence; index codebase; query via MCP or CLI |
| **Keywords** | MCP, knowledge-graph, codebase-indexing |
| **Repo** | [abhigyanpatwari/GitNexus](https://github.com/abhigyanpatwari/GitNexus) |

Standalone MCP/CLI — not Pi-specific. Useful for **call chains, blast radius, execution flows** on large repos.

---

## pi-gitnexus — `0.6.3`

| Field | Value |
|-------|--------|
| **Keyword** | `pi-package` |
| **Extension** | `./src/index.ts` |
| **Maintainer** | tintinweb |
| **Role** | Pi extension wrapping GitNexus for agent searches |

```bash
pi install npm:pi-gitnexus
```

**Fit:** Teams wanting graph-aware code search **inside Pi** without manual MCP wiring. Complements (does not replace) pi-flow host tools.

---

## @astrofoundry/pi-astro — `0.16.1`

| Field | Value |
|-------|--------|
| **Description** | Personal pi customizations: 16 subagents, grimoire tool, skills, astro theme |
| **Bundles** | `pi-subagents` via `bundledDependencies` — **do not** also `pi install pi-subagents` (duplicate tool registration) |
| **Extra CLIs** | `@astrofoundry/grimoire`, Playwright CLI, Postman CLI, optional Flourish SDK |

**Fit:** Individual developers wanting a **batteries-included** agent roster — **conflicts** with pi-flow's own agents (`agents/`, paperflow policy) if both sync to `~/.pi/agent/agents/`.

---

## Add to pi-flow?

| Package | Verdict | Reason |
|---------|---------|--------|
| **gitnexus / pi-gitnexus** | **Optional per repo** | Heavy indexing; MCP overlap with existing stack |
| **pi-astro** | **Avoid in pi-flow monorepo** | Duplicate subagents + conflicting agent namespace |
| **pi-flow default** | **No change** | slot-05 catalog already covers bundled set |

---

## If adopting pi-gitnexus

1. Install after pi-flow: `pi install npm:pi-gitnexus@0.6.3`
2. Index target repo once (see GitNexus docs)
3. Document in project `AGENTS.md` — not pi-flow upstream unless product decision

---

## References

- [gitnexus](https://www.npmjs.com/package/gitnexus)
- [pi-gitnexus](https://www.npmjs.com/package/pi-gitnexus)
- [@astrofoundry/pi-astro](https://www.npmjs.com/package/@astrofoundry/pi-astro)
