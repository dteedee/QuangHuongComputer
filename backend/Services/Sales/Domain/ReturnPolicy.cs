using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// Phase 07: chính sách đổi trả cấu hình được, áp theo danh mục (Category).
/// CategoryId = null → mặc định áp cho mọi sản phẩm không có policy riêng.
/// Danh mục phần mềm bản quyền / hàng khuyến mãi → policy với IsActive=false hoặc DaysForReturn=0.
/// </summary>
public class ReturnPolicy : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public Guid? CategoryId { get; private set; }
    public int DaysForReturn { get; private set; } = 7;
    public int DaysForExchange { get; private set; } = 15;
    public int DaysForDefectReplace { get; private set; } = 7;
    public bool RequireOriginalPackaging { get; private set; } = true;
    public bool RequireAllAccessories { get; private set; } = true;
    public decimal RestockingFeePercent { get; private set; }
    // Sử dụng Entity.IsActive từ base (được PostgreSQLConfig index chung).
    public string? Notes { get; private set; }

    protected ReturnPolicy() { }

    public ReturnPolicy(
        string name,
        Guid? categoryId = null,
        int daysForReturn = 7,
        int daysForExchange = 15,
        int daysForDefectReplace = 7,
        bool requireOriginalPackaging = true,
        bool requireAllAccessories = true,
        decimal restockingFeePercent = 0m,
        bool isActive = true,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên chính sách không được rỗng.", nameof(name));
        if (daysForReturn < 0 || daysForExchange < 0 || daysForDefectReplace < 0)
            throw new ArgumentException("Số ngày không được âm.");
        if (restockingFeePercent < 0 || restockingFeePercent > 100)
            throw new ArgumentException("Phí restocking phải trong [0,100].");

        Id = Guid.NewGuid();
        Name = name;
        CategoryId = categoryId;
        DaysForReturn = daysForReturn;
        DaysForExchange = daysForExchange;
        DaysForDefectReplace = daysForDefectReplace;
        RequireOriginalPackaging = requireOriginalPackaging;
        RequireAllAccessories = requireAllAccessories;
        RestockingFeePercent = restockingFeePercent;
        base.IsActive = isActive;
        Notes = notes;
    }

    /// <summary>Số ngày cho phép theo loại yêu cầu.</summary>
    public int AllowedDaysFor(ReturnType type) => type switch
    {
        ReturnType.Refund => DaysForReturn,
        ReturnType.Exchange => DaysForExchange,
        ReturnType.Replace => DaysForDefectReplace,
        _ => 0
    };

    /// <summary>Còn trong hạn không? purchaseDate là mốc mua hàng (Order.OrderDate).</summary>
    public bool IsWithinPeriod(ReturnType type, DateTime purchaseDate, DateTime? now = null)
    {
        if (!IsActive) return false;
        var days = AllowedDaysFor(type);
        if (days <= 0) return false;
        var reference = now ?? DateTime.UtcNow;
        return reference <= purchaseDate.AddDays(days);
    }

    public void Update(
        string name,
        int daysForReturn,
        int daysForExchange,
        int daysForDefectReplace,
        bool requireOriginalPackaging,
        bool requireAllAccessories,
        decimal restockingFeePercent,
        bool isActive,
        string? notes)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên chính sách không được rỗng.", nameof(name));
        Name = name;
        DaysForReturn = daysForReturn;
        DaysForExchange = daysForExchange;
        DaysForDefectReplace = daysForDefectReplace;
        RequireOriginalPackaging = requireOriginalPackaging;
        RequireAllAccessories = requireAllAccessories;
        RestockingFeePercent = restockingFeePercent;
        base.IsActive = isActive;
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate() { base.IsActive = false; UpdatedAt = DateTime.UtcNow; }
    public void Activate() { base.IsActive = true; UpdatedAt = DateTime.UtcNow; }
}
