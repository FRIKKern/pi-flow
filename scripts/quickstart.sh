#!/usr/bin/env bash
# pi-flow quickstart — one command: Pi, beads, pi-flow, paperflow host
set -euo pipefail

YES="${PI_FLOW_YES:-0}"
export PAPERFLOW_YES="$YES"

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info "pi-flow quickstart"

if ! command -v node >/dev/null 2>&1; then
	die "Node.js 20+ required — https://nodejs.org/"
fi

# ── 1. System deps (beads, jq) ─────────────────────────────────────
info "Installing dependencies (beads, jq)…"
bash "${SCRIPT_DIR}/install-deps.sh" || warn "some deps need manual install"

# ── 2. Pi CLI ───────────────────────────────────────────────────────
if ! command -v pi >/dev/null 2>&1; then
	info "Installing Pi coding agent…"
	npm install -g @earendil-works/pi-coding-agent
fi

# ── 3. pi-flow package (pulls @beads/bd into package node_modules) ───
if ! pi list 2>/dev/null | grep -q 'pi-flow'; then
	info "Installing pi-flow package…"
	pi install git:github.com/FRIKKern/pi-flow
else
	info "Updating pi-flow…"
	pi update git:github.com/FRIKKern/pi-flow 2>/dev/null || pi install git:github.com/FRIKKern/pi-flow
fi

# Re-run deps so bundled bd is available after npm install in pi package dir
bash "${SCRIPT_DIR}/install-deps.sh" || true

# ── 4. paperflow host ───────────────────────────────────────────────
PAPERFLOW_QS="https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh"
QS_ARGS=()
[ "$YES" = "1" ] && QS_ARGS=(--yes)

if curl -fsSL "$PAPERFLOW_QS" | bash -s -- "${QS_ARGS[@]}"; then
	info "paperflow host installed"
else
	warn "paperflow quickstart failed — Pi-only mode still works"
fi

# ── 5. cmux (optional) ──────────────────────────────────────────────
if command -v brew >/dev/null 2>&1 && ! command -v cmux >/dev/null 2>&1; then
	info "Optional cmux: brew tap manaflow-ai/cmux && brew install --cask cmux"
elif command -v cmux >/dev/null 2>&1; then
	info "cmux: installed"
fi

cat <<'EOF'

✓ pi-flow ready

In your project repo:
  cd your-repo
  bd init                    # if .beads/ missing (setup does this too)

In Pi:
  /pi-flow-setup
  /pi-flow-doctor
  /skill:autopilot "your vision"

cmux (recommended):
  curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/cmux-layout.sh | bash -s -- "$(pwd)" my-goal

Updates later:
  curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/update.sh | bash
  # or in Pi: /pi-flow-update

Docs: https://github.com/FRIKKern/pi-flow#readme

EOF
