using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;

namespace InventoryModule;

/// <summary>
/// Warehouse, Serial Number, Stock Transfer & Movement Endpoints
/// Phase 2.1: Multi-Warehouse & Serial Tracking
/// </summary>
public static class WarehouseEndpoints
{
    public static void MapWarehouseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireAuthorization();

        // ============================
        // WAREHOUSE MANAGEMENT
        // ============================
        var warehouseGroup = group.MapGroup("/warehouses");

        // GET /api/inventory/warehouses
        warehouseGroup.MapGet("", async (InventoryDbContext db) =>
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
                .ToListAsync();

            return Results.Ok(warehouses);
        });

        // GET /api/inventory/warehouses/dropdown
        warehouseGroup.MapGet("dropdown", async (InventoryDbContext db) =>
        {
            var list = await db.Warehouses
                .Where(w => w.IsActive)
                .OrderByDescending(w => w.IsDefault)
                .ThenBy(w => w.Name)
                .Select(w => new { w.Id, w.Code, w.Name, Type = w.Type.ToString(), w.IsDefault })
                .ToListAsync();
            return Results.Ok(list);
        });

        // GET /api/inventory/warehouses/{id}
        warehouseGroup.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var warehouse = await db.Warehouses.FindAsync(id);
            if (warehouse == null) return Results.NotFound(new { error = "Kho không tồn tại" });

            var itemCount = await db.InventoryItems.CountAsync(i => i.WarehouseId == id);
            var serialCount = await db.SerialNumbers.CountAsync(s => s.WarehouseId == id && s.Status == SerialStatus.InStock);

            return Results.Ok(new
            {
                warehouse.Id,
                warehouse.Code,
                warehouse.Name,
                Type = warehouse.Type.ToString(),
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

        // POST /api/inventory/warehouses
        warehouseGroup.MapPost("", async (CreateWarehouseDto dto, InventoryDbContext db) =>
        {
            // Validate unique code
            var codeExists = await db.Warehouses.AnyAsync(w => w.Code == dto.Code);
            if (codeExists) return Results.BadRequest(new { error = "Mã kho đã tồn tại" });

            var warehouse = new Warehouse(
                dto.Code,
                dto.Name,
                Enum.Parse<WarehouseType>(dto.Type),
                dto.Address,
                dto.City,
                dto.Phone,
                dto.ManagerName,
                dto.Capacity
            );

            warehouse.Update(
                dto.Name,
                Enum.Parse<WarehouseType>(dto.Type),
                dto.Address,
                dto.City,
                dto.District,
                dto.Ward,
                dto.Phone,
                dto.ManagerName,
                dto.ManagerEmail,
                dto.Description,
                dto.Capacity
            );

            if (dto.IsDefault)
            {
                // Unset other defaults
                var currentDefaults = await db.Warehouses.Where(w => w.IsDefault).ToListAsync();
                foreach (var d in currentDefaults) d.UnsetDefault();
                warehouse.SetAsDefault();
            }

            db.Warehouses.Add(warehouse);
            await db.SaveChangesAsync();

            return Results.Created($"/api/inventory/warehouses/{warehouse.Id}", new { warehouse.Id, warehouse.Code, warehouse.Name });
        });

        // PUT /api/inventory/warehouses/{id}
        warehouseGroup.MapPut("{id:guid}", async (Guid id, UpdateWarehouseDto dto, InventoryDbContext db) =>
        {
            var warehouse = await db.Warehouses.FindAsync(id);
            if (warehouse == null) return Results.NotFound(new { error = "Kho không tồn tại" });

            warehouse.Update(
                dto.Name,
                Enum.Parse<WarehouseType>(dto.Type),
                dto.Address,
                dto.City,
                dto.District,
                dto.Ward,
                dto.Phone,
                dto.ManagerName,
                dto.ManagerEmail,
                dto.Description,
                dto.Capacity
            );

            if (dto.IsDefault && !warehouse.IsDefault)
            {
                var currentDefaults = await db.Warehouses.Where(w => w.IsDefault && w.Id != id).ToListAsync();
                foreach (var d in currentDefaults) d.UnsetDefault();
                warehouse.SetAsDefault();
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Cập nhật kho thành công" });
        });

        // DELETE /api/inventory/warehouses/{id}
        warehouseGroup.MapDelete("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var warehouse = await db.Warehouses.FindAsync(id);
            if (warehouse == null) return Results.NotFound(new { error = "Kho không tồn tại" });
            if (warehouse.IsDefault) return Results.BadRequest(new { error = "Không thể xóa kho mặc định" });

            var hasItems = await db.InventoryItems.AnyAsync(i => i.WarehouseId == id);
            if (hasItems) return Results.BadRequest(new { error = "Kho vẫn còn hàng, không thể xóa" });

            warehouse.IsActive = false;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ============================
        // SERIAL NUMBER MANAGEMENT
        // ============================
        var serialGroup = group.MapGroup("/serials");

        // GET /api/inventory/serials
        serialGroup.MapGet("", async (
            Guid? productId, Guid? warehouseId, string? status, string? search,
            int page, int pageSize,
            InventoryDbContext db) =>
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

            var query = db.SerialNumbers.AsQueryable();
            if (productId.HasValue) query = query.Where(s => s.ProductId == productId.Value);
            if (warehouseId.HasValue) query = query.Where(s => s.WarehouseId == warehouseId.Value);
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<SerialStatus>(status, out var st))
                query = query.Where(s => s.Status == st);
            if (!string.IsNullOrEmpty(search))
                query = query.Where(s => s.Serial.Contains(search) || (s.ProductName != null && s.ProductName.Contains(search)));

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new
                {
                    s.Id,
                    s.Serial,
                    s.ProductId,
                    s.ProductName,
                    s.ProductSku,
                    s.WarehouseId,
                    WarehouseName = s.WarehouseId != null ? db.Warehouses.Where(w => w.Id == s.WarehouseId).Select(w => w.Name).FirstOrDefault() : null,
                    Status = s.Status.ToString(),
                    s.OrderId,
                    s.CustomerId,
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
                .ToListAsync();

            return Results.Ok(new { items, total, page, pageSize });
        });

        // GET /api/inventory/serials/{id}
        serialGroup.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var serial = await db.SerialNumbers.FindAsync(id);
            if (serial == null) return Results.NotFound(new { error = "Serial không tồn tại" });
            return Results.Ok(serial);
        });

        // GET /api/inventory/serials/lookup/{serialNumber}
        serialGroup.MapGet("lookup/{serialNumber}", async (string serialNumber, InventoryDbContext db) =>
        {
            var serial = await db.SerialNumbers
                .FirstOrDefaultAsync(s => s.Serial == serialNumber);
            if (serial == null) return Results.NotFound(new { error = "Không tìm thấy serial" });

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
        });

        // POST /api/inventory/serials
        serialGroup.MapPost("", async (CreateSerialDto dto, InventoryDbContext db) =>
        {
            // Check duplicate
            var exists = await db.SerialNumbers.AnyAsync(s => s.Serial == dto.Serial);
            if (exists) return Results.BadRequest(new { error = $"Serial '{dto.Serial}' đã tồn tại" });

            var serial = new SerialNumber(
                dto.Serial,
                dto.ProductId,
                dto.WarehouseId,
                dto.PurchaseOrderId,
                dto.ProductName,
                dto.ProductSku,
                dto.WarrantyMonths
            );

            db.SerialNumbers.Add(serial);
            await db.SaveChangesAsync();

            return Results.Created($"/api/inventory/serials/{serial.Id}", new { serial.Id, serial.Serial });
        });

        // POST /api/inventory/serials/batch — Batch import serials
        serialGroup.MapPost("batch", async (BatchCreateSerialDto dto, InventoryDbContext db) =>
        {
            var created = 0;
            var errors = new List<string>();

            foreach (var s in dto.Serials)
            {
                var exists = await db.SerialNumbers.AnyAsync(x => x.Serial == s);
                if (exists)
                {
                    errors.Add($"Serial '{s}' đã tồn tại");
                    continue;
                }

                var serial = new SerialNumber(
                    s, dto.ProductId, dto.WarehouseId, dto.PurchaseOrderId,
                    dto.ProductName, dto.ProductSku, dto.WarrantyMonths
                );
                db.SerialNumbers.Add(serial);
                created++;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { message = $"Đã thêm {created} serial", created, errors });
        });

        // PUT /api/inventory/serials/{id}/transfer
        serialGroup.MapPut("{id:guid}/transfer", async (Guid id, TransferSerialDto dto, InventoryDbContext db) =>
        {
            var serial = await db.SerialNumbers.FindAsync(id);
            if (serial == null) return Results.NotFound(new { error = "Serial không tồn tại" });

            serial.TransferWarehouse(dto.WarehouseId);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã chuyển kho" });
        });

        // PUT /api/inventory/serials/{id}/status
        serialGroup.MapPut("{id:guid}/status", async (Guid id, UpdateSerialStatusDto dto, InventoryDbContext db) =>
        {
            var serial = await db.SerialNumbers.FindAsync(id);
            if (serial == null) return Results.NotFound(new { error = "Serial không tồn tại" });

            try
            {
                switch (dto.Action)
                {
                    case "sell":
                        serial.Sell(dto.ReferenceId ?? Guid.Empty, dto.CustomerId);
                        break;
                    case "reserve":
                        serial.Reserve(dto.ReferenceId ?? Guid.Empty);
                        break;
                    case "release":
                        serial.ReleaseReservation();
                        break;
                    case "return":
                        serial.Return(dto.Notes);
                        break;
                    case "defective":
                        serial.MarkDefective(dto.Notes);
                        break;
                    case "repair":
                        serial.SendForRepair(dto.ReferenceId ?? Guid.Empty);
                        break;
                    case "complete-repair":
                        serial.CompleteRepair();
                        break;
                    default:
                        return Results.BadRequest(new { error = $"Action '{dto.Action}' không hợp lệ" });
                }

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Cập nhật trạng thái thành công", status = serial.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // ============================
        // STOCK TRANSFERS
        // ============================
        var transferGroup = group.MapGroup("/transfers");

        // GET /api/inventory/transfers
        transferGroup.MapGet("", async (string? status, InventoryDbContext db) =>
        {
            var query = db.StockTransfers.Include(t => t.Items).AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<TransferStatus>(status, out var ts))
                query = query.Where(t => t.Status == ts);

            var transfers = await query.OrderByDescending(t => t.RequestedAt).ToListAsync();
            return Results.Ok(transfers.Select(t => new
            {
                t.Id,
                t.TransferNumber,
                t.FromWarehouseId,
                FromWarehouse = db.Warehouses.Where(w => w.Id == t.FromWarehouseId).Select(w => w.Name).FirstOrDefault(),
                t.ToWarehouseId,
                ToWarehouse = db.Warehouses.Where(w => w.Id == t.ToWarehouseId).Select(w => w.Name).FirstOrDefault(),
                Status = t.Status.ToString(),
                t.RequestedAt,
                t.ApprovedAt,
                t.ShippedAt,
                t.ReceivedAt,
                t.Notes,
                t.RequestedBy,
                ItemCount = t.Items.Count,
                TotalQuantity = t.Items.Sum(i => i.Quantity)
            }));
        });

        // POST /api/inventory/transfers
        transferGroup.MapPost("", async (CreateTransferDto dto, InventoryDbContext db) =>
        {
            var transferNumber = $"TF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
            var items = dto.Items.Select(i => new StockTransferItem(
                i.InventoryItemId, i.Quantity, i.ProductName, i.ProductSku
            )).ToList();

            var transfer = new StockTransfer(
                transferNumber,
                dto.FromWarehouseId,
                dto.ToWarehouseId,
                items,
                dto.RequestedBy,
                dto.Notes
            );

            db.StockTransfers.Add(transfer);
            await db.SaveChangesAsync();

            return Results.Created($"/api/inventory/transfers/{transfer.Id}", new
            {
                transfer.Id,
                transfer.TransferNumber,
                Status = transfer.Status.ToString()
            });
        });

        // PUT /api/inventory/transfers/{id}/approve
        transferGroup.MapPut("{id:guid}/approve", async (Guid id, ApproveTransferDto dto, InventoryDbContext db) =>
        {
            var transfer = await db.StockTransfers.FindAsync(id);
            if (transfer == null) return Results.NotFound();

            try
            {
                transfer.Approve(dto.ApprovedBy);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã duyệt phiếu chuyển kho", status = transfer.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // PUT /api/inventory/transfers/{id}/ship
        transferGroup.MapPut("{id:guid}/ship", async (Guid id, ShipTransferDto dto, InventoryDbContext db) =>
        {
            var transfer = await db.StockTransfers.Include(t => t.Items).FirstOrDefaultAsync(t => t.Id == id);
            if (transfer == null) return Results.NotFound();

            try
            {
                transfer.Ship(dto.ShippedBy);

                // Deduct stock from source warehouse
                foreach (var item in transfer.Items)
                {
                    var invItem = await db.InventoryItems.FindAsync(item.InventoryItemId);
                    if (invItem != null)
                    {
                        invItem.AdjustStock(-item.Quantity, $"Transfer out: {transfer.TransferNumber}");
                    }
                }

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã xuất kho", status = transfer.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // PUT /api/inventory/transfers/{id}/receive
        transferGroup.MapPut("{id:guid}/receive", async (Guid id, ReceiveTransferDto dto, InventoryDbContext db) =>
        {
            var transfer = await db.StockTransfers.Include(t => t.Items).FirstOrDefaultAsync(t => t.Id == id);
            if (transfer == null) return Results.NotFound();

            try
            {
                transfer.Receive(dto.ReceivedBy);

                // Add stock to destination warehouse
                foreach (var item in transfer.Items)
                {
                    var invItem = await db.InventoryItems
                        .FirstOrDefaultAsync(i => i.ProductId == item.InventoryItemId && i.WarehouseId == transfer.ToWarehouseId);

                    if (invItem != null)
                    {
                        invItem.AdjustStock(item.Quantity, $"Transfer in: {transfer.TransferNumber}");
                    }
                    else
                    {
                        // Create new inventory item in destination warehouse
                        var newItem = new InventoryItem(
                            item.InventoryItemId, item.Quantity,
                            warehouseId: transfer.ToWarehouseId
                        );
                        db.InventoryItems.Add(newItem);
                    }
                }

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã nhận hàng", status = transfer.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // PUT /api/inventory/transfers/{id}/cancel
        transferGroup.MapPut("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var transfer = await db.StockTransfers.FindAsync(id);
            if (transfer == null) return Results.NotFound();

            try
            {
                transfer.Cancel();
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã hủy phiếu chuyển kho" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // ============================
        // STOCK MOVEMENTS (Audit log)
        // ============================

        // GET /api/inventory/movements
        group.MapGet("/movements", async (
            Guid? productId, string? type, int page, int pageSize,
            InventoryDbContext db) =>
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

            var query = db.StockMovements.AsQueryable();
            if (productId.HasValue) query = query.Where(m => m.ProductId == productId.Value);
            if (!string.IsNullOrEmpty(type) && Enum.TryParse<MovementType>(type, out var mt))
                query = query.Where(m => m.Type == mt);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(m => m.MovementDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Results.Ok(new { items, total, page, pageSize });
        });
    }
}

// ============================================
// DTOs
// ============================================
public record CreateWarehouseDto(
    string Code,
    string Name,
    string Type,
    string? Address,
    string? City,
    string? District,
    string? Ward,
    string? Phone,
    string? ManagerName,
    string? ManagerEmail,
    string? Description,
    int Capacity = 10000,
    bool IsDefault = false
);

public record UpdateWarehouseDto(
    string Name,
    string Type,
    string? Address,
    string? City,
    string? District,
    string? Ward,
    string? Phone,
    string? ManagerName,
    string? ManagerEmail,
    string? Description,
    int Capacity = 10000,
    bool IsDefault = false
);

public record CreateSerialDto(
    string Serial,
    Guid ProductId,
    Guid? WarehouseId,
    Guid? PurchaseOrderId,
    string? ProductName,
    string? ProductSku,
    int WarrantyMonths = 12
);

public record BatchCreateSerialDto(
    List<string> Serials,
    Guid ProductId,
    Guid? WarehouseId,
    Guid? PurchaseOrderId,
    string? ProductName,
    string? ProductSku,
    int WarrantyMonths = 12
);

public record TransferSerialDto(Guid WarehouseId);

public record UpdateSerialStatusDto(
    string Action,    // sell, reserve, release, return, defective, repair, complete-repair
    Guid? ReferenceId,
    string? CustomerId,
    string? Notes
);

public record CreateTransferDto(
    Guid FromWarehouseId,
    Guid ToWarehouseId,
    List<TransferItemDto> Items,
    string? RequestedBy,
    string? Notes
);

public record TransferItemDto(
    Guid InventoryItemId,
    int Quantity,
    string? ProductName,
    string? ProductSku
);

public record ApproveTransferDto(string ApprovedBy);
public record ShipTransferDto(string ShippedBy);
public record ReceiveTransferDto(string ReceivedBy);
