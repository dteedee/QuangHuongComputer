using BuildingBlocks.Seo;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Content.Application.Redirects;

/// <summary>
/// Automatic 301 when Catalog renames a product/category slug (called by Catalog's
/// <c>SlugChangeRedirectInterceptor</c> after the rename is committed). Keeps the table flat
/// instead of growing chains on every rename:
///   1. the NEW live path must not redirect anywhere (a rename back A -&gt; B -&gt; A switches off B -&gt; A);
///   2. rows already pointing at the OLD path are retargeted to the new one (X -&gt; old becomes X -&gt; new);
///   3. old -&gt; new is inserted, or an existing row for the old path is reused and re-enabled.
/// Runs in its own DI scope so it never shares a <see cref="ContentDbContext"/> with the caller.
/// </summary>
public sealed class SlugRedirectRecorder : ISlugRedirectRecorder
{
    private readonly IServiceScopeFactory _scopes;
    private readonly UrlRedirectTable _table;

    public SlugRedirectRecorder(IServiceScopeFactory scopes, UrlRedirectTable table)
    {
        _scopes = scopes;
        _table = table;
    }

    public async Task RecordAsync(IReadOnlyList<SlugPathChange> changes, string? actorId, CancellationToken ct)
    {
        if (changes.Count == 0) return;

        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
        var rows = await db.UrlRedirects.ToListAsync(ct);

        foreach (var change in changes)
        {
            var oldKey = UrlRedirectPath.ToKey(change.OldPath);
            var newKey = UrlRedirectPath.ToKey(change.NewPath);
            if (oldKey == newKey || UrlRedirectPath.ShellBlockReason(oldKey) is not null) continue;

            foreach (var live in rows.Where(r => r.IsActive && r.FromPath == newKey))
                live.SetActive(false, actorId);

            foreach (var incoming in rows.Where(r => r.IsActive && r.StatusCode != 410 && r.FromPath != newKey
                                                     && UrlRedirectPath.TargetKey(r.ToPath) == oldKey))
                incoming.Retarget(change.NewPath, actorId);

            var existing = rows.FirstOrDefault(r => r.FromPath == oldKey);
            if (existing is null)
            {
                var row = new UrlRedirect(oldKey, change.NewPath, 301,
                    "Tự tạo khi đổi đường dẫn (slug)", change.Source, actorId);
                db.UrlRedirects.Add(row);
                rows.Add(row);
            }
            else
            {
                existing.Update(oldKey, change.NewPath, 301, existing.Note, actorId);
                existing.IsActive = true;
            }
        }

        await db.SaveChangesAsync(ct);
        await _table.InvalidateAsync(ct);
    }
}
