using System;

namespace HR.Domain;

public class Employee
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string IdCardNumber { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // Sale, Technician, Accountant, etc.
    public decimal BaseSalary { get; set; }
    public DateTime JoinedDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Timesheet
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public decimal HoursWorked { get; set; }
    public string? Note { get; set; }
}

public class Payroll
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal Bonus { get; set; }
    public decimal Penalty { get; set; }
    public decimal NetSalary { get; set; }
    public DateTime ProcessedDate { get; set; }
    public bool IsPaid { get; set; }
}
