using InventoryModule.Application.Suppliers;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace InventoryModule;

public static class SupplierScorecardEndpoints
{
    public static void MapSupplierScorecardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/suppliers")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "InventoryStaff"));

        // GET /api/inventory/suppliers/scorecards?from=&to= — bảng tổng
        group.MapGet("scorecards", async (DateTime? from, DateTime? to, InventoryDbContext db) =>
        {
            var (f, t) = NormalizeRange(from, to);
            var svc = new SupplierScorecardService(db);
            var result = await svc.GetAllAsync(f, t);
            return Results.Ok(result);
        });

        // GET /api/inventory/suppliers/{id}/scorecard?from=&to=
        group.MapGet("{id:guid}/scorecard", async (Guid id, DateTime? from, DateTime? to, InventoryDbContext db) =>
        {
            var (f, t) = NormalizeRange(from, to);
            var svc = new SupplierScorecardService(db);
            try
            {
                var result = await svc.ComputeAsync(id, f, t);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });
    }

    private static (DateTime from, DateTime to) NormalizeRange(DateTime? from, DateTime? to)
    {
        var t = to ?? DateTime.UtcNow;
        var f = from ?? t.AddMonths(-3); // mặc định 3 tháng gần nhất
        return (f, t);
    }
}
