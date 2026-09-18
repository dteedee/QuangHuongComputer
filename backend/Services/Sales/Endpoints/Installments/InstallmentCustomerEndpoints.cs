using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Time;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Sales.Application.Inventory;
using Sales.Application.Orders;
using Sales.Infrastructure;

namespace Sales.Endpoints.Installments;

/// <summary>W2-20 — phía khách: nộp hồ sơ + xem hồ sơ của chính mình. Không upload chứng từ nào.</summary>
internal static class InstallmentCustomerEndpoints
{
    public static void Map(RouteGroupBuilder user)
    {
        // Danh sách đối tác + kỳ hạn cho form nộp (storefront tự ẩn cả khối nếu rỗng).
        user.MapGet("/partners", (
            SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
            InventoryReservationService reservations, IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger, IAppSettings settings, IBusinessClock clock) =>
        {
            var svc = Sales.InstallmentEndpoints.BuildService(
                db, inventoryDb, catalogDb, reservations, publish, logger, settings, clock);
            return Results.Ok(new
            {
                partners = svc.ActivePartners(),
                termMonthsOptions = new[] { 6, 9, 12 },
                leadHoldHours = svc.LeadHoldHours(),
                note = "Số tiền/tháng chỉ mang tính ước tính - công ty tài chính quyết định số thật khi duyệt hồ sơ."
            });
        });

        user.MapPost("/apply", async (
            ApplyInstallmentDto dto, ClaimsPrincipal principal, CancellationToken ct,
            SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
            InventoryReservationService reservations, IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger, IAppSettings settings, IBusinessClock clock) =>
        {
            var uid = RequireUserId(principal);
            var svc = Sales.InstallmentEndpoints.BuildService(
                db, inventoryDb, catalogDb, reservations, publish, logger, settings, clock);
            var app = await svc.ApplyAsync(
                uid, dto.OrderId, dto.Provider, dto.TermMonths, dto.DownPayment, dto.ConsentGiven, ct);

            return Results.Ok(new
            {
                app.Id,
                app.Status,
                app.Provider,
                app.TermMonths,
                app.DownPayment,
                app.MonthlyAmount,
                app.TotalAmount,
                app.ExpiresAt,
                app.ConsentAt,
                note = "Ước tính - công ty tài chính quyết định số tiền/tháng cuối cùng."
            });
        });

        user.MapGet("/mine", async (
            ClaimsPrincipal principal, CancellationToken ct,
            SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
            InventoryReservationService reservations, IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger, IAppSettings settings, IBusinessClock clock) =>
        {
            var uid = RequireUserId(principal);
            var svc = Sales.InstallmentEndpoints.BuildService(
                db, inventoryDb, catalogDb, reservations, publish, logger, settings, clock);
            var apps = await svc.MineAsync(uid, ct);
            return Results.Ok(apps);
        });
    }

    private static Guid RequireUserId(ClaimsPrincipal principal)
    {
        var userIdStr = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var uid))
            throw new DomainException("Không xác định được người dùng đăng nhập.");
        return uid;
    }
}

public record ApplyInstallmentDto(
    Guid OrderId,
    string Provider,
    int TermMonths,
    decimal DownPayment,
    bool ConsentGiven);
