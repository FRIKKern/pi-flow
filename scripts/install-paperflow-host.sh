#!/usr/bin/env bash
# Install paperflow host (daemon :8767) without paperflow quickstart.sh bash 3.2 bug
# (empty INSTALL_ARGS[@] under set -u). Used by pi-flow quickstart.sh and update.sh.
set -eo pipefail

YES="${PAPERFLOW_YES:-${PI_FLOW_YES:-0}}"
PAPERFLOW_REPO_URL="${PAPERFLOW_REPO_URL:-https://github.com/FRIKKern/paperflow.git}"
DEFAULT_PRIMARY="${PAPERFLOW_REPO_DIR:-$HOME/Documents/GitHub/paperflow}"
DEFAULT_FALLBACK="$HOME/paperflow"

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }
die() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

REPO=""
for d in "$DEFAULT_PRIMARY" "$DEFAULT_FALLBACK"; do
	if [ -d "$d/.git" ] && [ -f "$d/install.sh" ]; then
		REPO="$d"
		break
	fi
done

if [ -z "$REPO" ]; then
	REPO="$DEFAULT_PRIMARY"
	mkdir -p "$(dirname "$REPO")"
	info "Cloning paperflow → $REPO"
	git clone --quiet "$PAPERFLOW_REPO_URL" "$REPO" \
		|| die "paperflow clone failed — check network"
	ok "paperflow cloned"
else
	info "Using paperflow at $REPO"
	if git -C "$REPO" remote get-url origin >/dev/null 2>&1 \
		&& git -C "$REPO" rev-parse --verify origin/main >/dev/null 2>&1; then
		if git -C "$REPO" diff --quiet && git -C "$REPO" diff --cached --quiet; then
			git -C "$REPO" pull --quiet --ff-only origin main 2>/dev/null && ok "paperflow pulled" || ok "paperflow kept local"
		else
			ok "paperflow kept local edits"
		fi
	fi
fi

INSTALL_ARGS=()
[ "$YES" = "1" ] && INSTALL_ARGS=(--yes)

info "Running paperflow install.sh…"
# Safe for empty array on macOS bash 3.2 + set -u
bash "$REPO/install.sh" ${INSTALL_ARGS+"${INSTALL_ARGS[@]}"}

ok "paperflow host install finished"
