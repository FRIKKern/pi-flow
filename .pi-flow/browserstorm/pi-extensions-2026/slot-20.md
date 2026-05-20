# Production extension recommendations — Browserstorm 20/20

**Synthesis:** Slots 01–19 (pi-extensions-2026 storm)  
**Target:** pi-flow **boss** session (paperflow + agentstorm + Browserbase)  
**Date:** 2026-05-19

---

## Summary

Ranked table of **exact pins** for a stable production stack. **Core** = ship with pi-flow; **Optional** = install per environment; **Avoid** = known mismatch with pi-flow 0.9.1 + Pi 0.75.x.

---

## Ranked recommendations

| Tier | Component | Exact pin | Notes |
|------|-----------|-----------|-------|
| **Core** | `@earendil-works/pi-coding-agent` | **0.75.3** | Canonical CLI; Node **≥22.19** |
| **Core** | `pi-flow` | **0.9.1** | `pi install git:github.com/FRIKKern/pi-flow` |
| **Core** | `pi-subagents` | **0.24.3** | ≥0.24.1 for earendil scope |
| **Core** | `pi-mcp-adapter` | **2.6.1** | 2.x line only |
| **Core** | `@beads/bd` | **1.0.4** | beads CLI |
| **Core** | `typebox` | **1.1.x** (resolve from ^1.0.0) | Host schemas |
| **Optional** | `pi-cursor-provider` | **0.1.11** | Cursor/Composer OAuth; skip headless |
| **Optional** | `pi-web-access` | **0.10.7** | Non-Browserbase web tools |
| **Optional** | `pi-intercom` | latest compatible | Child↔parent intercom |
| **Optional** | `pi-gitnexus` | **0.6.3** | Code graph search |
| **Optional** | `@ollama/pi-web-search` | **0.0.5** | Local Ollama web only |
| **Avoid** | `@oh-my-pi/pi-coding-agent` | — | 15.x fork; scope skew |
| **Avoid** | `@mariozechner/pi-coding-agent` | — | Deprecated |
| **Avoid** | `pi-subagents` ≤0.24.0 | — | mariozechner imports |
| **Avoid** | `pi-mcp-adapter` 1.x | — | Obsolete MCP UX |
| **Avoid** | `@astrofoundry/pi-astro` | — | Duplicate subagents vs pi-flow agents |
| **Avoid** | `pi-acp` in package.json | — | Editor-only; not paperflow |
| **N/A** | Second Browserbase stack | — | Pick hosted MCP OR Vercel Stagehand app, not both per task |

---

## pi-flow first-party extensions (load order)

All **bundled** — do not disable unless you know the tradeoff:

1. pi-flow-setup  
2. pi-flow-host  
3. pi-flow-statusline  
4. pi-flow-progress  
5. pi-flow-subagents  
6. pi-flow-memory  
7. pi-flow-sessions  
8. pi-cursor-provider *(optional usage)*  
9. pi-mcp-adapter  
10. pi-subagents  

**Headless minimum:** keep 1–7 + 9–10; omit cursor provider from workflow (may remain installed).

---

## Runtime checklist

```bash
node -v                    # ≥ v22.19.0
pi --version               # 0.75.3
npm ls pi-subagents pi-mcp-adapter @beads/bd
/pi-flow-update
/reload
```

---

## Agentstorm guard (operational)

When dispatching researchers:

- Unique `output` per slot under `.pi-flow/browserstorm/<stamp>/`
- Task text: **"Write ONLY research to output file"** (prevents memory-recall corruption)
- `concurrency: 4` + Browserbase plan concurrency

---

## Cross-references

| Slot | Topic |
|------|--------|
| 01 | pi-coding-agent 0.75.x |
| 02–04 | subagents, mcp-adapter, cursor-provider |
| 05 | pi-flow extension catalog |
| 06 | npm pi-package ecosystem |
| 08–10 | ollama web, pi-acp, forks |
| 11 | agentstorm + SUBAGENT_CONTROL |
| 13 | beads |
| 15–19 | pins, MCP, Node, updates |

---

## References

- pi-flow `package.json` @ 0.9.1
- npm registry cross-check 2026-05-19
