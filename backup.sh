#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
umask 077
COMPOSE=(docker compose --env-file "${CMS_ENV_FILE:-.env}" -f docker-compose.prod.yml)
mkdir -p backups
BACKUP_DIR="backups/cms-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir "${BACKUP_DIR}.partial"
WAS_RUNNING=$("${COMPOSE[@]}" ps --status running -q backend)
resume() {
  if [[ -n "$WAS_RUNNING" ]]; then "${COMPOSE[@]}" start backend >/dev/null; fi
}
trap resume EXIT
# Pause the only writer so database rows and uploaded files describe the same state.
if [[ -n "$WAS_RUNNING" ]]; then "${COMPOSE[@]}" stop backend >/dev/null; fi
"${COMPOSE[@]}" exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "${BACKUP_DIR}.partial/database.dump"
"${COMPOSE[@]}" run --rm --no-deps -T --entrypoint tar backend -czf - -C /app/data uploads > "${BACKUP_DIR}.partial/media.tar.gz"
mv "${BACKUP_DIR}.partial" "$BACKUP_DIR"
echo "Consistent backup saved: $BACKUP_DIR"
