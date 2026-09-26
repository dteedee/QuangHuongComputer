using System.Data.Common;
using System.Security.Claims;
using BuildingBlocks.Seo;
using Catalog.Domain;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Catalog.Infrastructure;

/// <summary>
/// The ONE place a product/category slug rename becomes an automatic 301 (there is no slug-history
/// table; the redirect table IS the history). Every path that renames a slug — admin edit, bulk
/// import, dataset re-import — goes through <see cref="CatalogDbContext"/>.SaveChanges, so hooking
/// here catches all of them without touching any endpoint.
///
/// Captures OriginalValue/CurrentValue of <c>Slug</c> on Modified rows before the save, and hands the
/// renames to <see cref="ISlugRedirectRecorder"/> (Content module) only once they are durable: right
/// after SaveChanges when no explicit transaction is open, otherwise on TransactionCommitted (and
/// dropped on rollback). Recorder failures are logged, never thrown — the rename itself succeeded.
/// </summary>
public sealed class SlugChangeRedirectInterceptor : SaveChangesInterceptor, IDbTransactionInterceptor
{
    public const string ProductPathPrefix = "/san-pham/";
    public const string CategoryPathPrefix = "/danh-muc/";

    private readonly IServiceProvider _services;
    private readonly List<SlugPathChange> _pending = new();

    public SlugChangeRedirectInterceptor(IServiceProvider services) => _services = services;

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Capture(eventData.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Capture(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        if (eventData.Context?.Database.CurrentTransaction is null) FlushAsync(CancellationToken.None).GetAwaiter().GetResult();
        return result;
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context?.Database.CurrentTransaction is null) await FlushAsync(cancellationToken);
        return result;
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData) => _pending.Clear();

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        _pending.Clear();
        return Task.CompletedTask;
    }

    public void TransactionCommitted(DbTransaction transaction, TransactionEndEventData eventData) =>
        FlushAsync(CancellationToken.None).GetAwaiter().GetResult();

    public Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default) =>
        FlushAsync(cancellationToken);

    public void TransactionRolledBack(DbTransaction transaction, TransactionEndEventData eventData) => _pending.Clear();

    public Task TransactionRolledBackAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        _pending.Clear();
        return Task.CompletedTask;
    }

    /// <summary>Pure capture step (unit-testable): renames on Modified products/categories as public paths.</summary>
    public static IEnumerable<SlugPathChange> CollectChanges(ChangeTracker tracker)
    {
        foreach (var entry in tracker.Entries<Product>().Where(e => e.State == EntityState.Modified))
        {
            var change = ToChange(entry.Property(p => p.Slug), ProductPathPrefix, "product-slug");
            if (change is not null) yield return change;
        }
        foreach (var entry in tracker.Entries<Category>().Where(e => e.State == EntityState.Modified))
        {
            var change = ToChange(entry.Property(c => c.Slug), CategoryPathPrefix, "category-slug");
            if (change is not null) yield return change;
        }
    }

    private static SlugPathChange? ToChange(PropertyEntry slug, string prefix, string source)
    {
        var oldSlug = slug.OriginalValue as string;
        var newSlug = slug.CurrentValue as string;
        if (string.IsNullOrWhiteSpace(oldSlug) || string.IsNullOrWhiteSpace(newSlug)) return null;
        return string.Equals(oldSlug, newSlug, StringComparison.Ordinal) ? null
            : new SlugPathChange(prefix + oldSlug, prefix + newSlug, source);
    }

    private void Capture(DbContext? context)
    {
        if (context is null) return;
        _pending.AddRange(CollectChanges(context.ChangeTracker));
    }

    private async Task FlushAsync(CancellationToken ct)
    {
        if (_pending.Count == 0) return;
        var changes = _pending.ToList();
        _pending.Clear();

        var recorder = _services.GetService<ISlugRedirectRecorder>();
        if (recorder is null) return;

        try
        {
            var actorId = _services.GetService<IHttpContextAccessor>()?.HttpContext?.User
                .FindFirstValue(ClaimTypes.NameIdentifier);
            await recorder.RecordAsync(changes, actorId, ct);
        }
        catch (Exception ex)
        {
            _services.GetService<ILogger<SlugChangeRedirectInterceptor>>()?.LogWarning(ex,
                "[url-redirects] slug renamed but auto-redirect not recorded: {Changes}",
                string.Join(", ", changes.Select(c => $"{c.OldPath} -> {c.NewPath}")));
        }
    }
}
