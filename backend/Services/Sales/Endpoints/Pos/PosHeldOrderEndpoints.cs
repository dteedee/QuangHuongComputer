using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Pos;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Pos;

/// <summary>
/// ĐƠN TẠM GIỮ Ở QUẦY — phase-48 bước 4. Khách quên ví hoặc đi rút tiền: cất giỏ lại, phục vụ
/// người tiếp theo, gọi ra sau.
///
/// Đơn giữ KHÔNG tạo đơn thật và KHÔNG giữ tồn kho — cất chỗ cho một giao dịch chưa chắc xảy ra
/// mà khoá hàng trên kệ thì website báo hết hàng cho hàng đang có. Giá được TÍNH LẠI khi gọi ra
/// (<c>estimatedTotal</c> chỉ để hiển thị danh sách).
/// </summary>
internal static class PosHeldOrderEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        var held = group.MapGroup("/pos/held-orders");

        held.MapPost("", async (
            HoldOrderRequest req, SalesDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.Label))
                throw new RequestValidationException("label", "Đơn giữ phải có nhãn để gọi lại.");
            if (req.Lines == null || req.Lines.Count == 0)
                throw new RequestValidationException("lines", "Đơn giữ phải có ít nhất một sản phẩm.");
            if (req.StoreId == Guid.Empty)
                throw new RequestValidationException("storeId", "Đơn giữ phải gắn với một cửa hàng.");

            var cashierId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var entity = new HeldOrder(
                label: req.Label,
                storeId: req.StoreId,
                itemsJson: JsonSerializer.Serialize(req.Lines),
                estimatedTotal: req.EstimatedTotal,
                shiftId: req.ShiftId,
                cashierId: Guid.TryParse(cashierId, out var cashier) ? cashier : null,
                customerId: req.CustomerId,
                customerName: req.CustomerName,
                customerPhone: req.CustomerPhone,
                notes: req.Notes);

            db.HeldOrders.Add(entity);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/sales/pos/held-orders/{entity.Id}", Map(entity));
        }).RequireAuthorization(Permissions.Sales.Pos);

        held.MapGet("", async (
            SalesDbContext db, CancellationToken ct, Guid? storeId = null, Guid? shiftId = null) =>
        {
            var query = db.HeldOrders.AsNoTracking().Where(h => h.ResumedOrderId == null);
            if (storeId.HasValue) query = query.Where(h => h.StoreId == storeId.Value);
            if (shiftId.HasValue) query = query.Where(h => h.ShiftId == shiftId.Value);

            var items = await query.OrderByDescending(h => h.CreatedAt).Take(100).ToListAsync(ct);
            return Results.Ok(new { total = items.Count, items = items.Select(Map).ToList() });
        }).RequireAuthorization(Permissions.Sales.Pos);

        // "Gọi ra" chỉ trả lại nội dung giỏ — chốt đơn vẫn phải đi qua POST /pos/orders với
        // heldOrderId, để đơn giữ được đánh dấu đã dùng trong CÙNG luồng tạo đơn.
        held.MapGet("/{id:guid}", async (Guid id, SalesDbContext db, CancellationToken ct) =>
        {
            var entity = await db.HeldOrders.AsNoTracking().FirstOrDefaultAsync(h => h.Id == id, ct)
                ?? throw NotFoundException.For("đơn giữ", id);

            return Results.Ok(new
            {
                header = Map(entity),
                lines = JsonSerializer.Deserialize<List<PosLineRequest>>(entity.ItemsJson)
                        ?? new List<PosLineRequest>(),
            });
        }).RequireAuthorization(Permissions.Sales.Pos);

        held.MapDelete("/{id:guid}", async (Guid id, SalesDbContext db, CancellationToken ct) =>
        {
            var entity = await db.HeldOrders.FirstOrDefaultAsync(h => h.Id == id, ct)
                ?? throw NotFoundException.For("đơn giữ", id);
            if (entity.ResumedOrderId.HasValue)
                throw new ConflictException("Đơn giữ đã được gọi ra thành đơn thật — không huỷ được.");

            db.HeldOrders.Remove(entity);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Permissions.Sales.Pos);
    }

    private static object Map(HeldOrder h) => new
    {
        h.Id,
        h.Label,
        h.StoreId,
        h.ShiftId,
        h.CustomerId,
        h.CustomerName,
        h.CustomerPhone,
        h.EstimatedTotal,
        h.Notes,
        h.CreatedAt,
        h.ResumedOrderId,
    };
}

/// <summary>Giữ một giỏ ở quầy. <c>EstimatedTotal</c> chỉ để hiển thị, không phải giá cam kết.</summary>
public sealed record HoldOrderRequest(
    string Label,
    Guid StoreId,
    IReadOnlyList<PosLineRequest> Lines,
    decimal EstimatedTotal = 0m,
    Guid? ShiftId = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    string? CustomerPhone = null,
    string? Notes = null);
