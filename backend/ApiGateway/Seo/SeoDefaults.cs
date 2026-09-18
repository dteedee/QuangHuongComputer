using BuildingBlocks.Seo;

namespace ApiGateway.Seo;

/// <summary>Fallback values used when a provider has nothing more specific — never invented per-entity data (D12).</summary>
public static class SeoDefaults
{
    /// <summary>W1-7's `public/brand/og-default.png` — a real 1200x630 PNG, unlike per-product photos whose dimensions are not stored anywhere.</summary>
    public static readonly SeoOgImage DefaultOgImage = new("/brand/og-default.png", 1200, 630);
}
