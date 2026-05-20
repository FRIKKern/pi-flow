# @ollama/pi-web-search — Research (Browserstorm 8/20)

**Package:** [@ollama/pi-web-search](https://www.npmjs.com/package/@ollama/pi-web-search)  
**Repository:** [ollama/pi-web-search](https://github.com/ollama/pi-web-search)  
**pi-flow context:** External web research defaults to **researcher** + Browserbase MCP (`lib/browser-routing.md`); not bundled in `package.json`

---

## Summary

`@ollama/pi-web-search` is a minimal Pi extension (4 files, **0.0.5**, March 2026) that exposes two tools — `ollama_web_search` and `ollama_web_fetch` — backed by a **local Ollama** instance's web APIs. It is an alternative to **Browserbase MCP** / **pi-web-access** for teams that already run Ollama with web search enabled and want zero cloud browser cost.

**Recommendation for pi-flow:** **Optional, not bundled.** pi-flow's orchestration path assumes **researcher** + hosted or stdio **Browserbase MCP** for JS-heavy pages, live sessions, and agentstorm parallelism. Add `@ollama/pi-web-search` only for **local-only** or **Ollama-centric** setups where Browserbase credentials are unavailable.

---

## Version

| Field | Value |
|-------|--------|
| **Latest** | `0.0.5` (2026-03-28) |
| **Keywords** | `pi-package`, `pi-extension`, `web-search`, `ollama` |
| **Extension entry** | `./index.ts` via `pi.extensions` |
| **License** | MIT |

---

## Tools

| Tool | Purpose |
|------|---------|
| `ollama_web_search` | Real-time web search via Ollama |
| `ollama_web_fetch` | Fetch and extract content from a URL |

---

## Requirements

| Requirement | Notes |
|-------------|--------|
| Pi coding agent | `@earendil-works/pi-coding-agent` |
| Ollama running | `ollama serve`; web search/fetch enabled |
| `OLLAMA_HOST` | Must match your Ollama endpoint |

---

## Install

```bash
pi install npm:@ollama/pi-web-search
```

---

## vs Browserbase researcher (pi-flow default)

| Dimension | `@ollama/pi-web-search` | pi-flow **researcher** + Browserbase MCP |
|-----------|-------------------------|------------------------------------------|
| **Runtime** | Local Ollama | Cloud browsers |
| **JS / SPAs** | Ollama fetch quality | Stagehand navigate/act/extract |
| **Parallel storm** | Tool-level only | Plan concurrency caps sessions |
| **pi-flow wiring** | Manual install | `/pi-flow-browserbase-setup` |

---

## Recommendation

| Verdict | Detail |
|---------|--------|
| **pi-flow default** | **Skip** |
| **Optional add** | Local Ollama labs only |
| **Pin** | `0.0.5` |

---

## References

- [npm: @ollama/pi-web-search](https://www.npmjs.com/package/@ollama/pi-web-search)
- pi-flow: `docs/BROWSERBASE.md`, `lib/browser-routing.md`
