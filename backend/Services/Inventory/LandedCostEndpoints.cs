using BuildingBlocks.Security;
using InventoryModule.Application.Purchasing;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule;

/// <summary>
/// Landed cost management — chi phí nhập cho từng GRN.
/// Nhân sự mua hàng nhập chi phí sau khi GRN xác nhận, chạy allocator để phân bổ
/// vào giá vốn (AverageCost) của từng InventoryItem.
/// </summary>
public static class LandedCostEndpoints
{
    public static void MapLandedCostEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/grn/{grnId:guid}/landed-costs")
            .RequireAuthorization(policy => policy.RequireRole(Roles.Admin, Roles.Manager, Roles.InventoryStaff));

        // GET — liệt kê chi phí nhập của GRN
        group.MapGet("", async (Guid grnId, InventoryDbContext db) =>
        {
            var costs = await db.LandedCosts
                .Where(c => c.GRNId == grnId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();
            var total = costs.Sum(c => c.Amount);
            return Results.Ok(new { grnId, total, items = costs });
        });

        // POST — thêm 1 chi phí nhập
        group.MapPost("", async (Guid grnId, CreateLandedCostDto dto, InventoryDbContext db) =>
        {
            var grn = await db.GoodsReceivedNotes.FirstOrDefaultAsync(g => g.Id == grnId);
            if (grn == null) return Results.NotFound(new { error = "Không tìm thấy GRN" });

            if (dto.Amount < 0)
                return Results.BadRequest(new { error = "Số tiền không được âm" });

            var cost = new LandedCost(
                grnId,
                dto.Type,
                dto.Description ?? string.Empty,
                dto.Amount,
                dto.Method);
            db.LandedCosts.Add(cost);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/grn/{grnId}/landed-costs/{cost.Id}", cost);
        });

        // POST /allocate — chạy phân bổ toàn bộ chi phí chưa allocate
        group.MapPost("allocate", async (Guid grnId, InventoryDbContext db) =>
        {
            var allocator = new LandedCostAllocator(db);
            try
            {
                var result = await allocator.AllocateAsync(grnId);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // DELETE — xoá chi phí chưa phân bổ
        group.MapDelete("{costId:guid}", async (Guid grnId, Guid costId, InventoryDbContext db) =>
        {
            var cost = await db.LandedCosts.FirstOrDefaultAsync(c => c.Id == costId && c.GRNId == grnId);
            if (cost == null) return Results.NotFound();
            if (cost.IsAllocated)
                return Results.BadRequest(new { error = "Không thể xoá chi phí đã phân bổ" });
            db.LandedCosts.Remove(cost);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

public record CreateLandedCostDto(
    LandedCostType Type,
    string? Description,
    decimal Amount,
    LandedCostAllocationMethod Method = LandedCostAllocationMethod.ByValue);
