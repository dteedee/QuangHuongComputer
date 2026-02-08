namespace Content.Domain;

using BuildingBlocks.SharedKernel;

public class Banner : Entity<Guid>
{
    public string Name { get; private set; }
    public string ImageUrl { get; private set; }
    public string? MobileImageUrl { get; private set; }
    public string? LinkUrl { get; private set; }
    public string? Title { get; private set; }
    public string? Description { get; private set; }
    public BannerPosition Position { get; private set; }
    public DateTime? StartDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public int DisplayOrder { get; private set; }
    public TargetDevice Device { get; private set; }
    public string? AltText { get; private set; }
    public string? ButtonText { get; private set; }
    public string? ButtonColor { get; private set; }

    public Banner(
        string name,
        string imageUrl,
        BannerPosition position,
        TargetDevice device = TargetDevice.All,
        string? mobileImageUrl = null,
        string? linkUrl = null,
        string? title = null,
        string? description = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int displayOrder = 0,
        string? altText = null,
        string? buttonText = null,
        string? buttonColor = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        ImageUrl = imageUrl;
        MobileImageUrl = mobileImageUrl;
        LinkUrl = linkUrl;
        Title = title;
        Description = description;
        Position = position;
        Device = device;
        StartDate = startDate ?? DateTime.UtcNow;
        EndDate = endDate;
        IsActive = true;
        DisplayOrder = displayOrder;
        AltText = altText;
        ButtonText = buttonText;
        ButtonColor = buttonColor;
    }

    protected Banner() { }

    public void Update(string name, string imageUrl, string? linkUrl = null)
    {
        Name = name;
        ImageUrl = imageUrl;
        LinkUrl = linkUrl;
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
    }

    public void SetDisplayOrder(int order)
    {
        DisplayOrder = order;
    }

    public bool IsActiveNow()
    {
        var now = DateTime.UtcNow;
        return IsActive && 
               StartDate <= now && 
               (!EndDate.HasValue || EndDate >= now);
    }
}

public enum BannerPosition
{
    HomepageHero,
    HomepageSidebar,
    CategoryTop,
    ProductDetail,
    Checkout,
    Footer,
    Header
}

public enum TargetDevice
{
    All,
    Desktop,
    Mobile
}
