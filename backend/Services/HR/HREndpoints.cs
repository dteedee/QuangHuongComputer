using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;

namespace HR;

public static class HREndpoints
{
    public static void MapHREndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Accountant"));

        // Employee Management
        group.MapGet("/employees", async (HRDbContext db) =>
        {
            return await db.Employees.ToListAsync();
        });

        group.MapGet("/employees/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            return employee != null ? Results.Ok(employee) : Results.NotFound();
        });

        group.MapPost("/employees", async (Employee employee, HRDbContext db) =>
        {
            employee.Id = Guid.NewGuid();
            employee.JoinedDate = DateTime.UtcNow;
            db.Employees.Add(employee);
            await db.SaveChangesAsync();
            return Results.Created($"/api/hr/employees/{employee.Id}", employee);
        });

        group.MapPut("/employees/{id:guid}", async (Guid id, Employee updatedEmployee, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound();

            employee.FullName = updatedEmployee.FullName;
            employee.Email = updatedEmployee.Email;
            employee.PhoneNumber = updatedEmployee.PhoneNumber;
            employee.Address = updatedEmployee.Address;
            employee.Role = updatedEmployee.Role;
            employee.BaseSalary = updatedEmployee.BaseSalary;
            employee.IsActive = updatedEmployee.IsActive;

            await db.SaveChangesAsync();
            return Results.Ok(employee);
        });

        group.MapDelete("/employees/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound();

            employee.IsActive = false; // Soft delete
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Employee deactivated" });
        });

        // Timesheet
        group.MapPost("/timesheets", async (Timesheet ts, HRDbContext db) =>
        {
            ts.Id = Guid.NewGuid();
            db.Timesheets.Add(ts);
            await db.SaveChangesAsync();
            return Results.Ok(ts);
        });

        group.MapGet("/employees/{id:guid}/timesheets", async (Guid id, int month, int year, HRDbContext db) =>
        {
            return await db.Timesheets
                .Where(t => t.EmployeeId == id && t.Date.Month == month && t.Date.Year == year)
                .ToListAsync();
        });

        // Payroll
        group.MapGet("/payroll", async (int month, int year, HRDbContext db) =>
        {
            return await db.Payrolls.Where(p => p.Month == month && p.Year == year).ToListAsync();
        });
        
        group.MapPost("/payroll/generate", async (int month, int year, HRDbContext db) => {
            var employees = await db.Employees.Where(e => e.IsActive).ToListAsync();
            var existingPayrolls = await db.Payrolls.Where(p => p.Month == month && p.Year == year).ToListAsync();
            
            foreach (var emp in employees)
            {
                if (existingPayrolls.Any(p => p.EmployeeId == emp.Id)) continue;

                var payroll = new Payroll
                {
                    Id = Guid.NewGuid(),
                    EmployeeId = emp.Id,
                    Month = month,
                    Year = year,
                    BaseSalary = emp.BaseSalary,
                    Bonus = 0,
                    Penalty = 0,
                    NetSalary = emp.BaseSalary,
                    ProcessedDate = DateTime.UtcNow,
                    IsPaid = false
                };
                db.Payrolls.Add(payroll);
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { Message = $"Payroll for {month}/{year} generated for {employees.Count} employees" });
        });

        group.MapPut("/payroll/{id:guid}/pay", async (Guid id, HRDbContext db) =>
        {
            var payroll = await db.Payrolls.FindAsync(id);
            if (payroll == null) return Results.NotFound();

            payroll.IsPaid = true;
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Payroll marked as paid" });
        });
    }
}
