using System.Threading.Channels;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Content.Application.Redirects;

/// <summary>
/// In-memory hit counter queue. The shell calls <see cref="Enqueue"/> on the request path: a
/// non-blocking <c>TryWrite</c> into a bounded channel. When a bot storm fills it, extra hits are
/// DROPPED — the counter is a hint for the admin ("is this old URL still used?"), never worth
/// slowing a page down or growing memory without bound.
/// </summary>
public sealed class UrlRedirectHitQueue
{
    private readonly Channel<Guid> _channel = Channel.CreateBounded<Guid>(new BoundedChannelOptions(50_000)
    {
        FullMode = BoundedChannelFullMode.DropWrite,
        SingleReader = true,
        SingleWriter = false,
    });

    public void Enqueue(Guid redirectId) => _channel.Writer.TryWrite(redirectId);

    /// <summary>Drains everything queued so far into per-row counts.</summary>
    public Dictionary<Guid, int> Drain()
    {
        var counts = new Dictionary<Guid, int>();
        while (_channel.Reader.TryRead(out var id))
        {
            counts[id] = counts.TryGetValue(id, out var n) ? n + 1 : 1;
        }
        return counts;
    }
}

/// <summary>
/// Flushes <see cref="UrlRedirectHitQueue"/> every few seconds: ONE set-based UPDATE per redirect
/// row that was hit (<c>HitCount = HitCount + n</c>), not one write per request. Runs outside the
/// change tracker, so the audit interceptor does not log counter bumps.
/// </summary>
public sealed class UrlRedirectHitFlushService : BackgroundService
{
    public static readonly TimeSpan FlushInterval = TimeSpan.FromSeconds(3);

    private readonly UrlRedirectHitQueue _queue;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<UrlRedirectHitFlushService> _logger;

    public UrlRedirectHitFlushService(UrlRedirectHitQueue queue, IServiceScopeFactory scopes,
        ILogger<UrlRedirectHitFlushService> logger)
    {
        _queue = queue;
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await Task.Delay(FlushInterval, stoppingToken); }
            catch (OperationCanceledException) { break; }
            await FlushAsync(CancellationToken.None);
        }

        await FlushAsync(CancellationToken.None); // last drain on shutdown
    }

    public async Task FlushAsync(CancellationToken ct)
    {
        var counts = _queue.Drain();
        if (counts.Count == 0) return;

        try
        {
            using var scope = _scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
            var now = DateTime.UtcNow;
            foreach (var (id, hits) in counts)
            {
                await db.UrlRedirects.Where(r => r.Id == id).ExecuteUpdateAsync(s => s
                    .SetProperty(r => r.HitCount, r => r.HitCount + hits)
                    .SetProperty(r => r.LastHitAt, now), ct);
            }
        }
        catch (Exception ex)
        {
            // Losing a few counter increments is acceptable; crashing the host is not.
            _logger.LogWarning(ex, "[url-redirects] could not flush {Count} hit counters", counts.Count);
        }
    }
}
