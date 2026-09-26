using Content.Application.Redirects;
using Content.Domain;

namespace Content.Endpoints.Redirects;

/// <summary>Create/update body. <c>isActive</c> omitted = active.</summary>
public sealed record UrlRedirectRequest(string? FromPath, string? ToPath, int StatusCode, string? Note, bool? IsActive)
{
    public UrlRedirectInput ToInput() => new(FromPath, ToPath, StatusCode, Note, IsActive ?? true);
}

public sealed record UrlRedirectActiveRequest(bool IsActive);

public sealed record UrlRedirectDto(
    Guid Id,
    string FromPath,
    string? ToPath,
    int StatusCode,
    bool IsActive,
    long HitCount,
    DateTime? LastHitAt,
    string? Note,
    string Source,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    string? CreatedBy,
    string? UpdatedBy)
{
    public static UrlRedirectDto From(UrlRedirect r) => new(
        r.Id, r.FromPath, r.ToPath, r.StatusCode, r.IsActive, r.HitCount, r.LastHitAt, r.Note, r.Source,
        r.CreatedAt, r.UpdatedAt, r.CreatedBy, r.UpdatedBy);
}

/// <summary>Answer of the admin "test URL" box: what the shell would do with this path right now.</summary>
public sealed record UrlRedirectTestResult(
    string Input,
    string NormalizedPath,
    string? BlockedReason,
    UrlRedirectTestMatch? Match);

public sealed record UrlRedirectTestMatch(Guid Id, string FromPath, int StatusCode, string? Target, int Hops);
