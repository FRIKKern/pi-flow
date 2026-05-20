<p align="center">
  <strong>pi-flow</strong><br/>
  <sub>Paperflow in Pi · built for cmux · less is more</sub>
</p>

<p align="center">
  <a href="https://github.com/FRIKKern/pi-flow"><img src="https://img.shields.io/github/v/tag/FRIKKern/pi-flow?label=version&color=0969da" alt="version" /></a>
  <a href="https://github.com/FRIKKern/pi-flow/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A522.19.0-339933" alt="Node ≥22.19" />
  <img src="https://img.shields.io/badge/Pi-0.75.3-7c3aed" alt="pi-coding-agent 0.75.3" />
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#first-run">First run</a> ·
  <a href="#what-you-get">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#docs">Docs</a> ·
  <a href="#research">Research</a>
</p>

---

**pi-flow** runs the [paperflow](https://github.com/FRIKKern/paperflow) lifecycle inside [Pi](https://pi.dev/): **Goal → HTML plan → grill → build (Beads) → review** — with browser panes in [cmux](https://github.com/manaflow-ai/cmux) and grill **Submit** back to your terminal.

| Design principle | What it means |
|------------------|---------------|
| **Simple by design** | 6 lifecycle skills · **3 pi-flow agents** · pi-subagents for everything else |
| **Boss / follow UX** | Mirror child sessions in cmux — `/pf-follow`, `/pf-boss`, `/pf-watch` |
| **Dual browser** | cmux `:8767` for paperflow artifacts · Browserbase MCP for the open web |
| **One install** | Quickstart installs Pi, beads, host, settings, grill bridge — no manual wiring |

**Production stack:** Node **≥22.19.0** · `@earendil-works/pi-coding-agent@0.75.3` · `pi-flow@0.9.1` · `pi-subagents@0.24.3` · `pi-mcp-adapter@2.6.1` — see [docs/PI-EXTENSIONS.md](./docs/PI-EXTENSIONS.md).

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
```

Installs **Pi**, **beads (`bd`)**, **jq**, **pi-flow**, **paperflow host** (`:8767`), **Pi settings**, **Browserbase MCP + browse CLI**, and **OpenCode grill bridge**.

Unattended:

```bash
PI_FLOW_YES=1 curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
```

Skip Browserbase on CI: `PI_FLOW_SKIP_BROWSERBASE=1` · [install scripts](./docs/INSTALL-SCRIPTS.md)

### Update

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/update.sh | bash
```

In Pi:

```text
/pi-flow-update
/pi-flow-setup
/pi-flow-status
/pi-flow-handoff "continue build phase"
```

---

## First run

**1. cmux** — open paperflow in your **current** workspace:

```bash
cd your-repo
scripts/cmux-layout.sh my-goal
# first machine only:
# scripts/cmux-layout.sh --new-workspace "$(pwd)" my-goal
```

**2. Pi** — terminal pane:

```text
/skill:autopilot "One sentence describing what you want to achieve"
```

**3. Browser** — right pane → `http://localhost:8767/` (or grill URL from layout script)

Plans and grills open automatically. Click **Submit** on a grill to send answers back to Pi.

**External web** — delegate to a researcher (boss does not call MCP inline):

```text
/skill:browserbase
# researcher: "Summarize https://docs.browserbase.com/integrations/mcp/introduction"
```

---

## What you get

### Lifecycle skills

| Skill | Phase |
|-------|--------|
| [`goal`](./skills/goal/) | Open Goal, Beads epic, pointers |
| [`plan`](./skills/plan/) | Draft → **grill** (pause) → revise |
| [`build`](./skills/build/) | Claim tasks, implement, close |
| [`review`](./skills/review/) | Approve or reopen |
| [`autopilot`](./skills/autopilot/) | Chain the full lifecycle |
| [`resume`](./skills/resume/) | Switch active Goal |

**Routers & browser:** [`pi-flow`](./skills/pi-flow/) · [`browserbase`](./skills/browserbase/) · [`cmux-browser`](./skills/cmux-browser/) · [`agentstorm`](./skills/agentstorm/)

### Agents

| Layer | Who |
|-------|-----|
| **pi-flow (3)** | `doc-writer` · `bd-keeper` · `cmux-verifier` |
| **pi-subagents** | `worker` · `reviewer` · `oracle` · `planner` · `scout` · `researcher` |
| **Follow UX** | `/pf-agents` · `/pf-follow` · `/pf-boss` · `/pf-watch` — [guide](./docs/SUBAGENTS-UX.md) |

We do **not** ship ten duplicate roles — see [lib/orchestrator.md](./lib/orchestrator.md).

### Pi tools

`paperflow_host` · `paperflow_verify` · `paperflow_beads` · `paperflow_cmux` · `paperflow_active_goal`

### Bundled extensions

| Package | Role |
|---------|------|
| `pi-subagents` | Parallel delegation, chains, async runs |
| `pi-mcp-adapter` | Context-efficient MCP proxy (`mcp({ server: "browserbase" })`) |
| `@beads/bd` | Task graph — `bd ready`, claim, close |
| `pi-cursor-provider` | Optional Composer 2.5 default |

First-party: `pi-flow-setup` · `pi-flow-host` · `pi-flow-subagents` · `pi-flow-progress` · `pi-flow-memory` · `pi-flow-sessions` — [extensions map](./docs/EXTENSIONS.md)

---

## Agentstorm

Fan out **20 parallel researchers** (default) with controlled concurrency — ideal for doc sweeps, multi-URL recon, or burst implementation.

```text
/pf-storm research Browserbase MCP docs — one topic per slot, write .pi-flow/browserstorm/my-run/slot-NN.md
```

| Setting | Default |
|---------|---------|
| Slots | 20 (`maxCount` 128) |
| Concurrency | 4 (avoids opening 20 browsers at once) |
| Agent | `researcher` |
| Recovery | Auto-retry failed slots |

**Rule:** each slot gets a **unique output path** — never target repo-root `research.md` for parallel writes. See [skills/agentstorm](./skills/agentstorm/SKILL.md) and [lib/subagents-policy.md](./lib/subagents-policy.md).

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│  cmux                                                             │
│  ┌─────────────────────┐    ┌────────────────────────────────┐ │
│  │ Pi  boss session    │    │ Browser  localhost:8767/paperflow│ │
│  │ /skill:plan · grill │◄──►│ paperflow host (external daemon) │ │
│  │ subagent() × N      │    └────────────────────────────────┘ │
│  └──────────┬──────────┘                                         │
└─────────────┼────────────────────────────────────────────────────┘
              │ agentstorm (concurrency 4)
              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Child sessions (researcher / worker / scout)                     │
│  PI_SUBAGENT_CHILD=1 · memory recall skipped · per-slot outputs   │
└──────────┬───────────────────────────────────────────────────────┘
           │ mcp:browserbase (lazy)
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Hosted Browserbase MCP → Stagehand → cloud browser               │
└──────────────────────────────────────────────────────────────────┘

  Skills     = playbooks (what to do)
  Extensions = tools + session register + storm roster
  Host       = not embedded in Pi — see docs/HOST.md
```

### When to use which browser

| URL / task | Tool |
|------------|------|
| `http://localhost:8767/paperflow/…` | cmux pane · `paperflow_verify` |
| External sites, docs, live web | Browserbase MCP → `researcher` |
| Terminal smoke / cloud APIs | `browse` CLI · `paperflow_browse` |

Full matrix: [lib/browser-routing.md](./lib/browser-routing.md) · setup: [docs/BROWSERBASE.md](./docs/BROWSERBASE.md)

---

## Commands

| Command | What |
|---------|------|
| `/pi-flow-setup` | Settings, deps, `bd init`, agents, host |
| `/pi-flow-update` | `pi update` + refresh deps + agents |
| `/pi-flow-doctor` | Live health check |
| `/pi-flow-install-deps` | beads + jq only |
| `/pi-flow-cmux-layout` | cmux workspace recipe |
| `/pi-flow-browserbase-setup` | browse CLI + Browserbase MCP |
| `/pf-storm` | Parallel agentstorm burst |
| `/pf-follow` · `/pf-boss` | Subagent mirror UX |
| Shell `pf` / `pif` | cmux boss layout — installed on setup |

---

## When to use what

| You want | Run |
|----------|-----|
| Everything from one sentence | `/skill:autopilot "…"` |
| Step by step | `/skill:goal` → `/skill:plan` → … |
| Parallel research (20+ topics) | `/pf-storm …` with per-slot `output` paths |
| Fix install | `/pi-flow-setup` → `/pi-flow-doctor` |
| Upgrade pi-flow | `/pi-flow-update` then `/reload` |

---

## Docs

| Doc | Topic |
|-----|--------|
| [lib/orchestrator.md](./lib/orchestrator.md) | Who dispatches whom |
| [docs/PI-EXTENSIONS.md](./docs/PI-EXTENSIONS.md) | Production pins, extension architecture |
| [docs/SUBAGENTS-UX.md](./docs/SUBAGENTS-UX.md) | Boss · follow · cmux mirror |
| [docs/CMUX.md](./docs/CMUX.md) | CMUX expert guide |
| [docs/BROWSERBASE.md](./docs/BROWSERBASE.md) | MCP, browse CLI, concurrency |
| [docs/BEST-PRACTICES.md](./docs/BEST-PRACTICES.md) | vs Superpowers / OMC |
| [docs/BEADS.md](./docs/BEADS.md) | beads install |
| [docs/HOST.md](./docs/HOST.md) | External daemon |
| [docs/PAPERFLOW.md](./docs/PAPERFLOW.md) | Lifecycle spec |
| [docs/INSTALL-SCRIPTS.md](./docs/INSTALL-SCRIPTS.md) | quickstart / update |

---

## Research

Parallel **browserstorm** runs produce per-slot artifacts under `.pi-flow/browserstorm/` — indexed in [research.md](./research.md), not written to a shared file.

| Track | Synthesis | Slots |
|-------|-----------|-------|
| Pi extensions | [docs/PI-EXTENSIONS.md](./docs/PI-EXTENSIONS.md) | [pi-extensions-2026/](./.pi-flow/browserstorm/pi-extensions-2026/) (20) |
| Browserbase docs | [SYNTHESIS.md](./.pi-flow/browserstorm/browserbase-docs/SYNTHESIS.md) | [browserbase-docs/](./.pi-flow/browserstorm/browserbase-docs/) (20) |

Discovery for agents: [docs.browserbase.com/llms.txt](https://docs.browserbase.com/llms.txt)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `bd` missing | `/pi-flow-install-deps` or re-run quickstart |
| Host down | `paperflow_host ensure` or quickstart |
| Grill Submit silent | `curl -sf localhost:8767/health` |
| Stale agents after update | `/pi-flow-update` then `/reload` |
| Old `pi-flow.worker` in list | `/pi-flow-setup` prunes to 3 agents |
| MCP Browserbase auth fails | Add `browserbaseApiKey` query param or reload env — [BROWSERBASE.md](./docs/BROWSERBASE.md) |
| Storm slots all identical stubs | Update pi-flow (memory recall skip in children); re-storm with unique `output` paths |
| `reconcileRoster is not a function` | Run [update.sh](./scripts/update.sh) |

---

## Development

```bash
git clone https://github.com/FRIKKern/pi-flow.git
cd pi-flow && npm install
pi -e .
/pi-flow-setup
```

Verify install scripts: `bash scripts/verify-install-scripts.sh`

---

<p align="center">
  <sub>MIT · <a href="https://github.com/FRIKKern/pi-flow">FRIKKern/pi-flow</a> · paperflow + Pi + cmux</sub>
</p>
