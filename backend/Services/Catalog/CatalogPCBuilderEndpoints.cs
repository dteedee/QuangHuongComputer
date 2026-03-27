using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using System.Security.Claims;
using System.Text.Json;

namespace Catalog;

public static class CatalogPCBuilderEndpoints
{
    public static void MapCatalogPCBuilderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/pc-builder");

        group.MapPost("/check-compatibility", async (CheckPcCompatibilityRequest request, CatalogDbContext db) =>
        {
            var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            var components = request.Items.Select(item => 
            {
                var product = products.FirstOrDefault(p => p.Id == item.ProductId);
                if (product == null) return null;

                // We try to infer type from category if not explicitly provided
                var type = item.ComponentType;
                if (string.IsNullOrEmpty(type) && product.Category != null)
                {
                    var catName = product.Category.Name.ToLower();
                    if (catName.Contains("cpu") || catName.Contains("vi xử lý") || catName.Contains("intel") || catName.Contains("amd")) type = "CPU";
                    else if (catName.Contains("main") || catName.Contains("bo mạch")) type = "Motherboard";
                    else if (catName.Contains("ram") || catName.Contains("bộ nhớ")) type = "RAM";
                    else if (catName.Contains("vga") || catName.Contains("card màn hình") || catName.Contains("gpu")) type = "GPU";
                    else if (catName.Contains("psu") || catName.Contains("nguồn")) type = "PSU";
                    else if (catName.Contains("case") || catName.Contains("vỏ")) type = "Case";
                    else if (catName.Contains("ssd") || catName.Contains("hdd") || catName.Contains("ổ cứng")) type = "Storage";
                    else if (catName.Contains("tản nhiệt") || catName.Contains("cooler")) type = "Cooler";
                }

                return new PcComponentData
                {
                    ProductId = product.Id,
                    Type = type ?? "Unknown",
                    Quantity = item.Quantity,
                    Specs = PcComponentData.ParseSpecs(product.Specifications)
                };
            }).Where(c => c != null).ToList();

            var result = PCBuilderEngine.Evaluate(components!);
            return Results.Ok(result);
        });

        group.MapPost("/builds", async (SavePcBuildRequest request, CatalogDbContext db, ClaimsPrincipal user) =>
        {
            Guid? customerId = null;
            if (user.Identity?.IsAuthenticated == true)
            {
                var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
                if (Guid.TryParse(userIdStr, out var uid)) customerId = uid;
            }

            var build = new SavedPcBuild(customerId, request.Name);

            var productIds = request.Items.Select(i => i.ProductId).ToList();
            var products = await db.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            foreach (var item in request.Items)
            {
                if (products.TryGetValue(item.ProductId, out var product))
                {
                    build.AddItem(item.ProductId, item.ComponentType ?? "Unknown", item.Quantity, product.Price);
                }
            }

            var components = build.Items.Select(item => new PcComponentData
            {
                ProductId = item.ProductId,
                Type = item.ComponentType,
                Quantity = item.Quantity,
                Specs = PcComponentData.ParseSpecs(products[item.ProductId].Specifications)
            }).ToList();

            var evaluation = PCBuilderEngine.Evaluate(components);
            var strIssues = evaluation.Issues.Any() ? JsonSerializer.Serialize(evaluation.Issues) : null;
            
            build.UpdateCompatibility(evaluation.IsCompatible, strIssues, evaluation.EstimatedWattage);

            db.SavedPcBuilds.Add(build);
            await db.SaveChangesAsync();

            return Results.Created($"/api/catalog/pc-builder/builds/{build.BuildCode}", new {
                Id = build.Id,
                BuildCode = build.BuildCode,
                Name = build.Name,
                TotalPrice = build.TotalPrice,
                IsCompatible = build.IsCompatible,
                TotalWattage = build.TotalWattage,
                Issues = evaluation.Issues
            });
        });

        group.MapGet("/builds/{code}", async (string code, CatalogDbContext db) =>
        {
            var build = await db.SavedPcBuilds
                .Include(b => b.Items)
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.BuildCode == code.ToUpperInvariant());

            if (build == null) return Results.NotFound();

            var productIds = build.Items.Select(i => i.ProductId).ToList();
            var products = await db.Products
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            var result = new
            {
                build.Id,
                build.BuildCode,
                build.Name,
                build.TotalPrice,
                build.TotalWattage,
                build.IsCompatible,
                Issues = string.IsNullOrEmpty(build.CompatibilityIssues) 
                    ? new List<string>() 
                    : JsonSerializer.Deserialize<List<string>>(build.CompatibilityIssues, (JsonSerializerOptions?)null),
                Items = build.Items.Select(i => new
                {
                    i.Id,
                    i.ProductId,
                    i.ComponentType,
                    i.Quantity,
                    i.UnitPrice,
                    LineTotal = i.Quantity * i.UnitPrice,
                    Product = products.TryGetValue(i.ProductId, out var p) ? new
                    {
                        p.Name,
                        p.ImageUrl,
                        p.Sku,
                        Specs = PcComponentData.ParseSpecs(p.Specifications)
                    } : null
                })
            };

            return Results.Ok(result);
        });

        group.MapGet("/builds/my", async (CatalogDbContext db, ClaimsPrincipal user) =>
        {
            if (user.Identity?.IsAuthenticated != true) return Results.Unauthorized();

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var customerId)) return Results.Unauthorized();

            // Support both direct matching and string equivalent matching for customerId since User might store it as string originally 
            var builds = await db.SavedPcBuilds
                .Where(b => b.CustomerId == customerId)
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => new
                {
                    b.Id,
                    b.BuildCode,
                    b.Name,
                    b.TotalPrice,
                    b.IsCompatible,
                    b.TotalWattage,
                    b.CreatedAt,
                    ItemCount = b.Items.Count
                })
                .ToListAsync();

            return Results.Ok(builds);
        });
    }
}

public record CheckPcCompatibilityRequest(List<PcBuildItemRequest> Items);
public record SavePcBuildRequest(string Name, List<PcBuildItemRequest> Items);
public record PcBuildItemRequest(Guid ProductId, int Quantity, string? ComponentType);
