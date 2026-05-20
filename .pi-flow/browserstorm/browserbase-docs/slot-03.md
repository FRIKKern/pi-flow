# Browse CLI skill — Research (Browserstorm 3/20)

**Source:** [integrations/skills/browse-cli.md](https://docs.browserbase.com/integrations/skills/browse-cli.md)  
**pi-flow context:** `paperflow_browse` tool, `/pi-flow-browserbase-setup`, `docs/BROWSERBASE.md`

---

## Summary

The unified **`browse`** CLI drives browser automation, Browserbase cloud APIs, Functions, and skill installation from the terminal.

| Skill | Best for |
|-------|----------|
| `browser` | Interactive automation via `browse` CLI |
| `fetch` | Lightweight Fetch API retrieval |
| `functions` | Browserbase Functions workflows |
| `browse-cli` | Unified cloud + automation + skills |

**Command families:** `browse open`, `snapshot`, `click`, `fill`, `screenshot`; `browse cloud` (projects, sessions, contexts); `browse skills install`; `browse functions`.

**Install:** `npm install -g browse` then `browse skills install`.

---

## pi-flow mapping

| Topic | pi-flow |
|-------|---------|
| Install path | `/pi-flow-setup` / `/pi-flow-browserbase-setup` → `~/.pi/agent/bin/browse` |
| MCP tool | `paperflow_browse` — `cloud projects list`, `cloud sessions list`, remote open |
| vs MCP | Researchers use **MCP** (`mcp:browserbase`) for in-agent browse; `browse` CLI for boss/setup verification |
| cmux | Local `:8767` paperflow host — not replaced by `browse` |

Operators can verify credentials: `browse cloud projects list`.

---

## References

- [Browse CLI](https://docs.browserbase.com/integrations/skills/browse-cli.md)
