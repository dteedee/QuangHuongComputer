namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Giá trị cụ thể của 1 loại tuỳ chọn (RAM=8GB, Màu=Bạc, SSD=512GB SSD).
/// Value duy nhất per OptionType (đảm bảo ở tầng DB bằng unique index).
/// </summary>
public class ProductOptionValue : Entity<Guid>
{
    public Guid OptionTypeId { get; private set; }

    /// <summary>Giá trị chuẩn hoá (vd: "8", "512", "silver"). Dùng cho query/filter.</summary>
    public string Value { get; private set; } = string.Empty;

    /// <summary>Giá trị hiển thị (vd: "8 GB", "512 GB SSD", "Bạc").</summary>
    public string DisplayValue { get; private set; } = string.Empty;

    /// <summary>Mã màu HEX (#RRGGBB) — chỉ dùng khi OptionType.InputType = Swatch.</summary>
    public string? ColorHex { get; private set; }

    public int SortOrder { get; private set; }

    // Navigation
    public virtual ProductOptionType? OptionType { get; private set; }

    protected ProductOptionValue() { }

    public ProductOptionValue(
        Guid optionTypeId,
        string value,
        string displayValue,
        string? colorHex = null,
        int sortOrder = 0)
    {
        if (optionTypeId == Guid.Empty)
            throw new ArgumentException("OptionTypeId không được rỗng", nameof(optionTypeId));
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Value không được rỗng", nameof(value));
        if (string.IsNullOrWhiteSpace(displayValue))
            throw new ArgumentException("DisplayValue không được rỗng", nameof(displayValue));

        Id = Guid.NewGuid();
        OptionTypeId = optionTypeId;
        Value = value.Trim();
        DisplayValue = displayValue.Trim();
        ColorHex = ValidateColorHex(colorHex);
        SortOrder = sortOrder;
    }

    public void Update(string displayValue, string? colorHex, int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(displayValue))
            throw new ArgumentException("DisplayValue không được rỗng", nameof(displayValue));
        DisplayValue = displayValue.Trim();
        ColorHex = ValidateColorHex(colorHex);
        SortOrder = sortOrder;
    }

    private static string? ValidateColorHex(string? colorHex)
    {
        if (string.IsNullOrWhiteSpace(colorHex)) return null;
        var trimmed = colorHex.Trim();
        if (!System.Text.RegularExpressions.Regex.IsMatch(trimmed, "^#[0-9A-Fa-f]{6}$"))
            throw new ArgumentException("ColorHex phải theo định dạng #RRGGBB", nameof(colorHex));
        return trimmed.ToUpperInvariant();
    }
}
