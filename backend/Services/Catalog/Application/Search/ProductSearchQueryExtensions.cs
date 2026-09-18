using Microsoft.EntityFrameworkCore;
using Catalog.Domain;

namespace Catalog.Application.Search;

/// <summary>
/// Hàm SQL phía PostgreSQL được ánh xạ sang LINQ. Đăng ký trong
/// <c>CatalogDbContext.OnModelCreating</c> bằng <c>HasDbFunction</c>.
/// </summary>
public static class PostgresTextFunctions
{
    /// <summary>
    /// Bọc `unaccent()` trong một hàm IMMUTABLE (tạo bởi migration ExtendCategoryBrandAndSearch).
    /// Bản `unaccent(text)` một tham số chỉ STABLE nên KHÔNG index được; bản
    /// `unaccent(regdictionary, text)` mới IMMUTABLE - wrapper gọi bản đó để chỉ mục
    /// GIN trigram trên `qh_unaccent_immutable("Name")` dùng được cho ILIKE '%...%'.
    /// </summary>
    public static string QhUnaccent(string? input)
        => throw new InvalidOperationException("Chỉ dùng được bên trong truy vấn LINQ-to-Entities.");
}

/// <summary>
/// Vị từ tìm kiếm sản phẩm DÙNG CHUNG cho mọi endpoint (`/products`, `/products/search`).
/// Trước đây mỗi endpoint tự viết `EF.Functions.Like` riêng nên tìm kiếm phân biệt
/// HOA/thường và phân biệt dấu: "asus" ra 0 kết quả trong khi "Asus" ra 5.
/// </summary>
public static class ProductSearchQueryExtensions
{
    /// <summary>Số từ khoá tối đa xử lý trong một lần tìm - chặn truy vấn bệnh lý.</summary>
    private const int MaxTerms = 8;

    /// <summary>Độ dài tối đa của một từ khoá (cột Name dài nhất là 200).</summary>
    private const int MaxTermLength = 100;

    /// <summary>
    /// Ký tự thoát của LIKE/ILIKE, PHẢI truyền tường minh: bản `EF.Functions.ILike(a, b)`
    /// hai tham số được Npgsql dịch thành `a ILIKE b ESCAPE ''`, tức là TẮT hẳn ký tự thoát,
    /// nên `\%` do <see cref="EscapeLikeWildcards"/> sinh ra sẽ bị hiểu là dấu chéo ngược
    /// thật + ký tự đại diện. Bản ba tham số sinh `ESCAPE '\'` như mong muốn.
    /// </summary>
    private const string EscapeChar = "\\";

    /// <summary>
    /// Lọc theo từ khoá, không phân biệt hoa/thường và không phân biệt dấu.
    /// Mỗi từ trong chuỗi tìm kiếm phải khớp ít nhất một cột (ngữ nghĩa AND giữa các từ),
    /// giữ nguyên hành vi cũ, chỉ đổi cách so khớp.
    /// </summary>
    public static IQueryable<Product> ApplySearch(this IQueryable<Product> query, string? term)
    {
        foreach (var needle in NormalizeTerms(term))
        {
            // Chuỗi đã bỏ dấu + thường hoá ở C#; phía SQL `qh_unaccent_immutable` bỏ dấu cột,
            // `ILIKE` lo phần hoa/thường. Hai đầu vì thế quy về cùng một dạng.
            var pattern = $"%{EscapeLikeWildcards(needle)}%";

            query = query.Where(p =>
                EF.Functions.ILike(PostgresTextFunctions.QhUnaccent(p.Name), pattern, EscapeChar) ||
                EF.Functions.ILike(PostgresTextFunctions.QhUnaccent(p.Sku), pattern, EscapeChar) ||
                EF.Functions.ILike(PostgresTextFunctions.QhUnaccent(p.Description), pattern, EscapeChar) ||
                (p.Category != null && EF.Functions.ILike(PostgresTextFunctions.QhUnaccent(p.Category.Name), pattern, EscapeChar)) ||
                (p.Brand != null && EF.Functions.ILike(PostgresTextFunctions.QhUnaccent(p.Brand.Name), pattern, EscapeChar)));
        }

        return query;
    }

    /// <summary>Tách từ, bỏ dấu, thường hoá, bỏ trùng, giới hạn số lượng và độ dài.</summary>
    private static IReadOnlyList<string> NormalizeTerms(string? term)
    {
        if (string.IsNullOrWhiteSpace(term)) return Array.Empty<string>();

        return term
            .Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(t => VietnameseTextNormalizer.Fold(t))
            .Where(t => t.Length > 0)
            .Select(t => t.Length > MaxTermLength ? t[..MaxTermLength] : t)
            .Distinct(StringComparer.Ordinal)
            .Take(MaxTerms)
            .ToList();
    }

    /// <summary>
    /// Thoát ký tự đại diện của LIKE bằng <see cref="EscapeChar"/> (đi kèm mệnh đề
    /// `ESCAPE '\'` do bản ILike ba tham số sinh ra). Bỏ bước này thì người dùng gõ "%"
    /// sẽ khớp mọi sản phẩm.
    /// </summary>
    private static string EscapeLikeWildcards(string value)
        => value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
