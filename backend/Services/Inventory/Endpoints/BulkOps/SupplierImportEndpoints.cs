using BuildingBlocks.Caching;
using BuildingBlocks.Security;
using InventoryModule.Application.BulkOps;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace InventoryModule.Endpoints.BulkOps;

/// <summary>
/// <c>POST /api/inventory/bulk/suppliers</c> (phase-67 Requirements / Implementation Steps #4).
/// Gated by <c>Inventory.CreateSupplier</c> — the phase file names no permission for this
/// endpoint; this is the closest existing one (it already governs single-supplier creation) and
/// avoids adding a new permission constant this track does not own the enum for (see report).
/// </summary>
internal static class SupplierImportEndpoints
{
    private const string Xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public static void MapSupplierImportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/suppliers").RequirePermission(Permissions.Inventory.CreateSupplier);

        group.MapGet("template", async (InventoryDbContext db, CancellationToken ct) =>
        {
            var bytes = await new SupplierImportService(db).BuildTemplateAsync(ct);
            return Results.File(bytes, Xlsx, "mau-nha-cung-cap.xlsx");
        });

        group.MapPost("", async (IFormFile file, string? mode, InventoryDbContext db, ICacheService cache, CancellationToken ct) =>
        {
            var resolvedMode = mode == "commit" ? "commit" : "dryRun";
            await using var validated = await BulkUploadGuard.ReadAndValidateAsync(file.OpenReadStream(), file.FileName, ct);

            var service = new SupplierImportService(db);
            var (report, parsed, pipeline) = await service.RunAsync(validated, resolvedMode, ct);

            string? errorWorkbookToken = null;
            if (!report.IsValid && parsed.Errors.Count > 0)
            {
                var workbook = pipeline.BuildErrorWorkbook(parsed);
                errorWorkbookToken = await new BulkOpsErrorWorkbookCache(cache).StoreAsync(workbook, ct);
            }

            return Results.Ok(new
            {
                mode = report.Mode,
                totalRows = report.TotalRows,
                created = report.Created,
                matched = report.Matched,
                errors = report.Errors.Select(e => new { row = e.RowNumber, column = e.Column, message = e.Message }),
                errorWorkbookToken,
            });
        }).DisableAntiforgery();

        group.MapGet("errors/{token}", async (string token, ICacheService cache, CancellationToken ct) =>
        {
            var bytes = await new BulkOpsErrorWorkbookCache(cache).TryGetAsync(token, ct);
            return bytes is null
                ? Results.NotFound(new { error = "Tệp lỗi đã hết hạn (giữ 24h) hoặc không tồn tại." })
                : Results.File(bytes, Xlsx, "loi-nha-cung-cap.xlsx");
        });
    }
}
