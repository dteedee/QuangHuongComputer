using Microsoft.AspNetCore.Http;

namespace Catalog;

/// <summary>
/// Cổng kiểm tra quyền nhân viên cho các endpoint CÔNG KHAI có tham số nhạy cảm
/// (`includeInactive` để lộ sản phẩm chưa xuất bản / đã gỡ bán).
/// Các endpoint chỉ dành cho admin vẫn dùng `RequireAuthorization(RequireRole(...))` như cũ.
/// </summary>
public static class CatalogStaffAccess
{
    /// <summary>Các vai trò được phép nhìn thấy hàng đã bị vô hiệu hoá trong danh mục.</summary>
    private static readonly string[] StaffRoles =
    {
        BuildingBlocks.Security.Roles.Admin,
        BuildingBlocks.Security.Roles.Manager,
        BuildingBlocks.Security.Roles.Sale,
        BuildingBlocks.Security.Roles.InventoryStaff,
        BuildingBlocks.Security.Roles.Marketing
    };

    public static bool IsStaff(this HttpContext http)
    {
        var user = http.User;
        if (user?.Identity?.IsAuthenticated != true) return false;
        foreach (var role in StaffRoles)
            if (user.IsInRole(role)) return true;
        return false;
    }

    /// <summary>
    /// `includeInactive` chỉ có hiệu lực với nhân viên. Khách vãng lai gửi
    /// `?includeInactive=true` sẽ bị bỏ qua im lặng (không lộ sự tồn tại của hàng ẩn).
    /// </summary>
    public static bool WantsInactive(this HttpContext http, bool? includeInactive)
        => includeInactive == true && http.IsStaff();
}
