using BuildingBlocks.Time;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Application.Checkout;
using Sales.Application.Pricing;
using Sales.Domain;

namespace Sales.Application.Pos;

/// <summary>
/// TẠM TÍNH TẠI QUẦY — `POST /api/sales/pos/quote` (phase-48 bước 1).
///
/// Vì sao phải có, thay vì để màn hình POS tự cộng: giá, khuyến mãi và VAT theo dòng (D01) đều
/// nằm ở server; màn hình quầy cộng tay thì con số đọc cho khách khác con số đơn lưu xuống, và
/// chênh lệch đó chỉ lộ ra khi kế toán đối soát cuối ngày.
///
/// Hàm này KHÔNG ghi gì xuống CSDL và KHÔNG giữ tồn kho: giỏ chỉ tồn tại trong bộ nhớ.
/// Chính vì thế nó gọi thẳng <see cref="IPricingEngine"/> chứ không qua <c>CheckoutPricingStep</c>
/// (bước đó TĂNG lượt dùng khuyến mãi — tạm tính mà tăng lượt thì mỗi lần bấm F5 đốt một lượt).
/// </summary>
public sealed class PosQuoteService
{
    private readonly CatalogDbContext _catalogDb;
    private readonly IOrderPriceSource _priceSource;
    private readonly IPricingEngine _pricing;
    private readonly LineVatProfileResolver _vatResolver;
    private readonly IBusinessClock _clock;
    private readonly IConfiguration _config;

    public PosQuoteService(
        CatalogDbContext catalogDb,
        IOrderPriceSource priceSource,
        IPricingEngine pricing,
        LineVatProfileResolver vatResolver,
        IBusinessClock clock,
        IConfiguration config)
    {
        _catalogDb = catalogDb;
        _priceSource = priceSource;
        _pricing = pricing;
        _vatResolver = vatResolver;
        _clock = clock;
        _config = config;
    }

    /// <summary>Dựng giỏ tạm trong bộ nhớ từ các dòng thu ngân quét vào (giá LẤY TỪ CSDL).</summary>
    public async Task<(Cart? Cart, string? Error, IReadOnlyDictionary<Guid, ProductBrief> Products)>
        BuildCartAsync(IReadOnlyList<PosLineRequest> lines, CancellationToken ct)
    {
        var empty = (IReadOnlyDictionary<Guid, ProductBrief>)new Dictionary<Guid, ProductBrief>();
        if (lines == null || lines.Count == 0) return (null, "Đơn tại quầy phải có ít nhất một sản phẩm.", empty);
        if (lines.Any(l => l.Quantity <= 0)) return (null, "Số lượng phải lớn hơn 0.", empty);

        var productIds = lines.Select(l => l.ProductId).Distinct().ToList();
        var products = await _catalogDb.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new ProductBrief(p.Id, p.Name, p.Sku))
            .ToDictionaryAsync(p => p.Id, ct);

        var unknown = productIds.FirstOrDefault(id => !products.ContainsKey(id));
        if (unknown != Guid.Empty) return (null, $"Sản phẩm {unknown} không tồn tại.", empty);

        var prices = await _priceSource.GetUnitPricesAsync(
            new OrderPriceQuery(lines.Select(l => (l.ProductId, l.VariantId)).ToList(), null), ct);

        var cart = Cart.ForGuest($"pos:{Guid.NewGuid():N}");
        foreach (var line in lines)
        {
            if (!prices.TryGetValue((line.ProductId, line.VariantId), out var unitPrice))
                return (null, $"Không xác định được giá bán: {products[line.ProductId].Name}", empty);

            cart.AddItem(line.ProductId, products[line.ProductId].Name, unitPrice, line.Quantity,
                line.VariantId, null, null);
        }

        return (cart, null, products);
    }

    /// <summary>Tính tiền cho một giỏ quầy. Dùng chung bởi `/pos/quote` và bước xác nhận của `/pos/orders`.</summary>
    public async Task<PosQuoteResult> QuoteAsync(
        Cart cart,
        IReadOnlyDictionary<Guid, ProductBrief> products,
        decimal manualDiscount,
        string? approvedBy,
        string cashierId,
        string[]? promotionCodes,
        Guid? customerId,
        CancellationToken ct)
    {
        var warnings = new List<string>();

        var customerContext = customerId.HasValue && customerId != Guid.Empty
            ? new CustomerContext(customerId.Value, null, 0, false)
            : null;

        var codes = (promotionCodes ?? Array.Empty<string>())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim().ToUpperInvariant()).Distinct().ToArray();

        var pricing = await _pricing.CalculateAsync(cart, customerContext, codes, ct);

        var subtotal = cart.Items.Where(i => !i.IsGift).Sum(i => i.Subtotal);
        var discountDecision = PosManualDiscountPolicy.Evaluate(
            manualDiscount, subtotal, approvedBy, cashierId, _config);
        if (discountDecision.Warning != null) warnings.Add(discountDecision.Warning);
        if (discountDecision.Error != null) throw new PosDiscountRejectedException(discountDecision.Error);

        var vatProfiles = await _vatResolver.ResolveAsync(
            cart.Items.Select(i => i.ProductId).Distinct().ToList(), _clock.TodayVn, ct);

        var sequence = 0;
        var items = cart.Items.Where(i => !i.IsGift).ToList();
        var inputs = items.Select(i => new TotalsLineInput(
            Sequence: ++sequence,
            UnitPriceIncludingVat: i.Price,
            Quantity: i.Quantity,
            LineDiscount: 0m,
            VatRate: vatProfiles.For(i.ProductId).EffectiveRate,
            IsGift: false)).ToList();

        var orderDiscount = pricing.OrderDiscount + pricing.LineDiscountTotal + discountDecision.Allowed;

        // POS không có phí vận chuyển: khách cầm hàng về ngay. Đây chính là khoản 30.000đ mà
        // luồng cũ (POS gọi nhờ checkout của khách) cộng lén vào mọi đơn bán tại quầy.
        var totals = OrderTotalsCalculator.Compute(inputs, orderDiscount, 0m, 0m, 0m);

        var lines = new List<PosQuoteLine>(items.Count);
        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var result = totals.Lines[i];
            products.TryGetValue(item.ProductId, out var brief);
            lines.Add(new PosQuoteLine(
                item.ProductId, item.VariantId,
                brief?.Name ?? item.ProductName, brief?.Sku,
                item.Quantity, item.Price,
                result.GrossBeforeDiscount, result.LineDiscount, result.AllocatedOrderDiscount,
                result.Payable, result.VatRate, result.VatAmount));
        }

        return new PosQuoteResult(
            Lines: lines,
            Subtotal: totals.Subtotal,
            Discount: totals.EffectiveDiscount,
            ManualDiscountApplied: discountDecision.Allowed,
            TaxAmount: totals.TaxAmount,
            Total: totals.Total,
            VatBreakdown: totals.VatBreakdown,
            Warnings: warnings);
    }
}

/// <summary>Tên + SKU của sản phẩm, đủ cho màn hình quầy và cho snapshot dòng đơn.</summary>
public sealed record ProductBrief(Guid Id, string Name, string? Sku);

/// <summary>Giảm giá tay bị từ chối (thiếu người duyệt / tự duyệt). Tầng endpoint đổi thành 400.</summary>
public sealed class PosDiscountRejectedException : Exception
{
    public PosDiscountRejectedException(string message) : base(message) { }
}
