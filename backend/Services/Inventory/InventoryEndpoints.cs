using BuildingBlocks.Repository;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;
using InventoryModule.DTOs;
using InventoryModule.Repository;
using InventoryModule.Validators;

namespace InventoryModule;

public static class InventoryEndpoints
{
    public static void MapInventoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireAuthorization();

        // Stock Management
        group.MapGet("/stock", async (InventoryDbContext db) =>
        {
            return await db.InventoryItems.ToListAsync();
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ViewStock));

        group.MapGet("/stock/{productId:guid}", async (Guid productId, InventoryDbContext db) =>
        {
            var item = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == productId);
            return item != null ? Results.Ok(item) : Results.NotFound();
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ViewStock));

        group.MapPut("/stock/{id:guid}/adjust", async (Guid id, int amount, string reason, InventoryDbContext db) =>
        {
            var item = await db.InventoryItems.FindAsync(id);
            if (item == null) return Results.NotFound();

            item.AdjustStock(amount, reason);
            await db.SaveChangesAsync();
            return Results.Ok(item);
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.AdjustStock));

        // ==================== STOCK QUERIES: PRODUCT / VARIANT / BRANCH ====================
        // Public read: FE trang chi tiết sản phẩm gọi 3 endpoint này để hiển thị "còn X sản phẩm",
        // chọn biến thể (RAM/SSD) và bảng tồn theo chi nhánh.

        // Tồn TỔNG của 1 sản phẩm — cộng dồn mọi InventoryItem (mọi variant, mọi kho).
        // Không phân biệt VariantId=null hay không (ProductId hiện hữu là đủ).
        app.MapGet("/api/inventory/products/{productId:guid}/stock", async (Guid productId, InventoryDbContext db) =>
        {
            var rows = await db.InventoryItems
                .Where(i => i.ProductId == productId)
                .Select(i => new { i.QuantityOnHand, i.ReservedQuantity })
                .ToListAsync();

            var totalOnHand = rows.Sum(r => r.QuantityOnHand);
            var totalReserved = rows.Sum(r => r.ReservedQuantity);
            return Results.Ok(new
            {
                productId,
                quantityOnHand = totalOnHand,
                reservedQuantity = totalReserved,
                availableQuantity = totalOnHand - totalReserved
            });
        });

        // Tồn của 1 BIẾN THỂ cụ thể — dùng cho product-variant-selector đổi giá + tồn khi chọn RAM/SSD.
        app.MapGet("/api/inventory/products/{productId:guid}/variants/{variantId:guid}/stock", async (
            Guid productId, Guid variantId, InventoryDbContext db) =>
        {
            var rows = await db.InventoryItems
                .Where(i => i.ProductId == productId && i.VariantId == variantId)
                .Select(i => new { i.QuantityOnHand, i.ReservedQuantity })
                .ToListAsync();

            var totalOnHand = rows.Sum(r => r.QuantityOnHand);
            var totalReserved = rows.Sum(r => r.ReservedQuantity);
            return Results.Ok(new
            {
                productId,
                variantId,
                quantityOnHand = totalOnHand,
                reservedQuantity = totalReserved,
                availableQuantity = totalOnHand - totalReserved
            });
        });

        // Tồn theo CHI NHÁNH — trả list warehouse có tồn của product này.
        // Chỉ trả warehouse Type ∈ {Branch, Showroom} — khách chỉ quan tâm nơi có thể mua/xem trực tiếp.
        // Phase 05 sẽ có Store entity riêng; hiện tại dùng Warehouse cho khớp dữ liệu thực.
        app.MapGet("/api/inventory/products/{productId:guid}/stock-by-branch", async (
            Guid productId, InventoryDbContext db) =>
        {
            // Kỹ thuật: join in-memory sau khi query để tránh phụ thuộc filter join phức tạp trên EF.
            var stocks = await db.InventoryItems
                .Where(i => i.ProductId == productId && i.WarehouseId != null)
                .GroupBy(i => i.WarehouseId!.Value)
                .Select(g => new
                {
                    WarehouseId = g.Key,
                    QuantityOnHand = g.Sum(x => x.QuantityOnHand),
                    ReservedQuantity = g.Sum(x => x.ReservedQuantity)
                })
                .ToListAsync();

            if (!stocks.Any())
                return Results.Ok(Array.Empty<object>());

            var warehouseIds = stocks.Select(s => s.WarehouseId).ToList();
            var warehouses = await db.Warehouses
                .Where(w => warehouseIds.Contains(w.Id)
                    && (w.Type == WarehouseType.Branch || w.Type == WarehouseType.Showroom))
                .Select(w => new { w.Id, w.Name, w.Code, w.Address, w.City, w.Phone, w.Type })
                .ToListAsync();

            var result = warehouses.Select(w =>
            {
                var stock = stocks.First(s => s.WarehouseId == w.Id);
                return new
                {
                    warehouseId = w.Id,
                    warehouseName = w.Name,
                    warehouseCode = w.Code,
                    address = w.Address,
                    city = w.City,
                    phone = w.Phone,
                    type = w.Type.ToString(),
                    quantity = stock.QuantityOnHand - stock.ReservedQuantity
                };
            })
            .Where(x => x.quantity > 0)
            .OrderByDescending(x => x.quantity)
            .ToList();

            return Results.Ok(result);
        });

        // Stock Reservations
        group.MapPost("/stock/{productId:guid}/reserve", async (Guid productId, ReserveStockDto dto, InventoryDbContext db) =>
        {
            var item = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == productId);
            if (item == null) return Results.NotFound(new { error = "Product not found in inventory" });

            try
            {
                item.ReserveStock(dto.Quantity);

                var reservation = new StockReservation(
                    item.Id,
                    productId,
                    dto.Quantity,
                    dto.ReferenceId,
                    dto.ReferenceType,
                    dto.ExpirationHours ?? 24,
                    dto.Notes
                );

                db.StockReservations.Add(reservation);
                await db.SaveChangesAsync();

                return Results.Ok(new { success = true, reservationId = reservation.Id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ManageStock));

        group.MapPost("/reservations/{referenceId}/fulfill", async (string referenceId, InventoryDbContext db) =>
        {
            var reservations = await db.StockReservations
                .Where(r => r.ReferenceId == referenceId && r.Status == ReservationStatus.Active)
                .ToListAsync();

            if (!reservations.Any())
                return Results.NotFound(new { error = "No active reservations found" });

            foreach (var reservation in reservations)
            {
                var item = await db.InventoryItems.FindAsync(reservation.InventoryItemId);
                if (item != null)
                {
                    item.ConfirmReservedStock(reservation.Quantity);
                    reservation.Fulfill();
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, fulfilledCount = reservations.Count });
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ManageStock));

        group.MapPost("/reservations/{referenceId}/release", async (string referenceId, ReleaseReservationDto dto, InventoryDbContext db) =>
        {
            var reservations = await db.StockReservations
                .Where(r => r.ReferenceId == referenceId && r.Status == ReservationStatus.Active)
                .ToListAsync();

            if (!reservations.Any())
                return Results.NotFound(new { error = "No active reservations found" });

            foreach (var reservation in reservations)
            {
                var item = await db.InventoryItems.FindAsync(reservation.InventoryItemId);
                if (item != null)
                {
                    item.ReleaseReservedStock(reservation.Quantity);
                    reservation.Release(dto.Reason);
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, releasedCount = reservations.Count });
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ManageStock));

        // Purchase Orders
        group.MapGet("/po", async (InventoryDbContext db) =>
        {
            return await db.PurchaseOrders.Include(p => p.Items).OrderByDescending(p => p.PONumber).ToListAsync();
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ViewPurchaseOrder));

        group.MapPost("/po", async (CreatePurchaseOrderDto dto, InventoryDbContext db) =>
        {
            var items = dto.Items.Select(i => new PurchaseOrderItem(i.ProductId, i.Quantity, i.UnitPrice)).ToList();
            var po = new PurchaseOrder(dto.SupplierId, items);

            db.PurchaseOrders.Add(po);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/po/{po.Id}", po);
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.CreatePurchaseOrder));

        group.MapPut("/po/{id:guid}/send", async (Guid id, InventoryDbContext db) =>
        {
            var po = await db.PurchaseOrders.FindAsync(id);
            if (po == null) return Results.NotFound();

            try {
                po.Send();
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Đã gửi đơn hàng" });
            } catch (InvalidOperationException ex) {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.CreatePurchaseOrder));

        group.MapPut("/po/{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var po = await db.PurchaseOrders.FindAsync(id);
            if (po == null) return Results.NotFound();

            try {
                po.Cancel();
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Đã hủy đơn hàng" });
            } catch (InvalidOperationException ex) {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.CreatePurchaseOrder));

        group.MapPut("/po/{id:guid}/receive", async (Guid id, InventoryDbContext db) =>
        {
            var po = await db.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return Results.NotFound();

            try {
                po.ReceiveAll(); // Status changes to Received

                // 1. Update Inventory Stock
                foreach (var item in po.Items)
                {
                    var invItem = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == item.ProductId);
                    if (invItem != null)
                    {
                        invItem.AdjustStock(item.Quantity, $"Nhận hàng từ PO: {po.PONumber}");
                    }
                    else
                    {
                        db.InventoryItems.Add(new InventoryItem(item.ProductId, item.Quantity));
                    }
                }

                // 2. Update Supplier Info (Total Orders, Purchase Amount, Debt)
                var supplier = await db.Suppliers.FindAsync(po.SupplierId);
                if (supplier != null)
                {
                    supplier.RecordOrder(po.TotalAmount);
                    supplier.UpdateDebt(po.TotalAmount); // We owe supplier more money
                }

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Đã nhận hàng và cập nhật tồn kho" });
            } catch (InvalidOperationException ex) {
                return Results.BadRequest(new { error = "Có lỗi xảy ra. Vui lòng thử lại." });
            }
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ReceivePurchaseOrder));

        // Suppliers CRUD
        MapSupplierEndpoints(group);

        // Serial timeline — tra 1 serial trả dòng thời gian trọn đời.
        MapSerialTimelineEndpoint(app);
    }

    /// <summary>
    /// GET /api/inventory/serials/{serial}/timeline — trả timeline gộp:
    ///  - Purchased  (từ SerialNumber.PurchaseOrderId → PurchaseOrder.PONumber + Supplier)
    ///  - Sold       (SerialNumber.OrderId — join Sales.Orders qua raw SQL)
    ///  - Repair     (SerialNumber.WorkOrderId — join Repair.WorkOrders qua raw SQL)
    ///  - Warranty   (join Warranty.WarrantyClaims theo Serial string)
    /// Module hạ nguồn chưa có bản ghi → bỏ qua entry đó, không throw.
    /// </summary>
    private static void MapSerialTimelineEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/inventory/serials/{serial}/timeline", async (string serial, InventoryDbContext db) =>
        {
            var sn = await db.SerialNumbers.FirstOrDefaultAsync(s => s.Serial == serial);
            if (sn == null) return Results.NotFound(new { error = "Không tìm thấy serial" });

            var timeline = new List<object>();

            // 1. Purchased
            if (sn.PurchaseOrderId.HasValue)
            {
                var po = await db.PurchaseOrders
                    .Where(p => p.Id == sn.PurchaseOrderId.Value)
                    .Select(p => new { p.PONumber, p.SupplierId, p.CreatedAt })
                    .FirstOrDefaultAsync();
                if (po != null)
                {
                    var supplierName = await db.Suppliers
                        .Where(s => s.Id == po.SupplierId)
                        .Select(s => s.Name)
                        .FirstOrDefaultAsync();
                    timeline.Add(new
                    {
                        at = sn.ReceivedAt ?? po.CreatedAt,
                        type = "Purchased",
                        reference = po.PONumber,
                        supplier = supplierName
                    });
                }
            }

            // 2. Sold — từ SerialNumber.OrderId + Sales.Orders (raw SQL để không import Sales entity)
            if (sn.OrderId.HasValue && sn.SoldAt.HasValue)
            {
                var (orderNumber, customerName) = await LookupOrderAsync(db, sn.OrderId.Value);
                timeline.Add(new
                {
                    at = sn.SoldAt.Value,
                    type = "Sold",
                    reference = orderNumber ?? sn.OrderId.Value.ToString(),
                    customer = customerName
                });
            }

            // 3. Repair — SerialNumber.WorkOrderId + Repair.WorkOrders
            if (sn.WorkOrderId.HasValue)
            {
                var woInfo = await LookupWorkOrderAsync(db, sn.WorkOrderId.Value);
                if (woInfo != null)
                {
                    timeline.Add(new
                    {
                        at = woInfo.Value.At,
                        type = "Repair",
                        reference = woInfo.Value.Number,
                        status = woInfo.Value.Status
                    });
                }
            }

            // 4. Warranty claims theo Serial string (Warranty.WarrantyClaims)
            var claims = await LookupWarrantyClaimsAsync(db, sn.Serial);
            foreach (var c in claims)
            {
                timeline.Add(new
                {
                    at = c.At,
                    type = "WarrantyClaim",
                    reference = c.Number,
                    status = c.Status
                });
            }

            // 5. Returned (nếu có)
            if (sn.ReturnedAt.HasValue)
            {
                timeline.Add(new
                {
                    at = sn.ReturnedAt.Value,
                    type = "Returned",
                    notes = sn.Notes
                });
            }

            return Results.Ok(new
            {
                serial = sn.Serial,
                productId = sn.ProductId,
                productName = sn.ProductName,
                status = sn.Status.ToString(),
                warrantyEndDate = sn.WarrantyEndDate,
                timeline = timeline.OrderBy(x => ((DateTime)x.GetType().GetProperty("at")!.GetValue(x)!)).ToList()
            });
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ViewStock));
    }

    private static async Task<(string? OrderNumber, string? CustomerName)> LookupOrderAsync(InventoryDbContext db, Guid orderId)
    {
        try
        {
            var conn = db.Database.GetDbConnection();
            var opened = conn.State != System.Data.ConnectionState.Open;
            if (opened) await conn.OpenAsync();
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"SELECT ""OrderNumber"", ""CustomerName""
                                    FROM ""Orders"" WHERE ""Id"" = @id LIMIT 1";
                var p = cmd.CreateParameter();
                p.ParameterName = "@id";
                p.Value = orderId;
                cmd.Parameters.Add(p);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var num = reader.IsDBNull(0) ? null : reader.GetString(0);
                    var cust = reader.IsDBNull(1) ? null : reader.GetString(1);
                    return (num, cust);
                }
            }
            finally { if (opened) await conn.CloseAsync(); }
        }
        catch { }
        return (null, null);
    }

    private static async Task<(string Number, string Status, DateTime At)?> LookupWorkOrderAsync(InventoryDbContext db, Guid workOrderId)
    {
        try
        {
            var conn = db.Database.GetDbConnection();
            var opened = conn.State != System.Data.ConnectionState.Open;
            if (opened) await conn.OpenAsync();
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"SELECT ""WorkOrderNumber"", ""Status"", ""CreatedAt""
                                    FROM ""WorkOrders"" WHERE ""Id"" = @id LIMIT 1";
                var p = cmd.CreateParameter();
                p.ParameterName = "@id";
                p.Value = workOrderId;
                cmd.Parameters.Add(p);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var num = reader.IsDBNull(0) ? workOrderId.ToString() : reader.GetString(0);
                    var status = reader.IsDBNull(1) ? "Unknown" : reader.GetValue(1).ToString() ?? "Unknown";
                    var at = reader.IsDBNull(2) ? DateTime.UtcNow : reader.GetDateTime(2);
                    return (num, status, at);
                }
            }
            finally { if (opened) await conn.CloseAsync(); }
        }
        catch { }
        return null;
    }

    private static async Task<List<(string Number, string Status, DateTime At)>> LookupWarrantyClaimsAsync(InventoryDbContext db, string serial)
    {
        var list = new List<(string, string, DateTime)>();
        try
        {
            var conn = db.Database.GetDbConnection();
            var opened = conn.State != System.Data.ConnectionState.Open;
            if (opened) await conn.OpenAsync();
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"SELECT ""ClaimNumber"", ""Status"", ""ClaimDate""
                                    FROM ""WarrantyClaims""
                                    WHERE ""SerialNumber"" = @serial
                                    ORDER BY ""ClaimDate"" ASC";
                var p = cmd.CreateParameter();
                p.ParameterName = "@serial";
                p.Value = serial;
                cmd.Parameters.Add(p);
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var num = reader.IsDBNull(0) ? "" : reader.GetString(0);
                    var status = reader.IsDBNull(1) ? "" : reader.GetValue(1).ToString() ?? "";
                    var at = reader.IsDBNull(2) ? DateTime.UtcNow : reader.GetDateTime(2);
                    list.Add((num, status, at));
                }
            }
            finally { if (opened) await conn.CloseAsync(); }
        }
        catch { }
        return list;
    }

    private static void MapSupplierEndpoints(RouteGroupBuilder group)
    {
        var supplierGroup = group.MapGroup("/suppliers");

        // GET /api/inventory/suppliers - List with pagination, search, sort
        supplierGroup.MapGet("", async (
            [AsParameters] QueryParams queryParams,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var result = await repository.GetPagedAsync(queryParams);

            // Map to list item DTOs
            var response = new PagedResult<SupplierListItem>(
                result.Items.Select(s => new SupplierListItem(
                    s.Id,
                    s.Code,
                    s.Name,
                    s.ShortName,
                    s.SupplierType.ToString(),
                    SupplierEnumHelper.GetSupplierTypeDisplay(s.SupplierType),
                    s.ContactPerson,
                    s.Phone,
                    s.Email,
                    s.City,
                    s.PaymentTerms.ToString(),
                    SupplierEnumHelper.GetPaymentTermsDisplay(s.PaymentTerms),
                    s.CreditLimit,
                    s.CurrentDebt,
                    s.Rating,
                    s.TotalOrders,
                    s.TotalPurchaseAmount,
                    s.IsActive,
                    s.CreatedAt
                )).ToList(),
                result.Total,
                result.Page,
                result.PageSize
            );

            return Results.Ok(response);
        })
        .RequireAuthorization(Permissions.Inventory.ViewSupplier)
        .WithName("GetSuppliers")
        .WithTags("Suppliers");

        // GET /api/inventory/suppliers/dropdown - Dropdown list
        supplierGroup.MapGet("dropdown", async (
            bool? activeOnly,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var result = await repository.GetDropdownListAsync(activeOnly ?? true);
            return Results.Ok(result);
        })
        .RequireAuthorization(Permissions.Inventory.ViewSupplier)
        .WithName("GetSuppliersDropdown")
        .WithTags("Suppliers");

        // GET /api/inventory/suppliers/statistics - Statistics
        supplierGroup.MapGet("statistics", async (InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var stats = await repository.GetStatisticsAsync();
            return Results.Ok(stats);
        })
        .RequireAuthorization(Permissions.Inventory.ViewSupplier)
        .WithName("GetSupplierStatistics")
        .WithTags("Suppliers");

        // GET /api/inventory/suppliers/enums - Get enums for dropdowns
        supplierGroup.MapGet("enums", () =>
        {
            var supplierTypes = Enum.GetValues<SupplierType>()
                .Select(t => new { value = t.ToString(), label = SupplierEnumHelper.GetSupplierTypeDisplay(t) });

            var paymentTerms = Enum.GetValues<PaymentTermType>()
                .Select(t => new { value = t.ToString(), label = SupplierEnumHelper.GetPaymentTermsDisplay(t) });

            return Results.Ok(new { supplierTypes, paymentTerms });
        })
        .RequireAuthorization(Permissions.Inventory.ViewSupplier)
        .WithName("GetSupplierEnums")
        .WithTags("Suppliers");

        // GET /api/inventory/suppliers/generate-code - Generate new supplier code
        supplierGroup.MapGet("generate-code", async (InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var code = await repository.GenerateSupplierCodeAsync();
            return Results.Ok(new { code });
        })
        .RequireAuthorization(Permissions.Inventory.CreateSupplier)
        .WithName("GenerateSupplierCode")
        .WithTags("Suppliers");

        // GET /api/inventory/suppliers/{id} - Get by ID
        supplierGroup.MapGet("{id:guid}", async (
            Guid id,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
            {
                return Results.NotFound(new { error = "Không tìm thấy nhà cung cấp" });
            }

            var response = MapToSupplierResponse(supplier);
            return Results.Ok(response);
        })
        .RequireAuthorization(Permissions.Inventory.ViewSupplier)
        .WithName("GetSupplierById")
        .WithTags("Suppliers");

        // POST /api/inventory/suppliers - Create
        supplierGroup.MapPost("", async (
            CreateSupplierDto dto,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);

            // Check if tax code exists
            if (!string.IsNullOrEmpty(dto.TaxCode))
            {
                var taxCodeExists = await repository.TaxCodeExistsAsync(dto.TaxCode);
                if (taxCodeExists)
                {
                    return Results.BadRequest(new { error = "Mã số thuế đã tồn tại trong hệ thống" });
                }
            }

            // Check if email exists
            var emailExists = await repository.EmailExistsAsync(dto.Email);
            if (emailExists)
            {
                return Results.BadRequest(new { error = "Email đã được sử dụng bởi nhà cung cấp khác" });
            }

            // Generate supplier code
            var code = await repository.GenerateSupplierCodeAsync();

            // Create entity
            var supplier = new Supplier(
                code,
                dto.Name,
                dto.ContactPerson,
                dto.Email,
                dto.Phone,
                dto.Address,
                dto.SupplierType,
                dto.PaymentTerms
            );

            // Update all details
            supplier.UpdateBasicInfo(
                dto.Name,
                dto.ShortName,
                dto.SupplierType,
                dto.Description,
                dto.Website,
                dto.LogoUrl
            );

            supplier.UpdateBusinessInfo(
                dto.TaxCode,
                dto.BankAccount,
                dto.BankName,
                dto.BankBranch,
                dto.PaymentTerms,
                dto.PaymentDays,
                dto.CreditLimit
            );

            supplier.UpdateContact(
                dto.ContactPerson,
                dto.ContactTitle,
                dto.Email,
                dto.Phone,
                dto.Fax
            );

            supplier.UpdateAddress(
                dto.Address,
                dto.Ward,
                dto.District,
                dto.City,
                dto.Country,
                dto.PostalCode
            );

            supplier.UpdateNotes(
                dto.Rating,
                dto.Notes,
                dto.Categories,
                dto.Brands
            );

            // Validate entity domain rules
            var entityValidation = supplier.Validate();
            if (!entityValidation.IsValid)
            {
                return Results.BadRequest(new { errors = entityValidation.Errors });
            }

            // Save
            var created = await repository.AddAsync(supplier);
            var response = MapToSupplierResponse(created);

            return Results.Created($"/api/inventory/suppliers/{created.Id}", response);
        })
        .RequireAuthorization(Permissions.Inventory.CreateSupplier)
        .WithName("CreateSupplier")
        .WithTags("Suppliers");

        // PUT /api/inventory/suppliers/{id} - Update
        supplierGroup.MapPut("{id:guid}", async (
            Guid id,
            UpdateSupplierDto dto,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
            {
                return Results.NotFound(new { error = "Không tìm thấy nhà cung cấp" });
            }

            // Check if tax code exists (excluding current supplier)
            if (!string.IsNullOrEmpty(dto.TaxCode))
            {
                var taxCodeExists = await repository.TaxCodeExistsAsync(dto.TaxCode, id);
                if (taxCodeExists)
                {
                    return Results.BadRequest(new { error = "Mã số thuế đã tồn tại trong hệ thống" });
                }
            }

            // Check if email exists (excluding current supplier)
            var emailExists = await repository.EmailExistsAsync(dto.Email, id);
            if (emailExists)
            {
                return Results.BadRequest(new { error = "Email đã được sử dụng bởi nhà cung cấp khác" });
            }

            // Update all details
            supplier.UpdateBasicInfo(
                dto.Name,
                dto.ShortName,
                dto.SupplierType,
                dto.Description,
                dto.Website,
                dto.LogoUrl
            );

            supplier.UpdateBusinessInfo(
                dto.TaxCode,
                dto.BankAccount,
                dto.BankName,
                dto.BankBranch,
                dto.PaymentTerms,
                dto.PaymentDays,
                dto.CreditLimit
            );

            supplier.UpdateContact(
                dto.ContactPerson,
                dto.ContactTitle,
                dto.Email,
                dto.Phone,
                dto.Fax
            );

            supplier.UpdateAddress(
                dto.Address,
                dto.Ward,
                dto.District,
                dto.City,
                dto.Country,
                dto.PostalCode
            );

            supplier.UpdateNotes(
                dto.Rating,
                dto.Notes,
                dto.Categories,
                dto.Brands
            );

            // Validate entity domain rules
            var entityValidation = supplier.Validate();
            if (!entityValidation.IsValid)
            {
                return Results.BadRequest(new { errors = entityValidation.Errors });
            }

            // Save
            await repository.UpdateAsync(supplier);
            var response = MapToSupplierResponse(supplier);

            return Results.Ok(response);
        })
        .RequireAuthorization(Permissions.Inventory.UpdateSupplier)
        .WithName("UpdateSupplier")
        .WithTags("Suppliers");

        // DELETE /api/inventory/suppliers/{id} - Soft delete
        supplierGroup.MapDelete("{id:guid}", async (
            Guid id,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
            {
                return Results.NotFound(new { error = "Không tìm thấy nhà cung cấp" });
            }

            // Check for active purchase orders
            var hasActivePOs = await repository.HasActivePurchaseOrders(id);
            if (hasActivePOs)
            {
                return Results.BadRequest(new
                {
                    error = "Không thể xóa nhà cung cấp",
                    message = "Nhà cung cấp có đơn mua hàng đang xử lý. Vui lòng hoàn thành hoặc hủy các đơn hàng trước."
                });
            }

            // Soft delete
            await repository.DeleteAsync(id);

            return Results.NoContent();
        })
        .RequireAuthorization(Permissions.Inventory.DeleteSupplier)
        .WithName("DeleteSupplier")
        .WithTags("Suppliers");

        // PUT /api/inventory/suppliers/{id}/toggle-active - Toggle active status
        supplierGroup.MapPut("{id:guid}/toggle-active", async (
            Guid id,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
            {
                return Results.NotFound(new { error = "Không tìm thấy nhà cung cấp" });
            }

            // Toggle active status
            supplier.IsActive = !supplier.IsActive;
            supplier.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var response = MapToSupplierResponse(supplier);
            return Results.Ok(response);
        })
        .RequireAuthorization(Permissions.Inventory.UpdateSupplier)
        .WithName("ToggleSupplierActive")
        .WithTags("Suppliers");
    }

    private static SupplierResponse MapToSupplierResponse(Supplier s)
    {
        return new SupplierResponse(
            s.Id,
            s.Code,
            s.Name,
            s.ShortName,
            s.SupplierType.ToString(),
            SupplierEnumHelper.GetSupplierTypeDisplay(s.SupplierType),
            s.Description,
            s.Website,
            s.LogoUrl,
            s.TaxCode,
            s.BankAccount,
            s.BankName,
            s.BankBranch,
            s.PaymentTerms.ToString(),
            SupplierEnumHelper.GetPaymentTermsDisplay(s.PaymentTerms),
            s.PaymentDays,
            s.CreditLimit,
            s.CurrentDebt,
            s.CreditLimit > 0 ? s.CreditLimit - s.CurrentDebt : 0,
            s.ContactPerson,
            s.ContactTitle,
            s.Email,
            s.Phone,
            s.Fax,
            s.Address,
            s.Ward,
            s.District,
            s.City,
            s.Country,
            s.PostalCode,
            SupplierEnumHelper.BuildFullAddress(s.Address, s.Ward, s.District, s.City, s.Country),
            s.Rating,
            s.Notes,
            s.Categories,
            s.Brands,
            s.TotalOrders,
            s.TotalPurchaseAmount,
            s.LastOrderDate,
            s.FirstOrderDate,
            s.IsActive,
            s.CreatedAt,
            s.UpdatedAt
        );
    }
}

public record CreatePurchaseOrderDto(Guid SupplierId, List<CreatePOItemDto> Items);
public record CreatePOItemDto(Guid ProductId, int Quantity, decimal UnitPrice);
public record ReserveStockDto(int Quantity, string ReferenceId, string ReferenceType, int? ExpirationHours = 24, string? Notes = null);
public record ReleaseReservationDto(string Reason);
