using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Hạn mức duyệt PO — cấu hình được ở admin.
/// Khi PO được gửi duyệt, chọn rule có (MinAmount ≤ Total < MaxAmount) và IsActive.
/// RequiredRole = tên vai trò/permission mà người duyệt phải có (kiểm tra qua claim).
/// Seed 3 mức mặc định: 0-50tr (StoreManager), 50-200tr (Manager), 200tr+ (Admin).
/// </summary>
public class POApprovalRule : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public decimal MinAmount { get; private set; }
    public decimal MaxAmount { get; private set; }
    public string RequiredRole { get; private set; } = string.Empty;
    public int SortOrder { get; private set; }

    protected POApprovalRule() { }

    public POApprovalRule(string name, decimal minAmount, decimal maxAmount, string requiredRole, int sortOrder = 0)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Tên rule không được để trống.", nameof(name));
        if (string.IsNullOrWhiteSpace(requiredRole)) throw new ArgumentException("Vai trò yêu cầu không được để trống.", nameof(requiredRole));
        if (minAmount < 0) throw new ArgumentException("MinAmount không được âm.", nameof(minAmount));
        if (maxAmount <= minAmount) throw new ArgumentException("MaxAmount phải lớn hơn MinAmount.", nameof(maxAmount));

        Id = Guid.NewGuid();
        Name = name;
        MinAmount = minAmount;
        MaxAmount = maxAmount;
        RequiredRole = requiredRole;
        SortOrder = sortOrder;
    }

    public void Update(string name, decimal minAmount, decimal maxAmount, string requiredRole, int sortOrder)
    {
        if (maxAmount <= minAmount) throw new ArgumentException("MaxAmount phải lớn hơn MinAmount.");
        Name = name;
        MinAmount = minAmount;
        MaxAmount = maxAmount;
        RequiredRole = requiredRole;
        SortOrder = sortOrder;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool Matches(decimal amount) => IsActive && amount >= MinAmount && amount < MaxAmount;
}
