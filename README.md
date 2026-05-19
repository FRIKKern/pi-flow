<p align="center">
  <strong>pi-flow</strong><br/>
  Paperflow lifecycle in <a href="https://pi.dev/">Pi</a>, built for <a href="https://github.com/manaflow-ai/cmux">cmux</a>
</p>

<p align="center">
  <a href="https://github.com/FRIKKern/pi-flow">GitHub</a> ·
  <a href="./docs/CMUX.md">CMUX guide</a> ·
  <a href="./docs/PAPERFLOW.md">Paperflow mapping</a> ·
  <a href="./docs/EXTENSIONS.md">Extensions</a>
</p>

---

**pi-flow** is a [Pi package](https://github.com/earendil-works/pi) that brings [FRIKKern/paperflow](https://github.com/FRIKKern/paperflow) to your terminal: **Goal → HTML plan → grill → build (Beads) → review** — with cmux browser panes, Dock feeds, and grill **Submit** routed back to Pi.

Composer 2.5 via Cursor is our **default model**, not the product name. Use any provider Pi supports.

## Install in 60 seconds

**One command** (macOS — installs Pi, paperflow host, and pi-flow):

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
```

**Or step by step:**

```bash
# 1. Pi
npm install -g @earendil-works/pi-coding-agent

# 2. pi-flow package
pi install git:github.com/FRIKKern/pi-flow

# 3. paperflow host (daemon :8767, auto-open, grill bridge)
curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh | bash

# 4. cmux (optional but recommended)
brew tap manaflow-ai/cmux && brew install --cask cmux
```

## First session

### A — With cmux (recommended)

```bash
# In a normal shell (not Pi yet):
git clone https://github.com/your-org/your-repo.git && cd your-repo
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/cmux-layout.sh | bash -s -- "$(pwd)" my-first-goal
```

Open Pi in the **left terminal pane**, then:

```text
/pi-flow-setup
/login cursor          # optional — enables composer-2.5 default
/skill:autopilot "Describe your goal in one sentence"
```

Split the **right pane** to `http://localhost:8767/` — plans and grills open there automatically.

### B — Pi only (no cmux)

```bash
cd your-repo && pi
```

```text
/pi-flow-setup
/skill:goal
```

Grill answers happen in chat; doc verify may `SKIP` without the host. Works, but cmux is the target experience.

## What you get

| Layer | What |
|-------|------|
| **Skills** | `goal` · `plan` · `build` · `review` · `autopilot` · `resume` |
| **CMUX skills** | `cmux` · `cmux-browser` (loaded when cmux is detected) |
| **Pi tools** | `paperflow_host` · `paperflow_verify` · `paperflow_beads` · `paperflow_cmux` · `paperflow_active_goal` |
| **Subagents** | `pi-flow.doc-writer` · `bd-keeper` · `worker` · `scout` · … |
| **Bundled** | `pi-subagents` · `pi-mcp-adapter` · optional `pi-cursor-provider` |

```text
┌─────────────────────────────────────────────────────────────┐
│  cmux workspace                                              │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ Terminal (Pi)    │  │ Browser (:8767/paperflow/…)       │ │
│  │ /skill:plan      │  │ Plans · grills · auto-open        │ │
│  │ grill ← Submit   │◄─┤ paperflow daemon + grill bridge   │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Commands

| Command | Purpose |
|---------|---------|
| `/pi-flow-setup` | Settings, agents (`.pi/agents/pi-flow/`), next steps |
| `/pi-flow-doctor` | Checklist — cmux, host, agents |
| `/pi-flow-cmux-layout` | Print `cmux-layout.sh` for this repo |

## Skills ↔ paperflow

| Pi (`/skill:…`) | Claude Code paperflow |
|-----------------|------------------------|
| `goal` | `/paperflow:goal` |
| `plan` | `/paperflow:plan` |
| `build` | `/paperflow:build` |
| `review` | `/paperflow:review` |
| `autopilot` | `/paperflow:autopilot` |
| `cmux` | — (pi-flow) |

## Architecture (short)

- **Skills** = playbooks — lifecycle stays here
- **Extensions** = tools + session register (daemon stays **external**)
- **paperflow host** = `:8767` — `paperflow_host ensure`, not embedded in Pi

| Doc | Topic |
|-----|--------|
| [docs/BEST-PRACTICES.md](./docs/BEST-PRACTICES.md) | Pi patterns vs paperflow anti-patterns |
| [docs/HOST.md](./docs/HOST.md) | Why daemon is external + ensure flow |
| [docs/EXTENSIONS.md](./docs/EXTENSIONS.md) | Extension split |

## Docs

| Doc | Content |
|-----|---------|
| [docs/CMUX.md](./docs/CMUX.md) | CMUX expert reference |
| [docs/PAPERFLOW.md](./docs/PAPERFLOW.md) | Upstream mapping |
| [docs/EXTENSIONS.md](./docs/EXTENSIONS.md) | Extension design |
| [lib/cmux-reference.md](./lib/cmux-reference.md) | Cheat sheet |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `not in cmux` warning | Run Pi inside cmux terminal surface; check `CMUX_WORKSPACE_ID` |
| Grill Submit does nothing | `curl -sf localhost:8767/health`; restart paperflow host |
| `paperflow_verify` → SKIP | Install paperflow host (`quickstart.sh`) |
| Subagents missing | Run `/pi-flow-setup` — installs `.pi/agents/pi-flow/` |
| Wrong model | `/model` or edit `~/.pi/agent/settings.json` |

## Development

```bash
git clone https://github.com/FRIKKern/pi-flow.git
cd pi-flow && npm install
pi -e .          # load package from cwd
/pi-flow-setup
```

## License

MIT · [FRIKKern/pi-flow](https://github.com/FRIKKern/pi-flow)
