using BuildingBlocks.Endpoints;

namespace Repair.Domain;

/// <summary>
/// Thông tin tiếp nhận máy trên <see cref="WorkOrder"/>: mức ưu tiên, loại/hãng/model thiết bị,
/// phụ kiện khách để lại và ảnh lúc nhận. Tách file để WorkOrder.cs không phình thêm.
/// </summary>
public partial class WorkOrder
{
    public const int MaxIntakePhotos = 20;
    public const int MaxAccessories = 30;
    public const int MaxDeviceFieldLength = 100;

    public WorkOrderPriority Priority { get; private set; } = WorkOrderPriority.Normal;
    public string? DeviceType { get; private set; }
    public string? DeviceBrand { get; private set; }
    public List<string> AccessoriesReceived { get; private set; } = new();
    public List<string> IntakePhotoUrls { get; private set; } = new();

    public void UpdateIntake(WorkOrderPriority priority, string? deviceType, string? deviceBrand,
        string? deviceModel, string? serialNumber, IEnumerable<string>? accessories, Guid? serviceTypeId)
    {
        if (!Enum.IsDefined(priority))
            throw new RequestValidationException("priority", "Mức ưu tiên không hợp lệ.");
        if (Status is WorkOrderStatus.Cancelled or WorkOrderStatus.Delivered)
            throw new InvalidOperationException("Cannot edit intake of a closed work order");

        var cleanedAccessories = (accessories ?? Array.Empty<string>())
            .Select(a => a?.Trim() ?? string.Empty)
            .Where(a => a.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (cleanedAccessories.Count > MaxAccessories || cleanedAccessories.Any(a => a.Length > MaxDeviceFieldLength))
            throw new RequestValidationException("accessoriesReceived", $"Tối đa {MaxAccessories} phụ kiện, mỗi mục tối đa {MaxDeviceFieldLength} ký tự.");

        Priority = priority;
        DeviceType = Clean(deviceType, "deviceType");
        DeviceBrand = Clean(deviceBrand, "deviceBrand");
        if (!string.IsNullOrWhiteSpace(deviceModel)) DeviceModel = Clean(deviceModel, "deviceModel")!;
        if (serialNumber != null) SerialNumber = serialNumber.Trim();
        AccessoriesReceived = cleanedAccessories;
        ServiceTypeId = serviceTypeId ?? ServiceTypeId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddIntakePhotos(IReadOnlyCollection<string> urls)
    {
        if (IntakePhotoUrls.Count + urls.Count > MaxIntakePhotos)
            throw new RequestValidationException("files", $"Mỗi phiếu tối đa {MaxIntakePhotos} ảnh tiếp nhận.");
        // Gán list mới (không Add tại chỗ) để EF nhận ra cột mảng đã đổi.
        IntakePhotoUrls = IntakePhotoUrls.Concat(urls).ToList();
        UpdatedAt = DateTime.UtcNow;
    }

    public bool RemoveIntakePhoto(string url)
    {
        if (!IntakePhotoUrls.Contains(url)) return false;
        IntakePhotoUrls = IntakePhotoUrls.Where(u => u != url).ToList();
        UpdatedAt = DateTime.UtcNow;
        return true;
    }

    private static string? Clean(string? value, string field)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        if (trimmed.Length > MaxDeviceFieldLength)
            throw new RequestValidationException(field, $"Tối đa {MaxDeviceFieldLength} ký tự.");
        return trimmed;
    }
}
