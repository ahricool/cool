#!/usr/bin/env bash
# Production image names are fixed in Compose; .env holds runtime settings only.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
COMPOSE=(docker compose --env-file "${CMS_ENV_FILE:-.env}" -f docker-compose.prod.yml)
# Explicit overrides are only for local builds, isolated tests, and recovery.
if [[ "${1:-}" == --images ]]; then
  [[ $# -ge 2 ]] || { echo 'Usage: compose.sh [--images file|local] <compose arguments>' >&2; exit 2; }
  IMAGES=$2
  shift 2
  if [[ "$IMAGES" == local ]]; then IMAGES=docker-compose.local.yml; fi
  [[ -f "$IMAGES" ]] || { echo "Image override not found: $IMAGES" >&2; exit 2; }
  COMPOSE+=(-f "$IMAGES")
fi
exec "${COMPOSE[@]}" "$@"
