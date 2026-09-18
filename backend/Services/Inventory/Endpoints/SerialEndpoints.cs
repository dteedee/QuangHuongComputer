using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Serial/IMEI từng máy (W2-5).
///
/// <para>
/// <b>D08:</b> khi tạo serial mà không nói rõ số tháng bảo hành thì lấy
/// <c>Product.WarrantyMonths</c>, KHÔNG phải hằng 12. <c>SerialNumber.Sell()</c> tính
/// <c>WarrantyEndDate</c> từ trường này, nên để nó lệch với sản phẩm là cho một chiếc máy hai
/// ngày hết hạn bảo hành khác nhau. "Theo dõi serial" = <c>Category.IsSerialTracked</c>; không có
/// cờ riêng theo sản phẩm.
/// </para>
/// </summary>
public sealed class SerialEndpoints : IInventorySubmodule
{
    public int Order => 60;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/serials")
            .RequireModulePermissions(PermissionModules.Inventory);

        group.MapGet("", async (
            [AsParameters] PagedRequest request,
            Guid? productId, Guid? warehouseId, string? status,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.SerialNumbers.AsQueryable();
            if (productId.HasValue) query = query.Where(s => s.ProductId == productId.Value);
            if (warehouseId.HasValue) query = query.Where(s => s.WarehouseId == warehouseId.Value);
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<SerialStatus>(status, true, out var st))
                query = query.Where(s => s.Status == st);

            var search = request.NormalizedSearch;
            if (search is not null)
                query = query.Where(s => s.Serial.Contains(search) ||
                                         (s.ProductName != null && s.ProductName.Contains(search)));

            return Results.Ok(await query
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new
                {
                    s.Id,
                    s.Serial,
                    s.ProductId,
                    s.ProductName,
                    s.ProductSku,
                    s.WarehouseId,
                    WarehouseName = db.Warehouses.Where(w => w.Id == s.WarehouseId).Select(w => w.Name).FirstOrDefault(),
                    Status = s.Status.ToString(),
                    s.OrderId,
                    s.CustomerId,
                    s.GoodsReceivedNoteItemId,
                    s.WarrantyStartDate,
                    s.WarrantyEndDate,
                    s.WarrantyMonths,
                    IsUnderWarranty = s.WarrantyEndDate != null && s.WarrantyEndDate > DateTime.UtcNow,
                    s.SoldAt,
                    s.ReceivedAt,
                    s.ReturnedAt,
                    s.Notes,
                    s.CreatedAt
                })
                .ToPagedResultAsync(request, ct));
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var serial = await db.SerialNumbers.FindAsync([id], ct);
            if (serial == null) throw NotFoundException.For("serial", id);
            return Results.Ok(serial);
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapGet("lookup/{serialNumber}", async (string serialNumber, InventoryDbContext db, CancellationToken ct) =>
        {
            var serial = await db.SerialNumbers.FirstOrDefaultAsync(s => s.Serial == serialNumber, ct);
            if (serial == null) throw NotFoundException.For("serial", serialNumber);

            return Results.Ok(new
            {
                serial.Id,
                serial.Serial,
                serial.ProductId,
                serial.ProductName,
                serial.ProductSku,
                serial.WarehouseId,
                Status = serial.Status.ToString(),
                serial.OrderId,
                serial.CustomerId,
                serial.WarrantyStartDate,
                serial.WarrantyEndDate,
                IsUnderWarranty = serial.IsUnderWarranty(),
                serial.SoldAt,
                serial.Notes
            });
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapPost("", async (
            CreateSerialDto dto, InventoryDbContext db, CatalogDbContext catalogDb, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Serial)) throw new DomainException("Thiếu số serial.");
            if (await db.SerialNumbers.AnyAsync(s => s.Serial == dto.Serial, ct))
                throw new ConflictException($"Serial '{dto.Serial}' đã tồn tại.");

            var months = await SerialWarrantyMonths.ResolveAsync(catalogDb, dto.ProductId, dto.WarrantyMonths, ct);
            var serial = new SerialNumber(dto.Serial.Trim(), dto.ProductId, dto.WarehouseId,
                dto.PurchaseOrderId, dto.ProductName, dto.ProductSku, months);

            db.SerialNumbers.Add(serial);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/inventory/serials/{serial.Id}",
                new { serial.Id, serial.Serial, serial.WarrantyMonths });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapPost("batch", async (
            BatchCreateSerialDto dto, InventoryDbContext db, CatalogDbContext catalogDb, CancellationToken ct) =>
        {
            var wanted = dto.Serials.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Distinct().ToList();
            if (wanted.Count == 0) throw new DomainException("Danh sách serial trống.");

            var existing = await db.SerialNumbers.Where(s => wanted.Contains(s.Serial))
                .Select(s => s.Serial).ToListAsync(ct);

            var months = await SerialWarrantyMonths.ResolveAsync(catalogDb, dto.ProductId, dto.WarrantyMonths, ct);
            var created = 0;
            foreach (var value in wanted.Except(existing))
            {
                db.SerialNumbers.Add(new SerialNumber(value, dto.ProductId, dto.WarehouseId,
                    dto.PurchaseOrderId, dto.ProductName, dto.ProductSku, months));
                created++;
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok(new
            {
                message = $"Đã thêm {created} serial",
                created,
                warrantyMonths = months,
                errors = existing.Select(s => $"Serial '{s}' đã tồn tại").ToList()
            });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapPut("{id:guid}/transfer", async (
            Guid id, TransferSerialDto dto, InventoryDbContext db, CancellationToken ct) =>
        {
            var serial = await db.SerialNumbers.FindAsync([id], ct);
            if (serial == null) throw NotFoundException.For("serial", id);
            if (!await db.Warehouses.AnyAsync(w => w.Id == dto.WarehouseId && w.IsActive, ct))
                throw NotFoundException.For("kho", dto.WarehouseId);

            serial.TransferWarehouse(dto.WarehouseId);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { message = "Đã chuyển kho" });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapPut("{id:guid}/status", async (
            Guid id, UpdateSerialStatusDto dto, InventoryDbContext db, CancellationToken ct) =>
        {
            var serial = await db.SerialNumbers.FindAsync([id], ct);
            if (serial == null) throw NotFoundException.For("serial", id);

            SerialStatusTransitions.Apply(serial, dto);

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { message = "Cập nhật trạng thái thành công", status = serial.Status.ToString() });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);
    }
}
