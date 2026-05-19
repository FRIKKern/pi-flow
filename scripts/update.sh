#!/usr/bin/env bash
# pi-flow update — package + deps + optional paperflow host refresh
set -eo pipefail

YES="${PI_FLOW_YES:-0}"
export PAPERFLOW_YES="$YES"

_CALLER="${BASH_SOURCE[0]:-}"
if [ -n "$_CALLER" ] && [ -f "$_CALLER" ]; then
	_SCRIPT_DIR="$(cd "$(dirname "$_CALLER")" && pwd)"
	# shellcheck source=lib/bash-safe.sh
	source "${_SCRIPT_DIR}/lib/bash-safe.sh"
	pi_flow_init_scripts "$_CALLER"
else
	PI_FLOW_RAW_BASE="${PI_FLOW_RAW_BASE:-https://raw.githubusercontent.com/FRIKKern/pi-flow/main}"
	_TMP="$(mktemp -d -t pi-flow-update.XXXXXX)"
	trap 'rm -rf "$_TMP"' EXIT
	mkdir -p "${_TMP}/lib"
	curl -fsSL "${PI_FLOW_RAW_BASE}/scripts/lib/bash-safe.sh" -o "${_TMP}/lib/bash-safe.sh" \
		|| { echo "✗ could not download bash-safe.sh" >&2; exit 1; }
	# shellcheck source=lib/bash-safe.sh
	source "${_TMP}/lib/bash-safe.sh"
	pi_flow_fetch_script_bundle "$_TMP"
fi

DEPS_SCRIPT="$(pi_flow_script_path install-deps.sh || true)"
PAPERFLOW_INSTALL="$(pi_flow_script_path install-paperflow-host.sh || true)"

if [ "${PI_FLOW_VERIFY:-0}" = "1" ]; then
	[ -n "$DEPS_SCRIPT" ] && [ -f "$DEPS_SCRIPT" ] || pi_flow_die "verify: install-deps.sh missing"
	[ -n "$PAPERFLOW_INSTALL" ] && [ -f "$PAPERFLOW_INSTALL" ] || pi_flow_die "verify: install-paperflow-host.sh missing"
	pi_flow_ok "update verify: script bundle ok"
	exit 0
fi

pi_flow_info "pi-flow update"

if ! command -v node >/dev/null 2>&1; then
	pi_flow_die "Node.js 20+ required — https://nodejs.org/"
fi

if ! command -v pi >/dev/null 2>&1; then
	pi_flow_info "Pi not found — installing @earendil-works/pi-coding-agent…"
	npm install -g @earendil-works/pi-coding-agent \
		|| pi_flow_die "failed to install Pi"
fi

if [ -n "$DEPS_SCRIPT" ] && [ -f "$DEPS_SCRIPT" ]; then
	bash "$DEPS_SCRIPT" || true
else
	pi_flow_warn "install-deps.sh not available"
fi

pi_flow_info "Updating pi-flow package…"
pi update git:github.com/FRIKKern/pi-flow 2>/dev/null || pi install git:github.com/FRIKKern/pi-flow

if [ -d "$(pwd)/.git" ] || [ -f "$(pwd)/package.json" ]; then
	export PI_FLOW_REPO_DIR="$(pwd)"
	if [ -n "$DEPS_SCRIPT" ] && [ -f "$DEPS_SCRIPT" ]; then
		bash "$DEPS_SCRIPT" || true
	fi
fi

if [ -n "$PAPERFLOW_INSTALL" ] && [ -f "$PAPERFLOW_INSTALL" ] && bash "$PAPERFLOW_INSTALL"; then
	pi_flow_info "paperflow host refreshed"
else
	pi_flow_warn "paperflow host install skipped or failed"
fi

BOOTSTRAP="$(pi_flow_script_path bootstrap-pi-flow.sh || true)"
if [ -n "$BOOTSTRAP" ] && [ -f "$BOOTSTRAP" ]; then
	PI_FLOW_PKG="${HOME}/.pi/agent/git/github.com/FRIKKern/pi-flow" bash "$BOOTSTRAP" || true
fi

cat <<'EOF'

✓ Update complete

In Pi: /pi-flow-update · /pi-flow-setup · /pi-flow-status

EOF
