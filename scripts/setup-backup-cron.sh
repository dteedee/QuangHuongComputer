#!/bin/bash
# ============================================
# Quang Huong Computer - Setup Backup Cron Job
# ============================================
# Chạy script này để cài đặt cron job backup
# Backup sẽ chạy tự động mỗi 2 ngày vào lúc 2:00 AM
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     Quang Huong Computer - Cài đặt Backup Tự động          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Không tìm thấy script backup: $BACKUP_SCRIPT"
    exit 1
fi

# Make sure backup script is executable
chmod +x "$BACKUP_SCRIPT"

# Define cron job (every 2 days at 2:00 AM)
CRON_JOB="0 2 */2 * * ${BACKUP_SCRIPT} backup >> ${SCRIPT_DIR}/../backups/postgres/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
    echo "⚠️  Cron job backup đã tồn tại. Cập nhật..."
    # Remove existing backup cron job
    crontab -l 2>/dev/null | grep -v "backup-database.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Đã cài đặt cron job thành công!"
echo ""
echo "📋 Chi tiết:"
echo "   • Lịch backup: Mỗi 2 ngày vào lúc 2:00 AM"
echo "   • Script: ${BACKUP_SCRIPT}"
echo "   • Log: ${SCRIPT_DIR}/../backups/postgres/cron.log"
echo ""
echo "📌 Các lệnh hữu ích:"
echo "   • Xem cron jobs:    crontab -l"
echo "   • Backup thủ công:  ${BACKUP_SCRIPT} backup"
echo "   • Liệt kê backups: ${BACKUP_SCRIPT} list"
echo "   • Khôi phục:        ${BACKUP_SCRIPT} restore <file>"
echo ""
echo "🗑️  Để xóa cron job:"
echo "   crontab -l | grep -v backup-database.sh | crontab -"
echo ""
