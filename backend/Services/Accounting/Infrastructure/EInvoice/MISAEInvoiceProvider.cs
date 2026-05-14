using System.Text;
using System.Text.Json;

namespace Accounting.Infrastructure.EInvoice;

public class MISAConfig
{
    public string AppId { get; set; } = "";
    public string SecretKey { get; set; } = "";
    public string TaxCode { get; set; } = "";
    public string Endpoint { get; set; } = "https://api-einvoice.misa.vn/api/v1";
}

public class MISAEInvoiceProvider : IEInvoiceProvider
{
    private readonly MISAConfig _config;
    private readonly HttpClient _http;

    public MISAEInvoiceProvider(MISAConfig config, HttpClient http)
    {
        _config = config;
        _http = http;
    }

    public async Task<EInvoiceIssueResult> IssueInvoice(EInvoiceRequest request)
    {
        try
        {
            var payload = MapToMISAFormat(request);
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            AddAuthHeaders();

            var response = await _http.PostAsync($"{_config.Endpoint}/invoices/create", content);
            var responseJson = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new EInvoiceIssueResult { Success = false, ErrorMessage = responseJson };

            var result = JsonSerializer.Deserialize<JsonElement>(responseJson);
            return new EInvoiceIssueResult
            {
                Success = true,
                InvoiceId = result.GetProperty("invoiceId").GetString() ?? "",
                InvoiceNumber = result.GetProperty("invoiceNumber").GetString() ?? "",
                LookupCode = result.GetProperty("lookupCode").GetString() ?? "",
                IssuedDate = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            return new EInvoiceIssueResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<EInvoiceCancelResult> CancelInvoice(string invoiceId, string reason)
    {
        try
        {
            var body = new { invoiceId, reason };
            var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            AddAuthHeaders();
            var response = await _http.PostAsync($"{_config.Endpoint}/invoices/cancel", content);
            return new EInvoiceCancelResult { Success = response.IsSuccessStatusCode };
        }
        catch (Exception ex)
        {
            return new EInvoiceCancelResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<EInvoiceIssueResult> ReplaceInvoice(string oldInvoiceId, EInvoiceRequest newRequest)
    {
        await CancelInvoice(oldInvoiceId, "Replaced by new invoice");
        return await IssueInvoice(newRequest);
    }

    public async Task<EInvoiceStatusResult> GetStatus(string invoiceId)
    {
        var response = await _http.GetAsync($"{_config.Endpoint}/invoices/{invoiceId}/status");
        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(json);
        return new EInvoiceStatusResult
        {
            InvoiceId = invoiceId,
            Status = data.TryGetProperty("status", out var s) ? s.GetString() ?? "Unknown" : "Unknown"
        };
    }

    public async Task<byte[]> DownloadPdf(string invoiceId)
    {
        var response = await _http.GetAsync($"{_config.Endpoint}/invoices/{invoiceId}/pdf");
        return await response.Content.ReadAsByteArrayAsync();
    }

    private object MapToMISAFormat(EInvoiceRequest req) => new
    {
        sellerTaxCode = _config.TaxCode,
        buyerName = req.BuyerName,
        buyerTaxCode = req.BuyerTaxCode,
        buyerAddress = req.BuyerAddress,
        buyerEmail = req.BuyerEmail,
        paymentMethod = req.PaymentMethod,
        items = req.Items.Select(i => new
        {
            itemName = i.Name,
            unitName = i.Unit,
            quantity = i.Quantity,
            unitPrice = i.UnitPrice,
            vatRate = i.VatRate * 100,
            amount = i.TotalAmount
        }),
        totalAmountBeforeVat = req.TotalBeforeVat,
        totalVatAmount = req.TotalVat,
        totalAmount = req.TotalAmount
    };

    private void AddAuthHeaders()
    {
        _http.DefaultRequestHeaders.Remove("X-App-Id");
        _http.DefaultRequestHeaders.Add("X-App-Id", _config.AppId);
    }
}
