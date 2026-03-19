namespace Payments.Infrastructure.SePay;

public class SePayConfig
{
    public string AccountNumber { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty; // Token to verify webhook
}

public class SePayWebhookPayload
{
    public int Id { get; set; } // SePay transaction ID
    public string Gateway { get; set; } = string.Empty; // e.g., "MBBank"
    public string TransactionDate { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? SubAccount { get; set; }
    public string Content { get; set; } = string.Empty; // Transfer description
    public string TransferType { get; set; } = string.Empty; // "in" or "out"
    public decimal TransferAmount { get; set; }
    public decimal Accumulated { get; set; }
    public string? Code { get; set; }
    public string? ReferenceCode { get; set; }
    public string? Description { get; set; } // Full description from bank
}

public class SePayService
{
    private readonly SePayConfig _config;

    public SePayService(SePayConfig config)
    {
        _config = config;
    }

    public string CreatePaymentUrl(string accountNo, string bankCode, decimal amount, string content)
    {
        // SePay Quick Link format: https://qr.sepay.vn/img?acc={acc}&bank={bank}&amount={amount}&des={content}
        // Use provided account/bank or fallback to config
        var acc = !string.IsNullOrEmpty(accountNo) ? accountNo : _config.AccountNumber;
        var bank = !string.IsNullOrEmpty(bankCode) ? bankCode : _config.BankCode;
        
        // Encode content to handle special characters
        var encodedContent = System.Net.WebUtility.UrlEncode(content);
        
        return $"https://qr.sepay.vn/img?acc={acc}&bank={bank}&amount={amount}&des={encodedContent}";
    }

    public bool VerifyWebhook(string authHeader)
    {
        if (string.IsNullOrEmpty(_config.ApiKey)) return true; // If no key configured, skip check (development)

        // SePay sends "Bearer <token>" or just "<token>" depending on configuration
        // Check if the header contains the key
        return authHeader.Contains(_config.ApiKey);
    }
}
