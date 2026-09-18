using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Domain;
using Sales.Infrastructure;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Content.Infrastructure;
using Content.Domain;
using Sales.Application.Pricing;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales.Endpoints.Returns;

/// <summary>
/// Đổi/trả phía quản trị — trích NGUYÊN VĂN bởi W2-3. Từ commit này thuộc **W2-10**.
/// </summary>
internal static partial class AdminReturnEndpoints
{
    public static void MapAdminReturnEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        // ==================== RETURN REQUESTS ADMIN ENDPOINTS ====================

        adminGroup.MapGet("/returns", async (SalesDbContext db, int page = 1, int pageSize = 20, string? status = null) =>
        {
            var query = db.ReturnRequests.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ReturnStatus>(status, true, out var statusEnum))
            {
                query = query.Where(r => r.Status == statusEnum);
            }

            var total = await query.CountAsync();
            var returns = await query
                .OrderByDescending(r => r.RequestedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    r.Id,
                    r.OrderId,
                    r.OrderItemId,
                    r.Reason,
                    ReasonCode = EF.Property<int?>(r, "ReasonCode"),
                    r.Description,
                    Type = r.Type.ToString(),
                    Status = r.Status.ToString(),
                    r.RefundAmount,
                    r.RequestedAt,
                    r.InspectedAt,
                    r.ReceivedCondition,
                })
                .ToListAsync();

            return Results.Ok(new { Total = total, Page = page, PageSize = pageSize, Returns = returns });
        });

        adminGroup.MapGet("/returns/{id:guid}", async (
            Guid id, SalesDbContext db, CancellationToken ct) =>
        {
            var row = await db.ReturnRequests
                .Where(r => r.Id == id)
                .Select(r => new
                {
                    r.Id,
                    r.OrderId,
                    r.OrderItemId,
                    r.Reason,
                    ReasonCode = EF.Property<int?>(r, "ReasonCode"),
                    r.Description,
                    r.CustomerNotes,
                    r.AttachmentUrls,
                    Type = r.Type.ToString(),
                    Status = r.Status.ToString(),
                    r.RefundAmount,
                    r.RefundMethod,
                    r.RequestedAt,
                    r.ApprovedAt,
                    r.RejectedAt,
                    r.RejectionReason,
                    r.RefundedAt,
                    r.ProcessedBy,
                    r.InspectedAt,
                    r.InspectedBy,
                    r.InspectionNotes,
                    r.ReceivedCondition,
                    r.RestockWarehouseId,
                    r.ExchangeProductId,
                    r.ExchangeOrderId,
                    r.PriceDifference,
                })
                .FirstOrDefaultAsync(ct)
                ?? throw NotFoundException.For("yêu cầu đổi trả", id);

            return Results.Ok(row);
        });

        MapReturnActionEndpoints(adminGroup);
    }
}
