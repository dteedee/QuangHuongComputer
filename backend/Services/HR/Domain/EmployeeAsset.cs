using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum AssetCondition
{
    New = 0,            // Mới
    Good = 1,           // Đã sử dụng, còn tốt
    Fair = 2,           // Bình thường
    Damaged = 3,        // Hư hỏng
    Lost = 4            // Mất
}

/// <summary>
/// Tài sản cấp phát cho nhân viên (laptop, điện thoại...).
/// Nối với Inventory.SerialNumber qua InventorySerialId khi cấp từ kho.
/// Không cho phép quyết toán nghỉ việc nếu còn asset chưa return.
/// </summary>
public class EmployeeAsset : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public string AssetType { get; private set; } = string.Empty;   // "Laptop", "Điện thoại", "Xe máy"
    public string AssetCode { get; private set; } = string.Empty;   // Mã tài sản nội bộ
    public string? SerialNumber { get; private set; }
    public Guid? InventorySerialId { get; private set; }            // liên kết SerialNumber (Inventory)
    public DateTime AssignedDate { get; private set; }
    public AssetCondition ConditionOnAssign { get; private set; }
    public decimal Value { get; private set; }
    public DateTime? ReturnedDate { get; private set; }
    public AssetCondition? ConditionOnReturn { get; private set; }
    public string? Notes { get; private set; }
    public Guid? AssignedBy { get; private set; }
    public Guid? ReceivedBy { get; private set; }

    public EmployeeAsset(
        Guid employeeId,
        string assetType,
        string assetCode,
        decimal value,
        AssetCondition conditionOnAssign = AssetCondition.New,
        string? serialNumber = null,
        Guid? inventorySerialId = null,
        DateTime? assignedDate = null,
        Guid? assignedBy = null,
        string? notes = null)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (string.IsNullOrWhiteSpace(assetType)) throw new ArgumentException("Loại tài sản là bắt buộc.");
        if (string.IsNullOrWhiteSpace(assetCode)) throw new ArgumentException("Mã tài sản là bắt buộc.");
        if (value < 0) throw new ArgumentException("Giá trị tài sản >= 0.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        AssetType = assetType;
        AssetCode = assetCode;
        SerialNumber = serialNumber;
        InventorySerialId = inventorySerialId;
        AssignedDate = assignedDate ?? DateTime.UtcNow;
        ConditionOnAssign = conditionOnAssign;
        Value = value;
        AssignedBy = assignedBy;
        Notes = notes;
    }

    protected EmployeeAsset() { }

    public bool IsReturned => ReturnedDate.HasValue;

    public void Return(AssetCondition conditionOnReturn, Guid receivedBy, string? notes = null)
    {
        if (IsReturned)
            throw new InvalidOperationException("Tài sản đã được thu hồi trước đó.");
        ReturnedDate = DateTime.UtcNow;
        ConditionOnReturn = conditionOnReturn;
        ReceivedBy = receivedBy;
        if (!string.IsNullOrWhiteSpace(notes)) Notes = notes;
    }

    public void UpdateNotes(string? notes) => Notes = notes;
}
