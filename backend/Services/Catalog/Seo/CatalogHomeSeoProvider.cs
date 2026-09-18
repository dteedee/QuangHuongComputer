using BuildingBlocks.Configuration;
using BuildingBlocks.Seo;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Seo;

/// <summary>
/// `/` — Organization + WebSite/SearchAction JSON-LD (D11). `Frontend:Url` is passed in by the
/// shell endpoint at render time (not read here), so this stays testable without an HTTP context.
/// Company identity comes from `IAppSettings` (the same "admin-edited, C# fallback next to it"
/// pattern every other module already uses) — empty/unset fields are OMITTED, never invented.
/// </summary>
public sealed class CatalogHomeSeoProvider : ISeoPageProvider
{
    private readonly CatalogDbContext _db;
    private readonly IAppSettings _appSettings;

    public CatalogHomeSeoProvider(CatalogDbContext db, IAppSettings appSettings)
    {
        _db = db;
        _appSettings = appSettings;
    }

    public bool TryMatch(string path) => path == "/";

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var companyName = _appSettings.GetString("Company.Name", "Quang Hưởng Computer");
        var logoUrl = _appSettings.GetString("Company.LogoUrl", string.Empty);
        var phone = _appSettings.GetString("Company.Phone", string.Empty);
        var facebookUrl = _appSettings.GetString("Company.FacebookUrl", string.Empty);
        var sameAs = string.IsNullOrWhiteSpace(facebookUrl) ? Array.Empty<string>() : new[] { facebookUrl };

        var productCount = await _db.Products.WherePublished().CountAsync(ct);

        var jsonLd = new List<object>
        {
            SeoJsonLdBuilders.Organization(companyName, string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl, string.IsNullOrWhiteSpace(phone) ? null : phone, sameAs),
            SeoJsonLdBuilders.WebSiteWithSearch("/tim-kiem"),
        };

        return new SeoPage
        {
            Status = 200,
            Title = $"{companyName} - Máy tính chính hãng, dịch vụ tận tâm",
            Description = $"{companyName} - chuyên cung cấp linh kiện máy tính, laptop, PC gaming chính hãng. {productCount} sản phẩm, bảo hành tận nơi, xuất hoá đơn VAT.",
            CanonicalPath = "/",
            Robots = "index,follow",
            JsonLd = jsonLd,
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        await Task.CompletedTask;
        yield return new SitemapEntry("/", null, "daily", 1.0m);
    }
}
