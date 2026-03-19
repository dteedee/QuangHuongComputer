namespace Content.Domain;

using BuildingBlocks.SharedKernel;

public class HomepageSection : Entity<Guid>
{
    public string SectionType { get; private set; }
    public string Title { get; private set; }
    public int DisplayOrder { get; private set; }
    public string? Configuration { get; private set; }
    public bool IsVisible { get; private set; }
    public string? CssClass { get; private set; }

    public HomepageSection(
        string sectionType,
        string title,
        int displayOrder = 0,
        string? configuration = null,
        bool isVisible = true,
        string? cssClass = null)
    {
        Id = Guid.NewGuid();
        SectionType = sectionType;
        Title = title;
        DisplayOrder = displayOrder;
        Configuration = configuration;
        IsVisible = isVisible;
        CssClass = cssClass;
        IsActive = true;
    }

    protected HomepageSection() { }

    public void Update(string title, string sectionType, string? configuration = null, string? cssClass = null)
    {
        Title = title;
        SectionType = sectionType;
        Configuration = configuration;
        CssClass = cssClass;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetDisplayOrder(int order)
    {
        DisplayOrder = order;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetVisibility(bool isVisible)
    {
        IsVisible = isVisible;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateConfiguration(string configuration)
    {
        Configuration = configuration;
        UpdatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Available section types for the homepage builder
/// </summary>
public static class HomepageSectionTypes
{
    public const string HeroSlider = "hero_slider";
    public const string FlashDeal = "flash_deal";
    public const string ProductGrid = "product_grid";
    public const string BannerStrip = "banner_strip";
    public const string BrandCarousel = "brand_carousel";
    public const string BlogPosts = "blog_posts";
    public const string BuildPcCta = "build_pc_cta";
    public const string WhyChooseUs = "why_choose_us";
    public const string CustomHtml = "custom_html";
    public const string CategorySidebar = "category_sidebar";
    public const string FeaturedProducts = "featured_products";
    public const string Testimonials = "testimonials";

    public static readonly string[] All = new[]
    {
        HeroSlider, FlashDeal, ProductGrid, BannerStrip,
        BrandCarousel, BlogPosts, BuildPcCta, WhyChooseUs,
        CustomHtml, CategorySidebar, FeaturedProducts, Testimonials
    };
}
