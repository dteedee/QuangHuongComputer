using System.Security.Claims;
using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Phiếu xuất kho (DN) — W2-5. Số phiếu lấy từ <c>IDocumentNumberService</c> (sequence
/// <c>docnum_dn_seq</c>) thay cho bộ đếm tĩnh trong process, và việc trừ tồn khi xác nhận đi qua
/// sổ cái nên có bút toán + người thực hiện.
/// </summary>
public sealed class DeliveryNoteEndpoints : IInventorySubmodule
{
    public int Order => 80;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/dn")
            .RequireModulePermissions(PermissionModules.Inventory);

        group.MapPost("", async (
            CreateDNDto dto, InventoryDbContext db, InventoryDocumentNumbers numbers,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            if (dto.Items is null || dto.Items.Count == 0)
                throw new DomainException("Phiếu xuất phải có ít nhất 1 dòng hàng.");
            if (dto.Items.Any(i => i.Quantity <= 0))
                throw new DomainException("Số lượng xuất phải lớn hơn 0.");

            var dn = new DeliveryNote
            {
                DocumentNumber = await numbers.NextAsync(DocumentNumberTypes.DeliveryNote, ct),
                DocumentDate = dto.DocumentDate ?? DateTime.UtcNow,
                WarehouseId = dto.WarehouseId,
                OrderId = dto.OrderId,
                DeliveredBy = StockLedgerContext.ResolveActor(user),
                Reason = dto.Reason,
                Notes = dto.Notes,
                Status = DNStatus.Draft,
                Items = dto.Items.Select(i => new DNItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Quantity = i.Quantity,
                    SerialNumbers = i.SerialNumbers
                }).ToList()
            };

            db.DeliveryNotes.Add(dn);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/inventory/dn/{dn.Id}", new { dn.Id, dn.DocumentNumber });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapGet("", async ([AsParameters] PagedRequest request, string? status,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.DeliveryNotes.AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<DNStatus>(status, true, out var st))
                query = query.Where(d => d.Status == st);

            return Results.Ok(await query
                .OrderByDescending(d => d.DocumentDate)
                .Select(d => new
                {
                    d.Id,
                    d.DocumentNumber,
                    d.DocumentDate,
                    d.WarehouseId,
                    d.OrderId,
                    d.DeliveredBy,
                    Reason = d.Reason.ToString(),
                    Status = d.Status.ToString(),
                    d.Notes
                })
                .ToPagedResultAsync(request, ct));
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var dn = await db.DeliveryNotes.Include(d => d.Items).FirstOrDefaultAsync(d => d.Id == id, ct);
            if (dn == null) throw NotFoundException.For("phiếu xuất kho", id);
            return Results.Ok(dn);
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapPost("{id:guid}/confirm", async (
            Guid id, InventoryDbContext db, IStockLedger ledger, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var dn = await db.DeliveryNotes.Include(d => d.Items).FirstOrDefaultAsync(d => d.Id == id, ct);
            if (dn == null) throw NotFoundException.For("phiếu xuất kho", id);
            if (dn.Status != DNStatus.Draft)
                throw new DomainException("Chỉ phiếu nháp mới được xác nhận.");

            var actor = StockLedgerContext.ResolveActor(user);
            await ledger.InTransactionAsync(async token =>
            {
                var context = new StockLedgerContext(actor, dn.Id.ToString(), "DeliveryNote", dn.DocumentNumber);
                foreach (var item in dn.Items)
                {
                    await ledger.IssueAsync(
                        new StockLocation(item.ProductId, null, dn.WarehouseId),
                        item.Quantity, context, StockMovementReason.DeliveryNote, token);
                }

                dn.Status = DNStatus.Confirmed;
                await db.SaveChangesAsync(token);
                return true;
            }, ct);

            return Results.Ok(new { success = true, documentNumber = dn.DocumentNumber });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var dn = await db.DeliveryNotes.FirstOrDefaultAsync(d => d.Id == id, ct);
            if (dn == null) throw NotFoundException.For("phiếu xuất kho", id);
            if (dn.Status == DNStatus.Confirmed)
                throw new DomainException("Không thể hủy phiếu xuất đã xác nhận.");

            dn.Status = DNStatus.Cancelled;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { success = true });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);
    }
}
