using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Sales.Application.Checkout;

/// <summary>
/// Kênh tạo đơn. MỘT orchestrator phục vụ cả bốn — khác nhau ở nguồn giá, quyền, và
/// trạng thái đơn khi kết thúc, chứ không phải ở đường code.
/// </summary>
public enum CheckoutChannel
{
    /// <summary>Khách đã đăng nhập mua trên web.</summary>
    Web = 0,
    /// <summary>Khách vãng lai (không tài khoản), khoá theo cookie <c>qh_aid</c>.</summary>
    Guest = 1,
    /// <summary>Bán tại quầy — đơn ra đời đã thu tiền và đã giao hàng (W2-10).</summary>
    Pos = 2,
    /// <summary>D10 — chuyển báo giá B2B thành đơn; giá LẤY TỪ CSDL theo báo giá (W2-19).</summary>
    Quotation = 3,
}

/// <summary>
/// SEAM giá bán (D10). <c>CheckoutOrchestrator</c> không bao giờ nhận đơn giá từ client;
/// nó hỏi nguồn giá tương ứng với kênh.
///
/// W2-19 hiện thực <c>QuotationOrderPriceSource</c>: đọc <c>SalesQuotationLines</c> theo
/// <c>quotationId</c> và trả về đúng giá đã chốt trên báo giá, KHÔNG áp khuyến mãi/coupon.
/// </summary>
public interface IOrderPriceSource
{
    /// <summary>Kênh mà nguồn giá này phục vụ.</summary>
    CheckoutChannel Channel { get; }

    /// <summary>
    /// Trả về đơn giá ĐÃ GỒM VAT cho từng dòng. Khoá là (ProductId, VariantId).
    /// Dòng không có trong kết quả bị từ chối — không có đường "đoán giá".
    /// </summary>
    Task<IReadOnlyDictionary<(Guid ProductId, Guid? VariantId), decimal>> GetUnitPricesAsync(
        OrderPriceQuery query,
        CancellationToken ct = default);

    /// <summary>Kênh này có được áp khuyến mãi/coupon không. Báo giá: KHÔNG (D10).</summary>
    bool AllowsPromotions => true;
}

/// <summary>Yêu cầu tra giá cho một lần chốt đơn.</summary>
/// <param name="Lines">Các dòng cần giá.</param>
/// <param name="QuotationId">Chỉ có ở kênh <see cref="CheckoutChannel.Quotation"/>.</param>
public sealed record OrderPriceQuery(
    IReadOnlyList<(Guid ProductId, Guid? VariantId)> Lines,
    Guid? QuotationId = null);

/// <summary>
/// Nguồn giá mặc định cho web/guest/POS: giá niêm yết hiện hành trong Catalog.
///
/// Quan trọng về bảo mật: đây là lý do <c>CheckoutDto</c> không còn <c>UnitPrice</c> có tác dụng.
/// Khách từng POST giá 0đ cho hàng 27 triệu; giá bây giờ LUÔN đọc từ CSDL tại thời điểm chốt đơn.
/// </summary>
public class CatalogOrderPriceSource : IOrderPriceSource
{
    private readonly CatalogDbContext _catalogDb;

    public CatalogOrderPriceSource(CatalogDbContext catalogDb) => _catalogDb = catalogDb;

    public CheckoutChannel Channel => CheckoutChannel.Web;

    public async Task<IReadOnlyDictionary<(Guid ProductId, Guid? VariantId), decimal>> GetUnitPricesAsync(
        OrderPriceQuery query,
        CancellationToken ct = default)
    {
        var productIds = query.Lines.Select(l => l.ProductId).Distinct().ToList();
        var variantIds = query.Lines.Where(l => l.VariantId.HasValue)
            .Select(l => l.VariantId!.Value).Distinct().ToList();

        var products = await _catalogDb.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Price })
            .ToListAsync(ct);
        var productPrices = products.ToDictionary(p => p.Id, p => p.Price);

        // Biến thể có giá riêng thì giá biến thể thắng giá sản phẩm gốc.
        var variantPrices = new Dictionary<Guid, decimal>();
        if (variantIds.Count > 0)
        {
            var variants = await _catalogDb.ProductVariants.AsNoTracking()
                .Where(v => variantIds.Contains(v.Id))
                .Select(v => new { v.Id, v.Price })
                .ToListAsync(ct);
            foreach (var variant in variants)
            {
                if (variant.Price > 0m) variantPrices[variant.Id] = variant.Price;
            }
        }

        var result = new Dictionary<(Guid, Guid?), decimal>();
        foreach (var line in query.Lines)
        {
            if (line.VariantId.HasValue && variantPrices.TryGetValue(line.VariantId.Value, out var vp))
            {
                result[(line.ProductId, line.VariantId)] = vp;
            }
            else if (productPrices.TryGetValue(line.ProductId, out var pp))
            {
                result[(line.ProductId, line.VariantId)] = pp;
            }
        }

        return result;
    }
}
