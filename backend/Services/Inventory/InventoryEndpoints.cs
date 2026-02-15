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
                return Results.BadRequest(new { error = ex.Message });
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

        group.MapPut("/po/{id:guid}/receive", async (Guid id, InventoryDbContext db) =>
        {
            var po = await db.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return Results.NotFound();

            if (po.Status == POStatus.Received) return Results.BadRequest("Already received");

            foreach (var item in po.Items)
            {
                var invItem = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == item.ProductId);
                if (invItem != null)
                {
                    invItem.AdjustStock(item.Quantity);
                }
                else
                {
                    db.InventoryItems.Add(new InventoryItem(item.ProductId, item.Quantity));
                }
            }

            po.ReceiveAll();
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Items received and stock updated" });
        })
        .RequireAuthorization(policy => policy.RequireClaim(BuildingBlocks.Security.Permissions.PermissionType,
            BuildingBlocks.Security.Permissions.Inventory.ReceivePurchaseOrder));

        // Suppliers CRUD
        MapSupplierEndpoints(group);
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
