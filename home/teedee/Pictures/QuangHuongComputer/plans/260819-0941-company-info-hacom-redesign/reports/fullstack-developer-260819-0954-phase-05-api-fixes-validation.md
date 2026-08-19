# Phase 05 Implementation Report

## Executed Phase
- Phase: phase-05-api-fixes-and-validation
- Plan: plans/260819-0941-company-info-hacom-redesign
- Status: completed

## Mock replacement summary (8/8)
1. `TaxReportingEndpoints.cs` — vat-ledger giờ query thật `AccountingDbContext.Invoices` theo tháng/năm+type; cit-report dùng `db.Invoices`/`db.Expenses` thật + `Accounting.Domain.VietnameseTaxEngine.CalculateCit`.
2. `AccountingEndpoints.cs` — invoice HTML dùng `InvoiceHtmlTemplate.Render()` mới (dòng hàng thật qua `.Include(i => i.Lines)`, thông tin công ty thật khớp seed data). Sửa luôn GET invoice/{id} dùng Include đúng thay vì `Include("_lines")` string sai.
3. `CatalogEndpoints.cs` — sentiment rating đã thật từ trước; TopKeywords giờ tính tần suất từ Title+Comment thật qua `ReviewKeywordExtractor` (file mới, không gọi AI ngoài).
4. `RfmCalculationService.cs` — vốn đã raw-SQL thật (không phải mock), chỉ sửa comment gây hiểu lầm + fix bug filter Status sai (trước loại nhầm Completed/Shipped, không loại Cancelled).
5. `OrderPaidConsumer.cs` — bỏ fake `SN-{guid}`; giờ lấy `InventoryDbContext.SerialNumbers` InStock thật, gọi `Sell()`, publish serial thật (rỗng nếu SP không theo dõi serial — không bịa).
6. `EmailNotificationConsumers.cs` — bỏ `customer-{id}@example.com`; tra cứu email/tên thật qua `Identity.IdentityDbContext` (helper mới `CustomerContactResolver`), bỏ gửi nếu không có email.
7. `BarcodeEndpoints.cs` — Code128 chuẩn ISO/IEC 15417 (bảng pattern xác minh qua Wikipedia, checksum mod-103 thật) + QR thật qua QRCoder 1.6.0. File mới `InventoryModule.Barcode.{Code128Encoder,QrCodeSvgGenerator}`.
8. `SupplierScorecardService.cs` — thêm `PurchaseOrder.ExpectedDeliveryDate` (nullable), on-time rate join thật GRN↔PO thay vì luôn coi đúng hạn.

## New packages
- `FluentValidation.DependencyInjectionExtensions` 11.9.0 → `BuildingBlocks.csproj`
- `QRCoder` 1.6.0 → `Services/Inventory/Inventory.csproj`
- New ProjectReference: `Sales.csproj` → `Identity.csproj` (để lookup email thật; không circulaire — Identity chỉ ref BuildingBlocks)

## Migration
- `20260819030808_AddExpectedDeliveryDateToPurchaseOrder` (Inventory, nullable timestamp column, reversible Up/Down). Chạy qua `dotnet ef migrations add ... --project Services/Inventory/Inventory.csproj --startup-project ApiGateway/ApiGateway.csproj --context InventoryDbContext`.

## Validation infra (mới)
- `BuildingBlocks/Validation/ValidationEndpointFilter.cs` — endpoint filter FluentValidation, trả 400 `{ errors: [{field, message}] }`.
- `BuildingBlocks/Validation/FluentValidationExtensions.cs` — `AddApplicationValidators()` (scan assembly đã load), `WithValidation<T>()` extension trên `RouteHandlerBuilder`.
- Đăng ký trong `ApiGateway/Startup/ServiceRegistration.cs` (cuối `RegisterAll`, sau `RegisterModules` để đảm bảo assembly module đã load).
- Validators mới + wired: `CreateAccountDtoValidator`, `CreateInvoiceDtoValidator`, `ApplyAPPaymentRequestValidator` (Accounting); `CreateProductReviewDtoValidator` (Catalog, thay if-check thủ công cũ).

## Endpoints given validation
- POST `/api/accounting/accounts` — CreateAccountDto
- POST `/api/accounting/invoices` — CreateInvoiceDto
- POST `/api/accounting/ap/{id}/apply-payment` — ApplyAPPaymentRequest
- POST `/api/catalog/products/{productId}/reviews` — CreateProductReviewDto

## Build result
`dotnet build backend/ComputerCompany.sln` → **Build succeeded, 0 errors** (43 pre-existing warnings, unrelated to phase 05 changes).

## Files touched (owned)
- backend/BuildingBlocks/BuildingBlocks.csproj
- backend/BuildingBlocks/Validation/ValidationEndpointFilter.cs (new)
- backend/BuildingBlocks/Validation/FluentValidationExtensions.cs (new)
- backend/ApiGateway/Startup/ServiceRegistration.cs
- backend/Services/Accounting/TaxReportingEndpoints.cs
- backend/Services/Accounting/AccountingEndpoints.cs
- backend/Services/Accounting/Templates/InvoiceHtmlTemplate.cs (new)
- backend/Services/Accounting/Validators/CreateInvoiceDtoValidator.cs (new)
- backend/Services/Accounting/Validators/ApplyAPPaymentRequestValidator.cs (new)
- backend/Services/Catalog/CatalogEndpoints.cs
- backend/Services/Catalog/Application/Reviews/ReviewKeywordExtractor.cs (new)
- backend/Services/Catalog/Validators/CreateProductReviewDtoValidator.cs (new)
- backend/Services/CRM/Services/RfmCalculationService.cs
- backend/Services/Sales/Application/Consumers/OrderPaidConsumer.cs
- backend/Services/Sales/Application/Consumers/EmailNotificationConsumers.cs
- backend/Services/Sales/Application/Consumers/CustomerContactResolver.cs (new)
- backend/Services/Sales/Sales.csproj
- backend/Services/Inventory/BarcodeEndpoints.cs
- backend/Services/Inventory/Barcode/Code128Encoder.cs (new)
- backend/Services/Inventory/Barcode/QrCodeSvgGenerator.cs (new)
- backend/Services/Inventory/Application/Suppliers/SupplierScorecardService.cs
- backend/Services/Inventory/Domain/PurchaseOrder.cs
- backend/Services/Inventory/Inventory.csproj
- backend/Services/Inventory/Infrastructure/Data/Migrations/20260819030808_AddExpectedDeliveryDateToPurchaseOrder{.cs,.Designer.cs} (new)
- plans/260819-0941-company-info-hacom-redesign/phase-05-api-fixes-and-validation.md (Todo/status updated)

## Deviations / Issues
- File ownership respected strictly: did NOT touch SystemConfig/Identity/TaxEngine/Security/Permissions.cs or the 5 excluded Inventory endpoint files. During work observed other agents concurrently editing `BuildingBlocks/TaxEngine/VietnameseTaxEngine.cs`, Identity files, Inventory endpoint files, SystemConfig — transient build errors seen there were not mine and resolved by the time of final `ComputerCompany.sln` build (succeeded).
- `AddCompanyInfo`/company-config service: no shared company-info provider exists yet across modules; `InvoiceHtmlTemplate` uses const company fields matching the real values already seeded in `SystemConfigSeedDataCompany.cs` (verified real business info) rather than adding cross-module DB coupling, per YAGNI + file-ownership constraints.
- Did **not** wire `AddTaxSettings()` — per instruction that's the orchestrator's job.
- Critical write endpoints outside phase-05 file ownership (Sales `/api/sales/checkout` in `SalesEndpoints.cs`, Payments `CreatePaymentIntentCommand`, Inventory GRN endpoints) were **not** wired with `WithValidation<T>()` since those endpoint-registration files are not in this phase's exclusive ownership list (avoiding cross-phase file conflicts). Validation infra is ready — plug-in is a 1-line `.WithValidation<T>()` + an `AbstractValidator<T>` class once ownership is confirmed. Flagged as backlog for phase 06 / orchestrator.
- Remaining non-owned files still containing benign "mock/placeholder" strings (not this phase's targets, left as-is): `Accounting/DependencyInjection.cs` (MockEInvoiceProvider fallback — intentional pattern when `EInvoice:Provider` config unset), `Accounting/Application/Consumers/InvoiceRequestedConsumer.cs` (comment on PaymentMethod default), `Payments/PaymentsEndpoints.cs` (`/webhook/mock` explicitly dev-only), `Inventory/Application/Purchasing/LandedCostAllocator.cs` (SQL parameter placeholders — not fake data), `CRM/Services/LeadManagementService.cs` (dummy password hash for auto-created lead accounts — flagged for security review but outside phase 05 scope), `HR/Application/Payroll/PayrollCalculationService.cs` (TODO comment for future phase).

## Unresolved questions
- Should Sales/Payments/Inventory-GRN critical write endpoints get FluentValidation wired now (would require either expanding this phase's file ownership or a follow-up phase)? Recommend phase 06 or a dedicated validation-rollout task.
- `CRM/LeadManagementService.cs` dummy password hash placeholder — worth a security-focused follow-up ticket (not part of phase 05 scope).
