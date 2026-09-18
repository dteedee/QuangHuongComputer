using BuildingBlocks.Configuration;
using BuildingBlocks.Endpoints;
using Catalog.Application.PcBuilder;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Catalog.Endpoints.PcBuilder;

public sealed record PcBuilderSuggestRequest(decimal Budget, string? UseCase);

/// <summary>
/// <c>POST /api/catalog/pc-builder/suggest</c> - D10 (Decision updates, binding): thay "AI suggest"
/// cũ (chia ngân sách theo tỷ lệ, không kiểm tương thích) bằng gợi ý rule-based qua
/// <see cref="PcBuilderBudgetAllocator"/>. Nhãn UI phải là "Gợi ý theo ngân sách" - chữ "AI" KHÔNG
/// xuất hiện (kể cả trong response này). Không tìm đủ build hợp lệ -&gt; 200 kèm
/// <c>status: "cannotSuggest"</c> (đây là kết quả nghiệp vụ hợp lệ - "ngân sách chưa đủ" - không
/// phải lỗi request nên không trả 4xx).
/// </summary>
public static class PcBuilderSuggestEndpoint
{
    public static void MapPcBuilderSuggest(this IEndpointRouteBuilder app)
    {
        app.MapPost("/suggest", async (
            PcBuilderSuggestRequest request, CatalogDbContext db, IAppSettings settings, CancellationToken ct) =>
        {
            if (request.Budget <= 0)
                throw new RequestValidationException("budget", "Ngân sách phải lớn hơn 0.");

            var result = await PcBuilderBudgetAllocator.SuggestAsync(db, settings, request.Budget, request.UseCase, ct);

            if (!result.Success)
            {
                return Results.Ok(new
                {
                    status = "cannotSuggest",
                    budget = result.Budget,
                    useCase = result.UseCase,
                    reason = result.CannotSuggestReason,
                });
            }

            return Results.Ok(new
            {
                status = "ok",
                budget = result.Budget,
                useCase = result.UseCase,
                totalPrice = result.TotalPrice,
                withinBudget = result.WithinBudget,
                items = result.Items,
                overallVerdict = result.Evaluation!.OverallVerdict.ToString(),
                rules = result.Evaluation.Rules.Select(r => new
                {
                    ruleId = r.RuleId,
                    ruleName = r.RuleName,
                    verdict = r.Verdict.ToString(),
                    message = r.Message,
                    missingKeys = r.MissingKeys,
                }),
                cartPayload = result.Evaluation.CartPayload,
            });
        }).AllowAnonymous();
    }
}
