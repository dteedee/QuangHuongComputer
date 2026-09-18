namespace InventoryModule.Domain;

/// <summary>
/// Giá vốn bình quân gia quyền của một dòng tồn. Tách khỏi <c>InventoryItem.cs</c> (W2-5) để giữ
/// mỗi file dưới 200 dòng: bên kia là bất biến về SỐ LƯỢNG (giữ chỗ, xuất, điều chỉnh), bên này là
/// bất biến về TIỀN. Chỉ <c>StockLedgerService</c> gọi những hàm này.
/// </summary>
public partial class InventoryItem
{
    /// <summary>
    /// Tổng giá trị vốn tồn kho tại thời điểm hiện tại (báo cáo tài chính).
    /// </summary>
    public decimal TotalCostValue => QuantityOnHand * AverageCost;

    /// <summary>
    /// [Deprecated] Cập nhật giá vốn cho 1 đơn vị nhập. Giữ lại để backward-compat.
    /// Ưu tiên dùng ApplyPurchase(int addedQty, decimal totalAddedCost) — phản ánh
    /// đúng bình quân gia quyền cho lô nhập N đơn vị.
    /// </summary>
    public void UpdateAverageCost(decimal newCost)
    {
        if (QuantityOnHand > 0)
        {
            AverageCost = ((AverageCost * QuantityOnHand) + (newCost * 1)) / (QuantityOnHand + 1);
        }
        else
        {
            AverageCost = newCost;
        }
    }

    /// <summary>
    /// Áp dụng nhập kho theo bình quân gia quyền:
    ///   newAvg = (oldQty × oldAvg + addedQty × unitCost) / (oldQty + addedQty)
    /// addedQty và unitCost đã bao gồm phần landed cost đã phân bổ (nếu có).
    /// KHÔNG tự AdjustStock — caller phải gọi AdjustStock trước hoặc sau tuỳ nghiệp vụ,
    /// tách hai trách nhiệm giúp test rõ.
    /// </summary>
    public void ApplyPurchase(int addedQty, decimal unitCost)
    {
        if (addedQty <= 0)
            throw new ArgumentException("Số lượng nhập phải dương", nameof(addedQty));
        if (unitCost < 0)
            throw new ArgumentException("Giá vốn không được âm", nameof(unitCost));

        var oldQty = QuantityOnHand;
        var newQty = oldQty + addedQty;
        AverageCost = newQty > 0
            ? ((oldQty * AverageCost) + (addedQty * unitCost)) / newQty
            : 0m;
        QuantityOnHand = newQty;
        LastStockUpdate = DateTime.UtcNow;
    }

    /// <summary>
    /// Ép đặt giá vốn trung bình sau khi phân bổ landed cost cho lô đã nhập.
    /// Dùng khi cost landed đến MUỘN hơn nhập kho — điều chỉnh cost mà không thay tồn.
    /// </summary>
    public void OverrideAverageCost(decimal newAverageCost)
    {
        if (newAverageCost < 0)
            throw new ArgumentException("Giá vốn không được âm", nameof(newAverageCost));
        AverageCost = newAverageCost;
        LastStockUpdate = DateTime.UtcNow;
    }
}
