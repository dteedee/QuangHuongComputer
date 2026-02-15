# HỆ THỐNG QUANG HƯỞNG COMPUTER - TỐI ƯU LUỒNG NGHIỆP VỤ

## I. TỔNG QUAN HỆ THỐNG

### 1. Các Role trong hệ thống
| Role | Mô tả | Phạm vi |
|------|-------|---------|
| **Admin** | Quản trị viên cấp cao | Toàn quyền hệ thống |
| **Manager** | Quản lý cửa hàng | Quản lý nhân viên, báo cáo, phê duyệt |
| **Sale** | Nhân viên bán hàng | Xử lý đơn hàng, tư vấn khách |
| **TechnicianInShop** | Kỹ thuật viên tại cửa hàng | Sửa chữa tại shop |
| **TechnicianOnSite** | Kỹ thuật viên đi công trình | Sửa chữa tại nhà khách |
| **Accountant** | Kế toán | Quản lý tài chính, hóa đơn |
| **Marketing** | Nhân viên Marketing | Quản lý nội dung, khuyến mãi |
| **Customer** | Khách hàng | Mua hàng, đặt dịch vụ |
| **Supplier** | Nhà cung cấp | Xem PO, cập nhật giao hàng |

---

## II. LUỒNG BÁN HÀNG (SALES)

### 2.1 Trạng thái đơn hàng
```
Draft → Confirmed → Paid → Shipped → Delivered → Completed
                                            ↓
                                      Cancelled
```

### 2.2 Ma trận phân quyền
| Hành động | Customer | Sale | Admin/Manager | Accountant |
|-----------|----------|------|---------------|------------|
| Tạo đơn hàng | ✓ | ✓ (POS) | ✓ | - |
| Xem đơn (của mình) | ✓ | - | - | - |
| Xem tất cả đơn | - | ✓ | ✓ | ✓ |
| Xác nhận đơn | - | ✓ | ✓ | - |
| Cập nhật trạng thái | - | ✓ | ✓ | - |
| Hủy đơn | ✓* | ✓ | ✓ | - |
| Xử lý hoàn trả | - | - | ✓ | - |
| Xuất hóa đơn | - | - | ✓ | ✓ |

*Khách chỉ hủy được đơn ở trạng thái Draft/Pending

### 2.3 Luồng xử lý đơn hàng thực tế

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. KHÁCH ĐẶT HÀNG                                               │
├─────────────────────────────────────────────────────────────────┤
│ Customer → Thêm sản phẩm vào giỏ → Checkout                    │
│   ↓                                                             │
│ • Kiểm tra tồn kho → Reserve stock (24h)                       │
│ • Áp dụng mã giảm giá                                          │
│ • Chọn phương thức thanh toán                                   │
│ • Đơn hàng: DRAFT                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. XÁC NHẬN ĐƠN (SALE/ADMIN)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Sale nhận notification → Kiểm tra đơn → Xác nhận               │
│   ↓                                                             │
│ • Xác minh thông tin khách hàng                                │
│ • Kiểm tra tồn kho thực tế                                     │
│ • Đơn hàng: DRAFT → CONFIRMED                                  │
│ • Gửi email xác nhận cho khách                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. THANH TOÁN                                                   │
├─────────────────────────────────────────────────────────────────┤
│ A) Online Payment (VNPay/MoMo):                                │
│    Customer thanh toán → Webhook → CONFIRMED → PAID            │
│                                                                 │
│ B) COD (Thu tiền khi giao):                                    │
│    Sale xác nhận thanh toán khi giao → CONFIRMED → PAID        │
│                                                                 │
│ • PaymentStatus: Pending → Paid                                │
│ • Tạo hóa đơn (Invoice)                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. XỬ LÝ KHO                                                    │
├─────────────────────────────────────────────────────────────────┤
│ • Fulfill reservation → Giảm tồn kho thực                      │
│ • Cập nhật serial number (nếu có)                              │
│ • Chuẩn bị hàng giao                                           │
│ • FulfillmentStatus: Pending → Fulfilled                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. GIAO HÀNG                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Sale/Warehouse → Đóng gói → Bàn giao shipper                   │
│   ↓                                                             │
│ • Cập nhật tracking number                                     │
│ • Đơn hàng: PAID → SHIPPED                                     │
│ • Gửi email thông báo giao hàng                                │
│   ↓                                                             │
│ Shipper giao thành công:                                       │
│ • SHIPPED → DELIVERED                                          │
│ • Nếu COD: Thu tiền → PAID                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. HOÀN TẤT                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Khi PaymentStatus=Paid AND FulfillmentStatus=Fulfilled:        │
│ • Đơn hàng: → COMPLETED                                        │
│ • Cộng điểm thưởng cho khách                                   │
│ • Tính hoa hồng cho sale (nếu có)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## III. LUỒNG SỬA CHỮA (REPAIR SERVICE)

### 3.1 Trạng thái Work Order
```
Requested → Assigned → Diagnosed → Quoted → AwaitingApproval
                                                    ↓
                    Approved → InProgress → Completed
                       ↓            ↓
                    Rejected     OnHold
```

### 3.2 Ma trận phân quyền Sửa chữa
| Hành động | Customer | Technician | Admin/Manager |
|-----------|----------|------------|---------------|
| Đặt lịch sửa chữa | ✓ | - | ✓ |
| Xem booking (của mình) | ✓ | - | - |
| Duyệt/Từ chối booking | - | - | ✓ |
| Chuyển booking → WorkOrder | - | - | ✓ |
| Phân công kỹ thuật viên | - | - | ✓ |
| Nhận/Từ chối phân công | - | ✓ | - |
| Chẩn đoán thiết bị | - | ✓ | ✓ |
| Thêm linh kiện | - | ✓ | ✓ |
| Tạo báo giá | - | ✓ | ✓ |
| Duyệt báo giá | ✓ | - | - |
| Từ chối báo giá | ✓ | - | - |
| Bắt đầu sửa chữa | - | - | ✓ |
| Tạm dừng/Tiếp tục | - | ✓ | ✓ |
| Hoàn tất sửa chữa | - | - | ✓ |
| Hủy phiếu sửa | - | - | ✓ |

### 3.3 Luồng sửa chữa thực tế

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: ĐẶT LỊCH (CUSTOMER)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Khách → Chọn loại dịch vụ (Tại shop / Tại nhà)                 │
│   ↓                                                             │
│ • Điền thông tin thiết bị (Model, Serial)                      │
│ • Mô tả vấn đề                                                 │
│ • Chọn ngày/giờ mong muốn                                      │
│ • (Nếu tại nhà: Địa chỉ + Phí dịch vụ 50k)                    │
│   ↓                                                             │
│ ServiceBooking: PENDING                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: DUYỆT & PHÂN CÔNG (ADMIN/MANAGER)                      │
├─────────────────────────────────────────────────────────────────┤
│ Admin nhận thông báo booking mới                               │
│   ↓                                                             │
│ • Kiểm tra thông tin, lịch trống                               │
│ • Duyệt booking → APPROVED                                     │
│ • Chuyển thành WorkOrder + Phân công kỹ thuật viên             │
│   ↓                                                             │
│ WorkOrder: REQUESTED → ASSIGNED                                 │
│ Booking: APPROVED → CONVERTED                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: KỸ THUẬT VIÊN NHẬN VIỆC                                │
├─────────────────────────────────────────────────────────────────┤
│ Technician nhận notification                                   │
│   ↓                                                             │
│ A) Nhận việc → Giữ nguyên ASSIGNED                             │
│ B) Từ chối → DECLINED (Admin phân công lại)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: CHẨN ĐOÁN (TECHNICIAN)                                 │
├─────────────────────────────────────────────────────────────────┤
│ Kỹ thuật viên kiểm tra thiết bị                                │
│   ↓                                                             │
│ • Xác định nguyên nhân hỏng                                    │
│ • Ghi chú kỹ thuật                                             │
│ • WorkOrder: ASSIGNED → DIAGNOSED                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: BÁO GIÁ (TECHNICIAN)                                   │
├─────────────────────────────────────────────────────────────────┤
│ Kỹ thuật viên:                                                 │
│   ↓                                                             │
│ • Thêm linh kiện cần thay (từ Inventory)                       │
│ • Tính công lao động                                           │
│ • Tạo báo giá (Quote)                                          │
│   ↓                                                             │
│ WorkOrder: DIAGNOSED → QUOTED → AWAITING_APPROVAL              │
│ Quote: PENDING                                                  │
│   ↓                                                             │
│ Gửi thông báo cho khách duyệt                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: KHÁCH DUYỆT BÁO GIÁ                                    │
├─────────────────────────────────────────────────────────────────┤
│ Khách xem chi tiết báo giá:                                    │
│ - Phí linh kiện: xxx VND                                       │
│ - Phí công: xxx VND                                            │
│ - Phí dịch vụ: xxx VND                                         │
│ - TỔNG: xxx VND                                                │
│   ↓                                                             │
│ A) Đồng ý → Quote: APPROVED, WorkOrder: APPROVED               │
│ B) Từ chối (có lý do) → Quote: REJECTED, WorkOrder: REJECTED   │
│    (Kỹ thuật có thể tạo báo giá mới)                           │
│                                                                 │
│ * Báo giá có hạn 7 ngày, hết hạn tự động EXPIRED               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 7: THỰC HIỆN SỬA CHỮA                                     │
├─────────────────────────────────────────────────────────────────┤
│ Technician/Admin/Manager bấm "Bắt đầu sửa"                     │
│   ↓                                                             │
│ WorkOrder: APPROVED → IN_PROGRESS                              │
│   ↓                                                             │
│ Kỹ thuật viên:                                                 │
│ • Thực hiện sửa chữa                                           │
│ • Cập nhật tiến độ                                             │
│ • (Nếu cần chờ linh kiện: → ON_HOLD)                           │
│ • (Khi có linh kiện: ON_HOLD → IN_PROGRESS)                    │
│   ↓                                                             │
│ Khi hoàn tất:                                                  │
│ • Technician/Admin/Manager xác nhận hoàn thành                 │
│ • Ghi chi phí thực tế                                          │
│ • WorkOrder: IN_PROGRESS → COMPLETED                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 8: BÀN GIAO & THANH TOÁN                                  │
├─────────────────────────────────────────────────────────────────┤
│ • Khách đến lấy máy (hoặc giao tận nơi)                        │
│ • Thanh toán chi phí sửa chữa                                  │
│ • Xuất hóa đơn                                                 │
│ • Cập nhật bảo hành linh kiện thay thế                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## IV. LUỒNG KHO HÀNG (INVENTORY)

### 4.1 Luồng nhập hàng (Purchase Order)
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TẠO ĐƠN ĐẶT HÀNG                                             │
├─────────────────────────────────────────────────────────────────┤
│ Manager/Admin → Chọn nhà cung cấp → Thêm sản phẩm              │
│   ↓                                                             │
│ PurchaseOrder: DRAFT → SENT                                     │
│ (Gửi cho nhà cung cấp)                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. NHẬN HÀNG                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Warehouse/Admin kiểm tra hàng nhận                             │
│   ↓                                                             │
│ • Đối chiếu số lượng                                           │
│ • Kiểm tra chất lượng                                          │
│ • Nhập kho → Tăng QuantityOnHand                               │
│   ↓                                                             │
│ PurchaseOrder: SENT → RECEIVED                                  │
│ InventoryItem: QuantityOnHand += quantity                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Luồng xuất hàng (Sales Order)
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ĐẶT HÀNG → RESERVE STOCK                                     │
├─────────────────────────────────────────────────────────────────┤
│ Khách đặt hàng → Tạo StockReservation                          │
│   ↓                                                             │
│ InventoryItem: ReservedQuantity += quantity                     │
│ Available = QuantityOnHand - ReservedQuantity                   │
│ Reservation: ACTIVE (hết hạn sau 24h)                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. FULFILL ORDER → CONFIRM STOCK                                │
├─────────────────────────────────────────────────────────────────┤
│ Đơn hàng được thanh toán & giao                                │
│   ↓                                                             │
│ ConfirmReservedStock():                                         │
│ • ReservedQuantity -= quantity                                  │
│ • QuantityOnHand -= quantity                                    │
│ Reservation: ACTIVE → FULFILLED                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. HỦY ĐƠN → RELEASE STOCK                                      │
├─────────────────────────────────────────────────────────────────┤
│ Đơn hàng bị hủy                                                │
│   ↓                                                             │
│ ReleaseReservedStock():                                         │
│ • ReservedQuantity -= quantity                                  │
│ Reservation: ACTIVE → RELEASED                                  │
│ (Stock trở lại available)                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## V. VẤN ĐỀ & CẢI TIẾN

### 5.1 Vấn đề đã phát hiện

| # | Module | Vấn đề | Mức độ | Trạng thái |
|---|--------|--------|--------|------------|
| 1 | Sales | Không có endpoint xác nhận đơn | Cao | ✅ ĐÃ SỬA |
| 2 | Sales | Thiếu notification realtime | Trung bình | ⏳ Chưa làm |
| 3 | Repair | Technician không thể tự bắt đầu sửa | Cao | ✅ ĐÃ SỬA |
| 4 | Repair | Không có thanh toán sau sửa | Cao | ⏳ Chưa làm |
| 5 | Inventory | Parts không reserve khi thêm vào WO | Trung bình | ✅ Đã có IInventoryService |
| 6 | Inventory | Không có cảnh báo hết hàng tự động | Thấp | ⏳ Chưa làm |
| 7 | Frontend | TechPortal dùng sai API | Cao | ✅ ĐÃ SỬA |
| 8 | Frontend | Thiếu trang admin quản lý booking | Trung bình | ⏳ Chưa làm |
| 9 | Repair | Admin endpoints chỉ cho Admin role | Cao | ✅ ĐÃ SỬA |
| 10 | Sales | Admin endpoints chỉ cho Admin role | Cao | ✅ ĐÃ SỬA |

### 5.2 Cải tiến đã thực hiện

1. **TechPortal.tsx**: Sửa API call từ `admin` sang `technician`
2. **WorkOrderDetailPage.tsx**: Tạo trang chi tiết cho kỹ thuật viên
3. **App.tsx**: Thêm route cho work order detail
4. **RepairEndpoints.cs**: ✅ Thêm "Manager" vào admin group authorization
5. **SalesEndpoints.cs**: ✅ Thêm "Manager", "Sale" vào admin group authorization
6. **SalesEndpoints.cs**: ✅ Thêm các endpoints quản lý luồng đơn hàng:
   - `POST /api/sales/admin/orders/{id}/confirm` - Xác nhận đơn hàng
   - `POST /api/sales/admin/orders/{id}/fulfill` - Xuất kho
   - `POST /api/sales/admin/orders/{id}/ship` - Giao hàng
   - `POST /api/sales/admin/orders/{id}/deliver` - Xác nhận đã giao
   - `POST /api/sales/admin/orders/{id}/complete` - Hoàn thành đơn
7. **TechnicianEndpoints.cs**: ✅ Technician đã có thể cập nhật status (bao gồm start repair)

### 5.3 Cải tiến cần làm thêm

1. **Backend - Sales**:
   - Thêm logic tự động gửi notification (SignalR)

2. **Backend - Repair**:
   - Tích hợp thanh toán sau sửa chữa (Payment Gateway)

3. **Frontend - Admin**:
   - Trang quản lý booking (duyệt/từ chối/chuyển WO)
   - Dashboard thống kê realtime

---

## VI. LUỒNG PHỐI HỢP GIỮA CÁC ROLE

### 6.1 Bán hàng Online
```
Customer → Sale/Admin (xác nhận) → Accountant (xuất HĐ) → Sale (giao hàng)
```

### 6.2 Bán hàng POS
```
Sale (tạo đơn POS) → Thanh toán tại quầy → Xuất hóa đơn → Giao hàng/Khách lấy
```

### 6.3 Sửa chữa
```
Customer (đặt lịch) → Admin/Manager (duyệt & phân công) → Technician (nhận/từ chối)
    → Technician (chẩn đoán + báo giá) → Customer (duyệt giá)
    → Technician/Admin (start) → Technician (thực hiện) → Technician/Admin (complete)
    → Customer (thanh toán & nhận máy)
```

### 6.4 Nhập hàng
```
Manager (tạo PO) → Supplier (xác nhận & giao) → Warehouse (nhận & kiểm)
    → Accountant (thanh toán NCC)
```

---

## VII. CHECKLIST KIỂM TRA HỆ THỐNG

### Sales Module
- [ ] Khách có thể đặt hàng và thanh toán
- [ ] Sale có thể xác nhận đơn hàng
- [ ] Hệ thống tự reserve stock khi đặt hàng
- [ ] Hệ thống fulfill stock khi hoàn tất đơn
- [ ] Khách có thể hủy đơn (trạng thái cho phép)
- [ ] Admin có thể xử lý hoàn trả
- [ ] Điểm thưởng được cộng khi hoàn tất

### Repair Module
- [ ] Khách có thể đặt lịch sửa chữa
- [ ] Admin có thể duyệt booking
- [ ] Admin có thể chuyển booking thành WorkOrder
- [ ] Admin có thể phân công kỹ thuật viên
- [ ] Technician có thể nhận/từ chối việc
- [ ] Technician có thể chẩn đoán và ghi chú
- [ ] Technician có thể thêm linh kiện
- [ ] Technician có thể tạo báo giá
- [ ] Khách có thể duyệt/từ chối báo giá
- [ ] Hệ thống có thể bắt đầu sửa chữa
- [ ] Hệ thống có thể hoàn tất sửa chữa

### Inventory Module
- [ ] Có thể tạo PO mới
- [ ] Có thể nhận hàng và cập nhật tồn kho
- [ ] Stock được reserve khi đặt hàng
- [ ] Stock được fulfill khi giao hàng
- [ ] Stock được release khi hủy đơn
- [ ] Có cảnh báo tồn kho thấp

---

*Document Version: 1.1*
*Last Updated: 2026-02-14*
*Changes: v1.1 - Đã sửa permission cho RepairEndpoints và SalesEndpoints, thêm order lifecycle endpoints*
