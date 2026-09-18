using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;

namespace Sales.Application.Returns;

/// <summary>
/// Chính sách đổi trả ĐÃ PHẲNG HOÁ. Ba trường cuối do D08 thêm và W2-3 tạo dưới dạng SHADOW
/// PROPERTY (cột có thật trong CSDL, chưa nâng thành property C# vì file cấu hình EF thuộc track
/// khác) — nên chúng phải được đọc NGAY TRONG truy vấn bằng <c>EF.Property</c>, không đọc được từ
/// một entity đã rời DbContext.
/// </summary>
public sealed record EffectiveReturnPolicy(
    Guid Id,
    string Name,
    Guid? CategoryId,
    int DaysForReturn,
    int DaysForExchange,
    int DaysForDefectReplace,
    decimal RestockingFeePercent,
    bool RequireOriginalPackaging,
    bool RequireAllAccessories,
    bool AllowOpenedBoxReturn,
    decimal MissingAccessoriesFeePercent,
    int DaysForStatutoryReturn)
{
    public int AllowedDaysFor(Sales.Domain.ReturnType type) => type switch
    {
        Sales.Domain.ReturnType.Refund => DaysForReturn,
        Sales.Domain.ReturnType.Exchange => DaysForExchange,
        Sales.Domain.ReturnType.Replace => DaysForDefectReplace,
        _ => 0,
    };
}

/// <summary>
/// CHÍNH SÁCH ĐỔI TRẢ CÓ HIỆU LỰC cho một sản phẩm (D08).
///
/// Sửa lỗi thật: bản cũ chỉ so <c>ReturnPolicies.CategoryId == product.CategoryId</c>, tức là chỉ
/// khớp ĐÚNG danh mục lá. Cây danh mục của shop sâu 3-4 tầng ("Laptop › Laptop gaming › MSI"),
/// nên một chính sách đặt ở tầng "Laptop" KHÔNG BAO GIỜ áp cho sản phẩm nằm ở lá — mọi sản phẩm
/// rơi thẳng về chính sách mặc định. Ở đây ta LEO NGƯỢC cây cha đến gốc.
///
/// Chốt chặn 10 tầng: dữ liệu danh mục thật đã từng có vòng cha-con. Leo cây không giới hạn trên
/// dữ liệu đó là treo request vĩnh viễn.
/// </summary>
public static class ReturnPolicyResolver
{
    public const int MaxDepth = 10;

    public sealed record Resolution(
        EffectiveReturnPolicy? Policy, bool ProductExcluded, int WarrantyMonths, Guid? CategoryId);

    public static async Task<Resolution> ResolveAsync(
        SalesDbContext salesDb, CatalogDbContext catalogDb, Guid productId, CancellationToken ct)
    {
        var product = await catalogDb.Products.AsNoTracking()
            .Where(p => p.Id == productId)
            .Select(p => new { p.CategoryId, p.IsReturnExcluded, p.WarrantyMonths })
            .FirstOrDefaultAsync(ct);

        var chain = await CategoryChainAsync(catalogDb, product?.CategoryId, ct);
        var policies = await AllAsync(salesDb, ct);

        EffectiveReturnPolicy? chosen = null;
        foreach (var categoryId in chain)
        {
            chosen = policies.FirstOrDefault(p => p.CategoryId == categoryId);
            if (chosen != null) break;
        }

        chosen ??= policies.FirstOrDefault(p => p.CategoryId == null);

        return new Resolution(
            chosen, product?.IsReturnExcluded ?? false, product?.WarrantyMonths ?? 0, product?.CategoryId);
    }

    /// <summary>Mọi chính sách đang hiệu lực (query filter của entity đã lọc <c>IsActive</c>).</summary>
    public static Task<List<EffectiveReturnPolicy>> AllAsync(SalesDbContext salesDb, CancellationToken ct)
        => salesDb.ReturnPolicies.AsNoTracking()
            .Select(p => new EffectiveReturnPolicy(
                p.Id, p.Name, p.CategoryId,
                p.DaysForReturn, p.DaysForExchange, p.DaysForDefectReplace,
                p.RestockingFeePercent, p.RequireOriginalPackaging, p.RequireAllAccessories,
                EF.Property<bool>(p, "AllowOpenedBoxReturn"),
                EF.Property<decimal>(p, "MissingAccessoriesFeePercent"),
                EF.Property<int>(p, "DaysForStatutoryReturn")))
            .ToListAsync(ct);

    /// <summary>Danh mục lá → … → gốc. Dừng ở <see cref="MaxDepth"/> hoặc khi gặp lại một id đã đi qua.</summary>
    public static async Task<IReadOnlyList<Guid>> CategoryChainAsync(
        CatalogDbContext catalogDb, Guid? leafId, CancellationToken ct)
    {
        var chain = new List<Guid>();
        var current = leafId;

        for (var depth = 0; depth < MaxDepth && current.HasValue && current != Guid.Empty; depth++)
        {
            if (chain.Contains(current.Value)) break; // vòng cha-con trong dữ liệu
            chain.Add(current.Value);

            var id = current.Value;
            current = await catalogDb.Categories.AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => c.ParentId)
                .FirstOrDefaultAsync(ct);
        }

        return chain;
    }
}
