using Microsoft.EntityFrameworkCore;
using Sales.Application.Checkout;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Quotations;

/// <summary>
/// D10 seam — nguồn giá cho kênh <see cref="CheckoutChannel.Quotation"/>. Đọc đúng
/// <see cref="SalesQuotationLine.UnitPrice"/> đã chốt trên báo giá theo <c>quotationId</c>,
/// KHÔNG bao giờ nhận giá từ client. Không áp khuyến mãi/coupon (<see cref="AllowsPromotions"/>).
///
/// Đăng ký DI: xem <c>reports/integration-requests-w2.md</c> — <c>DependencyInjection.cs</c>
/// không thuộc glob của track này, nên việc thay <c>services.AddScoped&lt;IOrderPriceSource,
/// CatalogOrderPriceSource&gt;()</c> bằng <see cref="CompositeOrderPriceSource"/> phải do gate áp.
/// </summary>
public sealed class QuotationOrderPriceSource : IOrderPriceSource
{
    private readonly SalesDbContext _salesDb;

    public QuotationOrderPriceSource(SalesDbContext salesDb) => _salesDb = salesDb;

    public CheckoutChannel Channel => CheckoutChannel.Quotation;

    /// <summary>D10 — báo giá không được cộng thêm khuyến mãi/coupon lúc chuyển đổi.</summary>
    public bool AllowsPromotions => false;

    public async Task<IReadOnlyDictionary<(Guid ProductId, Guid? VariantId), decimal>> GetUnitPricesAsync(
        OrderPriceQuery query, CancellationToken ct = default)
    {
        if (query.QuotationId is not { } quotationId || quotationId == Guid.Empty)
            return new Dictionary<(Guid, Guid?), decimal>();

        var lines = await _salesDb.Set<SalesQuotationLine>().AsNoTracking()
            .Where(l => l.QuotationId == quotationId)
            .Select(l => new { l.ProductId, l.VariantId, l.UnitPrice })
            .ToListAsync(ct);

        var result = new Dictionary<(Guid, Guid?), decimal>();
        foreach (var line in lines)
        {
            // Trùng (ProductId, VariantId) trên cùng báo giá là không hợp lệ về nghiệp vụ, nhưng
            // nếu xảy ra thì KHÔNG được âm thầm ghi đè — dòng đầu thắng, giữ hành vi xác định.
            result.TryAdd((line.ProductId, line.VariantId), line.UnitPrice);
        }
        return result;
    }
}

/// <summary>
/// Bộ định tuyến giá theo <c>QuotationId</c> có mặt trong yêu cầu hay không — thay cho việc
/// <c>CheckoutOrchestrator</c> nhận trực tiếp MỘT <see cref="IOrderPriceSource"/> cố định
/// (hiện tại luôn là <c>CatalogOrderPriceSource</c>, xem <c>DependencyInjection.cs:45</c>).
/// </summary>
public sealed class CompositeOrderPriceSource : IOrderPriceSource
{
    private readonly IOrderPriceSource _catalogSource;
    private readonly IOrderPriceSource _quotationSource;

    public CompositeOrderPriceSource(IOrderPriceSource catalogSource, QuotationOrderPriceSource quotationSource)
    {
        _catalogSource = catalogSource;
        _quotationSource = quotationSource;
    }

    /// <summary>Không có ý nghĩa dùng riêng — <c>Dispatch</c> chọn nguồn thật theo từng lời gọi.
    /// (<c>AllowsPromotions</c> hiện không được <c>CheckoutPricingStep</c> đọc — chặn khuyến mãi
    /// ở kênh Quotation đã làm bằng nhánh <c>req.Channel == CheckoutChannel.Quotation</c> ở đó.)</summary>
    public CheckoutChannel Channel => CheckoutChannel.Web;

    public Task<IReadOnlyDictionary<(Guid ProductId, Guid? VariantId), decimal>> GetUnitPricesAsync(
        OrderPriceQuery query, CancellationToken ct = default)
        => Dispatch(query.QuotationId).GetUnitPricesAsync(query, ct);

    private IOrderPriceSource Dispatch(Guid? quotationId)
        => quotationId is { } id && id != Guid.Empty ? _quotationSource : _catalogSource;
}
