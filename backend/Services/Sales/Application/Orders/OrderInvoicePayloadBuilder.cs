using BuildingBlocks.Messaging.IntegrationEvents;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using EventBuyer = BuildingBlocks.Messaging.IntegrationEvents.BuyerInvoiceInfo;

namespace Sales.Application.Orders;

/// <summary>
/// W2-23 — dựng khối dữ liệu HOÁ ĐƠN đi kèm sự kiện vòng đời đơn.
///
/// Nguyên tắc (phase-72 "Non-functional"): sự kiện mang ĐỦ mọi thứ bên nhận cần, để consumer hoá
/// đơn KHÔNG BAO GIỜ phải truy ngược sang Catalog/Identity. Mọi số liệu lấy từ SNAPSHOT trên dòng
/// đơn (D01 §4) — không đọc lại <c>Products</c>, vì sau đợt dọn D03 sản phẩm nguồn có thể đã đổi
/// giá, đổi tên hoặc không còn tồn tại, mà hoá đơn thì phải đúng với thứ khách đã mua.
/// </summary>
public static class OrderInvoicePayloadBuilder
{
    /// <summary>Số sê-ri đã bán gắn với đơn — tra một lần cho cả đơn, không tra theo từng dòng.</summary>
    public static async Task<IReadOnlyDictionary<Guid, List<string>>> LoadSerialsAsync(
        InventoryDbContext inventoryDb, Guid orderId, CancellationToken ct = default)
    {
        var rows = await inventoryDb.SerialNumbers
            .Where(s => s.OrderId == orderId)
            .Select(s => new { s.ProductId, s.Serial })
            .ToListAsync(ct);

        return rows
            .GroupBy(r => r.ProductId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Serial).ToList());
    }

    public static IReadOnlyList<InvoiceLineDto> BuildLines(
        Order order, IReadOnlyDictionary<Guid, List<string>>? serialsByProduct = null)
        => order.Items
            .OrderBy(i => i.Sequence)
            .Select(i => new InvoiceLineDto(
                Sku: i.VariantSku ?? i.ProductSku ?? string.Empty,
                Name: i.VariantName is { Length: > 0 } v ? $"{i.ProductName} ({v})" : i.ProductName,
                Qty: i.Quantity,
                // D01: giá đã gồm VAT; số phải thu của dòng SAU mọi khoản giảm.
                PayableGross: i.LineTotal,
                UnitName: string.IsNullOrWhiteSpace(i.UnitName) ? "Chiếc" : i.UnitName!,
                VatStatutoryRate: i.VatStatutoryRate,
                VatReductionEligible: i.VatReductionEligible,
                DiscountAmount: i.DiscountAmount,
                IsGift: i.IsGift,
                Serials: serialsByProduct is not null && serialsByProduct.TryGetValue(i.ProductId, out var s)
                    ? s
                    : Array.Empty<string>()))
            .ToList();

    /// <summary>D01 §3.3 — phí vận chuyển là MỘT DÒNG hoá đơn riêng, có thuế suất riêng.</summary>
    public static ShippingLineDto BuildShipping(Order order)
        => new(order.ShippingAmount, order.ShippingVatRate);

    /// <summary>D07 — khối người mua, đã đóng băng trên đơn lúc chốt đơn.</summary>
    public static EventBuyer BuildBuyer(Order order)
    {
        var b = order.BuyerInvoice;
        return new EventBuyer(
            BuyerType: b.BuyerType switch
            {
                Sales.Domain.BuyerType.Organization => "Company",
                Sales.Domain.BuyerType.BudgetUnit => "PublicUnit",
                _ => "Individual",
            },
            BuyerLegalName: b.BuyerLegalName,
            BuyerFullName: b.BuyerFullName ?? order.CustomerName ?? string.Empty,
            BuyerTaxCode: b.BuyerTaxCode,
            BuyerBudgetUnitCode: b.BuyerBudgetUnitCode,
            BuyerAddress: b.BuyerAddress ?? order.ShippingAddress,
            BuyerEmail: b.BuyerEmail ?? order.CustomerEmail,
            BuyerPhone: b.BuyerPhone ?? order.CustomerPhone);
    }

    /// <summary>Danh sách dòng cho <c>InvoiceRequestedEvent</c> (hợp đồng cũ, giữ nguyên hình dạng).</summary>
    public static List<InvoiceItemDto> BuildLegacyInvoiceItems(Order order)
        => order.Items
            .OrderBy(i => i.Sequence)
            .Select(i => new InvoiceItemDto(i.ProductId, i.ProductName, i.Quantity, i.UnitPrice))
            .ToList();
}
