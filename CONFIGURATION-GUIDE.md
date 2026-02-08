# 🔧 Configuration Guide - Quang Hương Computer

## 📋 Tổng quan các tích hợp

Hệ thống đã được tích hợp sẵn các dịch vụ sau:

### ✅ Đã có sẵn trong code:

1. **Authentication & Authorization**
   - ✅ JWT Authentication
   - ✅ Google OAuth (code sẵn sàng)
   - ✅ Facebook OAuth (code sẵn sàng)
   - ✅ Role-based access control
   - ✅ Rate limiting

2. **Payment Gateways**
   - ✅ VNPay (đã implement đầy đủ)
   - ✅ Momo (cấu trúc sẵn sàng)
   - ✅ ZaloPay (cấu trúc sẵn sàng)

3. **Real-time Communication**
   - ✅ SignalR Chat Hub
   - ✅ Socket.io client
   - ✅ Message queue (RabbitMQ)

4. **AI & Chatbot**
   - ✅ AI Service (RAG-based)
   - ✅ Search engine integration
   - ✅ Product recommendation ready
   - ✅ OpenAI/Gemini integration ready

5. **Email & SMS**
   - ✅ SMTP Email service
   - ✅ Twilio SMS (cấu trúc sẵn sàng)
   - ✅ Welcome email
   - ✅ Order confirmation email

6. **Storage & CDN**
   - ✅ Cloudinary integration ready
   - ✅ Local file storage

7. **Infrastructure**
   - ✅ PostgreSQL database
   - ✅ Redis caching
   - ✅ RabbitMQ message queue
   - ✅ Docker containerization

---

## 🔑 Cần cấu hình API Keys

### 1. Google OAuth (Login with Google)

**Bước 1:** Đăng ký tại [Google Cloud Console](https://console.cloud.google.com/)

**Bước 2:** Tạo OAuth 2.0 Client ID
- Vào **APIs & Services** → **Credentials**
- Tạo **OAuth client ID**
- Chọn **Web application**
- Thêm **Authorized redirect URIs**: `http://localhost:5173/auth/google/callback`

**Bước 3:** Copy Client ID và thêm vào:
```bash
# Frontend: frontend/.env
VITE_GOOGLE_CLIENT_ID=your_actual_client_id

# Backend: backend/ApiGateway/appsettings.json
"OAuth": {
  "Google": {
    "ClientId": "your_actual_client_id",
    "ClientSecret": "your_actual_client_secret"
  }
}
```

---

### 2. VNPay Payment Gateway

**Bước 1:** Đăng ký tại [VNPay](https://vnpay.vn/)

**Bước 2:** Lấy thông tin:
- TmnCode (Terminal Code)
- HashSecret

**Bước 3:** Cấu hình trong `appsettings.json`:
```json
"Payment": {
  "VNPay": {
    "TmnCode": "YOUR_TMN_CODE",
    "HashSecret": "YOUR_HASH_SECRET",
    "PaymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    "ReturnUrl": "http://localhost:5173/payment/vnpay-return"
  }
}
```

**Test Mode:**
- PaymentUrl: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- Card test: `9704198526191432198` / `NGUYEN VAN A` / 07/15 / 123456

---

### 3. Momo E-Wallet

**Bước 1:** Đăng ký tại [Momo Business](https://business.momo.vn/)

**Bước 2:** Lấy thông tin:
- PartnerCode
- AccessKey
- SecretKey

**Bước 3:** Cấu hình trong `appsettings.json`:
```json
"Payment": {
  "Momo": {
    "PartnerCode": "YOUR_PARTNER_CODE",
    "AccessKey": "YOUR_ACCESS_KEY",
    "SecretKey": "YOUR_SECRET_KEY",
    "Endpoint": "https://test-payment.momo.vn/v2/gateway/api/create"
  }
}
```

---

### 4. Email Service (Gmail SMTP)

**Bước 1:** Tạo App Password
- Vào Google Account → Security
- Bật 2-Step Verification
- Tạo App Password

**Bước 2:** Cấu hình:
```json
"Email": {
  "Smtp": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "EnableSsl": true,
    "Username": "your_email@gmail.com",
    "Password": "your_app_password_16_chars"
  }
}
```

---

### 5. AI Integration (Optional)

#### OpenAI
**Bước 1:** Đăng ký tại [OpenAI](https://platform.openai.com/)
**Bước 2:** Lấy API Key
**Bước 3:** Cấu hình:
```json
"AI": {
  "OpenAI": {
    "ApiKey": "sk-...",
    "Model": "gpt-3.5-turbo"
  }
}
```

#### Google Gemini
**Bước 1:** Đăng ký tại [Google AI Studio](https://makersuite.google.com/)
**Bước 2:** Cấu hình:
```json
"AI": {
  "Gemini": {
    "ApiKey": "YOUR_GEMINI_API_KEY",
    "Model": "gemini-pro"
  }
}
```

---

### 6. Google Maps API (Store Location)

**Bước 1:** Đăng ký tại [Google Cloud Console](https://console.cloud.google.com/)
**Bước 2:** Enable Maps JavaScript API
**Bước 3:** Thêm vào frontend `.env`:
```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_MAPS_API_KEY
```

---

### 7. Cloudinary (Image Storage)

**Bước 1:** Đăng ký tại [Cloudinary](https://cloudinary.com/)
**Bước 2:** Lấy Cloud Name, API Key, API Secret
**Bước 3:** Cấu hình:
```json
"Storage": {
  "CloudinaryUrl": "cloudinary://API_KEY:API_SECRET@CLOUD_NAME"
}
```

---

## 📝 Checklist Setup

### Cấu hình tối thiểu (để chạy được):
- ✅ PostgreSQL (đã setup)
- ✅ Redis (đã setup)
- ✅ RabbitMQ (đã setup)
- ✅ JWT Key (đã có)

### Cấu hình khuyến nghị:
- ⏳ Google OAuth (cho đăng nhập)
- ⏳ Email SMTP (cho gửi email)
- ⏳ VNPay (cho thanh toán)

### Cấu hình tùy chọn:
- ⏳ Momo / ZaloPay
- ⏳ OpenAI / Gemini (nâng cao chatbot)
- ⏳ Google Maps
- ⏳ Cloudinary
- ⏳ Facebook OAuth
- ⏳ SMS (Twilio)
- ⏳ Analytics

---

## 🚀 Test các tích hợp

### Test VNPay Payment
```bash
# Call API
POST http://localhost:5000/api/payments/vnpay/create
{
  "amount": 100000,
  "orderInfo": "Test order",
  "orderId": "ORDER123"
}
```

### Test SignalR Chat
```javascript
// Frontend
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('http://localhost:5000/hubs/chat')
  .build();

await connection.start();
await connection.invoke('SendMessage', 'Hello World!');
```

### Test AI Chatbot
```bash
POST http://localhost:5000/api/ai/ask
{
  "question": "Laptop gaming giá rẻ"
}
```

---

## 📊 Monitoring & Analytics

Hệ thống đã sẵn sàng cho:
- ✅ Application logging (Serilog)
- ✅ Health checks (`/health`)
- ✅ Rate limiting
- ⏳ Google Analytics (cần config GA_TRACKING_ID)
- ⏳ Facebook Pixel (cần config FB_PIXEL_ID)

---

## 🔒 Security Checklist

- ✅ HTTPS (production)
- ✅ JWT tokens
- ✅ Password hashing
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ SQL injection protection (EF Core)
- ✅ XSS protection
- ⏳ Environment variables (chuyển secrets ra .env)

---

## 📞 Support

Nếu cần hỗ trợ setup:
1. Check logs: `tail -f /tmp/backend.log`
2. Check Swagger UI: `http://localhost:5000/swagger`
3. Check database: `docker exec -it quanghuong-postgres psql -U postgres -d quanghuongdb`

---

**Hệ thống đã sẵn sàng, chỉ cần điền API keys vào là có thể sử dụng ngay!** 🎉
