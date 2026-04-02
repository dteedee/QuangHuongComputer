---
description: How to deploy the Quang Huong Computer application to production
---

# Deploy to Production

## Prerequisites
- Docker & Docker Compose v2 installed on the target server
- SSH access to the server
- `.env.prod` file configured (copy from `.env.prod.example`)
- SSL certificates in `./nginx/ssl/` (if using HTTPS)
- Domain DNS pointing to server IP

## Step-by-step

### 1. Prepare Environment
// turbo
```bash
# On the server, clone or pull latest code
cd /opt/quanghuong
git pull origin main
```

### 2. Create .env.prod (first time only)
```bash
cp .env.prod.example .env.prod
nano .env.prod  # Fill in REAL production values
```

### 3. Build & Deploy
// turbo
```bash
make prod-build
```

// turbo
```bash
make prod-up
```

### 4. Verify Deployment
// turbo
```bash
make prod-status
```

// turbo
```bash
# Check backend health
curl -f http://localhost:8080/health
```

### 5. Check Logs if issues
```bash
make prod-logs
```

## Zero-Downtime Backend Update
// turbo
```bash
make prod-restart-backend
```

## Zero-Downtime Frontend Update
// turbo
```bash
make prod-restart-frontend
```

## Rollback
```bash
# Stop current
make prod-down

# Checkout previous version
git checkout <previous-tag>

# Rebuild and start
make prod-up
```

## Backup Before Deploy
// turbo
```bash
make backup
```
