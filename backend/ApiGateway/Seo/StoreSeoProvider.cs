using BuildingBlocks.Seo;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;

namespace ApiGateway.Seo;

/// <summary>
/// `/he-thong-cua-hang` — data is `SystemConfig.Domain.Store`. Same cross-module note as
/// <see cref="HrJobListingSeoProvider"/>: D11 names "Content/Seo" but the data lives in
/// `SystemConfig`, which `Content.csproj` does not reference; `ApiGateway.csproj` already does.
/// One `Store` JSON-LD per physical store, built only from fields the admin actually filled in
/// (D11 "Chu dau tu can cung cap": "thiếu trường nào thì bỏ trường đó, không bịa").
/// </summary>
public sealed class StoreSeoProvider : ISeoPageProvider
{
    private const string Path = "/he-thong-cua-hang";
    private readonly SystemConfigDbContext _db;

    public StoreSeoProvider(SystemConfigDbContext db) => _db = db;

    public bool TryMatch(string path) => path == Path;

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var stores = await _db.Stores
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);

        var jsonLd = new List<object>
        {
            SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), ("Hệ thống cửa hàng", (string?)null) }),
        };
        foreach (var store in stores)
        {
            jsonLd.Add(BuildStoreJsonLd(store));
        }

        return new SeoPage
        {
            Status = 200,
            Title = "Hệ thống cửa hàng - Quang Hưởng Computer",
            Description = stores.Count > 0
                ? $"Quang Hưởng Computer có {stores.Count} cửa hàng. Xem địa chỉ, giờ mở cửa và số điện thoại từng chi nhánh."
                : "Hệ thống cửa hàng Quang Hưởng Computer.",
            CanonicalPath = Path,
            Robots = "index,follow",
            JsonLd = jsonLd,
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var any = await _db.Stores.AnyAsync(s => s.IsActive, ct);
        if (any) yield return new SitemapEntry(Path, null, "monthly", 0.5m);
    }

    private static object BuildStoreJsonLd(SystemConfig.Domain.Store store)
    {
        var obj = new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "Store",
            ["name"] = store.Name,
        };
        if (!string.IsNullOrWhiteSpace(store.Address))
        {
            var address = new Dictionary<string, object?> { ["@type"] = "PostalAddress", ["streetAddress"] = store.Address };
            if (!string.IsNullOrWhiteSpace(store.District)) address["addressLocality"] = store.District;
            if (!string.IsNullOrWhiteSpace(store.Province)) address["addressRegion"] = store.Province;
            address["addressCountry"] = "VN";
            obj["address"] = address;
        }
        if (!string.IsNullOrWhiteSpace(store.Phone)) obj["telephone"] = store.Phone;
        if (store.Latitude is not null && store.Longitude is not null)
        {
            obj["geo"] = new Dictionary<string, object?>
            {
                ["@type"] = "GeoCoordinates",
                ["latitude"] = store.Latitude,
                ["longitude"] = store.Longitude,
            };
        }
        return obj;
    }
}
