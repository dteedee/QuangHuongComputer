using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

/// <summary>
/// Phase 07: SLA cam kết theo loại xử lý claim.
/// TargetHours = giờ tối đa để xử lý (từ khi claim chuyển InProgress).
/// WarningAtPercent = ngưỡng % SLA đã trôi qua để cảnh báo quản lý (mặc định 80%).
/// </summary>
public class WarrantySlaPolicy : Entity<Guid>
{
    public ClaimType ClaimType { get; private set; }
    public int TargetHours { get; private set; }
    public int WarningAtPercent { get; private set; } = 80;
    // Sử dụng Entity.IsActive từ base.
    public string? Notes { get; private set; }

    protected WarrantySlaPolicy() { }

    public WarrantySlaPolicy(
        ClaimType claimType,
        int targetHours,
        int warningAtPercent = 80,
        bool isActive = true,
        string? notes = null)
    {
        if (targetHours <= 0)
            throw new ArgumentException("TargetHours phải dương.", nameof(targetHours));
        if (warningAtPercent <= 0 || warningAtPercent > 100)
            throw new ArgumentException("WarningAtPercent phải trong (0,100].", nameof(warningAtPercent));

        Id = Guid.NewGuid();
        ClaimType = claimType;
        TargetHours = targetHours;
        WarningAtPercent = warningAtPercent;
        base.IsActive = isActive;
        Notes = notes;
    }

    public void Update(int targetHours, int warningAtPercent, bool isActive, string? notes)
    {
        if (targetHours <= 0)
            throw new ArgumentException("TargetHours phải dương.", nameof(targetHours));
        if (warningAtPercent <= 0 || warningAtPercent > 100)
            throw new ArgumentException("WarningAtPercent phải trong (0,100].", nameof(warningAtPercent));

        TargetHours = targetHours;
        WarningAtPercent = warningAtPercent;
        base.IsActive = isActive;
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }
}
