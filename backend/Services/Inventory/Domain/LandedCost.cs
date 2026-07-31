using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Chi phí nhập (landed cost) đi kèm một GRN.
/// Ví dụ: vận chuyển, thuế nhập khẩu, phí hải quan, bảo hiểm.
/// Phân bổ vào từng GRNItem để tính giá vốn thực (weighted average).
/// </summary>
public class LandedCost : Entity<Guid>
{
    public Guid GRNId { get; private set; }
    public LandedCostType Type { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public LandedCostAllocationMethod Method { get; private set; }
    public bool IsAllocated { get; private set; }
    public DateTime? AllocatedAt { get; private set; }

    protected LandedCost() { }

    public LandedCost(
        Guid grnId,
        LandedCostType type,
        string description,
        decimal amount,
        LandedCostAllocationMethod method = LandedCostAllocationMethod.ByValue)
    {
        if (amount < 0)
            throw new ArgumentException("Chi phí nhập không được âm", nameof(amount));

        Id = Guid.NewGuid();
        GRNId = grnId;
        Type = type;
        Description = description ?? string.Empty;
        Amount = amount;
        Method = method;
        IsAllocated = false;
    }

    public void MarkAllocated()
    {
        IsAllocated = true;
        AllocatedAt = DateTime.UtcNow;
    }
}

public enum LandedCostType
{
    Shipping = 1,        // Vận chuyển
    ImportTax = 2,       // Thuế nhập khẩu
    CustomsFee = 3,      // Phí hải quan
    Insurance = 4,       // Bảo hiểm
    Other = 99           // Khác
}

public enum LandedCostAllocationMethod
{
    ByValue = 1,         // Theo giá trị dòng (mặc định)
    ByWeight = 2,        // Theo khối lượng
    ByQuantity = 3       // Chia đều theo số lượng
}
