using System.Text.RegularExpressions;
using BuildingBlocks.Endpoints;
using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

/// <summary>
/// Danh mục dịch vụ sửa chữa do cửa hàng tự sửa (thay cho enum cứng <see cref="ServiceType"/>).
/// <see cref="IsOnSite"/> quyết định dịch vụ làm tại nhà khách (bắt địa chỉ + phí tận nơi) hay
/// tại cửa hàng; enum <see cref="ServiceType"/> giờ chỉ là cột SUY RA từ cờ này để các truy vấn
/// cũ còn chạy. Giá gốc là VND nguyên ĐÃ GỒM VAT, dùng để điền sẵn một dòng báo giá.
/// </summary>
public partial class RepairServiceType : Entity<Guid>
{
    /// <summary>Id cố định của 2 dòng seed ứng với 2 giá trị enum cũ (migration AddRepairServiceTypes).</summary>
    public static readonly Guid InShopSeedId = new("5e7a1c00-0000-4000-8000-000000000001");
    public static readonly Guid OnSiteSeedId = new("5e7a1c00-0000-4000-8000-000000000002");

    public const int MaxCodeLength = 40;
    public const int MaxNameLength = 150;
    public const int MaxDescriptionLength = 1000;

    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public decimal BasePrice { get; private set; }
    public int EstimatedMinutes { get; private set; }
    public bool IsOnSite { get; private set; }
    public int SortOrder { get; private set; }

    /// <summary>Loại dịch vụ tương ứng cho cột enum cũ.</summary>
    public ServiceType LegacyServiceType => IsOnSite ? ServiceType.OnSite : ServiceType.InShop;

    protected RepairServiceType() { }

    public RepairServiceType(string code, string name, string? description, decimal basePrice,
        int estimatedMinutes, bool isOnSite, int sortOrder, bool isActive = true)
    {
        Id = Guid.NewGuid();
        CreatedAt = DateTime.UtcNow;
        Update(code, name, description, basePrice, estimatedMinutes, isOnSite, sortOrder, isActive);
    }

    public void Update(string code, string name, string? description, decimal basePrice,
        int estimatedMinutes, bool isOnSite, int sortOrder, bool isActive)
    {
        var normalizedCode = NormalizeCode(code);
        if (normalizedCode.Length == 0 || normalizedCode.Length > MaxCodeLength || !CodePattern().IsMatch(normalizedCode))
            throw new RequestValidationException("code", "Mã dịch vụ chỉ gồm chữ không dấu, số, '-' hoặc '_' (tối đa 40 ký tự).");
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > MaxNameLength)
            throw new RequestValidationException("name", $"Tên dịch vụ là bắt buộc, tối đa {MaxNameLength} ký tự.");
        if (description?.Trim().Length > MaxDescriptionLength)
            throw new RequestValidationException("description", $"Mô tả tối đa {MaxDescriptionLength} ký tự.");
        if (basePrice < 0 || decimal.Truncate(basePrice) != basePrice)
            throw new RequestValidationException("basePrice", "Giá gốc phải là số đồng nguyên, không âm.");
        if (estimatedMinutes < 0 || estimatedMinutes > 60 * 24 * 30)
            throw new RequestValidationException("estimatedMinutes", "Thời gian ước tính không hợp lệ.");

        Code = normalizedCode;
        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        BasePrice = basePrice;
        EstimatedMinutes = estimatedMinutes;
        IsOnSite = isOnSite;
        SortOrder = sortOrder;
        IsActive = isActive;
        UpdatedAt = DateTime.UtcNow;
    }

    public static string NormalizeCode(string? code) => (code ?? string.Empty).Trim().ToUpperInvariant();

    [GeneratedRegex("^[A-Z0-9_-]+$")]
    private static partial Regex CodePattern();
}
