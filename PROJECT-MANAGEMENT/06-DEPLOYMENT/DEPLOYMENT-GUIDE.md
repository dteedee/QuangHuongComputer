# 🚀 DEPLOYMENT GUIDE
## Quang Huong Computer - Production Deployment

---

## 📋 Overview

This guide covers the complete deployment process for the Quang Huong Computer e-commerce system, including backend microservices, frontend application, and infrastructure setup.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Production Infrastructure              │
└─────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│   Nginx/CDN    │   │  Load Balancer  │   │   Application   │
│   (Reverse     │───│  (HAProxy/Nginx)│───│   Server(s)     │
│    Proxy)      │   │                 │   │   (Docker Swarm)│
└────────────────┘   └─────────────────┘   └────────┬───────┘
                                                  │
        ┌─────────────────────────────────────────┤
        │                                         │
┌───────▼────────┐                   ┌───────────▼────────┐
│  PostgreSQL    │                   │  Redis Cache       │
│  (Primary DB)  │                   │  (Session/Cache)   │
└───────┬────────┘                   └───────────┬────────┘
        │                                        │
┌───────▼────────┐                   ┌───────────▼────────┐
│  PostgreSQL    │                   │  RabbitMQ          │
│  (Replica)     │                   │  (Message Queue)   │
└────────────────┘                   └────────────────────┘
```

---

## 🐳 Docker Deployment

### Prerequisites

1. **Docker & Docker Compose**
```bash
docker --version  # Should be 20.10+
docker compose version
```

2. **Domain & SSL**
- Purchase domain (e.g., quanghuongcomputer.com)
- Setup SSL certificates (Let's Encrypt)

3. **Server Requirements**
- Minimum 4GB RAM, 2 CPU cores
- Recommended 8GB RAM, 4 CPU cores
- 50GB+ storage

### Step 1: Build Docker Images

```bash
# Build backend services
cd backend
docker build -t qhc-catalog:latest -f Services/Catalog/Dockerfile .
docker build -t qhc-sales:latest -f Services/Sales/Dockerfile .
docker build -t qhc-inventory:latest -f Services/Inventory/Dockerfile .
# ... build other services

# Build frontend
cd ../frontend
docker build -t qhc-frontend:latest -f Dockerfile .
```

### Step 2: Deploy with Docker Compose

```bash
# Navigate to project root
cd /path/to/QuangHuongComputer

# Start all services
docker compose -f infra/docker-compose.yml up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

### Step 3: Database Migrations

```bash
# Run database migrations
docker compose exec backend dotnet ef database update

# Seed initial data
docker compose exec backend dotnet run --project seed_data.js
```

---

## ☁️ Cloud Deployment Options

### Option 1: AWS (Amazon Web Services)

#### Architecture
```
Internet Gateway
       │
       ▼
┌──────────────┐
│  ALB (HTTPS) │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  ECS Cluster     │
│  (Fargate)       │
│                  │
│  ┌────────────┐  │
│  │ Gateway    │  │
│  └────────────┘  │
│  ┌────────────┐  │
│  │ Services   │  │
│  └────────────┘  │
└──────────────────┘
       │
       ▼
┌──────────────┐    ┌──────────┐
│  RDS         │    │  ElastiCache│
│  PostgreSQL  │    │  Redis    │
└──────────────┘    └──────────┘
```

#### Deployment Steps

1. **Setup VPC & Networking**
```bash
# Using AWS CLI or Console
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24
```

2. **Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name qhc-production
```

3. **Create Task Definitions**
```json
{
  "family": "qhc-gateway",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "api-gateway",
      "image": "YOUR_ECR_URI/qhc-gateway:latest",
      "portMappings": [{"containerPort": 8080}],
      "environment": [
        {"name": "ASPNETCORE_ENVIRONMENT", "value": "Production"}
      ]
    }
  ]
}
```

4. **Create RDS Database**
```bash
aws rds create-db-instance \
  --db-instance-identifier qhc-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20
```

### Option 2: Azure Container Instances (ACI)

```bash
# Create resource group
az group create --name qhc-rg --location eastus

# Create container registry
az acr create --resource-group qhc-rg --name qhcacr --sku Basic

# Build and push images
az acr build --registry qhcacr --image qhc/gateway:latest .
az acr build --registry qhcacr --image qhc/frontend:latest ./frontend

# Deploy container group
az container create \
  --resource-group qhc-rg \
  --name qhc-gateway \
  --image qhcacr.azurecr.io/qhc/gateway:latest \
  --cpu 1 --memory 2 \
  --ports 8080 \
  --dns-name-label qhc-gateway
```

### Option 3: Google Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy qhc-gateway \
  --image gcr.io/YOUR_PROJECT_ID/qhc-gateway:latest \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars ASPNETCORE_ENVIRONMENT=Production

# Deploy frontend
gcloud run deploy qhc-frontend \
  --image gcr.io/YOUR_PROJECT_ID/qhc-frontend:latest \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'
      
      - name: Build Backend
        run: |
          cd backend
          dotnet restore
          dotnet build --configuration Release
      
      - name: Run Tests
        run: |
          cd backend
          dotnet test --configuration Release
      
      - name: Build Docker Images
        run: |
          docker build -t qhc-gateway:${{ github.sha }} -f backend/ApiGateway/Dockerfile .
          docker build -t qhc-frontend:${{ github.sha }} -f frontend/Dockerfile .
      
      - name: Push to Registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push qhc-gateway:${{ github.sha }}
          docker push qhc-frontend:${{ github.sha }}
      
      - name: Deploy to Production
        run: |
          ssh user@server "docker pull qhc-gateway:${{ github.sha }}"
          ssh user@server "docker compose -f infra/docker-compose.yml up -d"
```

---

## 🔧 Configuration Management

### Environment Variables

Create `.env.production`:

```bash
# Database
POSTGRES_HOST=postgres.production.example.com
POSTGRES_PORT=5432
POSTGRES_DB=qhc_production
POSTGRES_USER=qhc_user
POSTGRES_PASSWORD=strong_password_here

# Redis
REDIS_HOST=redis.production.example.com
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ
RABBITMQ_HOST=rabbitmq.production.example.com
RABBITMQ_PORT=5672
RABBITMQ_USER=qhc_user
RABBITMQ_PASSWORD=strong_password_here

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ISSUER=QuangHuongComputer
JWT_AUDIENCE=QuangHuongComputer

# Application
ASPNETCORE_ENVIRONMENT=Production
ALLOWED_ORIGINS=https://quanghuongcomputer.com

# Payment Gateways
VNPAY_TMN_CODE=YOUR_VNPAY_CODE
VNPAY_HASH_SECRET=YOUR_VNPAY_SECRET
MERCHANT_ID=YOUR_MERCHANT_ID
```

---

## 🔒 Security Hardening

### 1. SSL/TLS Configuration

```nginx
# /etc/nginx/sites-available/quanghuongcomputer.com
server {
    listen 443 ssl http2;
    server_name quanghuongcomputer.com;
    
    ssl_certificate /etc/letsencrypt/live/quanghuongcomputer.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quanghuongcomputer.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name quanghuongcomputer.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. Firewall Rules

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Database Security

```sql
-- Create limited user for application
CREATE USER qhc_app WITH PASSWORD 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qhc_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO qhc_app;
```

---

## 📊 Monitoring & Logging

### Prometheus + Grafana Setup

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['gateway:8080']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:9187']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:9121']
```

### Application Logging

```csharp
// appsettings.json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "System": "Warning"
      }
    },
    "WriteTo": [
      {
        "Name": "Console"
      },
      {
        "Name": "File",
        "Args": {
          "path": "logs/log-.txt",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30
        }
      }
    ]
  }
}
```

---

## 🔄 Backup & Recovery

### Database Backup

```bash
# Automated daily backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
docker exec postgres pg_dump -U qhc_user qhc_production | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

### Disaster Recovery

1. **Restore from Backup**
```bash
gunzip < backup_20240115_080000.sql.gz | docker exec -i postgres psql -U qhc_user qhc_production
```

2. **Failover to Replica**
```bash
# Promote replica to primary
docker exec postgres-replica pg_ctl promote -D /var/lib/postgresql/data
```

---

## 🧪 Testing Before Deploy

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] DNS records updated
- [ ] Firewall rules configured
- [ ] Monitoring setup
- [ ] Backup plan verified
- [ ] Rollback plan ready

### Smoke Tests

```bash
# Test API Gateway
curl https://quanghuongcomputer.com/api/health

# Test Authentication
curl -X POST https://quanghuongcomputer.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test Frontend
curl -I https://quanghuongcomputer.com
```

---

## 🔄 Rolling Updates

### Zero-Downtime Deployment

```bash
# Deploy new version with rolling update
docker compose up -d --no-deps --build gateway

# Or with Kubernetes
kubectl set image deployment/qhc-gateway qhc-gateway=qhc-gateway:v2.0
```

---

## 📝 Post-Deployment Tasks

1. **Verify Services**
```bash
docker compose ps
docker compose logs --tail=50
```

2. **Run Health Checks**
```bash
curl http://localhost:5000/api/health
```

3. **Monitor Metrics**
- Check Grafana dashboards
- Review application logs
- Verify database connections

4. **Send Deployment Notification**
- Email team
- Update documentation
- Tag release in Git

---

## 🐛 Troubleshooting

### Issue: Container won't start
```bash
# Check logs
docker compose logs gateway

# Check resource usage
docker stats
```

### Issue: Database connection failed
```bash
# Test connection
docker exec postgres psql -U qhc_user -d qhc_production

# Check database is running
docker compose ps postgres
```

### Issue: High memory usage
```bash
# Check container stats
docker stats --no-stream

# Limit memory in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

---

## 📞 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | | |
| Backend Lead | | |
| Database Admin | | |

---

*Document Version: 1.0*  
*Last Updated: 2024*  
*Owner: DevOps Team*
