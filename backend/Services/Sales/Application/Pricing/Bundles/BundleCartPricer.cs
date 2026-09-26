using BuildingBlocks.TaxEngine;
using Catalog.Domain;

namespace Sales.Application.Pricing.Bundles;

/// <summary>Một dòng giỏ đưa vào tính giá combo. <paramref name="Index"/> = vị trí dòng (0..n-1).</summary>
public sealed record BundleCartLine(int Index, Guid ProductId, Guid? VariantId, decimal UnitPrice, int Quantity, Guid? BundleId);

/// <summary>Kết quả của một nhóm combo trong giỏ.</summary>
public sealed record BundleGroupResult(
    Guid BundleId,
    string Name,
    bool IsApplied,
    string? Reason,
    int Sets,
    decimal ListTotal,
    decimal BundleTotal,
    decimal Discount);

/// <summary>Giảm giá combo theo dòng + các dòng bị "khoá" (không nhận coupon/khuyến mãi nữa).</summary>
public sealed class BundlePricingResult
{
    private readonly decimal[] _lineDiscounts;
    private readonly bool[] _locked;

    public BundlePricingResult(decimal[] lineDiscounts, bool[] locked, IReadOnlyList<BundleGroupResult> groups)
    {
        _lineDiscounts = lineDiscounts;
        _locked = locked;
        Groups = groups;
    }

    public IReadOnlyList<BundleGroupResult> Groups { get; }
    public decimal TotalDiscount => _lineDiscounts.Sum();

    public decimal DiscountFor(int index) => index >= 0 && index < _lineDiscounts.Length ? _lineDiscounts[index] : 0m;
    public bool IsLocked(int index) => index >= 0 && index < _locked.Length && _locked[index];
    public BundleGroupResult? GroupFor(Guid? bundleId) => bundleId == null ? null : Groups.FirstOrDefault(g => g.BundleId == bundleId);

    public static BundlePricingResult Empty(int lineCount)
        => new(new decimal[lineCount], new bool[lineCount], Array.Empty<BundleGroupResult>());
}

/// <summary>
/// Tính giá COMBO cho giỏ — hàm thuần, không I/O (nạp dữ liệu: <see cref="BundleCartPricingService"/>).
///
/// Một nhóm combo chỉ được áp giá combo khi ĐỦ cả năm điều kiện:
///  1. combo còn tồn tại và đang bật;  2. đang trong khung hiệu lực;
///  3. nhóm có ĐÚNG các sản phẩm của combo, cùng một số bộ k ≥ 1 (mỗi món = số lượng/bộ × k);
///  4. còn đủ hàng (khi có dữ liệu tồn);  5. giá combo thấp hơn tổng giá lẻ hiện hành.
/// Thiếu một điều kiện ⇒ nhóm KHÔNG được giảm, các dòng tính như dòng lẻ (và được nhận
/// coupon/khuyến mãi như dòng lẻ). Đủ điều kiện ⇒ tiền giảm chia về từng dòng bằng
/// allocator số dư lớn nhất dùng chung (D01 §3.2) để VAT theo dòng vẫn đúng tuyệt đối, và các
/// dòng đó bị KHOÁ khỏi mọi giảm giá cấp đơn — không bao giờ giảm chồng.
/// </summary>
public static class BundleCartPricer
{
    public static BundlePricingResult Price(
        IReadOnlyList<BundleCartLine> lines,
        IReadOnlyDictionary<Guid, ProductBundle> bundles,
        IReadOnlyDictionary<(Guid ProductId, Guid? VariantId), int>? availableStock,
        DateTime utcNow)
    {
        var discounts = new decimal[lines.Count];
        var locked = new bool[lines.Count];
        var groups = new List<BundleGroupResult>();

        foreach (var group in lines.Where(l => l.BundleId.HasValue).GroupBy(l => l.BundleId!.Value))
        {
            var groupLines = group.ToList();
            bundles.TryGetValue(group.Key, out var bundle);
            var listTotal = groupLines.Sum(l => RoundDong(l.UnitPrice * l.Quantity));
            var (sets, reason) = Validate(bundle, groupLines, lines, availableStock, utcNow);
            var name = bundle?.Name ?? "Combo";

            if (reason != null)
            {
                groups.Add(new BundleGroupResult(group.Key, name, false, reason, sets, listTotal, listTotal, 0m));
                continue;
            }

            var bundleTotal = RoundDong(bundle!.PricePerSet(listTotal / sets) * sets);
            var discount = listTotal - bundleTotal;
            if (discount <= 0m)
            {
                groups.Add(new BundleGroupResult(group.Key, name, false,
                    "Giá combo không còn thấp hơn giá lẻ", sets, listTotal, listTotal, 0m));
                continue;
            }

            var basis = groupLines
                .Select(l => new DiscountLine(l.Index + 1, RoundDong(l.UnitPrice * l.Quantity), false))
                .ToList();
            var allocation = BuildingBlocks.TaxEngine.DiscountAllocator.Allocate(basis, discount);
            for (var i = 0; i < groupLines.Count; i++)
            {
                discounts[groupLines[i].Index] += allocation[i];
                locked[groupLines[i].Index] = true;
            }

            groups.Add(new BundleGroupResult(group.Key, name, true, null, sets, listTotal, bundleTotal, discount));
        }

        return new BundlePricingResult(discounts, locked, groups);
    }

    private static (int Sets, string? Reason) Validate(
        ProductBundle? bundle,
        IReadOnlyList<BundleCartLine> groupLines,
        IReadOnlyList<BundleCartLine> allLines,
        IReadOnlyDictionary<(Guid, Guid?), int>? stock,
        DateTime utcNow)
    {
        if (bundle == null || !bundle.IsActive) return (0, "Combo đã ngừng áp dụng");
        if (!bundle.IsWithinWindow(utcNow))
            return (0, bundle.ValidFrom > utcNow ? "Combo chưa đến thời gian áp dụng" : "Combo đã hết hạn");

        var required = bundle.Items.ToDictionary(i => i.ProductId, i => i.Quantity);
        if (required.Count == 0) return (0, "Combo không còn sản phẩm nào");

        var inGroup = groupLines.GroupBy(l => l.ProductId).ToDictionary(g => g.Key, g => g.Sum(l => l.Quantity));
        if (inGroup.Keys.Any(id => !required.ContainsKey(id))) return (0, "Nhóm combo có sản phẩm không thuộc combo");
        if (required.Keys.Any(id => !inGroup.ContainsKey(id))) return (0, "Combo thiếu sản phẩm");

        int? sets = null;
        foreach (var (productId, perSet) in required)
        {
            var qty = inGroup[productId];
            if (qty % perSet != 0) return (0, "Số lượng không đúng tỉ lệ combo");
            var k = qty / perSet;
            if (sets.HasValue && sets != k) return (0, "Số lượng không đúng tỉ lệ combo");
            sets = k;
        }

        if (stock != null)
        {
            foreach (var key in groupLines.Select(l => (l.ProductId, l.VariantId)).Distinct())
            {
                var demand = allLines.Where(l => l.ProductId == key.ProductId && l.VariantId == key.VariantId).Sum(l => l.Quantity);
                var available = stock.TryGetValue(key, out var s) ? s : 0;
                if (available < demand) return (sets ?? 0, "Sản phẩm trong combo không đủ hàng");
            }
        }

        return (sets ?? 0, null);
    }

    /// <summary>D01 §3.1 — làm tròn đồng, AwayFromZero.</summary>
    private static decimal RoundDong(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);
}
