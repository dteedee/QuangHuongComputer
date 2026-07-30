#!/usr/bin/env bash
# db-migrate-all.sh
# Applies EF Core migrations for every module DbContext in the ComputerCompany solution.
#
# Requirements:
#   - dotnet-ef installed (dotnet tool install --global dotnet-ef)
#   - Working ConnectionStrings:DefaultConnection (via appsettings.*.json or .env)
#
# Usage:
#   ./scripts/db-migrate-all.sh              # runs against ASPNETCORE_ENVIRONMENT (default Development)
#   ASPNETCORE_ENVIRONMENT=Staging ./scripts/db-migrate-all.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STARTUP="$REPO_ROOT/backend/ApiGateway"

# tuple: <project-path>|<DbContext-class-name>
CONTEXTS=(
  "backend/Services/Catalog|CatalogDbContext"
  "backend/Services/Sales|SalesDbContext"
  "backend/Services/Repair|RepairDbContext"
  "backend/Services/Warranty|WarrantyDbContext"
  "backend/Services/Content|ContentDbContext"
  "backend/Services/Identity|IdentityDbContext"
  "backend/Services/Payments|PaymentsDbContext"
  "backend/Services/Inventory|InventoryDbContext"
  "backend/Services/Accounting|AccountingDbContext"
  "backend/Services/Ai|AiDbContext"
  "backend/Services/Communication|CommunicationDbContext"
  "backend/Services/HR|HRDbContext"
  "backend/Services/SystemConfig|SystemConfigDbContext"
  "backend/Services/CRM|CrmDbContext"
)

echo "Applying migrations against env=${ASPNETCORE_ENVIRONMENT:-Development}"

for entry in "${CONTEXTS[@]}"; do
  project="${entry%%|*}"
  context="${entry##*|}"
  echo ""
  echo "==> $context ($project)"
  dotnet ef database update \
    --project "$REPO_ROOT/$project" \
    --startup-project "$STARTUP" \
    --context "$context"
done

echo ""
echo "All migrations applied successfully."
