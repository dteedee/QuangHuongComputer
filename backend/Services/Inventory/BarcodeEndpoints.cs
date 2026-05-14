using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;

namespace InventoryModule;

public static class BarcodeEndpoints
{
    public static void MapBarcodeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireAuthorization();

        // GET /api/inventory/barcode/{sku} — return SVG barcode (Code128 placeholder)
        group.MapGet("/barcode/{sku}", (string sku) =>
        {
            var bars = GenerateCode128Bars(sku);
            var safeSku = HtmlEncode(sku);
            var svg = $@"<svg xmlns='http://www.w3.org/2000/svg' width='200' height='80'>
  <rect width='200' height='60' fill='white'/>
  {bars}
  <text x='100' y='75' text-anchor='middle' font-family='monospace' font-size='10'>{safeSku}</text>
</svg>";
            return Results.Content(svg, "image/svg+xml");
        });

        // GET /api/inventory/qrcode/{serialNumber} — return QR code SVG placeholder
        group.MapGet("/qrcode/{serialNumber}", (string serialNumber) =>
        {
            var cells = GenerateQrGrid(serialNumber);
            var safeSerial = HtmlEncode(serialNumber[..Math.Min(serialNumber.Length, 16)]);
            var svg = $@"<svg xmlns='http://www.w3.org/2000/svg' width='120' height='140'>
  <rect width='120' height='120' fill='white'/>
  {cells}
  <text x='60' y='135' text-anchor='middle' font-family='monospace' font-size='9'>{safeSerial}</text>
</svg>";
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

    private static string HtmlEncode(string value) =>
        value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");

    // Simple deterministic bar pattern from SKU hash — visual placeholder only
    private static string GenerateCode128Bars(string text)
    {
        var hash = text.Aggregate(0, (acc, c) => acc * 31 + c);
        var bars = new System.Text.StringBuilder();
        var x = 10;
        var random = new Random(hash);
        for (var i = 0; i < 60; i++)
        {
            var width = random.Next(1, 4);
            var isBar = i % 2 == 0;
            if (isBar)
                bars.Append($"<rect x='{x}' y='5' width='{width}' height='50' fill='black'/>");
            x += width;
            if (x > 190) break;
        }
        return bars.ToString();
    }

    // Simple QR-like grid placeholder
    private static string GenerateQrGrid(string text)
    {
        var hash = text.Aggregate(0, (acc, c) => acc * 31 + c);
        var cells = new System.Text.StringBuilder();
        var rng = new Random(Math.Abs(hash));
        const int size = 10;
        const int cellPx = 10;
        for (var r = 0; r < size; r++)
        {
            for (var c = 0; c < size; c++)
            {
                if (rng.Next(2) == 1)
                    cells.Append($"<rect x='{c * cellPx + 5}' y='{r * cellPx + 5}' width='{cellPx}' height='{cellPx}' fill='black'/>");
            }
        }
        return cells.ToString();
    }
}
