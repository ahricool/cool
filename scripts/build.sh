#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
docker build -t "${CMS_IMAGE:-sakura-cms-backend:local}" .
