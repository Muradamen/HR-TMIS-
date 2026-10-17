#!/usr/bin/env bash
set -euo pipefail

# Database automated backup script for HT-TMIS
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ht_tmis}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="${DB_NAME:-ht_tmis}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting HT-TMIS database backup: ${BACKUP_FILE}"

if command -v pg_dump >/dev/null 2>&1 && [ -n "${PGPASSWORD:-}" ]; then
    pg_dump -h "${DB_HOST}" -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"
    echo "[$(date)] PostgreSQL backup completed successfully."
elif [ -f "db.sqlite3" ]; then
    sqlite3 db.sqlite3 ".backup '${BACKUP_DIR}/${DB_NAME}_sqlite_${TIMESTAMP}.db'"
    gzip "${BACKUP_DIR}/${DB_NAME}_sqlite_${TIMESTAMP}.db"
    echo "[$(date)] SQLite backup completed successfully."
else
    echo "[$(date)] Warning: Neither pg_dump nor db.sqlite3 available."
fi

# Clean up backups older than retention policy
find "${BACKUP_DIR}" -type f -name "*_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date)] Backup cycle finished."
