# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY ["backend/ApiGateway/ApiGateway.csproj", "backend/ApiGateway/"]
COPY ["backend/BuildingBlocks/BuildingBlocks.csproj", "backend/BuildingBlocks/"]
COPY ["backend/Services/Catalog/Catalog.csproj", "backend/Services/Catalog/"]
COPY ["backend/Services/Sales/Sales.csproj", "backend/Services/Sales/"]
COPY ["backend/Services/Repair/Repair.csproj", "backend/Services/Repair/"]
COPY ["backend/Services/Identity/Identity.csproj", "backend/Services/Identity/"]
COPY ["backend/Services/Inventory/Inventory.csproj", "backend/Services/Inventory/"]
COPY ["backend/Services/Accounting/Accounting.csproj", "backend/Services/Accounting/"]
COPY ["backend/Services/Warranty/Warranty.csproj", "backend/Services/Warranty/"]
COPY ["backend/Services/Payments/Payments.csproj", "backend/Services/Payments/"]
COPY ["backend/Services/Content/Content.csproj", "backend/Services/Content/"]
COPY ["backend/Services/Ai/Ai.csproj", "backend/Services/Ai/"]
COPY ["backend/Services/Communication/Communication.csproj", "backend/Services/Communication/"]

RUN dotnet restore "backend/ApiGateway/ApiGateway.csproj"

# Copy everything else and build
COPY . .
WORKDIR /app/backend/ApiGateway
RUN dotnet publish -c Release -o /app/out

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "ApiGateway.dll"]
