# pi-flow memory (auto-created)

Durable session history — survives Pi restarts and handoffs.

| Path | Purpose |
|------|---------|
| `session/journal.jsonl` | Append-only event log |
| `session/SUMMARY.md` | Chronicler-maintained narrative |
| `registry.json` | Named agents + run/session bindings |
| `agents/<slug>/MEMORY.md` | Per-agent long-term memory |

Commands: `/pf-memory` · `/pf-name` · `/pf-recall` · `/pf-note` · `/pf-chronicler`

Commit this folder if you want team-shared memory; add secrets paths to `.gitignore` if needed.
