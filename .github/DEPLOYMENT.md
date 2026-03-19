# Deployment Guide - Quang Huong Computer

## Overview

This project uses GitHub Actions for CI/CD with the following pipeline:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   develop   │────▶│    TEST     │────▶│    main     │────▶│     UAT     │
│   branch    │     │ environment │     │   branch    │     │ environment │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼ (manual)
                                                            ┌─────────────┐
                                                            │ PRODUCTION  │
                                                            └─────────────┘
```

## Workflows

### 1. CI - Build & Test (`ci.yml`)
- **Trigger:** Push/PR to `main` or `develop`
- **Jobs:**
  - Backend build & test
  - Frontend build & test
  - Security scanning
  - Docker build verification

### 2. CD - Test Environment (`cd-test.yml`)
- **Trigger:** Push to `develop` branch
- **Auto-deploys** after CI passes
- No approval required

### 3. CD - UAT Environment (`cd-uat.yml`)
- **Trigger:** Push to `main` branch
- **Requires:** Manual approval via GitHub environment
- Creates draft release

### 4. CD - Production (`cd-production.yml`)
- **Trigger:** Manual only (workflow_dispatch)
- **Requires:**
  - Tech Lead approval
  - Operations approval
  - Version confirmation
- Creates production release

## Environment Setup

### Required Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

#### Test Environment
```
TEST_SSH_HOST          # Test server hostname
TEST_SSH_USER          # SSH username
TEST_SSH_KEY           # SSH private key
TEST_SSH_PORT          # SSH port (default: 22)
TEST_DEPLOY_PATH       # Deployment path on server
TEST_URL               # Test frontend URL
TEST_API_URL           # Test API URL
```

#### UAT Environment
```
UAT_SSH_HOST           # UAT server hostname
UAT_SSH_USER           # SSH username
UAT_SSH_KEY            # SSH private key
UAT_DEPLOY_PATH        # Deployment path on server
UAT_URL                # UAT frontend URL
UAT_API_URL            # UAT API URL

# Application secrets
GOOGLE_CLIENT_ID       # Google OAuth client ID
GOOGLE_CLIENT_SECRET   # Google OAuth client secret
CLOUDINARY_CLOUD_NAME  # Cloudinary cloud name
```

#### Production Environment
```
PROD_SSH_HOST          # Production server hostname
PROD_SSH_USER          # SSH username
PROD_SSH_KEY           # SSH private key
PROD_DEPLOY_PATH       # Deployment path
PROD_URL               # Production frontend URL
PROD_API_URL           # Production API URL

# Notifications
SLACK_WEBHOOK_URL      # Slack webhook for notifications
```

### GitHub Environments

Create these environments in repository settings → Environments:

1. **test**
   - No protection rules

2. **uat-approval**
   - Required reviewers: 1+ team members

3. **uat**
   - Deployment branch: `main`

4. **production-tech-approval**
   - Required reviewers: Tech leads

5. **production-ops-approval**
   - Required reviewers: Operations team

6. **production**
   - Required reviewers: 2+ team members
   - Deployment branch: `main`
   - Wait timer: 5 minutes (optional)

## Deployment Commands

### Deploy to Test
```bash
# Automatic on push to develop
git push origin develop

# Manual trigger
gh workflow run "CD - Deploy to Test" --ref develop
```

### Deploy to UAT
```bash
# Automatic on push to main (requires approval)
git push origin main

# Manual trigger
gh workflow run "CD - Deploy to UAT" --ref main
```

### Deploy to Production
```bash
# Manual only - requires version input
gh workflow run "CD - Deploy to Production" \
  -f version="uat-20240115-abc1234" \
  -f confirm_version="uat-20240115-abc1234" \
  -f deployment_reason="Feature release v1.2.0" \
  -f rollback_version="uat-20240114-xyz5678"
```

## Rollback Procedures

### Test/UAT Rollback
```bash
# SSH to server
ssh user@server

# Navigate to deployment directory
cd /opt/quanghuong

# Pull previous version
docker pull ghcr.io/repo/backend:previous-version
docker pull ghcr.io/repo/frontend:previous-version

# Redeploy
docker-compose -f docker-compose.uat.yml up -d --force-recreate
```

### Production Rollback
1. Go to Actions → CD - Deploy to Production
2. Run workflow with:
   - Version: previous stable version
   - Rollback version: leave empty
3. Follow approval process

## Monitoring Deployments

### View Workflow Status
```bash
# List recent runs
gh run list --workflow=ci.yml

# View specific run
gh run view <run-id>

# Watch live
gh run watch <run-id>
```

### View Deployment Logs
```bash
# Download logs
gh run download <run-id> --name deployment-logs
```

## Troubleshooting

### CI Failures
1. Check test results in workflow summary
2. Download test artifacts
3. Review security scan reports

### Deployment Failures
1. Check SSH connectivity
2. Verify Docker images exist in registry
3. Check server disk space
4. Review container logs: `docker logs <container>`

### Health Check Failures
1. Check container status: `docker ps`
2. View container logs: `docker logs backend-uat`
3. Verify database connectivity
4. Check Redis/RabbitMQ status

## Best Practices

1. **Always test in lower environments first**
2. **Use semantic versioning for releases**
3. **Keep rollback version ready for production**
4. **Monitor error rates after deployment**
5. **Document deployment reasons**
6. **Deploy during maintenance windows**

## Contact

- **DevOps Team:** devops@quanghuongcomputer.com
- **On-call:** Check PagerDuty schedule
