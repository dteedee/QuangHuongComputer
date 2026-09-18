using BuildingBlocks.Caching;

namespace Catalog.Application.BulkOps;

/// <summary>
/// Non-functional requirement: "a downloadable error workbook kept 24h". Reuses the platform's
/// Redis-backed `ICacheService` (already used elsewhere in Catalog, see
/// `CatalogProductAdminEndpoints`) instead of adding a new storage mechanism - it already works
/// across API instances, which an in-process `IMemoryCache` would not.
/// </summary>
public sealed class ErrorWorkbookCache
{
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(24);
    private readonly ICacheService _cache;

    public ErrorWorkbookCache(ICacheService cache) => _cache = cache;

    public async Task<string> StoreAsync(byte[] workbookBytes, CancellationToken ct)
    {
        var token = Guid.NewGuid().ToString("N");
        await _cache.SetAsync($"catalog:bulk-import-error:{token}", Convert.ToBase64String(workbookBytes), Ttl, ct);
        return token;
    }

    public async Task<byte[]?> TryGetAsync(string token, CancellationToken ct)
    {
        var base64 = await _cache.GetAsync<string>($"catalog:bulk-import-error:{token}", ct);
        return base64 is null ? null : Convert.FromBase64String(base64);
    }
}
