namespace Repair.Domain;

/// <summary>
/// Trạng thái lịch hẹn. Chuyển hợp lệ:
/// Pending → Approved | Rejected | Converted | NoShow;
/// Approved → Converted | NoShow;
/// Rejected / Converted / NoShow là trạng thái cuối.
/// NoShow chỉ đánh được khi ngày hẹn đã tới (theo giờ VN) — xem <see cref="ServiceBooking.MarkNoShow"/>.
/// </summary>
public enum BookingStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Converted = 3,  // Converted to WorkOrder
    NoShow = 4      // Khách không đến
}
