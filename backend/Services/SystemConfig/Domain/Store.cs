using BuildingBlocks.SharedKernel;

namespace SystemConfig.Domain;

/// <summary>
/// Store — chi nhánh cửa hàng vật lý (điểm bán) mà khách nhìn thấy.
/// Khác Warehouse: Warehouse là kho nội bộ (Main/Branch/Showroom/Returns/Defective);
/// Store là điểm bán mà khách có thể ghé xem/lấy hàng. 1 Store có thể chứa nhiều Warehouse.
/// </summary>
public class Store : Entity<Guid>
{
    public string Code { get; private set; } = string.Empty;   // ví dụ "HN-CG"
    public string Name { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public string? Ward { get; private set; }
    public string? District { get; private set; }
    public string? Province { get; private set; }
    public string Phone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    /// <summary>
    /// JSON dạng { "mon": "09:00-21:00", "tue": "09:00-21:00", ..., "sun": "09:00-19:00" }
    /// </summary>
    public string OpeningHoursJson { get; private set; } = "{}";
    public decimal? Latitude { get; private set; }
    public decimal? Longitude { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool IsPickupPoint { get; private set; } = true;
    public int SortOrder { get; private set; }

    private readonly List<StoreWarehouse> _warehouses = new();
    public IReadOnlyCollection<StoreWarehouse> Warehouses => _warehouses.AsReadOnly();

    private readonly List<StoreEmployee> _employees = new();
    public IReadOnlyCollection<StoreEmployee> Employees => _employees.AsReadOnly();

    protected Store() { }

    public Store(
        string code,
        string name,
        string address,
        string phone,
        string? province = null,
        string? district = null,
        string? ward = null,
        string? email = null,
        decimal? latitude = null,
        decimal? longitude = null,
        bool isPickupPoint = true,
        int sortOrder = 0)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Mã cửa hàng không được để trống", nameof(code));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên cửa hàng không được để trống", nameof(name));
        if (string.IsNullOrWhiteSpace(address))
            throw new ArgumentException("Địa chỉ không được để trống", nameof(address));

        Id = Guid.NewGuid();
        Code = code;
        Name = name;
        Address = address;
        Phone = phone ?? string.Empty;
        Province = province;
        District = district;
        Ward = ward;
        Email = email;
        Latitude = latitude;
        Longitude = longitude;
        IsPickupPoint = isPickupPoint;
        SortOrder = sortOrder;
        IsActive = true;
        OpeningHoursJson = DefaultOpeningHoursJson();
    }

    public void UpdateBasicInfo(
        string name, string address, string phone,
        string? ward, string? district, string? province,
        string? email, decimal? latitude, decimal? longitude,
        bool isPickupPoint, int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên cửa hàng không được để trống", nameof(name));
        if (string.IsNullOrWhiteSpace(address))
            throw new ArgumentException("Địa chỉ không được để trống", nameof(address));

        Name = name;
        Address = address;
        Phone = phone ?? string.Empty;
        Ward = ward;
        District = district;
        Province = province;
        Email = email;
        Latitude = latitude;
        Longitude = longitude;
        IsPickupPoint = isPickupPoint;
        SortOrder = sortOrder;
    }

    public void SetOpeningHours(string json)
    {
        // Không parse JSON ở đây — endpoint đã validate; giữ đơn giản.
        OpeningHoursJson = string.IsNullOrWhiteSpace(json) ? "{}" : json;
    }

    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;

    public void AssignWarehouse(Guid warehouseId)
    {
        if (_warehouses.Any(w => w.WarehouseId == warehouseId)) return;
        _warehouses.Add(new StoreWarehouse(Id, warehouseId));
    }

    public void UnassignWarehouse(Guid warehouseId)
    {
        _warehouses.RemoveAll(w => w.WarehouseId == warehouseId);
    }

    public void AssignEmployee(Guid employeeId, string? role = null)
    {
        if (_employees.Any(e => e.EmployeeId == employeeId)) return;
        _employees.Add(new StoreEmployee(Id, employeeId, role));
    }

    public void UnassignEmployee(Guid employeeId)
    {
        _employees.RemoveAll(e => e.EmployeeId == employeeId);
    }

    private static string DefaultOpeningHoursJson()
        => "{\"mon\":\"09:00-21:00\",\"tue\":\"09:00-21:00\",\"wed\":\"09:00-21:00\","
         + "\"thu\":\"09:00-21:00\",\"fri\":\"09:00-21:00\",\"sat\":\"09:00-21:00\",\"sun\":\"09:00-19:00\"}";
}
