#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
docker compose --env-file "${CMS_ENV_FILE:-.env}" -f docker-compose.prod.yml build backend frontend admin
