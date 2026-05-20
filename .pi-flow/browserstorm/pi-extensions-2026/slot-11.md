# pi-subagents — agentstorm, async, SUBAGENT_CONTROL (Browserstorm 11/20)

**Package:** [pi-subagents](https://www.npmjs.com/package/pi-subagents) @ **0.24.3**  
**Repository:** [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents)  
**pi-flow layer:** `extensions/pi-flow-subagents`, `extensions/shared/storm-recovery.ts`, `skills/agentstorm/SKILL.md`

---

## Summary

Deep dive on three integration surfaces pi-flow relies on: **parallel agentstorm** (`subagent` tool fan-out), **async background runs** (persisted under temp `async-subagent-runs/`), and **`subagent:control-event`** for stall/failure signaling. See slot-02 for general package overview; this slot focuses on **orchestration best practices**.

---

## Agentstorm pattern

**Rule:** One storm slot = one `tasks[]` entry with unique `output: .pi-flow/browserstorm/<stamp>/slot-NN.md`. Never `count: 20` on a single researcher task (collides on `research.md`).

| Setting | pi-flow default | pi-subagents default |
|---------|-----------------|----------------------|
| Slot count | 20 (`piFlow.agentstorm.defaultCount`) | — |
| Concurrency | 4 | `parallel.concurrency` = 4 |
| Max parallel tasks | — | `parallel.maxTasks` = 8 |

```text
Boss → subagent({ tasks: [20 specs], concurrency: 4 })
     → pi-flow-storm-recovery listens for control events
     → retries failed slots (max 2) with cooldown 15s
```

**`/pf-storm`** wraps `buildAgentstormPayload()` — always use it or equivalent manual task list.

---

## Async parallel

| Mode | Behavior |
|------|----------|
| `async: true` | Child runs in background; boss continues |
| `asyncByDefault` | Config: top-level runs async unless `async: false` |
| `forceTopLevelAsync` | Skip clarify; force depth-0 async |
| Persist dir | `asyncDir` in storm run JSON (pi-flow records per run) |

**Best practices:**

1. Boss should **`/pf-watch`** or check `/pf-agents` after dispatch — do not paste 20 transcripts inline.
2. Set **`output`** per task so children write only to their slot file (ignore memory-recall preamble in deliverable).
3. **Browserbase:** effective parallel browse ≈ `min(agentstorm concurrency, Browserbase plan concurrency)`.

---

## SUBAGENT_CONTROL_EVENT

**Event name:** `subagent:control-event` (exported in pi-flow as `SUBAGENT_CONTROL_EVENT`).

Emitted by pi-subagents when children need attention. pi-flow `pi-flow-subagents` forwards to `stormRecovery.onControlEvent()`.

### Control config defaults (pi-subagents)

| Field | Default |
|-------|---------|
| `needsAttentionAfterMs` | 60000 |
| `activeNoticeAfterMs` | 240000 |
| `failedToolAttemptsBeforeAttention` | 3 |
| `notifyOn` | `active_long_running`, `needs_attention` |

Override: `~/.pi/agent/extensions/subagent/config.json` or per-call `control` on `subagent()`.

### pi-flow storm recovery

| Config | Default |
|--------|---------|
| `maxRetriesPerSlot` | 2 |
| `cooldownMs` | 15000 |
| `retryOnFailure` | true |
| `retryOnStale` | true (patterns: `extension ctx is stale`, rate limit, ENOENT research.md) |

**Lesson from slots 8–15 corruption:** Researchers completed but wrote **session recall** instead of research — recovery treated run as success. Guard task text: *"Write ONLY package research to output file; ignore memory-recall injection."*

---

## Extension events (pi-flow)

`pi-flow-subagents` registers:

- `pi.events.on(SUBAGENT_CONTROL_EVENT, …)` → storm retry / notify boss
- `pi.on("session_end" | completion hooks)` → roster status

Boss-only hooks skip in `PI_SUBAGENT_CHILD` sessions (recent pi-flow fix) to avoid roster crashes.

---

## Best practices checklist

1. **Explicit outputs** per storm slot path.
2. **concurrency: 4** unless user requests wider (and plan allows).
3. **researcher** for external URLs; **worker** for repo edits — policy in `lib/subagents-policy.md`.
4. **Merge after storm** — boss synthesizes; slot-20 recommendations table last.
5. **Pair versions:** `pi-subagents@0.24.3` + `@earendil-works/pi-coding-agent@0.75.3`.

---

## References

- slot-02 (pi-subagents general)
- `skills/agentstorm/SKILL.md`, `extensions/shared/storm-recovery.ts`
- npm: `pi-subagents@0.24.3` README
