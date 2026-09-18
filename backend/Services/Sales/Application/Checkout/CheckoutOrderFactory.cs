using BuildingBlocks.Time;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Pricing;
using Sales.Domain;

namespace Sales.Application.Checkout;

/// <summary>
/// Dựng <see cref="Order"/> từ giỏ + kết quả tính giá, kèm đủ snapshot để hoá đơn không bao giờ
/// phải đọc ngược về Catalog (D03 xoá sản phẩm rác, D01/D07 yêu cầu snapshot thuế theo dòng).
/// </summary>
internal static class CheckoutOrderFactory
{
    public static async Task<Order> BuildAsync(
        CatalogDbContext catalogDb,
        Cart cart,
        CheckoutRequest req,
        CheckoutPricing pricing,
        VatProfileSet vatProfiles,
        IBusinessClock clock,
        CancellationToken ct)
    {
        var snapshots = await LoadSnapshotsAsync(catalogDb, cart, pricing, ct);
        var items = new List<OrderItem>();
        var sequence = 0;

        foreach (var cartItem in cart.Items.Where(i => !i.IsGift))
        {
            var profile = vatProfiles.For(cartItem.ProductId);
            snapshots.Products.TryGetValue(cartItem.ProductId, out var product);
            var variant = ResolveVariant(snapshots, cartItem.VariantId);

            items.Add(new OrderItem(
                productId: cartItem.ProductId,
                productName: product.Name ?? cartItem.ProductName,
                unitPrice: cartItem.Price,
                quantity: cartItem.Quantity,
                productSku: product.Sku,
                originalPrice: null,
                variantId: cartItem.VariantId,
                variantName: variant.Name,
                variantSku: variant.Sku,
                vatStatutoryRate: profile.StatutoryRate,
                vatReductionEligible: profile.ReductionEligible,
                vatRate: profile.EffectiveRate,
                unitName: profile.UnitName,
                sequence: ++sequence));
        }

        // Hàng tặng: giá 0, KHÔNG gánh giảm giá, nhưng vẫn phải trừ tồn và hiện trên hoá đơn
        // với ghi chú "hàng khuyến mại không thu tiền" (D01 §5).
        foreach (var gift in pricing.Gifts)
        {
            if (!snapshots.Products.TryGetValue(gift.ProductId, out var giftProduct)) continue;
            var profile = vatProfiles.For(gift.ProductId);
            var variant = ResolveVariant(snapshots, gift.VariantId);

            items.Add(new OrderItem(
                productId: gift.ProductId,
                productName: giftProduct.Name,
                unitPrice: 0m,
                quantity: gift.Quantity,
                productSku: giftProduct.Sku,
                originalPrice: null,
                variantId: gift.VariantId,
                variantName: variant.Name,
                variantSku: variant.Sku,
                isGift: true,
                appliedPromotionCode: gift.PromotionCode,
                vatStatutoryRate: profile.StatutoryRate,
                vatReductionEligible: profile.ReductionEligible,
                vatRate: profile.EffectiveRate,
                unitName: profile.UnitName,
                sequence: ++sequence));
        }

        var order = new Order(
            customerId: req.CustomerId ?? Guid.Empty,
            shippingAddress: req.Shipping.FormatFull(),
            items: items,
            taxRate: vatProfiles.Fallback.EffectiveRate,
            notes: req.Shipping.Notes,
            customerIp: req.CustomerIp,
            customerUserAgent: req.CustomerUserAgent,
            sourceId: null,
            paymentMethod: req.PaymentMethod.ToString(),
            isPickup: req.Shipping.IsPickup,
            pickupStoreId: req.Shipping.PickupStoreId,
            pickupStoreName: req.Shipping.PickupStoreName,
            customerName: req.Shipping.RecipientName,
            customerEmail: req.GuestEmail,
            customerPhone: req.Shipping.Phone,
            businessDate: clock.TodayVn,
            channel: ChannelName(req.Channel));

        order.SetShippingVatRate(vatProfiles.ShippingRate);
        order.SetShippingAmount(req.Shipping.ShippingFee);
        order.ApplyPricingResult(
            discountAmount: pricing.OrderDiscount,
            shippingDiscount: pricing.ShippingDiscount,
            appliedPromotionsJson: pricing.AppliedPromotionsJson,
            couponCode: pricing.CouponCode);

        ApplyChannelContext(order, req);
        ApplyBuyerInvoice(order, req);
        order.SetTermsVersion(req.TermsVersion);

        return order;
    }

    private static void ApplyChannelContext(Order order, CheckoutRequest req)
    {
        switch (req.Channel)
        {
            case CheckoutChannel.Guest:
                order.SetGuestIdentity(req.AnonymousId);
                break;

            case CheckoutChannel.Pos:
                order.SetPosContext(req.StoreId!.Value, req.ShiftId, req.CashierId);
                break;

            case CheckoutChannel.Quotation:
                var due = req.PaymentTermDays is > 0
                    ? DateTime.UtcNow.AddDays(req.PaymentTermDays.Value)
                    : (DateTime?)null;
                order.SetQuotationLink(req.QuotationId!.Value, due);
                break;
        }
    }

    /// <summary>D07 — khối người mua; dữ liệu sai định dạng rơi về hoá đơn bán lẻ thay vì làm hỏng đơn.</summary>
    private static void ApplyBuyerInvoice(Order order, CheckoutRequest req)
    {
        var buyer = req.BuyerInvoice;
        if (buyer is not { InvoiceRequested: true })
        {
            order.SetBuyerInvoiceInfo(BuyerInvoiceInfo.None(
                req.Shipping.RecipientName, req.GuestEmail, req.Shipping.Phone));
            return;
        }

        var type = Enum.TryParse<BuyerType>(buyer.BuyerType, ignoreCase: true, out var parsed)
            ? parsed
            : BuyerType.Organization;

        order.SetBuyerInvoiceInfo(BuyerInvoiceInfo.ForInvoice(
            type, buyer.LegalName, buyer.FullName ?? req.Shipping.RecipientName,
            buyer.TaxCode, buyer.BudgetUnitCode, buyer.Address,
            buyer.Email ?? req.GuestEmail, buyer.Phone ?? req.Shipping.Phone));
    }

    private static string ChannelName(CheckoutChannel channel) => channel switch
    {
        CheckoutChannel.Guest => OrderChannels.Guest,
        CheckoutChannel.Pos => OrderChannels.Pos,
        CheckoutChannel.Quotation => OrderChannels.Quotation,
        _ => OrderChannels.Web,
    };

    private static (string? Name, string? Sku) ResolveVariant(CatalogSnapshots snapshots, Guid? variantId)
        => variantId.HasValue && snapshots.Variants.TryGetValue(variantId.Value, out var v)
            ? v
            : (null, null);

    private static async Task<CatalogSnapshots> LoadSnapshotsAsync(
        CatalogDbContext catalogDb, Cart cart, CheckoutPricing pricing, CancellationToken ct)
    {
        var productIds = cart.Items.Select(i => i.ProductId)
            .Concat(pricing.Gifts.Select(g => g.ProductId))
            .Distinct().ToList();
        var variantIds = cart.Items.Where(i => i.VariantId.HasValue).Select(i => i.VariantId!.Value)
            .Concat(pricing.Gifts.Where(g => g.VariantId.HasValue).Select(g => g.VariantId!.Value))
            .Distinct().ToList();

        var products = await catalogDb.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, p.Sku })
            .ToListAsync(ct);

        var variants = variantIds.Count == 0
            ? new List<(Guid Id, string Name, string Sku)>()
            : (await catalogDb.ProductVariants.AsNoTracking()
                .Where(v => variantIds.Contains(v.Id))
                .Select(v => new { v.Id, v.Name, v.Sku })
                .ToListAsync(ct))
              .Select(v => (v.Id, v.Name, v.Sku)).ToList();

        return new CatalogSnapshots(
            products.ToDictionary(p => p.Id, p => (Name: p.Name, Sku: (string?)p.Sku)),
            variants.ToDictionary(v => v.Id, v => ((string?)v.Name, (string?)v.Sku)));
    }

    private sealed record CatalogSnapshots(
        IReadOnlyDictionary<Guid, (string Name, string? Sku)> Products,
        IReadOnlyDictionary<Guid, (string? Name, string? Sku)> Variants);
}
