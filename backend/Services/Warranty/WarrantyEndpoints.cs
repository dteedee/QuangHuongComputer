using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

public static class WarrantyEndpoints
{
    public static void MapWarrantyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warranty").RequireAuthorization();

        // Submit a claim
        group.MapPost("/claims", async ([FromBody] CreateClaimDto model, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            // Minimal validation - ensure logic exists
            var claim = new WarrantyClaim(userId, model.SerialNumber, model.IssueDescription);
            db.Claims.Add(claim);
            await db.SaveChangesAsync();
            return Results.Ok(claim);
        });

        // My Claims
        group.MapGet("/claims", async (WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Results.Unauthorized();

            var claims = await db.Claims.Where(c => c.CustomerId == userId).ToListAsync();
            return Results.Ok(claims);
        });

        // Register warranty for product
        group.MapPost("/register", async ([FromBody] RegisterWarrantyDto model, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var warranty = new ProductWarranty(model.ProductId, model.SerialNumber, userId, model.PurchaseDate, model.WarrantyPeriodMonths);
            db.ProductWarranties.Add(warranty);
            await db.SaveChangesAsync();
            return Results.Ok(warranty);
        });

        // Check Coverage
        group.MapGet("/lookup/{serialNumber}", async (string serialNumber, WarrantyDbContext db) =>
        {
            var warranty = await db.ProductWarranties.FirstOrDefaultAsync(w => w.SerialNumber == serialNumber);
            if (warranty == null)
                return Results.NotFound(new { Message = "Serial number not found" });

            return Results.Ok(new
            {
                warranty.SerialNumber,
                warranty.ProductId,
                Status = warranty.IsValid() ? "Active" : "Expired",
                warranty.ExpirationDate,
                IsValid = warranty.IsValid()
            });
        });

        // Admin: All warranties
        group.MapGet("/admin/warranties", async (WarrantyDbContext db) =>
        {
            var warranties = await db.ProductWarranties.OrderByDescending(w => w.PurchaseDate).ToListAsync();
            return Results.Ok(warranties);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }
}

public record CreateClaimDto(string SerialNumber, string IssueDescription);
public record RegisterWarrantyDto(Guid ProductId, string SerialNumber, DateTime PurchaseDate, int WarrantyPeriodMonths);
