using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Time;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Sales.Application.Installments;
using Sales.Application.Inventory;
using Sales.Application.Orders;
using Sales.Infrastructure;

namespace Sales.Endpoints.Installments;

/// <summary>W2-20 — phía nhân viên: danh sách chờ, duyệt (ghi số hợp đồng CTTC + thu tiền qua
/// đường tender bình thường), từ chối (huỷ đơn + nhả tồn), và quét thủ công hồ sơ quá hạn giữ hàng
/// (thay cho job tự động - xem ghi chú ở <see cref="InstallmentExpiryService"/>).</summary>
internal static class InstallmentAdminEndpoints
{
    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/pending", async (
            CancellationToken ct, SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
            InventoryReservationService reservations, IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger, IAppSettings settings, IBusinessClock clock) =>
        {
            var svc = Sales.InstallmentEndpoints.BuildService(
                db, inventoryDb, catalogDb, reservations, publish, logger, settings, clock);
            return Results.Ok(await svc.PendingAsync(ct));
        });

        admin.MapPost("/{id:guid}/approve", async (
            Guid id, ApproveInstallmentDto dto, ClaimsPrincipal principal, CancellationToken ct,
            SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
            InventoryReservationService reservations, IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger, IAppSettings settings, IBusinessClock clock) =>
        {
            var actor = principal.FindFirstValue(ClaimTypes.Name) ?? "admin";
            var svc = Sales.InstallmentEndpoints.BuildService(
                db, inventoryDb, catalogDb, reservations, publish, logger, settings, clock);
            var app = await svc.ApproveAsync(id, dto.FinanceContractNumber, actor, ct);
            return Results.Ok(new { app.Id, app.Status, app.ApprovedAt, app.FinanceContractNumber });
        });

        admin.MapPost("/{id:guid}/reject", async (
            Guid id, RejectInstallmentDto dto, ClaimsPrincipal principal, CancellationToken ct,
            SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
            InventoryReservationService reservations, IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger, IAppSettings settings, IBusinessClock clock) =>
        {
            var actor = principal.FindFirstValue(ClaimTypes.Name) ?? "admin";
            var svc = Sales.InstallmentEndpoints.BuildService(
                db, inventoryDb, catalogDb, reservations, publish, logger, settings, clock);
            var app = await svc.RejectAsync(id, dto.Reason, actor, ct);
            return Results.Ok(new { app.Id, app.Status, app.RejectedAt, app.RejectionReason });
        });

        // Quét thủ công hồ sơ PendingApproval quá `ExpiresAt`. Nguồn-chân-lý cho việc tự động hoá
        // là job hết-hạn-đơn của W2-10 (chưa tồn tại khi track này chạy — IR đã ghi trong báo cáo);
        // route này cho phép đo hành vi đúng bây giờ và cho vận hành thật một nút bấm dự phòng.
        admin.MapPost("/expire-sweep", async (
            CancellationToken ct, SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
            InventoryReservationService reservations, IPublishEndpoint publish,
            ILogger<OrderLifecycleService> lifecycleLogger, ILogger<InstallmentApplicationService> sweepLogger,
            IBusinessClock clock) =>
        {
            var lifecycle = new OrderLifecycleService(db, inventoryDb, catalogDb, reservations, publish, lifecycleLogger);
            var expired = await InstallmentExpiryService.ExpireOverdueBatchAsync(
                db, lifecycle, clock, sweepLogger, ct);
            return Results.Ok(new { expiredCount = expired });
        });
    }
}

public record ApproveInstallmentDto(string FinanceContractNumber);

public record RejectInstallmentDto(string Reason);
