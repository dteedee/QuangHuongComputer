using BuildingBlocks.SharedKernel;

namespace HR.Domain;

public enum EmployeeStatus
{
    Active,
    Inactive,
    OnLeave,
    OnProbation,
    Resigned,
    Terminated
}

public class Employee : Entity<Guid>
{
    public string FullName { get; private set; }
    public string Email { get; private set; }
    public string Phone { get; private set; }
    public string Department { get; private set; }
    public string Position { get; private set; }
    public DateTime HireDate { get; private set; }
    public decimal BaseSalary { get; private set; }
    public EmployeeStatus Status { get; private set; }

    // Additional properties
    public string? EmployeeCode { get; private set; }
    public string? IdCardNumber { get; private set; }
    public string? Address { get; private set; }
    public DateTime? TerminationDate { get; private set; }
    public string? TerminationReason { get; private set; }
    
    // Phase 1: Enhanced fields
    public DateTime? ProbationEndDate { get; private set; }
    public string? BankAccount { get; private set; }
    public string? BankName { get; private set; }
    public string? EmergencyContact { get; private set; }
    public string? EmergencyPhone { get; private set; }
    public string? AvatarUrl { get; private set; }
    public string? Skills { get; private set; } // JSON array
    public string? Certifications { get; private set; } // JSON array
    public decimal? HourlyRate { get; private set; }
    public Guid? ReportingToId { get; private set; }
    public string? UserId { get; private set; } // Link to Identity user
    public DateOnly? DateOfBirth { get; private set; }
    public string? Gender { get; private set; }
    public string? TaxCode { get; private set; }
    public string? SocialInsuranceNumber { get; private set; }
    public string? WorkLocation { get; private set; }

    public Employee(
        string fullName,
        string email,
        string phone,
        string department,
        string position,
        DateTime hireDate,
        decimal baseSalary,
        string? employeeCode = null,
        string? idCardNumber = null,
        string? address = null,
        decimal? hourlyRate = null,
        Guid? reportingToId = null,
        string? userId = null,
        DateOnly? dateOfBirth = null,
        string? gender = null)
    {
        Id = Guid.NewGuid();
        FullName = fullName;
        Email = email;
        Phone = phone;
        Department = department;
        Position = position;
        HireDate = hireDate;
        BaseSalary = baseSalary;
        EmployeeCode = employeeCode;
        IdCardNumber = idCardNumber;
        Address = address;
        HourlyRate = hourlyRate;
        ReportingToId = reportingToId;
        UserId = userId;
        DateOfBirth = dateOfBirth;
        Gender = gender;
        Status = EmployeeStatus.Active;

        Validate();
        RaiseDomainEvent(new EmployeeCreatedEvent(Id, fullName, email, department, position));
    }

    // EF Core constructor
    protected Employee()
    {
        FullName = string.Empty;
        Email = string.Empty;
        Phone = string.Empty;
        Department = string.Empty;
        Position = string.Empty;
    }

    public void UpdateDetails(
        string fullName,
        string email,
        string phone,
        string department,
        string position,
        string? idCardNumber = null,
        string? address = null)
    {
        var oldDepartment = Department;
        var oldPosition = Position;

        FullName = fullName;
        Email = email;
        Phone = phone;
        Department = department;
        Position = position;
        IdCardNumber = idCardNumber;
        Address = address;

        Validate();

        if (oldDepartment != department || oldPosition != position)
        {
            RaiseDomainEvent(new EmployeePositionChangedEvent(Id, fullName, oldDepartment, oldPosition, department, position));
        }

        RaiseDomainEvent(new EmployeeDetailsUpdatedEvent(Id, fullName, email, phone));
    }

    public void UpdateSalary(decimal newBaseSalary, decimal? newHourlyRate = null)
    {
        if (newBaseSalary <= 0)
            throw new ArgumentException("Salary must be greater than zero.", nameof(newBaseSalary));

        var oldSalary = BaseSalary;
        BaseSalary = newBaseSalary;
        HourlyRate = newHourlyRate;

        RaiseDomainEvent(new EmployeeSalaryChangedEvent(Id, FullName, oldSalary, newBaseSalary));
    }

    public void Deactivate()
    {
        if (Status == EmployeeStatus.Inactive)
            return;

        Status = EmployeeStatus.Inactive;
        RaiseDomainEvent(new EmployeeStatusChangedEvent(Id, FullName, EmployeeStatus.Active, EmployeeStatus.Inactive));
    }

    public void Activate()
    {
        if (Status == EmployeeStatus.Active)
            return;

        Status = EmployeeStatus.Active;
        RaiseDomainEvent(new EmployeeStatusChangedEvent(Id, FullName, EmployeeStatus.Inactive, EmployeeStatus.Active));
    }

    public void SetOnLeave()
    {
        if (Status == EmployeeStatus.Terminated)
            throw new InvalidOperationException("Cannot set terminated employee on leave.");

        var oldStatus = Status;
        Status = EmployeeStatus.OnLeave;
        RaiseDomainEvent(new EmployeeStatusChangedEvent(Id, FullName, oldStatus, EmployeeStatus.OnLeave));
    }

    public void Terminate(string reason)
    {
        if (Status == EmployeeStatus.Terminated)
            throw new InvalidOperationException("Employee is already terminated.");

        Status = EmployeeStatus.Terminated;
        TerminationDate = DateTime.UtcNow;
        TerminationReason = reason;

        RaiseDomainEvent(new EmployeeTerminatedEvent(Id, FullName, reason, TerminationDate.Value));
    }
    
    public void SetProbation(DateOnly endDate)
    {
        Status = EmployeeStatus.OnProbation;
        ProbationEndDate = endDate.ToDateTime(TimeOnly.MinValue);
    }
    
    public void CompleteProbation()
    {
        if (Status != EmployeeStatus.OnProbation)
            throw new InvalidOperationException("Employee is not on probation.");
            
        Status = EmployeeStatus.Active;
        ProbationEndDate = null;
    }
    
    public void UpdateBankInfo(string bankAccount, string bankName)
    {
        BankAccount = bankAccount;
        BankName = bankName;
    }
    
    public void UpdateEmergencyContact(string contactName, string phoneNumber)
    {
        EmergencyContact = contactName;
        EmergencyPhone = phoneNumber;
    }
    
    public void SetReportingManager(Guid? managerId)
    {
        ReportingToId = managerId;
    }
    
    public void UpdateSkills(string skills)
    {
        Skills = skills;
    }
    
    public void UpdateCertifications(string certifications)
    {
        Certifications = certifications;
    }

    public void Validate()
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(FullName))
            errors.Add("Full name is required.");

        if (string.IsNullOrWhiteSpace(Email))
            errors.Add("Email is required.");
        else if (!Email.Contains('@'))
            errors.Add("Invalid email format.");

        if (string.IsNullOrWhiteSpace(Phone))
            errors.Add("Phone number is required.");

        if (string.IsNullOrWhiteSpace(Department))
            errors.Add("Department is required.");

        if (string.IsNullOrWhiteSpace(Position))
            errors.Add("Position is required.");

        if (BaseSalary <= 0)
            errors.Add("Salary must be greater than zero.");

        if (HireDate > DateTime.UtcNow)
            errors.Add("Hire date cannot be in the future.");

        if (errors.Any())
            throw new ArgumentException($"Employee validation failed: {string.Join(", ", errors)}");
    }
}

// Domain Events
public record EmployeeCreatedEvent(Guid EmployeeId, string FullName, string Email, string Department, string Position) : DomainEvent;

public record EmployeeDetailsUpdatedEvent(Guid EmployeeId, string FullName, string Email, string Phone) : DomainEvent;

public record EmployeePositionChangedEvent(
    Guid EmployeeId,
    string FullName,
    string OldDepartment,
    string OldPosition,
    string NewDepartment,
    string NewPosition) : DomainEvent;

public record EmployeeSalaryChangedEvent(Guid EmployeeId, string FullName, decimal OldSalary, decimal NewSalary) : DomainEvent;

public record EmployeeStatusChangedEvent(Guid EmployeeId, string FullName, EmployeeStatus OldStatus, EmployeeStatus NewStatus) : DomainEvent;

public record EmployeeTerminatedEvent(Guid EmployeeId, string FullName, string Reason, DateTime TerminationDate) : DomainEvent;
