#!/usr/bin/env bash
# Runtime environment and application release selection are intentionally separate.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
IMAGES=deployment/current.yml
if [[ "${1:-}" == --images ]]; then
  [[ $# -ge 2 ]] || { echo 'Usage: compose.sh [--images file|local] <compose arguments>' >&2; exit 2; }
  IMAGES=$2
  shift 2
fi
COMPOSE=(docker compose --env-file "${CMS_ENV_FILE:-.env}" -f docker-compose.prod.yml)
if [[ "$IMAGES" != local ]]; then
  if [[ -f "$IMAGES" ]]; then COMPOSE+=(-f "$IMAGES")
  elif [[ "$IMAGES" != deployment/current.yml ]]; then echo "Image manifest not found: $IMAGES" >&2; exit 2
  fi
fi
exec "${COMPOSE[@]}" "$@"
