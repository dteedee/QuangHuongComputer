namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Nhóm thông số ("Bộ xử lý", "Bộ nhớ", "Màn hình") — gom các attribute cùng loại.
/// Có thể ràng buộc theo danh mục (CategoryId) hoặc dùng chung (CategoryId null).
/// </summary>
public class SpecificationGroup : Entity<Guid>
{
    public Guid? CategoryId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public int SortOrder { get; private set; }

    protected SpecificationGroup() { }

    public SpecificationGroup(string name, Guid? categoryId = null, int sortOrder = 0)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên nhóm thông số không được rỗng", nameof(name));
        Id = Guid.NewGuid();
        Name = name.Trim();
        CategoryId = categoryId;
        SortOrder = sortOrder;
    }

    public void Update(string name, Guid? categoryId, int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên nhóm thông số không được rỗng", nameof(name));
        Name = name.Trim();
        CategoryId = categoryId;
        SortOrder = sortOrder;
    }
}
