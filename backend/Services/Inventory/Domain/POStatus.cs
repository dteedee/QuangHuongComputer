namespace InventoryModule.Domain;

/// <summary>
/// Trạng thái đơn đặt hàng nhà cung cấp.
/// Enum value cũ giữ nguyên để không phá dữ liệu; các giá trị mới bắt đầu từ 5.
/// Vòng đời chuẩn: Draft → PendingApproval → Approved → Sent → PartialReceived → Received
///                            └────────────→ Rejected (quay về Draft cho sửa)
///                            └────────────→ Cancelled (bất cứ trạng thái nào trước Received)
/// </summary>
public enum POStatus
{
    Draft = 0,
    Sent = 1,
    PartialReceived = 2,
    Received = 3,
    Cancelled = 4,
    PendingApproval = 5,
    Approved = 6,
    Rejected = 7
}
