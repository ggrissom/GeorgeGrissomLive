#!/usr/bin/env bash
# scripts/create_archive.sh
# Creates a timestamped ZIP of the repository contents (excludes node_modules and .git)
# Usage: ./scripts/create_archive.sh [output-filename]

set -euo pipefail

TZ=UTC
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
ASSISTANT_NAME="codeCopilotGit"
SUFFIX="ggDOT"
DEFAULT_NAME="${TIMESTAMP}_${ASSISTANT_NAME}_${SUFFIX}.zip"

OUT=${1:-$DEFAULT_NAME}

echo "Creating archive: $OUT"

# Exclude patterns
EXCLUDE_ARGS=(--exclude .git --exclude node_modules --exclude .cache)

# Use zip if available
if command -v zip >/dev/null 2>&1; then
  zip -r "$OUT" . -x "${EXCLUDE_ARGS[@]}" >/dev/null
  echo "Archive created: $OUT"
else
  echo "zip command not found. On macOS install via brew install zip; on Debian/Ubuntu: sudo apt-get install zip" >&2
  exit 1
fi
