<p align="center">
  <strong>pi-flow</strong><br/>
  <sub>Paperflow in Pi · built for cmux · less is more</sub>
</p>

<p align="center">
  <a href="https://github.com/FRIKKern/pi-flow">GitHub</a> ·
  <a href="./docs/CMUX.md">CMUX</a> ·
  <a href="./lib/orchestrator.md">Orchestrator</a> ·
  <a href="./docs/BEST-PRACTICES.md">Design</a>
</p>

---

**pi-flow** runs the [paperflow](https://github.com/FRIKKern/paperflow) lifecycle inside [Pi](https://pi.dev/): **Goal → HTML plan → grill → build (Beads) → review** — with browser panes in [cmux](https://github.com/manaflow-ai/cmux) and grill **Submit** back to your terminal.

**Simple by design:** 6 skills · **3 custom agents** · pi-subagents for everything else · **boss/follow subagent UX** · one install command.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
```

One command installs **Pi**, **beads (`bd`)**, **jq**, **pi-flow**, **paperflow host** (`:8767`), **Pi settings**, and **OpenCode grill bridge** — no `/pi-flow-setup` required.

Unattended:

```bash
PI_FLOW_YES=1 curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
```

Install scripts are tested on **macOS bash 3.2** and **`curl | bash`** (see [docs/INSTALL-SCRIPTS.md](./docs/INSTALL-SCRIPTS.md)). If something breaks, run `bash scripts/verify-install-scripts.sh` in the repo and open an issue.

## Update

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/update.sh | bash
```

Or inside Pi:

```text
/pi-flow-update
/pi-flow-setup
/pi-flow-status
/pi-flow-handoff "continue build phase"
```

---

## First run (60 seconds)

**1. Shell** — cmux workspace (recommended):

```bash
cd your-repo
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/cmux-layout.sh | bash -s -- "$(pwd)" my-goal
```

**2. Pi** — terminal pane:

```text
/skill:autopilot "One sentence describing what you want to achieve"
```

(`/pi-flow-setup` is optional — quickstart already applied defaults.)

**3. Browser** — right pane → `http://localhost:8767/` (or grill URL via `cmux-layout.sh … browserbase`)

Plans and grills open automatically. Click **Submit** on a grill to send answers back to Pi.

**External web (Browserbase)** — after install, in Pi:

```text
/skill:browserbase
mcp({ server: "browserbase" })
# researcher subagent for real site research:
# dispatch researcher: "Summarize https://docs.browserbase.com/features"
```

---

## What you get

### Skills (paperflow lifecycle)

| Skill | Purpose |
|-------|---------|
| `goal` | Open Goal, Beads epic, pointers |
| `plan` | Draft → **grill** (pause) → revise |
| `build` | Claim tasks, implement, close |
| `review` | Approve or reopen |
| `autopilot` | Chain the above |
| `resume` | Switch active Goal |
| `pi-flow` | Router — “what should I run?” |
| `browserbase` | Cloud browser (MCP + browse CLI) for external web |
| `cmux-browser` | paperflow HTML on `:8767` (when cmux detected) |

### Agents

| Layer | Who |
|-------|-----|
| **pi-flow (3)** | `doc-writer` · `bd-keeper` · `cmux-verifier` |
| **pi-subagents** | `worker` · `reviewer` · `oracle` · `planner` · `scout` · `researcher` |
| **Follow UX** | `/pf-agents` · `/pf-follow` · `/pf-boss` · `/pf-watch` ([docs](./docs/SUBAGENTS-UX.md)) |

We do **not** ship ten duplicate roles — see [lib/orchestrator.md](./lib/orchestrator.md).

### Pi tools

`paperflow_host` · `paperflow_verify` · `paperflow_beads` · `paperflow_cmux` · `paperflow_active_goal`

**Browser:** [cmux](./docs/CMUX.md) for paperflow docs · [Browserbase](./docs/BROWSERBASE.md) for external sites (`mcp({ server: "browserbase" })`)

### Bundled

`pi-subagents` · `pi-mcp-adapter` · `@beads/bd` · optional `pi-cursor-provider` (Composer 2.5 default)

---

## Architecture

```text
┌────────────────────────────────────────────────────────────┐
│  cmux                                                       │
│  ┌─────────────────┐    ┌───────────────────────────────┐  │
│  │ Pi  /skill:plan │    │ Browser  :8767/paperflow/     │  │
│  │ grill ← Submit  │◄───│ paperflow host (external)     │  │
│  └─────────────────┘    └───────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
         Skills = playbooks
         Extensions = tools + session register
         Host = not embedded in Pi ([why](./docs/HOST.md))
```

---

## Commands

| Command | What |
|---------|------|
| `/pi-flow-setup` | Settings, deps, `bd init`, agents, host |
| `/pi-flow-update` | `pi update` + refresh deps + agents |
| `/pi-flow-doctor` | Live health check |
| `/pi-flow-install-deps` | beads + jq only |
| `/pi-flow-cmux-layout` | cmux workspace recipe |
| `/pi-flow-browserbase-setup` | browse CLI + Browserbase MCP config |
| Shell `pf` / `pif` | cmux boss layout (cc vs Pi) — installed on setup |

---

## When to use what

| You want | Run |
|----------|-----|
| Everything from one sentence | `/skill:autopilot "…"` |
| Step by step | `/skill:goal` then `/skill:plan` … |
| Fix install | `/pi-flow-setup` → `/pi-flow-doctor` |
| Upgrade pi-flow | `/pi-flow-update` |

---

## Docs

| Doc | Topic |
|-----|--------|
| [lib/orchestrator.md](./lib/orchestrator.md) | Who dispatches whom |
| [docs/SUBAGENTS-UX.md](./docs/SUBAGENTS-UX.md) | Boss · follow · cmux mirror |
| [docs/CMUX.md](./docs/CMUX.md) | CMUX expert guide |
| [docs/BEADS.md](./docs/BEADS.md) | beads install |
| [docs/HOST.md](./docs/HOST.md) | External daemon |
| [docs/BEST-PRACTICES.md](./docs/BEST-PRACTICES.md) | vs Superpowers / OMC |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `bd` missing | `/pi-flow-install-deps` or re-run quickstart |
| Host down | `paperflow_host ensure` or quickstart |
| Grill Submit silent | `curl -sf localhost:8767/health` |
| Stale agents after update | `/pi-flow-update` then `/reload` |
| Old `pi-flow.worker` in list | `/pi-flow-setup` prunes to 3 agents |

---

## Development

```bash
git clone https://github.com/FRIKKern/pi-flow.git
cd pi-flow && npm install
pi -e .
/pi-flow-setup
```

MIT · [FRIKKern/pi-flow](https://github.com/FRIKKern/pi-flow)
