using BuildingBlocks.Caching;

namespace InventoryModule.Application.BulkOps;

/// <summary>
/// Security Considerations: "the error workbook is kept 24h and downloadable only by staff with
/// the same permission." Same approach as Catalog's <c>ErrorWorkbookCache</c> (Redis-backed
/// <c>ICacheService</c>, already registered — see track report on why a plain helper class is
/// used here instead of a DI-registered service). Not made generic across modules: two ~15-line
/// copies stay well inside every file's 200-line budget and avoid a cross-module dependency
/// api-conventions.md forbids.
/// </summary>
internal sealed class BulkOpsErrorWorkbookCache
{
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(24);
    private readonly ICacheService _cache;

    public BulkOpsErrorWorkbookCache(ICacheService cache) => _cache = cache;

    public async Task<string> StoreAsync(byte[] workbookBytes, CancellationToken ct)
    {
        var token = Guid.NewGuid().ToString("N");
        await _cache.SetAsync($"inventory:bulk-import-error:{token}", Convert.ToBase64String(workbookBytes), Ttl, ct);
        return token;
    }

    public async Task<byte[]?> TryGetAsync(string token, CancellationToken ct)
    {
        var base64 = await _cache.GetAsync<string>($"inventory:bulk-import-error:{token}", ct);
        return base64 is null ? null : Convert.FromBase64String(base64);
    }
}
