# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Start Infrastructure
```bash
cd infra
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- RabbitMQ on port 5672 (Management UI: http://localhost:15672)

### 2. Run Backend
```bash
cd backend
dotnet run --project ApiGateway/ApiGateway.csproj
```

Backend will be available at: **http://localhost:5000**
Swagger UI: **http://localhost:5000/swagger**

### 3. Run Frontend
```bash
cd frontend
npm install  # First time only
npm run dev
```

Frontend will be available at: **http://localhost:5173**

### 4. Login
Navigate to http://localhost:5173 and login with:
- **Email**: `admin@quanghuong.com`
- **Password**: `Admin@123`

## 📱 Try These Features

### Customer Features
1. **Browse Products** - Homepage shows product catalog
2. **Add to Cart** - Click products to add to cart
3. **Book Repair** - Go to `/repairs` to book a repair service
4. **AI Chatbot** - Click the blue chat button (bottom right)
5. **Live Support** - Go to `/support` for real-time chat

### Admin Features
1. **Admin Dashboard** - Navigate to `/admin`
2. **Manage Products** - `/admin/products`
3. **View Orders** - `/admin/orders`
4. **Manage Users** - `/admin/users`

## 🧪 Test the APIs

### Using Swagger
1. Open http://localhost:5000/swagger
2. Try the `/api/catalog/products` endpoint
3. Authorize with JWT token from login

### Using curl
```bash
# Get products
curl http://localhost:5000/api/catalog/products

# Register
curl -X POST http://localhost:5000/api/identity/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123","fullName":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/identity/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@quanghuong.com","password":"Admin@123"}'
```

## 🔍 Verify Everything Works

### Check Database
```bash
docker exec -it quanghuong-postgres psql -U postgres -d quanghuong

# List all schemas
\dn

# Check products
SELECT * FROM catalog.products LIMIT 5;
```

### Check RabbitMQ
1. Open http://localhost:15672
2. Login: `guest` / `guest`
3. Check queues and exchanges

### Check Redis
```bash
docker exec -it quanghuong-redis redis-cli
PING  # Should return PONG
```

## 🛠️ Troubleshooting

### Backend won't start
```bash
# Clean and rebuild
dotnet clean
dotnet restore
dotnet build
```

### Frontend errors
```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install
```

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart if needed
docker-compose restart postgres
```

### Port conflicts
If ports are already in use, edit `docker-compose.yml` or `appsettings.json` to use different ports.

## 📚 Next Steps
- Read `IMPLEMENTATION_SUMMARY.md` for full feature list
- Check `docs/architecture.md` for system design
- Review `docs/rbac-permissions.md` for security model
- See `docs/runbook.md` for operations guide

## 🎯 Development Workflow

### Make Changes
1. Edit code in your IDE
2. Backend auto-reloads (hot reload)
3. Frontend auto-reloads (Vite HMR)

### Run Tests
```bash
cd backend
dotnet test
```

### Build for Production
```bash
# Backend
dotnet publish -c Release

# Frontend
npm run build
```

---

**Happy Coding! 🎉**
