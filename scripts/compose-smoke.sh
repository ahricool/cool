#!/usr/bin/env bash
# Bounded production-stack/restore drill; never reads .env or contacts a registry
# for application images, and never runs deploy.sh or touches a production project.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
umask 077
for tool in docker node timeout; do command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }; done
# Reject remote Docker daemons even when this drill is run outside Actions.
# DOCKER_CONTEXT takes precedence over DOCKER_HOST in the Docker CLI.
if [[ -n "${DOCKER_CONTEXT:-}" ]]; then
  DOCKER_ENDPOINT=$(docker context inspect "$DOCKER_CONTEXT" --format '{{.Endpoints.docker.Host}}')
elif [[ -n "${DOCKER_HOST:-}" ]]; then
  DOCKER_ENDPOINT=$DOCKER_HOST
else
  DOCKER_ENDPOINT=$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}')
fi
case "$DOCKER_ENDPOINT" in unix:///*) ;; *) echo 'Smoke drill requires a local Unix-socket Docker daemon' >&2; exit 1 ;; esac
docker compose version >/dev/null

RUN_ID="cool-smoke-$(date -u +%Y%m%d%H%M%S)-$$-$RANDOM"
SOURCE_PROJECT="${RUN_ID}-source"
RESTORE_PROJECT="${RUN_ID}-restore"
REPORT_DIR="$PWD/test-results/compose-smoke"
mkdir -p "$REPORT_DIR"
for report in source-http source-after-backup-http restored-http; do
  printf '{"passed": false, "status": "not run"}\n' > "$REPORT_DIR/$report.json"
done
RUNTIME_DIR=$(mktemp -d "$PWD/test-results/.compose-smoke.XXXXXX")
# Every Compose call below binds only these new, disposable host directories.
# Changing -p alone does NOT isolate a bind mount.
readonly RUNTIME_DIR
readonly SOURCE_MEDIA="$RUNTIME_DIR/source-media" RESTORE_MEDIA="$RUNTIME_DIR/restore-media"
readonly SMOKE_BACKUP_ROOT="$RUNTIME_DIR/backups"
mkdir -m 0755 "$SOURCE_MEDIA" "$RESTORE_MEDIA"
IMAGES_BUILT=0
ENV_FILE="$RUNTIME_DIR/cool.env"
IMAGES_FILE="$RUNTIME_DIR/images.yml"
LOG_FILE="$RUNTIME_DIR/operations.log"
STAGE=initializing
BACKUPS=()
# Explicit values prevent the operator's ambient environment from overriding the
# disposable --env-file. Compose's top-level name is always overridden with -p.
unset DATABASE_URL JWT_SECRET POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD \
  HTTP_PORT MEDIA_ROOT COMPOSE_FILE COMPOSE_PROFILES
cat > "$ENV_FILE" <<ENV
POSTGRES_DB=cool_smoke
POSTGRES_USER=cool_smoke
POSTGRES_PASSWORD=compose-smoke-database-password-only
DATABASE_URL=postgresql://cool_smoke:compose-smoke-database-password-only@database:5432/cool_smoke
JWT_SECRET=compose-smoke-jwt-secret-for-disposable-test-only
HTTP_PORT=127.0.0.1:0
ENV
cat > "$IMAGES_FILE" <<YAML
services:
  media-init:
    image: ${RUN_ID}-backend:local
  backend:
    image: ${RUN_ID}-backend:local
  migrate:
    image: ${RUN_ID}-backend:local
  seed:
    image: ${RUN_ID}-backend:local
  frontend:
    image: ${RUN_ID}-frontend:local
YAML

media_dir() {
  case "$1" in
    "$SOURCE_PROJECT") printf '%s\n' "$SOURCE_MEDIA" ;;
    "$RESTORE_PROJECT") printf '%s\n' "$RESTORE_MEDIA" ;;
    *) echo 'Unsafe Compose project' >&2; return 1 ;;
  esac
}
compose() {
  local project=$1 media; shift
  media=$(media_dir "$project") || return
  MEDIA_ROOT="$media" timeout --signal=TERM --kill-after=10s "${COMPOSE_TIMEOUT:-180s}" docker compose \
    --env-file "$ENV_FILE" -p "$project" -f docker-compose.prod.yml -f "$IMAGES_FILE" "$@"
}
clear_test_media() {
  local project=$1 media
  media=$(media_dir "$project") || return
  [[ -d "$media" ]] || return 0
  if [[ "$IMAGES_BUILT" == 1 ]]; then
    # Run as node, which owns generated uploads. Never clean a user-supplied path.
    COMPOSE_TIMEOUT=30s compose "$project" run --rm --no-deps --pull never -T --entrypoint sh backend \
      -c 'find /app/data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +' || return
  fi
  # The runner may have a different UID from node; the now-empty directory can
  # still be removed through its runner-owned parent without widening access.
  rmdir -- "$media"
}
sanitize() {
  sed -E \
    -e 's#postgres(ql)?://[^[:space:]"<>]+#postgresql://[REDACTED]#g' \
    -e 's/Bearer [A-Za-z0-9._-]+/Bearer [REDACTED]/g' \
    -e 's/compose-smoke-(initial|restored|database)-password-only/[DISPOSABLE PASSWORD REDACTED]/g' \
    -e 's/compose-smoke-jwt-secret-for-disposable-test-only/[DISPOSABLE JWT SECRET REDACTED]/g'
}
capture_stack() {
  local project=$1 label=$2
  # Bounded tails only. Never upload inspect/config/env output or backup archives.
  COMPOSE_TIMEOUT=15s compose "$project" ps -a 2>&1 | tail -c 65536 | sanitize > "$REPORT_DIR/${label}-containers.log" || true
  COMPOSE_TIMEOUT=15s compose "$project" logs --no-color --tail=100 2>&1 | tail -n 700 | tail -c 262144 | sanitize > "$REPORT_DIR/${label}-services.log" || true
}
cleanup() {
  local result=$? cleanup_failed=0
  trap - EXIT INT TERM
  set +e
  capture_stack "$SOURCE_PROJECT" source-final
  capture_stack "$RESTORE_PROJECT" restore-final
  for project in "$SOURCE_PROJECT" "$RESTORE_PROJECT"; do
    COMPOSE_TIMEOUT=30s compose "$project" stop frontend backend >> "$LOG_FILE" 2>&1 || cleanup_failed=1
    clear_test_media "$project" >> "$LOG_FILE" 2>&1 || cleanup_failed=1
    COMPOSE_TIMEOUT=40s compose "$project" down --volumes --remove-orphans --timeout 10 >> "$LOG_FILE" 2>&1 || cleanup_failed=1
  done
  # Every removed path was returned by this run's successful backup.sh call.
  for backup in "${BACKUPS[@]}"; do
    if [[ "${backup%/*}" == "$SMOKE_BACKUP_ROOT" && "${backup##*/}" =~ ^cool-[0-9]{8}T[0-9]{6}\.[0-9]{9}Z-[A-Za-z0-9]{12}$ ]]; then rm -rf -- "$backup"; fi
  done
  tail -n 350 "$LOG_FILE" | tail -c 262144 | sanitize > "$REPORT_DIR/operations.log"
  if [[ "$cleanup_failed" != 0 ]]; then result=1; fi
  {
    echo '# Production Compose smoke and restore drill'
    echo
    echo "Commit: $(git rev-parse HEAD)"
    echo "Result: $([[ "$result" == 0 ]] && echo PASS || echo FAIL)"
    echo "Last stage: $STAGE"
    echo "Scoped cleanup: $([[ "$cleanup_failed" == 0 ]] && echo PASS || echo FAIL)"
    echo
    echo '- Local-built backend and unified Nuxt/Nginx frontend images; no application image push or production access'
    echo '- Empty-database/virgin-media backup before migrations and first backend startup'
    echo '- Production migrations, idempotent seed, first password setup, health, unified Blog/Admin routes and served bundles'
    echo '- Authenticated CRUD, publication, generated image upload and changed owner password'
    echo '- Playwright against the generated frontend through real production Nginx, with desktop/mobile screenshots'
    echo '- Populated backup with writer stop/resume, restrictive archive permissions'
    echo '- Restore into a distinct empty database volume and temporary media bind directory after removing the source project'
    echo '- Exact migration history, stable owner/content/media IDs, Markdown and media SHA-256'
    echo
    echo 'Each completed HTTP check is recorded in the accompanying JSON reports. PASS requires every stage and cleanup to succeed.'
    echo 'Only bounded sanitized logs and reports are retained; env files, database dumps and media archives are excluded.'
  } > "$REPORT_DIR/summary.md"
  rm -rf -- "$RUNTIME_DIR"
  cat "$REPORT_DIR/summary.md"
  if [[ "$result" != 0 ]]; then tail -n 100 "$REPORT_DIR/operations.log"; fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
run_step() {
  STAGE=$1; shift
  echo "==> $STAGE"
  printf '\n==> %s\n' "$STAGE" >> "$LOG_FILE"
  "$@" >> "$LOG_FILE" 2>&1
}
backup() {
  local label=$1 output="$RUNTIME_DIR/backup-$1.log" directory
  STAGE="backup-$label"
  echo "==> $STAGE"
  timeout --signal=TERM --kill-after=20s 180s env \
    COOL_ENV_FILE="$ENV_FILE" COMPOSE_PROJECT_NAME="$SOURCE_PROJECT" MEDIA_ROOT="$SOURCE_MEDIA" \
    COOL_BACKUP_ROOT="$SMOKE_BACKUP_ROOT" \
    bash backup.sh --images "$IMAGES_FILE" > "$output" 2>&1 || { cat "$output" >> "$LOG_FILE"; return 1; }
  cat "$output" >> "$LOG_FILE"
  directory=$(sed -n 's/^Consistent backup saved: //p' "$output")
  [[ "${directory%/*}" == "$SMOKE_BACKUP_ROOT" ]]
  [[ "${directory##*/}" =~ ^cool-[0-9]{8}T[0-9]{6}\.[0-9]{9}Z-[A-Za-z0-9]{12}$ ]]
  BACKUPS+=("$directory")
  test -s "$directory/database.dump"
  test -s "$directory/media.tar.gz"
  [[ $(stat -c '%a' "$directory") == 700 ]]
  [[ $(stat -c '%a' "$directory/database.dump") == 600 ]]
  [[ $(stat -c '%a' "$directory/media.tar.gz") == 600 ]]
  tar -tzf "$directory/media.tar.gz" > "$RUNTIME_DIR/media-$label.list"
  grep -qx './' "$RUNTIME_DIR/media-$label.list"
  LAST_BACKUP=$directory
}
stack_url() {
  local binding
  binding=$(compose "$1" port frontend 80)
  [[ "$binding" =~ ^127\.0\.0\.1:[0-9]+$ ]]
  printf 'http://%s\n' "$binding"
}
migration_snapshot() {
  compose "$1" exec -T database sh -c \
    'psql -X -A -t -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\''SELECT row_to_json(m) FROM "_prisma_migrations" m ORDER BY id;'\'''
}

run_step validate-compose compose "$SOURCE_PROJECT" config --quiet
run_step pull-infrastructure-only compose "$SOURCE_PROJECT" pull database
run_step build-current-code timeout --signal=TERM --kill-after=20s 900s env \
  COOL_ENV_FILE="$ENV_FILE" COMPOSE_PROJECT_NAME="$SOURCE_PROJECT" MEDIA_ROOT="$SOURCE_MEDIA" \
  bash scripts/build.sh --images "$IMAGES_FILE"
IMAGES_BUILT=1
run_step start-empty-database compose "$SOURCE_PROJECT" up -d --wait --wait-timeout 120 --no-build --pull never database
# Deployment initializes bind ownership directly, including repeated deploys.
run_step initialize-source-media compose "$SOURCE_PROJECT" run --rm --no-deps --pull never -T media-init
run_step reinitialize-source-media compose "$SOURCE_PROJECT" run --rm --no-deps --pull never -T media-init
run_step verify-virgin-media-permissions compose "$SOURCE_PROJECT" run --rm --no-deps -T --entrypoint sh backend \
  -c 'test "$(id -u)" != 0 && test -d /app/data && test -r /app/data && test -w /app/data'
# Independently verify manual backup of an empty installation.
backup empty
[[ $(wc -l < "$RUNTIME_DIR/media-empty.list") == 1 ]]
[[ -z $(compose "$SOURCE_PROJECT" ps --status running -q backend) ]]
run_step migrate compose "$SOURCE_PROJECT" run --rm -T migrate
run_step seed compose "$SOURCE_PROJECT" run --rm -T seed
run_step seed-idempotence compose "$SOURCE_PROJECT" run --rm -T seed
run_step start-source-stack compose "$SOURCE_PROJECT" up -d --wait --wait-timeout 120 --no-build --pull never backend frontend
SOURCE_URL=$(stack_url "$SOURCE_PROJECT")
run_step populate-through-production-ingress timeout 180s node scripts/compose-smoke.mjs populate \
  "$SOURCE_URL" "$RUNTIME_DIR/state.json" "$REPORT_DIR/source-http.json"
# Start the independent browser suite with fresh per-process rate-limit buckets.
# Persisted users/content/sessions remain intact across this restart.
run_step restart-before-browser compose "$SOURCE_PROJECT" restart backend frontend
run_step wait-before-browser compose "$SOURCE_PROJECT" up -d --wait --wait-timeout 120 --no-build --pull never backend frontend
# Docker may allocate a new ephemeral host port when the frontend restarts.
SOURCE_URL=$(stack_url "$SOURCE_PROJECT")
run_step production-browser-flows timeout --signal=TERM --kill-after=10s 600s env \
  E2E_EXTERNAL=1 E2E_BLOG_URL="$SOURCE_URL" E2E_ADMIN_URL="$SOURCE_URL/admin" \
  E2E_API_URL="$SOURCE_URL/api/v1" E2E_COOKIE_SECURE=1 \
  E2E_PASSWORD=compose-smoke-restored-password-only \
  npx --no-install playwright test --output test-results/production-browser
migration_snapshot "$SOURCE_PROJECT" > "$RUNTIME_DIR/source-migrations.jsonl"
test -s "$RUNTIME_DIR/source-migrations.jsonl"
backup populated
POPULATED_BACKUP=$LAST_BACKUP
[[ $(wc -l < "$RUNTIME_DIR/media-populated.list") == 2 ]]
[[ -n $(compose "$SOURCE_PROJECT" ps --status running -q backend) ]]
run_step wait-for-resumed-backend compose "$SOURCE_PROJECT" up -d --wait --wait-timeout 120 --no-build --pull never backend frontend
run_step verify-backup-source-resumed timeout 180s node scripts/compose-smoke.mjs verify \
  "$SOURCE_URL" "$RUNTIME_DIR/state.json" "$REPORT_DIR/source-after-backup-http.json"
capture_stack "$SOURCE_PROJECT" source-before-removal
# Remove both kinds of source storage so restore cannot accidentally reuse them.
run_step stop-source-writers compose "$SOURCE_PROJECT" stop frontend backend
run_step remove-source-media clear_test_media "$SOURCE_PROJECT"
run_step remove-source-project compose "$SOURCE_PROJECT" down --volumes --remove-orphans --timeout 10
run_step start-isolated-restore-database compose "$RESTORE_PROJECT" up -d --wait --wait-timeout 120 --no-build --pull never database
EMPTY_TABLES=$(compose "$RESTORE_PROJECT" exec -T database sh -c \
  'psql -X -A -t -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM pg_tables WHERE schemaname = '\''public'\'';"')
[[ "$EMPTY_TABLES" == 0 ]]
# Exact recovery commands from docs/operations.md, scoped to the new project.
run_step stop-restore-writers compose "$RESTORE_PROJECT" stop frontend backend
run_step initialize-restore-media compose "$RESTORE_PROJECT" run --rm --no-deps --pull never -T media-init
run_step verify-empty-restore-media compose "$RESTORE_PROJECT" run --rm --no-deps --pull never -T --entrypoint sh backend \
  -c 'test -z "$(find /app/data -mindepth 1 -print -quit)"'
run_step restore-database compose "$RESTORE_PROJECT" exec -T database sh -c \
  'pg_restore --exit-on-error --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$POPULATED_BACKUP/database.dump"
run_step restore-media compose "$RESTORE_PROJECT" run --rm --no-deps -T --entrypoint sh backend \
  -c 'find /app/data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + && tar -xzf - -C /app/data' \
  < "$POPULATED_BACKUP/media.tar.gz"
migration_snapshot "$RESTORE_PROJECT" > "$RUNTIME_DIR/restored-migrations.jsonl"
run_step compare-migration-history diff -u "$RUNTIME_DIR/source-migrations.jsonl" "$RUNTIME_DIR/restored-migrations.jsonl"
run_step verify-restored-media-permissions compose "$RESTORE_PROJECT" run --rm --no-deps -T --entrypoint sh backend \
  -c 'test "$(id -u)" != 0 && test -r /app/data && test -w /app/data && find /app/data -type f -exec test -r {} \;'
run_step start-restored-stack compose "$RESTORE_PROJECT" up -d --wait --wait-timeout 120 --no-build --pull never backend frontend
RESTORE_URL=$(stack_url "$RESTORE_PROJECT")
run_step verify-isolated-restore timeout 180s node scripts/compose-smoke.mjs verify \
  "$RESTORE_URL" "$RUNTIME_DIR/state.json" "$REPORT_DIR/restored-http.json"
STAGE=all-checks-passed
