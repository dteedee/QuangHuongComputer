using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales;

public static class AddressBookEndpoints
{
    private const int MaxAddressesPerUser = 10;

    public static void MapAddressBookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sales/addresses").RequireAuthorization();

        // GET /api/sales/addresses
        group.MapGet("/", async (ClaimsPrincipal user, SalesDbContext db) =>
        {
            var userId = GetUserId(user);
            if (userId == null) return Results.Unauthorized();

            var addresses = await db.CustomerAddresses
                .AsNoTracking()
                .Where(a => a.UserId == userId.Value && a.IsActive)
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Results.Ok(addresses);
        });

        // POST /api/sales/addresses
        group.MapPost("/", async (ClaimsPrincipal user, [FromBody] SaveAddressRequest request, SalesDbContext db) =>
        {
            var userId = GetUserId(user);
            if (userId == null) return Results.Unauthorized();

            var count = await db.CustomerAddresses
                .CountAsync(a => a.UserId == userId.Value && a.IsActive);

            if (count >= MaxAddressesPerUser)
                return Results.BadRequest(new { error = $"Maximum {MaxAddressesPerUser} addresses allowed" });

            // If first address or requested default, clear existing defaults
            if (request.IsDefault || count == 0)
                await ClearDefaults(db, userId.Value);

            var address = new CustomerAddress
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                Label = request.Label ?? "Nhà",
                FullName = request.FullName,
                Phone = request.Phone,
                Province = request.Province,
                District = request.District,
                Ward = request.Ward,
                StreetAddress = request.StreetAddress,
                IsDefault = request.IsDefault || count == 0,
                CreatedAt = DateTime.UtcNow
            };

            db.CustomerAddresses.Add(address);
            await db.SaveChangesAsync();
            return Results.Created($"/api/sales/addresses/{address.Id}", address);
        });

        // PUT /api/sales/addresses/{id}
        group.MapPut("/{id:guid}", async (Guid id, ClaimsPrincipal user, [FromBody] SaveAddressRequest request, SalesDbContext db) =>
        {
            var userId = GetUserId(user);
            if (userId == null) return Results.Unauthorized();

            var address = await db.CustomerAddresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId.Value && a.IsActive);

            if (address == null) return Results.NotFound();

            if (request.IsDefault)
                await ClearDefaults(db, userId.Value);

            address.Label = request.Label ?? address.Label;
            address.FullName = request.FullName;
            address.Phone = request.Phone;
            address.Province = request.Province;
            address.District = request.District;
            address.Ward = request.Ward;
            address.StreetAddress = request.StreetAddress;
            address.IsDefault = request.IsDefault;
            address.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(address);
        });

        // DELETE /api/sales/addresses/{id}
        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal user, SalesDbContext db) =>
        {
            var userId = GetUserId(user);
            if (userId == null) return Results.Unauthorized();

            var address = await db.CustomerAddresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId.Value && a.IsActive);

            if (address == null) return Results.NotFound();

            address.IsActive = false;
            address.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // POST /api/sales/addresses/{id}/set-default
        group.MapPost("/{id:guid}/set-default", async (Guid id, ClaimsPrincipal user, SalesDbContext db) =>
        {
            var userId = GetUserId(user);
            if (userId == null) return Results.Unauthorized();

            var address = await db.CustomerAddresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId.Value && a.IsActive);

            if (address == null) return Results.NotFound();

            await ClearDefaults(db, userId.Value);
            address.IsDefault = true;
            address.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true });
        });
    }

    private static Guid? GetUserId(ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true) return null;
        var str = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(str, out var id) ? id : null;
    }

    private static async Task ClearDefaults(SalesDbContext db, Guid userId)
    {
        await db.CustomerAddresses
            .Where(a => a.UserId == userId && a.IsDefault && a.IsActive)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsDefault, false));
    }
}

public record SaveAddressRequest(
    string FullName,
    string Phone,
    string Province,
    string District,
    string Ward,
    string StreetAddress,
    string? Label,
    bool IsDefault
);
