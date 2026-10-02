#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

COMPOSE=(scripts/compose.sh)
# Like finance_analysis: arguments are a shortcut for routine Compose commands.
if [[ $# -gt 0 ]]; then
  exec "${COMPOSE[@]}" "$@"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Working tree has uncommitted changes; commit or stash them before deploying.' >&2
  exit 1
fi
echo '==> Updating main'
git checkout main
git pull --ff-only origin main
REVISION=$(git rev-parse HEAD)

"${COMPOSE[@]}" config --quiet
echo '==> Pulling latest images'
# Pull everything before changing containers, taking a backup, or migrating.
"${COMPOSE[@]}" pull backend frontend database
# The two image jobs publish separately. Refuse a mixed release if deployment
# catches latest between their pushes; retry once both jobs have completed.
BACKEND_REVISION=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' ghcr.io/ahricool/cool-backend:latest)
FRONTEND_REVISION=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' ghcr.io/ahricool/cool-frontend:latest)
if [[ "$BACKEND_REVISION" != "$REVISION" || "$FRONTEND_REVISION" != "$REVISION" ]]; then
  echo 'Latest backend/frontend do not match updated main. Wait for both CI image jobs, then retry.' >&2
  exit 1
fi

"${COMPOSE[@]}" up -d --wait --no-build --pull never database
if [[ "${SKIP_BACKUP:-0}" != 1 ]]; then ./backup.sh; fi
"${COMPOSE[@]}" run --rm --no-deps --pull never migrate
"${COMPOSE[@]}" run --rm --no-deps --pull never seed
"${COMPOSE[@]}" up -d --wait --no-build --pull never --remove-orphans backend frontend
printf 'Deployment ready (%s). Visit /admin/login to set the first password before exposing a new instance.\n' "$BACKEND_REVISION"
