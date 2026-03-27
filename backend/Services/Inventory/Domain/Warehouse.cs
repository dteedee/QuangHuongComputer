using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Warehouse – Kho hàng
/// Manages warehouse locations for multi-warehouse inventory tracking
/// </summary>
public class Warehouse : Entity<Guid>
{
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public WarehouseType Type { get; private set; }
    public string? Address { get; private set; }
    public string? City { get; private set; }
    public string? District { get; private set; }
    public string? Ward { get; private set; }
    public string? Phone { get; private set; }
    public string? ManagerName { get; private set; }
    public string? ManagerEmail { get; private set; }
    public string? Description { get; private set; }
    public int Capacity { get; private set; } // Max number of items
    public bool IsDefault { get; private set; }
    public int CurrentItemCount { get; set; }

    protected Warehouse() { }

    public Warehouse(
        string code,
        string name,
        WarehouseType type,
        string? address = null,
        string? city = null,
        string? phone = null,
        string? managerName = null,
        int capacity = 10000)
    {
        Id = Guid.NewGuid();
        Code = code;
        Name = name;
        Type = type;
        Address = address;
        City = city;
        Phone = phone;
        ManagerName = managerName;
        Capacity = capacity;
        IsDefault = false;
        CurrentItemCount = 0;
    }

    public void Update(
        string name,
        WarehouseType type,
        string? address,
        string? city,
        string? district,
        string? ward,
        string? phone,
        string? managerName,
        string? managerEmail,
        string? description,
        int capacity)
    {
        Name = name;
        Type = type;
        Address = address;
        City = city;
        District = district;
        Ward = ward;
        Phone = phone;
        ManagerName = managerName;
        ManagerEmail = managerEmail;
        Description = description;
        Capacity = capacity;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetAsDefault()
    {
        IsDefault = true;
    }

    public void UnsetDefault()
    {
        IsDefault = false;
    }

    public bool HasCapacity(int additionalItems = 1)
    {
        return Capacity <= 0 || (CurrentItemCount + additionalItems) <= Capacity;
    }
}

public enum WarehouseType
{
    Main,       // Kho chính
    Branch,     // Kho chi nhánh
    Transit,    // Kho trung chuyển
    Showroom,   // Kho trưng bày (showroom)
    Returns,    // Kho hàng trả
    Defective   // Kho hàng lỗi
}
