namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class ProductAttribute : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public string AttributeName { get; private set; } // RAM, CPU, SSD, etc.
    public string AttributeValue { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsFilterable { get; private set; }
    
    public ProductAttribute(
        Guid productId,
        string attributeName,
        string attributeValue,
        int displayOrder = 0,
        bool isFilterable = false)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        AttributeName = attributeName;
        AttributeValue = attributeValue;
        DisplayOrder = displayOrder;
        IsFilterable = isFilterable;
    }

    protected ProductAttribute() { }

    public void Update(string attributeName, string attributeValue, bool? isFilterable = null)
    {
        AttributeName = attributeName;
        AttributeValue = attributeValue;
        if (isFilterable.HasValue) IsFilterable = isFilterable.Value;
    }

    public void SetDisplayOrder(int order)
    {
        DisplayOrder = order;
    }
}
