using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Catalog.Application.PcBuilder;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Endpoints.PcBuilder;

public sealed record PcBuilderSaveBuildRequest(string Name, List<PcBuildLineDto> Items);

/// <summary>
/// Lưu/chia sẻ/tra cứu build theo mã ngắn - tái dùng bảng <c>SavedPcBuilds</c> có sẵn (D03 xác nhận
/// 0 dòng sau purge; ownership của track KHÔNG gồm DbContext/migration nên KHÔNG đổi schema).
/// Lưu = bắt buộc đăng nhập (giữ nguyên vá lỗi bảo mật W1-10: trước đây ai cũng bơm được bản ghi ẩn
/// danh); xem theo mã = công khai, mã không đoán được (8 ký tự A-Z0-9, 36^8 tổ hợp - vượt yêu cầu
/// base32 8 ký tự của Security Considerations).
/// </summary>
public static class PcBuilderBuildsEndpoint
{
    public static void MapPcBuilderBuilds(this IEndpointRouteBuilder app)
    {
        app.MapPost("/builds", SaveBuildAsync).RequireAuthorization(SecurityPolicies.Authenticated);
        app.MapGet("/builds/{code}", GetBuildByCodeAsync);
        app.MapGet("/builds/my", GetMyBuildsAsync).RequireAuthorization(SecurityPolicies.Authenticated);
    }

    private static async Task<IResult> SaveBuildAsync(
        PcBuilderSaveBuildRequest request, CatalogDbContext db, ClaimsPrincipal user, CancellationToken ct)
    {
        if (request.Items.Count == 0)
            throw new RequestValidationException("items", "Cần ít nhất một linh kiện để lưu cấu hình.");

        var resolved = await PcBuildResolver.ResolveAsync(db, request.Items, ct);
        if (resolved.UnknownProductIds.Count > 0)
        {
            throw new RequestValidationException("items",
                $"Không tìm thấy hoặc sản phẩm chưa đăng web: {string.Join(", ", resolved.UnknownProductIds)}.");
        }

        Guid? customerId = Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

        var build = new SavedPcBuild(customerId, request.Name);
        foreach (var component in resolved.Components)
            build.AddItem(component.ProductId, component.SlotId, component.Quantity, component.UnitPrice);

        var evaluation = PcBuildEvaluator.Evaluate(resolved.Components);
        var issuesJson = JsonSerializer.Serialize(evaluation.Rules);
        var isCompatible = evaluation.OverallVerdict != PcRuleVerdictKind.Incompatible;
        // TotalWattage là cột int bắt buộc của schema sẵn có (ngoài ownership của track này) - ghi 0
        // vì KHÔNG có dữ liệu TDP thật để tính (xem PsuHeadroomRule); không suy diễn số giả (D12).
        build.UpdateCompatibility(isCompatible, issuesJson, 0);

        db.SavedPcBuilds.Add(build);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/catalog/pc-builder/builds/{build.BuildCode}", new
        {
            id = build.Id,
            buildCode = build.BuildCode,
            name = build.Name,
            totalPrice = build.TotalPrice,
            overallVerdict = evaluation.OverallVerdict.ToString(),
            rules = ToWireRules(evaluation.Rules),
        });
    }

    private static async Task<IResult> GetBuildByCodeAsync(string code, CatalogDbContext db, CancellationToken ct)
    {
        var build = await db.SavedPcBuilds.Include(b => b.Items).AsNoTracking()
            .FirstOrDefaultAsync(b => b.BuildCode == code.ToUpperInvariant(), ct);
        if (build == null) return Results.NotFound();

        var productIds = build.Items.Select(i => i.ProductId).ToList();
        var products = await db.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, ct);

        var rules = string.IsNullOrEmpty(build.CompatibilityIssues)
            ? new List<PcRuleVerdict>()
            : JsonSerializer.Deserialize<List<PcRuleVerdict>>(build.CompatibilityIssues) ?? new List<PcRuleVerdict>();

        return Results.Ok(new
        {
            build.Id,
            build.BuildCode,
            build.Name,
            build.TotalPrice,
            build.IsCompatible,
            rules = ToWireRules(rules),
            items = build.Items.Select(i => new
            {
                i.ProductId,
                slotId = i.ComponentType,
                i.Quantity,
                i.UnitPrice,
                lineTotal = i.Quantity * i.UnitPrice,
                product = products.TryGetValue(i.ProductId, out var p) ? new
                {
                    p.Name,
                    p.Slug,
                    p.ImageUrl,
                    p.Sku,
                    p.Specifications,
                } : null,
            }),
        });
    }

    private static async Task<IResult> GetMyBuildsAsync(CatalogDbContext db, ClaimsPrincipal user, CancellationToken ct)
    {
        if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
            return Results.Unauthorized();

        var builds = await db.SavedPcBuilds.AsNoTracking()
            .Where(b => b.CustomerId == customerId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id, b.BuildCode, b.Name, b.TotalPrice, b.IsCompatible, b.CreatedAt,
                itemCount = b.Items.Count,
            })
            .ToListAsync(ct);

        return Results.Ok(builds);
    }

    /// <summary>Chuyển verdict enum -&gt; chuỗi tường minh cho JSON trả về (không phụ thuộc cấu hình JsonOptions toàn cục).</summary>
    private static IEnumerable<object> ToWireRules(IEnumerable<PcRuleVerdict> rules) => rules.Select(r => new
    {
        ruleId = r.RuleId,
        ruleName = r.RuleName,
        verdict = r.Verdict.ToString(),
        message = r.Message,
        missingKeys = r.MissingKeys,
    });
}
