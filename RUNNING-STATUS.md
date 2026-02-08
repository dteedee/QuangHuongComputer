# 🚀 HỆ THỐNG QUANG HƯƠNG COMPUTER ĐANG CHẠY

## ✅ Trạng thái các services

### 🔥 Backend API
- **URL**: http://localhost:5000
- **Status**: ✅ **Healthy** (Running)
- **Health Check**: ✅ Passing
- **Swagger UI**: http://localhost:5000/swagger
- **Technology**: .NET 10.0

### 🎨 Frontend
- **URL**: http://localhost:5173
- **Status**: ✅ **Running** (Vite Dev Server)
- **Technology**: React + Vite 6.4.1

### 🐘 PostgreSQL Database
- **Host**: localhost:5432
- **Database**: quanghuongdb
- **Username**: postgres
- **Password**: postgres123
- **Status**: ✅ **Healthy**
- **Tables**: 32 tables across 2 schemas (content: 6, public: 26)

### 🐰 RabbitMQ Message Queue
- **AMQP Port**: localhost:5672
- **Management UI**: http://localhost:15672
- **Credentials**: guest / guest
- **Status**: ✅ **Healthy**

### 📦 Redis Cache
- **Host**: localhost:6379
- **Password**: redis123
- **Status**: ✅ **Healthy**

---

## 🌐 Truy cập ứng dụng

### Frontend (Giao diện người dùng)
```
http://localhost:5173
```
Mở trình duyệt và truy cập URL này để sử dụng ứng dụng

### Backend API Documentation
```
http://localhost:5000/swagger
```
Xem và test tất cả API endpoints

### RabbitMQ Management Console
```
http://localhost:15672
Login: guest / guest
```
Quản lý message queues và monitoring

---

## 🗄️ Database Schema

Database đang có các schemas sau:
- **content** (6 tables): Banners, Coupons, MenuItem, Menus, Pages, Posts
- **public** (26 tables): AspNetUsers, Products, Categories, Brands, Orders, Carts, CartItems, WorkOrders, Repairs, Warranties, và nhiều hơn...

### Truy cập database
```bash
docker exec -it quanghuong-postgres psql -U postgres -d quanghuongdb
```

---

## 📊 Process Information

### Backend Process
- **PID**: 9022
- **Command**: `dotnet run`
- **Working Directory**: `/home/teedee/Pictures/QuangHuongComputer/backend/ApiGateway`
- **Environment**: Development
- **Log File**: `/tmp/backend.log`

### Frontend Process
- **PID**: 9092
- **Command**: `npm run dev` (Vite)
- **Working Directory**: `/home/teedee/Pictures/QuangHuongComputer/frontend`
- **Log File**: `/tmp/frontend.log`

---

## 🛠️ Các lệnh hữu ích

### Xem logs real-time
```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

### Kiểm tra database
```bash
# Vào PostgreSQL shell
docker exec -it quanghuong-postgres psql -U postgres -d quanghuongdb

# List all tables
\dt

# List all schemas
\dn

# Exit
\q
```

### Test API endpoints
```bash
# Health check
curl http://localhost:5000/health

# Get catalog products
curl http://localhost:5000/api/catalog/products

# Get categories
curl http://localhost:5000/api/catalog/categories
```

### Dừng services
```bash
# Stop backend
kill 9022

# Stop frontend
kill 9092

# Stop Docker containers
docker compose down
```

### Khởi động lại
```bash
# Start Docker containers
docker compose up -d

# Start backend
cd backend/ApiGateway
ASPNETCORE_ENVIRONMENT=Development dotnet run > /tmp/backend.log 2>&1 &

# Start frontend
cd frontend
npm run dev > /tmp/frontend.log 2>&1 &
```

---

## 🎯 Sẵn sàng phát triển!

Tất cả đã được thiết lập và chạy thành công:
- ✅ Infrastructure (PostgreSQL, RabbitMQ, Redis)
- ✅ Backend API (.NET 10)
- ✅ Frontend (React + Vite)
- ✅ Database migrations completed
- ✅ All connections verified

**Bạn có thể bắt đầu coding ngay!** 🚀

---

## 📝 Connection Strings (đã cấu hình)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=quanghuongdb;Username=postgres;Password=postgres123;Timeout=30",
    "RabbitMQ": "amqp://guest:guest@localhost:5672",
    "Redis": "localhost:6379,password=redis123"
  }
}
```

---

**Hệ thống đang hoạt động hoàn hảo!** 🎊
Mở http://localhost:5173 trong trình duyệt để bắt đầu sử dụng.
