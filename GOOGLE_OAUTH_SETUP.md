# 🔐 Hướng dẫn cấu hình Google OAuth

## 📝 Bước 1: Tạo OAuth Client ID trên Google Cloud Console

### Thông tin cần điền:

1. **Application type**: Web Application
2. **Name**: QuangHuongComputer
3. **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `http://localhost:3000`

4. **Authorized redirect URIs**:
   - `http://localhost:5173/auth/google/callback`
   - `http://localhost:5173/auth/callback`
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:5000/api/identity/google-callback`

## 🔄 Bước 2: Cập nhật cấu hình

### A. Frontend - File `.env`

Vị trí: `/home/teedee/Pictures/QuangHuongComputer/frontend/.env`

Tìm dòng sau và **THAY THẾ** bằng Client ID mới:

```env
# Dòng 11 - Thay thế giá trị này
VITE_GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID_HERE.apps.googleusercontent.com
```

**Ví dụ:**
```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

---

### B. Backend - File `appsettings.json`

Vị trí: `/home/teedee/Pictures/QuangHuongComputer/backend/ApiGateway/appsettings.json`

Tìm section `OAuth` > `Google` (dòng 32-36) và **THAY THẾ** cả 2 giá trị:

```json
"OAuth": {
  "Google": {
    "ClientId": "YOUR_NEW_CLIENT_ID_HERE.apps.googleusercontent.com",
    "ClientSecret": "YOUR_NEW_CLIENT_SECRET_HERE"
  }
}
```

**Ví dụ:**
```json
"OAuth": {
  "Google": {
    "ClientId": "123456789-abcdefg.apps.googleusercontent.com",
    "ClientSecret": "GOCSPX-abc123xyz789"
  }
}
```

---

### C. Backend - File `appsettings.Development.json` (nếu có)

Vị trí: `/home/teedee/Pictures/QuangHuongComputer/backend/ApiGateway/appsettings.Development.json`

Làm tương tự như `appsettings.json`

---

## 📍 Bước 3: Khởi động lại ứng dụng

### 1. Khởi động lại Backend:
```bash
# Dừng backend hiện tại
pkill -f "dotnet run"

# Khởi động lại backend
cd /home/teedee/Pictures/QuangHuongComputer/backend/ApiGateway
ASPNETCORE_ENVIRONMENT=Development dotnet run > /tmp/backend.log 2>&1 &
```

### 2. Khởi động lại Frontend:
```bash
# Dừng frontend hiện tại
pkill -f "vite"

# Khởi động lại frontend
cd /home/teedee/Pictures/QuangHuongComputer/frontend
npm run dev
```

---

## ✅ Bước 4: Test Google OAuth

1. Mở trình duyệt: `http://localhost:5173`
2. Nhấn vào nút **"Đăng nhập bằng Google"**
3. Chọn tài khoản Google của bạn
4. Cho phép ứng dụng truy cập thông tin
5. Bạn sẽ được redirect về trang chủ với trạng thái đã đăng nhập

---

## 🔍 Kiểm tra cấu hình hiện tại

### Frontend (.env):
```bash
cat /home/teedee/Pictures/QuangHuongComputer/frontend/.env | grep GOOGLE
```

### Backend (appsettings.json):
```bash
cat /home/teedee/Pictures/QuangHuongComputer/backend/ApiGateway/appsettings.json | grep -A 4 "Google"
```

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG commit** file `.env` và `appsettings.json` lên Git vì chứa thông tin nhạy cảm
2. **ClientSecret** phải được bảo mật tuyệt đối
3. Khi deploy production, phải tạo OAuth Client ID riêng với domain thật
4. Redirect URIs production sẽ khác (ví dụ: `https://yourdomain.com/auth/google/callback`)

---

## 🐛 Troubleshooting

### Lỗi: "redirect_uri_mismatch"
➡️ Kiểm tra lại **Authorized redirect URIs** trong Google Cloud Console phải khớp chính xác với URL callback

### Lỗi: "invalid_client"
➡️ Client ID hoặc Client Secret sai, kiểm tra lại cấu hình

### Lỗi: "access_denied"
➡️ User từ chối cấp quyền hoặc OAuth consent screen chưa được cấu hình đúng

---

## 📚 Tài liệu tham khảo

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
