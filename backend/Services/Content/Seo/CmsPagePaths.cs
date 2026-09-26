using System.Text.RegularExpressions;

namespace Content.Seo;

/// <summary>
/// MỘT nơi quyết định URL công khai chuẩn của một <c>CMSPage</c> theo slug — dùng chung cho
/// <see cref="ContentPageSeoProvider"/> (trang cố định + <c>/chinh-sach/*</c>), <see cref="CmsPageSeoProvider"/>
/// (catch-all <c>/{slug}</c>) và sitemap, để một trang không bao giờ có hai URL cùng index.
///
///   · slug của trang cố định (gioi-thieu, lien-he, dieu-khoan, bao-mat) -> <c>/{slug}</c> (route riêng của SPA)
///   · slug chính sách (khớp <c>titleMapping</c> trong <c>frontend/src/pages/PolicyPage.tsx</c>) -> <c>/chinh-sach/{slug}</c>
///   · slug trùng route thật (<see cref="ReservedSlugs"/>) -> <c>/chinh-sach/{slug}</c>
///   · mọi slug khác (trang CMS tự do, ví dụ <c>huong-dan-mua-hang</c>) -> <c>/{slug}</c> qua route catch-all
/// </summary>
public static class CmsPagePaths
{
    public static readonly Regex SlugPattern = new(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

    /// <summary>Route cố định của SPA -> slug CMSPage trả lời nó.</summary>
    public static readonly IReadOnlyDictionary<string, string> FixedRoutes = new Dictionary<string, string>
    {
        ["/gioi-thieu"] = "gioi-thieu",
        ["/lien-he"] = "lien-he",
        ["/dieu-khoan"] = "dieu-khoan",
        ["/bao-mat"] = "bao-mat",
    };

    /// <summary>Slug hiển thị trong khung "chính sách" (PolicyPage) — giữ đồng bộ với sidebar của trang đó.</summary>
    public static readonly IReadOnlySet<string> PolicySlugs = new HashSet<string>(StringComparer.Ordinal)
    {
        "bao-hanh", "doi-tra", "van-chuyen", "huong-dan-thanh-toan", "kiem-hang", "khieu-nai",
    };

    /// <summary>
    /// Đoạn đầu của mọi route SPA/alias khác (`frontend/src/routes/*.routes.ts`). Một CMSPage trùng
    /// slug này sẽ bị route thật che mất, nên catch-all không nhận nó và URL chuẩn của nó là `/chinh-sach/{slug}`.
    /// </summary>
    public static readonly IReadOnlySet<string> ReservedSlugs = new HashSet<string>(StringComparer.Ordinal)
    {
        "san-pham", "danh-muc", "tim-kiem", "tin-tuc", "khuyen-mai", "flash-sale", "chinh-sach",
        "gio-hang", "thanh-toan", "tai-khoan", "sua-chua", "bao-hanh", "tuyen-dung", "he-thong-cua-hang",
        "so-sanh", "xay-dung-cau-hinh", "ho-tro", "booking", "tra-cuu-sua-chua", "tra-cuu-don-hang",
        "checkout", "payment", "product", "products", "catalog", "category", "search", "cart", "account",
        "profile", "login", "register", "forgot-password", "reset-password", "backoffice", "admin",
        "laptop", "pc-gaming", "workstation", "components", "screens", "repairs", "repair", "warranty",
        "support", "recruitment", "policy", "post", "contact", "terms", "privacy", "about", "stores",
        "promotion", "promotions", "news", "compare", "dev", "build-pc", "flash-sales", "403",
    };

    public static string CanonicalPath(string slug)
    {
        if (FixedRoutes.ContainsKey("/" + slug)) return "/" + slug;
        // Slug trùng route thật không thể sống ở `/{slug}` -> dời vào khung chính sách (PolicyPage render mọi slug).
        return PolicySlugs.Contains(slug) || ReservedSlugs.Contains(slug) ? $"/chinh-sach/{slug}" : "/" + slug;
    }

    /// <summary>True khi URL chuẩn của slug do catch-all <c>/{slug}</c> phục vụ (không phải route cố định/chính sách).</summary>
    public static bool IsCatchAll(string slug) =>
        !FixedRoutes.ContainsKey("/" + slug) && !PolicySlugs.Contains(slug) && !ReservedSlugs.Contains(slug);
}
