#!/usr/bin/env bash
# pi-flow dependency installer — beads (bd), jq, optional cmux hint
# Used by quickstart.sh and documented for manual re-runs.
set -euo pipefail

YES="${PI_FLOW_YES:-${PAPERFLOW_YES:-0}}"

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }

need_node() {
  if ! command -v node >/dev/null 2>&1; then
    printf 'Node 20+ required: https://nodejs.org/\n' >&2
    exit 1
  fi
  local major
  major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [ "${major:-0}" -lt 20 ]; then
    warn "Node 20+ recommended (found $(node --version 2>/dev/null || echo '?'))"
  fi
}

install_bd() {
  if command -v bd >/dev/null 2>&1; then
    ok "beads (bd): $(bd --version 2>/dev/null | head -1 || echo present)"
    return 0
  fi

  info "Installing beads (bd) via npm…"
  if npm install -g @beads/bd@^1; then
    ok "beads (bd) installed globally"
    return 0
  fi

  warn "global bd install failed — pi-flow bundle includes @beads/bd after pi install"
  return 1
}

install_jq() {
  if command -v jq >/dev/null 2>&1; then
    ok "jq: $(jq --version 2>/dev/null | head -1)"
    return 0
  fi
  if command -v brew >/dev/null 2>&1; then
    info "Installing jq via brew…"
    brew install jq && ok "jq installed" && return 0
  fi
  warn "jq not found — paperflow host needs it (brew install jq)"
  return 1
}

init_beads_repo() {
  local dir="${1:-$(pwd)}"
  if [ -d "$dir/.beads" ]; then
    ok "beads repo: .beads/ present in $dir"
    return 0
  fi
  if ! command -v bd >/dev/null 2>&1; then
    warn "skip bd init — bd not on PATH yet"
    return 1
  fi
  info "Initializing beads in $dir …"
  (cd "$dir" && bd init) && ok "bd init in $dir" || warn "bd init failed"
}

main() {
  need_node
  install_bd || true
  install_jq || true

  if command -v git >/dev/null 2>&1; then ok "git: ok"; else warn "git not found"; fi

  if [ -n "${PI_FLOW_REPO_DIR:-}" ]; then
    init_beads_repo "$PI_FLOW_REPO_DIR"
  elif [ -d ".git" ] || [ -f "package.json" ]; then
    init_beads_repo "$(pwd)"
  fi
}

main "$@"
