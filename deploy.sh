#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
SHA=${1:-}
[[ $# == 1 && "$SHA" =~ ^[a-f0-9]{40}$ ]] || {
  echo 'Usage: ./deploy.sh <full published main commit SHA>' >&2
  exit 2
}
# Avoid combining release code/schema with another checkout's deployment scripts.
[[ $(git rev-parse HEAD) == "$SHA" && -z $(git status --porcelain --untracked-files=no) ]] || {
  echo 'Check out the clean commit matching the selected image SHA first.' >&2
  exit 2
}
umask 077
mkdir -p deployment
MANIFEST="deployment/sha-${SHA}.yml"
cat > "$MANIFEST" <<YAML
services:
  backend:
    image: ghcr.io/ahricool/cool-backend:sha-${SHA}
  migrate:
    image: ghcr.io/ahricool/cool-backend:sha-${SHA}
  seed:
    image: ghcr.io/ahricool/cool-backend:sha-${SHA}
  frontend:
    image: ghcr.io/ahricool/cool-frontend:sha-${SHA}
YAML
COMPOSE=(scripts/compose.sh --images "$MANIFEST")
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" pull backend frontend database
"${COMPOSE[@]}" up -d --wait database
if [[ "${SKIP_BACKUP:-0}" != 1 ]]; then
  # On a first installation the pulled image initializes an empty media volume.
  if [[ -f deployment/current.yml ]]; then ./backup.sh
  else ./backup.sh --images "$MANIFEST"; fi
fi
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" run --rm seed
"${COMPOSE[@]}" up -d --wait --remove-orphans backend frontend
if [[ -f deployment/current.yml ]]; then cp deployment/current.yml deployment/previous.yml; fi
cp "$MANIFEST" deployment/current.yml.tmp
mv deployment/current.yml.tmp deployment/current.yml
printf '%s\n' 'Deployment ready. Visit /admin/login to set the first password before exposing a new instance.'
