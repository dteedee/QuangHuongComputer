using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum OvertimeStatus
{
    Pending = 0,        // Đang chờ duyệt
    Approved = 1,       // Đã duyệt trước khi làm
    Rejected = 2,       // Bị từ chối
    Executed = 3,       // Đã ghi nhận giờ làm thực tế
    Cancelled = 4       // Đã huỷ
}

/// <summary>
/// Yêu cầu làm thêm giờ — đăng ký TRƯỚC, duyệt TRƯỚC, ghi nhận thực tế sau khi làm.
/// CHỈ tính tiền OT phần đã Approved. Làm quá không duyệt = không trả tiền.
/// </summary>
public class OvertimeRequest : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public DateTime Date { get; private set; }               // ngày làm OT
    public TimeOnly StartTime { get; private set; }
    public TimeOnly EndTime { get; private set; }
    public decimal RequestedHours { get; private set; }      // giờ đăng ký
    public string Reason { get; private set; } = string.Empty;
    public OvertimeStatus Status { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public string? RejectReason { get; private set; }
    public decimal? ActualHours { get; private set; }        // ghi nhận sau khi làm

    public OvertimeRequest(
        Guid employeeId,
        DateTime date,
        TimeOnly startTime,
        TimeOnly endTime,
        string reason)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (string.IsNullOrWhiteSpace(reason)) throw new ArgumentException("Lý do OT là bắt buộc.");
        if (endTime <= startTime) throw new ArgumentException("EndTime phải sau StartTime.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        Date = date.Date;
        StartTime = startTime;
        EndTime = endTime;
        Reason = reason;
        RequestedHours = Math.Round((decimal)(endTime - startTime).TotalHours, 2);
        Status = OvertimeStatus.Pending;
    }

    protected OvertimeRequest() { }

    public void Approve(Guid approverId)
    {
        if (Status != OvertimeStatus.Pending)
            throw new InvalidOperationException($"Chỉ duyệt được OT ở trạng thái Pending, hiện tại {Status}.");
        Status = OvertimeStatus.Approved;
        ApprovedBy = approverId;
        ApprovedAt = DateTime.UtcNow;
        RaiseDomainEvent(new OvertimeApprovedEvent(Id, EmployeeId, Date, RequestedHours, approverId));
    }

    public void Reject(Guid approverId, string reason)
    {
        if (Status != OvertimeStatus.Pending)
            throw new InvalidOperationException($"Chỉ từ chối được OT ở trạng thái Pending, hiện tại {Status}.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Lý do từ chối là bắt buộc.");
        Status = OvertimeStatus.Rejected;
        ApprovedBy = approverId;
        ApprovedAt = DateTime.UtcNow;
        RejectReason = reason;
    }

    public void Cancel()
    {
        if (Status == OvertimeStatus.Executed)
            throw new InvalidOperationException("Không thể huỷ OT đã ghi nhận giờ thực tế.");
        Status = OvertimeStatus.Cancelled;
    }

    /// <summary>Ghi nhận giờ làm thực tế. Chỉ chấp nhận nếu đã Approved.</summary>
    public void RecordActualHours(decimal actualHours)
    {
        if (Status != OvertimeStatus.Approved)
            throw new InvalidOperationException($"Chỉ ghi giờ thực tế cho OT đã Approved, hiện tại {Status}.");
        if (actualHours < 0) throw new ArgumentException("Giờ thực tế >= 0.");

        // Chỉ tính TỐI ĐA bằng số giờ đã duyệt — làm quá không được trả
        ActualHours = Math.Min(actualHours, RequestedHours);
        Status = OvertimeStatus.Executed;
    }

    /// <summary>Số giờ được trả tiền — bằng min(actual, requested), 0 nếu chưa duyệt.</summary>
    public decimal PayableHours()
    {
        if (Status != OvertimeStatus.Approved && Status != OvertimeStatus.Executed) return 0;
        return ActualHours ?? RequestedHours;
    }
}

public record OvertimeApprovedEvent(
    Guid RequestId,
    Guid EmployeeId,
    DateTime Date,
    decimal Hours,
    Guid ApprovedBy) : DomainEvent;
