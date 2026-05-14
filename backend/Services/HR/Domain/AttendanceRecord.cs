using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public class AttendanceRecord : Entity<Guid>
{
    public Guid EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public decimal WorkHours { get; set; }
    public decimal OvertimeHours { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;
    public string? IpAddress { get; set; }
    public string? Notes { get; set; }
}

public enum AttendanceStatus { Present, Late, Absent, HalfDay, Holiday, OnLeave }
