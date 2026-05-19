# Install scripts — contributor guide

pi-flow install paths must work for **everyone** on:

- **macOS default bash 3.2**
- **`curl … | bash`** (no `BASH_SOURCE[0]`)
- **`set -u` + empty arrays** (use `${arr+"${arr[@]}"}`, never bare `"${arr[@]}"` on possibly empty arrays)

## Entry points

| Script | Purpose |
|--------|---------|
| `scripts/quickstart.sh` | First install |
| `scripts/update.sh` | Refresh package + host |
| `scripts/install-deps.sh` | bd, jq, browse, cmux shell |
| `scripts/install-paperflow-host.sh` | paperflow `install.sh` (not paperflow quickstart) |
| `scripts/bootstrap-pi-flow.sh` | Post-install: Pi settings, subagents, OpenCode plugin (calls `bootstrap.mjs`) |
| `scripts/install-opencode-integration.sh` | OpenCode plugin + `opencode.json` merge |
| `scripts/cmux-layout.sh` | Pi left + paperflow browser right (grill URL for <code>browserbase</code> slug) |
| `scripts/lib/bash-safe.sh` | Shared helpers + bundle download |

## Rules (required)

1. **Never `set -u` on curl entry scripts** — use `set -eo pipefail` only.
2. **Never `"${ARRAY[@]}"` when ARRAY may be empty** under nounset — use:
   ```bash
   bash "$cmd" ${ARRAY+"${ARRAY[@]}"}
   ```
3. **curl | bash** — call `pi_flow_init_scripts` / `pi_flow_fetch_script_bundle` from `scripts/lib/bash-safe.sh`; download all sibling scripts into one temp dir.
4. **Do not pipe** [paperflow quickstart](https://github.com/FRIKKern/paperflow/blob/main/scripts/quickstart.sh) from pi-flow — use `install-paperflow-host.sh` (paperflow quickstart had `INSTALL_ARGS[@]` bug on bash 3.2; upstream should use safe expansion).
5. **New install helper** — add to `pi_flow_fetch_script_bundle` names list in `bash-safe.sh`.

## Verify before merge

```bash
bash scripts/verify-install-scripts.sh
```

CI runs the same on every push/PR (`.github/workflows/verify-install-scripts.yml`).

## Verify mode (no npm/pi/git side effects)

```bash
PI_FLOW_VERIFY=1 bash scripts/quickstart.sh
PI_FLOW_VERIFY=1 bash scripts/update.sh
```

Checks that the script bundle resolves (local or downloaded).

## Environment (optional)

| Variable | Default | Purpose |
|----------|---------|--------|
| `PI_FLOW_INSTALL_OPENCODE` | `1` | Install `opencode-ai` global CLI during quickstart |
| `PI_FLOW_SKIP_BROWSERBASE` | `0` | Set `1` to skip `browse` install and MCP merge in bootstrap |
| `PI_FLOW_OPENCODE_SERVE` | unset | Set `1` to auto-start `opencode serve` on setup |
| `PI_FLOW_YES` | `0` | Unattended install (`1` = yes) |

## User troubleshooting

| Symptom | Fix |
|---------|-----|
| `BASH_SOURCE[0]: unbound variable` | Update pi-flow; use latest `quickstart.sh` / `update.sh` |
| `INSTALL_ARGS[@]: unbound variable` | From old paperflow quickstart; pi-flow ≥0.8.4 uses `install-paperflow-host.sh` |
| `install-cmux-shell.sh not found` | Update pi-flow; bundle download includes cmux scripts |
| `pi not found` | Script installs Pi via npm; need Node 20+ |
