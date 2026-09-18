using System.Text.Json;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.Products;

/// <summary>
/// Dựng `specGroups` cho DTO chi tiết sản phẩm.
///
/// Nguồn ưu tiên: <c>ProductSpecificationValues</c> có cấu trúc (gắn <c>SpecificationAttribute</c>
/// + <c>SpecificationGroup</c>). Tại thời điểm viết track này, bảng đó có 0 dòng trên DEV (W0-6
/// mới nạp `Products.Specifications` jsonb thô, nạp hàng loạt có cấu trúc bị D10 đẩy sang backlog
/// - xem `spec-keys.md`) - nên khi không có dữ liệu có cấu trúc, hàm này BẮT BUỘC phải đọc
/// `Products.Specifications` (mảng JSON thật, có `sourceUrl`, do importer ghi) thay vì trả mảng
/// rỗng: trả rỗng ở đây sẽ vi phạm D12 quy tắc "never fabricate" theo chiều ngược - GIẤU dữ liệu
/// thật đã có. Khi bulk-ops nạp xong bảng có cấu trúc, nhánh legacy tự nhiên không còn được gọi
/// tới (điều kiện `structured.Count > 0` ở trên nó).
/// </summary>
internal static class ProductSpecGroupBuilder
{
    public static async Task<IReadOnlyList<SpecGroupDto>> BuildAsync(CatalogDbContext db, Product p, CancellationToken ct)
    {
        var structured = await db.ProductSpecificationValues.AsNoTracking()
            .Where(v => v.ProductId == p.Id)
            .Include(v => v.Attribute!).ThenInclude(a => a.Group)
            .ToListAsync(ct);

        if (structured.Count > 0)
            return structured
                .GroupBy(v => v.Attribute!.Group)
                .OrderBy(g => g.Key?.SortOrder ?? int.MaxValue)
                .Select(g => new SpecGroupDto(
                    g.Key?.Id ?? Guid.Empty,
                    g.Key?.Name ?? "Khác",
                    g.Key?.SortOrder ?? 0,
                    g.OrderBy(v => v.Attribute!.SortOrder)
                        .Select(v => new SpecValueDto(
                            v.AttributeId, v.Attribute!.Key, v.Attribute.Name, v.Attribute.Unit,
                            v.Attribute.DataType.ToString(), RawValue(v)))
                        .ToList()))
                .ToList();

        return ParseLegacySpecGroups(p.Specifications);
    }

    /// <summary>Trích giá trị thô đúng theo DataType (chỉ một trong bốn cột khác NULL).</summary>
    private static object? RawValue(ProductSpecificationValue v)
    {
        if (v.ValueText is not null) return v.ValueText;
        if (v.ValueNumber is not null) return v.ValueNumber;
        if (v.ValueBool is not null) return v.ValueBool;
        return v.ValueEnum;
    }

    /// <summary>
    /// Đọc `Products.Specifications` jsonb - mảng thật do W0-6 nạp, hình dạng
    /// <c>[{ "group": "...", "label": "...", "value": "...", "source": "..." }]</c>.
    /// Gom theo `group` (thứ tự xuất hiện = displayOrder). Không gắn được AttributeId thật
    /// (dữ liệu chưa qua bảng có cấu trúc) nên `AttributeId = Guid.Empty`, `DataType = "Text"`.
    /// </summary>
    private static IReadOnlyList<SpecGroupDto> ParseLegacySpecGroups(string? specificationsJson)
    {
        if (string.IsNullOrWhiteSpace(specificationsJson)) return Array.Empty<SpecGroupDto>();

        JsonDocument doc;
        try { doc = JsonDocument.Parse(specificationsJson); }
        catch (JsonException) { return Array.Empty<SpecGroupDto>(); }

        using (doc)
        {
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return Array.Empty<SpecGroupDto>();

            var order = 0;
            var groups = new Dictionary<string, (int Order, List<SpecValueDto> Values)>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                var groupName = item.TryGetProperty("group", out var g) ? g.GetString() ?? "Khác" : "Khác";
                var label = item.TryGetProperty("label", out var l) ? l.GetString() : null;
                var value = item.TryGetProperty("value", out var v) ? v.GetString() : null;
                if (string.IsNullOrWhiteSpace(label) || string.IsNullOrWhiteSpace(value)) continue;

                if (!groups.TryGetValue(groupName, out var bucket))
                {
                    bucket = (order++, new List<SpecValueDto>());
                    groups[groupName] = bucket;
                }
                bucket.Values.Add(new SpecValueDto(Guid.Empty, SlugGenerator.Generate(label), label, null, "Text", value));
            }

            return groups
                .OrderBy(kv => kv.Value.Order)
                .Select(kv => new SpecGroupDto(Guid.Empty, kv.Key, kv.Value.Order, kv.Value.Values))
                .ToList();
        }
    }
}
