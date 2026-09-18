using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Sales.Application.Checkout;
using Sales.Application.Quotations;
using Sales.Infrastructure;

namespace Sales.Endpoints.Quotations;

/// <summary>Chuyển trạng thái báo giá + chuyển đổi thành đơn (Implementation Steps #1, #5).</summary>
internal static partial class QuotationEndpoints
{
    private static void MapActionEndpoints(RouteGroupBuilder quotations)
    {
        quotations.MapPost("/{id:guid}/send", async (Guid id, SalesDbContext db, CancellationToken ct) =>
        {
            var quotation = await QuotationService.LoadAsync(db, id, ct);
            if (quotation == null) return Results.NotFound(new { Error = "Không tìm thấy báo giá" });
            try { quotation.Send(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
            await db.SaveChangesAsync(ct);
            return Results.Ok(QuotationService.ToDto(quotation));
        }).RequireAuthorization(Permissions.Sales.Quotations.Edit);

        quotations.MapPost("/{id:guid}/accept", async (
            Guid id, SalesDbContext db, IBusinessClock clock, CancellationToken ct) =>
        {
            var quotation = await QuotationService.LoadAsync(db, id, ct);
            if (quotation == null) return Results.NotFound(new { Error = "Không tìm thấy báo giá" });
            try { quotation.Accept(clock.UtcNow.UtcDateTime); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
            await db.SaveChangesAsync(ct);
            return Results.Ok(QuotationService.ToDto(quotation));
        }).RequireAuthorization(Permissions.Sales.Quotations.Edit);

        quotations.MapPost("/{id:guid}/reject", async (
            Guid id, RejectQuotationRequest? body, SalesDbContext db, CancellationToken ct) =>
        {
            var quotation = await QuotationService.LoadAsync(db, id, ct);
            if (quotation == null) return Results.NotFound(new { Error = "Không tìm thấy báo giá" });
            try { quotation.Reject(body?.Reason); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
            await db.SaveChangesAsync(ct);
            return Results.Ok(QuotationService.ToDto(quotation));
        }).RequireAuthorization(Permissions.Sales.Quotations.Edit);

        // D10 — chỉ Accepted + còn hạn; công nợ (nếu có) được QuotationConversionService gate lại
        // lần nữa bằng Sales.SellOnCredit — không dựa vào mỗi permission của route này.
        quotations.MapPost("/{id:guid}/convert", async (
            Guid id, ConvertQuotationRequest req,
            SalesDbContext salesDb, CheckoutOrchestrator orchestrator,
            IAppSettings settings, IBusinessClock clock, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var result = await QuotationConversionService.ConvertAsync(
                salesDb, orchestrator, settings, clock, user, id, req, ct);
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        }).RequireAuthorization(Permissions.Sales.Quotations.Edit);

        // Kích hoạt thủ công/kiểm thử job hết hạn (Risk Assessment — xem QuotationExpiryService).
        quotations.MapPost("/expire-due", async (
            SalesDbContext db, IBusinessClock clock, CancellationToken ct) =>
        {
            var count = await QuotationExpiryService.ExpireDueAsync(db, clock.UtcNow.UtcDateTime, ct);
            return Results.Ok(new { ExpiredCount = count });
        }).RequireAuthorization(Permissions.Sales.Quotations.Approve);
    }
}

public sealed record RejectQuotationRequest(string? Reason);
