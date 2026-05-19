# Beads (bd) in pi-flow

paperflow uses [Beads](https://github.com/gastownhall/beads) as the task graph. pi-flow installs and wires `bd` for you.

## What we install

| Method | When |
|--------|------|
| **`@beads/bd` npm** | Bundled in pi-flow (`node_modules/.bin/bd`) when you `pi install` |
| **Global `bd`** | `/pi-flow-setup` runs `npm install -g @beads/bd` if `bd` not on PATH |
| **`bd init`** | Setup creates `.beads/` in your project repo |

Shell one-liner (same logic):

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/install-deps.sh | bash
```

## Pi tools vs TUI extensions

| Approach | pi-flow choice |
|----------|----------------|
| **`paperflow_beads` tool** | Orchestrator: `ready`, `show`, `init` |
| **`pi-flow.bd-keeper` agent** | All mutations (`create`, `claim`, `close`, `dep`) |
| **[@edmundmiller/pi-beads](https://www.npmjs.com/package/@edmundmiller/pi-beads)** | Optional — interactive task TUI (`ctrl+x`). Not bundled; overlaps paperflow skills |

We follow the same pattern as Beads’ own docs: install `@beads/bd`, `bd init`, use from agents — not a second task UI inside pi-flow.

## Commands

| Pi | Shell |
|----|-------|
| `/pi-flow-setup` | deps + `bd init` + host + agents |
| `/pi-flow-install-deps` | beads + jq only |
| `/pi-flow-update` | update instructions + dep check |
| `paperflow_beads` | programmatic `bd` |

## Updates

```bash
pi update git:github.com/FRIKKern/pi-flow
```

Then in Pi:

```text
/pi-flow-setup
```

Or re-run full quickstart:

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
```
