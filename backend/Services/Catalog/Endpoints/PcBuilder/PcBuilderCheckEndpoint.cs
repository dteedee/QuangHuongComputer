using BuildingBlocks.Endpoints;
using Catalog.Application.PcBuilder;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Catalog.Endpoints.PcBuilder;

public sealed record PcBuilderCheckRequest(List<PcBuildLineDto> Items);

/// <summary>
/// <c>POST /api/catalog/pc-builder/check</c> - verdict 3 trạng thái/luật + lý do tiếng Việt + tổng
/// tiền + payload thêm-vào-giỏ (Requirements). Công khai: khách chưa đăng nhập vẫn kiểm được cấu
/// hình đang lắp (giữ hành vi cũ của <c>check-compatibility</c>, chỉ đọc, không ghi gì).
/// </summary>
public static class PcBuilderCheckEndpoint
{
    public static void MapPcBuilderCheck(this IEndpointRouteBuilder app)
    {
        app.MapPost("/check", async (PcBuilderCheckRequest request, CatalogDbContext db, CancellationToken ct) =>
        {
            if (request.Items.Count == 0)
                throw new RequestValidationException("items", "Cần ít nhất một linh kiện để kiểm tra.");

            var resolved = await PcBuildResolver.ResolveAsync(db, request.Items, ct);
            if (resolved.UnknownProductIds.Count > 0)
            {
                throw new RequestValidationException("items",
                    $"Không tìm thấy hoặc sản phẩm chưa đăng web: {string.Join(", ", resolved.UnknownProductIds)}.");
            }

            var evaluation = PcBuildEvaluator.Evaluate(resolved.Components);
            var filledSlots = resolved.Components.Select(c => c.SlotId).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var missingRequiredSlots = PcBuilderSlotDefinitions.RequiredSlotIds
                .Where(id => !filledSlots.Contains(id))
                .ToList();

            return Results.Ok(new
            {
                overallVerdict = evaluation.OverallVerdict.ToString(),
                rules = evaluation.Rules.Select(r => new
                {
                    ruleId = r.RuleId,
                    ruleName = r.RuleName,
                    verdict = r.Verdict.ToString(),
                    message = r.Message,
                    missingKeys = r.MissingKeys,
                }),
                totalPrice = evaluation.TotalPrice,
                estimatedWattageW = evaluation.EstimatedWattageW,
                estimatedWattageNote = evaluation.EstimatedWattageW == null
                    ? "Không thể ước tính công suất tiêu thụ: dữ liệu sản phẩm hiện chưa có thông số TDP/công suất."
                    : null,
                missingRequiredSlots,
                cartPayload = evaluation.CartPayload,
            });
        }).AllowAnonymous();
    }
}
