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
        });

        group.MapGet("/stock/{productId:guid}", async (Guid productId, InventoryDbContext db) =>
        {
            var item = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == productId);
            return item != null ? Results.Ok(item) : Results.NotFound();
        });

        group.MapPut("/stock/{id:guid}/adjust", async (Guid id, int amount, string reason, InventoryDbContext db) =>
        {
            var item = await db.InventoryItems.FindAsync(id);
            if (item == null) return Results.NotFound();

            item.AdjustStock(amount);
            // In a real app, we'd log the reason to a StockMovement table
            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        // Purchase Orders
        group.MapGet("/po", async (InventoryDbContext db) =>
        {
            return await db.PurchaseOrders.Include(p => p.Items).OrderByDescending(p => p.PONumber).ToListAsync();
        });

        group.MapPost("/po", async (CreatePurchaseOrderDto dto, InventoryDbContext db) =>
        {
            var items = dto.Items.Select(i => new PurchaseOrderItem(i.ProductId, i.Quantity, i.UnitPrice)).ToList();
            var po = new PurchaseOrder(dto.SupplierId, items);
            
            db.PurchaseOrders.Add(po);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/po/{po.Id}", po);
        });

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
        });

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

            // Map to response DTOs
            var response = new PagedResult<SupplierResponse>(
                result.Items.Select(s => new SupplierResponse(
                    s.Id,
                    s.Name,
                    s.ContactPerson,
                    s.Email,
                    s.Phone,
                    s.Address,
                    s.IsActive,
                    s.CreatedAt,
                    s.UpdatedAt
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

        // GET /api/inventory/suppliers/{id} - Get by ID
        supplierGroup.MapGet("{id:guid}", async (
            Guid id,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
            {
                return Results.NotFound(new { error = "Supplier not found" });
            }

            var response = new SupplierResponse(
                supplier.Id,
                supplier.Name,
                supplier.ContactPerson,
                supplier.Email,
                supplier.Phone,
                supplier.Address,
                supplier.IsActive,
                supplier.CreatedAt,
                supplier.UpdatedAt
            );

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
            // Validate
            var validator = new SupplierValidator(db);
            var validationResult = await validator.ValidateAsync(dto);

            if (!validationResult.IsValid)
            {
                return Results.BadRequest(new { errors = validationResult.Errors });
            }

            // Create entity
            var supplier = new Supplier(
                dto.Name,
                dto.ContactPerson,
                dto.Email,
                dto.Phone,
                dto.Address
            );

            // Validate entity domain rules
            var entityValidation = supplier.Validate();
            if (!entityValidation.IsValid)
            {
                return Results.BadRequest(new { errors = entityValidation.Errors });
            }

            // Save
            var repository = new SupplierRepository(db);
            var created = await repository.AddAsync(supplier);

            var response = new SupplierResponse(
                created.Id,
                created.Name,
                created.ContactPerson,
                created.Email,
                created.Phone,
                created.Address,
                created.IsActive,
                created.CreatedAt,
                created.UpdatedAt
            );

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
                return Results.NotFound(new { error = "Supplier not found" });
            }

            // Validate
            var validator = new UpdateSupplierValidator(db, id);
            var validationResult = await validator.ValidateAsync(dto);

            if (!validationResult.IsValid)
            {
                return Results.BadRequest(new { errors = validationResult.Errors });
            }

            // Update entity
            supplier.UpdateDetails(
                dto.Name,
                dto.ContactPerson,
                dto.Email,
                dto.Phone,
                dto.Address
            );

            // Validate entity domain rules
            var entityValidation = supplier.Validate();
            if (!entityValidation.IsValid)
            {
                return Results.BadRequest(new { errors = entityValidation.Errors });
            }

            // Save
            await repository.UpdateAsync(supplier);

            var response = new SupplierResponse(
                supplier.Id,
                supplier.Name,
                supplier.ContactPerson,
                supplier.Email,
                supplier.Phone,
                supplier.Address,
                supplier.IsActive,
                supplier.CreatedAt,
                supplier.UpdatedAt
            );

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
                return Results.NotFound(new { error = "Supplier not found" });
            }

            // Check for active purchase orders
            var hasActivePOs = await repository.HasActivePurchaseOrders(id);
            if (hasActivePOs)
            {
                return Results.BadRequest(new
                {
                    error = "Cannot delete supplier",
                    message = "Supplier has active purchase orders. Please complete or cancel them first."
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
                return Results.NotFound(new { error = "Supplier not found" });
            }

            // Toggle active status
            supplier.IsActive = !supplier.IsActive;
            supplier.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var response = new SupplierResponse(
                supplier.Id,
                supplier.Name,
                supplier.ContactPerson,
                supplier.Email,
                supplier.Phone,
                supplier.Address,
                supplier.IsActive,
                supplier.CreatedAt,
                supplier.UpdatedAt
            );

            return Results.Ok(response);
        })
        .RequireAuthorization(Permissions.Inventory.UpdateSupplier)
        .WithName("ToggleSupplierActive")
        .WithTags("Suppliers");
    }
}

public record CreatePurchaseOrderDto(Guid SupplierId, List<CreatePOItemDto> Items);
public record CreatePOItemDto(Guid ProductId, int Quantity, decimal UnitPrice);

