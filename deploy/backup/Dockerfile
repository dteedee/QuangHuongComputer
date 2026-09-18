# Backup sidecar (D05 mục 6/31): postgres:16-alpine already carries pg_dump/pg_restore that
# match the server exactly (no version-skew risk), plus rclone (offsite push) + age (client-side
# encryption — the server never holds the private key) + crond (the base image's own busybox
# cron, no separate cron package to install).
FROM postgres:16-alpine

RUN apk add --no-cache rclone age tzdata bash \
    && cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime \
    && echo "Asia/Ho_Chi_Minh" > /etc/timezone

WORKDIR /scripts
COPY deploy/backup/backup.sh deploy/backup/restore-drill.sh /scripts/
COPY deploy/backup/crontab /etc/crontabs/root
RUN chmod +x /scripts/backup.sh /scripts/restore-drill.sh \
    && mkdir -p /backups

# No HEALTHCHECK: this container's job is cron ticks + one-shot `docker compose exec` runs
# (`make backup`, `make restore-drill`), not serving traffic — a heartbeat file is the signal
# (see backup.sh), read by /health/ready's external uptime check per D05 mục 13, not by Docker.
ENTRYPOINT ["crond", "-f", "-l", "2"]
