# Ma trận phân quyền

> **FILE NÀY ĐƯỢC SINH TỰ ĐỘNG** từ `backend/BuildingBlocks/Security/` bởi
> `UnitTests/Security/PermissionMatrixDocTests.cs`. Đừng sửa tay — sửa hằng số
> trong `Permissions*.cs`, mô tả trong `PermissionRegistryDefinitions.cs`,
> ma trận trong `RolePermissionMatrixData.cs` rồi chạy lại test.

- Phiên bản seed hiện tại: **v3**
- Tổng số quyền: **122**
- Admin luôn có toàn bộ quyền và được `PermissionAuthorizationHandler` bypass.
- Seed chỉ THÊM quyền; quyền admin gỡ tay không bị cấp lại (xem `RolePermissionSeeder`).

## Tổng quan vai trò

| Vai trò | Số quyền | Phạm vi |
|---|---:|---|
| `Admin` | 122 | Toàn quyền (break-glass). |
| `Manager` | 101 | Quản lý cửa hàng: mọi nghiệp vụ trừ cấu hình hệ thống, tạo tài khoản và phân vai trò. |
| `Sale` | 29 | Bán hàng: POS, đơn hàng, báo giá, khách hàng tiềm năng, thu COD. |
| `InventoryStaff` | 13 | Kho: nhập/xuất/kiểm kê, lập đề nghị mua — không duyệt, không tài chính. |
| `Accountant` | 27 | Kế toán: hoá đơn, công nợ, thanh toán, báo cáo tài chính, tham số lương/thuế (D06). |
| `HR` | 8 | Nhân sự: hồ sơ, chấm công, nghỉ phép, bảng lương. Chỉ ĐỌC tham số luật. |
| `Marketing` | 24 | Nội dung website + chiến dịch CRM. |
| `TechnicianInShop` | 11 | Sửa chữa tại cửa hàng + xử lý bảo hành. |
| `TechnicianOnSite` | 10 | Sửa chữa tại nhà khách. |
| `Customer` | 9 | Khách hàng: đơn/bảo hành/sửa chữa của chính mình. Không có quyền nhân viên nào. |
| `Supplier` | 2 | Nhà cung cấp: xem đơn mua liên quan. |

## Chi tiết theo module

### Catalog — Sản phẩm

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Catalog.View` | Xem danh sách sản phẩm | View |  | x | x | x | x |  |  | x | x | x | x | x |
| `Catalog.Create` | Thêm sản phẩm mới | Create | `Catalog.View` | x | x |  |  |  |  |  |  |  |  |  |
| `Catalog.Edit` | Chỉnh sửa sản phẩm | Edit | `Catalog.View` | x | x |  |  |  |  |  |  |  |  |  |
| `Catalog.Delete` | Xoá sản phẩm | Delete | `Catalog.View` | x | x |  |  |  |  |  |  |  |  |  |
| `Catalog.Manage` | Quản lý danh mục, thương hiệu, thuộc tính | Manage | `Catalog.View` | x | x |  |  |  |  |  |  |  |  |  |
| `Catalog.Export` | Xuất file danh sách sản phẩm | Export | `Catalog.View` | x | x |  |  |  |  |  |  |  |  |  |
| `Catalog.Import` | Nhập sản phẩm hàng loạt từ file | Create | `Catalog.Create` | x | x |  |  |  |  |  |  |  |  |  |
| `Catalog.BulkPrice` | Đổi giá hàng loạt | Edit | `Catalog.Edit` | x | x |  |  |  |  |  |  |  |  |  |

### Sales — Bán hàng

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Sales.ViewOwn` | Xem đơn hàng của chính mình | View |  | x |  |  |  |  |  |  |  |  | x |  |
| `Sales.ViewAll` | Xem tất cả đơn hàng | View |  | x | x | x |  | x |  | x |  |  |  |  |
| `Sales.ManageAll` | Sửa mọi đơn hàng | Manage | `Sales.ViewAll` | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.Checkout` | Đặt hàng / thanh toán | Create |  | x |  | x |  |  |  |  |  |  | x |  |
| `Sales.UpdateStatus` | Cập nhật trạng thái đơn | Edit | `Sales.ViewAll` | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.CancelOrder` | Huỷ đơn hàng | Delete | `Sales.ViewAll` | x | x |  |  |  |  |  |  |  |  |  |
| `Sales.ViewReturns` | Xem yêu cầu đổi/trả | View |  | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.ManageReturns` | Xử lý đổi/trả hàng | Manage | `Sales.ViewReturns` | x | x |  |  |  |  |  |  |  |  |  |
| `Sales.Pos` | Bán hàng tại quầy (POS) | Create | `Sales.ViewAll` | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.Export` | Xuất báo cáo bán hàng | Export | `Sales.ViewAll` | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.SellOnCredit` | Bán công nợ (ghi nợ khách) | Approve | `Sales.ViewAll` | x | x |  |  |  |  |  |  |  |  |  |
| `Sales.TakeDeposit` | Nhận đặt cọc | Create | `Sales.ViewAll` | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.ManageInstallments` | Quản lý trả góp | Manage | `Sales.ViewAll` | x | x |  |  |  |  |  |  |  |  |  |
| `Sales.Quotations.View` | Xem báo giá | View |  | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.Quotations.Create` | Tạo báo giá | Create | `Sales.Quotations.View` | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.Quotations.Edit` | Sửa báo giá | Edit | `Sales.Quotations.View` | x | x | x |  |  |  |  |  |  |  |  |
| `Sales.Quotations.Approve` | Duyệt báo giá | Approve | `Sales.Quotations.View` | x | x |  |  |  |  |  |  |  |  |  |

### Inventory — Kho

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Inventory.ViewStock` | Xem tồn kho | View |  | x | x | x | x | x |  |  | x | x |  |  |
| `Inventory.ManageStock` | Nhập/xuất kho | Manage | `Inventory.ViewStock` | x | x |  | x |  |  |  |  |  |  |  |
| `Inventory.AdjustStock` | Điều chỉnh tồn kho, kiểm kê | Edit | `Inventory.ViewStock` | x | x |  | x |  |  |  |  |  |  |  |
| `Inventory.ViewSupplier` | Xem nhà cung cấp | View |  | x | x |  | x | x |  |  |  |  |  |  |
| `Inventory.CreateSupplier` | Thêm nhà cung cấp | Create | `Inventory.ViewSupplier` | x | x |  |  |  |  |  |  |  |  |  |
| `Inventory.UpdateSupplier` | Sửa nhà cung cấp | Edit | `Inventory.ViewSupplier` | x | x |  |  |  |  |  |  |  |  |  |
| `Inventory.DeleteSupplier` | Xoá nhà cung cấp | Delete | `Inventory.ViewSupplier` | x | x |  |  |  |  |  |  |  |  |  |
| `Inventory.ViewPurchaseOrder` | Xem đơn mua hàng | View |  | x | x |  | x | x |  |  |  |  |  | x |
| `Inventory.CreatePurchaseOrder` | Tạo đơn mua / đề nghị mua | Create | `Inventory.ViewPurchaseOrder` | x | x |  | x |  |  |  |  |  |  |  |
| `Inventory.ApprovePurchaseOrder` | Duyệt đơn mua hàng | Approve | `Inventory.ViewPurchaseOrder` | x | x |  |  |  |  |  |  |  |  |  |
| `Inventory.ReceivePurchaseOrder` | Nhận hàng nhập kho (GRN) | Manage | `Inventory.ViewPurchaseOrder` | x | x |  | x |  |  |  |  |  |  |  |
| `Inventory.ViewReservations` | Xem hàng giữ chỗ | View |  | x | x |  | x |  |  |  | x |  |  |  |
| `Inventory.Approve` | Duyệt nghiệp vụ kho (gồm chuyển kho một bước) | Approve | `Inventory.ViewStock` | x | x |  |  |  |  |  |  |  |  |  |
| `Inventory.ImportOpening` | Nhập tồn đầu kỳ | Create | `Inventory.ManageStock` | x | x |  | x |  |  |  |  |  |  |  |
| `Inventory.QuickReceive` | Nhập nhanh không cần đơn mua | Create | `Inventory.ManageStock` | x | x |  | x |  |  |  |  |  |  |  |
| `Inventory.Export` | Xuất báo cáo kho | Export | `Inventory.ViewStock` | x | x |  | x |  |  |  |  |  |  |  |

### Payments — Thanh toán

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Payments.View` | Xem giao dịch thanh toán | View |  | x | x | x |  | x |  |  |  |  |  |  |
| `Payments.Reconcile` | Đối soát sao kê ngân hàng | Manage | `Payments.View` | x | x |  |  | x |  |  |  |  |  |  |
| `Payments.Refund` | Hoàn tiền | Approve | `Payments.View` | x | x |  |  | x |  |  |  |  |  |  |
| `Payments.CollectCod` | Xác nhận thu COD | Manage | `Payments.View` | x | x | x |  | x |  |  |  |  |  |  |
| `Payments.Configure` | Cấu hình cổng thanh toán | Manage | `Payments.View` | x |  |  |  |  |  |  |  |  |  |  |

### Repair — Sửa chữa

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Repair.Book` | Đặt lịch sửa chữa | Create |  | x |  | x |  |  |  |  |  |  | x |  |
| `Repair.ViewOwn` | Xem phiếu sửa chữa của mình | View |  | x |  |  |  |  |  |  | x | x | x |  |
| `Repair.ViewAll` | Xem tất cả phiếu sửa chữa | View |  | x | x | x |  |  |  |  | x | x |  |  |
| `Repair.UpdateStatus` | Cập nhật tiến độ sửa chữa | Edit | `Repair.ViewAll` | x | x |  |  |  |  |  | x | x |  |  |
| `Repair.AssignTechnician` | Phân công kỹ thuật viên | Manage | `Repair.ViewAll` | x | x |  |  |  |  |  |  |  |  |  |
| `Repair.CreateQuote` | Lập báo giá sửa chữa | Create | `Repair.ViewAll` | x | x |  |  |  |  |  | x | x |  |  |
| `Repair.ApproveQuote` | Duyệt báo giá sửa chữa | Approve | `Repair.ViewAll` | x | x |  |  |  |  |  |  |  |  |  |
| `Repair.Complete` | Hoàn tất phiếu sửa chữa | Manage | `Repair.ViewAll` | x | x |  |  |  |  |  | x | x |  |  |

### Warranty — Bảo hành

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Warranty.SubmitClaim` | Gửi yêu cầu bảo hành | Create |  | x |  | x |  |  |  |  |  |  | x |  |
| `Warranty.ViewOwn` | Xem yêu cầu bảo hành của mình | View |  | x |  |  |  |  |  |  |  | x | x |  |
| `Warranty.ViewAll` | Xem tất cả yêu cầu bảo hành | View |  | x | x | x |  |  |  |  | x | x |  |  |
| `Warranty.ReviewClaim` | Xử lý yêu cầu bảo hành | Manage | `Warranty.ViewAll` | x | x |  |  |  |  |  | x | x |  |  |
| `Warranty.ApproveClaim` | Duyệt yêu cầu bảo hành | Approve | `Warranty.ViewAll` | x | x |  |  |  |  |  |  |  |  |  |
| `Warranty.Moderate` | Kiểm duyệt nội dung khách gửi kèm | Manage | `Warranty.ViewAll` | x | x |  |  |  |  |  |  |  |  |  |

### Content — Nội dung

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Content.ViewPages` | Xem trang tĩnh | View |  | x | x | x |  |  |  | x |  |  | x |  |
| `Content.ManagePages` | Quản lý trang tĩnh | Manage | `Content.ViewPages` | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ViewPosts` | Xem bài viết | View |  | x | x | x |  |  |  | x |  |  | x |  |
| `Content.ManagePosts` | Quản lý bài viết | Manage | `Content.ViewPosts` | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ViewCoupons` | Xem mã giảm giá | View |  | x | x | x |  |  |  | x |  |  |  |  |
| `Content.ManageCoupons` | Quản lý mã giảm giá, khuyến mãi | Manage | `Content.ViewCoupons` | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ViewBanners` | Xem banner | View |  | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ManageBanners` | Quản lý banner trang chủ | Manage | `Content.ViewBanners` | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ManageMedia` | Tải lên và quản lý thư viện ảnh | Manage | `Content.ViewPages` | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ManageMenus` | Quản lý menu điều hướng | Manage | `Content.ViewPages` | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ManageContacts` | Xử lý liên hệ từ website | Manage | `Content.ViewPages` | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ViewRedirects` | Xem bảng chuyển hướng URL | View |  | x | x |  |  |  |  | x |  |  |  |  |
| `Content.ManageRedirects` | Quản lý chuyển hướng URL (301/302/410), nhập/xuất CSV | Manage | `Content.ViewRedirects` | x | x |  |  |  |  | x |  |  |  |  |

### CRM — Khách hàng

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `CRM.ViewCustomers` | Xem khách hàng | View |  | x | x | x |  |  |  | x |  |  |  |  |
| `CRM.ManageCustomers` | Sửa thông tin khách hàng | Manage | `CRM.ViewCustomers` | x | x | x |  |  |  |  |  |  |  |  |
| `CRM.ViewLeads` | Xem khách hàng tiềm năng | View |  | x | x | x |  |  |  | x |  |  |  |  |
| `CRM.ManageLeads` | Quản lý khách hàng tiềm năng | Manage | `CRM.ViewLeads` | x | x | x |  |  |  |  |  |  |  |  |
| `CRM.ViewSegments` | Xem tệp khách hàng | View |  | x | x | x |  |  |  | x |  |  |  |  |
| `CRM.ManageSegments` | Quản lý tệp khách hàng | Manage | `CRM.ViewSegments` | x | x |  |  |  |  | x |  |  |  |  |
| `CRM.ViewAnalytics` | Xem phân tích khách hàng | View |  | x | x |  |  |  |  | x |  |  |  |  |
| `CRM.ManageTasks` | Quản lý công việc chăm sóc KH | Manage | `CRM.ViewCustomers` | x | x | x |  |  |  |  |  |  |  |  |
| `CRM.ViewCampaigns` | Xem chiến dịch marketing | View |  | x | x |  |  |  |  | x |  |  |  |  |
| `CRM.ManageCampaigns` | Soạn chiến dịch marketing | Manage | `CRM.ViewCampaigns` | x | x |  |  |  |  | x |  |  |  |  |
| `CRM.SendCampaigns` | Gửi chiến dịch (email/SMS) thật | Approve | `CRM.ManageCampaigns` | x | x |  |  |  |  | x |  |  |  |  |

### Accounting — Kế toán

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Accounting.ViewInvoices` | Xem hoá đơn, sổ sách | View |  | x | x |  |  | x |  |  |  |  |  |  |
| `Accounting.CreateInvoice` | Tạo hoá đơn | Create | `Accounting.ViewInvoices` | x | x |  |  | x |  |  |  |  |  |  |
| `Accounting.EditInvoice` | Sửa hoá đơn | Edit | `Accounting.ViewInvoices` | x | x |  |  | x |  |  |  |  |  |  |
| `Accounting.DeleteInvoice` | Xoá/huỷ hoá đơn | Delete | `Accounting.ViewInvoices` | x |  |  |  | x |  |  |  |  |  |  |
| `Accounting.ManageInvoices` | Phát hành hoá đơn điện tử | Manage | `Accounting.ViewInvoices` | x | x |  |  | x |  |  |  |  |  |  |
| `Accounting.ApproveCredit` | Duyệt hạn mức công nợ | Approve | `Accounting.ViewInvoices` | x |  |  |  | x |  |  |  |  |  |  |
| `Accounting.ManageDebt` | Quản lý công nợ | Manage | `Accounting.ViewInvoices` | x | x |  |  | x |  |  |  |  |  |  |
| `Accounting.ManageExpense` | Quản lý chi phí | Manage | `Accounting.ViewInvoices` | x | x |  |  | x |  |  |  |  |  |  |
| `Accounting.ViewReports` | Xem báo cáo kế toán | View | `Accounting.ViewInvoices` | x | x |  |  | x |  |  |  |  |  |  |
| `Accounting.Export` | Xuất báo cáo tài chính | Export | `Accounting.ViewInvoices` | x | x |  |  | x |  |  |  |  |  |  |

### HR — Nhân sự

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `HR.ViewEmployees` | Xem hồ sơ nhân viên | View |  | x | x |  |  | x | x |  |  |  |  |  |
| `HR.ManageEmployees` | Quản lý hồ sơ, hợp đồng nhân viên | Manage | `HR.ViewEmployees` | x | x |  |  |  | x |  |  |  |  |  |
| `HR.ViewAttendance` | Xem chấm công | View |  | x | x |  |  |  | x |  |  |  |  |  |
| `HR.ManageAttendance` | Quản lý chấm công, ca làm | Manage | `HR.ViewAttendance` | x | x |  |  |  | x |  |  |  |  |  |
| `HR.ApproveLeave` | Duyệt nghỉ phép, tăng ca | Approve | `HR.ViewAttendance` | x | x |  |  |  | x |  |  |  |  |  |
| `HR.ViewPayroll` | Xem bảng lương | View |  | x | x |  |  | x | x |  |  |  |  |  |
| `HR.ManagePayroll` | Tính và chốt bảng lương | Manage | `HR.ViewPayroll` | x | x |  |  | x | x |  |  |  |  |  |
| `HR.ManageStatutoryParameters` | Sửa tham số lương/thuế/bảo hiểm theo luật | Manage | `HR.ViewPayroll` | x |  |  |  | x |  |  |  |  |  |  |

### Users — Người dùng

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Users.View` | Xem danh sách tài khoản | View |  | x | x |  |  |  |  |  |  |  |  |  |
| `Users.Create` | Tạo tài khoản mới | Create | `Users.View` | x |  |  |  |  |  |  |  |  |  |  |
| `Users.Edit` | Sửa thông tin tài khoản | Edit | `Users.View` | x | x |  |  |  |  |  |  |  |  |  |
| `Users.Delete` | Khoá/xoá tài khoản | Delete | `Users.View` | x |  |  |  |  |  |  |  |  |  |  |
| `Users.ManageRoles` | Gán vai trò cho tài khoản | Manage | `Users.View` | x |  |  |  |  |  |  |  |  |  |  |

### Roles — Vai trò

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Roles.View` | Xem vai trò và ma trận quyền | View |  | x |  |  |  |  |  |  |  |  |  |  |
| `Roles.Create` | Tạo vai trò mới | Create | `Roles.View` | x |  |  |  |  |  |  |  |  |  |  |
| `Roles.Edit` | Sửa quyền của vai trò | Edit | `Roles.View` | x |  |  |  |  |  |  |  |  |  |  |
| `Roles.Delete` | Xoá vai trò | Delete | `Roles.View` | x |  |  |  |  |  |  |  |  |  |  |

### Reporting — Báo cáo

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Reporting.ViewSales` | Xem báo cáo bán hàng | View |  | x | x | x |  | x |  | x |  |  |  |  |
| `Reporting.ViewInventory` | Xem báo cáo kho | View |  | x | x |  | x | x |  |  |  |  |  |  |
| `Reporting.ViewFinancial` | Xem báo cáo tài chính | View |  | x | x |  |  | x |  |  |  |  |  |  |
| `Reporting.ViewRepair` | Xem báo cáo sửa chữa | View |  | x | x |  |  |  |  |  | x |  |  |  |
| `Reporting.ViewHR` | Xem báo cáo nhân sự | View |  | x | x |  |  | x | x |  |  |  |  |  |
| `Reporting.ExportReports` | Xuất báo cáo ra file | Export |  | x | x |  |  | x |  |  |  |  |  |  |

### System — Hệ thống

| Quyền | Mô tả | Loại | Phụ thuộc | Admin | Manager | Sale | Kho | KToán | HR | MKT | KTV-Shop | KTV-Site | KH | NCC |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `System.ViewConfig` | Xem cấu hình hệ thống | View |  | x | x |  |  |  |  |  |  |  |  |  |
| `System.ManageConfig` | Thay đổi cấu hình hệ thống | Manage | `System.ViewConfig` | x |  |  |  |  |  |  |  |  |  |  |
| `System.ViewLogs` | Xem nhật ký hệ thống | View |  | x |  |  |  |  |  |  |  |  |  |  |
| `System.ManageLogs` | Xoá/xuất nhật ký hệ thống | Manage | `System.ViewLogs` | x |  |  |  |  |  |  |  |  |  |  |
| `System.ManageBackups` | Sao lưu và phục hồi dữ liệu | Manage | `System.ViewConfig` | x |  |  |  |  |  |  |  |  |  |  |

## Endpoint công khai (không cần đăng nhập)

Mọi endpoint KHÔNG nằm trong bảng này phải mang một policy permission.
Route chứa đoạn `admin`, `backoffice`, `internal` không bao giờ công khai.

| Route | Method | Lý do |
|---|---|---|
| `/health` | * | Docker/monitor healthcheck — không có danh tính, chỉ trả trạng thái. |
| `/health/**` | * | Biến thể ready/live của healthcheck ở Program.cs:69-78. |
| `/swagger/**` | GET/HEAD | Swagger UI, chỉ bật ở môi trường Development. |
| `/api/auth/login` | POST | Không thể yêu cầu token để lấy token. Có rate limit riêng. |
| `/api/auth/register` | POST | Khách tự đăng ký tài khoản. |
| `/api/auth/refresh-token` | POST | Access token đã hết hạn nên không gửi kèm được. |
| `/api/auth/logout` | POST | Thu hồi refresh token; token truy cập có thể đã hết hạn. |
| `/api/auth/google` | POST | Đăng nhập Google, xác thực bằng id_token của Google. |
| `/api/auth/forgot-password` | POST | Người dùng mất mật khẩu nên không đăng nhập được. |
| `/api/auth/reset-password` | POST | Xác thực bằng token gửi qua email, không bằng JWT. |
| `/api/catalog/**` | GET/HEAD | Danh mục sản phẩm là mặt tiền cửa hàng; chỉ GET. |
| `/api/content/**` | GET/HEAD | Trang tĩnh, bài viết, banner hiển thị cho khách; chỉ GET. |
| `/api/promotions` | GET/HEAD | Danh sách khuyến mãi đang chạy hiển thị trên storefront. |
| `/api/promotions/{code}` | GET/HEAD | Tra cứu một mã khuyến mãi trước khi đăng nhập. |
| `/api/stores` | GET/HEAD | D09: danh sách cửa hàng/địa chỉ liên hệ công khai. |
| `/api/stores/{id}` | GET/HEAD | D09: chi tiết một cửa hàng. |
| `/api/ai/recommendations/**` | GET/HEAD | Gợi ý sản phẩm cho khách vãng lai. |
| `/api/public/warranty/lookup` | GET/HEAD | Tra bảo hành bằng số serial in trên máy. |
| `/api/public/warranty/lookup-by-phone` | GET/HEAD | Tra bảo hành bằng SĐT đã mua hàng. |
| `/api/sales/public/guest-checkout` | POST | Đặt hàng không cần tài khoản (SalesEndpoints.cs:36). |
| `/api/shipping/calculate-fee` | POST | Tính phí ship ở trang giỏ hàng trước khi đăng nhập (ShippingEndpoints.cs:21). |
| `/api/shipping/webhook` | POST | GHN gọi vào, xác thực bằng token/chữ ký chứ không bằng JWT (ShippingEndpoints.cs:100-163). |
| `/api/payments/methods` | GET/HEAD | Liệt kê phương thức thanh toán ở trang giỏ hàng (PaymentMethodsEndpoint.cs:33). |
| `/api/payments/v2/sepay/webhook` | POST | D04: SePay gọi vào, ký HMAC (SePayWebhookEndpoint.cs:151). |
| `/api/payments/v2/momo/callback` | POST | D04: MoMo IPN, ký HMAC (MoMoWebhookEndpoint.cs:98). |
| `/api/payments/v2/vnpay/callback` | GET/HEAD | D04: VNPay redirect người dùng về kèm chữ ký (VnPayWebhookEndpoint.cs:78). |
| `/api/communication/newsletter/subscribe` | POST | Đăng ký nhận tin từ footer storefront. |
| `/api/communication/newsletter/unsubscribe` | POST | Huỷ nhận tin từ link trong email, người dùng không đăng nhập. |
| `/_shell/**` | GET/HEAD | Shell HTML cho bot tìm kiếm, chỉ đọc dữ liệu đã công khai (SeoShellEndpoints.cs:19-21). |
| `/sitemap.xml` | GET/HEAD | Sitemap cho bot; sinh từ cùng provider với trang công khai (SeoShellEndpoints.cs:23-25). |
| `/robots.txt` | GET/HEAD | robots.txt cho bot (SeoShellEndpoints.cs:27-29). |
| `/api/auth/login/2fa` | POST | Bước 2 của đăng nhập: bước 1 CHƯA phát token nào. Đầu vào là challengeToken (không phải email) nên không dò được tài khoản; rate limit 'auth' (TwoFactorLoginEndpoint.cs:94-99). |
| `/api/config/public` | GET/HEAD | Danh sách TRẮNG khoá cấu hình storefront (SystemConfigPublicEndpointsKeys), chặn thêm ValueType=Secret (SystemConfigEndpoints.cs:68-95). |
| `/api/content/contact` | POST | Form liên hệ storefront; rate limit 'contact' 5/phút/IP (ContentEndpoints.cs:317-341). |
| `/api/catalog/pc-builder/check` | POST | Kiểm tra tương thích cấu hình đang lắp; chỉ đọc, không ghi (PcBuilderCheckEndpoint.cs:20-22). |
| `/api/catalog/pc-builder/suggest` | POST | Gợi ý theo ngân sách, rule-based trên catalog công khai (PcBuilderSuggestEndpoint.cs:26-28). |
| `/api/ai/chat` | POST | Chatbot cho khách vãng lai; MỖI LƯỢT GỌI TỐN TIỀN nhà cung cấp -> rate limit 'ai' 20/phút/IP (AiEndpoints.cs:16-29). |
| `/api/ai/search` | POST | Ô tìm kiếm storefront. Thực chất là ILIKE trên CatalogDb (KHÔNG gọi nhà cung cấp AI), nhưng vẫn rate limit 'lookup' vì là POST ẩn danh tốn CPU/DB (SemanticSearchEndpoints.cs:22-27). |
| `/api/coupons/apply` | GET/HEAD | Alias cũ của tra mã giảm giá ở giỏ hàng. PHÂN BIỆT mã thật/mã sai nên là oracle dò mã -> rate limit 'lookup' (PromotionEndpoints.cs:234-266). |
| `/api/promotions/evaluate` | POST | Xem trước ưu đãi cho giỏ chưa đặt; không ghi DB. Cảnh báo lỗi coupon là oracle dò mã -> rate limit 'lookup' (PromotionPreviewEndpoints.cs:24-26). |
| `/api/crm/track/open/{trackingId}` | GET/HEAD | Pixel 1x1 đo tỉ lệ mở email (CrmEndpoints.cs:1100-1115). |
| `/api/crm/track/click/{trackingId}` | GET/HEAD | Link trong email; đích redirect qua allow-list host, chống open redirect (CrmEndpoints.cs:1117-1136). |
| `/api/crm/unsubscribe/{trackingId}` | GET/HEAD | Huỷ nhận email từ link; chỉ tác động đúng trackingId trong link (CrmEndpoints.cs:1138-1145). |
| `/api/inventory/products/{productId}/stock` | GET/HEAD | Tồn khả dụng của 1 sản phẩm; không giá vốn, không nhà cung cấp (StockEndpoints.cs:72-83). |
| `/api/inventory/products/{productId}/variants/{variantId}/stock` | GET/HEAD | Như trên, theo biến thể (StockEndpoints.cs:85-96). |
| `/api/inventory/products/{productId}/stock-by-branch` | GET/HEAD | Tồn theo chi nhánh; chỉ kho Branch/Showroom và chỉ địa chỉ/SĐT cửa hàng vốn đã công khai ở /api/stores (StockEndpoints.cs:99-134). |
| `/api/stores/{id}/stock/{productId}` | GET/HEAD | Còn/Sắp hết/Hết tại một chi nhánh — KHÔNG trả số lượng chính xác (StoreEndpoints.cs:57-75). |
| `/api/payments/guest/initiate` | POST | Khách vãng lai trả tiền đơn của mình; token ký sẵn gắn đúng 1 orderId (PaymentGuestEndpoints.cs:27-42). |
| `/api/payments/guest/{id}` | GET/HEAD | Trạng thái giao dịch, cùng token ký sẵn (PaymentGuestEndpoints.cs:44-55). |
| `/api/payments/guest/{id}/qr.png` | GET/HEAD | Ảnh QR của giao dịch, cùng token ký sẵn (PaymentGuestEndpoints.cs:57-68). |
| `/api/payments/v2/vnpay/ipn` | GET/HEAD | Máy chủ VNPay gọi vào; xác thực bằng chữ ký HashSecret, chưa cấu hình thì 503 (VnPayGatewayEndpoints.cs:33-56). |
| `/api/payments/v2/vnpay/return` | GET/HEAD | Trình duyệt khách quay về; KHÔNG ghi DB (handler không nhận DbContext/bus), chữ ký sai thì không tiết lộ gì (VnPayGatewayEndpoints.cs:58-88). |
| `/api/recruitment` | GET/HEAD | Tin tuyển dụng đang mở (HREndpoints.cs:35-42). |
| `/api/recruitment/{id}` | GET/HEAD | Chi tiết tin tuyển dụng; W4-5 đã lọc Active + chưa hết hạn để bản nháp không lộ (HREndpoints.cs:44-56). |
| `/api/sales/public/cart` | GET/HEAD | Giỏ vãng lai, khoá bằng cookie qh_aid HttpOnly ngẫu nhiên (GuestCartEndpoints.cs:30-46). |
| `/api/sales/public/cart/items` | POST | Thêm hàng vào giỏ vãng lai; GIÁ KHÔNG lấy từ client, chốt đơn đọc lại giá thật (GuestCartEndpoints.cs:48-60). |
| `/api/sales/public/orders/track` | GET/HEAD | Tra đơn bằng mã đơn VÀ số điện thoại (hai yếu tố, sai một trong hai trả cùng 404); rate limit 'lookup' (GuestOrderTrackingEndpoints.cs:25-80). |
| `/api/sales/return-policies/effective` | GET/HEAD | Chính sách đổi trả áp cho 1 sản phẩm — tham số chính sách, không PII (ReturnPolicyEndpoints.cs:80-122). |
| `/api/sales/return-policies/public-matrix` | GET/HEAD | Bảng chính sách đổi trả trên trang 'Chính sách' (ReturnPolicyEndpoints.cs:124-140). |
| `/api/sales/shipping/provinces` | GET/HEAD | Dữ liệu tham chiếu tỉnh/thành tĩnh (ShippingAddressEndpoints.cs:33-38). |
| `/api/sales/shipping/provinces/{code}/wards` | GET/HEAD | Dữ liệu tham chiếu xã/phường tĩnh (ShippingAddressEndpoints.cs:40-48). |
| `/api/sales/shipping/quote` | POST | Phí ship ở trang giỏ hàng trước khi đăng nhập; phí do server tính, client không gửi phí (ShippingQuoteEndpoints.cs:24-42). |
| `/api/repair/onsite-fee` | GET/HEAD | Phí tận nơi niêm yết; 2 con số từ cấu hình, không đọc DB (PublicTrackingEndpoints.cs:22-31). |
| `/api/repair/track/{ticketNumber}` | GET/HEAD | Tra phiếu sửa bằng mã phiếu VÀ số điện thoại; sai một trong hai trả cùng 404; rate limit 'contact' (PublicTrackingEndpoints.cs:35-85). |
| `/api/warranty/policies/effective` | GET/HEAD | Số tháng bảo hành áp cho 1 sản phẩm, không hồ sơ bảo hành, không PII (policy-endpoints.cs:27-43). |
| `/api/warranty/policies/public-matrix` | GET/HEAD | Ma trận chính sách bảo hành trên trang 'Chính sách' (policy-endpoints.cs:45-62). |

