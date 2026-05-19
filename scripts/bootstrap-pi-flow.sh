#!/usr/bin/env bash
# One-shot pi-flow bootstrap after pi install — settings, agents, host, OpenCode. No Pi session needed.
set -eo pipefail

_CALLER="${BASH_SOURCE[0]:-}"
if [ -n "$_CALLER" ] && [ -f "$_CALLER" ]; then
	_SCRIPT_DIR="$(cd "$(dirname "$_CALLER")" && pwd)"
	# shellcheck source=lib/bash-safe.sh
	source "${_SCRIPT_DIR}/lib/bash-safe.sh"
else
	PI_FLOW_RAW_BASE="${PI_FLOW_RAW_BASE:-https://raw.githubusercontent.com/FRIKKern/pi-flow/main}"
	_TMP="$(mktemp -d -t pi-flow-bootstrap.XXXXXX)"
	trap 'rm -rf "$_TMP"' EXIT
	mkdir -p "${_TMP}/lib"
	curl -fsSL "${PI_FLOW_RAW_BASE}/scripts/lib/bash-safe.sh" -o "${_TMP}/lib/bash-safe.sh" \
		|| { echo "✗ could not download bash-safe.sh" >&2; exit 1; }
	# shellcheck source=lib/bash-safe.sh
	source "${_TMP}/lib/bash-safe.sh"
	pi_flow_fetch_script_bundle "$_TMP"
fi

PI_FLOW_PKG="${PI_FLOW_PKG:-$HOME/.pi/agent/git/github.com/FRIKKern/pi-flow}"

pi_flow_info "pi-flow bootstrap (settings, agents, host, OpenCode)"

if [ ! -d "$PI_FLOW_PKG" ]; then
	pi_flow_warn "pi-flow package missing at $PI_FLOW_PKG — skip bootstrap"
	exit 0
fi

if command -v node >/dev/null 2>&1 && [ -f "$PI_FLOW_PKG/scripts/bootstrap.mjs" ]; then
	(cd "$PI_FLOW_PKG" && node --experimental-strip-types scripts/bootstrap.mjs) \
		|| pi_flow_warn "node bootstrap had issues"
else
	pi_flow_warn "node missing — using shell fallback only"
fi

OC_SCRIPT="$(pi_flow_script_path install-opencode-integration.sh || true)"
if [ -n "$OC_SCRIPT" ] && [ -f "$OC_SCRIPT" ]; then
	PI_FLOW_PKG="$PI_FLOW_PKG" bash "$OC_SCRIPT" || pi_flow_warn "OpenCode shell step had issues"
fi

if command -v bd >/dev/null 2>&1 && { [ -d ".git" ] || [ -f "package.json" ]; } && [ ! -d ".beads" ]; then
	bd init 2>/dev/null && pi_flow_ok "beads initialized in $(pwd)" || true
fi

DAEMON_URL="${PAPERFLOW_DAEMON_URL:-http://localhost:8767}"
if curl -sf --max-time 2 "${DAEMON_URL}/health" >/dev/null 2>&1; then
	pi_flow_ok "paperflow host up (${DAEMON_URL})"
else
	spawn="${HOME}/.local/bin/paperflow-daemon-spawn"
	if [ -x "$spawn" ]; then
		"$spawn" 2>/dev/null || true
		sleep 1
	fi
	if curl -sf --max-time 2 "${DAEMON_URL}/health" >/dev/null 2>&1; then
		pi_flow_ok "paperflow host started"
	else
		pi_flow_warn "paperflow host not up — Pi will auto-ensure on session_start"
	fi
fi

pi_flow_ok "bootstrap complete — open Pi and run /skill:autopilot (no /pi-flow-setup required)"
