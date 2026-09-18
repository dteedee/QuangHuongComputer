using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Kho hàng (W2-5). D09: đúng MỘT kho mặc định — <c>IX_Warehouse_Default</c> là unique partial index,
/// nên việc bỏ cờ mặc định của kho cũ phải nằm trong cùng <c>SaveChanges</c> với việc đặt kho mới.
/// </summary>
public sealed class WarehouseEndpoints : IInventorySubmodule
{
    public int Order => 20;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/warehouses")
            .RequireModulePermissions(PermissionModules.Inventory);

        group.MapGet("", async (InventoryDbContext db, CancellationToken ct) =>
        {
            var warehouses = await db.Warehouses
                .OrderByDescending(w => w.IsDefault)
                .ThenBy(w => w.Name)
                .Select(w => new
                {
                    w.Id,
                    w.Code,
                    w.Name,
                    Type = w.Type.ToString(),
                    // Viết tường minh thay vì SellableWarehouseTypes.All.Contains: trong một
                    // projection, so sánh với mảng ngoài EF dịch không ổn định.
                    IsSellable = w.Type == WarehouseType.Main
                                 || w.Type == WarehouseType.Branch
                                 || w.Type == WarehouseType.Showroom,
                    w.Address,
                    w.City,
                    w.District,
                    w.Phone,
                    w.ManagerName,
                    w.IsDefault,
                    w.Capacity,
                    w.CurrentItemCount,
                    w.IsActive,
                    w.CreatedAt,
                    ItemCount = db.InventoryItems.Count(i => i.WarehouseId == w.Id),
                    SerialCount = db.SerialNumbers.Count(s => s.WarehouseId == w.Id && s.Status == SerialStatus.InStock)
                })
                .ToListAsync(ct);

            return Results.Ok(warehouses);
        });

        group.MapGet("dropdown", async (InventoryDbContext db, CancellationToken ct) =>
        {
            var list = await db.Warehouses
                .Where(w => w.IsActive)
                .OrderByDescending(w => w.IsDefault)
                .ThenBy(w => w.Name)
                .Select(w => new { w.Id, w.Code, w.Name, Type = w.Type.ToString(), w.IsDefault })
                .ToListAsync(ct);
            return Results.Ok(list);
        });

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var warehouse = await db.Warehouses.FindAsync([id], ct);
            if (warehouse == null) throw NotFoundException.For("kho", id);

            var itemCount = await db.InventoryItems.CountAsync(i => i.WarehouseId == id, ct);
            var serialCount = await db.SerialNumbers.CountAsync(s => s.WarehouseId == id && s.Status == SerialStatus.InStock, ct);

            return Results.Ok(new
            {
                warehouse.Id,
                warehouse.Code,
                warehouse.Name,
                Type = warehouse.Type.ToString(),
                IsSellable = SellableWarehouseTypes.IsSellable(warehouse.Type),
                warehouse.Address,
                warehouse.City,
                warehouse.District,
                warehouse.Ward,
                warehouse.Phone,
                warehouse.ManagerName,
                warehouse.ManagerEmail,
                warehouse.Description,
                warehouse.Capacity,
                warehouse.IsDefault,
                warehouse.IsActive,
                warehouse.CreatedAt,
                warehouse.UpdatedAt,
                ItemCount = itemCount,
                SerialCount = serialCount
            });
        });

        group.MapPost("", async (CreateWarehouseDto dto, InventoryDbContext db, CancellationToken ct) =>
        {
            if (!Enum.TryParse<WarehouseType>(dto.Type, ignoreCase: true, out var type))
                throw new DomainException($"Loại kho '{dto.Type}' không hợp lệ.");

            var codeExists = await db.Warehouses.AnyAsync(w => w.Code == dto.Code, ct);
            if (codeExists) throw new ConflictException("Mã kho đã tồn tại.");

            var warehouse = new Warehouse(dto.Code, dto.Name, type, dto.Address, dto.City, dto.Phone,
                dto.ManagerName, dto.Capacity);
            warehouse.Update(dto.Name, type, dto.Address, dto.City, dto.District, dto.Ward, dto.Phone,
                dto.ManagerName, dto.ManagerEmail, dto.Description, dto.Capacity);

            if (dto.IsDefault)
            {
                foreach (var d in await db.Warehouses.Where(w => w.IsDefault).ToListAsync(ct)) d.UnsetDefault();
                warehouse.SetAsDefault();
            }

            db.Warehouses.Add(warehouse);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/inventory/warehouses/{warehouse.Id}",
                new { warehouse.Id, warehouse.Code, warehouse.Name });
        });

        group.MapPut("{id:guid}", async (Guid id, UpdateWarehouseDto dto, InventoryDbContext db, CancellationToken ct) =>
        {
            if (!Enum.TryParse<WarehouseType>(dto.Type, ignoreCase: true, out var type))
                throw new DomainException($"Loại kho '{dto.Type}' không hợp lệ.");

            var warehouse = await db.Warehouses.FindAsync([id], ct);
            if (warehouse == null) throw NotFoundException.For("kho", id);

            warehouse.Update(dto.Name, type, dto.Address, dto.City, dto.District, dto.Ward, dto.Phone,
                dto.ManagerName, dto.ManagerEmail, dto.Description, dto.Capacity);

            if (dto.IsDefault && !warehouse.IsDefault)
            {
                foreach (var d in await db.Warehouses.Where(w => w.IsDefault && w.Id != id).ToListAsync(ct))
                    d.UnsetDefault();
                warehouse.SetAsDefault();
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Cập nhật kho thành công" });
        });

        group.MapDelete("{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var warehouse = await db.Warehouses.FindAsync([id], ct);
            if (warehouse == null) throw NotFoundException.For("kho", id);
            if (warehouse.IsDefault) throw new DomainException("Không thể xóa kho mặc định.");

            var hasItems = await db.InventoryItems.AnyAsync(i => i.WarehouseId == id && i.QuantityOnHand > 0, ct);
            if (hasItems) throw new DomainException("Kho vẫn còn hàng, không thể xóa.");

            warehouse.IsActive = false;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }
}
