# pi-flow

**Repo:** https://github.com/FRIKKern/pi-flow

**Paperflow in Pi** — for [cmux](https://github.com/manaflow-ai/cmux). Same lifecycle as [FRIKKern/paperflow](https://github.com/FRIKKern/paperflow): Goal → HTML plan → **grill** → build (Beads) → review. Cursor/Composer 2.5 is just our **default model**, not the product name.

## Why pi-flow exists

[paperflow](https://github.com/FRIKKern/paperflow) is built for Claude Code + cmux (daemon, grill bridge, HTML @ :8767). **pi-flow** is the same orchestration discipline for **Pi**: subagents, MCP in research phases, and skills named like paperflow (`goal`, `plan`, `build`, …).

## CMUX stack

```text
paperflow host   →  HTML, grill Submit, dock (optional)
pi-flow in Pi    →  /skill:goal | plan | build | review | autopilot
cmux             →  terminal + browser panes
```

```bash
# Paperflow host (HTML + bridge) — strongly recommended in cmux
curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh | bash

# Pi + pi-flow
npm install -g @earendil-works/pi-coding-agent
pi install git:github.com/FRIKKern/pi-flow
pi
/pi-flow-setup
```

**Model (optional default):** `/login cursor` then `/model` → `composer-2.5`. Use any provider Pi supports — pi-flow does not require Cursor.

## Skills (mirror paperflow)

| Pi | paperflow |
|----|-------------|
| `/skill:goal` | `/paperflow:goal` |
| `/skill:plan` | `/paperflow:plan` |
| `/skill:build` | `/paperflow:build` |
| `/skill:review` | `/paperflow:review` |
| `/skill:autopilot` | `/paperflow:autopilot` |
| `/skill:resume` | `/paperflow:resume` |

```text
/skill:autopilot "rewrite onboarding"
```

## Agents (`pi-flow.*`)

| Agent | paperflow equivalent |
|-------|----------------------|
| `doc-writer` | `paperflow-doc-writer` |
| `bd-keeper` | `paperflow-bd-keeper` |
| `scout`, `researcher` | research / MCP |
| `worker`, `reviewer` | build / review |

Bundled: `pi-subagents`, `pi-mcp-adapter`. Optional dep: `pi-cursor-provider` (Cursor subscription models only).

## Docs

- [docs/PAPERFLOW.md](./docs/PAPERFLOW.md) — mapping to upstream
- [docs/CMUX.md](./docs/CMUX.md) — cmux layout
- [lib/paperflow-thresholds.md](./lib/paperflow-thresholds.md)

## Develop

```bash
git clone https://github.com/FRIKKern/pi-flow.git
cd pi-flow && npm install && pi -e .
```

MIT — see [LICENSE](./LICENSE).
