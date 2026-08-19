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

var builder = WebApplication.CreateBuilder(args);

// -- Service registration ------------------------------------------------------
ServiceRegistration.RegisterAll(builder);
AuthenticationSetup.Configure(builder);

var app = builder.Build();

// -- Database migrations + seeding --------------------------------------------
// Runs in every environment (gated by Database:AutoMigrate config; default true in Dev, false in Prod).
// In Production a migration failure aborts startup — see DatabaseMigrationRunner.
await DatabaseMigrationRunner.RunAsync(app);

// -- HTTP pipeline -------------------------------------------------------------
MiddlewarePipeline.Configure(app);

// -- Media upload endpoint -----------------------------------------------------
app.MapPost("/api/media/upload", async (IFormFile file, IWebHostEnvironment env, HttpContext context) =>
{
    if (file == null || file.Length == 0)
        return Results.BadRequest("No file uploaded");

    var uploadsFolder = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads");
    if (!Directory.Exists(uploadsFolder))
        Directory.CreateDirectory(uploadsFolder);

    var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    var filePath = Path.Combine(uploadsFolder, fileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    var baseUrl = $"{context.Request.Scheme}://{context.Request.Host}";
    var fileUrl = $"{baseUrl}/uploads/{fileName}";

    return Results.Ok(new { Url = fileUrl });
}).DisableAntiforgery();

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

app.Run();
