using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Barcode;
using InventoryModule.Infrastructure;

namespace InventoryModule;

public static class BarcodeEndpoints
{
    public static void MapBarcodeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireAuthorization();

        // GET /api/inventory/barcode/{sku} — mã vạch Code128 thật (quét được)
        group.MapGet("/barcode/{sku}", (string sku) =>
        {
            var svg = Code128Encoder.ToSvg(sku);
            return Results.Content(svg, "image/svg+xml");
        });

        // GET /api/inventory/qrcode/{serialNumber} — mã QR thật (QRCoder, quét được)
        group.MapGet("/qrcode/{serialNumber}", (string serialNumber) =>
        {
            var svg = QrCodeSvgGenerator.ToSvg(serialNumber);
            return Results.Content(svg, "image/svg+xml");
        });

        // GET /api/inventory/barcode/lookup/{barcode} — lookup product by barcode
        group.MapGet("/barcode/lookup/{barcode}", async (string barcode, InventoryDbContext db) =>
        {
            var item = await db.InventoryItems
                .FirstOrDefaultAsync(i => i.Barcode == barcode);
            return item != null ? Results.Ok(item) : Results.NotFound(new { error = "Barcode not found" });
        });
    }
}
