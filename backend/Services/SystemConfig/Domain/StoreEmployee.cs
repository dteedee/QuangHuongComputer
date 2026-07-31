using BuildingBlocks.SharedKernel;

namespace SystemConfig.Domain;

/// <summary>
/// Junction: 1 Store có nhiều Employee. Chỉ giữ Guid EmployeeId, KHÔNG import HR.Employee entity.
/// </summary>
public class StoreEmployee : Entity<Guid>
{
    public Guid StoreId { get; private set; }
    public Guid EmployeeId { get; private set; }
    public string? Role { get; private set; }
    public DateTime AssignedAt { get; private set; }

    protected StoreEmployee() { }

    public StoreEmployee(Guid storeId, Guid employeeId, string? role = null)
    {
        Id = Guid.NewGuid();
        StoreId = storeId;
        EmployeeId = employeeId;
        Role = role;
        AssignedAt = DateTime.UtcNow;
    }
}
