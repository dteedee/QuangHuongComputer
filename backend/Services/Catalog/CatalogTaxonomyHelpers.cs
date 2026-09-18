using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;

namespace Catalog;

/// <summary>
/// Phần dùng chung giữa `CatalogCategoryEndpoints` và `CatalogBrandEndpoints`.
/// </summary>
internal static class CatalogTaxonomyHelpers
{
    // Khoá cache đổi phiên bản vì JSON đã thêm parentId/imageUrl/displayOrder/slug/logoUrl.
    internal const string CategoriesCacheSuffix = "_v7_tree";
    internal const string BrandsCacheSuffix = "_v7_slug";

    /// <summary>
    /// 409 + số sản phẩm nếu danh mục/thương hiệu còn hàng ĐANG BÁN.
    ///
    /// Trước đây `DELETE /categories/{id}` chạy `ExecuteUpdate` gỡ bán MỌI sản phẩm của
    /// danh mục, còn `POST /categories/{id}/activate` không bật lại sản phẩm nào -> một
    /// cú bấm nhầm là mất cả ngành hàng, không hoàn tác được.
    ///
    /// Chỉ đếm hàng đang bán: hàng đã gỡ bán vốn đã offline nên không bị phá thêm.
    /// </summary>
    internal static async Task<IResult?> BlockIfInUseAsync(CatalogDbContext db, Guid? categoryId, Guid? brandId)
    {
        var activeCount = categoryId.HasValue
            ? await db.Products.CountAsync(p => p.CategoryId == categoryId.Value)
            : await db.Products.CountAsync(p => p.BrandId == brandId!.Value);

        if (activeCount == 0) return null;

        var totalCount = categoryId.HasValue
            ? await db.Products.IgnoreQueryFilters().CountAsync(p => p.CategoryId == categoryId.Value)
            : await db.Products.IgnoreQueryFilters().CountAsync(p => p.BrandId == brandId!.Value);

        var what = categoryId.HasValue ? "Danh mục" : "Thương hiệu";
        return Results.Conflict(new
        {
            error = $"{what} đang có {activeCount} sản phẩm đang bán. Hãy chuyển hoặc gỡ bán các sản phẩm đó trước.",
            productCount = activeCount,
            totalProductCount = totalCount
        });
    }

    internal static string CurrentUser(HttpContext http)
        => http.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "Admin";
}
