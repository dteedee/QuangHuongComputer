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

        group.MapGet("/employees", async (HRDbContext db) =>
        {
            return await db.Employees.ToListAsync();
        });

        group.MapPost("/employees", async (Employee employee, HRDbContext db) =>
        {
            db.Employees.Add(employee);
            await db.SaveChangesAsync();
            return Results.Created($"/api/hr/employees/{employee.Id}", employee);
        });

        group.MapGet("/payroll", async (int month, int year, HRDbContext db) =>
        {
            return await db.Payrolls.Where(p => p.Month == month && p.Year == year).ToListAsync();
        });
        
        group.MapPost("/payroll/generate", async (int month, int year, HRDbContext db) => {
            // Placeholder: Logic to generate payroll based on base salary and timesheets
            return Results.Ok(new { Message = $"Payroll for {month}/{year} generated" });
        });
    }
}
