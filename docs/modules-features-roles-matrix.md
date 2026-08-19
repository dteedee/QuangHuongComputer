# Modules, Features & Roles Matrix

Nguồn sự thật permission catalog: `backend/BuildingBlocks/Security/Permissions.cs`
(`Permissions.*` const strings + `Roles` static class). `Services/Identity/Permissions/SystemPermissions.cs`
(bản trùng lặp) đã bị xoá — mọi call-site trong `IdentityEndpoints.cs` dùng canonical `Permissions`.

## §1. Danh sách module

| # | Module | Mục đích 1 dòng | Đường dẫn code |
|---|---|---|---|
| 1 | Identity | Đăng nhập/đăng ký, JWT, refresh token, 2FA, role/permission management | `backend/Services/Identity/` |
| 2 | Catalog | Sản phẩm, biến thể, media, spec, bundle, PC builder, sitemap | `backend/Services/Catalog/` |
| 3 | Sales | Giỏ hàng, checkout, đơn hàng, trả góp, sổ địa chỉ, chính sách đổi trả | `backend/Services/Sales/` |
| 4 | Inventory | Kho: tồn kho, PO, GRN, delivery note, kiểm kê, landed cost, RFQ, barcode | `backend/Services/Inventory/` |
| 5 | Accounting | Hoá đơn, công nợ, báo cáo thuế, hoá đơn điện tử | `backend/Services/Accounting/` |
| 6 | Repair | Đặt lịch, báo giá, kỹ thuật viên, quy trình sửa chữa | `backend/Services/Repair/` |
| 7 | Warranty | Bảo hành, RMA, máy mượn, tra cứu bảo hành công khai | `backend/Services/Warranty/` |
| 8 | HR | Nhân sự, chấm công, hợp đồng, tài sản, self-service, phê duyệt | `backend/Services/HR/` |
| 9 | CRM | Khách hàng, lead, segment, campaign, task | `backend/Services/CRM/` |
| 10 | Content | Trang tĩnh, bài viết, coupon, banner, media, khuyến mãi | `backend/Services/Content/` |
| 11 | Reporting | Báo cáo tổng hợp đa module | `backend/Services/Reporting/` |
| 12 | SystemConfig | Cấu hình động, backup, custom field, form, store, backoffice menu | `backend/Services/SystemConfig/` |
| 13 | Payments | Cổng thanh toán, webhook xác nhận | `backend/Services/Payments/` |
| 14 | Communication | Email/SMS/thông báo | `backend/Services/Communication/` |
| 15 | Ai | Tìm kiếm ngữ nghĩa, gợi ý, chatbot | `backend/Services/Ai/` |

## §2. Feature theo module

- **Identity**: register/login/refresh-token, quản lý user, quản lý role & permission claim, audit log, 2FA, session.
- **Catalog**: CRUD sản phẩm/biến thể, PC Builder (thủ công + AI), bundle, media, spec, sitemap SEO.
- **Sales**: cart, checkout, order lifecycle, cancel, return, trả góp, sổ địa chỉ giao hàng.
- **Inventory**: stock view/adjust, purchase order (tạo/duyệt/nhận hàng), GRN, delivery note, kiểm kê định kỳ, landed cost phân bổ chi phí nhập khẩu, RFQ, supplier scorecard, barcode.
- **Accounting**: hoá đơn (tạo/sửa/xoá/duyệt công nợ), báo cáo tài chính, quản lý công nợ, e-invoice, tax reporting.
- **Repair**: đặt lịch sửa chữa, báo giá, phân công kỹ thuật viên, cập nhật trạng thái, hoàn tất.
- **Warranty**: nộp yêu cầu bảo hành, duyệt claim, RMA, thiết bị cho mượn, tra cứu công khai theo serial.
- **HR**: hồ sơ nhân viên, chấm công đa phương thức, OT, hợp đồng, người phụ thuộc, tài sản cấp phát, tự phục vụ (nghỉ phép/xin xác nhận), payroll + quyết toán TNCN, phê duyệt.
- **CRM**: khách hàng, lead, segment, campaign, task nhắc việc, analytics.
- **Content**: trang tĩnh, bài viết blog, coupon, banner, quản lý media, khuyến mãi.
- **Reporting**: báo cáo sales/inventory/financial/repair, xuất báo cáo.
- **SystemConfig**: cấu hình key-value theo category, custom field, form builder, store location, backup, menu backoffice theo role.
- **Payments**: khởi tạo giao dịch, webhook xác nhận thanh toán (VNPay/Momo...).
- **Communication**: gửi email/SMS/thông báo hệ thống.
- **Ai**: semantic search, recommendation, chatbot hỗ trợ mua hàng.

## §3. Ma trận Role × Module (R = chỉ xem, RW = xem+thao tác, — = không truy cập)

| Role | Identity | Catalog | Sales | Inventory | Accounting | Repair | Warranty | HR | CRM | Content | Reporting | SystemConfig |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin | RW | RW | RW | RW | RW | RW | RW | RW | RW | RW | RW | RW |
| Manager | R (user/role) | RW | RW | RW | RW (trừ xoá) | RW | RW | RW | — | RW | R | R |
| Sale | — | R | RW (own+all view) | R (stock) | — | RW (book/view) | RW (submit/view) | — | — | R | R (sales) | — |
| TechnicianInShop | — | R | — | R (stock/reservations) | — | RW | RW (review) | — | — | — | R (repair) | — |
| TechnicianOnSite | — | R | — | R (stock) | — | RW (own) | R (own/review) | — | — | — | — | — |
| Accountant | — | — | R | R (stock/PO/supplier) | RW | — | — | R + RW payroll | — | — | R | — |
| Marketing | — | R | R | — | — | — | — | — | R | RW | R (sales) | — |
| Customer | — | R | R (own) | — | — | RW (own) | RW (own) | — | — | R | — | — |
| Supplier | — | R | — | R (PO) | — | — | — | — | — | — | — | — |
| InventoryStaff | — | R | — | RW | — | — | — | — | — | — | R (inventory) | — |
| HR | — | — | — | — | — | — | — | RW | — | — | — | — |

## §4. Role → danh sách permission (nguồn: `RolePermissionSeeder.cs`)

- **Admin**: `Permissions.GetAllPermissions()` — toàn bộ.
- **Manager**: Catalog.*, Sales.ViewAll/ManageAll/UpdateStatus/CancelOrder/ViewReturns/ManageReturns, Repair.* (trừ Book), Inventory.* (trừ Delete? có DeleteSupplier), Accounting.ViewInvoices/CreateInvoice/EditInvoice/ViewReports/ManageDebt, Warranty.ViewAll/ReviewClaim/ApproveClaim, Content.*, Users.View/Create/Edit/ManageRoles, Reporting.*, HR.ViewEmployees/ManageEmployees/ViewAttendance/ManageAttendance/ViewPayroll/ManagePayroll, System.ViewConfig.
- **Sale**: Catalog.View, Sales.ViewAll/Checkout/UpdateStatus/ViewReturns, Inventory.ViewStock, Repair.Book/ViewAll, Warranty.SubmitClaim/ViewAll, Content.ViewPages/ViewPosts/ViewCoupons, Reporting.ViewSales.
- **TechnicianInShop**: Catalog.View, Repair.ViewOwn/ViewAll/UpdateStatus/CreateQuote/Complete, Inventory.ViewStock/ViewReservations, Warranty.ViewAll/ReviewClaim, Reporting.ViewRepair.
- **TechnicianOnSite**: Catalog.View, Repair.ViewOwn/UpdateStatus/CreateQuote/Complete, Inventory.ViewStock, Warranty.ViewOwn/ReviewClaim.
- **Accountant**: Sales.ViewAll, Accounting.* (đủ 6 quyền), Inventory.ViewStock/ViewPurchaseOrder/ViewSupplier, Reporting.ViewSales/ViewInventory/ViewFinancial/ExportReports, HR.ViewEmployees/ViewPayroll/ManagePayroll.
- **Marketing**: Catalog.View, Content.* (9 quyền), Sales.ViewAll, Reporting.ViewSales.
- **Customer**: Catalog.View, Sales.ViewOwn/Checkout, Repair.Book/ViewOwn, Warranty.SubmitClaim/ViewOwn, Content.ViewPages/ViewPosts.
- **Supplier**: Inventory.ViewPurchaseOrder, Catalog.View.
- **InventoryStaff** *(mới, phase 02)*: Catalog.View, Inventory.ViewStock/ManageStock/AdjustStock/ViewPurchaseOrder/ReceivePurchaseOrder/ViewReservations/ViewSupplier, Reporting.ViewInventory.
  Không có: ApprovePurchaseOrder, CreateSupplier/UpdateSupplier/DeleteSupplier (thuộc Manager — duyệt tài chính).
- **HR** *(mới, phase 02)*: HR.ViewEmployees/ManageEmployees/ViewAttendance/ManageAttendance/ViewPayroll/ManagePayroll.
  Không chạm Accounting/Sales theo nguyên tắc least privilege.

## §5. Quy ước đặt tên permission

- Format: `Permissions.{Module}.{Action}` — ví dụ `Permissions.Inventory.ManageStock`.
- `{Module}` khớp tên nested class trong `Permissions.cs` (Catalog, Sales, Repair, Accounting, Warranty,
  Inventory, Content, Users, Roles, Reporting, System, HR, CRM).
- `{Action}` dùng động từ + danh từ rõ nghĩa: `View*` (chỉ đọc), `Manage*`/`Create*`/`Edit*`/`Delete*` (ghi),
  `Approve*` (duyệt — quyền cấp cao hơn Manage), `ViewOwn` vs `ViewAll` (phân biệt phạm vi dữ liệu).
- Role constant nằm ở `Roles` static class cùng file `Permissions.cs` — dùng làm giá trị cho
  `RequireRole(...)`, KHÔNG dùng chuỗi literal trực tiếp trong endpoint (xem 5 file Inventory đã sửa ở phase 02).
- `RolePermissionSeeder.AssignPermissionsToRole` chỉ ADD claim còn thiếu — không xoá claim cũ khi seeder chạy lại
  (an toàn cho DB đã có dữ liệu prod).
