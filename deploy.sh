#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
COMPOSE=(docker compose --env-file "${CMS_ENV_FILE:-.env}" -f docker-compose.prod.yml)
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" pull backend database proxy
"${COMPOSE[@]}" up -d --wait database
if [[ "${SKIP_BACKUP:-0}" != 1 ]]; then ./backup.sh; fi
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" up -d --wait backend proxy
echo 'Deployment ready. First installation: docker compose -f docker-compose.prod.yml run --rm seed'
