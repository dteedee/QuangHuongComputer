# ===========================================
# Quang Huong Computer — Makefile (D05 / phase-64 W1-14)
# ===========================================
# ONE stack, two entry points: `make up` (Docker-only, local demo) and `make deploy` (server) run
# the SAME images through the SAME migrate-then-serve sequence (scripts/stack-up.sh) — every local
# demo is a deployment rehearsal.
#
# COMPOSE_PROJECT_NAME defaults to "quanghuong"; override it for a second, isolated stack (a
# rehearsal, or a second demo on the same machine) — see scripts/stack-up.sh's safety stop, which
# refuses to touch a Postgres container that belongs to a DIFFERENT project than the one you asked
# for, so `make up` can never accidentally seize someone else's database.
#
# ENV_FILE defaults to .env.prod for every prod-shaped target — UAT is the SAME compose file with
# a different .env (D05 §2: "UAT = cùng file prod với .env khác"), so `ENV_FILE=.env.uat make
# deploy TAG=vX` deploys to UAT with no other change.
# ===========================================

SHELL := /bin/bash
COMPOSE_PROJECT_NAME ?= quanghuong
ENV_FILE ?= .env.prod
export COMPOSE_PROJECT_NAME

PROD_COMPOSE := docker compose -p $(COMPOSE_PROJECT_NAME) -f docker-compose.yml -f docker-compose.prod.yml --env-file $(ENV_FILE)
DEV_COMPOSE  := docker compose -p $(COMPOSE_PROJECT_NAME) -f docker-compose.yml --env-file .env.docker

.PHONY: help up dev down reset-demo logs backup backup-up restore-drill check-secrets deploy prod-build prod-status \
        db-shell docker-prune docker-size

help: ## Show available commands
	@echo ""
	@echo "Quang Huong Computer — Makefile"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'
	@echo ""

# ============================================
# LOCAL DEMO / DEV
# ============================================
up: ## Bring up the whole stack from a clean clone (Docker only): migrated + seeded (demo), prints the URL
	@[ -f .env.docker ] || scripts/gen-secrets.sh --target .env.docker --from .env.docker.example
	scripts/stack-up.sh

dev: ## Infra in Docker (migrated + seeded demo) + API :5000 and Vite :5174 in the foreground (Ctrl-C stops both)
	@[ -f .env.docker ] || scripts/gen-secrets.sh --target .env.docker --from .env.docker.example
	$(DEV_COMPOSE) up -d --wait postgres redis rabbitmq
	$(DEV_COMPOSE) run --rm --entrypoint sh migrate -c \
		"dotnet ApiGateway.dll db migrate && dotnet ApiGateway.dll db seed --profile demo"
	@mkdir -p .run
	@echo "API log: .run/api.log · Frontend log: .run/frontend.log · Ctrl-C stops both"
	@trap 'kill 0' EXIT INT TERM; \
		(cd backend/ApiGateway && ASPNETCORE_ENVIRONMENT=Development dotnet run > ../../.run/api.log 2>&1) & \
		(cd frontend && npm run dev > ../.run/frontend.log 2>&1) & \
		wait

down: ## Stop the local stack (containers only — volumes/data are kept; add PRUNE=1 to also remove volumes)
	$(DEV_COMPOSE) --profile app --profile tools down $(if $(PRUNE),-v,)

reset-demo: ## Wipe transactional data and re-seed the demo profile (db reset --demo's own name guard: only *_test/*_demo databases)
	$(DEV_COMPOSE) run --rm --entrypoint sh migrate -c "dotnet ApiGateway.dll db reset --demo"

logs: ## Tail every running container's logs
	$(DEV_COMPOSE) --profile app logs -f --tail=200

# ============================================
# BACKUP / RESTORE DRILL (deploy/backup/*, D05 §6/§7 — prod stack only)
# ============================================
# scripts/stack-up.sh brings up postgres/redis/rabbitmq then api/web BY NAME, so the backup
# sidecar is never started by it — without this target a deployed server silently has no cron
# backups at all and `make backup` fails with "service backup is not running" (W4-5 rehearsal).
backup-up: ## Build (if needed) and start the backup sidecar — cron backups only run while it is up
	$(PROD_COMPOSE) up -d --build backup

backup: backup-up ## Run an on-demand backup through the sidecar
	$(PROD_COMPOSE) exec backup /scripts/backup.sh manual

restore-drill: backup-up ## Prove the latest backup restores (pass AGE_PRIVATE_KEY=<key> if dumps are encrypted)
	$(PROD_COMPOSE) exec -e BACKUP_AGE_PRIVATE_KEY=$(AGE_PRIVATE_KEY) backup /scripts/restore-drill.sh

# ============================================
# PRODUCTION (and UAT, via ENV_FILE — see file header)
# ============================================
# `scripts/gen-secrets.sh` fills POSTGRES/REDIS/RABBITMQ/JWT only — ADMIN_INITIAL_PASSWORD keeps
# the CHANGE_ME_* value straight out of the public .env.prod.example, and `db seed` would create
# the administrator with a password anyone can read in the repo (W4-5 rehearsal). Fail closed.
check-secrets: ## Refuse to deploy while $(ENV_FILE) still holds a CHANGE_ME_* placeholder
	@missing=$$(grep -nE '^[A-Z_]+=(CHANGE_ME.*)$$' $(ENV_FILE) || true); \
	if [ -n "$$missing" ]; then \
		echo "REFUSED: $(ENV_FILE) still has placeholder values — set them before deploying:" >&2; \
		echo "$$missing" >&2; \
		echo "  hint: scripts/gen-secrets.sh fills the infra passwords; ADMIN_INITIAL_PASSWORD is yours to choose," >&2; \
		echo "        e.g. ADMIN_INITIAL_PASSWORD=\"$$(openssl rand -base64 18)\"" >&2; \
		exit 1; \
	fi
	@echo "check-secrets: $(ENV_FILE) has no placeholder values left"

deploy: check-secrets ## Pull ONLY api+web (never infra), migrate, restart — make deploy TAG=v1.2.3
	@[ -n "$(TAG)" ] || (echo "usage: make deploy TAG=v1.2.3" >&2; exit 2)
	APP_VERSION=$(TAG) $(PROD_COMPOSE) pull api web
	APP_VERSION=$(TAG) COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) scripts/stack-up.sh --prod --env-file $(ENV_FILE)
	$(MAKE) backup-up

prod-build: ## Build prod images locally instead of pulling (fallback when CI/registry is unavailable)
	$(PROD_COMPOSE) build api web

prod-status: ## Show prod container status + health
	$(PROD_COMPOSE) ps

# ============================================
# UTILITIES
# ============================================
db-shell: ## Open a psql shell against the local dev database
	docker exec -it $(COMPOSE_PROJECT_NAME)-postgres psql -U postgres -d quanghuongdb

docker-prune: ## Remove dangling images and stopped containers
	docker system prune -f
	docker image prune -f

docker-size: ## Show Docker disk usage
	docker system df
