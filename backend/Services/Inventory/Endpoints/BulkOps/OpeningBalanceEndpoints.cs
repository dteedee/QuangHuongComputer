using System.Security.Claims;
using BuildingBlocks.Caching;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using InventoryModule.Application.BulkOps;
using InventoryModule.Application.Stock;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace InventoryModule.Endpoints.BulkOps;

/// <summary>
/// <c>POST /api/inventory/bulk/opening-balances</c> (phase-67 Requirements): dry-run and commit,
/// gated by <c>Inventory.ImportOpening</c> (D10). Rejects any pair that already has stock or a
/// movement — see <see cref="OpeningBalanceRowValidator"/>.
/// </summary>
internal static class OpeningBalanceEndpoints
{
    private const string Xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public static void MapOpeningBalanceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/opening-balances").RequirePermission(Permissions.Inventory.ImportOpening);

        group.MapGet("template", async (CatalogDbContext catalog, InventoryDbContext db, IStockLedger ledger, CancellationToken ct) =>
        {
            var bytes = await new OpeningBalanceImportService(catalog, db, ledger).BuildTemplateAsync(ct);
            return Results.File(bytes, Xlsx, "mau-ton-dau-ky.xlsx");
        });

        group.MapPost("", async (
            IFormFile file, string? mode,
            CatalogDbContext catalog, InventoryDbContext db, IStockLedger ledger, ICacheService cache,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var resolvedMode = mode == "commit" ? "commit" : "dryRun";
            await using var validated = await BulkUploadGuard.ReadAndValidateAsync(file.OpenReadStream(), file.FileName, ct);

            var service = new OpeningBalanceImportService(catalog, db, ledger);
            var performedBy = StockLedgerContext.ResolveActor(user);
            var (report, parsed, pipeline) = await service.RunAsync(validated, resolvedMode, performedBy, file.FileName, ct);

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
                committed = report.Committed,
                errors = report.Errors.Select(e => new { row = e.RowNumber, column = e.Column, message = e.Message }),
                errorWorkbookToken,
            });
        }).DisableAntiforgery();

        group.MapGet("errors/{token}", async (string token, ICacheService cache, CancellationToken ct) =>
        {
            var bytes = await new BulkOpsErrorWorkbookCache(cache).TryGetAsync(token, ct);
            return bytes is null
                ? Results.NotFound(new { error = "Tệp lỗi đã hết hạn (giữ 24h) hoặc không tồn tại." })
                : Results.File(bytes, Xlsx, "loi-ton-dau-ky.xlsx");
        });
    }
}
