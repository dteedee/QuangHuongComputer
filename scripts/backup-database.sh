#!/bin/bash
# ============================================
# Quang Huong Computer - Database Backup Script
# ============================================
# Chạy mỗi 2 ngày tự động backup PostgreSQL database
# Sử dụng cron: 0 2 */2 * * /path/to/backup-database.sh
# ============================================

set -euo pipefail

# ============================================
# CONFIGURATION
# ============================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Database credentials
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-quanghuongdb}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgres123}"

# Backup configuration
BACKUP_DIR="${PROJECT_ROOT}/backups/postgres"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"  # Keep backups for 30 days
MAX_BACKUPS="${MAX_BACKUPS:-15}"  # Maximum number of backups to keep

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_HUMAN=$(date '+%Y-%m-%d %H:%M:%S')
BACKUP_FILENAME="quanghuong_backup_${TIMESTAMP}"

# Log file
LOG_FILE="${BACKUP_DIR}/backup.log"

# ============================================
# FUNCTIONS
# ============================================

log() {
    local level="$1"
    local message="$2"
    echo "[${DATE_HUMAN}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

ensure_directories() {
    mkdir -p "$BACKUP_DIR"
    touch "$LOG_FILE"
}

perform_backup() {
    log "INFO" "=========================================="
    log "INFO" "Starting database backup..."
    log "INFO" "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
    log "INFO" "Backup file: ${BACKUP_FILENAME}.sql.gz"
    log "INFO" "=========================================="
    
    # Set password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Full database dump with compression
    local backup_path="${BACKUP_DIR}/${BACKUP_FILENAME}.sql.gz"
    
    if pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-privileges \
        --format=custom \
        --compress=9 \
        -f "${BACKUP_DIR}/${BACKUP_FILENAME}.dump" 2>>"$LOG_FILE"; then
        
        log "INFO" "Database dump completed successfully (custom format)"
        
        # Also create a plain SQL backup (compressed with gzip)
        pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --no-owner \
            --no-privileges \
            --format=plain 2>>"$LOG_FILE" | gzip > "$backup_path"
        
        log "INFO" "Plain SQL backup completed: ${backup_path}"
    else
        log "ERROR" "Database dump FAILED!"
        unset PGPASSWORD
        return 1
    fi
    
    unset PGPASSWORD
    
    # Calculate and log backup sizes
    if [ -f "${BACKUP_DIR}/${BACKUP_FILENAME}.dump" ]; then
        local dump_size=$(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}.dump" | cut -f1)
        log "INFO" "Custom format backup size: ${dump_size}"
    fi
    
    if [ -f "$backup_path" ]; then
        local sql_size=$(du -h "$backup_path" | cut -f1)
        log "INFO" "SQL backup size: ${sql_size}"
    fi
    
    # Create metadata file
    cat > "${BACKUP_DIR}/${BACKUP_FILENAME}.meta.json" <<EOF
{
    "timestamp": "${DATE_HUMAN}",
    "database": "${DB_NAME}",
    "host": "${DB_HOST}",
    "port": "${DB_PORT}",
    "files": {
        "dump": "${BACKUP_FILENAME}.dump",
        "sql_gz": "${BACKUP_FILENAME}.sql.gz"
    },
    "retention_days": ${BACKUP_RETENTION_DAYS}
}
EOF
    
    log "INFO" "Metadata file created: ${BACKUP_FILENAME}.meta.json"
}

cleanup_old_backups() {
    log "INFO" "Cleaning up old backups (retention: ${BACKUP_RETENTION_DAYS} days, max: ${MAX_BACKUPS})..."
    
    # Remove backups older than retention period
    local deleted_count=0
    
    find "$BACKUP_DIR" -name "quanghuong_backup_*.dump" -mtime +${BACKUP_RETENTION_DAYS} -type f | while read file; do
        local base_name=$(basename "$file" .dump)
        rm -f "${BACKUP_DIR}/${base_name}.dump"
        rm -f "${BACKUP_DIR}/${base_name}.sql.gz"
        rm -f "${BACKUP_DIR}/${base_name}.meta.json"
        deleted_count=$((deleted_count + 1))
        log "INFO" "Deleted old backup: ${base_name}"
    done
    
    # If still too many backups, remove oldest
    local backup_count=$(find "$BACKUP_DIR" -name "quanghuong_backup_*.dump" -type f | wc -l)
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        local excess=$((backup_count - MAX_BACKUPS))
        log "INFO" "Too many backups (${backup_count}), removing ${excess} oldest..."
        
        find "$BACKUP_DIR" -name "quanghuong_backup_*.dump" -type f -printf '%T+ %p\n' | \
            sort | head -n "$excess" | while read date file; do
            local base_name=$(basename "$file" .dump)
            rm -f "${BACKUP_DIR}/${base_name}.dump"
            rm -f "${BACKUP_DIR}/${base_name}.sql.gz"
            rm -f "${BACKUP_DIR}/${base_name}.meta.json"
            log "INFO" "Deleted excess backup: ${base_name}"
        done
    fi
    
    # Report remaining backups
    local remaining=$(find "$BACKUP_DIR" -name "quanghuong_backup_*.dump" -type f | wc -l)
    log "INFO" "Remaining backups: ${remaining}"
}

list_backups() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          Quang Huong Computer - Database Backups            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.dump 2>/dev/null)" ]; then
        echo "  Không có backup nào."
        return
    fi
    
    printf "  %-35s %-12s %-20s\n" "Tên file" "Kích thước" "Ngày tạo"
    echo "  ────────────────────────────────────────────────────────────"
    
    for f in $(ls -t "$BACKUP_DIR"/quanghuong_backup_*.dump 2>/dev/null); do
        local name=$(basename "$f")
        local size=$(du -h "$f" | cut -f1)
        local date=$(stat -c '%y' "$f" | cut -d'.' -f1)
        printf "  %-35s %-12s %-20s\n" "$name" "$size" "$date"
    done
    echo ""
}

restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi
    
    log "INFO" "=========================================="
    log "INFO" "Starting database restore..."
    log "INFO" "From: ${backup_file}"
    log "INFO" "To: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
    log "INFO" "=========================================="
    
    echo ""
    echo "⚠️  CẢNH BÁO: Thao tác này sẽ GHI ĐÈ toàn bộ database hiện tại!"
    echo "   Database: ${DB_NAME}"
    echo "   File: ${backup_file}"
    echo ""
    read -p "  Bạn có chắc chắn muốn tiếp tục? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "INFO" "Restore cancelled by user."
        return 0
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if [[ "$backup_file" == *.dump ]]; then
        # Restore from custom format
        pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            --verbose \
            "$backup_file" 2>>"$LOG_FILE"
    elif [[ "$backup_file" == *.sql.gz ]]; then
        # Restore from compressed SQL
        gunzip -c "$backup_file" | psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" 2>>"$LOG_FILE"
    else
        log "ERROR" "Unsupported backup format: $backup_file"
        unset PGPASSWORD
        return 1
    fi
    
    unset PGPASSWORD
    
    log "INFO" "Database restore completed successfully!"
}

# ============================================
# MAIN
# ============================================

ensure_directories

case "${1:-backup}" in
    backup)
        perform_backup
        cleanup_old_backups
        log "INFO" "Backup process completed successfully!"
        ;;
    list)
        list_backups
        ;;
    restore)
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 restore <backup_file>"
            echo "Example: $0 restore ${BACKUP_DIR}/quanghuong_backup_20250326_020000.dump"
            exit 1
        fi
        restore_backup "$2"
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    *)
        echo ""
        echo "Quang Huong Computer - Database Backup Tool"
        echo ""
        echo "Usage: $0 {backup|list|restore|cleanup}"
        echo ""
        echo "Commands:"
        echo "  backup   - Tạo backup mới (mặc định)"
        echo "  list     - Liệt kê các backup hiện có"
        echo "  restore  - Khôi phục từ backup: $0 restore <file>"
        echo "  cleanup  - Dọn dẹp backup cũ"
        echo ""
        exit 1
        ;;
esac
