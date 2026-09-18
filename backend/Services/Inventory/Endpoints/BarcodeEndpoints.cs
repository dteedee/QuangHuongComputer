using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using InventoryModule.Barcode;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Mã vạch / QR (W2-5). Toàn bộ nhóm chỉ đọc và lộ SKU + serial nội bộ nên đứng sau
/// <c>Inventory.ViewStock</c> — W0-3 dùng danh sách role, W1-1 thay bằng permission
/// (integration request W0 #43): ở đây là permission, không còn chuỗi role nào.
/// </summary>
public sealed class BarcodeEndpoints : IInventorySubmodule
{
    public int Order => 90;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory")
            .RequireModulePermissions(PermissionModules.Inventory);

        // GET /api/inventory/barcode/{sku} — Code128 quét được
        group.MapGet("/barcode/{sku}", (string sku) =>
            Results.Content(Code128Encoder.ToSvg(sku), "image/svg+xml"))
            .RequireAuthorization(Permissions.Inventory.ViewStock);

        // GET /api/inventory/qrcode/{serialNumber} — QR thật (QRCoder)
        group.MapGet("/qrcode/{serialNumber}", (string serialNumber) =>
            Results.Content(QrCodeSvgGenerator.ToSvg(serialNumber), "image/svg+xml"))
            .RequireAuthorization(Permissions.Inventory.ViewStock);

        // GET /api/inventory/barcode/lookup/{barcode}
        group.MapGet("/barcode/lookup/{barcode}", async (
            string barcode, InventoryDbContext db, CancellationToken ct) =>
        {
            var item = await db.InventoryItems.FirstOrDefaultAsync(i => i.Barcode == barcode, ct);
            if (item == null) throw NotFoundException.For("mã vạch", barcode);
            return Results.Ok(item);
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);
    }
}
