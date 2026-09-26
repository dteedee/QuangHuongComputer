using System.Linq.Expressions;
using System.Security.Claims;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Seo;
using Content.Application.Redirects;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Content.Endpoints.Redirects;

/// <summary>
/// Admin CRUD for the URL redirect table (`/api/content/admin/redirects`).
/// The group is mapped from <c>app</c>, NOT nested under <c>/api/content/admin</c>: that parent
/// carries <c>RequirePermission(Content.ManagePages)</c>, which would AND onto every endpoint here
/// (docs/endpoint-authorization-map.md §2 "nhóm cha có policy sẽ nuốt nhóm con").
/// Reads need <c>Content.ViewRedirects</c>, writes <c>Content.ManageRedirects</c>.
/// </summary>
public static class UrlRedirectEndpoints
{
    public const string BasePath = "/api/content/admin/redirects";

    private static readonly Dictionary<string, Expression<Func<UrlRedirect, object?>>> Sortable = new(StringComparer.OrdinalIgnoreCase)
    {
        ["fromPath"] = r => r.FromPath,
        ["statusCode"] = r => r.StatusCode,
        ["hitCount"] = r => r.HitCount,
        ["lastHitAt"] = r => r.LastHitAt,
        ["createdAt"] = r => r.CreatedAt,
    };

    public static void MapUrlRedirectEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup(BasePath).WithTags("Content - URL Redirects");

        group.MapGet("", async ([AsParameters] PagedRequest request, int? statusCode, bool? isActive, string? source,
            ContentDbContext db, CancellationToken ct) =>
        {
            var query = db.UrlRedirects.AsQueryable();
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim().ToLowerInvariant();
                query = query.Where(r => r.FromPath.Contains(term) || (r.ToPath != null && r.ToPath.ToLower().Contains(term)));
            }
            if (statusCode.HasValue) query = query.Where(r => r.StatusCode == statusCode.Value);
            if (isActive.HasValue) query = query.Where(r => r.IsActive == isActive.Value);
            if (!string.IsNullOrWhiteSpace(source)) query = query.Where(r => r.Source == source);

            var page = await query.ApplySort(request, Sortable, r => r.CreatedAt).ToPagedResultAsync(request, ct);
            return Results.Ok(new
            {
                items = page.Items.Select(UrlRedirectDto.From),
                total = page.Total,
                page = page.Page,
                pageSize = page.PageSize,
                totalPages = page.TotalPages,
            });
        }).RequireAuthorization(Permissions.Content.ViewRedirects);

        group.MapGet("{id:guid}", async (Guid id, ContentDbContext db, CancellationToken ct) =>
        {
            var row = await db.UrlRedirects.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
            return row is null ? NotFound() : Results.Ok(UrlRedirectDto.From(row));
        }).RequireAuthorization(Permissions.Content.ViewRedirects);

        // "Test URL" box: what the storefront would answer for a path, from the SAME in-memory table
        // the shell uses. Does not count as a hit.
        group.MapGet("test", async (string? path, IUrlRedirectResolver resolver, CancellationToken ct) =>
        {
            var input = path ?? string.Empty;
            var key = UrlRedirectPath.ToKey(input);
            var match = await resolver.MatchAsync(key, ct);
            return Results.Ok(new UrlRedirectTestResult(input, key, UrlRedirectPath.ShellBlockReason(key),
                match is null ? null : new UrlRedirectTestMatch(match.Id, match.FromPath, match.StatusCode, match.Target, match.Hops)));
        }).RequireAuthorization(Permissions.Content.ViewRedirects);

        group.MapPost("", async (UrlRedirectRequest body, UrlRedirectService service, HttpContext http, CancellationToken ct) =>
            ToResult(await service.CreateAsync(body.ToInput(), ActorId(http), ct), created: true))
            .RequireAuthorization(Permissions.Content.ManageRedirects);

        group.MapPut("{id:guid}", async (Guid id, UrlRedirectRequest body, UrlRedirectService service, HttpContext http, CancellationToken ct) =>
            ToResult(await service.UpdateAsync(id, body.ToInput(), ActorId(http), ct)))
            .RequireAuthorization(Permissions.Content.ManageRedirects);

        group.MapPost("{id:guid}/active", async (Guid id, UrlRedirectActiveRequest body, UrlRedirectService service, HttpContext http, CancellationToken ct) =>
            ToResult(await service.SetActiveAsync(id, body.IsActive, ActorId(http), ct)))
            .RequireAuthorization(Permissions.Content.ManageRedirects);

        group.MapDelete("{id:guid}", async (Guid id, UrlRedirectService service, CancellationToken ct) =>
            await service.DeleteAsync(id, ct) ? Results.NoContent() : NotFound())
            .RequireAuthorization(Permissions.Content.ManageRedirects);

        group.MapUrlRedirectImportExportEndpoints();
    }

    internal static string? ActorId(HttpContext http) => http.User.FindFirstValue(ClaimTypes.NameIdentifier);

    private static IResult NotFound() => Results.NotFound(new { error = "Không tìm thấy chuyển hướng." });

    private static IResult ToResult(UrlRedirectSaveResult result, bool created = false) => result.Status switch
    {
        UrlRedirectSaveStatus.Saved when created =>
            Results.Created($"{BasePath}/{result.Row!.Id}", UrlRedirectDto.From(result.Row)),
        UrlRedirectSaveStatus.Saved => Results.Ok(UrlRedirectDto.From(result.Row!)),
        UrlRedirectSaveStatus.Duplicate => Results.Conflict(new { error = result.Error }),
        UrlRedirectSaveStatus.NotFound => NotFound(),
        _ => Results.BadRequest(new { error = result.Error }),
    };
}
