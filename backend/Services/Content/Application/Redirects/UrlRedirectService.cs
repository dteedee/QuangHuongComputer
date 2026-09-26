using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Application.Redirects;

public enum UrlRedirectSaveStatus { Saved, Invalid, Duplicate, NotFound }

public sealed record UrlRedirectSaveResult(UrlRedirectSaveStatus Status, UrlRedirect? Row = null, string? Error = null);

/// <summary>
/// Admin writes to the redirect table. Every write validates against the whole table
/// (<see cref="UrlRedirectRules"/>) and then invalidates the in-memory table + the shell's output
/// cache, so the next storefront request already sees the change.
/// </summary>
public sealed class UrlRedirectService
{
    private readonly ContentDbContext _db;
    private readonly UrlRedirectTable _table;

    public UrlRedirectService(ContentDbContext db, UrlRedirectTable table)
    {
        _db = db;
        _table = table;
    }

    public async Task<UrlRedirectSaveResult> CreateAsync(UrlRedirectInput input, string? actorId, CancellationToken ct)
    {
        var rules = await UrlRedirectRules.LoadAsync(_db, ct);
        var check = rules.Validate(input, existingId: null);
        if (!check.Ok) return Fail(check);

        var v = check.Value!;
        var row = new UrlRedirect(v.FromPath, v.ToPath, v.StatusCode, v.Note, UrlRedirectSources.Manual, actorId)
        {
            IsActive = v.IsActive,
        };
        _db.UrlRedirects.Add(row);
        await _db.SaveChangesAsync(ct);
        await _table.InvalidateAsync(ct);
        return new UrlRedirectSaveResult(UrlRedirectSaveStatus.Saved, row);
    }

    public async Task<UrlRedirectSaveResult> UpdateAsync(Guid id, UrlRedirectInput input, string? actorId, CancellationToken ct)
    {
        var row = await _db.UrlRedirects.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (row is null) return new UrlRedirectSaveResult(UrlRedirectSaveStatus.NotFound);

        var rules = await UrlRedirectRules.LoadAsync(_db, ct);
        var check = rules.Validate(input, existingId: id);
        if (!check.Ok) return Fail(check);

        var v = check.Value!;
        row.Update(v.FromPath, v.ToPath, v.StatusCode, v.Note, actorId);
        row.IsActive = v.IsActive;
        await _db.SaveChangesAsync(ct);
        await _table.InvalidateAsync(ct);
        return new UrlRedirectSaveResult(UrlRedirectSaveStatus.Saved, row);
    }

    /// <summary>Re-runs the chain rules on activation: the table may have changed while the row was off.</summary>
    public async Task<UrlRedirectSaveResult> SetActiveAsync(Guid id, bool active, string? actorId, CancellationToken ct)
    {
        var row = await _db.UrlRedirects.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (row is null) return new UrlRedirectSaveResult(UrlRedirectSaveStatus.NotFound);

        if (active && !row.IsActive)
        {
            var rules = await UrlRedirectRules.LoadAsync(_db, ct);
            var check = rules.Validate(new UrlRedirectInput(row.FromPath, row.ToPath, row.StatusCode, row.Note), id);
            if (!check.Ok) return Fail(check);
        }

        row.SetActive(active, actorId);
        await _db.SaveChangesAsync(ct);
        await _table.InvalidateAsync(ct);
        return new UrlRedirectSaveResult(UrlRedirectSaveStatus.Saved, row);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        var row = await _db.UrlRedirects.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (row is null) return false;
        _db.UrlRedirects.Remove(row);
        await _db.SaveChangesAsync(ct);
        await _table.InvalidateAsync(ct);
        return true;
    }

    private static UrlRedirectSaveResult Fail(UrlRedirectRuleResult check) => new(
        check.Failure == UrlRedirectRuleFailure.Duplicate ? UrlRedirectSaveStatus.Duplicate : UrlRedirectSaveStatus.Invalid,
        Error: check.Error);
}
