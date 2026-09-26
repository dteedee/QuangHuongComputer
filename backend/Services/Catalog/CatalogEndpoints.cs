using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Catalog;

/// <summary>
/// Điểm vào duy nhất của module Catalog (`app.MapCatalogEndpoints()` trong ApiGateway).
///
/// File này trước đây dài 1461 dòng và gộp sản phẩm + danh mục + thương hiệu + đánh giá
/// + một khối seed. W0-5 chia theo quy tắc "file &gt; 200 dòng thì tách":
///   - `CatalogProductQueryEndpoints.cs` - đọc sản phẩm (list/detail/by-slug/search/related)
///   - `CatalogProductAdminEndpoints.cs` - ghi sản phẩm (create/update/activate/toggle)
///   - `CatalogProductHelpers.cs`        - phần dùng chung của hai file trên
///   - `CatalogCategoryEndpoints.cs`     - danh mục (cây, slug, chính sách VAT/serial)
///   - `CatalogBrandEndpoints.cs`        - thương hiệu (slug, logo, website)
///   - `CatalogTaxonomyHelpers.cs`       - chặn xoá khi còn hàng (409) dùng chung
///   - `CatalogReviewEndpoints.cs`       - đánh giá + duyệt đánh giá
///   - `CatalogDtos.cs`                  - DTO request + hình dạng JSON response dùng chung
///   - `CatalogStaffAccess.cs`           - cổng quyền nhân viên cho `includeInactive`
///
/// ĐÃ XOÁ: `POST /api/catalog/seed` (D02 mục 14). Khối đó hardcode 28 URL
/// `res.cloudinary.com` vừa là hotlink bị cấm vừa là asset id bịa (nên trả 404),
/// và nó lặp lại `CatalogDbSeeder` - danh sách domain cho phép của importer
/// không với tới được nó.
/// </summary>
public static class CatalogEndpoints
{
    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog");

        group.MapCatalogProductQueryEndpoints();
        group.MapCatalogProductSearchEndpoints();
        group.MapCatalogBoughtTogetherEndpoints();
        group.MapCatalogProductAdminEndpoints();
        group.MapCatalogCategoryEndpoints();
        group.MapCatalogBrandEndpoints();
        group.MapCatalogReviewEndpoints();

        // W2-1 first commit: phân hệ con (vd W2-9's PC builder) tự đăng ký route qua
        // ICatalogSubmodule - không cần sửa file này. No-op hôm nay (0 submodule triển khai).
        app.MapCatalogSubmodules();
    }
}
