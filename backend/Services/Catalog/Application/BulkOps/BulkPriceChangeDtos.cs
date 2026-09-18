namespace Catalog.Application.BulkOps;

/// <summary>Request shape for both `preview` and `apply` (Requirements: "preview then apply,
/// filtered by category, brand or an explicit id list, based on selling price or cost, by
/// percentage or a dong amount").</summary>
public sealed class BulkPriceChangeRequest
{
    public Guid? CategoryId { get; set; }
    public Guid? BrandId { get; set; }
    public List<Guid>? ProductIds { get; set; }

    /// <summary>"sellingPrice" (Price, đã gồm VAT) hoặc "cost" (CostPrice, chưa gồm VAT).</summary>
    public string Basis { get; set; } = "sellingPrice";

    /// <summary>"percent" (vd 15 = +15%) hoặc "amount" (số tiền VND cộng thẳng vào Basis).</summary>
    public string AdjustmentType { get; set; } = "percent";

    public decimal Value { get; set; }

    /// <summary>Chỉ có tác dụng khi caller giữ `Catalog.BulkPrice` (Security Considerations) -
    /// endpoint kiểm tra quyền, service chỉ áp dụng cờ.</summary>
    public bool AllowBelowCost { get; set; }
}

public sealed record BulkPriceChangeLine(
    Guid ProductId, string Sku, string Name,
    decimal OldPrice, decimal NewPrice, decimal Cost, decimal NewNetPrice, bool BelowCost);

public sealed class BulkPriceChangeReport
{
    public int MatchedCount { get; set; }
    public int AppliedCount { get; set; }
    public int BelowCostBlockedCount { get; set; }
    public List<BulkPriceChangeLine> Lines { get; } = new();
    public string? Error { get; set; }
    public bool IsValid => Error is null;
}
