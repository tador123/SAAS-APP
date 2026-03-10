#!/bin/bash
#
# PostgreSQL Backup Script — run via cron or Docker exec
#
# Usage (cron, daily at 2 AM):
#   0 2 * * * /path/to/backup-db.sh >> /var/log/db-backup.log 2>&1
#
# Usage (Docker):
#   docker exec hotel_db /scripts/backup-db.sh
#

set -euo pipefail

DB_NAME="${DB_NAME:-hotelrestaurant}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of database '${DB_NAME}'..."

pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# Remove backups older than retention period
echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

REMAINING=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)
echo "[$(date)] ${REMAINING} backup(s) retained."
echo "[$(date)] Done."
