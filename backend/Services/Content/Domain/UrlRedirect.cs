using BuildingBlocks.SharedKernel;

namespace Content.Domain;

/// <summary>
/// One row of the admin-managed redirect table. Answered by the SEO shell (`/_shell/**`) before
/// any page provider runs, so both crawlers and humans get a real HTTP 301/302/410.
///
/// <see cref="FromPath"/> is ALWAYS stored normalised (see <see cref="UrlRedirectPath.NormalizeSource"/>):
/// lowercase, decoded, no query, no trailing slash — which is what makes the plain unique index a
/// case-insensitive uniqueness rule. Callers go through <see cref="UrlRedirectPath"/> first; this
/// type only guards the invariants that do not need the rest of the table.
/// </summary>
public class UrlRedirect : Entity<Guid>
{
    public const int FromPathMaxLength = 500;
    public const int ToPathMaxLength = 1000;
    public const int NoteMaxLength = 500;

    public string FromPath { get; private set; } = string.Empty;

    /// <summary>Root-relative path (may carry a query) or absolute http(s) URL. Null only for 410.</summary>
    public string? ToPath { get; private set; }

    /// <summary>301 (permanent), 302 (temporary) or 410 (gone, no target).</summary>
    public int StatusCode { get; private set; }

    public long HitCount { get; private set; }
    public DateTime? LastHitAt { get; private set; }
    public string? Note { get; private set; }

    /// <summary><see cref="UrlRedirectSources"/>: who created the row (admin, CSV import, slug change).</summary>
    public string Source { get; private set; } = UrlRedirectSources.Manual;

    protected UrlRedirect() { }

    public UrlRedirect(string fromPath, string? toPath, int statusCode, string? note, string source, string? actorId)
    {
        Id = Guid.NewGuid();
        FromPath = fromPath;
        Source = source;
        CreatedAt = DateTime.UtcNow;
        CreatedBy = actorId;
        Apply(toPath, statusCode, note);
    }

    public void Update(string fromPath, string? toPath, int statusCode, string? note, string? actorId)
    {
        FromPath = fromPath;
        Apply(toPath, statusCode, note);
        Touch(actorId);
    }

    public void Retarget(string toPath, string? actorId)
    {
        Apply(toPath, StatusCode == 410 ? 301 : StatusCode, Note);
        Touch(actorId);
    }

    public void SetActive(bool active, string? actorId)
    {
        IsActive = active;
        Touch(actorId);
    }

    public static bool IsSupportedStatus(int statusCode) => statusCode is 301 or 302 or 410;

    private void Apply(string? toPath, int statusCode, string? note)
    {
        if (!IsSupportedStatus(statusCode))
            throw new ArgumentOutOfRangeException(nameof(statusCode), "Chỉ hỗ trợ mã 301, 302 hoặc 410.");
        if (statusCode != 410 && string.IsNullOrWhiteSpace(toPath))
            throw new ArgumentException("Chuyển hướng 301/302 phải có đích.", nameof(toPath));

        StatusCode = statusCode;
        ToPath = statusCode == 410 ? null : toPath;
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
    }

    private void Touch(string? actorId)
    {
        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = actorId;
    }
}

/// <summary>Values of <see cref="UrlRedirect.Source"/>.</summary>
public static class UrlRedirectSources
{
    public const string Manual = "manual";
    public const string Import = "import";
    public const string ProductSlug = "product-slug";
    public const string CategorySlug = "category-slug";
}
