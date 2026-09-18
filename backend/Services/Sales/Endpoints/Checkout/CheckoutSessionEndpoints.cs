using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Inventory;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Checkout;

/// <summary>
/// Phiên checkout — ĐIỂM GIỮ CHỖ TỒN KHO DUY NHẤT của luồng bán hàng (giữ 15 phút, gia hạn 1 lần).
///
/// W2-3 thay toàn bộ phần giữ chỗ viết tay trong các handler này bằng
/// <see cref="InventoryReservationService"/>, nên tạo phiên / huỷ phiên / chốt đơn / hết hạn
/// dùng CHUNG một đường giữ và nhả. Trước đây mỗi nơi tự gọi <c>ReserveStock</c> và tự dựng
/// <c>StockReservation</c>, nên huỷ phiên chỉ nhả được đúng phần mà nơi đó biết.
/// </summary>
internal static class CheckoutSessionEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        group.MapPost("/session", CreateAsync).RequireAuthorization(SecurityPolicies.Authenticated);
        group.MapPost("/session/{id:guid}/extend", ExtendAsync).RequireAuthorization(SecurityPolicies.Authenticated);
        group.MapPost("/session/{id:guid}/cancel", CancelAsync).RequireAuthorization(SecurityPolicies.Authenticated);
        group.MapGet("/session/{id:guid}", GetAsync).RequireAuthorization(SecurityPolicies.Authenticated);
    }

    private static async Task<IResult> CreateAsync(
        CreateSessionDto dto,
        SalesDbContext salesDb,
        InventoryDbContext inventoryDb,
        InventoryReservationService reservations,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
            return Results.Unauthorized();

        var cart = await salesDb.Carts.Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == dto.CartId, ct);
        if (cart == null) return Results.NotFound(new { Error = "Giỏ hàng không tồn tại" });

        // IDOR: chỉ chủ giỏ mới được giữ chỗ tồn kho cho giỏ đó.
        if (cart.CustomerId != customerId)
            return Results.Forbid();

        var lines = cart.Items.Where(i => !i.IsGift).ToList();
        if (lines.Count == 0) return Results.BadRequest(new { Error = "Giỏ hàng trống" });

        var session = CheckoutSession.Create(cart.Id, customerId, holdMinutes: 15);

        var outcome = await reservations.ReserveAsync(
            session.Id.ToString(),
            InventoryReservationService.CheckoutSessionReference,
            lines.Select(i => new ReservationLine(i.ProductId, i.VariantId, i.Quantity, i.ProductName)).ToList(),
            expirationHours: 1,
            ct);

        if (!outcome.Success) return Results.BadRequest(new { Error = outcome.ErrorMessage });

        foreach (var reservationId in outcome.ReservationIds) session.AttachReservation(reservationId);

        salesDb.CheckoutSessions.Add(session);
        salesDb.Entry(session).Property("ReservationIdsJson").CurrentValue =
            JsonSerializer.Serialize(session.ReservationIds);

        // Lưu KHO TRƯỚC, rồi mới lưu phiên.
        // Bản cũ chỉ gọi salesDb.SaveChangesAsync: mọi thay đổi trên InventoryDbContext
        // (ReserveStock + hàng StockReservations) bị vứt đi lặng lẽ, nên phiên checkout tồn tại
        // mà KHÔNG giữ chỗ gì cả — đúng thứ mà phiên sinh ra để làm.
        // Thứ tự này an toàn: nếu lưu phiên hỏng, lượt giữ chỗ mồ côi sẽ được Inventory nhả theo
        // ExpiresAt của chính nó, chứ không có chuyện phiên "giữ chỗ" trên giấy mà kho không biết.
        await inventoryDb.SaveChangesAsync(ct);
        await salesDb.SaveChangesAsync(ct);

        return Results.Ok(new { SessionId = session.Id, session.ExpiresAt, HoldMinutes = 15 });
    }

    private static async Task<IResult> ExtendAsync(
        Guid id, SalesDbContext salesDb, ClaimsPrincipal user, CancellationToken ct)
    {
        var session = await LoadOwnedAsync(salesDb, id, user, ct);
        if (session.Result != null) return session.Result;

        try { session.Session!.Extend(additionalMinutes: 15); }
        catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }

        await salesDb.SaveChangesAsync(ct);
        return Results.Ok(new { session.Session!.ExpiresAt, session.Session.WasExtended });
    }

    private static async Task<IResult> CancelAsync(
        Guid id,
        SalesDbContext salesDb,
        InventoryDbContext inventoryDb,
        InventoryReservationService reservations,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var session = await LoadOwnedAsync(salesDb, id, user, ct);
        if (session.Result != null) return session.Result;

        await reservations.ReleaseAsync(id.ToString(), "Khách huỷ phiên checkout", ct);
        session.Session!.Cancel();

        // Nhả chỗ phải được LƯU vào kho, không chỉ vào bảng phiên.
        await inventoryDb.SaveChangesAsync(ct);
        await salesDb.SaveChangesAsync(ct);
        return Results.Ok(new { session.Session.Status });
    }

    private static async Task<IResult> GetAsync(
        Guid id, SalesDbContext salesDb, ClaimsPrincipal user, CancellationToken ct)
    {
        var session = await LoadOwnedAsync(salesDb, id, user, ct);
        if (session.Result != null) return session.Result;

        var s = session.Session!;
        return Results.Ok(new
        {
            s.Id,
            s.CartId,
            s.Status,
            s.ExpiresAt,
            s.WasExtended,
            RemainingSeconds = Math.Max(0, (int)(s.ExpiresAt - DateTime.UtcNow).TotalSeconds),
        });
    }

    /// <summary>
    /// Nạp phiên và kiểm quyền sở hữu. Trước W2-3 cả bốn handler này KHÔNG kiểm gì:
    /// biết id phiên là gia hạn/huỷ/đọc được phiên của người khác (nhả tồn kho họ đang giữ).
    /// </summary>
    private static async Task<(CheckoutSession? Session, IResult? Result)> LoadOwnedAsync(
        SalesDbContext salesDb, Guid id, ClaimsPrincipal user, CancellationToken ct)
    {
        if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
            return (null, Results.Unauthorized());

        var session = await salesDb.CheckoutSessions.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return (null, Results.NotFound());

        if (session.CustomerId != customerId) return (null, Results.Forbid());

        return (session, null);
    }
}
