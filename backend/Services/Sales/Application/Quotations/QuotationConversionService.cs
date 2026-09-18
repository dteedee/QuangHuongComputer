using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Time;
using Sales.Application.Checkout;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Quotations;

/// <summary>
/// Implementation Steps #5 — <c>POST /api/sales/quotations/{id}/convert</c>.
///
/// Chỉ cho phép từ Accepted và trong hạn (Success Criteria: "conversion from Draft or after
/// expiry is refused"). Dựng một Cart TẠM từ đúng các dòng báo giá rồi giao cho
/// <c>CheckoutOrchestrator</c> với <c>channel = Quotation</c> — orchestrator gọi
/// <see cref="QuotationOrderPriceSource"/> để đọc lại giá TỪ CSDL theo <c>quotationId</c>
/// (Risk Assessment: "the orchestrator only ever reads from the database").
///
/// Công nợ được QUYẾT ĐỊNH Ở ĐÂY, TRƯỚC khi gọi orchestrator: nếu điều kiện công nợ không đạt,
/// việc chuyển đổi bị TỪ CHỐI HOÀN TOÀN (không tự động rơi về "không công nợ") — một khách yêu
/// cầu mua chịu mà không đủ điều kiện phải được nhân viên xử lý lại, không phải bị âm thầm đổi
/// điều khoản thanh toán.
/// </summary>
internal static class QuotationConversionService
{
    public static async Task<ConvertQuotationResult> ConvertAsync(
        SalesDbContext salesDb,
        CheckoutOrchestrator orchestrator,
        IAppSettings settings,
        IBusinessClock clock,
        ClaimsPrincipal user,
        Guid quotationId,
        ConvertQuotationRequest req,
        CancellationToken ct)
    {
        var quotation = await QuotationService.LoadAsync(salesDb, quotationId, ct);
        if (quotation == null)
            return new ConvertQuotationResult(false, "Không tìm thấy báo giá", null, null, null, null, null);

        var nowUtc = clock.UtcNow.UtcDateTime;
        if (!quotation.CanConvert(nowUtc))
        {
            var reason = quotation.Status switch
            {
                QuotationStatus.Draft => "Báo giá còn ở Draft — phải Gửi và được khách Chấp nhận trước",
                QuotationStatus.Converted => "Báo giá đã chuyển thành đơn trước đó",
                QuotationStatus.Rejected => "Báo giá đã bị từ chối",
                QuotationStatus.Expired => "Báo giá đã hết hạn",
                _ when quotation.ValidUntil.HasValue && quotation.ValidUntil.Value < nowUtc => "Báo giá đã hết hạn",
                _ => $"Không thể chuyển đổi báo giá ở trạng thái {quotation.Status}",
            };
            return new ConvertQuotationResult(false, reason, null, null, null, null, null);
        }

        // Công nợ: switch + quyền + hạn mức + chặn khách đang nợ quá hạn (D10, Architecture).
        var (creditAllowed, creditError) = await QuotationCreditPolicy.EvaluateAsync(
            settings, user, salesDb, quotation.PaymentTermDays, quotation.CustomerId, nowUtc, ct);
        if (!creditAllowed)
            return new ConvertQuotationResult(false, creditError, null, null, null, null, null);

        // Cart tạm — CheckoutOrchestrator chỉ biết làm việc với Cart; đây KHÔNG phải giỏ hàng
        // thật của khách, chỉ là phương tiện để tái dùng một đường chốt đơn duy nhất (Key Insights).
        var cart = new Cart(quotation.CustomerId ?? Guid.Empty);
        // Tên/SKU chỉ để tham chiếu tạm trên Cart — CheckoutOrderFactory đọc lại tên/SKU THẬT
        // từ Catalog khi dựng Order, nên Cart không cần biết phân biệt SKU sản phẩm/biến thể.
        foreach (var line in quotation.Lines.OrderBy(l => l.Sequence))
        {
            cart.AddItem(line.ProductId, line.ProductName, line.UnitPrice, line.Quantity,
                line.VariantId, variantName: null, variantSku: null);
        }
        salesDb.Carts.Add(cart);
        await salesDb.SaveChangesAsync(ct);

        var approvedBy = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.Identity?.Name;
        var paymentMethod = quotation.PaymentTermDays > 0
            ? PaymentMethodChoice.Credit
            : PaymentMethodChoice.Transfer;

        var checkoutReq = new CheckoutRequest
        {
            CartId = cart.Id,
            Channel = CheckoutChannel.Quotation,
            CustomerId = quotation.CustomerId,
            Shipping = new ShippingInfo(
                RecipientName: req.RecipientName,
                Phone: req.Phone,
                StreetAddress: req.StreetAddress,
                Ward: req.Ward,
                District: req.District,
                Province: req.Province,
                ShippingFee: 0m,
                IsPickup: req.IsPickup,
                PickupStoreId: req.PickupStoreId,
                PickupStoreName: req.PickupStoreName,
                Notes: req.Notes),
            PaymentMethod = paymentMethod,
            QuotationId = quotation.Id,
            PaymentTermDays = quotation.PaymentTermDays > 0 ? quotation.PaymentTermDays : null,
            BuyerInvoice = new BuyerInvoiceRequest(
                InvoiceRequested: quotation.BuyerType != BuyerType.Individual || !string.IsNullOrWhiteSpace(quotation.BuyerTaxCode),
                BuyerType: quotation.BuyerType.ToString(),
                LegalName: quotation.BuyerLegalName,
                FullName: quotation.CustomerName,
                TaxCode: quotation.BuyerTaxCode,
                BudgetUnitCode: quotation.BuyerBudgetUnitCode,
                Address: quotation.BuyerAddress,
                Email: quotation.CustomerEmail,
                Phone: quotation.CustomerPhone),
            ApprovedBy = approvedBy,
        };

        var result = await orchestrator.ExecuteAsync(checkoutReq, ct);
        if (!result.Success)
            return new ConvertQuotationResult(false, result.ErrorMessage, null, null, null, null, null);

        quotation.MarkConverted(result.OrderId!.Value, nowUtc);
        await salesDb.SaveChangesAsync(ct);

        var dueDate = quotation.PaymentTermDays > 0 ? nowUtc.AddDays(quotation.PaymentTermDays) : (DateTime?)null;
        return new ConvertQuotationResult(
            true, null, result.OrderId, result.OrderNumber, result.TotalAmount,
            paymentMethod.ToString(), dueDate);
    }
}
