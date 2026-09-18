# Sales — POS, đổi trả, điểm thưởng, quản trị đơn, thống kê

Track W2-10 (`phase-48`). Wave 3 dựng UI **chỉ từ tài liệu này**.
Lỗi theo `docs/api-conventions.md` §1 (`{code, error, message, errors[]}`); quyền theo
`docs/permission-matrix.md` (policy, không bao giờ theo chuỗi vai trò). Tiền VND, đã gồm VAT (D01).

Tiền tố: `/api/sales`. Nhóm `/admin/**` gắn quyền theo verb, các endpoint dưới đây gắn policy tường minh.

---

## 1. POS — bán tại quầy

Mọi endpoint yêu cầu `Permissions.Sales.Pos`. **Client không gửi tiền**: không `unitPrice`, không `total`.

### `POST /pos/quote` — tạm tính
Không ghi CSDL, không giữ tồn.
```jsonc
{ "lines": [{ "productId": "…", "quantity": 2, "variantId": null }],
  "customerId": null, "manualDiscount": 100000, "promotionCodes": [] }
```
200 →
```jsonc
{ "lines": [{ "productId":"…","productName":"…","sku":"…","quantity":2,"unitPrice":265000,
              "grossBeforeDiscount":530000,"lineDiscount":0,"allocatedOrderDiscount":50000,
              "payable":480000,"vatRate":0.08,"vatAmount":35556 }],
  "subtotal":530000, "discount":100000, "manualDiscountApplied":100000,
  "taxAmount":…, "total":430000,
  "vatBreakdown":[{"rate":0.08,"net":…,"vat":…}],
  "warnings":["Giảm giá tay bị cắt từ … xuống trần …"] }
```
Lỗi: 400 `DOMAIN_RULE` (giỏ rỗng, sản phẩm không tồn tại, không xác định được giá, giảm giá tay phải có quản lý duyệt / không được tự duyệt).

### `POST /pos/orders` — chốt đơn
```jsonc
{ "lines":[{"productId":"…","quantity":2,"serials":[]}],
  "storeId":"<warehouse uuid>", "shiftId":null,
  "customerId":null, "customerName":"Anh Nam", "customerPhone":"09…",
  "manualDiscount":100000, "manualDiscountReason":"khách quen", "approvedBy":"<user id quản lý>",
  "promotionCodes":[], "notes":null, "heldOrderId":null,
  "tenders":[{"method":"Cash","amount":430000,"tenderedAmount":500000,"reference":null}] }
```
201 →
```jsonc
{ "orderId":"…","orderNumber":"…","total":430000,"collected":430000,"amountDue":0,
  "changeDue":70000,"status":"Completed","paymentStatus":"Paid","fulfillmentStatus":"Fulfilled",
  "isDeposit":false,"loyaltyPointsEarned":43 }
```
Hành vi: `CheckoutOrchestrator` với `channel=Pos` (giá từ CSDL, khuyến mãi tính lại, VAT theo dòng,
trừ tồn), **không phí ship**, rồi `OrderLifecycleService.RecordTenderAsync` cho từng dòng tender
(ghi `OrderPayments`, đổi `PaymentStatus`, phát `OrderPaid`/`OrderDelivered` ⇒ `InvoiceRequested`),
rồi chuyển `Fulfilled`. Trạng thái cuối: `PaymentStatus=Paid`, `FulfillmentStatus=Fulfilled`
(và `Status=Completed` vì cả hai điều kiện đã đủ).

| Mã | Khi nào |
|---|---|
| 409 `CONFLICT` | `storeId` không phải kho/cửa hàng có thật |
| 403 `FORBIDDEN` | thu thiếu (đặt cọc) mà thiếu `Sales.TakeDeposit` |
| 400 `DOMAIN_RULE` | tender rỗng / sai hình thức / thu dư tổng đơn / thẻ-chuyển khoản thiếu mã đối soát / giảm giá tay bị từ chối |

**Tender**: `Cash`, `Card`, `Transfer` (= VietQR), `SePay`. Chỉ `Cash` có tiền thối
(`tenderedAmount > amount`); các hình thức khác đưa dư là lỗi nhập liệu. Thu **thiếu** tổng đơn ⇒
đặt cọc (D10 quy tắc 9): `PartiallyPaid`, **không xuất hoá đơn**, **không xuất kho**.

**Trần giảm giá tay** (IR w2#10): `Pos:ManualDiscountPercentCap` (mặc định 10% tạm tính) — vượt thì
bị CẮT kèm `warnings`; trên `Pos:SelfApproveLimit` (mặc định 200.000đ) phải có `approvedBy` **khác**
thu ngân. Mọi lần giảm tay ghi một dòng `OrderHistories`.

### `GET /pos/customers?q=&limit=` — tìm khách
Qua `IUserDirectory` (không phải `/auth/users`). 200 → `{ total, items:[{id, fullName, phone, email}] }`.
`q` dưới 2 ký tự ⇒ danh sách rỗng.

### `POST /pos/customers` — tạo nhanh khách
`{ fullName, phone, email }` → `{ id, fullName, phone, email, alreadyExisted }`.
400 khi thiếu `fullName` hoặc thiếu `email` (bản cài đặt hiện tại của `IUserDirectory` cần email —
khách chỉ có số điện thoại thì bán khách vãng lai, bỏ trống `customerId`).

### Đơn giữ ở quầy
| Method | Path | Ghi chú |
|---|---|---|
| POST | `/pos/held-orders` | `{label, storeId, lines[], estimatedTotal, shiftId?, customerId?, customerName?, customerPhone?, notes?}` → 201 |
| GET | `/pos/held-orders?storeId=&shiftId=` | chỉ đơn CHƯA gọi ra, tối đa 100 |
| GET | `/pos/held-orders/{id}` | `{header, lines[]}` — giá **tính lại** khi chốt |
| DELETE | `/pos/held-orders/{id}` | 409 nếu đã gọi ra thành đơn thật |

Đơn giữ **không** tạo đơn thật và **không** giữ tồn kho.

---

## 2. Đổi trả (D08 + D01)

### Khách
| Method | Path | Quyền |
|---|---|---|
| POST | `/returns` | đã đăng nhập |
| GET | `/returns` | đã đăng nhập (chỉ đơn của mình) |
| GET | `/returns/{id}` | đã đăng nhập; 403 nếu không phải chủ đơn |

`POST /returns`: `{orderId, orderItemId, reason, description?, reasonCode?, type?, attachmentUrls?, exchangeProductId?, exchangeVariantId?}`

`reasonCode` ∈ `DefectiveTechnical | WrongItem | ShippingDamage | NotAsDescribed | InfoDefect | ChangeOfMind`
(bỏ trống = `ChangeOfMind`). `type` ∈ `Refund | Exchange | Replace`.

Quy tắc (D08, thi hành trong `ReturnReasonRules`):
- **Chỉ `ChangeOfMind` mới có phí khấu trừ.** Intact 0%, UsedGood `RestockingFeePercent`,
  MissingAccessories `+MissingAccessoriesFeePercent`, UserDamage 100% (từ chối hoàn).
  Mọi mã lý do khác: **phí 0% cứng trong code, không đọc policy**.
- `WrongItem` / `NotAsDescribed`: **không có hạn** do shop đặt (`DaysForStatutoryReturn = 0` ⇒ chạy
  đến hết bảo hành sản phẩm).
- `InfoDefect`: bỏ qua mọi cửa sổ, phí 0%, cần quản lý duyệt.
- `DefectiveTechnical`: phí 0%, chuyển sang luồng bảo hành.
- Mốc tính hạn là **`DeliveredAt`**, không phải `OrderDate`. Đơn chưa giao ⇒ 409.
- Chính sách hiệu lực **leo ngược cây danh mục** lá → cha → … → gốc → DEFAULT (10 tầng, chống vòng).
  `Product.IsReturnExcluded` chặn nhóm tự nguyện, **không** chặn nhóm luật định.

Chống hoàn tiền hai lần: 409 nếu dòng đơn đã có yêu cầu `Completed`/`Refunded`, 409 nếu đang có
yêu cầu `Pending`/`Approved`.

Tiền hoàn (D01): từ `OrderItems.LineTotal` (payable đã đóng băng) và `OrderItems.VatAmount` ở thuế
suất hoá đơn gốc — không tính lại theo giá hôm nay.

### Quản trị — `/admin/returns/**`, quyền `Sales.ManageReturns`
| Method | Path |
|---|---|
| GET | `/admin/returns?page=&pageSize=&status=` |
| GET | `/admin/returns/{id}` |
| POST | `/admin/returns/{id}/approve` |
| POST | `/admin/returns/{id}/reject` `{reason}` |
| POST | `/admin/returns/{id}/inspect` `{condition, warehouseId, notes?}` |
| POST | `/admin/returns/{id}/complete` (alias cũ: `/refund`) |

`complete` yêu cầu đã `inspect` (chống gian lận), nhập lại kho qua `RestockService`, tính tiền hoàn
theo trên, phát `ReturnCompleted` và **đảo điểm thưởng** của đơn.

### Chính sách — `/api/sales/return-policies`
| Method | Path | Quyền |
|---|---|---|
| GET/POST/PUT/DELETE | `/` , `/{id}` | `Sales.ManageReturns` |
| GET | `/effective?productId=` hoặc `?categoryId=` | công khai |
| GET | `/public-matrix` | công khai |

`/effective` trả thêm `allowOpenedBoxReturn`, `missingAccessoriesFeePercent`,
`daysForStatutoryReturn`, `isReturnExcluded`, `warrantyMonths` và `reasons[]` (ma trận lý do ×
hạn × phí). `/public-matrix` trả toàn bộ chính sách + ma trận lý do của dòng mặc định.

---

## 3. Điểm thưởng
| Method | Path | Quyền |
|---|---|---|
| GET | `/loyalty` | đã đăng nhập (tự tạo tài khoản nếu chưa có) |
| GET | `/loyalty/transactions?page=&pageSize=&type=` | đã đăng nhập |
| POST | `/loyalty/redeem` `{points, orderId?, description?}` | đã đăng nhập |
| GET | `/loyalty/calculate/{orderAmount}` | đã đăng nhập |
| GET | `/admin/loyalty?page=&pageSize=&tier=` | `Sales.ViewAll` (theo verb) |
| GET | `/admin/loyalty/stats` | `Sales.ViewAll` (theo verb) |
| POST | `/admin/loyalty/{userId}/adjust` `{points, reason}` | `Sales.ManageAll` |

- **Tích điểm**: khi đơn hoàn tất (POS thu đủ, hoặc `/admin/orders/{id}/complete`).
  `points = floor(total × Loyalty:EarnPercent% ÷ 100đ × hệ số hạng)`, mặc định 1%.
  Idempotent theo đơn (khoá `LoyaltyTransactions.OrderId` + `Type=Earn`).
- **Đảo điểm**: khi huỷ đơn hoặc hoàn tất trả hàng. Ghi `LoyaltyTransactions.ReversalOf` trỏ về bút
  toán gốc ⇒ gọi lại là no-op. Không bao giờ để số dư âm (chỉ thu hồi phần khách còn).
- **`adjust`**: 400 nếu `points = 0` hoặc thiếu `reason`; **409 nếu trừ quá số dư**.

---

## 4. Quản trị đơn — `/admin/orders/**`
| Method | Path | Quyền |
|---|---|---|
| GET | `/admin/orders?page=&pageSize=&search=&status=&paymentStatus=&channel=&from=&to=` | `Sales.ViewAll` |
| GET | `/admin/orders/{id}` | `Sales.ViewAll` |
| POST | `/admin/orders/{id}/{confirm\|fulfill\|deliver\|complete}` | theo verb (`Sales.ManageAll`) |
| POST | `/admin/orders/{id}/ship` `{trackingNumber, carrier}` | theo verb |
| POST | `/admin/orders/{id}/cancel` `{reason}` | `Sales.CancelOrder` |
| PUT | `/admin/orders/{id}/status` `{status}` | theo verb |
| POST | `/admin/orders/{id}/notes` `{note}` | theo verb |
| PUT | `/admin/orders/{id}/attributes` `{attributes}` | theo verb |

Danh sách trả `{Total, Page, PageSize, Orders:[{…, customerName, customerPhone, collected, amountDue}]}`
— tên/điện thoại khách lấy qua `IUserDirectory` trong **một** lượt gọi cho cả trang.

Chi tiết trả `{id, orderNumber, status, paymentStatus, fulfillmentStatus, channel, customer{},
money{subtotal,discount,shipping,tax,total,collected,amountDue}, shipping{}, pos{}, dates{},
items[], payments[], history[], allowedTransitions[]}`.

Mọi bước vòng đời đi qua `OrderLifecycleService` ⇒ **409** khi nhảy sai trạng thái (không còn 400),
có ghi `OrderHistories`, và **có phát sự kiện tích hợp** (⇒ hoá đơn).
`PUT /status` với `Paid` trả **409**: tiền chỉ vào đơn qua phiếu thu
`POST /admin/orders/{id}/payments` (W2-23, `docs/api-contracts/sales-orders.md`).
Huỷ đơn: bắt buộc `reason`, nhập lại tồn, mở `RefundRequested` nếu đã thu tiền, và **đảo điểm**.

---

## 5. Thống kê — quyền `Sales.ViewAll` (tường minh, IR w0#56)
| Method | Path |
|---|---|
| GET | `/admin/stats` |
| GET | `/admin/stats/revenue-chart?year=` |
| GET | `/admin/stats/by-channel?from=&to=` |

Doanh thu đi qua `Sales.Domain.RecognizedRevenue.Predicate`
(đã thu tiền **hoặc** đơn `Completed`; loại đơn huỷ và đơn đã hoàn tiền) — cùng vị từ với Reporting
và kế toán.

Tăng trưởng **không bịa 100%**:
```jsonc
"revenueGrowth": { "percent": null, "noBaseline": true, "current": 12000000, "previous": 0 }
```
`percent` chỉ khác null khi kỳ gốc > 0.
`/admin/stats` còn trả `netRevenue` = doanh thu ghi nhận − tiền đã hoàn, và `refundedAmount`.
