using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Application.Redirects;

/// <summary>Raw admin/CSV input for one redirect row.</summary>
public sealed record UrlRedirectInput(string? FromPath, string? ToPath, int StatusCode, string? Note, bool IsActive = true);

/// <summary>Input after normalisation: what gets written to the row.</summary>
public sealed record UrlRedirectValidated(string FromPath, string? ToPath, int StatusCode, string? Note, bool IsActive);

public enum UrlRedirectRuleFailure { None, Invalid, Duplicate }

public sealed record UrlRedirectRuleResult(
    UrlRedirectValidated? Value, UrlRedirectRuleFailure Failure, string? Error, Guid? DuplicateOfId = null)
{
    public bool Ok => Failure == UrlRedirectRuleFailure.None;
}

/// <summary>
/// Every save-time rule for the redirect table, evaluated against an in-memory snapshot of the
/// WHOLE table (a shop's table is hundreds to low thousands of rows). One snapshot serves a single
/// admin save or an entire CSV import — each accepted row is <see cref="Track"/>ed so the next row
/// is checked against it (duplicates and chains inside the same file are caught too).
/// </summary>
public sealed class UrlRedirectRules
{
    private sealed record Row(Guid Id, bool IsActive, string? TargetKey);

    private readonly Dictionary<string, Row> _bySource;

    private UrlRedirectRules(Dictionary<string, Row> bySource) => _bySource = bySource;

    public static async Task<UrlRedirectRules> LoadAsync(ContentDbContext db, CancellationToken ct)
    {
        var rows = await db.UrlRedirects.AsNoTracking()
            .Select(r => new { r.Id, r.FromPath, r.IsActive, r.ToPath })
            .ToListAsync(ct);
        return FromRows(rows.Select(r => (r.Id, r.FromPath, r.IsActive, r.ToPath)));
    }

    /// <summary>Builds a snapshot from plain tuples (unit tests, import dry-runs).</summary>
    public static UrlRedirectRules FromRows(IEnumerable<(Guid Id, string FromPath, bool IsActive, string? ToPath)> rows) =>
        new(rows.ToDictionary(
            r => r.FromPath,
            r => new Row(r.Id, r.IsActive, UrlRedirectPath.TargetKey(r.ToPath)),
            StringComparer.Ordinal));

    /// <param name="existingId">Row being edited (excluded from duplicate + chain checks), null for a new row.</param>
    public UrlRedirectRuleResult Validate(UrlRedirectInput input, Guid? existingId)
    {
        if (!UrlRedirect.IsSupportedStatus(input.StatusCode))
            return Invalid("Mã chuyển hướng chỉ nhận 301, 302 hoặc 410.");
        if (!UrlRedirectPath.TryNormalizeSource(input.FromPath, out var from, out var fromError))
            return Invalid(fromError!);
        if (!UrlRedirectPath.TryNormalizeTarget(input.ToPath, input.StatusCode, out var to, out var toError))
            return Invalid(toError!);

        var note = string.IsNullOrWhiteSpace(input.Note) ? null : input.Note.Trim();
        if (note is { Length: > UrlRedirect.NoteMaxLength })
            return Invalid($"Ghi chú dài quá {UrlRedirect.NoteMaxLength} ký tự.");

        if (_bySource.TryGetValue(from, out var clash) && clash.Id != existingId)
        {
            return new UrlRedirectRuleResult(null, UrlRedirectRuleFailure.Duplicate,
                $"Đường dẫn cũ {from} đã có trong bảng chuyển hướng.", clash.Id);
        }

        if (input.IsActive)
        {
            var active = _bySource
                .Where(kv => kv.Value.IsActive && kv.Value.Id != existingId)
                .ToDictionary(kv => kv.Key, kv => kv.Value.TargetKey, StringComparer.Ordinal);
            var chainError = UrlRedirectChainGuard.Check(from, UrlRedirectPath.TargetKey(to), active);
            if (chainError is not null) return Invalid(chainError);
        }

        return new UrlRedirectRuleResult(
            new UrlRedirectValidated(from, to, input.StatusCode, note, input.IsActive), UrlRedirectRuleFailure.None, null);
    }

    /// <summary>Records an accepted row so later validations in the same snapshot see it.</summary>
    public void Track(Guid id, UrlRedirectValidated value)
    {
        Forget(id);
        _bySource[value.FromPath] = new Row(id, value.IsActive, UrlRedirectPath.TargetKey(value.ToPath));
    }

    public void Forget(Guid id)
    {
        var stale = _bySource.FirstOrDefault(kv => kv.Value.Id == id).Key;
        if (stale is not null) _bySource.Remove(stale);
    }

    private static UrlRedirectRuleResult Invalid(string message) =>
        new(null, UrlRedirectRuleFailure.Invalid, message);
}
