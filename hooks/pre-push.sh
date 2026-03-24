#!/bin/sh
# vibe-check pre-push hook
# This hook is managed by vibe-check. Do not edit manually.
# To remove: vibe-check uninstall

if [ "$VIBE_CHECK_SKIP" = "1" ]; then
    echo "[vibe-check] Skipped via VIBE_CHECK_SKIP=1. Logging bypass." >&2
    npx vbc run --skip --remote "$1" --url "$2"
    exit 0
fi

# Forward stdin (ref info from git) to vibe-check
exec npx vbc run --remote "$1" --url "$2"
