#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
umask 077
mkdir -p backups
BACKUP_FILE="backups/cms-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
trap 'rm -f "${BACKUP_FILE}.partial"' EXIT
docker compose --env-file "${CMS_ENV_FILE:-.env}" -f docker-compose.prod.yml exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "${BACKUP_FILE}.partial"
mv "${BACKUP_FILE}.partial" "$BACKUP_FILE"
echo "Backup saved: $BACKUP_FILE"
