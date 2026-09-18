using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty.Application;

/// <summary>
/// D08 §2/§4 (binding): số tháng bảo hành resolve theo thứ tự
/// <c>Product.WarrantyMonths</c> -&gt; policy của danh mục LÁ -&gt; policy của danh mục cha
/// (đệ quy tới gốc) -&gt; policy DEFAULT (<c>CategoryId == null</c>). 0 tháng = KHÔNG tạo bản BH.
/// Cây danh mục có thể sâu hơn 2 cấp -> đệ quy có giới hạn 10 bậc để chống vòng lặp dữ liệu hỏng.
/// </summary>
public class WarrantyPolicyResolver
{
    private const int MaxDepth = 10;

    private readonly WarrantyDbContext _warrantyDb;
    private readonly CatalogDbContext _catalogDb;

    public WarrantyPolicyResolver(WarrantyDbContext warrantyDb, CatalogDbContext catalogDb)
    {
        _warrantyDb = warrantyDb;
        _catalogDb = catalogDb;
    }

    public record Resolution(int Months, Guid? PolicyId, string Source);

    /// <summary>Resolve số tháng + policy áp dụng cho 1 sản phẩm + provider (Manufacturer/Store).</summary>
    public async Task<Resolution> ResolveAsync(Guid productId, WarrantyProvider provider, CancellationToken ct = default)
    {
        var product = await _catalogDb.Products.AsNoTracking()
            .Where(p => p.Id == productId)
            .Select(p => new { p.WarrantyMonths, p.CategoryId })
            .FirstOrDefaultAsync(ct);

        // 1. Product.WarrantyMonths — nguồn sự thật cao nhất khi có dữ liệu (kể cả 0 = từ chối BH tường minh).
        if (product?.WarrantyMonths is int months)
            return new Resolution(months, null, "product");

        if (product == null)
            return await ResolveDefaultAsync(provider, ct);

        // 2. Leo cây danh mục: lá -> cha -> ... -> gốc.
        var categoryId = (Guid?)product.CategoryId;
        var depth = 0;
        while (categoryId.HasValue && depth < MaxDepth)
        {
            var policy = await _warrantyDb.Policies.AsNoTracking()
                .FirstOrDefaultAsync(p => p.CategoryId == categoryId && p.Provider == provider && p.IsActive, ct);
            if (policy != null)
                return new Resolution(policy.DurationMonths, policy.Id, "category");

            categoryId = await _catalogDb.Categories.AsNoTracking()
                .Where(c => c.Id == categoryId)
                .Select(c => (Guid?)c.ParentId)
                .FirstOrDefaultAsync(ct);
            depth++;
        }

        // 3. DEFAULT (CategoryId == null).
        return await ResolveDefaultAsync(provider, ct);
    }

    private async Task<Resolution> ResolveDefaultAsync(WarrantyProvider provider, CancellationToken ct)
    {
        var def = await _warrantyDb.Policies.AsNoTracking()
            .FirstOrDefaultAsync(p => p.CategoryId == null && p.Provider == provider && p.IsActive, ct);
        // An toàn nhất khi thiếu cả seed: Manufacturer fallback 12 tháng (khớp hành vi cũ),
        // Store fallback 0 (không tự tạo BH shop nếu chưa cấu hình).
        var fallback = provider == WarrantyProvider.Manufacturer ? 12 : 0;
        return def != null
            ? new Resolution(def.DurationMonths, def.Id, "default")
            : new Resolution(fallback, null, "hardcoded-fallback");
    }
}
