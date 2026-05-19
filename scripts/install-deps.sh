#!/usr/bin/env bash
# pi-flow dependency installer — beads (bd), jq, browse (Browserbase), optional cmux hint
# Used by quickstart.sh and documented for manual re-runs.
set -eo pipefail

YES="${PI_FLOW_YES:-${PAPERFLOW_YES:-0}}"
RAW_BASE="${PI_FLOW_RAW_BASE:-https://raw.githubusercontent.com/FRIKKern/pi-flow/main}"

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

install_browse() {
  PI_AGENT="${HOME}/.pi/agent"
  PI_BIN="${PI_AGENT}/bin"
  export PATH="${PI_BIN}:${PATH}"
  if command -v browse >/dev/null 2>&1; then
    ok "browse: $(browse --version 2>/dev/null | head -1 || echo present)"
    return 0
  fi
  info "Installing Browserbase CLI (browse) to ${PI_AGENT}…"
  if npm install browse --prefix "${PI_AGENT}" --no-fund --no-audit 2>/dev/null; then
    ok "browse: $("${PI_BIN}/browse" --version 2>/dev/null | head -1 || echo installed in ${PI_BIN})"
    return 0
  fi
  info "Retrying browse global install…"
  if npm install -g browse --no-fund --no-audit; then
    ok "browse installed globally"
    return 0
  fi
  warn "browse install failed — run /pi-flow-browserbase-setup in Pi"
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

# Directory containing install-cmux-shell.sh + cmux-boss-layout.sh (repo, PI_FLOW_SCRIPTS_TMP, or download)
resolve_scripts_dir() {
  if [ -n "${PI_FLOW_SCRIPTS_TMP:-}" ] \
    && [ -f "${PI_FLOW_SCRIPTS_TMP}/install-cmux-shell.sh" ] \
    && [ -f "${PI_FLOW_SCRIPTS_TMP}/cmux-boss-layout.sh" ]; then
    echo "${PI_FLOW_SCRIPTS_TMP}"
    return 0
  fi
  if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    local dir
    dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "${dir}/install-cmux-shell.sh" ] && [ -f "${dir}/cmux-boss-layout.sh" ]; then
      echo "$dir"
      return 0
    fi
  fi
  echo ""
  return 1
}

fetch_cmux_scripts() {
  local dir="${1:-}"
  if [ -z "$dir" ]; then
    dir="$(mktemp -d -t pi-flow-cmux.XXXXXX)"
  fi
  info "Downloading cmux shell scripts…"
  curl -fsSL "${RAW_BASE}/scripts/install-cmux-shell.sh" -o "${dir}/install-cmux-shell.sh" \
    || return 1
  curl -fsSL "${RAW_BASE}/scripts/cmux-boss-layout.sh" -o "${dir}/cmux-boss-layout.sh" \
    || return 1
  chmod +x "${dir}/install-cmux-shell.sh" "${dir}/cmux-boss-layout.sh"
  echo "$dir"
}

install_cmux_shell() {
  local dir script
  dir="$(resolve_scripts_dir)" || dir=""
  if [ -z "$dir" ]; then
    dir="$(fetch_cmux_scripts)" || {
      warn "install-cmux-shell.sh not found — skip pf/pif aliases"
      return 1
    }
  fi
  script="${dir}/install-cmux-shell.sh"
  if [[ ! -f "$script" || ! -f "${dir}/cmux-boss-layout.sh" ]]; then
    warn "install-cmux-shell.sh not found — skip pf/pif aliases"
    return 1
  fi
  info "Installing cmux boss layout (pf / pif)…"
  PI_FLOW_SCRIPTS_TMP="$dir" bash "$script" || warn "cmux shell install had issues"
}

main() {
  need_node
  install_bd || true
  install_jq || true
  install_browse || true
  install_cmux_shell || true

  if command -v git >/dev/null 2>&1; then ok "git: ok"; else warn "git not found"; fi

  if [ -n "${PI_FLOW_REPO_DIR:-}" ]; then
    init_beads_repo "$PI_FLOW_REPO_DIR"
  elif [ -d ".git" ] || [ -f "package.json" ]; then
    init_beads_repo "$(pwd)"
  fi
}

main "$@"
