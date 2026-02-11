using System;
using System.Collections.Generic;

namespace HR.Domain;

public class JobListing
{
    public Guid Id { get; private set; }
    public string Title { get; private set; }
    public string Description { get; private set; }
    public string Requirements { get; private set; }
    public string Benefits { get; private set; }
    public string Department { get; private set; }
    public string Location { get; private set; }
    public string JobType { get; private set; } // Full-time, Part-time, Contract
    public decimal? SalaryRangeMin { get; private set; }
    public decimal? SalaryRangeMax { get; private set; }
    public DateTime ExpiryDate { get; private set; }
    public JobStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private JobListing() { }

    public JobListing(
        string title, 
        string description, 
        string requirements, 
        string benefits, 
        string department, 
        string location, 
        string jobType, 
        DateTime expiryDate,
        decimal? salaryRangeMin = null,
        decimal? salaryRangeMax = null,
        Guid? id = null)
    {
        Id = id ?? Guid.NewGuid();
        Title = title;
        Description = description;
        Requirements = requirements;
        Benefits = benefits;
        Department = department;
        Location = location;
        JobType = jobType;
        ExpiryDate = expiryDate;
        SalaryRangeMin = salaryRangeMin;
        SalaryRangeMax = salaryRangeMax;
        Status = JobStatus.Active;
        CreatedAt = DateTime.UtcNow;
    }

    public void Update(
        string title, 
        string description, 
        string requirements, 
        string benefits, 
        string department, 
        string location, 
        string jobType, 
        DateTime expiryDate,
        decimal? salaryRangeMin,
        decimal? salaryRangeMax,
        JobStatus status)
    {
        Title = title;
        Description = description;
        Requirements = requirements;
        Benefits = benefits;
        Department = department;
        Location = location;
        JobType = jobType;
        ExpiryDate = expiryDate;
        SalaryRangeMin = salaryRangeMin;
        SalaryRangeMax = salaryRangeMax;
        Status = status;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Close()
    {
        Status = JobStatus.Closed;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum JobStatus
{
    Draft,
    Active,
    Closed,
    Archived
}
