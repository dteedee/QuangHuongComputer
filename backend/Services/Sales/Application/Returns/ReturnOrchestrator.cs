using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Returns;

/// <summary>
/// Phase 07: điều phối 3 luồng Refund / Exchange / Replace.
///  1. RequestAsync — khách gửi yêu cầu; verify OrderItem thuộc order của khách,
///     kiểm chính sách hạn theo Category, tạo ReturnRequest.
///  2. ProcessAfterInspectionAsync — sau kiểm hàng: gọi RestockService, xử lý tiền/đơn mới, Complete.
/// </summary>
public class ReturnOrchestrator
{
    private readonly SalesDbContext _salesDb;
    private readonly CatalogDbContext _catalogDb;
    private readonly RestockService _restockService;

    public ReturnOrchestrator(
        SalesDbContext salesDb,
        CatalogDbContext catalogDb,
        RestockService restockService)
    {
        _salesDb = salesDb;
        _catalogDb = catalogDb;
        _restockService = restockService;
    }

    public async Task<ReturnRequest> RequestAsync(
        CreateReturnRequestInput input,
        Guid customerId,
        CancellationToken ct = default)
    {
        // 1. Verify Order thuộc customer.
        var order = await _salesDb.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == input.OrderId && o.CustomerId == customerId, ct)
            ?? throw new InvalidOperationException("Đơn hàng không tồn tại hoặc không thuộc khách hàng.");

        var orderItem = order.Items.FirstOrDefault(i => i.Id == input.OrderItemId)
            ?? throw new InvalidOperationException("Sản phẩm trong đơn không tồn tại.");

        // 2. Kiểm tra policy — tra theo CategoryId của product; fallback policy mặc định (CategoryId == null).
        var product = await _catalogDb.Products
            .AsNoTracking()
            .Where(p => p.Id == orderItem.ProductId)
            .Select(p => new { p.CategoryId })
            .FirstOrDefaultAsync(ct);

        var categoryId = product?.CategoryId;
        var policy = await GetEffectivePolicyAsync(categoryId, ct);
        if (policy == null || !policy.IsActive)
            throw new InvalidOperationException("Không có chính sách đổi trả áp dụng cho sản phẩm này.");

        if (!policy.IsWithinPeriod(input.Type, order.OrderDate))
            throw new InvalidOperationException(
                $"Sản phẩm đã ngoài hạn {input.Type} ({policy.AllowedDaysFor(input.Type)} ngày).");

        // 3. Tính amount gốc của line item.
        var originalAmount = orderItem.UnitPrice * orderItem.Quantity;

        // 4. Tạo ReturnRequest theo Type.
        ReturnRequest rr = input.Type switch
        {
            ReturnType.Refund => ReturnRequest.RequestRefund(
                input.OrderId, input.OrderItemId, input.Reason, originalAmount,
                input.Description, input.AttachmentUrls, input.CustomerNotes),
            ReturnType.Exchange => ReturnRequest.RequestExchange(
                input.OrderId, input.OrderItemId,
                input.ExchangeProductId ?? throw new InvalidOperationException("Exchange cần ExchangeProductId."),
                input.ExchangeVariantId,
                input.Reason, originalAmount,
                input.Description, input.AttachmentUrls, input.CustomerNotes),
            ReturnType.Replace => ReturnRequest.RequestReplace(
                input.OrderId, input.OrderItemId, input.Reason, originalAmount,
                input.Description, input.AttachmentUrls, input.CustomerNotes),
            _ => throw new ArgumentOutOfRangeException(nameof(input.Type))
        };

        _salesDb.ReturnRequests.Add(rr);
        await _salesDb.SaveChangesAsync(ct);
        return rr;
    }

    /// <summary>
    /// Sau khi kiểm hàng: nhập kho + xử lý tiền/đơn mới, Complete.
    /// Refund : hoàn tiền qua phương thức gốc → RefundAmount có thể trừ restocking fee.
    /// Exchange: tạo Order mới cho SP thay thế (giá hiện tại) → tính PriceDifference.
    /// Replace : xuất máy cùng SKU (chưa implement DeliveryNote real — trả metadata).
    /// </summary>
    public async Task<ProcessResult> ProcessAfterInspectionAsync(
        Guid returnRequestId,
        string processedBy,
        CancellationToken ct = default)
    {
        var rr = await _salesDb.ReturnRequests
            .FirstOrDefaultAsync(r => r.Id == returnRequestId, ct)
            ?? throw new InvalidOperationException("Không tìm thấy ReturnRequest.");

        if (rr.InspectedAt == null)
            throw new InvalidOperationException("Chưa kiểm hàng (chống gian lận): gọi RecordInspection trước.");

        // 1. Nhập lại kho (mọi luồng đều nhập lại hàng khách trả về).
        var restock = await _restockService.RestockAsync(rr.Id, ct);

        decimal finalRefund = 0m;
        Guid? exchangeOrderId = null;
        decimal priceDifference = 0m;

        // 2. Xử lý theo luồng.
        switch (rr.Type)
        {
            case ReturnType.Refund:
                finalRefund = ComputeRefundAmount(rr);
                rr.Complete(processedBy, finalRefund);
                break;

            case ReturnType.Exchange:
                (exchangeOrderId, priceDifference) = await CreateExchangeOrderAsync(rr, ct);
                rr.AttachExchangeOrder(exchangeOrderId.Value, priceDifference);
                rr.Complete(processedBy);
                break;

            case ReturnType.Replace:
                // Cùng SKU, không phát sinh tiền. DeliveryNote sinh ở tầng endpoint hoặc phase sau.
                rr.Complete(processedBy);
                break;
        }

        await _salesDb.SaveChangesAsync(ct);

        return new ProcessResult(
            ReturnRequestId: rr.Id,
            Type: rr.Type,
            RefundAmount: rr.Type == ReturnType.Refund ? finalRefund : 0m,
            ExchangeOrderId: exchangeOrderId,
            PriceDifference: priceDifference,
            GoodsReceivedNoteId: restock.GoodsReceivedNoteId);
    }

    /// <summary>
    /// Chọn policy hiệu lực: khớp CategoryId trước, fallback policy mặc định (CategoryId == null).
    /// </summary>
    public async Task<ReturnPolicy?> GetEffectivePolicyAsync(Guid? categoryId, CancellationToken ct = default)
    {
        if (categoryId.HasValue)
        {
            var byCategory = await _salesDb.ReturnPolicies
                .FirstOrDefaultAsync(p => p.CategoryId == categoryId && p.IsActive, ct);
            if (byCategory != null) return byCategory;
        }
        return await _salesDb.ReturnPolicies
            .FirstOrDefaultAsync(p => p.CategoryId == null && p.IsActive, ct);
    }

    // Tính tiền hoàn: tính lại từ Order gốc trên server (không tin client).
    // Trừ restocking fee theo policy nếu điều kiện không nguyên vẹn.
    private decimal ComputeRefundAmount(ReturnRequest rr)
    {
        var baseAmount = rr.RefundAmount;
        if (rr.ReceivedCondition == ReceivedCondition.UserDamage)
            return 0m; // Từ chối hoàn — nhân viên có thể override qua manual approve
        if (rr.ReceivedCondition == ReceivedCondition.MissingAccessories)
            return baseAmount * 0.8m; // Trừ 20% mặc định (nên đọc từ policy phụ kiện phase sau)
        return baseAmount;
    }

    private async Task<(Guid orderId, decimal priceDifference)> CreateExchangeOrderAsync(
        ReturnRequest rr, CancellationToken ct)
    {
        if (!rr.ExchangeProductId.HasValue)
            throw new InvalidOperationException("Exchange thiếu ExchangeProductId.");

        // Fetch SP thay thế (giá hiện tại).
        var newProduct = await _catalogDb.Products.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == rr.ExchangeProductId.Value, ct)
            ?? throw new InvalidOperationException("Sản phẩm đổi không tồn tại.");

        var originalOrder = await _salesDb.Orders
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
        _salesDb.Orders.Add(exchangeOrder);

        var priceDifference = exchangeOrder.TotalAmount - rr.RefundAmount;
        return (exchangeOrder.Id, priceDifference);
    }
}

public record CreateReturnRequestInput(
    Guid OrderId,
    Guid OrderItemId,
    ReturnType Type,
    string Reason,
    string? Description = null,
    string? CustomerNotes = null,
    string? AttachmentUrls = null,
    Guid? ExchangeProductId = null,
    Guid? ExchangeVariantId = null);

public record ProcessResult(
    Guid ReturnRequestId,
    ReturnType Type,
    decimal RefundAmount,
    Guid? ExchangeOrderId,
    decimal PriceDifference,
    Guid GoodsReceivedNoteId);
