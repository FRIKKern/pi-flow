#!/usr/bin/env bash
# pi-flow update — package + deps + optional paperflow host refresh
set -eo pipefail

YES="${PI_FLOW_YES:-0}"
export PAPERFLOW_YES="$YES"

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# curl | bash: BASH_SOURCE[0] is unset — download helper scripts from GitHub
RAW_BASE="${PI_FLOW_RAW_BASE:-https://raw.githubusercontent.com/FRIKKern/pi-flow/main}"
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
	SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
	DEPS_SCRIPT="${SCRIPT_DIR}/install-deps.sh"
else
	SCRIPT_DIR=""
	TMPDIR_PF="$(mktemp -d -t pi-flow-update.XXXXXX)"
	trap 'rm -rf "$TMPDIR_PF"' EXIT
	DEPS_SCRIPT="${TMPDIR_PF}/install-deps.sh"
	curl -fsSL "${RAW_BASE}/scripts/install-deps.sh" -o "$DEPS_SCRIPT" \
		|| die "could not download install-deps.sh"
	curl -fsSL "${RAW_BASE}/scripts/install-cmux-shell.sh" -o "${TMPDIR_PF}/install-cmux-shell.sh"
	curl -fsSL "${RAW_BASE}/scripts/cmux-boss-layout.sh" -o "${TMPDIR_PF}/cmux-boss-layout.sh"
	chmod +x "${TMPDIR_PF}/install-cmux-shell.sh" "${TMPDIR_PF}/cmux-boss-layout.sh"
	export PI_FLOW_SCRIPTS_TMP="$TMPDIR_PF"
fi

info "pi-flow update"

if ! command -v node >/dev/null 2>&1; then
	die "Node.js 20+ required — https://nodejs.org/"
fi

if ! command -v pi >/dev/null 2>&1; then
	info "Pi not found — installing @earendil-works/pi-coding-agent…"
	npm install -g @earendil-works/pi-coding-agent || die "failed to install Pi — try: npm install -g @earendil-works/pi-coding-agent"
fi

if [ -f "$DEPS_SCRIPT" ]; then
	bash "$DEPS_SCRIPT" || true
else
	warn "install-deps.sh not available"
fi

info "Updating pi-flow package…"
pi update git:github.com/FRIKKern/pi-flow 2>/dev/null || pi install git:github.com/FRIKKern/pi-flow

if [ -d "$(pwd)/.git" ] || [ -f "$(pwd)/package.json" ]; then
	export PI_FLOW_REPO_DIR="$(pwd)"
	if [ -f "$DEPS_SCRIPT" ]; then
		bash "$DEPS_SCRIPT" || true
	fi
fi

QS_ARGS=()
[ "$YES" = "1" ] && QS_ARGS=(--yes)
if curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh | bash -s -- ${QS_ARGS[@]+"${QS_ARGS[@]}"}; then
	info "paperflow host refreshed"
else
	warn "paperflow quickstart skipped or failed"
fi

cat <<'EOF'

✓ Update complete

In Pi (project repo):
  /pi-flow-update
  /pi-flow-setup
  /pi-flow-doctor

EOF
