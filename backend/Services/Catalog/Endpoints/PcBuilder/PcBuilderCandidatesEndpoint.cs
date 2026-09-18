using BuildingBlocks.Paging;
using Catalog.Application.PcBuilder;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Catalog.Endpoints.PcBuilder;

/// <summary>
/// <c>GET /api/catalog/pc-builder/candidates?slot=cpu&amp;build=id1,id2&amp;page=1&amp;pageSize=20</c>
/// - sản phẩm cho MỘT slot, lọc theo tương thích với các linh kiện đã chọn (<c>build</c>, id sản
/// phẩm cách nhau bởi dấu phẩy). Phân trang theo hợp đồng chung (<c>docs/api-conventions.md</c> mục 3).
/// </summary>
public static class PcBuilderCandidatesEndpoint
{
    public static void MapPcBuilderCandidates(this IEndpointRouteBuilder app)
    {
        app.MapGet("/candidates", async (
            string slot,
            string? build,
            [AsParameters] PagedRequest paging,
            CatalogDbContext db,
            CancellationToken ct) =>
        {
            var buildLines = ParseBuildParam(build);
            var resolved = await PcBuildResolver.ResolveAsync(db, buildLines, ct);

            var result = await PcBuilderCandidateQuery.RunAsync(db, slot, resolved.Components, paging, ct);
            return Results.Ok(new
            {
                items = result.Items,
                total = result.Total,
                page = result.Page,
                pageSize = result.PageSize,
                totalPages = result.TotalPages,
                hasPreviousPage = result.HasPreviousPage,
                hasNextPage = result.HasNextPage,
                unresolvedBuildProductIds = resolved.UnknownProductIds,
            });
        });
    }

    private static List<PcBuildLineDto> ParseBuildParam(string? build)
    {
        if (string.IsNullOrWhiteSpace(build)) return new List<PcBuildLineDto>();

        return build.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(id => Guid.TryParse(id, out var guid) ? guid : (Guid?)null)
            .Where(id => id.HasValue)
            .Select(id => new PcBuildLineDto(id!.Value, 1))
            .ToList();
    }
}
