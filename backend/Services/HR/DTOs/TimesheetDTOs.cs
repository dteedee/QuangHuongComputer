using HR.Domain;

namespace HR.DTOs;

// Request DTOs
public record CreateTimesheetDto(
    Guid EmployeeId,
    DateTime Date,
    TimeSpan CheckIn,
    TimeSpan? CheckOut = null,
    string? Notes = null);

public record UpdateTimesheetDto(
    TimeSpan CheckIn,
    TimeSpan? CheckOut = null,
    string? Notes = null);

public record SetCheckOutDto(
    TimeSpan CheckOut);

public record ApproveTimesheetDto(
    Guid ApprovedBy);

public record RejectTimesheetDto(
    Guid RejectedBy,
    string Reason);

// Response DTOs
public record TimesheetDto(
    Guid Id,
    Guid EmployeeId,
    DateTime Date,
    TimeSpan? CheckIn,
    TimeSpan? CheckOut,
    decimal TotalHours,
    decimal RegularHours,
    decimal OvertimeHours,
    TimesheetStatus Status,
    string? Notes,
    string? RejectionReason,
    Guid? ApprovedBy,
    DateTime? ApprovedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt)
{
    public static TimesheetDto FromDomain(Timesheet timesheet)
    {
        return new TimesheetDto(
            timesheet.Id,
            timesheet.EmployeeId,
            timesheet.Date,
            timesheet.CheckIn,
            timesheet.CheckOut,
            timesheet.TotalHours,
            timesheet.RegularHours,
            timesheet.OvertimeHours,
            timesheet.Status,
            timesheet.Notes,
            timesheet.RejectionReason,
            timesheet.ApprovedBy,
            timesheet.ApprovedAt,
            timesheet.CreatedAt,
            timesheet.UpdatedAt);
    }
}

public record TimesheetSummaryDto(
    Guid Id,
    Guid EmployeeId,
    DateTime Date,
    decimal TotalHours,
    decimal OvertimeHours,
    TimesheetStatus Status)
{
    public static TimesheetSummaryDto FromDomain(Timesheet timesheet)
    {
        return new TimesheetSummaryDto(
            timesheet.Id,
            timesheet.EmployeeId,
            timesheet.Date,
            timesheet.TotalHours,
            timesheet.OvertimeHours,
            timesheet.Status);
    }
}

public record EmployeeTimesheetReportDto(
    Guid EmployeeId,
    string EmployeeName,
    int Month,
    int Year,
    decimal TotalRegularHours,
    decimal TotalOvertimeHours,
    decimal TotalHours,
    int TotalDays,
    List<TimesheetSummaryDto> Timesheets);
