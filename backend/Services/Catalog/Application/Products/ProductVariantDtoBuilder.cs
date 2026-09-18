using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.Products;

/// <summary>Dựng `variants[]` cho DTO chi tiết - biến thể + tổ hợp option của từng biến thể.</summary>
internal static class ProductVariantDtoBuilder
{
    public static async Task<IReadOnlyList<ProductVariantDto>> BuildAsync(CatalogDbContext db, Guid productId, CancellationToken ct)
    {
        var variants = await db.ProductVariants.AsNoTracking()
            .Where(v => v.ProductId == productId)
            .OrderBy(v => v.SortOrder)
            .ToListAsync(ct);
        if (variants.Count == 0) return Array.Empty<ProductVariantDto>();

        var variantIds = variants.Select(v => v.Id).ToList();
        var options = await db.ProductVariantOptions.AsNoTracking()
            .Where(o => variantIds.Contains(o.VariantId))
            .Include(o => o.OptionType)
            .Include(o => o.OptionValue)
            .ToListAsync(ct);
        var optionsByVariant = options.ToLookup(o => o.VariantId);

        return variants
            .Select(v => new ProductVariantDto(
                v.Id, v.Sku, v.Name, v.Price, v.OldPrice, v.CostPrice, v.StockQuantity,
                v.Status, v.IsDefault, v.SortOrder,
                optionsByVariant[v.Id]
                    .Select(o => new VariantOptionDto(
                        o.OptionTypeId, o.OptionType?.DisplayName ?? "", o.OptionValueId,
                        o.OptionValue?.DisplayValue ?? "", o.OptionValue?.ColorHex))
                    .ToList()))
            .ToList();
    }
}
