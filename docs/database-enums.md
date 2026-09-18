# Hợp đồng schema CSDL - enum, ràng buộc, khoá, sequence

> Chủ sở hữu: **W1-11** (đợt 1). Đây là tài liệu duy nhất các track sau cần đọc về tính toàn vẹn
> của schema. Phần "Bảng giá trị của từng enum" **được sinh ra** từ model EF bởi
> `backend/Tests/UnitTests/Schema/DatabaseEnumDictionaryTests.cs` - sửa tay sẽ làm test đỏ.
>
> Sinh lại: `QH_UPDATE_DOCS=1 scripts/qh-build.sh be-test DatabaseEnumDictionaryTests`

## 1. Quy tắc bất biến do W1-11 đóng băng (2026-09-18)

1. **Tiền và số lượng âm bị chặn - NHƯNG CHỈ TRÊN 34 BẢNG ĐÃ PHỦ.** Trước đợt này CSDL có **0**
   ràng buộc CHECK do người dùng định nghĩa; W1-11 thêm **94** ràng buộc trên **34** bảng.
   Tên ràng buộc: `CK_<Bảng>_<Cột>_NonNegative` / `_Positive` / `_Range`.
   **Phạm vi phủ (đo 2026-09-18 trên `quanghuongdb_test`): 56/105 cột tiền có CHECK, 49 cột CÒN
   LẠI KHÔNG CÓ.** Ví dụ đã kiểm chứng là vẫn nhận giá trị âm:
   `ReturnRequests.RefundAmount`, `PurchaseReturns.RefundAmount`, `LedgerEntry.Amount`,
   `payments.SePayTransactions.TransferAmount`, `InstallmentApplications.{TotalAmount,
   MonthlyAmount,DownPayment}`, `hr.SalaryStructures.BaseSalary`, `hr.PayrollRuns.*`,
   `hr.Allowances.Amount`, `RepairQuotes.{PartsCost,LaborCost,ServiceFee}`,
   `SupplierQuotations.TotalAmount`, `content.Promotions.DiscountValue`, `Accounts.Balance`.
   ⇒ **Với các cột đó tầng ứng dụng VẪN là hàng phòng thủ cuối.** Track sở hữu module (đợt 2) phải
   hoặc thêm CHECK trong migration của mình, hoặc validate ở tầng domain - đừng cho rằng CSDL đã lo.
   Truy vấn liệt kê các cột chưa phủ nằm trong `plans/.../reports/w1-11-report.md`
   (mục *Verification (adversarial)*).
2. **`InventoryItems` là nguồn sự thật của tồn kho.** `Products.StockQuantity` chỉ là **bản chiếu**
   (`= Σ(QuantityOnHand - ReservedQuantity)`), và chỉ consumer `StockChanged` của W2-1 được ghi vào
   cột đó. Quy tắc này cũng nằm trong `COMMENT ON COLUMN` của chính cột đó.
   `ReservedQuantity` luôn `<= QuantityOnHand` và luôn bằng tổng các `StockReservation` đang
   `Active` (Status = 0).
3. **Khoá lạc quan bằng `xmin`** trên 6 tổng thể hay bị ghi đồng thời:
   `InventoryItems`, `content.Coupons`, `LoyaltyAccounts`, `Invoices`, `Expenses`,
   `payments.PaymentIntents`. EF sẽ ném `DbUpdateConcurrencyException` thay vì ghi đè lặng lẽ.
   `xmin` là **cột hệ thống của PostgreSQL** - migration không được `ADD COLUMN xmin`.
4. **Khoá nghiệp vụ duy nhất** (trước đây chỉ là index thường, tạo trùng được):
   - `Invoices.InvoiceNumber` - `IX_Invoices_InvoiceNumber_Unique`
   - `hr.Payrolls (EmployeeId, Year, Month)` - `IX_Payrolls_Employee_Year_Month_Unique`
   - `hr.Employees.Email` - `IX_Employees_Email_Unique`
   - `InventoryItems (ProductId, COALESCE(VariantId), COALESCE(WarehouseId))` -
     `uq_inventory_items_product_variant_warehouse` (index biểu thức: NULL không "bằng" NULL trong
     PostgreSQL, nên index duy nhất cũ vẫn cho phép tạo trùng)
   - **D09:** đúng một kho mặc định - `IX_Warehouse_Default` là unique partial `WHERE "IsDefault"`
5. **Số chứng từ đến từ sequence**, không từ bộ đếm tĩnh trong tiến trình:
   13 sequence `docnum_<type>_seq` trong schema **`public`** cho
   `po, grn, dn, rma, inv, wo, tr, pr, rfq, ret, pay, so, bg`. Định dạng `PREFIX-yyyyMM-#####`,
   do `BuildingBlocks/Documents/DocumentNumberService.cs` phát. **Khoảng trống số là bình thường.**
6. **Thuế suất.** `Categories.VatRate` là **phân số** `numeric(5,4)` trong `[0, 1]` (D01).
   `Invoices.VatRate` và `InvoiceLine.VatRate` là **phần trăm** trong `[0, 100]`
   (`VatAmount = LineTotal * VatRate / 100`, `Accounting/Domain/Invoice.cs:315`). Đừng lẫn hai loại.
   `Orders.TaxRate` và `Carts.TaxRate` là phân số `numeric(5,4)`.
7. **Tiền là `numeric(18,2)`.** 13 cột còn thả nổi kiểu đã được ghim; tỉ lệ dùng `(5,4)` hoặc
   `(6,4)`. Ngoại lệ đã biết: `Products.AverageRating` vẫn là `real` vì
   `Catalog/Domain/Product.cs:40` khai báo `float` - đổi sang `decimal` là việc của track sở hữu
   Domain (integration request W1-11-IR-01); hiện có `CHECK` giữ nó trong `[0, 5]`.
8. **Thời gian.** CSDL dùng `timestamp without time zone` (giá trị UTC) cho hầu hết cột; **51 cột**
   đã là `timestamptz` sau W1-11 (toàn bộ Sales + Repair + `content.HomepageSections` +
   `hr.AttendanceRecords` `CheckInTime`/`CheckOutTime`) - đếm trên CSDL cài mới, không tính
   `public.AspNetUsers.LockoutEnd` của Identity (cột thứ 52 trên CSDL của chủ sở hữu).
   Model EF nay khớp đúng thực tế đó, nên
   `dotnet ef migrations has-pending-model-changes` sạch. **Việc chuyển đổi hàng loạt còn lại nằm
   trong backlog** - đừng tự ý đổi kiểu một cột lẻ.
9. **Ràng buộc `NOT VALID`.** `CK_PurchaseOrderItem_Quantity_Positive` và
   `CK_PurchaseOrderItem_UnitPrice_NonNegative` được thêm ở dạng `NOT VALID` vì CSDL dev còn một
   dòng rác do agent kiểm toán tạo (`PurchaseOrderItem` Id = 1, Quantity = -10, UnitPrice = -5).
   Dòng mới đã bị chặn. **Migration `20260918170004` tự chạy `VALIDATE CONSTRAINT` ngay sau đó nếu
   bảng không còn dòng vi phạm** (đúng với CSDL của chủ sở hữu và mọi bản cài mới - dòng rác chỉ có
   trên bản sao `quanghuongdb_test`), nên trên các CSDL đó hai ràng buộc là VALID chứ không treo.
   Chỉ khi vẫn còn dòng vi phạm mới cần chạy tay sau khi D03 dọn dữ liệu thử:
   ```sql
   ALTER TABLE public."PurchaseOrderItem" VALIDATE CONSTRAINT "CK_PurchaseOrderItem_Quantity_Positive";
   ALTER TABLE public."PurchaseOrderItem" VALIDATE CONSTRAINT "CK_PurchaseOrderItem_UnitPrice_NonNegative";
   ```

## 2. Quy tắc viết migration trong repo này

- **Mọi migration của đợt 1 do W1-11 viết.** Từ đợt 2, mỗi track lại sở hữu migration của module mình.
- `__EFMigrationsHistory` là **một bảng dùng chung** cho cả 15 DbContext → **migration id phải duy
  nhất trên toàn repo** và phải lớn hơn mọi id đã có, nếu không EF sẽ chạy migration mới *trước*
  migration cũ trên một CSDL cài mới. Id của W1-11 là `20260918170001`-`20260918170012`.
- **Không bao giờ chạy `dotnet ef migrations remove`** trong repo này: migration cuối của
  Catalog/Repair không có file `.Designer.cs`, và lệnh này sẽ **xoá sạch** file ModelSnapshot
  (đã tái hiện được ngày 2026-09-18). Muốn bỏ migration thì xoá file rồi khôi phục snapshot.
- `dotnet ef` chạy được nhờ các `*DesignTimeDbContextFactory` nằm trong thư mục `Migrations` của
  từng module. Chuỗi kết nối của chúng **cố tình không kết nối được** (cổng 1) để một lệnh
  `database update` chạy nhầm không thể ghi DDL vào CSDL thật (D12). Áp migration bằng
  `dotnet ef migrations script` rồi `psql` vào đúng CSDL đích.
- Hai module **chưa dùng được `dotnet ef`**: `Ai` và `Communication` - `.csproj` của chúng thiếu
  `Microsoft.EntityFrameworkCore.Design` (integration request W1-11-IR-02).

<!-- BEGIN GENERATED: database-enums -->

## Bảng giá trị của từng enum

| Enum | Giá trị lưu trong CSDL |
|---|---|
| `AdjustmentType` | 0 = Damage, 1 = Loss, 2 = Found, 3 = Count, 4 = Return, 5 = Expiry |
| `AgingBucket` | 0 = None, 1 = Current, 2 = Days1To30, 3 = Days31To60, 4 = Days61To90, 5 = Over90Days |
| `ApprovalStatus` | 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Cancelled |
| `ApprovalType` | 0 = LeaveRequest, 1 = OvertimeRequest, 2 = ExpenseClaim |
| `AssetCondition` | 0 = New, 1 = Good, 2 = Fair, 3 = Damaged, 4 = Lost |
| `AssignmentStatus` | 0 = Scheduled, 1 = CheckedIn, 2 = CheckedOut, 3 = Missed, 4 = Late, 5 = Cancelled |
| `AttendanceStatus` | 0 = Present, 1 = Late, 2 = Absent, 3 = HalfDay, 4 = Holiday, 5 = OnLeave |
| `BannerPosition` | 0 = HomepageHero, 1 = HomepageSidebar, 2 = CategoryTop, 3 = ProductDetail, 4 = Checkout, 5 = Footer, 6 = Header |
| `CheckInMethod` | 0 = Web, 1 = QR, 2 = GPS, 3 = WiFi, 4 = Manual |
| `CheckoutSessionStatus` | 0 = Active, 1 = Completed, 2 = Cancelled, 3 = Expired |
| `ClaimStatus` | 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Resolved, 4 = InProgress |
| `ClaimType` | 1 = RepairAtShop, 2 = SendToManufacturer, 3 = ExchangeNew, 4 = Rejected |
| `ConditionOperator` | 1 = Eq, 2 = Gte, 3 = Lte, 4 = In, 5 = Between |
| `ConditionType` | 1 = MinOrderValue, 2 = Category, 3 = Brand, 4 = Product, 5 = CustomerGroup, 6 = TimeOfDay, 7 = DayOfWeek, 8 = FirstOrder, 9 = Quantity |
| `ConfigValueType` | 0 = String, 1 = Number, 2 = Boolean, 3 = Json, 4 = Secret, 5 = Url, 6 = Email, 7 = Percentage, 8 = Color |
| `ContactMessageStatus` | 0 = New, 1 = Read, 2 = Replied, 3 = Archived |
| `ContractStatus` | 0 = Draft, 1 = Active, 2 = Expired, 3 = Terminated, 4 = Renewed |
| `ContractType` | 1 = Probation, 2 = FixedTerm1Year, 3 = FixedTerm3Year, 4 = Permanent, 5 = Seasonal |
| `CountScope` | 0 = Full, 1 = ByCategory |
| `CountSessionStatus` | 0 = Open, 1 = InProgress, 2 = PendingApproval, 3 = Approved, 4 = Cancelled |
| `Currency` | 0 = USD, 1 = VND |
| `DNReason` | 0 = Sale, 1 = Transfer, 2 = WarrantyReplace, 3 = Defect, 4 = Other |
| `DNStatus` | 0 = Draft, 1 = Confirmed, 2 = Cancelled |
| `DependentRelation` | 1 = Child, 2 = Spouse, 3 = Parent, 4 = Other |
| `DiscountType` | 0 = Percentage, 1 = FixedAmount |
| `EmployeeStatus` | 0 = Active, 1 = Inactive, 2 = OnLeave, 3 = OnProbation, 4 = Resigned, 5 = Terminated |
| `ExpenseStatus` | 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Paid |
| `FlashSaleStatus` | 0 = Scheduled, 1 = Active, 2 = Ended, 3 = Cancelled |
| `FulfillmentStatus` | 0 = Pending, 1 = PartiallyFulfilled, 2 = Fulfilled, 3 = Returned |
| `GRNSource` | 1 = Purchase, 2 = CustomerReturn, 3 = Transfer, 4 = Adjustment |
| `GRNStatus` | 0 = Draft, 1 = Confirmed, 2 = Cancelled |
| `InstallmentStatus` | 0 = PendingApproval, 1 = Approved, 2 = Rejected, 3 = Active, 4 = Completed |
| `InvoiceStatus` | 0 = Draft, 1 = Issued, 2 = PartiallyPaid, 3 = Paid, 4 = Overdue, 5 = Cancelled |
| `InvoiceType` | 0 = Receivable, 1 = Payable |
| `JobStatus` | 0 = Draft, 1 = Active, 2 = Closed, 3 = Archived |
| `LandedCostAllocationMethod` | 1 = ByValue, 2 = ByWeight, 3 = ByQuantity |
| `LandedCostType` | 1 = Shipping, 2 = ImportTax, 3 = CustomsFee, 4 = Insurance, 99 = Other |
| `LeaveType` | 0 = Annual, 1 = Sick, 2 = Unpaid, 3 = Personal, 4 = Maternity, 5 = Paternity, 6 = Bereavement, 7 = Compassionate, 8 = Study, 9 = JuryDuty |
| `LoanerStatus` | 1 = Loaned, 2 = Returned, 3 = Lost, 4 = Damaged |
| `LoyaltyTier` | 0 = Bronze, 1 = Silver, 2 = Gold, 3 = Platinum, 4 = Diamond |
| `LoyaltyTransactionType` | 0 = Earn, 1 = Redeem, 2 = Expired, 3 = Adjustment, 4 = Refund, 5 = Bonus, 6 = Referral |
| `MediaType` | 1 = Image, 2 = Video, 3 = YoutubeEmbed |
| `MenuItemType` | 0 = Custom, 1 = Page, 2 = Category, 3 = Product, 4 = Homepage, 5 = Contact |
| `MenuLocation` | 0 = HeaderMain, 1 = HeaderTop, 2 = FooterMain, 3 = FooterBottom, 4 = Sidebar, 5 = Mobile |
| `MonthlyTimesheetStatus` | 0 = Draft, 1 = Locked |
| `MovementType` | 0 = In, 1 = Out, 2 = Transfer, 3 = Adjustment, 4 = Reserved, 5 = Released |
| `OptionInputType` | 1 = Dropdown, 2 = Swatch, 3 = Button |
| `OrderStatus` | 0 = Pending, 1 = Confirmed, 1 = Processing, 2 = Paid, 3 = Fulfilled, 4 = Completed, 5 = Shipped, 6 = Delivered, 7 = Draft, 99 = Cancelled |
| `OvertimeStatus` | 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Executed, 4 = Cancelled |
| `POApprovalDecision` | 0 = Pending, 1 = Approved, 2 = Rejected |
| `POStatus` | 0 = Draft, 1 = Sent, 2 = PartialReceived, 3 = Received, 4 = Cancelled, 5 = PendingApproval, 6 = Approved, 7 = Rejected |
| `PageType` | 0 = Custom, 1 = About, 2 = Contact, 3 = FAQ, 4 = Terms, 5 = Privacy, 6 = Shipping, 7 = Returns, 8 = Warranty |
| `PaymentMethod` | 0 = Cash, 1 = BankTransfer, 2 = CreditCard, 3 = Momo, 4 = ZaloPay, 5 = VnPay |
| `PaymentProvider` | 0 = Stripe, 1 = VnPay, 2 = Momo, 3 = COD, 4 = SePay, 5 = ZaloPay |
| `PaymentStatus` | 0 = Pending, 1 = Succeeded, 2 = Failed, 3 = Cancelled, 4 = Refunded |
| `PaymentStatus` | 0 = Pending, 1 = PartiallyPaid, 2 = Paid, 3 = Refunded, 4 = Failed |
| `PaymentTermType` | 0 = COD, 1 = NET7, 2 = NET15, 3 = NET30, 4 = NET45, 5 = NET60, 6 = Prepaid, 7 = Custom |
| `PayrollLineType` | 1 = BaseSalary, 2 = Allowance, 3 = Overtime, 4 = Bonus, 5 = InsuranceEmployee, 6 = PersonalDeduction, 7 = DependentDeduction, 8 = Pit, 9 = LateFine, 10 = Advance, 11 = OtherDeduction |
| `PayrollRunStatus` | 0 = Draft, 1 = Calculated, 2 = Approved, 3 = Paid, 4 = Cancelled |
| `PayrollStatus` | 0 = Draft, 1 = Calculated, 2 = Approved, 3 = Processed, 4 = Paid |
| `PostStatus` | 0 = Draft, 1 = Published |
| `PostType` | 0 = News, 1 = Article, 2 = Promotion |
| `ProductStatus` | 0 = InStock, 1 = LowStock, 2 = OutOfStock, 3 = PreOrder |
| `PromotionDiscountType` | 1 = Percent, 2 = Fixed, 3 = FreeShip, 4 = BuyXGetY, 5 = Tiered |
| `PromotionStatus` | 1 = Draft, 2 = Active, 3 = Paused, 4 = Expired |
| `PromotionType` | 1 = Code, 2 = Automatic, 3 = FlashSale |
| `PurchaseRequisitionStatus` | 0 = Draft, 1 = Submitted, 2 = Approved, 3 = Rejected, 4 = ConvertedToPO, 5 = Cancelled |
| `PurchaseReturnStatus` | 0 = Draft, 1 = Sent, 2 = Accepted, 3 = Refunded, 4 = Cancelled |
| `ReceivedCondition` | 1 = Intact, 2 = UsedGood, 3 = DefectiveTechnical, 4 = UserDamage, 5 = MissingAccessories |
| `RequestStatus` | 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Cancelled |
| `ReservationStatus` | 0 = Active, 1 = Fulfilled, 2 = Released, 3 = Expired |
| `ResolutionPreference` | 0 = Repair, 1 = Replace, 2 = Refund |
| `ReturnStatus` | 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Refunded, 4 = Completed, 5 = Cancelled |
| `ReturnType` | 1 = Refund, 2 = Exchange, 3 = Replace |
| `RfqStatus` | 0 = Draft, 1 = Sent, 2 = ClosedForBidding, 3 = Awarded, 4 = Cancelled |
| `RmaStatus` | 1 = Draft, 2 = Sent, 3 = Received, 4 = Closed |
| `SerialStatus` | 0 = InStock, 1 = Reserved, 2 = Sold, 3 = Returned, 4 = Defective, 5 = InRepair, 6 = Scrapped |
| `ShiftStatus` | 0 = Open, 1 = Closed |
| `SpecDataType` | 1 = Text, 2 = Number, 3 = Boolean, 4 = Enum |
| `SupplierQuotationStatus` | 0 = Received, 1 = Awarded, 2 = Rejected, 3 = Expired |
| `SupplierType` | 0 = Manufacturer, 1 = Distributor, 2 = Wholesaler, 3 = Agent, 4 = Retailer, 5 = Importer |
| `TargetDevice` | 0 = All, 1 = Desktop, 2 = Mobile |
| `TimesheetStatus` | 0 = Pending, 1 = Approved, 2 = Rejected |
| `TransactionType` | 0 = Debit, 1 = Credit |
| `TransferStatus` | 0 = Pending, 1 = Approved, 2 = Shipped, 3 = Received, 4 = Cancelled |
| `UrgencyLevel` | 0 = Low, 1 = Medium, 2 = High, 3 = Urgent |
| `VariantStatus` | 1 = InStock, 2 = LowStock, 3 = OutOfStock, 4 = Discontinued |
| `WarehouseType` | 0 = Main, 1 = Branch, 2 = Transit, 3 = Showroom, 4 = Returns, 5 = Defective |
| `WarrantyProvider` | 1 = Manufacturer, 2 = Store |
| `WarrantyStatus` | 0 = Active, 1 = Expired, 2 = Voided |

## Cột nào lưu enum nào (101 cột)

| Module | Bảng | Cột | Enum | Kiểu cột |
|---|---|---|---|---|
| Accounting | `public.Expenses` | `Currency` | `Currency` | integer |
| Accounting | `public.Expenses` | `PaymentMethod` | `PaymentMethod` | integer |
| Accounting | `public.Expenses` | `Status` | `ExpenseStatus` | integer |
| Accounting | `public.Invoices` | `AgingBucket` | `AgingBucket` | integer |
| Accounting | `public.Invoices` | `Currency` | `Currency` | integer |
| Accounting | `public.Invoices` | `Status` | `InvoiceStatus` | integer |
| Accounting | `public.Invoices` | `Type` | `InvoiceType` | integer |
| Accounting | `public.LedgerEntry` | `Currency` | `Currency` | integer |
| Accounting | `public.LedgerEntry` | `Type` | `TransactionType` | integer |
| Accounting | `public.Payment` | `Method` | `PaymentMethod` | integer |
| Accounting | `public.ShiftSessions` | `Status` | `ShiftStatus` | integer |
| Accounting | `public.ShiftTransaction` | `Type` | `TransactionType` | integer |
| Catalog | `public.ProductMedias` | `Type` | `MediaType` | integer |
| Catalog | `public.ProductOptionTypes` | `InputType` | `OptionInputType` | integer |
| Catalog | `public.ProductVariants` | `Status` | `VariantStatus` | integer |
| Catalog | `public.Products` | `Status` | `ProductStatus` | integer |
| Catalog | `public.SpecificationAttributes` | `DataType` | `SpecDataType` | integer |
| Content | `content.Banners` | `Device` | `TargetDevice` | integer |
| Content | `content.Banners` | `Position` | `BannerPosition` | integer |
| Content | `content.Coupons` | `DiscountType` | `DiscountType` | integer |
| Content | `content.FlashSales` | `DiscountType` | `DiscountType` | integer |
| Content | `content.FlashSales` | `Status` | `FlashSaleStatus` | integer |
| Content | `content.MenuItem` | `Type` | `MenuItemType` | integer |
| Content | `content.Menus` | `Location` | `MenuLocation` | integer |
| Content | `content.Pages` | `Type` | `PageType` | integer |
| Content | `content.PromotionConditions` | `Operator` | `ConditionOperator` | integer |
| Content | `content.PromotionConditions` | `Type` | `ConditionType` | integer |
| Content | `content.Promotions` | `DiscountType` | `PromotionDiscountType` | integer |
| Content | `content.Promotions` | `Status` | `PromotionStatus` | integer |
| Content | `content.Promotions` | `Type` | `PromotionType` | integer |
| Content | `content.contact_messages` | `status` | `ContactMessageStatus` | integer |
| Content | `content.posts` | `Status` | `PostStatus` | integer |
| Content | `content.posts` | `Type` | `PostType` | integer |
| HR | `hr.ApprovalRequests` | `Status` | `ApprovalStatus` | integer |
| HR | `hr.ApprovalRequests` | `Type` | `ApprovalType` | integer |
| HR | `hr.AttendanceRecords` | `CheckInMethod` | `CheckInMethod` | integer |
| HR | `hr.AttendanceRecords` | `Status` | `AttendanceStatus` | integer |
| HR | `hr.Dependents` | `Relation` | `DependentRelation` | integer |
| HR | `hr.EmployeeAssets` | `ConditionOnAssign` | `AssetCondition` | integer |
| HR | `hr.EmployeeAssets` | `ConditionOnReturn` | `AssetCondition` | integer |
| HR | `hr.Employees` | `Status` | `EmployeeStatus` | integer |
| HR | `hr.EmploymentContracts` | `Status` | `ContractStatus` | integer |
| HR | `hr.EmploymentContracts` | `Type` | `ContractType` | integer |
| HR | `hr.JobListings` | `Status` | `JobStatus` | integer |
| HR | `hr.LeaveRequests` | `Status` | `RequestStatus` | integer |
| HR | `hr.LeaveRequests` | `Type` | `LeaveType` | integer |
| HR | `hr.MonthlyTimesheets` | `Status` | `MonthlyTimesheetStatus` | integer |
| HR | `hr.OvertimeRequests` | `Status` | `OvertimeStatus` | integer |
| HR | `hr.PayrollLineItems` | `Type` | `PayrollLineType` | integer |
| HR | `hr.PayrollRuns` | `Status` | `PayrollRunStatus` | integer |
| HR | `hr.Payrolls` | `Status` | `PayrollStatus` | integer |
| HR | `hr.ShiftAssignments` | `Status` | `AssignmentStatus` | integer |
| HR | `hr.Timesheets` | `Status` | `TimesheetStatus` | integer |
| Inventory | `public.DeliveryNotes` | `Reason` | `DNReason` | integer |
| Inventory | `public.DeliveryNotes` | `Status` | `DNStatus` | integer |
| Inventory | `public.GoodsReceivedNotes` | `Source` | `GRNSource` | integer |
| Inventory | `public.GoodsReceivedNotes` | `Status` | `GRNStatus` | integer |
| Inventory | `public.InventoryCountSessions` | `Scope` | `CountScope` | integer |
| Inventory | `public.InventoryCountSessions` | `Status` | `CountSessionStatus` | integer |
| Inventory | `public.LandedCosts` | `Method` | `LandedCostAllocationMethod` | integer |
| Inventory | `public.LandedCosts` | `Type` | `LandedCostType` | integer |
| Inventory | `public.POApprovalRequests` | `Decision` | `POApprovalDecision` | integer |
| Inventory | `public.PurchaseOrders` | `Status` | `POStatus` | integer |
| Inventory | `public.PurchaseRequisitions` | `Status` | `PurchaseRequisitionStatus` | integer |
| Inventory | `public.PurchaseRequisitions` | `Urgency` | `UrgencyLevel` | integer |
| Inventory | `public.PurchaseReturns` | `Status` | `PurchaseReturnStatus` | integer |
| Inventory | `public.RequestForQuotations` | `Status` | `RfqStatus` | integer |
| Inventory | `public.SerialNumbers` | `Status` | `SerialStatus` | integer |
| Inventory | `public.StockAdjustments` | `Type` | `AdjustmentType` | integer |
| Inventory | `public.StockMovements` | `Type` | `MovementType` | integer |
| Inventory | `public.StockReservations` | `Status` | `ReservationStatus` | integer |
| Inventory | `public.StockTransfers` | `Status` | `TransferStatus` | integer |
| Inventory | `public.SupplierQuotations` | `PaymentTermType` | `PaymentTermType` | integer |
| Inventory | `public.SupplierQuotations` | `Status` | `SupplierQuotationStatus` | integer |
| Inventory | `public.Suppliers` | `PaymentTerms` | `PaymentTermType` | integer |
| Inventory | `public.Suppliers` | `SupplierType` | `SupplierType` | integer |
| Inventory | `public.Warehouses` | `Type` | `WarehouseType` | integer |
| Payments | `payments.PaymentIntents` | `Provider` | `PaymentProvider` | integer |
| Payments | `payments.PaymentIntents` | `Status` | `PaymentStatus` | integer |
| Sales | `public.CheckoutSessions` | `Status` | `CheckoutSessionStatus` | integer |
| Sales | `public.InstallmentApplications` | `Status` | `InstallmentStatus` | integer |
| Sales | `public.LoyaltyAccounts` | `Tier` | `LoyaltyTier` | integer |
| Sales | `public.LoyaltyTransactions` | `Type` | `LoyaltyTransactionType` | integer |
| Sales | `public.OrderHistories` | `FromStatus` | `OrderStatus` | integer |
| Sales | `public.OrderHistories` | `ToStatus` | `OrderStatus` | integer |
| Sales | `public.Orders` | `FulfillmentStatus` | `FulfillmentStatus` | integer |
| Sales | `public.Orders` | `PaymentStatus` | `PaymentStatus` | integer |
| Sales | `public.Orders` | `Status` | `OrderStatus` | integer |
| Sales | `public.ReturnRequests` | `ReceivedCondition` | `ReceivedCondition` | integer |
| Sales | `public.ReturnRequests` | `Status` | `ReturnStatus` | integer |
| Sales | `public.ReturnRequests` | `Type` | `ReturnType` | integer |
| SystemConfig | `config.Configurations` | `ValueType` | `ConfigValueType` | character varying(20) |
| Warranty | `public.Claims` | `ClaimType` | `ClaimType` | integer |
| Warranty | `public.Claims` | `PreferredResolution` | `ResolutionPreference` | integer |
| Warranty | `public.Claims` | `Status` | `ClaimStatus` | integer |
| Warranty | `public.LoanerDevices` | `Status` | `LoanerStatus` | integer |
| Warranty | `public.Policies` | `Provider` | `WarrantyProvider` | integer |
| Warranty | `public.ProductWarranties` | `Provider` | `WarrantyProvider` | integer |
| Warranty | `public.ProductWarranties` | `Status` | `WarrantyStatus` | integer |
| Warranty | `public.Rmas` | `Status` | `RmaStatus` | integer |
| Warranty | `public.SlaPolicies` | `ClaimType` | `ClaimType` | integer |
<!-- END GENERATED: database-enums -->
