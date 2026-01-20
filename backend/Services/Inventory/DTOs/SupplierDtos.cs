namespace InventoryModule.DTOs;

public record CreateSupplierDto(
    string Name,
    string ContactPerson,
    string Email,
    string Phone,
    string Address
);

public record UpdateSupplierDto(
    string Name,
    string ContactPerson,
    string Email,
    string Phone,
    string Address
);

public record SupplierResponse(
    Guid Id,
    string Name,
    string ContactPerson,
    string Email,
    string Phone,
    string Address,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
