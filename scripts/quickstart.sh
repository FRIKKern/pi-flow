#!/usr/bin/env bash
# pi-flow quickstart — Pi + paperflow host + pi-flow package
set -euo pipefail

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

info "pi-flow quickstart"

if ! command -v node >/dev/null 2>&1; then
	die "Node.js 20+ required — https://nodejs.org/"
fi

if ! command -v pi >/dev/null 2>&1; then
	info "Installing Pi coding agent…"
	npm install -g @earendil-works/pi-coding-agent
fi

if ! pi list 2>/dev/null | grep -q 'pi-flow'; then
	info "Installing pi-flow package…"
	pi install git:github.com/FRIKKern/pi-flow
else
	info "pi-flow already installed"
fi

PAPERFLOW_QS="https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh"
if curl -fsSL "$PAPERFLOW_QS" | bash; then
	info "paperflow host installed"
else
	warn "paperflow quickstart failed — Pi-only mode still works"
fi

if command -v brew >/dev/null 2>&1 && ! command -v cmux >/dev/null 2>&1; then
	info "cmux not found — install with:"
	printf '    brew tap manaflow-ai/cmux && brew install --cask cmux\n'
else
	info "cmux: $(command -v cmux 2>/dev/null || echo 'not installed')"
fi

cat <<'EOF'

✓ Ready

Next:
  1. cmux workspace (recommended):
       curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/cmux-layout.sh | bash -s -- "$(pwd)" my-goal

  2. Open Pi in the terminal pane:
       pi
       /pi-flow-setup
       /skill:autopilot "your vision"

  3. Browser pane → http://localhost:8767/

Docs: https://github.com/FRIKKern/pi-flow#readme

EOF
