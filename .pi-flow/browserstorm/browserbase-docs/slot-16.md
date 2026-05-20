# Zero data retention (ZDR) — Research (Browserstorm 16/20)

**Source:** [account/enterprise/zero-data-retention.md](https://docs.browserbase.com/account/enterprise/zero-data-retention.md)  
**pi-flow context:** Enterprise operators using pi-flow + Browserbase for regulated workloads

---

## Summary

**Zero Data Retention (ZDR)** — Enterprise feature. Sessions run without persisting **session logs**, **video recordings**, or **replay (RRweb)** to Browserbase storage.

| Artifact | Under ZDR |
|----------|-----------|
| Session logs | Not stored |
| Video `.mp4` | Not stored |
| Replay API | 404 after session |
| **Live View** | Still works (stream only, not stored) |

Pair with **BYOS** for downloads/contexts/uploads in customer S3.

**Per-session (any plan):** `logSession: false`, `recordSession: false` on session create.

**Account-wide ZDR:** contact Browserbase sales — no per-call flags needed once enabled.

---

## pi-flow mapping

| Audience | Guidance |
|----------|----------|
| Enterprise pi-flow users | Document ZDR + BYOS in security review; pi-flow does not auto-enable ZDR |
| Researchers | MCP sessions inherit account/project policy — no pi-flow code change |
| Compliance | ZDR addresses Browserbase-side retention; operator still controls what the **agent** writes to repo files |

---

## References

- [ZDR](https://docs.browserbase.com/account/enterprise/zero-data-retention.md)
- [BYOS setup](https://docs.browserbase.com/account/enterprise/byos-setup-guide)
