#!/usr/bin/env bash
set -euo pipefail

# ScreenCold Rollback Script
# Usage: ./scripts/rollback.sh [web|worker|db|all]

SERVICE="${1:-all}"
COMMIT="${2:-HEAD~1}"

echo "=== ScreenCold Rollback ==="
echo "Service: $SERVICE"
echo "Target:  $COMMIT"
echo ""

rollback_web() {
  echo "[web] Rolling back web service..."
  docker compose stop web
  docker compose rm -f web
  git checkout "$COMMIT" -- Dockerfile.web screencold-web/
  docker compose up -d --build web
  echo "[web] Rollback complete"
}

rollback_worker() {
  echo "[worker] Rolling back worker service..."
  docker compose stop worker
  docker compose rm -f worker
  git checkout "$COMMIT" -- Dockerfile.worker screencold-worker/
  docker compose up -d --build worker
  echo "[worker] Rollback complete"
}

rollback_db() {
  echo "[db] Rolling back database migration..."
  local last_migration
  last_migration=$(ls -1 packages/db/prisma/migrations/ | sort | tail -n 2 | head -n 1)
  if [ -n "$last_migration" ]; then
    echo "[db] Rolling back to: $last_migration"
    npx prisma migrate resolve --rolled-back "$last_migration"
    echo "[db] Migration rollback complete"
  else
    echo "[db] No migration to rollback"
  fi
}

case "$SERVICE" in
  web)
    rollback_web
    ;;
  worker)
    rollback_worker
    ;;
  db)
    rollback_db
    ;;
  all)
    rollback_db
    rollback_worker
    rollback_web
    echo "=== Full rollback complete ==="
    ;;
  *)
    echo "Usage: $0 [web|worker|db|all] [commit]"
    exit 1
    ;;
esac
