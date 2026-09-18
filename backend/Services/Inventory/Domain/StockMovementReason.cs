namespace InventoryModule.Domain;

/// <summary>
/// Lý do chuẩn hoá của MỘT bút toán kho (W2-5).
///
/// <para>
/// Trước đây <see cref="StockMovement.Reason"/> chỉ là chuỗi tự do do từng call site tự đặt
/// ("Transfer out: TF-...", "Kiểm kê: KK-..."), nên không thể lọc/tổng hợp theo nghiệp vụ.
/// Enum này là mã lý do; chuỗi tiếng Việt vẫn được ghi kèm để hiển thị.
/// </para>
///
/// <para>
/// <b>D10:</b> <see cref="OpeningBalance"/> là NGOẠI LỆ DUY NHẤT của quy tắc "GRN là đường nhập
/// kho duy nhất". Hàng mua trong ngày phải đi qua quick-receive của W2-12 (sinh PO + GRN thật).
/// </para>
/// </summary>
public enum StockMovementReason
{
    /// <summary>Nhập theo phiếu nhập kho (GRN) — đường nhập chuẩn.</summary>
    GoodsReceipt = 0,

    /// <summary>D10: tồn đầu kỳ. Ngoại lệ duy nhất của "GRN là đường nhập kho duy nhất".</summary>
    OpeningBalance = 1,

    /// <summary>Khách trả hàng, nhập lại kho.</summary>
    CustomerReturn = 2,

    /// <summary>Nhận hàng chuyển kho nội bộ (vế IN của một phiếu chuyển).</summary>
    TransferIn = 3,

    /// <summary>Xuất hàng chuyển kho nội bộ (vế OUT của một phiếu chuyển).</summary>
    TransferOut = 4,

    /// <summary>Bán hàng (đơn online/POS) — xuất kho.</summary>
    Sale = 5,

    /// <summary>Xuất theo phiếu xuất kho (DN).</summary>
    DeliveryNote = 6,

    /// <summary>Linh kiện dùng cho phiếu sửa chữa.</summary>
    RepairPart = 7,

    /// <summary>Chênh lệch kiểm kê đã được duyệt.</summary>
    CountAdjustment = 8,

    /// <summary>Điều chỉnh thủ công có phiếu + người duyệt.</summary>
    ManualAdjustment = 9,

    /// <summary>Hàng hỏng/vỡ.</summary>
    Damage = 10,

    /// <summary>Mất hàng.</summary>
    Loss = 11,

    /// <summary>Tìm thấy hàng thừa.</summary>
    Found = 12,

    /// <summary>Hết hạn sử dụng.</summary>
    Expiry = 13,

    /// <summary>Giữ chỗ cho đơn hàng (không đổi tồn thực).</summary>
    Reservation = 14,

    /// <summary>Nhả giữ chỗ (đơn huỷ/hết hạn).</summary>
    ReservationRelease = 15,

    /// <summary>Chốt giữ chỗ thành xuất kho thật.</summary>
    ReservationCommit = 16,

    /// <summary>Trả hàng lại nhà cung cấp.</summary>
    PurchaseReturn = 17
}

/// <summary>Nhãn tiếng Việt của <see cref="StockMovementReason"/> — dùng cho cột Reason và cho UI.</summary>
public static class StockMovementReasons
{
    private static readonly IReadOnlyDictionary<StockMovementReason, string> Labels =
        new Dictionary<StockMovementReason, string>
        {
            [StockMovementReason.GoodsReceipt] = "Nhập kho theo phiếu nhập",
            [StockMovementReason.OpeningBalance] = "Tồn đầu kỳ",
            [StockMovementReason.CustomerReturn] = "Khách trả hàng",
            [StockMovementReason.TransferIn] = "Nhận chuyển kho",
            [StockMovementReason.TransferOut] = "Xuất chuyển kho",
            [StockMovementReason.Sale] = "Bán hàng",
            [StockMovementReason.DeliveryNote] = "Xuất kho theo phiếu xuất",
            [StockMovementReason.RepairPart] = "Linh kiện sửa chữa",
            [StockMovementReason.CountAdjustment] = "Điều chỉnh sau kiểm kê",
            [StockMovementReason.ManualAdjustment] = "Điều chỉnh thủ công",
            [StockMovementReason.Damage] = "Hàng hỏng",
            [StockMovementReason.Loss] = "Mất hàng",
            [StockMovementReason.Found] = "Thừa hàng",
            [StockMovementReason.Expiry] = "Hết hạn sử dụng",
            [StockMovementReason.Reservation] = "Giữ chỗ",
            [StockMovementReason.ReservationRelease] = "Nhả giữ chỗ",
            [StockMovementReason.ReservationCommit] = "Chốt giữ chỗ",
            [StockMovementReason.PurchaseReturn] = "Trả hàng nhà cung cấp"
        };

    public static string Label(StockMovementReason reason) =>
        Labels.TryGetValue(reason, out var label) ? label : reason.ToString();

    /// <summary>Lý do được phép dùng cho phiếu điều chỉnh thủ công (W2-5 bước 7).</summary>
    public static readonly IReadOnlyList<StockMovementReason> ManualAdjustmentReasons = new[]
    {
        StockMovementReason.Damage,
        StockMovementReason.Loss,
        StockMovementReason.Found,
        StockMovementReason.Expiry,
        StockMovementReason.ManualAdjustment
    };
}
