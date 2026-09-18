using Accounting.Domain;
using Accounting.Infrastructure.EInvoice;

namespace Accounting.Application.EInvoice;

/// <summary>
/// Chuyển hoá đơn nội bộ thành chứng từ TRUNG LẬP gửi nhà cung cấp HĐĐT.
///
/// Không tính lại một con số nào: mọi giá trị đã được tách VAT và lưu sẵn trên
/// <see cref="InvoiceLine"/> (D01 §3.1) — hoá đơn điện tử phải khớp TUYỆT ĐỐI với hoá đơn nội bộ,
/// nên tính lại ở đây là con đường ngắn nhất tới hai tờ hoá đơn lệch nhau 1 đồng.
/// </summary>
public static class EInvoiceDocumentFactory
{
    /// <summary>Đơn vị tính mặc định khi dòng hàng không có (bắt buộc phải có trên hoá đơn GTGT).</summary>
    public const string DefaultUnitName = "Cái";

    public static EInvoiceDocument Create(Invoice invoice, EInvoiceKind kind)
    {
        var lines = invoice.Lines
            .Select(l => new EInvoiceDocumentLine(
                Name: l.Description,
                Sku: l.Sku,
                UnitName: string.IsNullOrWhiteSpace(l.UnitName) ? DefaultUnitName : l.UnitName!,
                Quantity: l.Quantity,
                UnitPrice: l.UnitPrice,
                VatRate: l.VatRate,
                DiscountAmount: l.LineDiscount,
                NetAmount: l.NetAmount,
                VatAmount: l.VatAmount,
                GrossAmount: l.GrossAmount,
                IsPromotion: l.IsPromotion))
            .ToList();

        return new EInvoiceDocument(
            RefId: invoice.Id,
            InternalInvoiceNumber: invoice.InvoiceNumber,
            IssueDate: invoice.IssueDate,
            Kind: kind,
            Buyer: BuyerOf(invoice),
            PaymentMethodName: PaymentMethodNameOf(invoice),
            Lines: lines,
            TotalNet: invoice.SubTotal,
            TotalVat: invoice.VatAmount,
            TotalAmount: invoice.TotalAmount);
    }

    public static EInvoiceBuyer BuyerOf(Invoice invoice) => new(
        invoice.BuyerType,
        invoice.BuyerLegalName,
        invoice.BuyerFullName,
        invoice.BuyerTaxCode,
        invoice.BuyerBudgetUnitCode,
        invoice.BuyerAddress,
        invoice.BuyerEmail,
        invoice.BuyerPhone);

    /// <summary>
    /// Hình thức thanh toán in trên hoá đơn: TM (tiền mặt) / CK (chuyển khoản) / TM-CK (cả hai).
    /// Chưa thu đồng nào thì để "TM/CK" — đúng thông lệ khi hoá đơn được lập lúc giao hàng
    /// (NĐ 254/2026 Đ.9.1: xuất hoá đơn không phụ thuộc đã thu tiền hay chưa).
    /// </summary>
    public static string PaymentMethodNameOf(Invoice invoice)
    {
        var hasCash = false;
        var hasTransfer = false;

        foreach (var payment in invoice.Payments)
        {
            if (payment.Method == PaymentMethod.Cash) hasCash = true;
            else hasTransfer = true;
        }

        return (hasCash, hasTransfer) switch
        {
            (true, true) => "TM-CK",
            (true, false) => "TM",
            (false, true) => "CK",
            _ => "TM/CK"
        };
    }
}
