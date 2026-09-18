# Accounting API contract

**Owner:** W2-14 · **Trạng thái:** wave 2, 2026-09-18 · **Base:** `/api/accounting`

Wave 3 (W3-13) dựng lại giao diện kế toán **chỉ từ tài liệu này**.

Quy ước chung theo `docs/api-conventions.md`: lỗi RFC 9457 (`code` + `message` tiếng Việt),
phân trang `?page&pageSize&search&sortBy&sortDir` trả
`{items,total,page,pageSize,totalPages,hasPreviousPage,hasNextPage}`, số chứng từ `PREFIX-yyyyMM-#####`.
**Mọi số tiền là VND, số nguyên đồng.** Thuế suất trong response tính theo **phần trăm** (8 = 8%).

Các route **KHÔNG** thuộc tài liệu này: `/api/accounting/tax-reports/**` (W2-25),
`/api/accounting/einvoice/**` (W2-24), `/api/reports/**` (W2-16).

---

## 0. Nguyên tắc tiền và thuế (D01)

- Giá bán đã gồm VAT. Hoá đơn **tách** VAT ra: `net = Round(gross / (1 + rate))`, `vat = gross − net`.
  Nhờ đó `Σ(net + vat)` luôn khớp tổng đơn hàng **đến từng đồng**.
- Thuế suất được resolve theo **ngày lập hoá đơn** (không phải ngày đặt hàng), từ
  `VatStatutoryRate` + `VatReductionEligible` của từng dòng. Mức giảm 2 điểm hết hiệu lực 31/12/2026.
- Giảm giá hiện **trên từng dòng** (`grossBeforeDiscount`, `lineDiscount`, `grossAmount`),
  không có dòng âm ở chân hoá đơn.
- Hàng khuyến mại: dòng có `grossAmount = 0`, `isPromotion = true`, `note` ghi rõ.

---

## 1. Hoá đơn — `/invoices`

| Method | Path | Permission |
|---|---|---|
| GET | `/invoices` | `Permissions.Accounting.ViewInvoices` |
| GET | `/invoices/{id}` | ViewInvoices |
| POST | `/invoices` | `Permissions.Accounting.CreateInvoice` |
| PUT | `/invoices/{id}` | `Permissions.Accounting.EditInvoice` |
| POST | `/invoices/{id}/issue` | CreateInvoice |
| POST | `/invoices/{id}/cancel` | CreateInvoice |
| GET | `/invoices/{id}/html` | ViewInvoices |
| GET | `/stats` | ViewInvoices |

**GET `/invoices`** — lọc `type` (`Receivable|Payable`), `status`, `search` (số hoá đơn, số đơn hàng,
tên/MST người mua). `sortBy`: `invoiceNumber|issueDate|dueDate|totalAmount`.
Item: `{id, invoiceNumber, type, status, customerId, supplierId, orderId, orderNumber, issueDate,
dueDate, subTotal, vatAmount, totalAmount, paidAmount, outstandingAmount, agingBucket, currency}`.

**GET `/invoices/{id}`** → `InvoiceDetail`:
```
{ id, invoiceNumber, type, status, customerId, organizationAccountId, supplierId,
  orderId, orderNumber, issueDate, dueDate, businessDate,
  subTotal, vatRate, vatAmount, totalAmount, paidAmount, outstandingAmount,
  agingBucket, currency, notes,
  buyer: { buyerType, legalName, fullName, taxCode, budgetUnitCode, address, email, phone },
  lines: [ { id, description, sku, unitName, quantity, unitPrice, vatRate,
             grossBeforeDiscount, lineDiscount, grossAmount, netAmount, vatAmount,
             isPromotion, note } ],
  paymentApplications: [ { id, paymentIntentId, invoiceId, amount, appliedAt, notes } ] }
```
`vatRate` cấp hoá đơn = 0 khi hoá đơn có **nhiều** thuế suất — đọc thuế suất ở từng dòng.
`unitPrice` chỉ để in (= `netAmount / quantity`); con số lên tờ khai là `netAmount`.
Lỗi: 404 `NOT_FOUND`.

**POST `/invoices`** (hoá đơn lập tay). Không có trường tiền tệ, không có thuế suất cấp hoá đơn,
không có hạn thanh toán bắt buộc (mặc định từ cấu hình `Accounting:InvoiceDueDays`, fallback 30 ngày).
```
{ customerId?, organizationAccountId?, notes?, dueDate?,
  buyer?: { buyerType, legalName, fullName, taxCode, budgetUnitCode, address, email, phone },
  lines: [ { description, quantity, unitPriceIncludingVat,
             vatStatutoryRate? /* % , mặc định 10 */, vatReductionEligible? /* mặc định true */,
             discount?, sku?, unitName? } ] }
```
→ 201 + `InvoiceDetail` (trạng thái `Draft`). Lỗi: 400 `VALIDATION_FAILED`
(`lines` rỗng, `quantity <= 0`, `unitPriceIncludingVat < 0`, `vatStatutoryRate` ngoài 0..100).

**PUT `/invoices/{id}`** — chỉ khi `status = Draft`; thay toàn bộ dòng hàng.
Lỗi: 409 `CONFLICT` "Chỉ sửa được hoá đơn ở trạng thái nháp.", 404.

**POST `/invoices/{id}/issue`** → 200 `InvoiceDetail` (`Issued`). Lỗi: 409 nếu đã phát hành.

**POST `/invoices/{id}/cancel`** body `{ reason }` → 200. Lỗi: 409 nếu `paidAmount > 0`
("phải lập giấy báo có thay vì huỷ"), 404.

**GET `/stats`** → `{ totalReceivables, totalPayables, overdueReceivables, overduePayables,
revenueToday, totalReceivableInvoices, totalPayableInvoices, activeAccounts }`.
Phải thu và phải trả **tách riêng**; `revenueToday` tính theo ngày làm việc Việt Nam.

---

## 2. Công nợ phải thu — `/ar`

| Method | Path | Permission |
|---|---|---|
| GET | `/ar` | ViewInvoices |
| GET | `/ar/aging-summary` | ViewInvoices |
| GET | `/ar/{id}` | ViewInvoices |
| POST | `/ar/{id}/apply-payment` | `Permissions.Accounting.CreateInvoice` |

`GET /ar` lọc `aging`, `status`, `customerId`, `search`. Item: `ARInvoiceListDto`
`{id, invoiceNumber, customerId, organizationAccountId, issueDate, dueDate, totalAmount,
paidAmount, outstandingAmount, status, agingBucket, currency}`.

`GET /ar/aging-summary` → `{current, days1To30, days31To60, days61To90, over90Days, totalOutstanding}`.

`GET /ar/{id}` → `InvoiceDetail` (chỉ hoá đơn `Receivable`).

`POST /ar/{id}/apply-payment` body `{ paymentIntentId, amount, notes? }`
→ `{ message, outstandingAmount, status }`.
Lỗi: 409 nếu hoá đơn không phải Receivable; 400 nếu số tiền vượt số còn phải thu; 404.
**D10:** khi tất toán hoá đơn của đơn bán công nợ, hệ thống phải phát `ReceivablePaidEvent`
để Sales đóng đơn — hợp đồng sự kiện chưa tồn tại, xem integration request W2-14 #1.

---

## 3. Công nợ phải trả — `/ap`

| Method | Path | Permission |
|---|---|---|
| GET | `/ap` | ViewInvoices |
| GET | `/ap/aging-summary` | ViewInvoices |
| GET | `/ap/{id}` | ViewInvoices |
| POST | `/ap` | CreateInvoice |
| POST | `/ap/{id}/apply-payment` | CreateInvoice |

Nguồn chính của AP là sự kiện `POReceivedEvent` (nhập kho) — consumer idempotent theo
`(POId, GoodsReceiptId)`, hạn thanh toán theo `Supplier.PaymentTerms`.

`POST /ap` body `{ supplierId, dueDate, lines: [{description, quantity, unitPrice, vatRate}],
purchaseOrderId?, goodsReceiptId?, notes? }` → 201 `{id, invoiceNumber, totalAmount}`.
**Giá nhà cung cấp là giá CHƯA thuế**: thuế được cộng thêm (ngược với giá bán lẻ, vốn đã gồm thuế).

`POST /ap/{id}/apply-payment` body `{ amount, paymentMethod, reference? }`.

---

## 4. Giấy báo có — `/credit-notes`

| Method | Path | Permission |
|---|---|---|
| GET | `/credit-notes` | ViewInvoices |
| GET | `/credit-notes/{id}` | ViewInvoices |
| POST | `/credit-notes` | CreateInvoice |
| POST | `/credit-notes/{id}/cancel` | CreateInvoice |

Tự sinh từ sự kiện: `OrderCancelledEvent` (khi hoá đơn đã thu tiền — chưa thu thì huỷ thẳng hoá đơn)
và `ReturnCompletedEvent`. Chống trùng bằng `sourceKey` (`order-cancelled:{orderId}` ·
`return:{returnId}`), có unique index, cộng thêm trần ghi giảm: tổng giấy báo có của một đơn
không vượt quá giá trị hoá đơn gốc.

`RefundRequestedEvent` **KHÔNG** sinh giấy báo có (sửa 18/09/2026): Sales phát sự kiện này
KÈM THEO `OrderCancelledEvent` khi huỷ đơn đã thu tiền, và phát ngay lúc khách GỬI yêu cầu trả
hàng (trước khi duyệt, số tiền còn đổi được). Nếu nó cũng lập giấy báo có thì một lần huỷ/trả
sinh hai chứng từ ghi giảm. Việc chi tiền hoàn là của module Payments.

DTO: `{id, creditNoteNumber, type (Credit|Debit), status (Draft|Issued|Cancelled),
reasonCode (OrderCancelled|Refund|Return|PriceAdjustment|Other), reason,
amount, netAmount, vatAmount, vatRate, issueDate, businessDate,
originalInvoiceId, originalInvoiceNumber, orderId, customerId}`.

`POST /credit-notes` body `{ originalInvoiceId, amount, reasonCode, reason }`.
Lỗi: 409 nếu hoá đơn gốc còn `Draft`; 400 nếu `amount` vượt giá trị hoá đơn; 404.

Số chứng từ hiện là `CN/INV-yyyyMM-#####` (mượn dãy `inv`) — xem integration request W2-14 #2.

---

## 5. Sổ quỹ tiền mặt — `/cash-book`, `/cash-vouchers`

| Method | Path | Permission |
|---|---|---|
| GET | `/cash-book?fundCode=&from=&to=` | ViewInvoices |
| GET | `/cash-book/funds` | ViewInvoices |
| GET | `/cash-vouchers` | ViewInvoices |
| POST | `/cash-vouchers` | CreateInvoice |

`GET /cash-book` → `{ fundCode, from, to, openingBalance, totalIn, totalOut, closingBalance,
entries: [ { voucher: CashVoucherDto, runningBalance } ] }`.
Số dư luỹ kế **tính khi đọc** theo thứ tự `(voucherDate, createdAt)`, không lưu trên từng phiếu.
Lỗi: 400 `VALIDATION_FAILED` nếu thiếu `fundCode`.

`CashVoucherDto`: `{id, voucherNumber, kind (Receipt|Payment), fundCode, amount, signedAmount,
voucherDate, businessDate, description, counterpartyName, source
(Manual|ShiftClose|Expense|SupplierPayment|CustomerDeposit|InvoiceSettlement),
shiftSessionId, expenseId, invoiceId, orderId}`.

Số phiếu: `PT/PAY-yyyyMM-#####` (thu) · `PC/PAY-yyyyMM-#####` (chi).
Phiếu tự sinh: chốt ca (`shift-close:{shiftId}`), chi khoản chi bằng tiền mặt (`expense:{expenseId}`).
Mã quỹ mặc định của một kho/cửa hàng: `CASH-{warehouseId:N}`.

---

## 6. Ca thu ngân — `/api/accounting/shifts`

Nhóm này có HAI tầng quyền (sửa 18/09/2026 khi kiểm chứng đối kháng):

- **Thao tác của thu ngân** — `/shifts/open`, `/shifts/current`, `/shifts/{id}/close`,
  `/shifts/{id}/transactions`: `Permissions.Sales.Pos`. Vai trò `Sale` không có bất kỳ quyền
  `Accounting.*` nào, nên đặt các route này dưới quyền Kế toán sẽ trả 403 cho chính người cần dùng.
- **Giám sát** — `GET /shifts`, `GET /shifts/{id}`: quyền module Kế toán
  (`Permissions.Accounting.ViewInvoices`); `POST /shifts/{id}/approve-variance`:
  `Permissions.Accounting.ManageDebt`. Nếu để chung một nhóm dưới `Sales.Pos` thì vai trò
  `Accountant` (không có `Sales.Pos`) bị 403 trên chính sổ ca, và chỉ `Manager` — vai trò duy
  nhất có đồng thời hai quyền — duyệt được chênh lệch quỹ.

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/shifts/open` | `{ warehouseId, openingBalance }` — thu ngân lấy từ JWT |
| GET | `/shifts/current` | ca đang mở của chính mình; 204 nếu không có |
| POST | `/shifts/{id}/close` | `{ actualCash, varianceReason? }` |
| POST | `/shifts/{id}/approve-variance` | `{ note? }` — người duyệt phải khác thu ngân |
| GET | `/shifts` | lọc `status`, `cashierId`, `warehouseId`; `sortBy: openedAt\|closedAt\|variance` |
| GET | `/shifts/{id}` | chi tiết + danh sách giao dịch |
| POST | `/shifts/{id}/transactions` | `{ description, amount, type (Debit\|Credit), reference? }` |

**Công thức đối soát:** `expectedCash = openingBalance + Σthu − Σchi`,
`variance = actualCash − expectedCash` (âm = thiếu quỹ). Cả hai được **lưu** lúc chốt ca.

`ShiftSessionDto`: `{id, cashierId, warehouseId, openedAt, closedAt, openingBalance,
closingBalance, status, cashIn, cashOut, expectedCash, variance, varianceReason,
varianceApprovedBy, varianceApprovedAt, duration, transactions: [{id, description, amount,
type, source, timestamp, reference}]}`.
`source`: `Manual|PosSale|PosRefund|Deposit|CashDrop|ExpensePayout`.

Lỗi: 409 nếu thu ngân đang có ca chưa chốt; 400 nếu chốt ca có chênh lệch mà không ghi lý do;
403 nếu chốt/ghi giao dịch vào ca của người khác, hoặc tự duyệt chênh lệch của chính mình.

---

## 7. Chi phí — `/expenses`, `/expense-categories`

| Method | Path | Permission |
|---|---|---|
| GET/POST/PUT | `/expense-categories[/{id}]` | module Accounting (View/Create/Edit) |
| GET | `/expenses`, `/expenses/summary`, `/expenses/{id}` | ViewInvoices |
| POST/PUT | `/expenses[/{id}]` | Create/Edit |
| POST | `/expenses/{id}/approve` `/reject` `/pay` | `Permissions.Accounting.ManageExpense` |

`POST /expenses` body `{ categoryId, description, amount, vatRate /* % */, expenseDate,
supplierId?, employeeId?, notes?, receiptUrl? }` — không còn trường `currency` (luôn VND).
`POST /expenses/{id}/pay` body `{ paymentMethod, fundCode? }`; **chi bằng tiền mặt sẽ tự sinh
phiếu chi** vào sổ quỹ (`fundCode` bỏ trống = `CASH-MAIN`).

Danh mục mặc định được seed (13 mã): `SALARY, INSURANCE, RENT, UTILITIES, INTERNET, MARKETING,
SHIPPING, SUPPLIES, MAINTENANCE, WARRANTY, BANK_FEE, TAX_FEE, OTHER`.

---

## 8. Tài khoản công nợ tổ chức — `/accounts`

`GET /accounts` (phân trang, `search` theo tên, `sortBy: name|balance|creditLimit`),
`GET /accounts/{id}`, `POST /accounts` `{ name, creditLimit }`.

---

## 9. Máy tính thuế — `/api/accounting/tax`

Chỉ tính toán, không đọc/ghi dữ liệu. Permission: module Accounting.

| Method | Path | Body |
|---|---|---|
| POST | `/tax/pit` | `{grossSalary, numberOfDependents?, socialInsurance?, healthInsurance?, unemploymentInsurance?, otherDeductions?}` |
| POST | `/tax/insurance` | `{grossSalary, regionalMinSalary?}` |
| POST | `/tax/vat` | `{amount, vatStatutoryRate? /* % */, vatReductionEligible?, isInclusive?, businessDate?}` |
| POST | `/tax/cit` | `{revenue, deductibleExpenses}` |
| POST | `/tax/payroll` | `{grossSalary, numberOfDependents?, otherDeductions?, regionalMinSalary?}` |
| GET | `/tax/rates` | — |

`GET /tax/rates` trả thuế suất **hiệu lực hôm nay** kèm cửa sổ giảm và căn cứ pháp lý,
thay cho bảng hằng số cứng của bản cũ.

---

## 10. Sự kiện tiêu thụ

| Sự kiện | Consumer | Hành vi |
|---|---|---|
| `OrderPaidEvent` | `OrderPaidInvoiceConsumer` | Hoá đơn VND, tự tất toán. Idempotent theo `OrderId`. Nếu đơn **đã có** hoá đơn (POS/COD: `OrderDelivered` tới trước) thì tất toán phần còn lại của hoá đơn đó thay vì bỏ qua. |
| `OrderDeliveredEvent` | `OrderDeliveredInvoiceConsumer` | D10: đơn công nợ ghi nhận phải thu lúc giao hàng; hoá đơn phát hành nhưng chưa tất toán. |
| `OrderCancelledEvent` | `OrderCancelledCreditNoteConsumer` | Chưa thu tiền → huỷ hoá đơn; đã thu → giấy báo có. |
| `ReturnCompletedEvent` | `ReturnCompletedCreditNoteConsumer` | Giấy báo có theo số hoàn cuối cùng, idempotent theo `sourceKey`. |
| `RefundRequestedEvent` | *(không tiêu thụ ở Kế toán)* | Xem mục 5 — tránh lập hai giấy báo có cho cùng một lần huỷ/trả. |
| `POReceivedEvent` | `POReceivedConsumer` | Hoá đơn mua vào + công nợ NCC. |
| `PayrollPaidIntegrationEvent` | `PayrollPaidConsumer` | Khoản chi lương, idempotent theo `PayrollId`. |

`InvoiceRequestedEvent` **không còn được tiêu thụ**: payload của nó không mang thuế suất,
giảm giá, phí ship hay thông tin người mua nên không thể dựng hoá đơn đúng luật từ nó.
