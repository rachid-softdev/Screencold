#!/bin/bash
set -euo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/screencold_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup..."

docker exec screencold_postgres pg_dump -U screencold screencold | gzip > "$BACKUP_FILE"

echo "Backup saved to: $BACKUP_FILE"

# Clean up old backups
find "$BACKUP_DIR" -name "screencold_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete. Size: $(du -h "$BACKUP_FILE" | cut -f1)"
