# 📊 BUSINESS REQUIREMENTS OVERVIEW
## Quang Huong Computer - Total System Requirements

---

## 🎯 Executive Summary

Quang Huong Computer cần một hệ thống tích hợp để quản lý toàn bộ quy trình kinh doanh từ bán hàng, kho, bảo hành đến kế toán. Hệ thống bao gồm:

1. **Website thương mại điện tử** cho khách hàng
2. **Hệ thống quản lý nội bộ (ERP)** cho nhân viên
3. **Các cổng thông báo chuyên biệt** cho từng phòng ban

---

## 👥 User Personas

### External Users (Khách hàng):

| Persona | Description | Needs | Goals |
|---------|-------------|-------|-------|
| **Khách hàng cá nhân** | Người mua laptop/PC cho cá nhân | Dễ tìm sản phẩm, giá tốt, giao nhanh | Mua được sản phẩm phù hợp |
| **Khách hàng doanh nghiệp** | Công ty mua số lượng lớn | Giá sỉ, hóa đơn VAT, bảo hành tốt | Mua sỉ cho công ty |
| **Khách hàng cần sửa chữa** | Người cần sửa máy tính | Đặt lịch dễ, sửa nhanh, giá minh bạch | Sửa máy nhanh |
| **Khách hàng kiểm tra bảo hành** | Người cần tra cứu bảo hành | Dễ tra cứu, thông tin rõ ràng | Kiểm tra tình trạng bảo hành |

### Internal Users (Nhân viên):

| Persona | Role | Responsibilities | Key Needs |
|---------|------|------------------|-----------|
| **Admin** | Quản trị hệ thống | Quản lý users, roles, permissions | Full control |
| **Nhân viên bán hàng** | Tư vấn & bán hàng | POS, quản lý đơn hàng, thông tin KH | Bán hàng nhanh |
| **Kế toán viên** | Quản lý tài chính | Hóa đơn, công nợ, báo cáo | Theo dõi dòng tiền |
| **Thủ kho** | Quản lý kho hàng | Nhập/xuất, tồn kho, nhà cung cấp | Quản lý tồn kho chính xác |
| **Kỹ thuật viên** | Sửa chữa máy tính | Nhận việc sửa chữa, báo cáo, linh kiện | Quản lý việc sửa |
| **Marketing** | Quản lý nội dung | Banner, bài viết, khuyến mãi | Tạo nội dung dễ dàng |
| **Quản lý** | Ra quyết định | Báo cáo, dashboard, analytics | Xem được toàn cảnh |

---

## 🏢 Business Modules Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   QUANG HUONG COMPUTER                       │
│                     BUSINESS SYSTEM                          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│  CUSTOMER PORTAL│   │   BACKOFFICE    │   │    ADMIN PANEL  │
│  (B2C E-commerce)│   │   PORTALS       │   │   (System Mgmt) │
└───────┬────────┘   └────────┬────────┘   └────────┬────────┘
        │                     │                     │
        │                     │                     │
┌───────▼─────────────────────▼─────────────────────▼────────┐
│                    SHARED SERVICES                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Sales │ │Kho   │ │Sửa   │ │BH    │ │Kế    │ │HR    │   │
│  │      │ │      │ │chữa  │ │      │ │toán  │ │      │   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
└────────────────────────────────────────────────────────────┘
        │                     │                     │
┌───────▼─────────────────────▼─────────────────────▼────────┐
│                   INFRASTRUCTURE                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│  │Auth  │ │DB    │ │Cache │ │MQ    │ │AI    │             │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Summary

### 1. SALES - Bán hàng (Online & Offline)

**Features:**
- ✅ Website thương mại điện tử (B2C)
- ✅ POS - Điểm bán hàng tại cửa hàng
- ✅ Quản lý đơn hàng (Orders)
- ✅ Quản lý giỏ hàng (Cart)
- ✅ Thanh toán online (Payment Gateway)
- ✅ Quản lý mã giảm giá (Coupons)
- ✅ Quản lý trả hàng (Returns)

**Key Requirements:**
- Khách có thể xem sản phẩm, thêm vào giỏ, thanh toán
- Hỗ trợ nhiều phương thức thanh toán (COD, Chuyển khoản, Thẻ)
- Nhân viên có thể tạo đơn hàng tại quầy (POS)
- Tự động tính giảm giá, thuế

---

### 2. INVENTORY - Quản lý kho hàng

**Features:**
- ✅ Quản lý tồn kho (Stock)
- ✅ Nhập kho (Purchase Orders)
- ✅ Xuất kho (Sales, Adjustments)
- ✅ Quản lý nhà cung cấp (Suppliers)
- ✅ Cảnh báo tồn kho thấp (Low stock alerts)
- ✅ Báo cáo kho (Stock reports)

**Key Requirements:**
- Theo dõi tồn kho theo thời gian thực
- Tự động trừ kho khi bán hàng
- Cảnh báo khi sắp hết hàng
- Quản lý nhiều kho (nếu có)

---

### 3. REPAIR - Sửa chữa

**Features:**
- ✅ Đặt lịch sửa chữa online
- ✅ Quản lý tiếp nhận (Reception)
- ✅ Phân công kỹ thuật viên (Assignment)
- ✅ Theo dõi tiến độ (Status tracking)
- ✅ Báo giá (Quotations)
- ✡️ Báo linh kiện cần thay thế

**Key Requirements:**
- Khách có thể đặt lịch sửa online
- Kỹ thuật viên nhận việc và cập nhật trạng thái
- Thông báo cho khách khi sửa xong
- Lưu lịch sử sửa chữa

---

### 4. WARRANTY - Bảo hành

**Features:**
- ✅ Đăng ký bảo hành (Warranty registration)
- ✅ Kiểm tra bảo hành (Warranty check)
- ✅ Quản lý yêu cầu bảo hành (Claims)
- ✅ Theo dõi lịch sử bảo hành (History)
- ✅ Quản lý linh kiện bảo hành (Spare parts)

**Key Requirements:**
- Khách có thể kiểm tra bảo hành online
- Scan serial để tra cứu
- Theo dõi số lần bảo hành
- Cảnh báo bảo hành sắp hết hạn

---

### 5. ACCOUNTING - Kế toán

**Features:**
- ✅ Quản lý hóa đơn (Invoices)
- ✅ Công nợ phải thu (Accounts Receivable)
- ✅ Công nợ phải trả (Accounts Payable)
- ✅ Doanh thu (Revenue tracking)
- ✅ Chi phí (Expense tracking)
- ✅ Báo cáo tài chính (Financial reports)

**Key Requirements:**
- Tự động tạo hóa đơn khi bán hàng
- Theo dõi công nợ khách hàng
- Theo dõi công nợ nhà cung cấp
- Báo cáo doanh thu, lợi nhuận

---

### 6. HR - Nhân sự

**Features:**
- ✅ Quản lý nhân viên (Employees)
- ✅ Quản lý ca làm việc (Shifts)
- ✅ Chấm công (Attendance)
- ✅ Bảng lương (Payroll) - Phase 2

**Key Requirements:**
- Quản lý thông tin nhân viên
- Phân ca làm việc
- Theo dõi giờ làm việc

---

### 7. CONTENT - Quản lý nội dung (CMS)

**Features:**
- ✅ Quản lý banner (Banners)
- ✅ Quản lý bài viết (Articles/Blogs)
- ✅ Quản lý trang (Pages)
- ✅ Quản lý khuyến mãi (Promotions)

**Key Requirements:**
- Marketing có thể tự tạo nội dung
- Lịch hiển thị banner
- SEO-friendly URLs

---

### 8. AI CHATBOT - Trợ lý ảo

**Features:**
- ✅ Chat tự động 24/7
- ✅ Trả lời câu hỏi thường gặp
- ✅ Hỗ trợ tìm kiếm sản phẩm
- ✅ Hỗ trợ theo dõi đơn hàng
- ✅ Chuyển sang nhân viên khi cần

**Key Requirements:**
- Phản hồi nhanh (< 2 giây)
- Hiểu được tiếng Việt
- Học hỏi từ các cuộc hội thoại

---

### 9. COMMUNICATION - Giao tiếp

**Features:**
- ✅ Chat trực tiếp với nhân viên
- ✅ Gửi thông báo (Notifications)
- ✅ Gửi email (Email templates)
- ✅ Gửi SMS (Phase 2)

**Key Requirements:**
- Thông báo trạng thái đơn hàng
- Thông báo khuyến mãi
- Nhắc lịch hẹn sửa chữa

---

## 🔄 Key Business Processes

### Process 1: Bán hàng Online

```
Khách → Tìm sản phẩm → Thêm vào giỏ → Thanh toán → 
Xác nhận → Giao hàng → Hoàn thành → Đánh giá
```

### Process 2: Bán hàng Offline (POS)

```
Khách đến cửa hàng → Tư vấn → Chọn sản phẩm → 
Tạo đơn POS → Thanh toán → Xuất hóa đơn → Giao hàng
```

### Process 3: Sửa chữa

```
Khách → Đặt lịch → Đến cửa hàng → Tiếp nhận → 
Chẩn đoán → Báo giá → Đồng ý → Sửa chữa → 
Hoàn thành → Thông báo → Lấy máy → Thanh toán
```

### Process 4: Bảo hành

```
Khách → Kiểm tra BH online hoặc đến cửa hàng → 
Kiểm tra serial → Xác nhận BH → Tiếp nhận → 
Sửa chữa/đổi mới → Hoàn thành → Cập nhật BH
```

### Process 5: Quản lý kho

```
Đặt hàng từ NCC → Nhập kho → Bán hàng → 
Trừ kho → Cảnh báo thấp → Đặt hàng bổ sung
```

---

## 🎯 Business Rules

### Sales Rules:
- Giảm giá không được thấp hơn giá vốn
- Đơn hàng > 10 triệu cần cọc trước 30%
- Khách doanh nghiệp được giảm giá sỉ

### Inventory Rules:
- Cảnh báo khi tồn kho < 5
- Không cho bán khi hết hàng
- Kiểm tra hàng trước khi nhập kho

### Warranty Rules:
- Bảo hành 12-24 tháng tùy sản phẩm
- Bảo hành không áp dụng cho lỗi người dùng
- Cần có hóa đơn khi bảo hành

### Payment Rules:
- COD được giới hạn 15 triệu
- Thanh toán online được giảm giá 2%
- Hoàn tiền trong 3-7 ngày

---

## 📊 Success Metrics

| Metric | Current | Target (6 months) | Target (1 year) |
|--------|---------|-------------------|-----------------|
| Online Orders | 0 | 50/tháng | 200/tháng |
| Revenue from Online | 0 | 200 triệu/tháng | 1 tỷ/tháng |
| Customer Satisfaction | N/A | 4.0/5 | 4.5/5 |
| Order Completion Rate | N/A | 80% | 90% |
| Average Repair Time | N/A | 48h | 24h |
| Inventory Accuracy | N/A | 95% | 98% |

---

## ⚠️ Assumptions & Constraints

### Assumptions:
- Có internet ổn định
- Nhân viên được đào tạo sử dụng hệ thống
- Khách hàng có thể sử dụng website/mobile
- Có ngân sách cho marketing

### Constraints:
- Budget dự án có hạn
- Timeline 12 tuần
- Must comply with Vietnamese laws
- Must support Vietnamese language

---

## 🔗 Related Documents

- [BRD - Sales Module](./02-BRD-SALES.md)
- [BRD - Inventory Module](./03-BRD-INVENTORY.md)
- [BRD - Repair Module](./04-BRD-REPAIR.md)
- [BRD - Warranty Module](./05-BRD-WARRANTY.md)
- [BRD - Accounting Module](./06-BRD-ACCOUNTING.md)
- [Process Maps](./09-PROCESS-MAPS.md)
- [User Stories](./08-USER-STORIES.md)

---

*Document Version: 1.0*  
*Last Updated: 2024*  
*Owner: Business Analyst Team*  
*Approved by: [Business Owner]*
