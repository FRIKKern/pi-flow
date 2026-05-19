#!/usr/bin/env bash
# Create a cmux workspace tuned for pi-flow + paperflow host.
# Usage: cmux-layout.sh [repo-path] [goal-slug]
set -euo pipefail

REPO="${1:-$(pwd)}"
NAME="${2:-pi-flow}"
CMUX_BIN="$(command -v cmux || true)"

if [ -z "$CMUX_BIN" ]; then
  echo "cmux not found — install: brew tap manaflow-ai/cmux && brew install --cask cmux" >&2
  exit 1
fi

if ! curl -sf "${PAPERFLOW_DAEMON_URL:-http://localhost:8767}/health" >/dev/null 2>&1; then
  echo "warn: paperflow daemon not reachable on :8767 — run paperflow quickstart first" >&2
fi

# New workspace: Pi on the left, paperflow docs browser on the right
exec "$CMUX_BIN" new-workspace \
  --name "pi-flow:${NAME}" \
  --cwd "$REPO" \
  --command "pi" \
  --focus true
