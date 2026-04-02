# ===========================================
# Quang Huong Computer - Makefile
# ===========================================
# Quick commands for development & deployment
# Usage: make <target>
# ===========================================

.PHONY: help dev up down build run-api run-frontend clean restore test \
        uat-up uat-down uat-build uat-logs \
        prod-up prod-down prod-build prod-logs prod-status \
        backup db-shell docker-prune

# ============================================
# HELP
# ============================================
help: ## Show available commands
	@echo ""
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║       Quang Hưởng Computer — Makefile Commands            ║"
	@echo "╚════════════════════════════════════════════════════════════╝"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================
# DEVELOPMENT (Local)
# ============================================
dev: up run-api run-frontend ## Start everything for local dev

up: ## Start Docker infra (Postgres, Redis, RabbitMQ)
	docker compose --env-file .env.docker up -d

down: ## Stop Docker infra
	docker compose down

build: ## Build backend .NET solution
	dotnet build backend/ApiGateway/ApiGateway.csproj

run-api: ## Run backend API (development)
	cd backend/ApiGateway && ASPNETCORE_ENVIRONMENT=Development dotnet run &

run-frontend: ## Run frontend Vite dev server
	cd frontend && npm run dev &

restore: ## Restore NuGet packages
	dotnet restore backend/ApiGateway/ApiGateway.csproj

test: ## Run backend tests
	dotnet test backend/ApiGateway/ApiGateway.csproj

clean: ## Clean build artifacts
	dotnet clean backend/ApiGateway/ApiGateway.csproj
	rm -rf backend/**/bin backend/**/obj
	rm -rf frontend/dist frontend/node_modules/.vite

# ============================================
# UAT ENVIRONMENT
# ============================================
uat-up: ## Deploy UAT stack
	docker compose -f docker-compose.uat.yml --env-file .env.uat up -d --build

uat-down: ## Tear down UAT stack
	docker compose -f docker-compose.uat.yml --env-file .env.uat down

uat-build: ## Build UAT images without starting
	docker compose -f docker-compose.uat.yml --env-file .env.uat build --no-cache

uat-logs: ## Tail UAT logs
	docker compose -f docker-compose.uat.yml --env-file .env.uat logs -f --tail=100

uat-status: ## Show UAT container status
	docker compose -f docker-compose.uat.yml --env-file .env.uat ps

# ============================================
# PRODUCTION ENVIRONMENT
# ============================================
prod-up: ## Deploy Production stack
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

prod-down: ## Tear down Production stack (⚠️  CAREFUL)
	@echo "⚠️  You are about to stop PRODUCTION. Press Ctrl+C to cancel."
	@sleep 5
	docker compose -f docker-compose.prod.yml --env-file .env.prod down

prod-build: ## Build Production images without starting
	docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache

prod-logs: ## Tail Production logs
	docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=200

prod-status: ## Show Production container status & health
	@echo "=== Container Status ==="
	docker compose -f docker-compose.prod.yml --env-file .env.prod ps
	@echo ""
	@echo "=== Health Checks ==="
	@docker inspect --format='{{.Name}}: {{.State.Health.Status}}' $$(docker compose -f docker-compose.prod.yml --env-file .env.prod ps -q) 2>/dev/null || true

prod-restart-backend: ## Restart only backend container (zero-downtime on nginx layer)
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --no-deps backend

prod-restart-frontend: ## Rebuild & restart frontend only
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --no-deps frontend

# ============================================
# DATABASE & BACKUP
# ============================================
backup: ## Backup database
	./scripts/backup-database.sh backup

backup-list: ## List available backups
	./scripts/backup-database.sh list

db-shell: ## Open PostgreSQL shell (dev)
	docker exec -it quanghuong-postgres psql -U postgres -d quanghuongdb

# ============================================
# DOCKER MAINTENANCE
# ============================================
docker-prune: ## Remove dangling images and stopped containers
	docker system prune -f
	docker image prune -f

docker-size: ## Show Docker disk usage
	docker system df
