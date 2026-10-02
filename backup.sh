#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
umask 077
source scripts/backup-retention.sh
COMPOSE=(scripts/compose.sh)
if [[ "${1:-}" == --images ]]; then COMPOSE+=(--images "${2:?Missing image manifest}"); shift 2; fi
[[ $# == 0 ]] || { echo 'Usage: backup.sh [--images file|local]' >&2; exit 2; }
BACKUP_ROOT=${COOL_BACKUP_ROOT:-backups}
cool_backup_validate_root "$BACKUP_ROOT"
mkdir -p -- "$BACKUP_ROOT"
cool_backup_validate_root "$BACKUP_ROOT"
# mktemp reserves each staging directory atomically, even for rapid invocations.
while :; do
  PARTIAL_DIR=$(mktemp -d --suffix=.partial -- "$BACKUP_ROOT/cool-$(date -u +%Y%m%dT%H%M%S.%NZ)-XXXXXXXXXXXX")
  BACKUP_DIR=${PARTIAL_DIR%.partial}
  [[ -e "$BACKUP_DIR" || -L "$BACKUP_DIR" ]] || break
  rmdir -- "$PARTIAL_DIR"
done
# A fresh bind mount masks image ownership, so initialize its root before backup.
"${COMPOSE[@]}" run --rm --no-deps --pull never -T media-init
WAS_RUNNING=$("${COMPOSE[@]}" ps --status running -q backend)
resume() {
  if [[ -n "$WAS_RUNNING" ]]; then "${COMPOSE[@]}" start backend >/dev/null; fi
}
trap resume EXIT
# Pause the only writer so database rows and uploaded files describe the same state.
if [[ -n "$WAS_RUNNING" ]]; then "${COMPOSE[@]}" stop backend >/dev/null; fi
"${COMPOSE[@]}" exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$PARTIAL_DIR/database.dump"
"${COMPOSE[@]}" run --rm --no-deps --pull never -T --entrypoint tar backend -czf - -C /app/data . > "$PARTIAL_DIR/media.tar.gz"
[[ -s "$PARTIAL_DIR/database.dump" && -s "$PARTIAL_DIR/media.tar.gz" ]] || {
  echo 'Backup returned an empty archive; preserving all prior backups.' >&2; exit 1;
}
# A failed restart is still a failed backup operation: keep the partial and all
# earlier backups. The EXIT trap can retry recovery if this explicit start fails.
resume
trap - EXIT
printf 'cool-backup-v1\n' > "$PARTIAL_DIR/.cool-backup-complete"
mv -nT -- "$PARTIAL_DIR" "$BACKUP_DIR"
[[ ! -e "$PARTIAL_DIR" ]]
cool_backup_prune "$BACKUP_ROOT"
echo "Consistent backup saved: $BACKUP_DIR"
