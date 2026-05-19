#!/usr/bin/env bash
# pi-flow update — package + deps + optional paperflow host refresh
set -euo pipefail

YES="${PI_FLOW_YES:-0}"
export PAPERFLOW_YES="$YES"

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info "pi-flow update"

if ! command -v pi >/dev/null 2>&1; then
  warn "pi not found — run scripts/quickstart.sh first"
  exit 1
fi

bash "${SCRIPT_DIR}/install-deps.sh" || true

info "Updating pi-flow package…"
pi update git:github.com/FRIKKern/pi-flow 2>/dev/null || pi install git:github.com/FRIKKern/pi-flow

if [ -d "$(pwd)/.git" ] || [ -f "$(pwd)/package.json" ]; then
  export PI_FLOW_REPO_DIR="$(pwd)"
  bash "${SCRIPT_DIR}/install-deps.sh" || true
fi

QS_ARGS=()
[ "$YES" = "1" ] && QS_ARGS=(--yes)
if curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh | bash -s -- "${QS_ARGS[@]}"; then
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
