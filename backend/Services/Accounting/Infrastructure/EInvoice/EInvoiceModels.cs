namespace Accounting.Infrastructure.EInvoice;

public class EInvoiceRequest
{
    public string SellerTaxCode { get; set; } = "";
    public string SellerName { get; set; } = "";
    public string SellerAddress { get; set; } = "";
    public string BuyerName { get; set; } = "";
    public string BuyerTaxCode { get; set; } = "";
    public string BuyerAddress { get; set; } = "";
    public string BuyerEmail { get; set; } = "";
    public string PaymentMethod { get; set; } = "TM/CK"; // Tiền mặt/Chuyển khoản
    public List<EInvoiceItem> Items { get; set; } = new();
    public decimal TotalBeforeVat { get; set; }
    public decimal TotalVat { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "VND";
}

public class EInvoiceItem
{
    public string Name { get; set; } = "";
    public string Unit { get; set; } = "Cái";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal VatRate { get; set; } // 0.08 or 0.10
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class EInvoiceIssueResult
{
    public bool Success { get; set; }
    public string InvoiceId { get; set; } = "";
    public string InvoiceNumber { get; set; } = "";
    public string LookupCode { get; set; } = "";
    public string PdfUrl { get; set; } = "";
    public DateTime IssuedDate { get; set; }
    public string ErrorMessage { get; set; } = "";
}

public class EInvoiceCancelResult
{
    public bool Success { get; set; }
    public string ErrorMessage { get; set; } = "";
}

public class EInvoiceStatusResult
{
    public string InvoiceId { get; set; } = "";
    public string Status { get; set; } = ""; // Draft, Issued, SignedByCQT, Cancelled, Replaced
    public DateTime? SignedDate { get; set; }
    public string LookupUrl { get; set; } = "";
}
