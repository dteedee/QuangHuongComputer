using Microsoft.AspNetCore.Mvc;

namespace BuildingBlocks.Paging;

/// <summary>
/// The ONE query-string contract for every list endpoint (W1-3, frozen - see
/// <c>docs/api-conventions.md</c>): <c>?page=1&amp;pageSize=20&amp;search=abc&amp;sortBy=name&amp;sortDir=asc</c>.
///
/// Bind it with <c>[AsParameters]</c>. Every property is nullable on purpose: ASP.NET Core's
/// RequestDelegateFactory treats a non-nullable <c>[AsParameters]</c> property as a REQUIRED query
/// parameter (a C# initializer does not make it optional), which is how earlier list endpoints ended
/// up returning 400 for a plain <c>GET /api/...</c> with no query string. The clamped values are
/// exposed through the get-only <see cref="Page"/>/<see cref="PageSize"/> pair.
/// </summary>
public class PagedRequest
{
    /// <summary>Hard ceiling. A caller asking for 10.000 rows gets 100; the API never OOMs on request.</summary>
    public const int MaxPageSize = 100;

    public const int DefaultPageSize = 20;

    [FromQuery(Name = "page")]
    public int? PageNumber { get; set; }

    [FromQuery(Name = "pageSize")]
    public int? Size { get; set; }

    /// <summary>Free-text filter. Meaning is per-endpoint and documented in that module's contract.</summary>
    [FromQuery(Name = "search")]
    public string? Search { get; set; }

    /// <summary>Property name to sort by, in the DTO's camelCase spelling. Per-endpoint allow-list.</summary>
    [FromQuery(Name = "sortBy")]
    public string? SortBy { get; set; }

    /// <summary><c>asc</c> (default) or <c>desc</c>. Anything else is treated as <c>asc</c>.</summary>
    [FromQuery(Name = "sortDir")]
    public string? SortDir { get; set; }

    /// <summary>1-based page index, clamped to >= 1.</summary>
    public int Page => PageNumber is > 0 ? PageNumber.Value : 1;

    /// <summary>Rows per page, clamped to 1..<see cref="MaxPageSize"/>, default <see cref="DefaultPageSize"/>.</summary>
    public int PageSize => Size switch
    {
        null or <= 0 => DefaultPageSize,
        > MaxPageSize => MaxPageSize,
        _ => Size.Value
    };

    /// <summary>True when the caller asked for descending order.</summary>
    public bool Descending
        => string.Equals(SortDir, "desc", StringComparison.OrdinalIgnoreCase);

    /// <summary>Rows to skip. Always non-negative because <see cref="Page"/> is clamped.</summary>
    public int Skip => (Page - 1) * PageSize;

    /// <summary>Rows to take. Same as <see cref="PageSize"/>; named for the LINQ call site.</summary>
    public int Take => PageSize;

    /// <summary>Trimmed search text, or null when the caller sent nothing usable.</summary>
    public string? NormalizedSearch
        => string.IsNullOrWhiteSpace(Search) ? null : Search.Trim();
}
