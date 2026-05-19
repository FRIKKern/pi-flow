# pi-flow and upstream

pi-flow is a **Pi package** implementing [paperflow](https://github.com/FRIKKern/paperflow). Not a fork of [pi-mono](https://github.com/earendil-works/pi).

## Upstream

| Project | Role |
|---------|------|
| **[paperflow](https://github.com/FRIKKern/paperflow)** | Source of truth for lifecycle, HTML, Beads, thresholds |
| [pi-subagents](https://github.com/nicobailon/pi-subagents) | Delegation |
| [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MCP |
| [pi-cursor-provider](https://github.com/ndraiman/pi-cursor-provider) | Optional npm dep — Cursor subscription models only |

## Local forks

To vendor `pi-cursor-provider` for hacking: `git clone` into `packages/` and point `package.json` `dependencies` at the path. Not required for normal installs.

## npm name

`pi-flow` — install: `pi install git:github.com/FRIKKern/pi-flow`
