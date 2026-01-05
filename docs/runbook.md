# Operational Runbook

## Development Environment
### Prerequisites
- Docker & Docker Compose
- .NET 9 SDK
- Node.js 20+

### Start Local Setup
```bash
make up
```
This starts PostgreSQL, Redis, and RabbitMQ.

### Run Backend
```bash
make run-api
```
Access Swagger at `http://localhost:5000/swagger`.

### Run Frontend
```bash
make run-frontend
```

## Deployment (K8s)

### Staging
Triggered automatically on push to `develop` branch.
- Namespace: `staging`
- URL: `api-staging.quanghuong.com`

### Production
Triggered automatically on push to `main` branch.
- Namespace: `prod`
- URL: `api.quanghuong.com`

## Database Management
### Migrations
Each module manages its own migrations.
```bash
dotnet ef migrations add [MigrationName] -c [ContextName] -p backend/Services/[Module]/[Module].csproj -s backend/ApiGateway/ApiGateway.csproj
```

### Backup
Automated daily backups to S3 via CronJob in K8s.
Manual restore:
```bash
pg_restore -d computer_db backup_file.dump
```

## Incident Response

### High Latency
1. Check Grafana dashboards for specific service latency.
2. Check database CPU/Locks.
3. Scale up replicas if CPU bound.

### Payment Failures
1. Check `Payments` module logs in Loki.
2. Verify webhook endpoints reachability.
3. Check external gateway status page (Stripe/VnPay).
