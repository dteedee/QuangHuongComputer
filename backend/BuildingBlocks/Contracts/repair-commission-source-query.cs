namespace BuildingBlocks.Contracts;

/// <summary>
/// "Phiếu sửa này đã thu tiền chưa, ai sửa, tiền công bao nhiêu?" — câu HR (hoa hồng kỹ thuật)
/// hỏi Repair mà không tham chiếu Repair. Cài đặt duy nhất nằm trong Repair
/// (<c>Repair.Application.Commission.RepairCommissionSourceQuery</c>); host nối qua DI.
///
/// Đi kèm sự kiện <c>RepairWorkOrderSettlementChangedEvent</c>: sự kiện chỉ báo "phiếu X vừa đổi
/// trạng thái thanh toán", HR luôn đọc lại sự thật qua contract này. MassTransit ở repo này chưa có
/// outbox (xem ServiceRegistration), nên sự kiện có thể mất — đối soát theo kỳ
/// (<see cref="ListPaidBetweenAsync"/>) là lưới an toàn.
/// </summary>
public interface IRepairCommissionSourceQuery
{
    /// <summary>Null nếu không có phiếu sửa này.</summary>
    Task<RepairCommissionSource?> GetAsync(Guid workOrderId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Mọi phiếu có thời điểm thanh toán trong [<paramref name="fromUtc"/>, <paramref name="toUtc"/>),
    /// KỂ CẢ phiếu đã bị huỷ sau khi thanh toán (để HR huỷ hoa hồng tương ứng).
    /// </summary>
    Task<IReadOnlyList<RepairCommissionSource>> ListPaidBetweenAsync(
        DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default);
}

/// <param name="TechnicianUserId">Tài khoản Identity của kỹ thuật viên (Technician.UserId) —
/// HR ánh xạ sang Employee.UserId. Null = kỹ thuật viên chưa gắn tài khoản.</param>
/// <param name="LaborAmount">Tiền công (không gồm linh kiện).</param>
/// <param name="ServiceFeeAmount">Phí dịch vụ tại nhà/on-site (không gồm linh kiện).</param>
/// <param name="PaidAtUtc">Thời điểm ghi nhận thanh toán (UTC).</param>
/// <param name="IsSettled">Đang ở trạng thái đã thanh toán hoặc đã giao máy.</param>
/// <param name="IsVoidedAfterPayment">Đã thanh toán rồi bị huỷ/hoàn -> hoa hồng phải huỷ.</param>
public sealed record RepairCommissionSource(
    Guid WorkOrderId,
    string TicketNumber,
    Guid? TechnicianId,
    Guid? TechnicianUserId,
    string? TechnicianName,
    decimal LaborAmount,
    decimal ServiceFeeAmount,
    DateTime? PaidAtUtc,
    bool IsSettled,
    bool IsVoidedAfterPayment);
