# 🚀 Quang Hưởng Computer - Hướng Dẫn Chạy Hệ Thống

## 📋 Tổng Quan

Hệ thống Quang Hưởng Computer gồm:
- **Backend:** .NET 8 API Gateway + Microservices
- **Frontend:** React + Vite + TypeScript
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Message Queue:** RabbitMQ 3

---

## ✅ Trạng Thái Hiện Tại

Hệ thống **ĐANG HOẠT ĐỘNG**:

- ✅ Docker services (Postgres, Redis, RabbitMQ)
- ✅ Backend API (port 5000)
- ✅ Frontend (port 5173)

**Truy cập ngay:** http://localhost:5173

---

## 🎯 Cách Sử Dụng Nhanh

### 1️⃣ Kiểm Tra Trạng Thái
```bash
./status.sh
```

### 2️⃣ Quản Lý Hệ Thống (Menu Tương Tác)
```bash
./manage.sh
```

### 3️⃣ Lệnh Command Line
```bash
# Khởi động tất cả
./manage.sh start

# Dừng tất cả
./manage.sh stop

# Khởi động lại
./manage.sh restart

# Xem trạng thái chi tiết
./manage.sh status

# Xem logs
./manage.sh logs

# Test APIs
./manage.sh test
```

---

## 📂 Cấu Trúc Dự Án

```
QuangHuongComputer/
├── backend/                    # .NET Backend
│   ├── ApiGateway/            # API Gateway (Port 5000)
│   ├── Services/              # Microservices
│   │   ├── Catalog/          # Products, Categories, Brands
│   │   ├── Identity/         # Authentication
│   │   ├── Sales/            # Orders, Cart
│   │   ├── Payments/         # Payment processing
│   │   └── ...
│   └── BuildingBlocks/        # Shared libraries
├── frontend/                  # React Frontend (Port 5173)
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── context/          # Context providers
│   │   └── api/              # API clients
│   └── public/
├── docker-compose.yml         # Infrastructure services
├── manage.sh                  # System management script ⭐
├── status.sh                  # Quick status check ⭐
└── SYSTEM-STATUS.md          # Detailed status report
```

---

## 🔗 URLs Quan Trọng

### Người Dùng:
- **Frontend:** http://localhost:5173
- **API Gateway:** http://localhost:5000

### Quản Trị:
- **RabbitMQ Management:** http://localhost:15672
  - User: `guest` / Pass: `guest`

### API Endpoints:
- **Health:** http://localhost:5000/health
- **Products:** http://localhost:5000/api/catalog/products
- **Categories:** http://localhost:5000/api/catalog/categories
- **Brands:** http://localhost:5000/api/catalog/brands

---

## 🔧 Quản Lý Chi Tiết

### Khởi Động Thủ Công

#### 1. Docker Services (Infrastructure)
```bash
docker compose up -d

# Kiểm tra
docker compose ps
```

#### 2. Backend (.NET)
```bash
cd backend/ApiGateway
ASPNETCORE_ENVIRONMENT=Development dotnet run

# Hoặc chạy background:
ASPNETCORE_ENVIRONMENT=Development dotnet run > /tmp/backend.log 2>&1 &
```

#### 3. Frontend (React)
```bash
cd frontend
npm run dev

# Hoặc chạy background:
npm run dev > /tmp/frontend.log 2>&1 &
```

### Dừng Hệ Thống

```bash
# Dừng backend
pkill -f "dotnet run"

# Dừng frontend
pkill -f "vite"

# Dừng Docker services
docker compose down
```

### Xem Logs

```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log

# Docker logs
docker compose logs -f postgres
docker compose logs -f rabbitmq
docker compose logs -f redis
```

---

## 🗄️ Database Management

### Truy Cập PostgreSQL Shell
```bash
docker exec -it quanghuong-postgres psql -U postgres -d quanghuongdb
```

### Common Queries
```sql
-- List tables
\dt

-- View products
SELECT * FROM "Products";

-- View categories
SELECT * FROM "Categories";

-- Count records
SELECT COUNT(*) FROM "Products";
```

### Reset Database
```bash
# ⚠️ WARNING: This will delete all data!
docker exec quanghuong-postgres psql -U postgres -c "DROP DATABASE IF EXISTS quanghuongdb;"
docker exec quanghuong-postgres psql -U postgres -c "CREATE DATABASE quanghuongdb;"

# Restart backend to run migrations
pkill -f "dotnet run"
cd backend/ApiGateway && dotnet run
```

### Backup Database
```bash
# Create backup
docker exec quanghuong-postgres pg_dump -U postgres quanghuongdb > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i quanghuong-postgres psql -U postgres -d quanghuongdb < backup_20260209.sql
```

---

## 🧪 Testing & Debugging

### Test APIs với curl
```bash
# Health check
curl http://localhost:5000/health

# Get products (JSON)
curl http://localhost:5000/api/catalog/products | jq '.'

# Get categories
curl http://localhost:5000/api/catalog/categories | jq '.'

# Get specific product
curl http://localhost:5000/api/catalog/products/{id} | jq '.'
```

### Monitor Performance
```bash
# Watch backend logs in real-time
tail -f /tmp/backend.log | grep -E "Error|Exception|Warning"

# Monitor API response time
while true; do
  curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:5000/api/catalog/products
  sleep 1
done
```

### Debug Frontend
```bash
# Open browser dev tools
# Visit: http://localhost:5173
# F12 → Console

# Check Vite logs
tail -f /tmp/frontend.log
```

---

## ⚙️ Configuration Files

### Backend Config
```
backend/ApiGateway/appsettings.json           # Template (committed)
backend/ApiGateway/appsettings.Development.json  # Secrets (gitignored)
```

### Frontend Config
```
frontend/.env.example    # Template (committed)
frontend/.env           # Actual config (gitignored)
```

### Environment Variables

#### Backend (appsettings.Development.json)
- Google OAuth Client ID & Secret
- Facebook App ID & Secret
- Cloudinary URL
- Gmail SMTP credentials
- Gemini API Key
- Database connection string
- Redis password

#### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `VITE_FACEBOOK_APP_ID` - Facebook App ID
- `VITE_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name

---

## 🔒 Security Notes

### Secrets Management

**⚠️ CRITICAL:** Never commit these files:
- `frontend/.env`
- `backend/ApiGateway/appsettings.Development.json`
- `backend/ApiGateway/appsettings.Production.json`

These files are already in `.gitignore`.

### After Cloning Repository

1. Copy template files:
```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/ApiGateway/appsettings.json backend/ApiGateway/appsettings.Development.json
```

2. Fill in your secrets in:
   - `frontend/.env`
   - `backend/ApiGateway/appsettings.Development.json`

3. See `SECURITY.md` and `CONFIG-COMPARISON.md` for details

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| `SYSTEM-STATUS.md` | Current system status and health |
| `CONFIG-COMPARISON.md` | Config sync check and security audit |
| `SECURITY.md` | Security guidelines and best practices |
| `GOOGLE_OAUTH_SETUP.md` | Google OAuth setup instructions |
| `SETUP-GUIDE.md` | Initial setup guide |
| `PROJECT-STATUS.md` | Project progress and roadmap |

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
cd backend/ApiGateway
dotnet run --urls "http://localhost:5001"
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Restart PostgreSQL
docker compose restart postgres

# Check logs
docker compose logs postgres
```

### Frontend Won't Load

```bash
# Clear Vite cache
rm -rf frontend/node_modules/.vite

# Reinstall dependencies
cd frontend
npm install

# Restart
npm run dev
```

### Backend Crashes on Startup

```bash
# Check logs
tail -50 /tmp/backend.log

# Common issues:
# - Database not running
# - Missing appsettings.Development.json
# - Port 5000 already in use
```

---

## 🎯 Next Steps

### 1. Seed Database with Sample Data
```bash
# TODO: Create seed script
# For now, use API to create data manually
```

### 2. Test Features
- [ ] User registration
- [ ] Google OAuth login
- [ ] Browse products
- [ ] Add to cart
- [ ] Checkout process
- [ ] Admin panel

### 3. Development Workflow
```bash
# 1. Pull latest code
git pull

# 2. Update dependencies
cd frontend && npm install
cd ../backend && dotnet restore

# 3. Start system
./manage.sh start

# 4. Make changes and test
# 5. Commit and push
git add .
git commit -m "Your message"
git push
```

---

## 📞 Support

### Common Commands Quick Reference
```bash
./status.sh              # Quick status check
./manage.sh              # Interactive menu
./manage.sh start        # Start all services
./manage.sh stop         # Stop all services
./manage.sh restart      # Restart all services
./manage.sh status       # Detailed status
./manage.sh logs         # View logs
./manage.sh test         # Test APIs
```

### Files to Check When Issues Occur
1. `/tmp/backend.log` - Backend errors
2. `/tmp/frontend.log` - Frontend errors
3. `docker compose logs` - Infrastructure logs

### Quick Fixes
```bash
# Full system restart
./manage.sh restart

# Just backend restart
./manage.sh restart backend

# Just frontend restart
./manage.sh restart frontend

# Reset everything
docker compose down -v  # ⚠️ Deletes data!
docker compose up -d
./manage.sh start
```

---

## ✅ System Requirements

- **OS:** Ubuntu 20.04+ / macOS / Windows WSL2
- **Docker:** 20.10+
- **Docker Compose:** 2.0+
- **.NET SDK:** 8.0+
- **Node.js:** 18+
- **npm:** 9+

---

**🎉 Hệ thống đã sẵn sàng! Truy cập: http://localhost:5173**

**💡 Tip:** Bookmark file này và các script `manage.sh`, `status.sh` để quản lý hệ thống dễ dàng!
