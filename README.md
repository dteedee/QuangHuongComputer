# Computer Company Platform - README

## Overview
A comprehensive **Modular Monolith** platform for a computer sales and repair company, built with modern DevOps practices.

## Tech Stack
- **Backend**: .NET 8, EF Core, PostgreSQL, MediatR (CQRS), Clean Architecture
- **Frontend**: React 19, Vite, TypeScript, TailwindCSS, shadcn/ui, TanStack Query
- **Infrastructure**: Docker, Docker Compose, PostgreSQL, Redis, RabbitMQ
- **DevOps**: GitHub Actions (planned), Helm, ArgoCD (planned), Grafana Stack (planned)

## Project Structure
```
QuangHuongComputer/
├── backend/
│   ├── ApiGateway/           # Main API host
│   ├── BuildingBlocks/       # Shared kernel & utilities
│   └── Services/
│       ├── Catalog/          # Product catalog module
│       └── Identity/         # Authentication module (planned)
├── frontend/                 # React web application
├── infra/
│   └── docker-compose.yml    # Local development stack
└── docs/                     # Documentation
```

## Quick Start

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- Docker Desktop

### Running Locally

1. **Start Infrastructure**
```powershell
cd infra
docker-compose up -d
```

2. **Run Backend**
```powershell
cd backend
dotnet run --project ApiGateway/ApiGateway.csproj

```

3. **Run Frontend**
```powershell
cd frontend
npm install
npm run dev
```

### API Endpoints

**Catalog Module:**
- `GET /api/products?page=1&pageSize=10` - List products
- `POST /api/products` - Create product
- `POST /api/brands` - Create brand
- `POST /api/categories` - Create category

**Health Check:**
- `GET /health` - API health status

### Database
- **Host**: localhost:5432
- **Database**: computer_db
- **User**: postgres
- **Password**: password

The database is automatically seeded with sample data on first run.

## Features Implemented

### Phase A: Foundation ✅
- [x] Monorepo structure
- [x] Docker Compose infrastructure
- [x] .NET 8 backend skeleton
- [x] React 19 frontend skeleton

### Phase B: Catalog Module ✅
- [x] Product, Brand, Category entities
- [x] CQRS with MediatR
- [x] EF Core with PostgreSQL
- [x] REST API endpoints
- [x] Database seeding

### Upcoming Features
- Sales Module (Cart, Checkout, Orders)
- Repair Module (Work Orders, Technician Management)
- Warranty Tracking
- B2B Credit Management
- Inventory Management
- And more...

## Development

### Running Tests
```powershell
dotnet test
```

### Database Migrations
```powershell
cd backend/Services/Catalog
dotnet ef migrations add MigrationName
dotnet ef database update
```

## Contributing
This is a portfolio/learning project demonstrating enterprise-grade architecture and DevOps practices.

## License
MIT
