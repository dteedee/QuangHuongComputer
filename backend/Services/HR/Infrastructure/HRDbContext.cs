using Microsoft.EntityFrameworkCore;
using HR.Domain;

namespace HR.Infrastructure;

public class HRDbContext : DbContext
{
    public HRDbContext(DbContextOptions<HRDbContext> options) : base(options) { }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Timesheet> Timesheets => Set<Timesheet>();
    public DbSet<Payroll> Payrolls => Set<Payroll>();
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<ShiftAssignment> ShiftAssignments => Set<ShiftAssignment>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("hr");
        base.OnModelCreating(modelBuilder);
        
        // Employee configuration
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BaseSalary).HasPrecision(18, 2);
            entity.Property(e => e.HourlyRate).HasPrecision(18, 2);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Phone).IsRequired().HasMaxLength(20);
            entity.Property(e => e.EmployeeCode).HasMaxLength(50);
            entity.Property(e => e.IdCardNumber).HasMaxLength(50);
            entity.Property(e => e.TaxCode).HasMaxLength(50);
            entity.Property(e => e.SocialInsuranceNumber).HasMaxLength(50);
            
            entity.HasIndex(e => e.EmployeeCode).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => new { e.Department, e.Status })
                .HasDatabaseName("IX_Employee_Department_Status");
            entity.HasIndex(e => new { e.Status, e.HireDate });
        });
        
        // Shift configuration
        modelBuilder.Entity<Shift>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => new { e.IsActive, e.DisplayOrder });
        });
        
        // ShiftAssignment configuration
        modelBuilder.Entity<ShiftAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActualHoursWorked).HasPrecision(8, 2);
            
            entity.HasIndex(e => new { e.EmployeeId, e.Date })
                .HasDatabaseName("IX_ShiftAssignment_Employee_Date");
                
            entity.HasIndex(e => new { e.ShiftId, e.Date });
            entity.HasIndex(e => new { e.Date, e.Status });
        });
        
        // LeaveRequest configuration
        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Days).HasPrecision(8, 2);
            
            entity.HasIndex(e => new { e.EmployeeId, e.StartDate });
            entity.HasIndex(e => new { e.Status, e.StartDate });
            entity.HasIndex(e => new { e.StartDate, e.EndDate });
        });
    }
}
