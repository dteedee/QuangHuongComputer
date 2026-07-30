namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Thuộc tính thông số kỹ thuật: nằm trong 1 group, có Key kỹ thuật (để filter qua URL param).
/// Vd: Group "Bộ xử lý" -> Attribute (Key="cpu_model", Name="Model CPU", DataType=Text).
/// </summary>
public class SpecificationAttribute : Entity<Guid>
{
    public Guid GroupId { get; private set; }

    /// <summary>Khoá kỹ thuật duy nhất (vd "ram_gb", "cpu_model"). Dùng làm URL param.</summary>
    public string Key { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;
    public string? Unit { get; private set; }
    public SpecDataType DataType { get; private set; }

    /// <summary>JSON list các giá trị enum (chỉ dùng khi DataType=Enum).</summary>
    public string? EnumValuesJson { get; private set; }

    public bool IsFilterable { get; private set; }
    public bool IsComparable { get; private set; }
    public int SortOrder { get; private set; }

    // Navigation
    public virtual SpecificationGroup? Group { get; private set; }

    protected SpecificationAttribute() { }

    public SpecificationAttribute(
        Guid groupId,
        string key,
        string name,
        SpecDataType dataType,
        string? unit = null,
        string? enumValuesJson = null,
        bool isFilterable = true,
        bool isComparable = true,
        int sortOrder = 0)
    {
        if (groupId == Guid.Empty)
            throw new ArgumentException("GroupId không được rỗng", nameof(groupId));
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Key không được rỗng", nameof(key));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên thuộc tính không được rỗng", nameof(name));
        if (dataType == SpecDataType.Enum && string.IsNullOrWhiteSpace(enumValuesJson))
            throw new ArgumentException("Enum attribute cần EnumValuesJson", nameof(enumValuesJson));

        Id = Guid.NewGuid();
        GroupId = groupId;
        Key = key.Trim().ToLowerInvariant();
        Name = name.Trim();
        Unit = unit;
        DataType = dataType;
        EnumValuesJson = enumValuesJson;
        IsFilterable = isFilterable;
        IsComparable = isComparable;
        SortOrder = sortOrder;
    }

    public void Update(
        string name,
        string? unit,
        SpecDataType dataType,
        string? enumValuesJson,
        bool isFilterable,
        bool isComparable,
        int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên thuộc tính không được rỗng", nameof(name));
        Name = name.Trim();
        Unit = unit;
        DataType = dataType;
        EnumValuesJson = enumValuesJson;
        IsFilterable = isFilterable;
        IsComparable = isComparable;
        SortOrder = sortOrder;
    }
}

public enum SpecDataType
{
    Text = 1,
    Number = 2,
    Boolean = 3,
    Enum = 4,
}
