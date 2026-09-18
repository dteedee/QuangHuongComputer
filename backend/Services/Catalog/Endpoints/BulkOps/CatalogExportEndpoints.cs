using BuildingBlocks.Security;
using Catalog.Application.BulkOps;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Catalog.Endpoints.BulkOps;

/// <summary>Implementation Steps #5: xlsx export using the same columns as the import template
/// (round-trip). Replaces W2-1's CSV export - see the track report for why nothing was deleted.</summary>
public static class CatalogExportEndpoints
{
    public static void MapCatalogExportEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/products/export", async (
            Guid? categoryId, Guid? brandId, string? ids,
            ProductExportService service, CancellationToken ct) =>
        {
            List<Guid>? idList = null;
            if (!string.IsNullOrWhiteSpace(ids))
            {
                idList = new List<Guid>();
                foreach (var part in ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    if (!Guid.TryParse(part, out var id))
                        return Results.BadRequest(new { error = $"id không hợp lệ: '{part}'." });
                    idList.Add(id);
                }
            }

            var bytes = await service.ExportAsync(categoryId, brandId, idList, ct);
            return Results.File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"san-pham-{DateTime.UtcNow:yyyyMMdd-HHmm}.xlsx");
        }).RequireAuthorization(Permissions.Catalog.Export);
    }
}
