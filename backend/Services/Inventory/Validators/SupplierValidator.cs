using BuildingBlocks.Validation;
using InventoryModule.DTOs;
using InventoryModule.Data;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Validators;

public class SupplierValidator : IValidator<CreateSupplierDto>
{
    private readonly InventoryDbContext _dbContext;

    public SupplierValidator(InventoryDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public ValidationResult Validate(CreateSupplierDto instance)
    {
        var result = new ValidationResult();

        if (!CommonValidators.IsNotEmpty(instance.Name))
        {
            result.AddError(nameof(instance.Name), "Name is required");
        }
        else if (!CommonValidators.IsMaxLength(instance.Name, 200))
        {
            result.AddError(nameof(instance.Name), "Name must not exceed 200 characters");
        }

        if (!CommonValidators.IsNotEmpty(instance.ContactPerson))
        {
            result.AddError(nameof(instance.ContactPerson), "Contact person is required");
        }

        if (!CommonValidators.IsValidEmail(instance.Email))
        {
            result.AddError(nameof(instance.Email), "Invalid email format");
        }

        if (!CommonValidators.IsValidPhone(instance.Phone))
        {
            result.AddError(nameof(instance.Phone), "Invalid phone format");
        }

        if (!CommonValidators.IsNotEmpty(instance.Address))
        {
            result.AddError(nameof(instance.Address), "Address is required");
        }

        return result;
    }

    public async Task<ValidationResult> ValidateAsync(CreateSupplierDto instance)
    {
        var result = Validate(instance);

        // Check for duplicate supplier name
        var isDuplicate = await _dbContext.Suppliers
            .AnyAsync(s => s.Name.ToLower() == instance.Name.ToLower() && s.IsActive);

        if (isDuplicate)
        {
            result.AddError(nameof(instance.Name), "A supplier with this name already exists");
        }

        return result;
    }
}

public class UpdateSupplierValidator : IValidator<UpdateSupplierDto>
{
    private readonly InventoryDbContext _dbContext;
    private readonly Guid _supplierId;

    public UpdateSupplierValidator(InventoryDbContext dbContext, Guid supplierId)
    {
        _dbContext = dbContext;
        _supplierId = supplierId;
    }

    public ValidationResult Validate(UpdateSupplierDto instance)
    {
        var result = new ValidationResult();

        if (!CommonValidators.IsNotEmpty(instance.Name))
        {
            result.AddError(nameof(instance.Name), "Name is required");
        }

        if (!CommonValidators.IsNotEmpty(instance.ContactPerson))
        {
            result.AddError(nameof(instance.ContactPerson), "Contact person is required");
        }

        if (!CommonValidators.IsValidEmail(instance.Email))
        {
            result.AddError(nameof(instance.Email), "Invalid email format");
        }

        if (!CommonValidators.IsValidPhone(instance.Phone))
        {
            result.AddError(nameof(instance.Phone), "Invalid phone format");
        }

        if (!CommonValidators.IsNotEmpty(instance.Address))
        {
            result.AddError(nameof(instance.Address), "Address is required");
        }

        return result;
    }

    public async Task<ValidationResult> ValidateAsync(UpdateSupplierDto instance)
    {
        var result = Validate(instance);

        // Check for duplicate supplier name (excluding current supplier)
        var isDuplicate = await _dbContext.Suppliers
            .AnyAsync(s => s.Name.ToLower() == instance.Name.ToLower()
                && s.IsActive
                && s.Id != _supplierId);

        if (isDuplicate)
        {
            result.AddError(nameof(instance.Name), "A supplier with this name already exists");
        }

        return result;
    }
}
