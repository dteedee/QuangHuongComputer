# ============================================
# Quang Huong Computer - Backend Dockerfile
# Multi-stage build for .NET 8 API Gateway
# ============================================

# ----- Build Stage -----
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy solution and project files first (layer caching)
COPY backend/ApiGateway/ApiGateway.csproj                      backend/ApiGateway/
COPY backend/BuildingBlocks/BuildingBlocks.csproj               backend/BuildingBlocks/
COPY backend/Services/Catalog/Catalog.csproj                    backend/Services/Catalog/
COPY backend/Services/Sales/Sales.csproj                        backend/Services/Sales/
COPY backend/Services/Repair/Repair.csproj                      backend/Services/Repair/
COPY backend/Services/Identity/Identity.csproj                  backend/Services/Identity/
COPY backend/Services/Inventory/Inventory.csproj                backend/Services/Inventory/
COPY backend/Services/Accounting/Accounting.csproj              backend/Services/Accounting/
COPY backend/Services/Warranty/Warranty.csproj                  backend/Services/Warranty/
COPY backend/Services/Payments/Payments.csproj                  backend/Services/Payments/
COPY backend/Services/Content/Content.csproj                    backend/Services/Content/
COPY backend/Services/Ai/Ai.csproj                              backend/Services/Ai/
COPY backend/Services/Communication/Communication.csproj        backend/Services/Communication/
COPY backend/Services/HR/HR.csproj                              backend/Services/HR/
COPY backend/Services/Reporting/Reporting.csproj                backend/Services/Reporting/
COPY backend/Services/SystemConfig/SystemConfig.csproj          backend/Services/SystemConfig/
COPY backend/Services/CRM/CRM.csproj                            backend/Services/CRM/

# Restore dependencies (cached unless *.csproj changes)
RUN dotnet restore "backend/ApiGateway/ApiGateway.csproj" --runtime linux-musl-x64

# Copy source code
COPY backend/ backend/

# Publish optimised release build
WORKDIR /src/backend/ApiGateway
RUN dotnet publish -c Release -o /app/publish \
    --no-restore \
    --runtime linux-musl-x64 \
    --self-contained false \
    /p:PublishTrimmed=false

# ----- Runtime Stage -----
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install curl for healthcheck & ICU for globalisation
RUN apk add --no-cache curl icu-libs tzdata \
    && cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime \
    && echo "Asia/Ho_Chi_Minh" > /etc/timezone

WORKDIR /app

# Copy published output
COPY --from=build /app/publish .

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

# Environment defaults
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    TZ=Asia/Ho_Chi_Minh

EXPOSE 8080

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "ApiGateway.dll"]
