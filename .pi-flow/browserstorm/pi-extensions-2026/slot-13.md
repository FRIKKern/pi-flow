# @beads/bd — Research (Browserstorm 13/20)

**Package:** [@beads/bd](https://www.npmjs.com/package/@beads/bd)  
**pi-flow pin:** `"@beads/bd": "^1.0.4"` in `package.json`  
**Role:** Issue tracker / agent memory for paperflow (`bd ready`, `bd create`, …)

---

## Summary

`@beads/bd` is an npm wrapper that installs the **native `bd` CLI** — a graph-based issue tracker designed for coding agents (Dolt-backed, `bd init` per project, `--json` for automation). pi-flow depends on it for **ready work detection** and paperflow lifecycle integration, not as a Pi extension.

**Recommendation:** Keep **`@beads/bd@^1.0.4`** (latest **1.0.4** on npm, May 2026). Run `bd` via `ensurePiFlowDeps` during setup/update.

---

## Version

| Field | Value |
|-------|--------|
| **npm latest** | `1.0.4` |
| **pi-flow range** | `^1.0.4` |
| **Description** | Lightweight memory system for coding agents; native binary |

---

## CLI role in pi-flow

| Command / concept | Use |
|-------------------|-----|
| `bd init` | Project-local database on setup |
| `bd ready` | Find unblocked issues for orchestrator |
| `bd create` / deps | Task graph during build phase |
| `--json` | Machine-readable output for agents |

`/pi-flow-setup` and `/pi-flow-update` call `ensurePiFlowDeps({ initBeads: true })`.

---

## vs markdown TODOs

| | beads `bd` | Markdown tasks |
|--|------------|----------------|
| Dependencies | `blocks`, `related`, parent-child | Manual |
| Ready queue | `bd ready` | Manual scan |
| Agent integration | First-class in AGENTS.md / paperflow | Fragile |

---

## Pin recommendation

| Environment | Pin |
|-------------|-----|
| **Production pi-flow** | `^1.0.4` → resolve **1.0.4** |
| **Global CLI** | `npm install -g @beads/bd@1.0.4` optional; pi-flow postinstall verifies |

No Pi `pi.extensions` entry — **dependency only**, not an extension slot.

---

## References

- [npm: @beads/bd](https://www.npmjs.com/package/@beads/bd)
- pi-flow: `package.json`, `extensions/pi-flow-setup`, paperflow docs
