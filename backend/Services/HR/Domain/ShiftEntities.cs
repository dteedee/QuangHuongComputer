using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public class Shift : Entity<Guid>
{
    public string Name { get; private set; }
    public TimeSpan StartTime { get; private set; }
    public TimeSpan EndTime { get; private set; }
    public decimal? BreakDurationMinutes { get; private set; }
    public bool IsActive { get; private set; }
    public string? Description { get; private set; }
    public string? ColorCode { get; private set; } // For calendar display
    public int DisplayOrder { get; private set; }

    public Shift(
        string name,
        TimeSpan startTime,
        TimeSpan endTime,
        decimal? breakDurationMinutes = null,
        string? description = null,
        string? colorCode = null,
        int displayOrder = 0)
    {
        Id = Guid.NewGuid();
        Name = name;
        StartTime = startTime;
        EndTime = endTime;
        BreakDurationMinutes = breakDurationMinutes;
        Description = description;
        ColorCode = colorCode;
        DisplayOrder = displayOrder;
        IsActive = true;
    }

    protected Shift() { }

    public void Update(string name, TimeSpan startTime, TimeSpan endTime, decimal? breakDurationMinutes = null)
    {
        Name = name;
        StartTime = startTime;
        EndTime = endTime;
        BreakDurationMinutes = breakDurationMinutes;
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
    }

    public decimal CalculateHours()
    {
        var totalMinutes = (EndTime - StartTime).TotalMinutes;
        if (BreakDurationMinutes.HasValue)
            totalMinutes -= (double)BreakDurationMinutes.Value;
        return (decimal)(totalMinutes / 60);
    }
}

public class ShiftAssignment : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    public Guid ShiftId { get; private set; }
    public DateOnly Date { get; private set; }
    public AssignmentStatus Status { get; private set; }
    public TimeSpan? ActualStartTime { get; private set; }
    public TimeSpan? ActualEndTime { get; private set; }
    public string? Notes { get; private set; }
    public decimal? ActualHoursWorked { get; private set; }
    public DateTime? CheckInAt { get; private set; }
    public DateTime? CheckOutAt { get; private set; }
    public string? CheckInIp { get; private set; }
    public string? CheckOutIp { get; private set; }

    public ShiftAssignment(
        Guid employeeId,
        Guid shiftId,
        DateOnly date)
    {
        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        ShiftId = shiftId;
        Date = date;
        Status = AssignmentStatus.Scheduled;
    }

    protected ShiftAssignment() { }

    public void CheckIn(TimeSpan? actualStartTime = null, string? checkInIp = null)
    {
        if (Status != AssignmentStatus.Scheduled)
            throw new InvalidOperationException("Cannot check in to non-scheduled shift");

        Status = AssignmentStatus.CheckedIn;
        ActualStartTime = actualStartTime;
        CheckInAt = DateTime.UtcNow;
        CheckInIp = checkInIp;
    }

    public void CheckOut(TimeSpan? actualEndTime = null, string? checkOutIp = null)
    {
        if (Status != AssignmentStatus.CheckedIn)
            throw new InvalidOperationException("Cannot check out without checking in first");

        Status = AssignmentStatus.CheckedOut;
        ActualEndTime = actualEndTime;
        CheckOutAt = DateTime.UtcNow;
        CheckOutIp = checkOutIp;
        CalculateActualHours();
    }

    public void MarkAsMissed(string? notes = null)
    {
        if (Status == AssignmentStatus.CheckedIn || Status == AssignmentStatus.CheckedOut)
            throw new InvalidOperationException("Cannot mark checked-in/out shift as missed");

        Status = AssignmentStatus.Missed;
        Notes = notes;
    }

    public void Cancel()
    {
        if (Status == AssignmentStatus.CheckedIn || Status == AssignmentStatus.CheckedOut)
            throw new InvalidOperationException("Cannot cancel checked-in shift");

        Status = AssignmentStatus.Cancelled;
    }

    private void CalculateActualHours()
    {
        if (ActualStartTime.HasValue && ActualEndTime.HasValue)
        {
            var totalMinutes = (ActualEndTime.Value - ActualStartTime.Value).TotalMinutes;
            ActualHoursWorked = (decimal)(totalMinutes / 60);
        }
    }
}

public enum AssignmentStatus
{
    Scheduled,
    CheckedIn,
    CheckedOut,
    Missed,
    Late,
    Cancelled
}
