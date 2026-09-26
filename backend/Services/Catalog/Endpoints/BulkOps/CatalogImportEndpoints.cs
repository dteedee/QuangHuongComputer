using System.Security.Claims;
using BuildingBlocks.Security;
using Catalog.Application.BulkOps;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using BuildingBlocks.Endpoints;

namespace Catalog.Endpoints.BulkOps;

/// <summary>Import xlsx (Requirements: "download a template; mode=dryRun|commit,
/// onDuplicate=skip|update, at most 5.000 rows").</summary>
public static class CatalogImportEndpoints
{
    private const string Xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public static void MapCatalogImportEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/products/template", async (ProductImportService service, CancellationToken ct) =>
        {
            var bytes = await service.BuildTemplateAsync(ct);
            return Results.File(bytes, Xlsx, "mau-nhap-san-pham.xlsx");
        }).RequireAuthorization(Permissions.Catalog.Import);

        group.MapPost("/products/import", async (
            IFormFile file,
            string? mode,
            string? onDuplicate,
            ProductImportService importService,
            ErrorWorkbookCache errorCache,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var resolvedMode = mode == "commit" ? "commit" : "dryRun";
            var resolvedOnDuplicate = onDuplicate == "update" ? "update" : "skip";

            if (file.Length == 0) return Results.BadRequest(new { error = "Chưa chọn tệp." });
            if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "Chỉ nhận tệp .xlsx." });

            var actorId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            ExcelImportOutcome outcome;
            try
            {
                await using var stream = file.OpenReadStream();
                var (report, parsed, pipeline) = await importService.RunAsync(
                    stream, resolvedMode, resolvedOnDuplicate, file.FileName, actorId, ct);
                outcome = new ExcelImportOutcome(report, parsed, pipeline);
            }
            catch (InvalidDataException ex)
            {
                // Lỗi CẤU TRÚC tệp (thiếu cột, quá 5.000 dòng, quá dung lượng...) - api-conventions.md §7.
                return Results.BadRequest(new { error = ClientSafeError.Message(ex) });
            }

            string? errorWorkbookToken = null;
            if (!outcome.Report.IsValid && outcome.Parsed.Errors.Count > 0)
            {
                var workbook = outcome.Pipeline.BuildErrorWorkbook(outcome.Parsed);
                errorWorkbookToken = await errorCache.StoreAsync(workbook, ct);
            }

            return Results.Ok(new
            {
                mode = outcome.Report.Mode,
                created = outcome.Report.Created,
                updated = outcome.Report.Updated,
                skipped = outcome.Report.Skipped,
                totalRows = outcome.Report.TotalRows,
                errors = outcome.Report.Errors.Select(e => new { row = e.RowNumber, column = e.Column, message = e.Message }),
                warnings = outcome.Report.Warnings,
                renames = outcome.Report.Renames,
                errorWorkbookToken,
            });
        })
        .RequireAuthorization(Permissions.Catalog.Import)
        .DisableAntiforgery();

        group.MapGet("/products/import/errors/{token}", async (string token, ErrorWorkbookCache cache, CancellationToken ct) =>
        {
            var bytes = await cache.TryGetAsync(token, ct);
            return bytes is null
                ? Results.NotFound(new { error = "Tệp lỗi đã hết hạn (giữ 24h) hoặc không tồn tại." })
                : Results.File(bytes, Xlsx, "loi-nhap-san-pham.xlsx");
        }).RequireAuthorization(Permissions.Catalog.Import);
    }

    private sealed record ExcelImportOutcome(
        ProductImportReport Report,
        BuildingBlocks.Spreadsheet.ExcelImportResult<ProductImportRow> Parsed,
        BuildingBlocks.Spreadsheet.ExcelImportPipeline<ProductImportRow> Pipeline);
}
