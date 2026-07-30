using System.Globalization;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.Specifications;

/// <summary>
/// Dựng IQueryable&lt;Product&gt; từ dictionary filter đến từ query string.
///
/// Cú pháp value:
/// - "16-32"     → Between (Number, min-max)
/// - "i5,i7"     → In (Text/Enum, danh sách)
/// - "true"      → Eq (Boolean)
/// - đơn lẻ      → Eq (Text/Number/Enum)
///
/// Key = SpecificationAttribute.Key (vd "ram_gb", "cpu_model"). Attribute không tồn tại → bỏ qua.
/// </summary>
public static class SpecificationFilterBuilder
{
    /// <summary>
    /// Áp filter theo thông số. Với mỗi filter khớp attribute, sinh subquery EXISTS
    /// (ProductSpecificationValues). Attribute không có trong DB → bỏ qua im lặng.
    /// </summary>
    public static IQueryable<Product> ApplyFilters(
        IQueryable<Product> products,
        CatalogDbContext db,
        IReadOnlyDictionary<string, string> filters)
    {
        if (filters == null || filters.Count == 0) return products;

        // Lấy trước danh sách attribute cần dùng (1 truy vấn) để biết DataType.
        // Key CÓ THỂ trùng qua nhiều group (vd "ram_gb" ở laptop lẫn PC) — gộp thành list attributeId per key.
        var keys = filters.Keys.Select(k => k.ToLowerInvariant()).Distinct().ToList();
        var rawAttrs = db.SpecificationAttributes
            .Where(a => keys.Contains(a.Key))
            .Select(a => new { a.Id, a.Key, a.DataType })
            .ToList();
        var byKey = rawAttrs
            .GroupBy(a => a.Key)
            .ToDictionary(g => g.Key, g => (Ids: g.Select(x => x.Id).ToList(), DataType: g.First().DataType));

        foreach (var (rawKey, rawValue) in filters)
        {
            var key = rawKey.ToLowerInvariant();
            if (!byKey.TryGetValue(key, out var entry)) continue;
            if (string.IsNullOrWhiteSpace(rawValue)) continue;

            var op = ParseOperator(rawValue);
            products = entry.DataType switch
            {
                SpecDataType.Number => ApplyNumberFilter(products, db, entry.Ids, rawValue, op),
                SpecDataType.Boolean => ApplyBoolFilter(products, db, entry.Ids, rawValue),
                SpecDataType.Enum => ApplyEnumFilter(products, db, entry.Ids, rawValue, op),
                _ => ApplyTextFilter(products, db, entry.Ids, rawValue, op),
            };
        }

        return products;
    }

    public static FilterOperator ParseOperator(string value)
    {
        if (string.IsNullOrEmpty(value)) return FilterOperator.Eq;
        // "16-32" → Between (yêu cầu 2 phần, đều là số)
        if (value.Contains('-'))
        {
            var parts = value.Split('-', 2);
            if (parts.Length == 2 &&
                decimal.TryParse(parts[0], NumberStyles.Number, CultureInfo.InvariantCulture, out _) &&
                decimal.TryParse(parts[1], NumberStyles.Number, CultureInfo.InvariantCulture, out _))
                return FilterOperator.Between;
        }
        if (value.Contains(',')) return FilterOperator.In;
        return FilterOperator.Eq;
    }

    private static IQueryable<Product> ApplyNumberFilter(
        IQueryable<Product> products, CatalogDbContext db, List<Guid> attributeIds, string value, FilterOperator op)
    {
        if (op == FilterOperator.Between)
        {
            var parts = value.Split('-', 2);
            var min = decimal.Parse(parts[0], CultureInfo.InvariantCulture);
            var max = decimal.Parse(parts[1], CultureInfo.InvariantCulture);
            return products.Where(p => db.ProductSpecificationValues
                .Any(v => v.ProductId == p.Id && attributeIds.Contains(v.AttributeId)
                          && v.ValueNumber != null && v.ValueNumber >= min && v.ValueNumber <= max));
        }
        if (op == FilterOperator.In)
        {
            var list = value.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) ? (decimal?)n : null)
                .Where(n => n.HasValue).Select(n => n!.Value).ToList();
            return products.Where(p => db.ProductSpecificationValues
                .Any(v => v.ProductId == p.Id && attributeIds.Contains(v.AttributeId)
                          && v.ValueNumber != null && list.Contains(v.ValueNumber.Value)));
        }
        if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var single))
            return products;
        return products.Where(p => db.ProductSpecificationValues
            .Any(v => v.ProductId == p.Id && attributeIds.Contains(v.AttributeId) && v.ValueNumber == single));
    }

    private static IQueryable<Product> ApplyTextFilter(
        IQueryable<Product> products, CatalogDbContext db, List<Guid> attributeIds, string value, FilterOperator op)
    {
        if (op == FilterOperator.In)
        {
            var list = value.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
            return products.Where(p => db.ProductSpecificationValues
                .Any(v => v.ProductId == p.Id && attributeIds.Contains(v.AttributeId)
                          && v.ValueText != null && list.Contains(v.ValueText)));
        }
        return products.Where(p => db.ProductSpecificationValues
            .Any(v => v.ProductId == p.Id && attributeIds.Contains(v.AttributeId) && v.ValueText == value));
    }

    private static IQueryable<Product> ApplyEnumFilter(
        IQueryable<Product> products, CatalogDbContext db, List<Guid> attributeIds, string value, FilterOperator op)
    {
        if (op == FilterOperator.In)
        {
            var list = value.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => s.Trim()).ToList();
            return products.Where(p => db.ProductSpecificationValues
                .Any(v => v.ProductId == p.Id && attributeIds.Contains(v.AttributeId)
                          && v.ValueEnum != null && list.Contains(v.ValueEnum)));
        }
        return products.Where(p => db.ProductSpecificationValues
            .Any(v => v.ProductId == p.Id && attributeIds.Contains(v.AttributeId) && v.ValueEnum == value));
    }

    private static IQueryable<Product> ApplyBoolFilter(
        IQueryable<Product> products, CatalogDbContext db, List<Guid> attributeIds, string value)
    {
        if (!bool.TryParse(value, out var b)) return products;
        return products.Where(p => db.ProductSpecificationValues
            .Any(v => v.ProductId == p.Id && attributeIds.Contains(v.AttributeId) && v.ValueBool == b));
    }
}

public enum FilterOperator
{
    Eq,
    In,
    Between,
}
