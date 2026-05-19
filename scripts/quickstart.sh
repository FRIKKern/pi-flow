#!/usr/bin/env bash
# pi-flow quickstart — one command: Pi, beads, pi-flow, paperflow host
set -eo pipefail

YES="${PI_FLOW_YES:-0}"
export PAPERFLOW_YES="$YES"

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# When run via curl | bash, BASH_SOURCE[0] is unset. Detect that and fetch
# install-deps.sh from the raw GitHub URL into a temp dir.
RAW_BASE="${PI_FLOW_RAW_BASE:-https://raw.githubusercontent.com/FRIKKern/pi-flow/main}"
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
	SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
	DEPS_SCRIPT="${SCRIPT_DIR}/install-deps.sh"
else
	SCRIPT_DIR=""
	TMPDIR_PF="$(mktemp -d -t pi-flow-quickstart.XXXXXX)"
	trap 'rm -rf "$TMPDIR_PF"' EXIT
	DEPS_SCRIPT="${TMPDIR_PF}/install-deps.sh"
	curl -fsSL "${RAW_BASE}/scripts/install-deps.sh" -o "$DEPS_SCRIPT" \
		|| warn "could not download install-deps.sh"
fi

info "pi-flow quickstart"

if ! command -v node >/dev/null 2>&1; then
	die "Node.js 20+ required — https://nodejs.org/"
fi

# ── 1. System deps (beads, jq) ─────────────────────────────────────
info "Installing dependencies (beads, jq)…"
if [ -f "$DEPS_SCRIPT" ]; then
	bash "$DEPS_SCRIPT" || warn "some deps need manual install"
else
	warn "install-deps.sh not available — skipping (install beads/jq manually)"
fi

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
if [ -f "$DEPS_SCRIPT" ]; then
	bash "$DEPS_SCRIPT" || true
fi

# ── 4. paperflow host ───────────────────────────────────────────────
PAPERFLOW_QS="https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh"
QS_ARGS=()
[ "$YES" = "1" ] && QS_ARGS+=(--yes)

if curl -fsSL "$PAPERFLOW_QS" | bash -s -- ${QS_ARGS[@]+"${QS_ARGS[@]}"}; then
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
  source ~/.zshrc   # pf / pif aliases
  pif --cwd "$(pwd)" my-goal    # boss layout + Pi + :8767 browser
  # or simple: scripts/cmux-layout.sh "$(pwd)" my-goal

Updates later:
  curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/update.sh | bash
  # or in Pi: /pi-flow-update

Docs: https://github.com/FRIKKern/pi-flow#readme

EOF
