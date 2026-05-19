# CMUX — primary runtime for pi-flow

pi-flow is built to run **inside [cmux](https://github.com/manaflow-ai/cmux)** with the **[paperflow host](https://github.com/FRIKKern/paperflow)**. This document is the CMUX expert reference for orchestrators and humans.

## Stack

```text
┌─ cmux window ─────────────────────────────────────────────────┐
│ Workspace (CMUX_WORKSPACE_ID = UUID)                          │
│  ├─ Surface [terminal]  →  Pi (pi-flow)  ← you orchestrate here │
│  ├─ Surface [browser]   →  http://localhost:8767/paperflow/…  │
│  └─ Dock (⌥⌘B)        →  paperflow feeds (optional)            │
│ Hidden workspace      →  paperflow-daemon (supervisor)          │
└───────────────────────────────────────────────────────────────┘
```

| Layer | Install |
|-------|---------|
| cmux | `brew tap manaflow-ai/cmux && brew install --cask cmux` |
| paperflow host | `curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh \| bash` |
| pi-flow | `pi install git:github.com/FRIKKern/pi-flow` → `/pi-flow-setup` |

## Topology & handles

| Concept | Meaning |
|---------|---------|
| **Window** | macOS cmux window |
| **Workspace** | Sidebar tab (git branch, cwd, notifications) |
| **Pane** | Split region |
| **Surface** | Tab inside pane: **terminal** or **browser** |

Default CLI refs: `window:N`, `workspace:N`, `pane:N`, `surface:N`. UUIDs work as input.

```bash
cmux identify --json          # caller.surface_ref, workspace UUID
cmux tree --workspace "$CMUX_WORKSPACE_ID"
cmux list-panels              # all surfaces in workspace
cmux surface-health
```

## Environment variables

Set automatically in **cmux terminal surfaces** (required for pi-flow):

| Variable | Role |
|----------|------|
| `CMUX_WORKSPACE_ID` | Workspace UUID — paperflow sidecars, active-goal scope |
| `CMUX_SURFACE_ID` | Surface UUID — `cmux send`, session register |
| `PI_FLOW_SESSION_ID` | Optional stable id for grill bridge (else auto-generated) |

**Rule:** Run Pi only inside a cmux terminal surface when you want full paperflow integration. Outside cmux: `paperflow-cmux-detect` exits 1, docs fall back to OS browser, verify → SKIP.

## Recommended first-time layout

```bash
# From repo root (after paperflow + pi-flow install)
./node_modules/pi-flow/scripts/cmux-layout.sh "$(pwd)" my-goal
# Or from pi-flow clone:
scripts/cmux-layout.sh ~/path/to/repo my-goal
```

This runs `cmux new-workspace --name pi-flow:… --cwd … --command pi --focus true`. Then manually split right and open browser to `http://localhost:8767/` if not auto-created.

**Manual layout:**

```bash
cmux new-split right --focus false
cmux new-pane --type browser --direction right --url http://localhost:8767/
```

## paperflow doc pipeline in cmux

### 1. Write HTML (doc-writer subagent)

Paths: `~/docs/paperflow/{plans,grills,goals,specs}/…` — see `lib/paperflow-paths.md`.

### 2. Auto-open (paperflow hook)

On Write/Edit under `~/docs/paperflow/`:

1. Read sidecar `~/.paperflow/cmux-docs-surface.<CMUX_WORKSPACE_ID>.handle`
2. `cmux browser <handle> goto <url>` if live
3. Else adopt focused browser / spawn via `cmux browser open`
4. Else OS `open` fallback

Orchestrator: **do not** fight auto-open by opening duplicate browser tabs.

### 3. Verify (after every plan/grill/goal write)

```bash
paperflow-doc-verify "http://localhost:8767/paperflow/plans/2026-05-19-foo.html" --kind plan
```

Or dispatch agent `pi-flow.cmux-verifier`.

| Verdict | Action |
|---------|--------|
| PASS | Close doc-write task |
| SKIP | cmux absent or surface not bound — OK without regression |
| WARN | Close + log |
| FAIL | Debug; keep task claimed |

Logs: `~/.paperflow/doc-verify.log`, `doc-verify-failures.log`.

### 4. Grill bridge (Pi pane)

1. User fills grill in **browser surface**, clicks Submit
2. `POST localhost:8767/build` → daemon looks up session
3. Daemon runs `cmux send "<message>"` + Return on registered **terminal surface**

**pi-flow must register** on session start:

```bash
pi-flow-session-register   # POST /sessions/register with cmux_workspace + cmux_surface
```

Pi extension calls this on `session_start`. Check `~/.paperflow/logs/pi-flow-session-register.log`.

Without register: grill shows connection errors; use **chat grill answers** as fallback (`Grill answers for <plan>: …`).

## CMUX browser API (paperflow docs)

Target surface from sidecar or `cmux browser open`:

```bash
HANDLE="surface:7"   # from auto-open log or browser open stdout

cmux browser "$HANDLE" goto "http://localhost:8767/paperflow/grills/foo-grill.html"
cmux browser "$HANDLE" wait --load-state complete --timeout-ms 8000
cmux browser "$HANDLE" wait --selector "pre.mermaid svg" --timeout-ms 5000
cmux browser "$HANDLE" errors list
cmux browser "$HANDLE" console list
cmux browser "$HANDLE" get text --selector h1
cmux browser "$HANDLE" screenshot --out /tmp/verify.png
```

Interactive grill (advanced):

```bash
cmux browser "$HANDLE" snapshot --interactive
cmux browser "$HANDLE" fill e3 "answer text" --snapshot-after
cmux browser "$HANDLE" click e9   # Submit — prefer native grill.js when host installed
```

**WKWebView limits:** no viewport emulation, network mocking, or Playwright trace — use **Browserbase MCP** (`/skill:browserbase`) or `chrome-devtools` MCP for heavy external web QA.

## Orchestrator command cheat sheet

| Priority | Command | When |
|----------|---------|------|
| P0 | `paperflow-cmux-detect` | Session start, `/pi-flow-doctor` |
| P0 | `pi-flow-session-register` | Pi session_start (automatic) |
| P0 | Trust auto-open after doc-writer | Plans/grills/goals |
| P0 | `paperflow-doc-verify <url>` | After each HTML artifact |
| P1 | `curl -sf localhost:8767/health` | Daemon up |
| P1 | `cmux identify --json` | Debug routing |
| P2 | `cmux notify --title pi-flow --body "…"` | User attention |
| P2 | `cmux set-status phase "build"` | Sidebar metadata |
| P3 | `cmux browser … snapshot --interactive` | Rare automation |

## paperflow-active-scope

When `CMUX_WORKSPACE_ID` is set, Goals scope per workspace (`cmux-<uuid>`). Two cmux workspaces → two independent Goals without collision.

```bash
# paperflow helper (when host installed)
paperflow-active-scope --read goal
```

## Dock

paperflow `install.sh` writes `~/.config/cmux/dock.json` with feeds:

- Active goal / phase / task
- bd ready queue
- Goal-path rail events
- auto-open log
- Doctor status

Toggle Dock: **⌥⌘B**. Per-repo override: `.cmux/dock.json`.

## Pi vs `pf` CLI

| Tool | Spawns |
|------|--------|
| `pf goal "…"` | Claude Code in new cmux workspace |
| pi-flow | **Pi** in cmux — use `/skill:goal` or `scripts/cmux-layout.sh` |

Do not assume `pf` targets Pi.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `paperflow-cmux-detect` → no-env | Open Pi in cmux terminal, not Terminal.app |
| Docs open in Safari | Run inside cmux; check `~/.paperflow/auto-open.log` |
| verify SKIP | Normal outside cmux; or write a doc first to bind sidecar |
| Grill Submit silent | `curl localhost:8767/health`; run `pi-flow-session-register`; read register log |
| Stale browser tab | `rm ~/.paperflow/cmux-docs-surface.*.handle`; rewrite doc |
| `cmux send` wrong pane | Re-register session; `cmux identify` |
| Daemon down | `paperflow-preflight` / restart cmux supervisor workspace |

## SSH / Cloud VM

`cmux ssh` / `cmux vm ssh` — remote terminal; `cmux browser` still controls **local Mac** browser via relay. Advanced; local pi-flow uses terminal + browser panes only.

## Further reading

| Doc | Location |
|-----|----------|
| cmux core skill | [cmux/skills/cmux](https://github.com/manaflow-ai/cmux/tree/main/skills/cmux) |
| cmux browser skill | [cmux/skills/cmux-browser](https://github.com/manaflow-ai/cmux/tree/main/skills/cmux-browser) |
| paperflow ARCHITECTURE | [FRIKKern/paperflow ARCHITECTURE.md](https://github.com/FRIKKern/paperflow/blob/main/ARCHITECTURE.md) |
| pi-flow cheat sheet | `lib/cmux-reference.md` |
| Pi skill | `/skill:cmux` |
