namespace Content.Domain;

using BuildingBlocks.SharedKernel;

public class Menu : Entity<Guid>
{
    public string Name { get; private set; }
    public string Code { get; private set; }
    public int DisplayOrder { get; private set; }
    public MenuLocation Location { get; private set; }
    public string? CssClass { get; private set; }
    
    public List<MenuItem> Items { get; private set; } = new();

    public Menu(
        string name,
        string code,
        MenuLocation location,
        int displayOrder = 0,
        string? cssClass = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Code = code;
        Location = location;
        DisplayOrder = displayOrder;
        CssClass = cssClass;
        IsActive = true;
    }

    protected Menu() { }

    public void AddItem(MenuItem item)
    {
        Items.Add(item);
    }

    public void RemoveItem(Guid itemId)
    {
        var item = Items.FirstOrDefault(i => i.Id == itemId);
        if (item != null) Items.Remove(item);
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
    }
}

public class MenuItem : Entity<Guid>
{
    public Guid MenuId { get; private set; }
    public string Label { get; private set; }
    public string? Url { get; private set; }
    public string? Icon { get; private set; }
    public Guid? ParentId { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool OpenInNewTab { get; private set; }
    public string? CssClass { get; private set; }
    public MenuItemType Type { get; private set; }
    public Guid? PageId { get; private set; }
    public Guid? CategoryId { get; private set; }

    public MenuItem(
        Guid menuId,
        string label,
        MenuItemType type = MenuItemType.Custom,
        string? url = null,
        string? icon = null,
        Guid? parentId = null,
        int displayOrder = 0,
        bool openInNewTab = false,
        Guid? pageId = null,
        Guid? categoryId = null)
    {
        Id = Guid.NewGuid();
        MenuId = menuId;
        Label = label;
        Type = type;
        Url = url;
        Icon = icon;
        ParentId = parentId;
        DisplayOrder = displayOrder;
        OpenInNewTab = openInNewTab;
        IsActive = true;
        PageId = pageId;
        CategoryId = categoryId;
    }

    protected MenuItem() { }

    public void Update(string label, string? url = null, string? icon = null)
    {
        Label = label;
        Url = url;
        Icon = icon;
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
    }

    public void SetDisplayOrder(int order)
    {
        DisplayOrder = order;
    }
}

public enum MenuLocation
{
    HeaderMain,
    HeaderTop,
    FooterMain,
    FooterBottom,
    Sidebar,
    Mobile
}

public enum MenuItemType
{
    Custom,
    Page,
    Category,
    Product,
    Homepage,
    Contact
}
