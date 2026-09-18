using BuildingBlocks.Security;
using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Repository;
using BuildingBlocks.Validation;
using InventoryModule.Application.Purchasing;
using InventoryModule.Application.Stock;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule;

/// <summary>
/// Endpoint RFQ (Request For Quotation) + so sánh báo giá + chọn NCC thắng.
/// Ranh giới: KHÔNG import Communication.Domain — chỉ publish RfqSentToSuppliersIntegrationEvent.
/// </summary>
public static class RfqEndpoints
{
    public static void MapRfqEndpoints(this IEndpointRouteBuilder app)
    {
        // W0-3: RFQ lộ giá chào của nhà cung cấp ⇒ chỉ nhân viên mua hàng/quản lý.
        // W1-10: yêu cầu báo giá nhà cung cấp -> quyền theo verb của nhóm mua hàng.
        var group = app.MapGroup("/api/inventory/rfq")
            .RequireModulePermissions(PermissionModules.PurchaseOrders);

        group.MapGet("", async (
            [AsParameters] PagedRequest request, string? status, InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.RequestForQuotations.AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RfqStatus>(status, true, out var s))
                query = query.Where(r => r.Status == s);

            var search = request.NormalizedSearch;
            if (search is not null) query = query.Where(r => r.Number.Contains(search));

            return Results.Ok(await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Number,
                    status = r.Status.ToString(),
                    r.DueDate,
                    r.CreatedAt,
                    r.RequisitionId,
                    quotationCount = db.SupplierQuotations.Count(q => q.RfqId == r.Id)
                })
                .ToPagedResultAsync(request, ct));
        });

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var rfq = await db.RequestForQuotations.FirstOrDefaultAsync(r => r.Id == id);
            if (rfq == null) return Results.NotFound();
            var quotations = await db.SupplierQuotations
                .Include(q => q.Items)
                .Where(q => q.RfqId == id)
                .ToListAsync();
            return Results.Ok(new { rfq, quotations });
        });

        group.MapPost("", async (
            CreateRfqDto dto, ClaimsPrincipal user, InventoryDbContext db,
            InventoryDocumentNumbers numbers, CancellationToken ct) =>
        {
            var userId = PurchasingGuards.RequireUserId(user);
            var itemsJson = JsonSerializer.Serialize(dto.Items);
            var rfq = new RequestForQuotation(userId, itemsJson, dto.DueDate, dto.RequisitionId, dto.Notes);
            rfq.SetNumber(await numbers.NextAsync(DocumentNumberTypes.RequestForQuotation, ct));

            db.RequestForQuotations.Add(rfq);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/inventory/rfq/{rfq.Id}",
                new { rfq.Id, rfq.Number, status = rfq.Status.ToString() });
        }).WithValidation<CreateRfqDto>();

        // Gửi RFQ cho danh sách NCC — chỉ publish sự kiện, Communication service lo email.
        group.MapPost("{id:guid}/send-to-suppliers", async (Guid id, SendRfqDto dto, InventoryDbContext db, IPublishEndpoint bus) =>
        {
            if (dto.SupplierIds == null || dto.SupplierIds.Count == 0)
                return Results.BadRequest(new { error = "Cần ít nhất 1 NCC." });

            var rfq = await db.RequestForQuotations.FindAsync(id);
            if (rfq == null) return Results.NotFound();

            try
            {
                rfq.MarkSent();
                await db.SaveChangesAsync();

                // Publish event, Communication service sẽ gửi email.
                await bus.Publish(new RfqSentToSuppliersIntegrationEvent(
                    rfq.Id, rfq.Number, dto.SupplierIds, rfq.DueDate, DateTime.UtcNow));

                return Results.Ok(new { rfq.Id, rfq.Number, rfq.Status, sentTo = dto.SupplierIds.Count });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // Nhập báo giá tay từ NCC (email/PDF/điện thoại → nhập vào hệ thống).
        group.MapPost("{id:guid}/quotations", async (Guid id, CreateQuotationDto dto, InventoryDbContext db) =>
        {
            var rfq = await db.RequestForQuotations.FindAsync(id);
            if (rfq == null) return Results.NotFound();

            try
            {
                var items = dto.Items.Select(i =>
                    new SupplierQuotationItem(i.ProductId, i.UnitPrice, i.MinQuantity, i.LeadTimeDays, i.Notes)).ToList();
                var quot = new SupplierQuotation(
                    id, dto.SupplierId, items, dto.ValidUntil, dto.PaymentTermType,
                    dto.DeliveryDays, dto.WarrantyMonths, dto.QuotationNumber, dto.Notes);
                db.SupplierQuotations.Add(quot);
                await db.SaveChangesAsync();
                return Results.Created($"/api/inventory/rfq/{id}/quotations/{quot.Id}", quot);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // Bảng so sánh — tô sáng giá tốt nhất từng cột.
        group.MapGet("{id:guid}/comparison", async (Guid id, InventoryDbContext db) =>
        {
            var rfq = await db.RequestForQuotations.FindAsync(id);
            if (rfq == null) return Results.NotFound();

            var quotations = await db.SupplierQuotations
                .Include(q => q.Items)
                .Where(q => q.RfqId == id && q.Status != SupplierQuotationStatus.Expired)
                .ToListAsync();

            if (quotations.Count == 0)
                return Results.Ok(new { rfq, comparison = Array.Empty<object>() });

            var bestPrice = quotations.Min(q => q.TotalAmount);
            var bestDelivery = quotations.Min(q => q.DeliveryDays);
            var bestWarranty = quotations.Max(q => q.WarrantyMonths);

            var rows = quotations.Select(q => new
            {
                q.Id,
                q.SupplierId,
                q.QuotationNumber,
                q.TotalAmount,
                q.DeliveryDays,
                q.WarrantyMonths,
                paymentTerm = q.PaymentTermType.ToString(),
                q.ValidUntil,
                bestPrice = q.TotalAmount == bestPrice,
                bestDelivery = q.DeliveryDays == bestDelivery,
                bestWarranty = q.WarrantyMonths == bestWarranty,
                items = q.Items.Select(i => new { i.ProductId, i.UnitPrice, i.MinQuantity, i.LeadTimeDays })
            });

            return Results.Ok(new { rfq, comparison = rows });
        });

        // Chọn NCC thắng → sinh PO tự động từ báo giá.
        group.MapPost("{id:guid}/award/{quotationId:guid}", async (
            Guid id, Guid quotationId, ClaimsPrincipal user, InventoryDbContext db,
            InventoryDocumentNumbers numbers, CancellationToken ct) =>
        {
            var userId = (Guid?)PurchasingGuards.RequireUserId(user);

            var rfq = await db.RequestForQuotations.FindAsync(id);
            if (rfq == null) return Results.NotFound(new { error = "RFQ không tồn tại." });

            var quot = await db.SupplierQuotations.Include(q => q.Items)
                .FirstOrDefaultAsync(q => q.Id == quotationId && q.RfqId == id);
            if (quot == null) return Results.NotFound(new { error = "Báo giá không thuộc RFQ này." });

            try
            {
                // Snapshot giá từ báo giá → PO
                var poItems = quot.Items.Select(i =>
                    new PurchaseOrderItem(i.ProductId, Math.Max(i.MinQuantity, 1), i.UnitPrice)).ToList();
                var po = new PurchaseOrder(quot.SupplierId, poItems, userId!.Value);
                po.SetNumber(await numbers.NextAsync(DocumentNumberTypes.PurchaseOrder, ct));
                po.LinkToQuotation(quotationId);

                rfq.Award(quotationId, po.Id);
                quot.MarkAwarded();

                // Đánh dấu các báo giá khác Rejected
                var otherQuotations = await db.SupplierQuotations
                    .Where(q => q.RfqId == id && q.Id != quotationId && q.Status == SupplierQuotationStatus.Received)
                    .ToListAsync();
                foreach (var other in otherQuotations) other.MarkRejected();

                db.PurchaseOrders.Add(po);
                await db.SaveChangesAsync();

                return Results.Ok(new { poId = po.Id, poNumber = po.PONumber, totalAmount = po.TotalAmount });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var rfq = await db.RequestForQuotations.FindAsync(id);
            if (rfq == null) return Results.NotFound();
            try { rfq.Cancel(); await db.SaveChangesAsync(); return Results.Ok(rfq); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }

    private static Guid? ResolveUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

// Integration event — Communication service subscribe để gửi email cho NCC.
public record RfqSentToSuppliersIntegrationEvent(
    Guid RfqId,
    string RfqNumber,
    List<Guid> SupplierIds,
    DateTime? DueDate,
    DateTime OccurredAt);

public record CreateRfqDto(List<RfqItemDto> Items, DateTime? DueDate, Guid? RequisitionId, string? Notes);
public record RfqItemDto(Guid ProductId, string ProductName, int Quantity);

public record SendRfqDto(List<Guid> SupplierIds);

public record CreateQuotationDto(
    Guid SupplierId,
    List<QuotationItemDto> Items,
    DateTime? ValidUntil,
    PaymentTermType PaymentTermType,
    int DeliveryDays,
    int WarrantyMonths,
    string? QuotationNumber,
    string? Notes);

public record QuotationItemDto(Guid ProductId, decimal UnitPrice, int MinQuantity, int LeadTimeDays, string? Notes);
