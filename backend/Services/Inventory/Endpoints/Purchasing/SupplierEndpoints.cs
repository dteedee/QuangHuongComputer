using BuildingBlocks.Repository;
using BuildingBlocks.Security;
using InventoryModule.Domain;
using InventoryModule.DTOs;
using InventoryModule.Infrastructure;
using InventoryModule.Repository;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace InventoryModule.Endpoints.Purchasing;

/// <summary>
/// CRUD nhà cung cấp. Tách NGUYÊN VĂN khỏi <c>InventoryEndpoints.MapSupplierEndpoints</c> ở commit
/// đầu của W2-5; từ đây là file của W2-12. Không đổi một dòng logic nào — đây là slice duy nhất
/// của domain mua hàng đã chạy đúng và là khuôn mẫu cho các slice còn lại.
/// </summary>
public sealed class SupplierEndpoints : IInventorySubmodule
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireModulePermissions(PermissionModules.Inventory);
        var supplierGroup = group.MapGroup("/suppliers").RequireModulePermissions(PermissionModules.Suppliers);

        // GET /api/inventory/suppliers - List with pagination, search, sort
        supplierGroup.MapGet("", async (
            [AsParameters] QueryParams queryParams,
            InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var result = await repository.GetPagedAsync(queryParams);

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
        supplierGroup.MapGet("dropdown", async (bool? activeOnly, InventoryDbContext db) =>
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
        supplierGroup.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
                return Results.NotFound(new { error = "Không tìm thấy nhà cung cấp" });

            return Results.Ok(SupplierMapping.ToResponse(supplier));
        })
        .RequireAuthorization(Permissions.Inventory.ViewSupplier)
        .WithName("GetSupplierById")
        .WithTags("Suppliers");

        // POST /api/inventory/suppliers - Create
        supplierGroup.MapPost("", async (CreateSupplierDto dto, InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);

            if (!string.IsNullOrEmpty(dto.TaxCode))
            {
                var taxCodeExists = await repository.TaxCodeExistsAsync(dto.TaxCode);
                if (taxCodeExists)
                    return Results.BadRequest(new { error = "Mã số thuế đã tồn tại trong hệ thống" });
            }

            var emailExists = await repository.EmailExistsAsync(dto.Email);
            if (emailExists)
                return Results.BadRequest(new { error = "Email đã được sử dụng bởi nhà cung cấp khác" });

            var code = await repository.GenerateSupplierCodeAsync();

            var supplier = new Supplier(
                code, dto.Name, dto.ContactPerson, dto.Email, dto.Phone, dto.Address,
                dto.SupplierType, dto.PaymentTerms);

            SupplierMapping.ApplyDetails(supplier, dto.Name, dto.ShortName, dto.SupplierType, dto.Description, dto.Website,
                dto.LogoUrl, dto.TaxCode, dto.BankAccount, dto.BankName, dto.BankBranch, dto.PaymentTerms,
                dto.PaymentDays, dto.CreditLimit, dto.ContactPerson, dto.ContactTitle, dto.Email, dto.Phone,
                dto.Fax, dto.Address, dto.Ward, dto.District, dto.City, dto.Country, dto.PostalCode,
                dto.Rating, dto.Notes, dto.Categories, dto.Brands);

            var entityValidation = supplier.Validate();
            if (!entityValidation.IsValid)
                return Results.BadRequest(new { errors = entityValidation.Errors });

            var created = await repository.AddAsync(supplier);
            return Results.Created($"/api/inventory/suppliers/{created.Id}", SupplierMapping.ToResponse(created));
        })
        .RequireAuthorization(Permissions.Inventory.CreateSupplier)
        .WithName("CreateSupplier")
        .WithTags("Suppliers");

        // PUT /api/inventory/suppliers/{id} - Update
        supplierGroup.MapPut("{id:guid}", async (Guid id, UpdateSupplierDto dto, InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
                return Results.NotFound(new { error = "Không tìm thấy nhà cung cấp" });

            if (!string.IsNullOrEmpty(dto.TaxCode))
            {
                var taxCodeExists = await repository.TaxCodeExistsAsync(dto.TaxCode, id);
                if (taxCodeExists)
                    return Results.BadRequest(new { error = "Mã số thuế đã tồn tại trong hệ thống" });
            }

            var emailExists = await repository.EmailExistsAsync(dto.Email, id);
            if (emailExists)
                return Results.BadRequest(new { error = "Email đã được sử dụng bởi nhà cung cấp khác" });

            SupplierMapping.ApplyDetails(supplier, dto.Name, dto.ShortName, dto.SupplierType, dto.Description, dto.Website,
                dto.LogoUrl, dto.TaxCode, dto.BankAccount, dto.BankName, dto.BankBranch, dto.PaymentTerms,
                dto.PaymentDays, dto.CreditLimit, dto.ContactPerson, dto.ContactTitle, dto.Email, dto.Phone,
                dto.Fax, dto.Address, dto.Ward, dto.District, dto.City, dto.Country, dto.PostalCode,
                dto.Rating, dto.Notes, dto.Categories, dto.Brands);

            var entityValidation = supplier.Validate();
            if (!entityValidation.IsValid)
                return Results.BadRequest(new { errors = entityValidation.Errors });

            await repository.UpdateAsync(supplier);
            return Results.Ok(SupplierMapping.ToResponse(supplier));
        })
        .RequireAuthorization(Permissions.Inventory.UpdateSupplier)
        .WithName("UpdateSupplier")
        .WithTags("Suppliers");

        // DELETE /api/inventory/suppliers/{id} - Soft delete
        supplierGroup.MapDelete("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
                return Results.NotFound(new { error = "Không tìm thấy nhà cung cấp" });

            var hasActivePOs = await repository.HasActivePurchaseOrders(id);
            if (hasActivePOs)
            {
                return Results.BadRequest(new
                {
                    error = "Không thể xóa nhà cung cấp",
                    message = "Nhà cung cấp có đơn mua hàng đang xử lý. Vui lòng hoàn thành hoặc hủy các đơn hàng trước."
                });
            }

            await repository.DeleteAsync(id);
            return Results.NoContent();
        })
        .RequireAuthorization(Permissions.Inventory.DeleteSupplier)
        .WithName("DeleteSupplier")
        .WithTags("Suppliers");

        // PUT /api/inventory/suppliers/{id}/toggle-active - Toggle active status
        supplierGroup.MapPut("{id:guid}/toggle-active", async (Guid id, InventoryDbContext db) =>
        {
            var repository = new SupplierRepository(db);
            var supplier = await repository.GetByIdAsync(id);

            if (supplier == null)
                return Results.NotFound(new { error = "Không tìm thấy nhà cung cấp" });

            supplier.IsActive = !supplier.IsActive;
            supplier.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(SupplierMapping.ToResponse(supplier));
        })
        .RequireAuthorization(Permissions.Inventory.UpdateSupplier)
        .WithName("ToggleSupplierActive")
        .WithTags("Suppliers");
    }
}
