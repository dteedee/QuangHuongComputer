using BuildingBlocks.Repository;
using Microsoft.EntityFrameworkCore;

namespace BuildingBlocks.Paging;

/// <summary>
/// Turns any <see cref="IQueryable{T}"/> into the one paged wire shape.
///
/// The result type is the EXISTING <see cref="PagedResult{T}"/> in <c>BuildingBlocks.Repository</c>
/// (already serialised by CRM, Identity and Inventory) rather than a second, competing type in this
/// namespace - two <c>PagedResult&lt;T&gt;</c> would give wave 2 an ambiguous <c>using</c> and the
/// SPA two shapes to parse. The JSON is
/// <c>{ items, total, page, pageSize, totalPages, hasPreviousPage, hasNextPage }</c>.
/// </summary>
public static class QueryablePagingExtensions
{
    /// <summary>
    /// Counts and pages in two round trips.
    ///
    /// <c>AsNoTracking()</c> is applied here and not left to the caller: a list endpoint never
    /// mutates what it returns, and the change tracker on a 100-row graph is pure cost. It is a
    /// no-op on a projected (<c>Select</c>-ed to a DTO) query, so it is always safe.
    ///
    /// The COUNT runs on the query as given, BEFORE Skip/Take, so <c>total</c> is the size of the
    /// filtered set - which is what the pager needs.
    /// </summary>
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query,
        PagedRequest request,
        CancellationToken cancellationToken = default)
        where T : class
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(request);

        var source = query.AsNoTracking();
        var total = await source.CountAsync(cancellationToken);

        // Asking the database for page 50 of a 3-row result wastes a round trip and always returns
        // nothing; the total is already known, so answer from here.
        if (total == 0 || request.Skip >= total)
        {
            return new PagedResult<T>(new List<T>(), total, request.Page, request.PageSize);
        }

        var items = await source
            .Skip(request.Skip)
            .Take(request.Take)
            .ToListAsync(cancellationToken);

        return new PagedResult<T>(items, total, request.Page, request.PageSize);
    }

    /// <summary>
    /// Pages an already-materialised list. For the cases where the filtering cannot be expressed in
    /// SQL (a computed field, an in-memory join across modules) - use the queryable overload
    /// everywhere else, this one loads the whole set into memory first.
    /// </summary>
    public static PagedResult<T> ToPagedResult<T>(this IReadOnlyList<T> source, PagedRequest request)
        where T : class
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(request);

        var items = source.Skip(request.Skip).Take(request.Take).ToList();
        return new PagedResult<T>(items, source.Count, request.Page, request.PageSize);
    }

    /// <summary>
    /// Applies <c>sortBy</c> against a per-endpoint allow-list of sortable columns.
    ///
    /// An allow-list, not reflection on an arbitrary property name: a caller-controlled ORDER BY
    /// expression is both an injection surface and an unbounded sequential-scan generator. An
    /// unknown or missing <c>sortBy</c> falls back to <paramref name="defaultSort"/>, so the query
    /// is ALWAYS ordered - an unordered Skip/Take has no defined row order in PostgreSQL and silently
    /// returns duplicate or missing rows across pages.
    /// </summary>
    public static IQueryable<T> ApplySort<T>(
        this IQueryable<T> query,
        PagedRequest request,
        IReadOnlyDictionary<string, System.Linq.Expressions.Expression<Func<T, object?>>> sortable,
        System.Linq.Expressions.Expression<Func<T, object?>> defaultSort)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(sortable);
        ArgumentNullException.ThrowIfNull(defaultSort);

        var key = request.SortBy;
        var selector = !string.IsNullOrWhiteSpace(key) && sortable.TryGetValue(key.Trim(), out var known)
            ? known
            : defaultSort;

        return request.Descending
            ? query.OrderByDescending(selector)
            : query.OrderBy(selector);
    }
}
