using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using InventoryModule.Application.BulkOps;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace InventoryModule.Endpoints.BulkOps;

/// <summary>
/// <c>GET /api/inventory/bulk/label-data</c> (phase-67 Implementation Steps #5): by SKU list or by
/// GRN. Gated by <c>Inventory.ViewStock</c> — the phase file says "Inventory.View", which does not
/// exist in <c>PermissionsCommerce.cs</c>; <c>ViewStock</c> is what <c>BarcodeEndpoints.cs</c>
/// already uses for the same class of read (barcode/QR image lookup), so this stays consistent
/// with that precedent rather than adding a near-duplicate permission (see report).
/// </summary>
internal static class LabelDataEndpoints
{
    public static void MapLabelDataEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/label-data", async (
            string? skus, Guid? grnId,
            CatalogDbContext catalog, InventoryDbContext db, CancellationToken ct) =>
        {
            var builder = new LabelDataBuilder(catalog, db);

            if (grnId is { } id)
            {
                var byGrn = await builder.ByGrnAsync(id, ct);
                return Results.Ok(new { items = byGrn });
            }

            if (string.IsNullOrWhiteSpace(skus))
                throw new RequestValidationException("skus", "Phải truyền danh sách SKU (skus=SKU1,SKU2) hoặc grnId.");

            var skuList = skus.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
            var bySkus = await builder.BySkusAsync(skuList, ct);
            return Results.Ok(new { items = bySkus });
        }).RequirePermission(Permissions.Inventory.ViewStock);
    }
}
