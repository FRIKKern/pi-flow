# paperflow × pi-flow

Same lifecycle as [paperflow](https://github.com/FRIKKern/paperflow). pi-flow adds Pi + cmux + three agents only.

## Skills

| paperflow | pi-flow |
|-----------|---------|
| `/paperflow:goal` | `/skill:goal` |
| `/paperflow:plan` | `/skill:plan` |
| `/paperflow:build` | `/skill:build` |
| `/paperflow:review` | `/skill:review` |
| `/paperflow:autopilot` | `/skill:autopilot` |
| `/paperflow:resume` | `/skill:resume` |

## Agents

| paperflow | pi-flow |
|-----------|---------|
| `paperflow-doc-writer` | `pi-flow.doc-writer` |
| `paperflow-bd-keeper` | `pi-flow.bd-keeper` |
| `paperflow-code-editor` | `worker` (pi-subagent) |
| `paperflow-researcher` | `researcher` (pi-subagent) |
| `paperflow-cmux-verifier` | `pi-flow.cmux-verifier` + `paperflow_verify` |

Host-only: daemon, auto-open, grill bridge — see `docs/HOST.md`.
