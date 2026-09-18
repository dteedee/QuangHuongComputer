# Sales — báo giá B2B (W2-19)

**Chủ sở hữu:** W2-19 (`phase-68`). Route: `/api/sales/quotations` — KHÔNG dùng chữ "quote"
(`POST /api/sales/pos/quote` và `RepairQuotes` đã có nghĩa khác, Key Insights).

Chuẩn chung: `docs/api-conventions.md`, quyền theo `docs/permission-matrix.md`
(`Sales.Quotations.{View,Create,Edit,Approve}` + `Sales.SellOnCredit`), sự kiện theo
`docs/integration-events.md`. Tiền VAT-inclusive theo D01. Buyer block theo D07
(`BuyerInvoiceInfo` shape). Công ty in trên phiếu lấy từ SystemConfig theo D09.

**Trạng thái tại bàn giao (2026-09-18):** module compiles sạch
(`scripts/qh-build.sh be backend/Services/Sales/Sales.csproj` = 0 lỗi), nhưng persistence CHƯA
chạy được trên :5050 cho tới khi gate áp 2 integration request (#49, #50 trong
`plans/260917-2100-full-system-overhaul/reports/integration-requests-w2.md`) — swap shared-type
entity → entity thật + đăng ký `IOrderPriceSource` theo kênh. Endpoint list dưới đây là hợp đồng
ĐÍCH; xem báo cáo track để biết phần nào đã probe được ngay bây giờ.

---

## 1. Trạng thái báo giá (nguồn duy nhất: `Domain/SalesQuotation.cs`)

| Từ | Sang được | Ai gọi |
|---|---|---|
| `Draft` | `Sent` | `POST /{id}/send` |
| `Sent` | `Accepted` | `POST /{id}/accept` |
| `Sent` | `Rejected` | `POST /{id}/reject` |
| `Sent`, `Accepted` | `Expired` | job hết hạn đơn (chưa có — IR #51) hoặc `POST /expire-due` (thủ công) |
| `Accepted` | `Converted` | `POST /{id}/convert` |
| `Converted` | — | không có transition nào ra khỏi Converted |

Chuyển sai → `400` với `Error` mô tả trạng thái hiện tại. Chỉ sửa được dòng/khối người mua khi
còn `Draft` (`PUT /{id}` trả `400` nếu không).

---

## 2. Endpoint

### `GET /api/sales/quotations` — quyền `Sales.Quotations.View`
Query: `status, customerId, validAfter, validBefore, createdBy, page=1, pageSize=20`.
Trả `{ items: QuotationListItemDto[], totalCount, page, pageSize }`.

### `GET /api/sales/quotations/{id}` — quyền `Sales.Quotations.View`
Trả `QuotationDto` đầy đủ (khối người mua + dòng + tiền). `404` nếu không tồn tại.

### `POST /api/sales/quotations` — quyền `Sales.Quotations.Create`
Body `UpsertQuotationRequest`:
```json
{
  "customerId": null, "customerName": "Trường THPT ABC", "customerPhone": "0900000000",
  "customerEmail": null,
  "buyerType": "BudgetUnit", "buyerLegalName": "Trường THPT ABC",
  "buyerTaxCode": null, "buyerBudgetUnitCode": "1234567890123",
  "buyerAddress": "...",
  "validUntil": null, "paymentTermDays": 0,
  "termsText": null, "notes": null,
  "lines": [
    { "productId": "...", "variantId": null, "quantity": 10,
      "unitPriceOverride": null, "lineDiscount": 0, "notes": null }
  ]
}
```
`buyerType`: `Individual|Organization|BudgetUnit`. `validUntil` null → mặc định 7 ngày
(config `Sales:Quotations:DefaultValidityDays`). `unitPriceOverride` null → giá niêm yết Catalog
tại thời điểm tạo. Số báo giá `BG-yyyyMM-#####` cấp bởi `IDocumentNumberService` (type `bg`,
sequence `docnum_bg_seq`, W1-11). `201` + `Location`, hoặc `400` (validate dòng/giảm giá/hạn mức).

**Hạn mức giảm giá (Implementation Steps #3):** tổng giảm giá dòng dưới giá niêm yết > 10%
(config `Sales:Quotations:MaxDiscountPercentWithoutApprovalPercent`) đòi người tạo có quyền
`Sales.Quotations.Approve`, nếu không → `400`. **Lưu ý:** đây là policy TẠM (xem IR #52) — W2-10
chưa có khái niệm "hạn mức duyệt theo người" tại thời điểm track này chạy.

### `PUT /api/sales/quotations/{id}` — quyền `Sales.Quotations.Edit`
Body giống `POST`. Chỉ áp dụng khi báo giá còn `Draft`. `400` nếu không.

### `POST /api/sales/quotations/{id}/send` — quyền `Sales.Quotations.Edit`
`Draft → Sent`. `400` nếu chưa có dòng nào hoặc không ở Draft.

### `POST /api/sales/quotations/{id}/accept` — quyền `Sales.Quotations.Edit`
`Sent → Accepted`. `400` nếu đã hết hạn hoặc không ở Sent.

### `POST /api/sales/quotations/{id}/reject` — quyền `Sales.Quotations.Edit`
Body tuỳ chọn `{ "reason": "..." }`. `Sent → Rejected`.

### `POST /api/sales/quotations/{id}/convert` — quyền `Sales.Quotations.Edit`
Chỉ từ `Accepted` và còn hạn (`400` nếu không — Success Criteria). Body `ConvertQuotationRequest`
(thông tin giao hàng — mọi thứ về TIỀN đọc lại từ báo giá, không nhận từ client):
```json
{ "recipientName": "...", "phone": "...",
  "streetAddress": null, "ward": null, "district": null, "province": null,
  "isPickup": true, "pickupStoreId": null, "pickupStoreName": null, "notes": null }
```
Đi qua `CheckoutOrchestrator` với `channel=Quotation`; giá từng dòng đọc từ
`SalesQuotationLines` theo `quotationId` (`QuotationOrderPriceSource`, seam
`IOrderPriceSource` của W2-3), **không áp khuyến mãi/coupon** (D10). Kết quả `ConvertQuotationResult`:
```json
{ "success": true, "orderId": "...", "orderNumber": "SO-202609-00042",
  "totalAmount": 12345000, "paymentMethod": "Credit", "paymentDueDate": "2026-10-18T00:00:00Z" }
```
`success:false` + `errorMessage` khi: sai trạng thái/hết hạn, hoặc công nợ bị từ chối (xem §3),
hoặc `CheckoutOrchestrator` từ chối (hết hàng...). Đơn tạo ra có `Orders.QuotationId` +
(nếu công nợ đạt) `PaymentMethod="Credit"` + `PaymentDueDate`.

### `GET /api/sales/quotations/{id}/print` — quyền `Sales.Quotations.View`
Trả `QuotationPrintPayloadDto`: khối công ty (từ SystemConfig, D09), `QuotationDto`, VAT breakdown
theo TỪNG thuế suất xuất hiện trên báo giá, điều khoản (custom hoặc mặc định cấu hình).

### `POST /api/sales/quotations/expire-due` — quyền `Sales.Quotations.Approve`
Kích hoạt thủ công/kiểm thử (xem IR #51 — chưa có job thật). Trả `{ "expiredCount": N }`.

---

## 3. Công nợ (D10, tối giản — Architecture)

Điều kiện, TẤT CẢ phải đúng, kiểm tra ngay trước khi gọi `CheckoutOrchestrator`:
1. `Sales:Credit:Enabled = true` (config, mặc định `false`).
2. Người thực hiện convert có quyền `Sales.SellOnCredit` (mặc định chỉ Admin/Manager).
3. `PaymentTermDays <= Sales:Credit:MaxTermDays` (config, mặc định 30).
4. Khách (`quotation.CustomerId`) không có đơn nào khác `PaymentMethod="Credit"`, chưa
   `PaymentStatus=Paid`, và `PaymentDueDate < now`.

Không đạt bất kỳ điều kiện nào (khi `PaymentTermDays > 0`) → convert bị từ chối HOÀN TOÀN
(`400`), không tự động rơi về "không công nợ".

---

## 4. DTO tham chiếu

`QuotationLineDto`: `id, sequence, productId, variantId, productName, productSku, unitName,
quantity, unitPrice, lineDiscount, vatRate, netAmount, vatAmount, lineTotal, notes`.

`QuotationDto`: `id, quotationNumber, status, customerId, customerName, customerPhone,
customerEmail, buyerType, buyerLegalName, buyerTaxCode, buyerBudgetUnitCode, buyerAddress,
subtotalAmount, discountAmount, taxAmount, totalAmount, paymentTermDays, validUntil, acceptedAt,
convertedAt, convertedOrderId, termsText, notes, createdBy, createdAt, updatedAt, lines[]`.

Nguồn thật: `backend/Services/Sales/Application/Quotations/QuotationDtos.cs`.
