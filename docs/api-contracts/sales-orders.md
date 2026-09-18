# Sales — vòng đời đơn hàng (W2-23)

**Chủ sở hữu:** W2-23 (`phase-72`). Bổ sung cho `sales-checkout-orders.md` (W2-3, luồng TẠO đơn);
tài liệu này mô tả mọi thứ xảy ra với đơn **sau khi** đơn đã tồn tại.

Chuẩn chung: `docs/api-conventions.md` (lỗi RFC 9457, `code` để FE rẽ nhánh), quyền theo
`docs/permission-matrix.md`, sự kiện theo `docs/integration-events.md`.

---

## 1. Bảng chuyển trạng thái (nguồn duy nhất)

`backend/Services/Sales/Application/Orders/OrderStateMachine.cs`. Một chiều, không có cạnh đi lùi.

| Từ | Sang được |
|---|---|
| `Draft` | `Pending`, `Confirmed`, `Cancelled` |
| `Pending` | `Confirmed`, `Paid`, `Cancelled` |
| `Confirmed` | `Paid`, `Fulfilled`, `Shipped`, `Cancelled` |
| `Paid` | `Fulfilled`, `Shipped`, `Completed`, `Cancelled` |
| `Fulfilled` | `Shipped`, `Delivered`, `Completed`, `Cancelled` |
| `Shipped` | `Delivered`, `Cancelled` |
| `Delivered` | `Completed`, `Cancelled` |
| `Completed` | — (đảo ngược phải đi qua luồng đổi/trả) |
| `Cancelled` | — |

Ràng buộc tiền chồng lên bảng trên:

- `PaymentStatus = PartiallyPaid` **chặn** `Fulfilled`/`Shipped`/`Delivered`/`Completed`.
  Ngoại lệ duy nhất: **đơn công nợ** (`PaymentDueDate` có giá trị, hoặc `PaymentMethod = "Credit"` **và** đơn đến từ báo giá — `QuotationId` khác null; `PaymentMethod` đơn thuần do client gửi nên không đủ để mở ngoại lệ) —
  D10 quy tắc 5: giao trước, thu sau.
- `Completed` chỉ đạt được khi `PaymentStatus = Paid` **và** `FulfillmentStatus = Fulfilled`.

Chuyển sai → **409 `CONFLICT`**, `message` nêu rõ trạng thái hiện tại bằng tiếng Việt.
Gọi lại đúng mốc đang đứng → **200, no-op** (idempotent), không sinh thêm dòng lịch sử.

Trạng thái thanh toán cũng một chiều:
`Pending → {PartiallyPaid, Paid, Failed}`, `PartiallyPaid → {Paid, Refunded, Failed}`,
`Paid → {Refunded}`, `Refunded → —`.

---

## 2. Endpoint

### `GET /api/sales/admin/orders/{id}/transitions`
Quyền `Sales.ViewAll`. FE dựng nút bấm từ đây thay vì hardcode luồng.

```json
{ "status":"Shipped", "statusLabel":"Đang giao", "paymentStatus":"Pending",
  "fulfillmentStatus":"Fulfilled", "isCreditOrder": false,
  "allowedNext":[{"status":"Delivered","label":"Đã giao"},{"status":"Cancelled","label":"Đã huỷ"}] }
```
Lỗi: `404 NOT_FOUND` đơn không tồn tại.

### `POST /api/sales/admin/orders/{id}/transitions`
Quyền `Sales.UpdateStatus`. Body — **không có trường tiền nào**:

```json
{ "to":"Shipped", "reason":"Bàn giao GHTK", "trackingNumber":"GHTK123", "carrier":"GHTK" }
```
200 → `{ status, statusLabel, paymentStatus, orderNumber }`.
Lỗi: `400 DOMAIN_RULE` (tên trạng thái sai) · `404 NOT_FOUND` · **`409 CONFLICT`** (bước nhảy sai,
hoặc đơn mới thu một phần mà không phải đơn công nợ).
Người thực hiện lấy từ token (`sub`), không bao giờ từ payload. Mọi lần chuyển ghi `OrderHistories`.

### `POST /api/sales/admin/orders/{id}/payments`
Quyền `Sales.TakeDeposit`. Ghi nhận **một lần thu tiền** (COD, chuyển khoản đã đối soát, đặt cọc).

```json
{ "method":"Cash", "amount":3000000, "reference":"PHIEUTHU-001", "tenderedAmount":3000000 }
```
`method` ∈ `Cash|Card|Transfer|SePay|VNPay|MoMo|ZaloPay|Credit|Installment|LoyaltyPoints`.
200 → `{ orderNumber, status, paymentStatus, totalAmount, collectedAmount, amountDue }`.
Lỗi: `400 DOMAIN_RULE` (`amount <= 0`, thiếu `reference`, `method` sai) · `404` ·
`409 CONFLICT` (đơn đã huỷ).

**Idempotent theo `reference`**: gửi lại cùng mã đối soát không cộng tiền lần hai.
Thu chưa đủ → `PaymentStatus = PartiallyPaid`, trả `amountDue`, **không** phát `InvoiceRequested`
(NĐ 254/2026 Đ9.2: tiền đặt cọc không phải thời điểm lập hoá đơn).

### `POST /api/sales/orders/{id}/cancel` (khách tự huỷ)
Quyền: đã đăng nhập, chỉ đơn của chính mình (đơn người khác → `404`, không lộ tồn tại).
Body `{ "reason": "..." }`. Chỉ cho phép khi đơn ở `Draft|Pending|Confirmed`; muộn hơn → `409`
kèm hướng dẫn tạo yêu cầu đổi/trả.
Huỷ sẽ: nhả giữ chỗ còn treo, **nhập lại tồn** đúng số lượng từng dòng, phát `OrderCancelled`, và
nếu đã thu tiền thì phát `RefundRequested` + ghi dấu `[task:refund]` vào lịch sử (huỷ **không** tự
hoàn tiền).

### Endpoint cũ vẫn còn (thuộc W2-10, `AdminOrderEndpoints.cs`)
`PUT /admin/orders/{id}/status`, `POST /admin/orders/{id}/{confirm|fulfill|ship|deliver|complete}`.
Từ W2-23 chúng gọi xuống cùng một bảng chuyển trạng thái nên cũng trả **409** khi nhảy sai
(`SetStatus` không còn là cửa hậu). Chúng **chưa** phát sự kiện tích hợp — xem IR gửi W2-10.

---

## 3. Sự kiện phát ra

| Mốc | Sự kiện | Payload |
|---|---|---|
| `→ Shipped` | `OrderShippedEvent` | + `BuyerInvoiceInfo`, `TrackingNumber` |
| `→ Delivered` / `Completed` | `OrderDeliveredEvent` | + đủ `InvoiceLineDto[]` (SKU, ĐVT, thuế suất luật định, cờ được giảm, giảm giá, hàng tặng, **serial**), `ShippingLineDto`, `BuyerInvoiceInfo`, `BusinessDate` |
| `PaymentStatus → Paid` | `OrderPaidEvent` | như trên |
| POS / nhận tại cửa hàng, thu đủ tiền | `OrderDeliveredEvent` | bàn giao xảy ra ngay — cùng một quy tắc hoá đơn cho mọi kênh |
| Huỷ | `OrderCancelledEvent` (+ `RefundRequestedEvent` nếu đã thu tiền) | |

**Hoá đơn:** `InvoiceRequestedEvent` được phát **duy nhất** bởi
`Application/Consumers/OrderInvoiceTriggerConsumer.cs`, theo cấu hình `EInvoice:IssueTrigger`:
`OrderDelivered` (mặc định) hoặc `OrderShipped`. Không còn phát ở mốc thu tiền
(`OrderPaidConsumer`) — NĐ 254/2026 Đ9.1 neo hoá đơn vào lúc chuyển giao quyền sở hữu,
"không phân biệt đã thu được tiền hay chưa".

**Idempotent:** dấu `[evt:invoice-requested]` trong `OrderHistories.Notes`. Phát lại sự kiện giao
hàng **không** sinh hoá đơn thứ hai.

---

## 4. Lịch sử đơn

`GET /api/sales/orders/{id}/history` (khách, đơn của mình) trả
`{ id, fromStatus, toStatus, notes, changedBy, changedAt }[]`, mới nhất trước.
`notes` có thể chứa dấu mốc máy đọc được: `[evt:invoice-requested]`, `[evt:order-shipped]`,
`[evt:order-delivered]`, `[task:refund]`, `[tender:<mã đối soát>]`.
