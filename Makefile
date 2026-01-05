# Computer Company Platform - Makefile

.PHONY: help up down build run-api run-frontend clean restore test

help: ## Show this help message
	@echo "Available commands:"
	@echo "  make up          - Start Docker infrastructure"
	@echo "  make down        - Stop Docker infrastructure"
	@echo "  make build       - Build backend solution"
	@echo "  make run-api     - Run API Gateway"
	@echo "  make run-frontend - Run frontend dev server"
	@echo "  make restore     - Restore NuGet packages"
	@echo "  make test        - Run tests"
	@echo "  make clean       - Clean build artifacts"

up: ## Start Docker infrastructure
	cd infra && docker compose up -d

down: ## Stop Docker infrastructure
	cd infra && docker compose down

build: ## Build backend solution
	dotnet build backend/ComputerCompany.sln

run-api: ## Run API Gateway
	dotnet run --project backend/ApiGateway/ApiGateway.csproj

run-frontend: ## Run frontend dev server
	cd frontend && npm run dev

restore: ## Restore NuGet packages
	dotnet restore backend/ComputerCompany.sln

test: ## Run tests
	dotnet test backend/ComputerCompany.sln

clean: ## Clean build artifacts
	dotnet clean backend/ComputerCompany.sln
	rm -rf backend/**/bin backend/**/obj
