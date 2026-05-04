#!/bin/sh
set -eu

BACKUP_DIR="/backups"
DATA_DIR="/data"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

stamp="$(date +"%Y%m%d_%H%M%S")"
archive="$BACKUP_DIR/volumes_${stamp}.tar.gz"

tar -czf "$archive" -C "$DATA_DIR" .

find "$BACKUP_DIR" -type f -name "volumes_*.tar.gz" -mtime +"$RETENTION_DAYS" -print -delete
