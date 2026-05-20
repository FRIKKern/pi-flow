# pi-flow bundled extensions — importance ranking (Browserstorm 18/20)

**Source:** `package.json` → `pi.extensions` (slot-05 catalog)  
**Audience:** New pi-flow users; **headless** = skip optional Cursor provider

---

## Summary

Ten extensions load in fixed order: **seven first-party pi-flow modules**, then **pi-cursor-provider**, **pi-mcp-adapter**, **pi-subagents**. Ranking below is **onboarding priority**, not load-order (setup must stay first).

---

## Ranked for new users

| Rank | Extension | Priority | Headless skip? |
|------|-----------|----------|----------------|
| 1 | **pi-flow-setup** | **Critical** — settings, agents, deps, Browserbase | No |
| 2 | **pi-flow-host** | **Critical** — paperflow lifecycle, host tools | No |
| 3 | **pi-subagents** (npm) | **Critical** — delegation, storm, researcher | No |
| 4 | **pi-mcp-adapter** (npm) | **High** — Browserbase / MCP | No |
| 5 | **pi-flow-subagents** | **High** — roster, `/pf-storm`, storm recovery | No |
| 6 | **pi-flow-sessions** | **Medium** — auto-continue, naming | Optional |
| 7 | **pi-flow-memory** | **Medium** — journal recall | Optional |
| 8 | **pi-flow-statusline** | **Low** — UX polish | Yes |
| 9 | **pi-flow-progress** | **Low** — stall rescue | Yes |
| 10 | **pi-cursor-provider** | **Optional** — Cursor subscription models only | **Yes (headless)** |

---

## Rationale

### Tier 1 — cannot run paperflow without

- **setup** — merges defaults, installs agents, beads, MCP config.
- **host** — goal → plan → build orchestration and cmux integration.
- **pi-subagents** — `subagent` tool, builtin researchers/workers.

### Tier 2 — expected for real workflows

- **mcp-adapter** — external web and MCP servers without token bloat.
- **pi-flow-subagents** — agentstorm UX, control-event recovery, `/pf-agents`.

### Tier 3 — quality of life

- **sessions** / **memory** — long-running boss sessions; safe to disable in short CI bots.
- **statusline** / **progress** — TUI enhancements; no-op value in headless RPC.

### Tier 4 — provider-specific

- **pi-cursor-provider** — only if using Cursor OAuth / Composer; pi-flow defaults `composer-2.5` in settings. **Skip** on headless servers using Anthropic/OpenAI API keys only.

---

## Child session behavior

First-party extensions often **skip boss-only hooks** when `PI_SUBAGENT_CHILD` — reduces crashes during storms. Bundled npm extensions still load unless configured off.

---

## References

- slot-05 (full extension catalog)
- `package.json` → `pi.extensions`
