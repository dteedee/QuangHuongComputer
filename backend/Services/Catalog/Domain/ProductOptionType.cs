namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Loại tuỳ chọn cấu hình sản phẩm (RAM, Ổ cứng, Màu sắc, CPU...).
/// Dùng chung cho nhiều sản phẩm — không gắn cứng vào product.
/// </summary>
public class ProductOptionType : Entity<Guid>
{
    /// <summary>Khoá kỹ thuật, duy nhất (vd: "RAM", "SSD", "Color"). Dùng cho code.</summary>
    public string Name { get; private set; } = string.Empty;

    /// <summary>Tên hiển thị (vd: "RAM (GB)", "Ổ cứng SSD", "Màu sắc").</summary>
    public string DisplayName { get; private set; } = string.Empty;

    public OptionInputType InputType { get; private set; }
    public int SortOrder { get; private set; }

    protected ProductOptionType() { }

    public ProductOptionType(string name, string displayName, OptionInputType inputType, int sortOrder = 0)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name không được rỗng", nameof(name));
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("DisplayName không được rỗng", nameof(displayName));

        Id = Guid.NewGuid();
        Name = name.Trim();
        DisplayName = displayName.Trim();
        InputType = inputType;
        SortOrder = sortOrder;
    }

    public void Update(string displayName, OptionInputType inputType, int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("DisplayName không được rỗng", nameof(displayName));
        DisplayName = displayName.Trim();
        InputType = inputType;
        SortOrder = sortOrder;
    }
}

public enum OptionInputType
{
    Dropdown = 1,
    Swatch = 2,   // ô màu / ảnh nhỏ
    Button = 3,   // nút toggle
}
