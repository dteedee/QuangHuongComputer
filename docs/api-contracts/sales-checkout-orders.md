# Sales — giỏ hàng, checkout, đơn hàng (W2-3)

Nguồn sự thật cho wave 3 khi dựng lại UI. Mọi endpoint dưới đây thuộc `backend/Services/Sales`.
Quy ước lỗi/paging/validation: `docs/api-conventions.md`. Quyền: `docs/permission-matrix.md`.

**Hai luật xuyên suốt, áp cho mọi endpoint ở đây:**

1. **Giá đã BAO GỒM VAT (D01).** `total = Σ thành tiền dòng − giảm giá + phí ship ròng`.
   Thuế KHÔNG bao giờ được cộng thêm; nó được **tách ra** theo từng dòng theo thuế suất của
   danh mục tại ngày giao dịch (giờ VN). **Frontend không được tự tính thuế** — đọc `vatBreakdown`.
2. **Client không quyết định tiền.** Đơn giá, giảm giá và phí ship đều đọc/tính lại ở server tại
   thời điểm chốt đơn. Trường giá trong request được chấp nhận để tương thích nhưng bị **bỏ qua**.

---

## Giỏ hàng

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/api/sales/cart` | đăng nhập | Trả `CartDto` kèm `vatBreakdown` + tồn khả dụng từng dòng |
| POST | `/api/sales/cart/items` | đăng nhập | **Chỉ kiểm tồn, KHÔNG giữ chỗ** |
| PUT | `/api/sales/cart/items/{productId}` | đăng nhập | Đổi số lượng (tối đa 99/dòng) |
| DELETE | `/api/sales/cart/items/{productId}` | đăng nhập | |
| POST | `/api/sales/cart/apply-coupon` | đăng nhập | Chỉ để hiển thị; giá trị được tính lại lúc chốt đơn |
| DELETE | `/api/sales/cart/remove-coupon` | đăng nhập | |
| POST | `/api/sales/cart/set-shipping` | đăng nhập | |
| DELETE | `/api/sales/cart/clear` | đăng nhập | |
| POST | `/api/sales/cart/merge` | đăng nhập | Gộp giỏ vãng lai (cookie `qh_aid`) vào tài khoản + gắn đơn cũ |
| GET | `/api/sales/public/cart` | công khai | Giỏ khách vãng lai theo cookie |
| POST | `/api/sales/public/cart/items` | công khai | |

`CartDto`:

```jsonc
{
  "id": "guid", "customerId": "guid",
  "subtotalAmount": 1180000, "discountAmount": 0,
  "taxAmount": 87407,            // VAT tách ra, ĐÃ nằm trong totalAmount
  "shippingAmount": 0,
  "totalAmount": 1180000,        // == subtotal − discount + shipping
  "taxRate": 0.08,               // chỉ là NHÃN; đừng dùng để tính
  "couponCode": null,
  "items": [ { "productId": "guid", "productName": "…", "price": 590000, "quantity": 2,
               "subtotal": 1180000, "imageUrl": "…", "stockQuantity": 95,
               "variantId": null, "variantName": null, "variantSku": null } ],
  "vatBreakdown": [ { "rate": 0.08, "net": 1092593, "vat": 87407 } ]
}
```

`vatBreakdown` có **nhiều phần tử** khi giỏ trộn thuế suất (vd hàng 8% + hàng 10%). Khi đó nhãn
"Trong đó VAT (8%)" là SAI — liệt kê từng nhóm.

---

## Phiên checkout (giữ chỗ tồn kho)

**Đây là nơi DUY NHẤT tồn kho bị giữ.** Giữ 15 phút, gia hạn được **một lần**.

| Method | Path | Quyền | Lỗi |
|---|---|---|---|
| POST | `/api/sales/checkout/session` | đăng nhập | 404 giỏ không tồn tại · 403 giỏ của người khác · 400 giỏ trống / không đủ hàng |
| GET | `/api/sales/checkout/session/{id}` | đăng nhập | 403 phiên của người khác · 404 |
| POST | `/api/sales/checkout/session/{id}/extend` | đăng nhập | 400 đã gia hạn rồi |
| POST | `/api/sales/checkout/session/{id}/cancel` | đăng nhập | 403 · nhả chỗ đã giữ |

Request `{ "cartId": "guid" }` → `{ "sessionId": "guid", "expiresAt": "…Z", "holdMinutes": 15 }`.

Phiên hết hạn được `CheckoutSessionExpiryJob` quét mỗi phút: nhả chỗ và đặt phiên về `Expired`.

---

## Chốt đơn

Tất cả đi qua **một** `CheckoutOrchestrator` với `channel` ∈ `Web | Guest | Pos | Quotation`.

| Method | Path | Quyền | Kênh |
|---|---|---|---|
| POST | `/api/sales/checkout` | đăng nhập | Web |
| POST | `/api/sales/public/guest-checkout` | công khai | Guest |
| POST | `/api/sales/staff-checkout` | `Sales.Pos` | Pos (alias cũ; POS thật là W2-10) |
| POST | `/api/sales/checkout/orchestrate` | đăng nhập | Web, dùng giỏ + phiên có sẵn |
| POST | `/api/sales/fast-checkout` | đăng nhập | alias của `orchestrate` |

`POST /api/sales/checkout`:

```jsonc
{
  "items": [ { "productId": "guid", "variantId": null, "quantity": 2,
               "productName": "…", "unitPrice": 1 } ],   // productName/unitPrice BỊ BỎ QUA
  "shippingAddress": "12 Lê Lợi, Vĩnh Bảo, Hải Phòng",
  "recipientName": "Nguyễn Văn A", "recipientPhone": "0912345678",
  "paymentMethod": "COD",           // COD|VNPay|MoMo|ZaloPay|SePay|Installment|Cash|Card|Transfer|Credit
  "couponCode": null, "notes": null,
  "isPickup": false, "pickupStoreId": null, "pickupStoreName": null
}
```

Response 200:

```jsonc
{ "orderId": "guid", "orderNumber": "ORD-20260918-49A84F1A",
  "totalAmount": 1180000, "taxAmount": 87407,
  "orderStatus": "Pending", "requiresPaymentGateway": false }
```

Lỗi 400 (`code: DOMAIN_RULE`, `error` là câu tiếng Việt hiển thị được cho khách):
`Giỏ hàng không tồn tại` · `Giỏ hàng không thuộc về tài khoản này` · `Giỏ hàng trống` ·
`Không đủ hàng: <tên> (còn N)` · `Không xác định được giá bán: <tên>` ·
`Phiên checkout đã hết hạn, vui lòng tạo phiên mới` · `Phiên checkout không thuộc giỏ hàng này` ·
`Mã giảm giá đã hết lượt sử dụng` · `Giảm giá thủ công chỉ áp dụng cho bán hàng tại quầy`.

Toàn bộ thao tác nằm trong **một giao dịch** (Sales + Inventory + Content). Không gộp được
giao dịch ⇒ **từ chối đơn**, không bao giờ chạy tiếp ở chế độ không nguyên tử.
`OrderCreatedIntegrationEvent` chỉ phát **sau khi commit**.

---

## Tra cứu đơn của khách vãng lai

`GET /api/sales/public/orders/track?orderNumber=…&phone=…` — công khai.

Bắt buộc **cả hai** tham số và cả hai phải khớp cùng một đơn (chặn dò mã đơn).
Số điện thoại so sánh sau khi bỏ ký tự không phải chữ số. Sai mã và sai số điện thoại trả về
**cùng** 404 `Không tìm thấy đơn hàng khớp thông tin đã nhập`. Thiếu tham số → 400.

Trả về: mã đơn, ba trạng thái, các mốc thời gian, khối tiền, địa chỉ giao, tên người nhận,
mã vận đơn, và các dòng hàng. **Không** trả email, ghi chú nội bộ hay mã giảm giá.

---

## Khuyến mãi (xem trước)

`POST /api/promotions/evaluate` — công khai. Dùng chung `IPricingEngine` với lúc chốt đơn nên
số tiền xem trước khớp số tiền thật. Trả `subtotal`, `discountTotal`, `shippingDiscount`,
`finalTotal`, `appliedPromotions[]`, `freeGifts[]`, `warnings[]`.

---

## Thuộc các track khác (đường dẫn giữ nguyên sau khi W2-3 tách file)

| Nhóm | Route | Chủ sở hữu |
|---|---|---|
| Đơn của tôi | `/api/sales/orders*`, `/api/sales/my-stats` | **W2-23** |
| Quản trị đơn | `/api/sales/admin/orders*` | **W2-10** |
| Đổi/trả | `/api/sales/returns*`, `/api/sales/admin/returns*` | **W2-10** |
| Điểm thưởng | `/api/sales/loyalty*` | **W2-10** |
| Thống kê | `/api/sales/admin/stats*` | **W2-10** |
| POS | `/api/sales/pos/*` (chưa có) | **W2-10** |
| Báo giá | `/api/sales/quotations/*` (chưa có) | **W2-19** |
| Trả góp | `/api/sales/installments*` | **W2-20** |
| Vận chuyển | `/api/sales/shipping*` | **W2-11** |

---

## Doanh thu ghi nhận

`Sales.Domain.RecognizedRevenue` là định nghĩa **duy nhất**: đơn được tính khi
`PaymentStatus = Paid` **hoặc** `Status = Completed`, và **không** tính khi đơn `Cancelled`
hoặc `PaymentStatus = Refunded`; `NetAmount(total, refunded)` trừ tiền đã hoàn và không âm.
W2-10 (`/admin/stats`), W2-16 (Reporting) và W2-14 (kế toán) phải dùng lại, không tự viết điều kiện.
