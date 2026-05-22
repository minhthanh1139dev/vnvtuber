#!/usr/bin/env bash
# Pull latest image and restart stack (run on VPS from this directory).
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy from .env.example and configure secrets."
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

: "${DOCKER_IMAGE:?Set DOCKER_IMAGE in .env}"

echo "Pulling ${DOCKER_IMAGE} ..."
docker compose pull

echo "Starting stack ..."
docker compose up -d --remove-orphans

docker compose ps
curl -fsS "http://127.0.0.1:${API_PORT:-3000}/api/health" && echo ""
