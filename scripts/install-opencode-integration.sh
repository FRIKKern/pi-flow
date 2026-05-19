#!/usr/bin/env bash
# Install OpenCode paperflow plugin + merge opencode.json (no Pi session required).
set -eo pipefail

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }

PI_FLOW_PKG="${PI_FLOW_PKG:-}"
if [ -z "$PI_FLOW_PKG" ]; then
	for d in \
		"$HOME/.pi/agent/git/github.com/FRIKKern/pi-flow" \
		"$HOME/.pi/agent/packages/pi-flow"; do
		if [ -f "$d/assets/opencode-paperflow-plugin.js" ]; then
			PI_FLOW_PKG="$d"
			break
		fi
	done
fi

if [ -z "$PI_FLOW_PKG" ] || [ ! -f "$PI_FLOW_PKG/assets/opencode-paperflow-plugin.js" ]; then
	warn "pi-flow package not found — skip OpenCode integration (run quickstart again after pi install)"
	exit 0
fi

OC_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}"
OC_PLUGINS="$OC_CONFIG_DIR/plugins"
OC_JSON="$OC_CONFIG_DIR/opencode.json"
PLUGIN_NAME="pi-flow-paperflow.js"

mkdir -p "$OC_PLUGINS"
cp "$PI_FLOW_PKG/assets/opencode-paperflow-plugin.js" "$OC_PLUGINS/$PLUGIN_NAME"
ok "OpenCode plugin → $OC_PLUGINS/$PLUGIN_NAME"

if ! command -v jq >/dev/null 2>&1; then
	warn "jq missing — opencode.json not merged (brew install jq)"
	exit 0
fi

mkdir -p "$OC_CONFIG_DIR"
if [ ! -f "$OC_JSON" ]; then
	printf '%s\n' '{"$schema":"https://opencode.ai/config.json","plugin":[]}' >"$OC_JSON"
fi

tmp="$(mktemp -t pi-flow-oc-json.XXXXXX)"
jq --arg ref "./plugins/$PLUGIN_NAME" '
  .plugin = ((.plugin // []) | map(select(type == "string"))) |
  if (index("opencode-cmux") | not) then .plugin += ["opencode-cmux"] else . end |
  if (index($ref) | not) then .plugin += [$ref] else . end |
  .piFlow = ((.piFlow // {}) + {paperflow: true, registerOnSessionCreate: true})
' "$OC_JSON" >"$tmp" && mv "$tmp" "$OC_JSON"
ok "OpenCode config → $OC_JSON"

INSTALL_OC="${PI_FLOW_INSTALL_OPENCODE:-1}"
if [ "$INSTALL_OC" = "1" ] && ! command -v opencode >/dev/null 2>&1; then
	if command -v npm >/dev/null 2>&1; then
		info "Installing OpenCode CLI (opencode-ai)…"
		if npm install -g opencode-ai@latest --no-fund --no-audit 2>/dev/null; then
			ok "opencode: $(opencode --version 2>/dev/null | head -1 || echo installed)"
		else
			warn "opencode install failed — optional; Pi-only mode still works"
		fi
	else
		warn "npm missing — skip opencode CLI install"
	fi
elif command -v opencode >/dev/null 2>&1; then
	ok "opencode: $(opencode --version 2>/dev/null | head -1 || echo on PATH)"
fi
