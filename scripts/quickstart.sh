#!/usr/bin/env bash
# pi-flow quickstart — one command: Pi, beads, pi-flow, paperflow host
# Safe: curl | bash · macOS bash 3.2 · no set -u on entry
set -eo pipefail

YES="${PI_FLOW_YES:-0}"
export PAPERFLOW_YES="$YES"

# ── Resolve script dir or download bundle (curl | bash) ─────────────
_CALLER="${BASH_SOURCE[0]:-}"
if [ -n "$_CALLER" ] && [ -f "$_CALLER" ]; then
	_SCRIPT_DIR="$(cd "$(dirname "$_CALLER")" && pwd)"
	# shellcheck source=lib/bash-safe.sh
	source "${_SCRIPT_DIR}/lib/bash-safe.sh"
	pi_flow_init_scripts "$_CALLER"
else
	PI_FLOW_RAW_BASE="${PI_FLOW_RAW_BASE:-https://raw.githubusercontent.com/FRIKKern/pi-flow/main}"
	_TMP="$(mktemp -d -t pi-flow-quickstart.XXXXXX)"
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
	pi_flow_ok "quickstart verify: script bundle ok"
	exit 0
fi

pi_flow_info "pi-flow quickstart"

if ! command -v node >/dev/null 2>&1; then
	pi_flow_die "Node.js 20+ required — https://nodejs.org/"
fi

pi_flow_info "Installing dependencies (beads, jq)…"
if [ -n "$DEPS_SCRIPT" ] && [ -f "$DEPS_SCRIPT" ]; then
	bash "$DEPS_SCRIPT" || pi_flow_warn "some deps need manual install"
else
	pi_flow_warn "install-deps.sh not available — install beads/jq manually"
fi

if ! command -v pi >/dev/null 2>&1; then
	pi_flow_info "Installing Pi coding agent…"
	npm install -g @earendil-works/pi-coding-agent \
		|| pi_flow_die "failed to install Pi"
fi

if ! pi list 2>/dev/null | grep -q 'pi-flow'; then
	pi_flow_info "Installing pi-flow package…"
	pi install git:github.com/FRIKKern/pi-flow
else
	pi_flow_info "Updating pi-flow…"
	pi update git:github.com/FRIKKern/pi-flow 2>/dev/null || pi install git:github.com/FRIKKern/pi-flow
fi

if [ -n "$DEPS_SCRIPT" ] && [ -f "$DEPS_SCRIPT" ]; then
	bash "$DEPS_SCRIPT" || true
fi

if [ -n "$PAPERFLOW_INSTALL" ] && [ -f "$PAPERFLOW_INSTALL" ] && bash "$PAPERFLOW_INSTALL"; then
	pi_flow_info "paperflow host installed"
else
	pi_flow_warn "paperflow host install failed — Pi-only mode still works"
fi

BOOTSTRAP="$(pi_flow_script_path bootstrap-pi-flow.sh || true)"
if [ -n "$BOOTSTRAP" ] && [ -f "$BOOTSTRAP" ]; then
	pi_flow_info "Applying pi-flow defaults (settings, OpenCode, agents)…"
	PI_FLOW_PKG="${HOME}/.pi/agent/git/github.com/FRIKKern/pi-flow" bash "$BOOTSTRAP" || pi_flow_warn "bootstrap had issues — run /pi-flow-setup in Pi"
fi

if command -v brew >/dev/null 2>&1 && ! command -v cmux >/dev/null 2>&1; then
	pi_flow_info "Optional cmux: brew tap manaflow-ai/cmux && brew install --cask cmux"
elif command -v cmux >/dev/null 2>&1; then
	pi_flow_info "cmux: installed"
fi

cat <<'EOF'

✓ pi-flow ready

In your project repo:
  cd your-repo
  bd init

In Pi (setup already applied — optional /pi-flow-status):
  /skill:autopilot "your vision"

cmux (recommended):
  source ~/.zshrc
  pif --cwd "$(pwd)" my-goal

Updates:
  curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/update.sh | bash

Docs: https://github.com/FRIKKern/pi-flow#readme · docs/INSTALL-SCRIPTS.md

EOF
