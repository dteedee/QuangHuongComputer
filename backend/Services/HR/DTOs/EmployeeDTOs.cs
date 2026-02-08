using HR.Domain;

namespace HR.DTOs;

// Request DTOs
public record CreateEmployeeDto(
    string FullName,
    string Email,
    string Phone,
    string Department,
    string Position,
    DateTime HireDate,
    decimal Salary,
    string? IdCardNumber = null,
    string? Address = null);

public record UpdateEmployeeDto(
    string FullName,
    string Email,
    string Phone,
    string Department,
    string Position,
    string? IdCardNumber = null,
    string? Address = null);

public record UpdateEmployeeSalaryDto(
    decimal NewSalary);

public record TerminateEmployeeDto(
    string Reason);

// Response DTOs
public record EmployeeDto(
    Guid Id,
    string FullName,
    string Email,
    string Phone,
    string Department,
    string Position,
    DateTime HireDate,
    decimal Salary,
    EmployeeStatus Status,
    string? IdCardNumber,
    string? Address,
    DateTime? TerminationDate,
    string? TerminationReason,
    DateTime CreatedAt,
    DateTime? UpdatedAt)
{
    public static EmployeeDto FromDomain(Employee employee)
    {
        return new EmployeeDto(
            employee.Id,
            employee.FullName,
            employee.Email,
            employee.Phone,
            employee.Department,
            employee.Position,
            employee.HireDate,
            employee.BaseSalary,
            employee.Status,
            employee.IdCardNumber,
            employee.Address,
            employee.TerminationDate,
            employee.TerminationReason,
            employee.CreatedAt,
            employee.UpdatedAt);
    }
}

public record EmployeeListDto(
    Guid Id,
    string FullName,
    string Email,
    string Phone,
    string Department,
    string Position,
    decimal Salary,
    EmployeeStatus Status,
    DateTime HireDate)
{
    public static EmployeeListDto FromDomain(Employee employee)
    {
        return new EmployeeListDto(
            employee.Id,
            employee.FullName,
            employee.Email,
            employee.Phone,
            employee.Department,
            employee.Position,
            employee.BaseSalary,
            employee.Status,
            employee.HireDate);
    }
}

public record EmployeeSummaryDto(
    Guid Id,
    string FullName,
    string Department,
    string Position,
    EmployeeStatus Status);
