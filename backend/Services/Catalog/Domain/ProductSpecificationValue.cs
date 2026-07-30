namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Giá trị thông số của 1 sản phẩm cho 1 attribute cụ thể.
/// Lưu tách 4 cột theo DataType để index/filter được (không như JSON blob cũ).
/// - Text: ValueText
/// - Number: ValueNumber
/// - Boolean: ValueBool
/// - Enum: ValueEnum (khoá enum, đối chiếu với EnumValuesJson của attribute)
/// </summary>
public class ProductSpecificationValue : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public Guid AttributeId { get; private set; }

    public string? ValueText { get; private set; }
    public decimal? ValueNumber { get; private set; }
    public bool? ValueBool { get; private set; }
    public string? ValueEnum { get; private set; }

    // Navigation
    public virtual Product? Product { get; private set; }
    public virtual SpecificationAttribute? Attribute { get; private set; }

    protected ProductSpecificationValue() { }

    public static ProductSpecificationValue ForText(Guid productId, Guid attributeId, string value)
        => new()
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            AttributeId = attributeId,
            ValueText = value ?? throw new ArgumentNullException(nameof(value)),
        };

    public static ProductSpecificationValue ForNumber(Guid productId, Guid attributeId, decimal value)
        => new()
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            AttributeId = attributeId,
            ValueNumber = value,
        };

    public static ProductSpecificationValue ForBool(Guid productId, Guid attributeId, bool value)
        => new()
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            AttributeId = attributeId,
            ValueBool = value,
        };

    public static ProductSpecificationValue ForEnum(Guid productId, Guid attributeId, string enumKey)
        => new()
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            AttributeId = attributeId,
            ValueEnum = enumKey ?? throw new ArgumentNullException(nameof(enumKey)),
        };

    public void UpdateText(string value) => (ValueText, ValueNumber, ValueBool, ValueEnum) = (value, null, null, null);
    public void UpdateNumber(decimal value) => (ValueText, ValueNumber, ValueBool, ValueEnum) = (null, value, null, null);
    public void UpdateBool(bool value) => (ValueText, ValueNumber, ValueBool, ValueEnum) = (null, null, value, null);
    public void UpdateEnum(string value) => (ValueText, ValueNumber, ValueBool, ValueEnum) = (null, null, null, value);
}
