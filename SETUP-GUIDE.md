# Hướng dẫn chạy dự án Quang Hương Computer

## 📦 Đã thiết lập

### ✅ Infrastructure (Docker Containers)
Các services sau đã được thiết lập và đang chạy:

```bash
docker compose ps
```

- **PostgreSQL**: `localhost:5432`
  - Database: `quanghuongdb`
  - Username: `postgres`
  - Password: `postgres123`

- **RabbitMQ**: `localhost:5672` (AMQP), `localhost:15672` (Management UI)
  - Username: `guest`
  - Password: `guest`
  - Management UI: http://localhost:15672

- **Redis**: `localhost:6379`
  - Password: `redis123`

### ✅ Configuration Files
- ✅ `backend/ApiGateway/appsettings.json` - Đã cập nhật connection strings
- ✅ `backend/ApiGateway/appsettings.Development.json` - Đã cập nhật connection strings
- ✅ `frontend/.env` - Đã tạo từ .env.example

---

## 🚀 Cách chạy dự án

### Option 1: Upgrade to .NET 10 (Recommended - vì system có .NET 10)

1. **Update tất cả .csproj files để dùng .NET 10:**
   ```bash
   cd /home/teedee/Pictures/QuangHuongComputer/backend

   # Update từng file
   for file in $(find . -name "*.csproj"); do
       sed -i 's/<TargetFramework>net8.0<\/TargetFramework>/<TargetFramework>net10.0<\/TargetFramework>/g' "$file"
   done
   ```

2. **Clean và rebuild:**
   ```bash
   cd backend/ApiGateway
   rm -rf bin obj ../*/bin ../*/obj ../Services/*/bin ../Services/*/obj
   dotnet restore
   dotnet build
   ```

3. **Chạy backend:**
   ```bash
   cd backend/ApiGateway
   ASPNETCORE_ENVIRONMENT=Development dotnet run
   ```
   Backend sẽ chạy tại: http://localhost:5000

### Option 2: Install .NET 8.0 Runtime

```bash
# Install .NET 8.0
sudo snap install dotnet-sdk --classic --channel=8.0

# Sau đó chạy backend
cd backend/ApiGateway
ASPNETCORE_ENVIRONMENT=Development dotnet run
```

### Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend sẽ chạy tại: http://localhost:5173

---

## 🔧 Vấn đề hiện tại

### Backend không chạy được do version mismatch:
- **Hiện tại**: Projects được build cho .NET 8.0
- **System có**: .NET 10.0.2
- **Giải pháp**: Chọn 1 trong 2 options ở trên

### Khi backend chạy thành công:
- Migrations sẽ tự động chạy và tạo tables trong PostgreSQL
- Seed data sẽ được populate
- API sẽ sẵn sàng tại http://localhost:5000
- Swagger UI: http://localhost:5000/swagger

---

## 📊 Kiểm tra Database

### Sử dụng psql:
```bash
docker exec -it quanghuong-postgres psql -U postgres -d quanghuongdb

# Trong psql:
\dt          # List tables
\dn          # List schemas
\q           # Quit
```

### Hoặc dùng Adminer (nếu muốn):
```bash
# Sửa port 8080 thành port khác trong docker-compose.yml nếu bị conflict
# Rồi:
docker compose up -d adminer
```

---

## 🛑 Dừng services

```bash
# Dừng tất cả containers
docker compose down

# Dừng và xóa volumes (cảnh báo: sẽ mất data!)
docker compose down -v
```

---

## 📝 Connection Strings đã cấu hình

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

## 🏗️ Cấu trúc Database

Dự án sử dụng **schema-based multi-tenancy**. Mỗi module có schema riêng:
- `identity` - User authentication & authorization
- `catalog` - Product catalog
- `sales` - Orders & cart
- `inventory` - Stock management
- `repair` - Repair orders
- `warranty` - Warranty claims
- `accounting` - Financial records
- `hr` - Human resources
- `content` - CMS content
- `communication` - Chat & notifications
- `payments` - Payment processing
- `systemconfig` - System settings
- `ai` - AI/Chatbot

---

## 🎯 Next Steps

1. ✅ Chọn option để chạy backend (upgrade .NET 10 hoặc install .NET 8)
2. ⏳ Chạy backend và verify migrations
3. ⏳ Chạy frontend
4. ⏳ Test kết nối giữa frontend và backend
5. ⏳ Verify tất cả modules hoạt động

---

Mọi thắc mắc hoặc lỗi vui lòng báo lại để được hỗ trợ!
