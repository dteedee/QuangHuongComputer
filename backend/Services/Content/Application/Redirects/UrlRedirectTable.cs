using BuildingBlocks.Seo;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Content.Application.Redirects;

/// <summary>One active row as held in memory.</summary>
public sealed record UrlRedirectEntry(Guid Id, string FromPath, int StatusCode, string? Target);

/// <summary>
/// <see cref="IUrlRedirectResolver"/> over an in-memory copy of the ACTIVE redirect table
/// (<see cref="IMemoryCache"/>, 10-minute safety TTL, evicted on every write through
/// <see cref="InvalidateAsync"/>). The shell asks on every storefront HTML request, so the hot path
/// is one dictionary lookup — no DB, no Redis round trip. A version counter stops a load that
/// started before an invalidation from re-caching the stale table.
/// </summary>
public sealed class UrlRedirectTable : IUrlRedirectResolver
{
    private const string CacheKey = "content:url-redirects:active";
    private static readonly TimeSpan SafetyTtl = TimeSpan.FromMinutes(10);

    private readonly IMemoryCache _cache;
    private readonly IServiceScopeFactory _scopes;
    private readonly IServiceProvider _services;
    private readonly UrlRedirectHitQueue _hits;
    private readonly ILogger<UrlRedirectTable> _logger;
    private readonly SemaphoreSlim _loadLock = new(1, 1);
    private long _version;

    public UrlRedirectTable(IMemoryCache cache, IServiceScopeFactory scopes, IServiceProvider services,
        UrlRedirectHitQueue hits, ILogger<UrlRedirectTable> logger)
    {
        _cache = cache;
        _scopes = scopes;
        _services = services;
        _hits = hits;
        _logger = logger;
    }

    public async ValueTask<UrlRedirectMatch?> MatchAsync(string path, CancellationToken ct)
    {
        try
        {
            var table = await GetAsync(ct);
            return table.Count == 0 ? null : Resolve(table, UrlRedirectPath.ToKey(path));
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // A broken redirect table must never take the storefront down: serve the page instead.
            _logger.LogWarning(ex, "[url-redirects] lookup failed for {Path}; serving without redirect", path);
            return null;
        }
    }

    public void RecordHit(Guid redirectId) => _hits.Enqueue(redirectId);

    /// <summary>Drops the in-memory table AND the shell's output cache (a cached 200 for a path that now redirects).</summary>
    public async Task InvalidateAsync(CancellationToken ct = default)
    {
        Interlocked.Increment(ref _version);
        _cache.Remove(CacheKey);
        var outputCache = _services.GetService<IOutputCacheStore>();
        if (outputCache is not null) await outputCache.EvictByTagAsync(SeoOutputCacheTags.Shell, ct);
    }

    /// <summary>
    /// Pure lookup. Follows a stored chain (possible after toggling rows) up to
    /// <see cref="UrlRedirectChainGuard.MaxDepth"/> hops so the client still gets ONE redirect to
    /// the final target; a loop answers null (serve the page) rather than a redirect loop.
    /// </summary>
    public static UrlRedirectMatch? Resolve(IReadOnlyDictionary<string, UrlRedirectEntry> table, string key)
    {
        if (!table.TryGetValue(key, out var first)) return null;

        var current = first;
        var hops = 1;
        var visited = new HashSet<string>(StringComparer.Ordinal) { key };
        while (current.StatusCode != 410
               && UrlRedirectPath.TargetKey(current.Target) is { } nextKey
               && table.TryGetValue(nextKey, out var next))
        {
            if (!visited.Add(nextKey) || hops >= UrlRedirectChainGuard.MaxDepth) return null;
            current = next;
            hops++;
        }

        var status = current.StatusCode == 410 ? 410 : first.StatusCode;
        return new UrlRedirectMatch(first.Id, first.FromPath, status, status == 410 ? null : current.Target, hops);
    }

    private async Task<IReadOnlyDictionary<string, UrlRedirectEntry>> GetAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(CacheKey, out IReadOnlyDictionary<string, UrlRedirectEntry>? cached) && cached is not null)
            return cached;

        await _loadLock.WaitAsync(ct);
        try
        {
            if (_cache.TryGetValue(CacheKey, out cached) && cached is not null) return cached;

            var version = Interlocked.Read(ref _version);
            using var scope = _scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
            var rows = await db.UrlRedirects.AsNoTracking()
                .Where(r => r.IsActive)
                .Select(r => new UrlRedirectEntry(r.Id, r.FromPath, r.StatusCode, r.ToPath))
                .ToListAsync(ct);
            var table = rows.ToDictionary(r => r.FromPath, StringComparer.Ordinal);

            if (Interlocked.Read(ref _version) == version) _cache.Set(CacheKey, table, SafetyTtl);
            return table;
        }
        finally
        {
            _loadLock.Release();
        }
    }
}
