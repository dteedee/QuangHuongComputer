using System.Security.Claims;
using BuildingBlocks.Security;
using Catalog.Application.BulkOps;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Catalog.Endpoints.BulkOps;

/// <summary>Implementation Steps #6: preview then apply. Both actions require `Catalog.BulkPrice`
/// (Requirements: "overridable only with Catalog.BulkPrice plus an explicit allowBelowCost" - the
/// permission gate on the whole endpoint already covers that, `allowBelowCost` just needs the
/// caller to hold it, which they do by virtue of reaching the handler).</summary>
public static class CatalogBulkPriceEndpoints
{
    public static void MapCatalogBulkPriceEndpoints(this IEndpointRouteBuilder group)
    {
        var priceGroup = group.MapGroup("/price").RequireAuthorization(Permissions.Catalog.BulkPrice);

        priceGroup.MapPost("/preview", async (BulkPriceChangeRequest request, BulkPriceChangeService service, CancellationToken ct) =>
        {
            var report = await service.PreviewAsync(request, ct);
            return ToResult(report);
        });

        priceGroup.MapPost("/apply", async (
            BulkPriceChangeRequest request, BulkPriceChangeService service, HttpContext httpContext, CancellationToken ct) =>
        {
            var actorId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var report = await service.ApplyAsync(request, actorId, ct);
            return ToResult(report);
        });
    }

    private static IResult ToResult(BulkPriceChangeReport report)
    {
        if (!report.IsValid) return Results.BadRequest(new { error = report.Error });
        return Results.Ok(new
        {
            matchedCount = report.MatchedCount,
            appliedCount = report.AppliedCount,
            belowCostBlockedCount = report.BelowCostBlockedCount,
            lines = report.Lines,
        });
    }
}
