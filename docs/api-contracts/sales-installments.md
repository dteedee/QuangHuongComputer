# API contract — Trả góp (Installments, lead-mode)

**Owner:** W2-20 (`backend/Services/Sales/Domain/InstallmentApplication.cs`,
`Endpoints/Installments/**`, `Application/Installments/**`).
**Status:** written 2026-09-18. Không tích hợp API công ty tài chính (CTTC) — D04 mục 5 / D10 quy
tắc 6: khách nộp "hồ sơ lead", nhân viên hoàn tất giấy tờ trên cổng của CTTC, rồi ghi số hợp đồng
vào hệ thống này. Không thu CCCD/sao kê qua web.

Error bodies theo platform contract chung (`docs/api-conventions.md`). Branch theo `code`
(`VALIDATION_FAILED` | `DOMAIN_RULE` | `NOT_FOUND` | `CONFLICT`), không theo câu tiếng Việt.

## 0. Trạng thái hồ sơ

`PendingApproval → Approved → Active → Completed`, hoặc `PendingApproval → Rejected`,
hoặc `PendingApproval → Expired` (hết hạn giữ hàng). Chỉ `PendingApproval` mới Approve/Reject/Expire
được; `Approved` không tự Expire nữa (đơn đã Paid).

`GET /api/payments/methods` chỉ trả `installment` (với `direct:false`) khi
`Sales:Installment:Partners` không rỗng (W2-4 sở hữu endpoint đó — xem `docs/api-contracts/payments.md`).

## 1. Khách hàng — `/api/installment` (yêu cầu đăng nhập)

### `GET /partners`
Danh sách đối tác đang bật + kỳ hạn cho form. Storefront dùng để tự ẩn khối trả góp nếu rỗng.
```json
{ "partners": ["HomeCredit","FeCredit"], "termMonthsOptions": [6,9,12], "leadHoldHours": 72,
  "note": "Số tiền/tháng chỉ mang tính ước tính - công ty tài chính quyết định số thật khi duyệt hồ sơ." }
```

### `POST /apply`
Request: `{ orderId, provider, termMonths (6|9|12), downPayment, consentGiven }`.
`consentGiven=true` bắt buộc — ô đồng ý "cho phép cửa hàng chuyển thông tin cho công ty tài chính đã
chọn" (Luật 91/2025 Đ13), lưu mốc thời gian ở `ConsentAt`. **Không có trường tài liệu/CCCD/sao kê
nào** — form cũ upload 2 mặt CCCD đã bị xoá khỏi luồng.

Lỗi: `provider` không nằm trong danh sách đối tác đang bật (kể cả danh sách rỗng) ⇒
`400 DOMAIN_RULE`; khách đã có hồ sơ `PendingApproval` khác (bất kỳ đơn nào) ⇒ `409 CONFLICT` (D10
quy tắc 6: một khách, tối đa MỘT hồ sơ mở); đơn không thuộc về khách ⇒ `404`.

Response 200: `{ id, status, provider, termMonths, downPayment, monthlyAmount, totalAmount,
expiresAt, consentAt, note }`. `monthlyAmount` chia đều không lãi — luôn kèm `note` "ước tính".

### `GET /mine`
Toàn bộ hồ sơ của khách (mọi đơn), mới nhất trước.

## 2. Nhân viên — `/api/admin/installment` (`Sales.ManageInstallments`)

### `GET /pending`
Danh sách hồ sơ `PendingApproval`, cũ nhất trước (FIFO xử lý).

### `POST /{id:guid}/approve`
Request: `{ financeContractNumber }` (bắt buộc, không rỗng — số hợp đồng CTTC cấp khi khách hoàn tất
giấy tờ ở cổng của họ). Hồ sơ chuyển `Approved`, rồi **ngay trong cùng lượt gọi** hệ thống ghi nhận
thu tiền cho đơn qua `OrderLifecycleService.RecordTenderAsync` với
`method=PaymentTenderMethod.Installment`, `reference=financeContractNumber` — đơn thành `Paid`,
biên lai/ca/sổ cái thấy tender này như mọi hình thức thu khác. Không phải `PendingApproval` ⇒ `409`.

### `POST /{id:guid}/reject`
Request: `{ reason }` (bắt buộc). Hồ sơ chuyển `Rejected`; đơn bị huỷ qua
`OrderLifecycleService.CancelAsync` (nhả tồn, mở yêu cầu hoàn tiền nếu đã thu — ở đây luôn 0đ vì
lead-mode không thu tiền trước khi duyệt). Khách nhận email huỷ đơn qua consumer có sẵn của
Communication module (không code thêm ở track này).

### `POST /expire-sweep`
Quét thủ công mọi hồ sơ `PendingApproval` đã quá `ExpiresAt`: Expire hồ sơ + huỷ đơn (nhả tồn) +
email huỷ đơn (cùng đường Cancel ở trên). **Đây KHÔNG phải job tự động** — job hết-hạn-đơn chung của
W2-10 chưa tồn tại ở thời điểm track này chạy; xem "Tích hợp còn thiếu" bên dưới. Response:
`{ expiredCount }`.

## 3. Cấu hình (SystemConfig, đọc qua `IAppSettings`)

| key | mặc định | ý nghĩa |
|---|---|---|
| `Sales:Installment:Partners` | *(rỗng)* | danh sách đối tác phân tách bởi dấu phẩy, ví dụ `HomeCredit,FeCredit`. Rỗng = tắt hẳn (từ chối `/apply`, `/payments/methods` không có `installment`). |
| `Installment:LeadHoldHours` | `72` | số giờ giữ đơn `Pending/Unpaid` chờ hoàn tất hồ sơ trước khi hệ thống tự huỷ. |

## 4. Tích hợp còn thiếu (để gate/track sau áp)

1. Quét tự động hồ sơ quá hạn (`InstallmentExpiryService.ExpireOverdueBatchAsync`, đã viết sẵn,
   không cần đăng ký DI) cần được một `BackgroundService` gọi định kỳ — ứng viên tự nhiên là job
   hết-hạn-đơn chung của W2-10 (đơn `Credit` còn hạn `PaymentDueDate` dùng cùng cơ chế). Cho tới khi
   đó, `POST /admin/installment/expire-sweep` là đường vận hành thay thế.
2. Cột `InstallmentApplications.DocumentUrls` vẫn còn trong schema (property C# giữ `[Obsolete]`,
   không còn ai ghi) — cần một migration DROP COLUMN (thuộc quyền sở hữu migration của W2-3).

## 5. Bảo mật

Không CCCD, không số căn cước, không sao kê ngân hàng nào được lưu. `ConsentAt` bắt buộc khi tạo hồ
sơ. `/apply`, `/mine` chỉ cần đăng nhập, luôn lọc theo `CustomerId` của chính người gọi (không nhận
`customerId` từ client). `/admin/*` sau `Sales.ManageInstallments` (Admin + Manager theo ma trận
W1-1; Sale không có quyền này).
