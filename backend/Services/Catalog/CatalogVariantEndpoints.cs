using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>
/// Endpoint biến thể sản phẩm + loại tuỳ chọn.
/// Sinh ma trận từ tổ hợp OptionType × OptionValue.
/// Ràng buộc: ≤ 3 optionType/product; cảnh báo > 50 biến thể.
/// </summary>
public static class CatalogVariantEndpoints
{
    public const int MaxOptionTypesPerProduct = 3;
    public const int VariantMatrixWarningThreshold = 50;

    public static void MapCatalogVariantEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog");

        // ============ VARIANTS ============
        group.MapGet("/products/{id:guid}/variants", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var variants = await db.ProductVariants.AsNoTracking()
                .Where(v => v.ProductId == id)
                .OrderBy(v => v.SortOrder)
                .Select(v => new
                {
                    id = v.Id,
                    sku = v.Sku,
                    name = v.Name,
                    price = v.Price,
                    oldPrice = v.OldPrice,
                    costPrice = v.CostPrice,
                    stockQuantity = v.StockQuantity,
                    barcode = v.Barcode,
                    isDefault = v.IsDefault,
                    status = v.Status,
                    sortOrder = v.SortOrder,
                    options = db.ProductVariantOptions
                        .Where(o => o.VariantId == v.Id)
                        .Select(o => new { o.OptionTypeId, o.OptionValueId }).ToList()
                })
                .ToListAsync(ct);
            return Results.Ok(variants);
        });

        // Sinh ma trận biến thể từ tổ hợp option
        group.MapPost("/products/{id:guid}/variants", async (
            Guid id, GenerateVariantsRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (product == null) return Results.NotFound();
            if (req.OptionTypeIds == null || req.OptionTypeIds.Count == 0)
                return Results.BadRequest(new { error = "Cần ít nhất 1 optionType" });
            if (req.OptionTypeIds.Count > MaxOptionTypesPerProduct)
                return Results.BadRequest(new { error = $"Tối đa {MaxOptionTypesPerProduct} optionType/sản phẩm" });

            // Lấy danh sách value được chọn cho từng type
            var valuesByType = req.Values
                .GroupBy(v => v.TypeId)
                .ToDictionary(g => g.Key, g => g.SelectMany(x => x.ValueIds).Distinct().ToList());

            // Kiểm tra tất cả optionType đều có value
            foreach (var typeId in req.OptionTypeIds)
                if (!valuesByType.ContainsKey(typeId) || valuesByType[typeId].Count == 0)
                    return Results.BadRequest(new { error = $"OptionType {typeId} không có giá trị nào" });

            // Sinh tích Descartes
            var combinations = CartesianProduct(req.OptionTypeIds.Select(t => valuesByType[t]).ToList());
            if (combinations.Count > VariantMatrixWarningThreshold)
                return Results.BadRequest(new
                {
                    error = $"Ma trận biến thể ({combinations.Count}) vượt ngưỡng cảnh báo ({VariantMatrixWarningThreshold}). Giảm số option/value.",
                    combinationCount = combinations.Count,
                });

            // Load OptionValue để đặt tên biến thể
            var allValueIds = combinations.SelectMany(c => c).Distinct().ToList();
            var valueLookup = await db.ProductOptionValues.AsNoTracking()
                .Where(v => allValueIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id, v => v.DisplayValue, ct);

            var createdIds = new List<Guid>();
            foreach (var combo in combinations)
            {
                var variantName = string.Join(" / ", combo.Select(vid => valueLookup.GetValueOrDefault(vid, "?")));
                var sku = $"{product.Sku}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
                var variant = new ProductVariant(id, sku, variantName, product.Price, product.CostPrice, 0);
                for (int i = 0; i < req.OptionTypeIds.Count; i++)
                    variant.AddOption(req.OptionTypeIds[i], combo[i]);
                db.ProductVariants.Add(variant);
                createdIds.Add(variant.Id);
            }
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { createdCount = createdIds.Count, variantIds = createdIds });
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // Tạo 1 biến thể tay
        group.MapPost("/products/{id:guid}/variants/single", async (
            Guid id, CreateVariantRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (product == null) return Results.NotFound();
            try
            {
                var variant = new ProductVariant(id, req.Sku, req.Name, req.Price, req.CostPrice,
                    req.StockQuantity, req.OldPrice, req.Barcode, req.IsDefault, req.SortOrder);
                if (req.Options != null)
                    foreach (var o in req.Options) variant.AddOption(o.OptionTypeId, o.OptionValueId);
                db.ProductVariants.Add(variant);
                await db.SaveChangesAsync(ct);
                return Results.Ok(new { id = variant.Id });
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // Sửa biến thể
        group.MapPut("/products/{id:guid}/variants/{vid:guid}", async (
            Guid id, Guid vid, UpdateVariantRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var variant = await db.ProductVariants.FirstOrDefaultAsync(v => v.Id == vid && v.ProductId == id, ct);
            if (variant == null) return Results.NotFound();
            try
            {
                variant.UpdateDetails(req.Name, req.Price, req.CostPrice, req.OldPrice, req.Barcode);
                if (req.StockQuantity.HasValue) variant.UpdateStock(req.StockQuantity.Value);
                if (req.IsDefault.HasValue) variant.SetDefault(req.IsDefault.Value);
                if (req.SortOrder.HasValue) variant.SetSortOrder(req.SortOrder.Value);
                await db.SaveChangesAsync(ct);
                return Results.NoContent();
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // Soft delete: chuyển sang Discontinued
        group.MapDelete("/products/{id:guid}/variants/{vid:guid}", async (
            Guid id, Guid vid, CatalogDbContext db, CancellationToken ct) =>
        {
            var variant = await db.ProductVariants.FirstOrDefaultAsync(v => v.Id == vid && v.ProductId == id, ct);
            if (variant == null) return Results.NotFound();
            variant.SetStatus(VariantStatus.Discontinued);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ============ OPTION TYPES ============
        group.MapGet("/option-types", async (CatalogDbContext db, CancellationToken ct) =>
        {
            var types = await db.ProductOptionTypes.AsNoTracking()
                .OrderBy(t => t.SortOrder).ThenBy(t => t.DisplayName)
                .Select(t => new { t.Id, t.Name, t.DisplayName, t.InputType, t.SortOrder })
                .ToListAsync(ct);
            return Results.Ok(types);
        });

        group.MapPost("/option-types", async (
            CreateOptionTypeRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            try
            {
                var type = new ProductOptionType(req.Name, req.DisplayName, req.InputType, req.SortOrder);
                db.ProductOptionTypes.Add(type);
                await db.SaveChangesAsync(ct);
                return Results.Ok(new { id = type.Id });
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        group.MapGet("/option-types/{id:guid}/values", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var values = await db.ProductOptionValues.AsNoTracking()
                .Where(v => v.OptionTypeId == id)
                .OrderBy(v => v.SortOrder).ThenBy(v => v.DisplayValue)
                .Select(v => new { v.Id, v.Value, v.DisplayValue, v.ColorHex, v.SortOrder })
                .ToListAsync(ct);
            return Results.Ok(values);
        });

        group.MapPost("/option-types/{id:guid}/values", async (
            Guid id, CreateOptionValueRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var exists = await db.ProductOptionTypes.AnyAsync(t => t.Id == id, ct);
            if (!exists) return Results.NotFound();
            try
            {
                var value = new ProductOptionValue(id, req.Value, req.DisplayValue, req.ColorHex, req.SortOrder);
                db.ProductOptionValues.Add(value);
                await db.SaveChangesAsync(ct);
                return Results.Ok(new { id = value.Id });
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        }).RequireAuthorization(p => p.RequireRole("Admin"));
    }

    /// <summary>Tích Descartes N chiều: [[1,2],[3,4]] → [[1,3],[1,4],[2,3],[2,4]].</summary>
    private static List<List<Guid>> CartesianProduct(List<List<Guid>> lists)
    {
        var result = new List<List<Guid>> { new List<Guid>() };
        foreach (var list in lists)
        {
            var next = new List<List<Guid>>();
            foreach (var combo in result)
                foreach (var item in list)
                {
                    var copy = new List<Guid>(combo) { item };
                    next.Add(copy);
                }
            result = next;
        }
        return result;
    }

    public record GenerateVariantsRequest(List<Guid> OptionTypeIds, List<OptionSelection> Values);
    public record OptionSelection(Guid TypeId, List<Guid> ValueIds);
    public record CreateVariantRequest(
        string Sku, string Name, decimal Price, decimal CostPrice, int StockQuantity,
        decimal? OldPrice, string? Barcode, bool IsDefault, int SortOrder,
        List<VariantOptionInput>? Options);
    public record VariantOptionInput(Guid OptionTypeId, Guid OptionValueId);
    public record UpdateVariantRequest(
        string Name, decimal Price, decimal CostPrice,
        decimal? OldPrice, string? Barcode, int? StockQuantity, bool? IsDefault, int? SortOrder);
    public record CreateOptionTypeRequest(string Name, string DisplayName, OptionInputType InputType, int SortOrder);
    public record CreateOptionValueRequest(string Value, string DisplayValue, string? ColorHex, int SortOrder);
}
