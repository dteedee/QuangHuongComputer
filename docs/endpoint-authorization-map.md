# Hợp đồng phân quyền endpoint (W1-10)

> Nguồn sự thật cho MỌI track sau. Thêm/sửa endpoint thì đọc file này trước.
> Danh mục quyền + ma trận role: `docs/permission-matrix.md` (W1-1). Cập nhật lần cuối 2026-09-18.

## 1. Ba luật bất di bất dịch

1. **Không endpoint nào được kiểm tra TÊN ROLE.** `RequireRole(...)`, `policy.RequireRole(...)`,
   `user.IsInRole("Sale")` trong handler đều bị cấm. Role chỉ là gói quyền
   (`BuildingBlocks/Security/Roles.cs`); quyền mới là thứ endpoint kiểm tra.
   Ngoại lệ duy nhất: `Roles.Admin` được `PermissionAuthorizationHandler` bypass, và policy
   `SecurityPolicies.Staff` (đã đăng nhập + là nhân viên nội bộ).
2. **Mọi endpoint phải có policy CÓ TÊN, hoặc nằm trong `PublicEndpointAllowList`.**
   `RequireAuthorization()` trống và `RequireAuthorization(p => p.RequireClaim(...))` đều KHÔNG đạt:
   chúng tạo `AuthorizeAttribute` với `Policy` rỗng nên `EndpointAuthorizationConvention` tính là vi phạm.
3. **Deny by default.** Không rõ endpoint thuộc về ai thì cấp quyền CHẶT hơn và ghi vào báo cáo bàn giao,
   không bao giờ để rơi vào allow-list công khai.

## 2. Cách gắn quyền (chọn đúng 1 trong 4)

| Tình huống | Cách viết |
|---|---|
| Cả nhóm CRUD một module | `group.RequireModulePermissions(PermissionModules.X)` — GET→View, POST→Create, PUT/PATCH→Edit, DELETE→Delete |
| Cả nhóm dùng CHUNG một quyền (duyệt, xuất file, báo cáo) | `group.RequirePermission(Permissions.X.Y)` |
| Một endpoint đặc biệt trong nhóm | `.RequireAuthorization(Permissions.X.Y)` — khai báo tường minh LUÔN thắng convention của nhóm |
| Dữ liệu "của chính tôi" (giỏ hàng, đơn của tôi, bảo hành của tôi) | `.RequireAuthorization(SecurityPolicies.Authenticated)` + handler PHẢI lọc theo `ClaimsPrincipal` |
| Màn hình nội bộ chưa quy được về module | `.RequireAuthorization(SecurityPolicies.Staff)` |
| Công khai thật sự | `.AllowAnonymous()` **và** một rule trong `PublicEndpointAllowList` (gửi integration request, không tự sửa file đó) |

### Cái bẫy đã đo được (2026-09-18) — nhóm cha có policy sẽ nuốt nhóm con

`RequireModulePermissions` chạy ở giai đoạn `Finally` và **bỏ qua** endpoint đã có policy tường minh.
Policy của nhóm CHA (`RequireAuthorization(...)`, một convention thường) được gắn TRƯỚC, nên:

```csharp
var group = app.MapGroup("/api/sales").RequireAuthorization(SecurityPolicies.Authenticated);
var admin = group.MapGroup("/admin").RequireModulePermissions(PermissionModules.Sales); // ❌ KHÔNG có tác dụng
```
`/api/sales/admin/**` khi đó chỉ còn yêu cầu "đã đăng nhập" — tức khách hàng đọc được toàn bộ đơn hàng.
Cách đúng: tạo nhóm con từ `app` với đường dẫn đầy đủ (route sinh ra y hệt):

```csharp
var admin = app.MapGroup("/api/sales/admin").RequireModulePermissions(PermissionModules.Sales); // ✅
```
Đang áp dụng ở: `SalesEndpoints.cs:691`, `Repair/{Booking,Repair}Endpoints.cs`, `Warranty/WarrantyEndpoints.cs`.
Nhóm lồng nhau mà nhóm cha KHÔNG mang policy (ví dụ `/api/inventory` → `/warehouses`) vẫn an toàn, nhưng
W1-10 đã cho mỗi nhóm lồng một policy riêng để không phụ thuộc thứ tự convention của framework.

## 3. Bản đồ nhóm → policy (trạng thái sau W1-10)

| Nhóm route | Policy | Ghi chú |
|---|---|---|
| `/api/sales` | `SecurityPolicies.Authenticated` | giỏ hàng / đơn của tôi / wishlist / điểm thưởng |
| `/api/sales/admin` | `PermissionModules.Sales` | GET `Sales.ViewAll` → Marketing hết 403 ở widget thống kê |
| `/api/sales/admin/returns/*` (ghi) | `Permissions.Sales.ManageReturns` | Sale KHÔNG duyệt đổi/trả |
| `/api/sales/staff-checkout` | `Permissions.Sales.Pos` | |
| `/api/sales/return-policies` | `Permissions.Sales.ManageReturns` | `/effective` là GET công khai |
| `/api/sales/addresses`, `/api/sales/checkout/session*`, `/api/installment` | `SecurityPolicies.Authenticated` | tự phục vụ |
| `/api/admin/installment` | `Permissions.Sales.ManageInstallments` | quyết định tín dụng |
| `/api/shipping/create-shipment/*` | `Permissions.Sales.UpdateStatus` | |
| `/api/payments` | `SecurityPolicies.Authenticated` | handler kiểm tra chủ đơn |
| `/api/payments/cod/confirm/*` | `Permissions.Payments.CollectCod` | |
| `/api/payments/admin` | `Permissions.System.ManageConfig` | giữ nguyên từ trước W1-10 |
| `/api/inventory`, `/dn`, `/grn`, `/count`, `/warehouses`, `/serials`, `/transfers`, landed-costs, barcode | `PermissionModules.Inventory` | |
| `/api/inventory/suppliers`, `/api/inventory/suppliers` (scorecard) | `PermissionModules.Suppliers` | |
| `/api/inventory/{po,purchase-requisitions,purchase-returns,rfq}` | `PermissionModules.PurchaseOrders` | |
| `/api/inventory/po/{id}/{approve,reject}` | `Permissions.Inventory.ApprovePurchaseOrder` | InventoryStaff lập nhưng không duyệt |
| `/api/inventory/po-approval-rules` | `Permissions.System.ManageConfig` | |
| `/api/catalog` (ghi) | `Permissions.Catalog.{Create,Edit,Delete}` theo verb | GET là storefront công khai |
| `/api/catalog/reviews/admin` | `Permissions.Catalog.Manage` | |
| `/api/content/admin` | `Permissions.Content.ManagePages` | KHÔNG dùng verb-mapping: `Content.ViewPages` khách hàng cũng có |
| `/api/content/admin/redirects` | GET (list, `{id}`, `test`, `export`, `template`) `Content.ViewRedirects`; POST/PUT/DELETE, `{id}/active`, `import` `Content.ManageRedirects` | nhóm RIÊNG map từ `app` (không lồng dưới `/api/content/admin` — nhóm cha `ManagePages` sẽ AND vào). Admin/Manager/Marketing (seed v3) |
| `/api/promotions/admin` | `Permissions.Content.ManageCoupons` | |
| `/api/crm` (7 nhóm cùng tiền tố) | dashboard `CRM.ViewCustomers`; customers `PermissionModules.Crm`; segments View/ManageSegments; leads + pipeline View/ManageLeads; campaigns `PermissionModules.Campaigns`; tasks `CRM.ManageTasks` | Marketing quản chiến dịch mà không đụng khách hàng |
| `/api/crm/campaigns/{id}/send` | `Permissions.CRM.SendCampaigns` | gửi thật ra ngoài |
| `/api/communication/newsletter/admin` | `Permissions.CRM.ManageCampaigns` | |
| `/api/communication/send-email` | `Permissions.CRM.SendCampaigns` | |
| `/api/chat`, `/api/notifications` | `SecurityPolicies.Authenticated` | `/api/chat/conversations/unassigned` = `CRM.ViewCustomers` |
| `ChatHub`, `NotificationHub` | `[Authorize(SecurityPolicies.Authenticated)]` | nhân viên CSKH trong hub = quyền `CRM.ViewCustomers` |
| `/api/hr`, `/leaves`, `/contracts`, `/approvals`, dependents, assets | `PermissionModules.HR` | |
| `/api/hr/attendance` (quản trị), `/shifts`, `/shift-assignments` | `PermissionModules.Attendance` | |
| `/api/hr/payroll`, salary-structures, allowances, pit-finalization | `PermissionModules.Payroll` | Accountant có `HR.ManagePayroll` (D06) |
| `/api/hr/{attendance,timesheet-monthly,overtime,self-service}` (nhánh tự phục vụ) | `SecurityPolicies.Staff` | trước W1-10 là `RequireAuthorization()` trống ⇒ Customer vào được |
| `/api/accounting`, `/einvoice`, `/tax-reports`, `/tax` | `PermissionModules.Accounting` | |
| `/api/warranty` | `SecurityPolicies.Authenticated` | bảo hành của tôi |
| `/api/warranty/admin`, `/rma`, `/loaner-devices` | `PermissionModules.Warranty` | |
| `/api/repair` | `SecurityPolicies.Authenticated` | đơn sửa chữa của tôi |
| `/api/repair/admin`, `/api/repair/tech` | `PermissionModules.Repair` | |
| `/api/reports/*` | 1 nhóm/1 mảng: sales+analytics+comparison `Reporting.ViewSales`; financial+tax `Reporting.ViewFinancial`; inventory `Reporting.ViewInventory`; repair+warranty `Reporting.ViewRepair`; hr `Reporting.ViewHR`; excel+customization `Reporting.ExportReports`; crm `CRM.ViewAnalytics`; system-health `System.ViewConfig` | Accountant/HR/InventoryStaff đọc được báo cáo của mình |
| `/api/config/*`, `/api/admin/stores`, `/admin/backoffice-menu` | `PermissionModules.SystemConfig` | GET `System.ViewConfig` (Admin+Manager), ghi `System.ManageConfig` (Admin) |
| `/api/config/backoffice-menu` | `SecurityPolicies.Staff` | menu của chính người đăng nhập |

## 4. Endpoint tự phục vụ — BẮT BUỘC có kiểm tra quyền sở hữu trong handler

`SecurityPolicies.Authenticated` chỉ nói "đã đăng nhập". Chủ sở hữu dữ liệu phải do handler kiểm tra.
Đã rà 2026-09-18; **một endpoint THIẾU kiểm tra, bàn giao cho W2 (Sales)**:

- `GET /api/shipping/tracking/{orderId}` (`Sales/Infrastructure/Shipping/ShippingEndpoints.cs:81`) —
  trả `ShippingAddress` của BẤT KỲ đơn nào cho bất kỳ tài khoản đăng nhập nào. Cần thêm `o.UserId == userId`
  (hoặc quyền `Sales.ViewAll`). W1-10 không sửa vì phạm vi của track là dòng phân quyền, không phải handler.

Các nhánh tự phục vụ khác đã lọc theo danh tính: `/api/sales/*` (cart/orders/wishlist/loyalty),
`/api/sales/addresses`, `/api/payments/{id}` + `/initiate`, `/api/warranty/claims`, `/api/repair/*`,
`/api/hr/self-service`, `/api/chat/conversations`, `/api/notifications`,
`/api/catalog/pc-builder/builds/my`.

## 5. Endpoint công khai

Công khai = `.AllowAnonymous()` **và** một rule trong `BuildingBlocks/Security/PublicEndpointAllowList.cs`.
File allow-list thuộc sở hữu W1-1: muốn thêm thì gửi integration request kèm lý do.
W1-10 đã đánh dấu `AllowAnonymous` và xin bổ sung rule cho 14 endpoint storefront —
danh sách đầy đủ ở `plans/260917-2100-full-system-overhaul/reports/integration-requests-w1.md` (mục W1-10).

`GET /api/config/public` nay chạy theo **danh sách trắng khoá**
(`Services/SystemConfig/SystemConfigPublicEndpointsKeys.cs`), không còn danh sách đen category.
Thêm khoá cấu hình mới sẽ KHÔNG tự động lộ ra Internet nữa; muốn công khai thì thêm tên khoá vào file đó.

## 6. Kiểm chứng

- `grep -rn "RequireRole(" backend/Services --include='*.cs' | grep -v Identity` → chỉ còn 3 file ngoài
  quyền sở hữu W1-10 (xem báo cáo w1-10).
- Unit test: `scripts/qh-build.sh be-test "FullyQualifiedName~UnitTests.Security"` (67 test).
- Runtime: `plans/260917-2100-full-system-overhaul/reports/probes/W1-10-role-permission-matrix.sh`
  (9 tài khoản seed × đọc/ghi mỗi module + ranh giới role + endpoint công khai).
- Lúc khởi động, `EndpointAuthorizationAuditor` ghi log `[authz-audit]` mọi endpoint chưa đạt chuẩn.
  Bật `Security:EndpointAuthorizationAudit:FailOnViolation=true` để fail-closed (việc của cổng W1-G).
