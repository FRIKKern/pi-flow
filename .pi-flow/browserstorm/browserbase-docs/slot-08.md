# Concurrency overview — Research (Browserstorm 8/20)

**Source:** [optimizations/concurrency/overview.md](https://docs.browserbase.com/optimizations/concurrency/overview.md)  
**pi-flow context:** `piFlow.agentstorm.defaultConcurrency`, `skills/agentstorm/SKILL.md`, `lib/subagents-policy.md`

---

## Summary

Two limits apply; exceeding either returns **429**:

1. **Max concurrent browsers** — sessions running at once  
2. **Session creation limit** — new sessions per 60s window  

**Minimum billing:** each session has a **1-minute minimum** runtime even if closed early.

### Limits by plan (doc table)

| Plan | Max concurrent | Creates / minute |
|------|----------------|------------------|
| Free | **3** | 5 |
| Developer | 25 | 25 |
| Startup | 100 | 50 |
| Scale | 250+ | 150+ |

---

## pi-flow mapping

| Topic | Implication |
|-------|-------------|
| Agentstorm default | **4** concurrent researchers (`piFlow.agentstorm.defaultConcurrency`) |
| Free plan | Effective parallel browsers ≈ **min(4, 3) = 3** |
| Paid plans | Usually agentstorm is the bottleneck at 4 unless you raise concurrency |
| Storm hygiene | Each researcher should `browserbase_end` / MCP `end` when done |
| 429 errors | Back off; storm recovery retries; reduce concurrency |

**Rule:** `effective_parallel = min(agentstorm_concurrency, browserbase_plan_concurrency)`.

---

## References

- [Concurrency overview](https://docs.browserbase.com/optimizations/concurrency/overview.md)
