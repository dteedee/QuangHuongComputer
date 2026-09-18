using BuildingBlocks.Endpoints;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Returns;

/// <summary>
/// Dựng ĐƠN ĐỔI cho một yêu cầu <c>Exchange</c>: sản phẩm thay thế tính theo giá hiện tại, chênh
/// lệch so với tiền hoàn của dòng gốc là số khách phải bù (dương) hoặc được nhận lại (âm).
///
/// Tách khỏi <see cref="ReturnOrchestrator"/> để file điều phối ở dưới 200 dòng và để việc "tạo
/// một đơn mới" không lẫn vào việc "quyết định chính sách đổi trả".
/// </summary>
internal static class ReturnExchangeOrderFactory
{
    public static async Task<(Guid OrderId, decimal PriceDifference)> CreateAsync(
        SalesDbContext salesDb, CatalogDbContext catalogDb, ReturnRequest rr, CancellationToken ct)
    {
        if (!rr.ExchangeProductId.HasValue)
            throw new InvalidOperationException("Exchange thiếu ExchangeProductId.");

        // Fetch SP thay thế (giá hiện tại).
        var newProduct = await catalogDb.Products.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == rr.ExchangeProductId.Value, ct)
            ?? throw new InvalidOperationException("Sản phẩm đổi không tồn tại.");

        var originalOrder = await salesDb.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == rr.OrderId, ct)
            ?? throw new InvalidOperationException("Order gốc không tồn tại.");

        var newItem = new OrderItem(
            productId: newProduct.Id,
            productName: newProduct.Name,
            unitPrice: newProduct.Price,
            quantity: 1,
            productSku: newProduct.Sku,
            originalPrice: newProduct.OldPrice ?? newProduct.Price,
            variantId: rr.ExchangeVariantId);

        var exchangeOrder = new Order(
            customerId: originalOrder.CustomerId,
            shippingAddress: originalOrder.ShippingAddress ?? "",
            items: new List<OrderItem> { newItem },
            taxRate: 0.1m,
            notes: $"Đơn đổi từ ReturnRequest {rr.Id}");
        salesDb.Orders.Add(exchangeOrder);

        var priceDifference = exchangeOrder.TotalAmount - rr.RefundAmount;
        return (exchangeOrder.Id, priceDifference);
    }
}
