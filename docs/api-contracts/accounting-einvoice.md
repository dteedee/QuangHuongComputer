# API contract — Kế toán / Hoá đơn điện tử (`/api/accounting/einvoice`)

Chủ sở hữu: track **W2-24** · Quyết định nền: `decisions/D07-hoa-don-dien-tu.md`, `D01` §5, `D09` §5
Căn cứ pháp lý: **NĐ 254/2026/NĐ-CP** (hiệu lực 01/07/2026, Đ.43.2.a bãi bỏ NĐ 123/2020) + **TT 91/2026/TT-BTC**.
Mọi lỗi theo hợp đồng lỗi chung của `docs/api-conventions.md` (`{ code, message, errors[] }`).

## 0. Chế độ vận hành (`EInvoice:Mode`)

| Mode | Ý nghĩa | Provider đăng ký |
|---|---|---|
| `External` | **Mặc định Production.** Hệ thống lập hoá đơn nội bộ + hàng đợi "Chờ xuất HĐĐT"; hoá đơn thật xuất trên phần mềm NCC rồi **ghi nhận lại**. Không có cuộc gọi ra ngoài nào. | `ExternalEInvoiceProvider` |
| `Sandbox` | Mô phỏng (dev/demo). Số hoá đơn tiền tố `SBX-`, ký hiệu `SBX-MOPHONG`, `isSandbox: true`, dấu chìm trên bản in, **không** mã cơ quan thuế, **không** mã tra cứu, **không** email khách. | `SandboxEInvoiceProvider` |
| `Live` | Gọi thẳng NCC thật — **chưa có adapter**, ứng dụng **từ chối khởi động**. | — |
| `Off` | Tắt hẳn. `IssueAsync` ném lỗi nghiệp vụ. | `ExternalEInvoiceProvider` (code `OFF`) |

Chốt khởi động (`EInvoiceStartupGuard.Validate`): `Mode=Sandbox` + `ASPNETCORE_ENVIRONMENT=Production`
⇒ `InvalidOperationException`, trừ khi `EInvoice:AllowSandboxInProduction=true`. `Mode=Live` ⇒ luôn ném.

Khoá cấu hình khác: `EInvoice:IssueTrigger` (`InvoiceRequested` mặc định | `Manual`), `EInvoice:Kind`
(`CashRegister` mặc định | `Vat`), `EInvoice:Series`, `EInvoice:SandboxPrefix` (`SBX-`),
`EInvoice:QueueWarningDays` (1). Khối người bán: section `Company` (`Name/Address/TaxCode/Phone/Email/Representative`).
**Không có credential nào trong cấu hình hay database** — khi có NCC thật, bí mật đến từ biến môi trường.

## 1. Endpoints

| # | Method | Path | Permission | Mô tả |
|---|---|---|---|---|
| 1 | GET | `/api/accounting/einvoice/mode` | `Permissions.Accounting.ViewInvoices` | Chế độ đang chạy (badge SANDBOX) |
| 2 | GET | `/api/accounting/einvoice/queue` | `Permissions.Accounting.ViewInvoices` | Hàng đợi chờ xuất HĐĐT |
| 3 | GET | `/api/accounting/einvoice/export` | `Permissions.Accounting.Export` | Xuất Excel hàng đợi |
| 4 | POST | `/api/accounting/einvoice/issue/{invoiceId:guid}` | `Permissions.Accounting.ManageInvoices` | Phát hành theo mã hoá đơn |
| 5 | POST | `/api/accounting/einvoice/issue/by-order/{orderId:guid}` | `Permissions.Accounting.ManageInvoices` | Phát hành theo mã đơn hàng |
| 6 | POST | `/api/accounting/einvoice/{invoiceId:guid}/record-external` | `Permissions.Accounting.ManageInvoices` | Ghi nhận hoá đơn đã xuất ngoài |
| 7 | PUT | `/api/accounting/einvoice/{invoiceId:guid}/buyer` | `Permissions.Accounting.EditInvoice` | Bổ sung thông tin người mua |
| 8 | GET | `/api/accounting/einvoice/status/{invoiceId:guid}` | `Permissions.Accounting.ViewInvoices` | Trạng thái HĐĐT của hoá đơn |

Đã **XOÁ** khỏi bản cũ: `POST /cancel/{id}`, `POST /replace/{oldId}`, `GET /pdf/{id}` — chúng gọi một
API MISA hư cấu (`api-einvoice.misa.vn/api/v1`, header `X-App-Id`, `/invoices/create`: không tồn tại
trong tài liệu MISA) và không bao giờ chạy được. Điều chỉnh/thay thế/tải XML nằm ở track adapter.

### 1. GET `/mode`
```json
{ "mode": "External", "provider": "EXTERNAL", "isSandbox": false, "kind": "CashRegister",
  "issueTrigger": "InvoiceRequested", "series": "", "queueWarningDays": 1, "notice": "Chế độ ghi nhận ngoài: …" }
```
`isSandbox: true` ⇒ giao diện **phải** hiện badge đỏ SANDBOX.

### 2. GET `/queue?page=&pageSize=&onlyLate=`
Hoá đơn **bán ra** đã phát hành nội bộ (`Status` ≠ Draft/Cancelled) mà `EInvoiceStatus` chưa thuộc
`{Issued, ExternalRecorded, Adjusted, Replaced}`. Sắp xếp **cũ nhất trước**. `onlyLate=true` lọc
`IssueDate <= now - QueueWarningDays` (lọc trong SQL nên `total` khớp với các trang).
Body: `PagedResult<EInvoiceQueueItemDto>` — `{ items, total, page, pageSize, totalPages, hasPreviousPage, hasNextPage }`.
```json
{ "invoiceId": "…", "invoiceNumber": "AR-20260918-78F3486D", "orderId": null, "orderNumber": null,
  "issueDate": "2026-09-18T10:52:30Z", "totalAmount": 10800000, "totalNet": 10000000, "totalVat": 800000,
  "buyerName": "Bán cho người tiêu dùng", "buyerTaxCode": null, "buyerAddress": null,
  "isConsumer": true, "eInvoiceStatus": "NotIssued", "ageDays": 0, "isLate": false }
```
Mỗi đơn GIAO XONG sinh đúng một hoá đơn nội bộ trong cùng chu kỳ xử lý (consumer `OrderDelivered`
/`OrderPaid` của W2-14), nên "đơn đã giao chưa có HĐĐT" = "hoá đơn chưa có HĐĐT".

### 3. GET `/export?onlyLate=`
`200` + `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
tên file `cho-xuat-hddt-YYYYMMDD.xlsx`, sheet `ChoXuatHDDT`, tối đa 5000 dòng.
Cột: Số hoá đơn nội bộ · Mã đơn hàng · Ngày lập · Tên người mua · Mã số thuế · Địa chỉ ·
Tiền hàng chưa thuế · Tiền thuế GTGT · Tổng thanh toán · Số ngày chờ · Trạng thái HĐĐT.
**Đây là bộ cột trung lập, KHÔNG phải mẫu nhập của một NCC cụ thể** — mẫu thật lấy từ chủ shop ở đợt 3.

### 4/5. POST `/issue/{invoiceId}` · `/issue/by-order/{orderId}`
Không có body. Chốt trạng thái (trước đây chỉ có chốt vai trò):

| Điều kiện | HTTP |
|---|---|
| Không tìm thấy hoá đơn/đơn | 404 |
| `Type` ≠ Receivable | 409 |
| `Status` = Draft | 409 |
| `Status` = Cancelled | 409 |
| Không có dòng hàng | 409 |
| `EInvoiceStatus` đã thuộc {Issued, ExternalRecorded, Adjusted, Replaced} | **409** |
| `Mode=External`/`Off` | 400 (`DomainException`: hãy xuất trên phần mềm NCC rồi ghi nhận lại) |
| NCC từ chối | 400, hoá đơn chuyển `Failed` và **ở lại hàng đợi** |

`200` ⇒ `EInvoiceResultDto`:
```json
{ "invoiceId": "…", "invoiceNumber": "AR-…", "status": "Issued", "provider": "SANDBOX",
  "isSandbox": true, "series": "SBX-MOPHONG", "number": "SBX-01234567", "lookupCode": null,
  "issuedAt": "2026-09-18T03:00:00Z", "notice": "MÔ PHỎNG — KHÔNG CÓ GIÁ TRỊ PHÁP LÝ…" }
```
Idempotent theo `RefId = Invoice.Id`: số hoá đơn mô phỏng sinh tất định từ `RefId`.

### 6. POST `/{invoiceId}/record-external`
```json
{ "series": "1C26TQH", "number": "00000123", "lookupCode": "ABC123", "issuedAt": "2026-09-18T03:00:00Z" }
```
`series`/`number` bắt buộc (400 `RequestValidationException` kèm `errors[].field`), `issuedAt` không
được ở tương lai, mặc định = bây giờ. Cùng bảng chốt trạng thái như `/issue` ⇒ ghi nhận hai lần = **409**.
Kết quả: `EInvoiceStatus = ExternalRecorded`, hoá đơn rời hàng đợi.

### 7. PUT `/{invoiceId}/buyer`
`{ buyerType, legalName, fullName, taxCode, budgetUnitCode, address, email, phone }` — cửa sổ bổ sung
thông tin người mua sau khi đặt hàng (Phụ lục mục 4b NĐ 254/2026: hoá đơn không có thông tin người mua,
hoặc bán cho người tiêu dùng, **không dùng để hạch toán chi phí/kê khai thuế**). **409** khi HĐĐT đã xuất
(khối người mua bị khoá — D07 §Bảo mật). `BuyerPersonalId` **không** được thu thập: luật cho phép MST
*hoặc* mã ĐVQHNS *hoặc* số định danh, và cho phép "bán cho người tiêu dùng" khi không có gì.

### 8. GET `/status/{invoiceId}`
`EInvoiceResultDto` đọc từ hoá đơn nội bộ + ghi chú của provider. Sandbox **không bao giờ** trả
`SignedByCQT`, mã cơ quan thuế hay link `hoadondientu.gdt.gov.vn`.

## 2. Mô hình dữ liệu

`EInvoiceDocument` (chứng từ trung lập gửi NCC): `RefId` (= `Invoice.Id`, khoá chống trùng),
`InternalInvoiceNumber`, `IssueDate`, `Kind`, `Buyer`, `PaymentMethodName` (`TM` | `CK` | `TM-CK` |
`TM/CK` khi chưa thu), `Lines[]`, `TotalNet`, `TotalVat`, `TotalAmount`, `Currency = VND`.
`EInvoiceDocumentLine`: `Name, Sku, UnitName, Quantity, UnitPrice, VatRate (%), DiscountAmount,
NetAmount, VatAmount, GrossAmount, IsPromotion`.

`EInvoiceStatuses`: `NotIssued | Pending | Issued | Failed | Adjusted | Replaced | ExternalRecorded`.

**Nợ kỹ thuật đã ghi nhận:** bảng `Invoices` mới có 5 cột HĐĐT. Cho tới khi W2-14 thêm các cột của D07
(`EInvoiceSeries/Provider/Mode/Kind/TaxAuthorityCode/Error/RefId/RelatedEInvoiceId`), ánh xạ tạm là
`EInvoiceId` = **ký hiệu**, `EInvoiceNumber` = **số**, `EInvoiceLookupCode` = **mã tra cứu**
(integration request W2-24 #1). API vẫn trả `series`/`number` tách rời nên hợp đồng không đổi khi cột thật ra đời.

## 3. Bản in nội bộ

`GET /api/accounting/invoices/{id}/html` (endpoint của W2-14) dùng `Templates/InvoiceHtmlTemplate`:
khối người bán đọc từ section `Company`, cột **Giảm giá** trên từng dòng, ĐVT, thuế suất, nhãn
"hàng khuyến mại không thu tiền", khối người mua theo Phụ lục 4b, và dấu chìm
`MÔ PHỎNG - KHÔNG CÓ GIÁ TRỊ PHÁP LÝ` ở chế độ Sandbox.

## 4. Căn cứ pháp lý

- **NĐ 254/2026 Đ.9.1** — lập hoá đơn tại thời điểm chuyển giao hàng, *"không phân biệt đã thu được tiền hay chưa"* ⇒ mốc `InvoiceRequested` (do `OrderDelivered` sinh ra).
- **NĐ 254/2026 Đ.10.1.k** — *"Phí, lệ phí thuộc ngân sách nhà nước, chiết khấu thương mại, khuyến mại (nếu có) và các nội dung khác liên quan"* ⇒ **cột giảm giá từng dòng trên hoá đơn**. Đây là căn cứ THAY THẾ cho NĐ 123/2020 Đ.10.6.đ mà `D01` §5 còn dẫn; NĐ 123/2020 đã bị NĐ 254/2026 **Đ.43.2.a** bãi bỏ từ 01/07/2026. Nguồn: toàn văn NĐ 254/2026 trên luatvietnam.vn (truy cập 18/09/2026).
- **NĐ 254/2026 Đ.6.1.c** — bán lẻ (trừ ô tô/xe máy) dùng hoá đơn khởi tạo từ **máy tính tiền** ⇒ `Kind=CashRegister` mặc định.
- **NĐ 254/2026 Đ.8.9.b** — không bắt buộc chữ ký số.
- **NĐ 254/2026 Phụ lục mục 4b** — *"Bán cho người tiêu dùng"*; hoá đơn không có thông tin người mua không dùng để hạch toán/kê khai ⇒ cửa sổ bổ sung người mua (endpoint 7).
- **NĐ 254/2026 Đ.15.3** — cuối ngày gửi dữ liệu hoá đơn MTT cho cơ quan thuế (thuộc track adapter).
- **TT 91/2026** — điều chỉnh/thay thế hoá đơn sai sót; chưa đọc toàn văn ⇒ `AdjustAsync`/`ReplaceAsync` mới chỉ khai báo, ném `NotSupportedException`.
