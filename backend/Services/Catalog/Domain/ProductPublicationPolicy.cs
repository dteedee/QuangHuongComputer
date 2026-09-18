namespace Catalog.Domain;

/// <summary>
/// D10: MỘT vị từ duy nhất quyết định sản phẩm "lên web" hay không - dùng cho MỌI truy vấn công
/// khai (list, detail, search, facet, PC builder của W2-9, provider SEO của W2-17).
///
/// KHÔNG dùng `IsActive` cho việc này: đó là bộ lọc toàn cục (global query filter), tắt nó xoá
/// sản phẩm khỏi CẢ POS / báo giá / kho, không chỉ storefront. "Ẩn khỏi web" = `PublishedAt == null`
/// (hoặc trong tương lai) - sản phẩm vẫn `IsActive = true`, vẫn bán được ở mọi kênh nội bộ.
/// </summary>
public static class ProductPublicationPolicy
{
    /// <summary>Lọc "đã đăng web": `PublishedAt IS NOT NULL AND PublishedAt <= now`.</summary>
    public static IQueryable<Product> WherePublished(this IQueryable<Product> query)
    {
        var now = DateTime.UtcNow;
        return query.Where(p => p.PublishedAt != null && p.PublishedAt <= now);
    }
}
