using BuildingBlocks.Security;
using Content.Application.Redirects;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Content.Endpoints.Redirects;

/// <summary>
/// Bulk CSV/XLSX for migrating an old website's URLs (same mode contract as the catalog import:
/// <c>mode=dryRun|commit</c>, <c>onDuplicate=skip|update</c>, at most 5.000 rows per file).
/// </summary>
public static class UrlRedirectImportExportEndpoints
{
    private const string Csv = "text/csv; charset=utf-8";

    public static void MapUrlRedirectImportExportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("template", () =>
                Results.File(UrlRedirectImportService.BuildCsvTemplate(), Csv, "mau-chuyen-huong-url.csv"))
            .RequireAuthorization(Permissions.Content.ViewRedirects);

        group.MapGet("export", async (UrlRedirectImportService service, CancellationToken ct) =>
            {
                var bytes = await service.ExportCsvAsync(ct);
                return Results.File(bytes, Csv, $"chuyen-huong-url-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
            })
            .RequireAuthorization(Permissions.Content.ViewRedirects);

        group.MapPost("import", async (
                IFormFile file,
                string? mode,
                string? onDuplicate,
                UrlRedirectImportService service,
                HttpContext http,
                CancellationToken ct) =>
            {
                if (file is null || file.Length == 0) return Results.BadRequest(new { error = "Chưa chọn tệp." });

                var name = file.FileName ?? string.Empty;
                if (!name.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
                    && !name.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
                {
                    return Results.BadRequest(new { error = "Chỉ nhận tệp .csv hoặc .xlsx." });
                }

                try
                {
                    await using var stream = file.OpenReadStream();
                    var report = await service.ImportAsync(stream, name, commit: mode == "commit",
                        updateDuplicates: onDuplicate == "update", UrlRedirectEndpoints.ActorId(http), ct);
                    return Results.Ok(new
                    {
                        mode = report.Mode,
                        totalRows = report.TotalRows,
                        created = report.Created,
                        updated = report.Updated,
                        skipped = report.Skipped,
                        committed = report.Mode == "commit" && report.IsValid,
                        errors = report.Errors.Select(e => new { row = e.RowNumber, column = e.Column, message = e.Message }),
                    });
                }
                catch (InvalidDataException ex)
                {
                    // Lỗi CẤU TRÚC tệp (thiếu cột, quá 5.000 dòng, sai mã hoá...) — api-conventions.md §7.
                    return Results.BadRequest(new { error = ex.Message });
                }
            })
            .RequireAuthorization(Permissions.Content.ManageRedirects)
            .DisableAntiforgery();
    }
}
