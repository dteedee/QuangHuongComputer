namespace Content.Domain;

using BuildingBlocks.SharedKernel;

public class CMSPage : Entity<Guid>
{
    public string Title { get; private set; }
    public string Slug { get; private set; }
    public string Content { get; private set; }
    public string? MetaTitle { get; private set; }
    public string? MetaDescription { get; private set; }
    public string? MetaKeywords { get; private set; }
    public bool IsPublished { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public DateTime? UnpublishedAt { get; private set; }
    public string? Template { get; private set; }
    public string? FeaturedImageUrl { get; private set; }
    public PageType Type { get; private set; }
    public int ViewCount { get; private set; }
    public Guid? ParentId { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool ShowInMenu { get; private set; }
    public string? MenuLabel { get; private set; }

    public CMSPage(
        string title,
        string slug,
        string content,
        PageType type = PageType.Custom,
        string? template = null,
        Guid? parentId = null)
    {
        Id = Guid.NewGuid();
        Title = title;
        Slug = slug;
        Content = content;
        Type = type;
        Template = template;
        ParentId = parentId;
        IsPublished = false;
        ViewCount = 0;
        DisplayOrder = 0;
        ShowInMenu = false;
    }

    protected CMSPage() { }

    public void Update(string title, string content, string? metaTitle = null, string? metaDescription = null)
    {
        Title = title;
        Content = content;
        MetaTitle = metaTitle;
        MetaDescription = metaDescription;
    }

    public void Publish()
    {
        IsPublished = true;
        PublishedAt = DateTime.UtcNow;
    }

    public void Unpublish()
    {
        IsPublished = false;
        UnpublishedAt = DateTime.UtcNow;
    }

    public void IncrementViewCount()
    {
        ViewCount++;
    }

    public void SetSeo(string? metaTitle, string? metaDescription, string? metaKeywords)
    {
        MetaTitle = metaTitle;
        MetaDescription = metaDescription;
        MetaKeywords = metaKeywords;
    }

    public void SetMenuSettings(bool showInMenu, string? menuLabel = null)
    {
        ShowInMenu = showInMenu;
        MenuLabel = menuLabel;
    }

    public void SetDisplayOrder(int order)
    {
        DisplayOrder = order;
    }
}

public enum PageType
{
    Custom,
    About,
    Contact,
    FAQ,
    Terms,
    Privacy,
    Shipping,
    Returns,
    Warranty
}
