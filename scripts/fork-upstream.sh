#!/usr/bin/env bash
# Clone an upstream repo into packages/ for a maintained fork.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGES="${ROOT}/packages"
mkdir -p "${PACKAGES}"

usage() {
  echo "Usage: $0 cursor-provider | list" >&2
  exit 1
}

case "${1:-}" in
  cursor-provider)
    DEST="${PACKAGES}/cursor-provider"
    if [[ -d "${DEST}/.git" ]]; then
      echo "Already cloned: ${DEST}"
      echo "  cd ${DEST} && git pull"
      exit 0
    fi
    git clone --depth 1 https://github.com/ndraiman/pi-cursor-provider.git "${DEST}"
    echo "Cloned to ${DEST}"
    echo "Point package.json pi.extensions at ./packages/cursor-provider/index.ts when ready."
    ;;
  list)
    echo "Available forks:"
    echo "  cursor-provider  — ndraiman/pi-cursor-provider (Composer via OAuth)"
    ;;
  *) usage ;;
esac
