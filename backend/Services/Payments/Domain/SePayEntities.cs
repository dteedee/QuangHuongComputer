using BuildingBlocks.SharedKernel;

namespace Payments.Domain;

public class SePayTransaction : Entity<int>
{
    public string Gateway { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? SubAccount { get; set; }
    public string Content { get; set; } = string.Empty;
    public string TransferType { get; set; } = string.Empty;
    public decimal TransferAmount { get; set; }
    public decimal Accumulated { get; set; }
    public string? Code { get; set; }
    public string? ReferenceCode { get; set; }
    public string? Description { get; set; }
    
    // Internal tracking
    // CreatedAt inherited
    public bool IsProcessed { get; set; }
    public Guid? RelatedOrderId { get; set; }
    public string? ProcessingError { get; set; }
}

public class PaymentConfig : Entity<string>
{
    // Key-Value pair for payment configurations
    // Id will be the Key (e.g., "SePay:ApiKey")
    public string Value { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsSecret { get; set; } // specific for frontend masking
    // UpdatedAt inherited
    
    public PaymentConfig() { }

    public PaymentConfig(string key)
    {
        Id = key;
    }
}
