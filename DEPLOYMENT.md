# Hướng dẫn Deploy UAT - Quang Huong Computer

## Mục lục
1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Chuẩn bị môi trường](#chuẩn-bị-môi-trường)
3. [Cấu hình environment](#cấu-hình-environment)
4. [Deploy với Docker](#deploy-với-docker)
5. [Deploy thủ công](#deploy-thủ-công)
6. [Kiểm tra sau deploy](#kiểm-tra-sau-deploy)
7. [Troubleshooting](#troubleshooting)

---

## Yêu cầu hệ thống

### Server Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- **RAM**: Tối thiểu 4GB (khuyến nghị 8GB+)
- **CPU**: 2 cores (khuyến nghị 4 cores+)
- **Storage**: 20GB+ SSD

### Software Requirements
- Docker 20.10+ và Docker Compose v2
- hoặc:
  - .NET 8 SDK
  - Node.js 18+ và npm/yarn
  - PostgreSQL 15+
  - Redis 7+
  - RabbitMQ 3.12+

---

## Chuẩn bị môi trường

### 1. Clone repository
```bash
git clone <repository-url>
cd QuangHuongComputer
```

### 2. Tạo file environment
```bash
# Copy template
cp .env.uat.example .env.uat

# Chỉnh sửa với các giá trị thực
nano .env.uat
```

---

## Cấu hình environment

### Các biến QUAN TRỌNG cần thay đổi:

#### Database
```env
POSTGRES_PASSWORD=<mật_khẩu_mạnh_32_ký_tự>
```

#### JWT Secret
```env
JWT_SECRET_KEY=<chuỗi_ngẫu_nhiên_ít_nhất_32_ký_tự>
```

#### Domain/URL
```env
UAT_DOMAIN=https://uat.yourdomain.com
VITE_API_URL=https://api-uat.yourdomain.com
VITE_VNPAY_RETURN_URL=https://uat.yourdomain.com/payment/vnpay-return
VITE_MOMO_RETURN_URL=https://uat.yourdomain.com/payment/momo-return
VITE_ZALOPAY_RETURN_URL=https://uat.yourdomain.com/payment/zalopay-return
VITE_SIGNALR_HUB_URL=https://api-uat.yourdomain.com/hubs/chat
CORS_ALLOWED_ORIGINS=https://uat.yourdomain.com
```

#### OAuth (Sandbox credentials)
```env
GOOGLE_CLIENT_ID=<từ_google_console>
GOOGLE_CLIENT_SECRET=<từ_google_console>
FACEBOOK_APP_ID=<từ_facebook_developers>
FACEBOOK_APP_SECRET=<từ_facebook_developers>
```

#### Payment Gateways (Sandbox)
```env
# VNPay Sandbox
VNPAY_TMN_CODE=<sandbox_tmn_code>
VNPAY_HASH_SECRET=<sandbox_hash_secret>

# MoMo Sandbox
MOMO_PARTNER_CODE=<sandbox_partner_code>
MOMO_ACCESS_KEY=<sandbox_access_key>
MOMO_SECRET_KEY=<sandbox_secret_key>
```

#### Email (Gmail App Password)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=<app_password_16_ký_tự>
SMTP_FROM_EMAIL=your-email@gmail.com
```

#### Cloudinary
```env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_CLOUD_NAME=<cloud_name>
```

---

## Deploy với Docker

### Quick Start
```bash
# Build và start tất cả services
docker-compose -f docker-compose.uat.yml --env-file .env.uat up -d --build

# Xem logs
docker-compose -f docker-compose.uat.yml logs -f

# Stop services
docker-compose -f docker-compose.uat.yml down
```

### Chi tiết từng bước

#### 1. Build images
```bash
# Build backend
docker build -t quanghuong-backend:uat ./backend

# Build frontend
docker build -t quanghuong-frontend:uat ./frontend \
  --build-arg VITE_API_URL=$VITE_API_URL \
  --build-arg VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
  --build-arg VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID
```

#### 2. Start infrastructure
```bash
docker-compose -f docker-compose.uat.yml up -d postgres-uat redis-uat rabbitmq-uat
```

#### 3. Wait for healthy status
```bash
docker-compose -f docker-compose.uat.yml ps
```

#### 4. Start application
```bash
docker-compose -f docker-compose.uat.yml up -d backend-uat frontend-uat
```

---

## Deploy thủ công (không Docker)

### Backend (.NET 8)

#### 1. Restore và build
```bash
cd backend
dotnet restore
dotnet publish -c Release -o ./publish
```

#### 2. Cấu hình appsettings
```bash
# Copy staging config
cp ApiGateway/appsettings.Staging.json publish/appsettings.json
```

#### 3. Set environment variables
```bash
export ASPNETCORE_ENVIRONMENT=Staging
export ConnectionStrings__DefaultConnection="Host=db-server;Port=5432;Database=quanghuongdb_uat;Username=postgres;Password=your_password"
export ConnectionStrings__Redis="redis-server:6379,password=your_redis_password"
export Jwt__SecretKey="your_jwt_secret_32_chars_minimum"
export Cors__AllowedOrigins__0="https://uat.yourdomain.com"
export Frontend__Url="https://uat.yourdomain.com"
```

#### 4. Run
```bash
cd publish
dotnet ApiGateway.dll --urls "http://0.0.0.0:5002"
```

### Frontend (Vite/React)

#### 1. Tạo file .env.production
```bash
cd frontend
cat > .env.production << EOF
VITE_API_URL=https://api-uat.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_VNPAY_RETURN_URL=https://uat.yourdomain.com/payment/vnpay-return
VITE_MOMO_RETURN_URL=https://uat.yourdomain.com/payment/momo-return
VITE_ZALOPAY_RETURN_URL=https://uat.yourdomain.com/payment/zalopay-return
VITE_SIGNALR_HUB_URL=https://api-uat.yourdomain.com/hubs/chat
VITE_SOCKET_URL=https://api-uat.yourdomain.com
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
EOF
```

#### 2. Build
```bash
npm install
npm run build
```

#### 3. Deploy static files
```bash
# Copy dist folder to web server
cp -r dist/* /var/www/quanghuong-uat/
```

#### 4. Nginx configuration
```nginx
server {
    listen 80;
    server_name uat.yourdomain.com;
    root /var/www/quanghuong-uat;
    index index.html;

    # Frontend routes - SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# API Proxy (optional - if backend on same server)
server {
    listen 80;
    server_name api-uat.yourdomain.com;

    location / {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Kiểm tra sau deploy

### 1. Health checks
```bash
# Backend health
curl http://api-uat.yourdomain.com/health

# Frontend
curl http://uat.yourdomain.com
```

### 2. Database migration
```bash
# Migrations tự động chạy khi startup trong Development/Staging
# Kiểm tra logs:
docker-compose -f docker-compose.uat.yml logs backend-uat | grep -i migrat
```

### 3. Test các tính năng chính
- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập (email/password + OAuth)
- [ ] Xem danh sách sản phẩm
- [ ] Thêm vào giỏ hàng
- [ ] Thanh toán (sandbox)
- [ ] Xem đơn hàng
- [ ] Chat support (SignalR)

### 4. Monitoring
```bash
# Xem resource usage
docker stats

# Grafana dashboard
open http://localhost:3003
```

---

## Troubleshooting

### Database connection failed
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.uat.yml ps postgres-uat

# Check connection string
docker-compose -f docker-compose.uat.yml exec backend-uat printenv | grep ConnectionStrings
```

### CORS errors
- Kiểm tra `CORS_ALLOWED_ORIGINS` có đúng domain frontend không
- Đảm bảo không có trailing slash trong URL

### SignalR không connect
- Kiểm tra `VITE_SIGNALR_HUB_URL` đúng URL backend
- Đảm bảo WebSocket được cho phép qua proxy/firewall

### Payment callback không hoạt động
- Kiểm tra `*_RETURN_URL` trỏ đúng domain public
- Đảm bảo cổng được mở trong firewall

### Email không gửi được
- Kiểm tra Gmail App Password (không phải password thường)
- Enable "Less secure apps" hoặc dùng App Password với 2FA

---

## Ports Reference

| Service | Dev Port | UAT Port |
|---------|----------|----------|
| Frontend | 5173 | 3002 |
| Backend API | 5000 | 5002 |
| PostgreSQL | 5432 | 5434 |
| Redis | 6379 | 6381 |
| RabbitMQ | 5672 | 5674 |
| RabbitMQ Management | 15672 | 15674 |
| Grafana | 3000 | 3003 |
| PgAdmin | 5050 | 5050 |

---

## Liên hệ hỗ trợ
- Email: support@quanghuongcomputer.com
- Hotline: 1900.6321
