#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Explicit --images is for isolated smoke builds; local is the normal default.
IMAGES=local
if [[ "${1:-}" == --images ]]; then IMAGES=${2:?Missing image manifest}; shift 2; fi
[[ $# == 0 ]] || { echo 'Usage: build.sh [--images file]' >&2; exit 2; }
scripts/compose.sh --images "$IMAGES" build backend frontend
