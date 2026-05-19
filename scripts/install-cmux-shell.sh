#!/usr/bin/env bash
# Install cmux-boss-layout + pf/pif zsh aliases (~/.local/bin, ~/.zshrc).
# Called from pi-flow quickstart, install-deps, and /pi-flow-setup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${SCRIPT_DIR}/cmux-boss-layout.sh"
DEST="${HOME}/.local/bin/cmux-boss-layout"
ZSHRC="${HOME}/.zshrc"
MARKER="# pi-flow cmux shell (pf / pif)"

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }

install_binary() {
  if [[ ! -f "$SOURCE" ]]; then
    warn "cmux-boss-layout.sh missing at $SOURCE"
    return 1
  fi
  mkdir -p "$(dirname "$DEST")"
  cp "$SOURCE" "$DEST"
  chmod +x "$DEST"
  ok "cmux-boss-layout → $DEST"
}

install_zsh_aliases() {
  if [[ ! -f "$ZSHRC" ]]; then
    touch "$ZSHRC"
  fi

  if grep -qF "$MARKER" "$ZSHRC" 2>/dev/null; then
    ok "zsh aliases (pf / pif): already in $ZSHRC"
    return 0
  fi

  if grep -qE '^alias (pf|pif)=' "$ZSHRC" 2>/dev/null; then
    warn "pf/pif aliases exist in $ZSHRC without pi-flow marker — not patching"
    warn "Add manually: alias pif=\"cmux-boss-layout --pi\""
    return 0
  fi

  cat >>"$ZSHRC" <<'EOF'

# pi-flow cmux shell (pf / pif)
# pf  = boss layout with Claude Code (cc) · pif = same with Pi
# usage: pf|pif [--cwd <path>] [--name <title>] [--url <url>] [--no-cc]
alias pf="cmux-boss-layout"
alias pif="cmux-boss-layout --pi"
EOF
  ok "zsh aliases (pf / pif) appended to $ZSHRC"
  info "Run: source ~/.zshrc  (or open a new terminal)"
}

main() {
  install_binary || true
  install_zsh_aliases || true

  if command -v cmux >/dev/null 2>&1; then
    ok "cmux: $(cmux --version 2>/dev/null | head -1 || echo ready)"
  else
    warn "cmux not on PATH — install: brew tap manaflow-ai/cmux && brew install --cask cmux"
    warn "pf / pif will work after cmux is installed"
  fi
}

main "$@"
