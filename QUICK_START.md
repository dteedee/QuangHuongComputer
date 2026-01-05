# QuangHuongComputer - Quick Start Guide

## Prerequisites
- .NET 8.0 SDK or higher
- PostgreSQL database
- Docker (optional, for containerized deployment)
- Node.js 18+ (for frontend)

## Backend Setup

### 1. Build the Solution
```powershell
cd backend
dotnet restore ComputerCompany.sln
dotnet build ComputerCompany.sln
```

### 2. Run Tests
```powershell
# Run all tests
dotnet test ComputerCompany.sln

# Run specific test project
dotnet test Services/Sales.Tests/Sales.Tests.csproj
dotnet test Services/Inventory.Tests/Inventory.Tests.csproj
dotnet test Services/Repair.Tests/Repair.Tests.csproj
```

### 3. Configure Database
Update `appsettings.json` in ApiGateway with your PostgreSQL connection string:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=quanghuong;Username=postgres;Password=yourpassword"
  }
}
```

### 4. Run the API Gateway
```powershell
cd ApiGateway
dotnet run
```

The API will be available at:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger UI: `https://localhost:5001/swagger`

## Frontend Setup

### 1. Install Dependencies
```powershell
cd frontend
npm install
```

### 2. Run Development Server
```powershell
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Docker Compose (Full Stack)

### 1. Start All Services
```powershell
docker-compose up -d
```

This will start:
- PostgreSQL database
- RabbitMQ message broker
- Backend API
- Frontend application

### 2. Stop All Services
```powershell
docker-compose down
```

## API Endpoints

### Identity Module
- `POST /api/identity/register` - Register new user
- `POST /api/identity/login` - User login
- `GET /api/identity/me` - Get current user info

### Sales Module
- `POST /api/sales/checkout` - Create order from cart
- `GET /api/sales/orders` - Get user's orders
- `GET /api/sales/orders/{id}` - Get specific order

### Repair Module
- `POST /api/repairs` - Create repair request
- `GET /api/repairs` - Get user's repair requests
- `GET /api/repairs/{id}` - Get specific repair request
- `GET /api/repairs/all` - Get all repairs (Admin/Technician only)

### Catalog Module
- `GET /api/catalog/products` - List all products
- `GET /api/catalog/products/{id}` - Get product details
- `GET /api/catalog/categories` - List categories

### Warranty Module
- `POST /api/warranty/claims` - File warranty claim
- `GET /api/warranty/claims` - Get user's claims
- `GET /api/warranty/policies` - List warranty policies

## Testing with Swagger

1. Navigate to `https://localhost:5001/swagger`
2. Click "Authorize" and enter your JWT token
3. Test endpoints directly from the UI

## Default Test Users

After running the Identity seeder:

**Admin User:**
- Email: `admin@quanghuong.com`
- Password: `Admin@123`
- Roles: Admin

**Customer User:**
- Email: `customer@example.com`
- Password: `Customer@123`
- Roles: Customer

**Technician User:**
- Email: `technician@quanghuong.com`
- Password: `Tech@123`
- Roles: Technician

## Common Commands

### Clean and Rebuild
```powershell
dotnet clean
dotnet build
```

### Run with Watch (Auto-reload)
```powershell
cd ApiGateway
dotnet watch run
```

### Generate Migration (Example for Sales module)
```powershell
cd Services/Sales
dotnet ef migrations add InitialCreate --context SalesDbContext
dotnet ef database update --context SalesDbContext
```

### View Logs
```powershell
# Docker logs
docker-compose logs -f api

# Application logs are in console output when running with dotnet run
```

## Troubleshooting

### Build Errors
1. Clean the solution: `dotnet clean`
2. Remove bin/obj folders: `Get-ChildItem -Path . -Include bin,obj -Recurse | Remove-Item -Recurse -Force`
3. Restore packages: `dotnet restore`
4. Rebuild: `dotnet build`

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check connection string in appsettings.json
3. Ensure database exists or run migrations

### Port Already in Use
1. Change ports in `launchSettings.json`
2. Or kill the process using the port:
   ```powershell
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```

## Project Structure

```
backend/
├── ApiGateway/              # Main entry point
├── BuildingBlocks/          # Shared infrastructure
├── Services/
│   ├── Sales/              # Sales module
│   ├── Inventory/          # Inventory module
│   ├── Repair/             # Repair module
│   ├── Catalog/            # Product catalog
│   ├── Identity/           # Authentication
│   ├── Warranty/           # Warranty management
│   ├── Accounting/         # Financial transactions
│   ├── Payments/           # Payment processing
│   ├── Content/            # CMS
│   ├── Ai/                 # AI features
│   └── Communication/      # Real-time messaging
└── Tests/
    ├── Sales.Tests/
    ├── Inventory.Tests/
    └── Repair.Tests/
```

## Next Steps

1. Review the [BUILD_AND_TEST_SUMMARY.md](BUILD_AND_TEST_SUMMARY.md) for detailed test results
2. Check [walkthrough.md](.gemini/antigravity/brain/.../walkthrough.md) for manual testing steps
3. Explore the Swagger UI to understand available endpoints
4. Start developing new features or fixing issues

## Support

For issues or questions:
1. Check the documentation in the `.gemini` folder
2. Review test files for usage examples
3. Examine the implementation plan for architecture details
