using BuildingBlocks.Security;
using Accounting;
using ApiGateway;
using ApiGateway.Startup;
using Catalog;
using Communication;
using CRM;
using Content;
using DotNetEnv;
using HR;
using Identity;
using InventoryModule;
using Payments;
using Repair;
using Reporting;
using Sales;
using Sales.Infrastructure.Shipping;
using SystemConfig;
using Warranty;
using Ai;
using Ai.Application;

Env.TraversePath().Load();

// Preserve legacy PostgreSQL timestamp behavior (DateTime → "timestamp without time zone")
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// The command-line configuration provider treats a `--flag` that carries no `=` as a KEY whose
// value is the NEXT token. `db reset --demo --ConnectionStrings:DefaultConnection=<X>` therefore
// made `--demo` swallow the connection string, and the destructive verb ran against the database
// in appsettings instead of the one the operator named - the exact "reset pointed at the wrong
// database" accident the name guard exists to catch. Hide the verb's valueless flags from the
// builder; DatabaseMigrationRunner still parses the untouched `args`.
var builder = WebApplication.CreateBuilder(DatabaseMigrationRunner.ConfigurationArgs(args));

// -- Structured logging --------------------------------------------------------
LoggingSetup.Configure(builder);

// -- Service registration ------------------------------------------------------
ServiceRegistration.RegisterAll(builder);
AuthenticationSetup.Configure(builder);

var app = builder.Build();

// -- Maintenance CLI -----------------------------------------------------------
// `dotnet ApiGateway.dll db migrate | db seed --profile <p> | db reset --demo` runs the verb and
// exits with its status code WITHOUT starting the HTTP server: a fresh machine has to be able to
// build its database before anything can listen on a port. See DatabaseMigrationRunner and
// docs/deployment-guide.md.
if (DatabaseMigrationRunner.IsDbCommand(args))
{
    return await DatabaseMigrationRunner.RunCommandAsync(app, args);
}

// -- Database migrations + seeding --------------------------------------------
// Runs in every environment (gated by Database:AutoMigrate / Database:AutoSeed; both default to
// true in Development, false elsewhere). In Production a migration failure aborts startup.
await DatabaseMigrationRunner.RunAsync(app);

// -- Schema drift guard --------------------------------------------------------
// "All migrations applied" does not mean "all tables exist": payments.PaymentIntents was mapped by
// the model and dropped by a Down() that had no matching Up() for months. Fail fast instead.
await SchemaSmokeCheck.RunAsync(app);

// -- HTTP pipeline -------------------------------------------------------------
MiddlewarePipeline.Configure(app);

// -- Media upload endpoint -----------------------------------------------------
// Handled by Content.MediaEndpoints (MapCatalogMediaEndpoints) with auth + FileValidator.

// -- SignalR hubs --------------------------------------------------------------
app.MapHub<Communication.Hubs.ChatHub>("/hubs/chat");
app.MapHub<Communication.Hubs.NotificationHub>("/hubs/notification");

// -- Health checks -------------------------------------------------------------
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false
});

// -- Module endpoints ----------------------------------------------------------
app.MapSitemapEndpoints();
app.MapCatalogEndpoints();
app.MapAiEndpoints();
app.MapRecommendationEndpoints();
app.MapSemanticSearchEndpoints();
app.MapAiPCBuilderEndpoints();
app.MapCatalogPCBuilderEndpoints();
app.MapCatalogBundleEndpoints();
app.MapCatalogMediaEndpoints();
app.MapMediaEndpoints();
app.MapCatalogVariantEndpoints();
app.MapCatalogSpecificationEndpoints();
app.MapIdentityEndpoints();
app.MapTwoFactorEndpoints();
app.MapSessionEndpoints();
app.MapSalesEndpoints();
app.MapCheckoutEndpoints();
app.MapInstallmentEndpoints();
app.MapAddressBookEndpoints();
app.MapShippingEndpoints();
app.MapRepairEndpoints();
app.MapWarrantyEndpoints();
// Phase 07: RMA, LoanerDevice, PublicLookup, ReturnPolicy
app.MapWarrantyRmaEndpoints();
app.MapLoanerDeviceEndpoints();
app.MapPublicWarrantyLookupEndpoints();
app.MapReturnPolicyEndpoints();
app.MapPaymentsEndpoints();
app.MapPaymentWebhookEndpoints();
app.MapContentEndpoints();
app.MapPromotionEndpoints();
app.MapCommunicationEndpoints();
app.MapHREndpoints();
app.MapHRLeaveEndpoints();
app.MapAttendanceEndpoints();
app.MapApprovalEndpoints();
app.MapSelfServiceEndpoints();
// Phase 06 luồng A — tax engine + nhân sự mở rộng
app.MapDependentEndpoints();
app.MapContractEndpoints();
app.MapSalaryStructureEndpoints();
app.MapPitFinalizationEndpoints();
app.MapSystemConfigEndpoints();
// Phase 06 luồng B — chấm công + OT + payroll run + tài sản
app.MapOvertimeEndpoints();
app.MapPayrollEndpoints();
app.MapEmployeeAssetEndpoints();
app.MapBackofficeMenuEndpoints();
app.MapCustomFieldEndpoints();
app.MapFormDefinitionEndpoints();
app.MapTableViewEndpoints();
app.MapAutomationRuleEndpoints();
app.MapInventoryEndpoints();
app.MapGoodsReceivedNoteEndpoints();
app.MapDeliveryNoteEndpoints();
app.MapInventoryCountEndpoints();
app.MapBarcodeEndpoints();
app.MapWarehouseEndpoints();
// Phase 05 luồng A — quy trình mua hàng chuyên nghiệp
app.MapPoApprovalEndpoints();
app.MapPurchaseRequisitionEndpoints();
app.MapRfqEndpoints();
app.MapPurchaseReturnEndpoints();
app.MapLandedCostEndpoints();
app.MapSupplierScorecardEndpoints();
app.MapStoreEndpoints();
app.MapAccountingEndpoints();
app.MapEInvoiceEndpoints();
app.MapTaxReportingEndpoints();
app.MapReportingEndpoints();
app.MapCrmEndpoints();

// -- Audit / system management -------------------------------------------------
app.MapAuditLogEndpoints();
app.MapBackupEndpoints();

// -- Fast checkout hợp nhất vào CheckoutOrchestrator (Phase 04) --
// Legacy alias /api/sales/fast-checkout được giữ trong CheckoutEndpoints.cs.

app.MapControllers();

// Kiểm tra phân quyền toàn bộ route NGAY SAU khi mọi app.Map* đã chạy (W1-1, IR w1-1 #7).
// Bắt buộc gọi ở đây: WebApplication giữ EndpointDataSource trong chính nó
// (IEndpointRouteBuilder.DataSources) chứ KHÔNG đăng ký vào DI, nên một hosted service
// đọc DI sẽ luôn thấy 0 endpoint và âm thầm bỏ qua — trông y hệt một bảng route sạch.
// Cờ Security:EndpointAuthorizationAudit:FailOnViolation biến cảnh báo thành chặn khởi động.
EndpointAuthorizationAuditor.RunOn(
    app,
    app.Services.GetRequiredService<ILogger<EndpointAuthorizationAuditor>>(),
    app.Configuration.GetValue("Security:EndpointAuthorizationAudit:FailOnViolation", false));

app.Run();
return 0;
