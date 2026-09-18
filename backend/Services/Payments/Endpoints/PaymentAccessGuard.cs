using System.Security.Claims;
using BuildingBlocks.Security;

namespace Payments.Endpoints;

/// <summary>
/// Ai được nhìn/trả tiền cho một đơn: CHỦ đơn, hoặc nhân viên có quyền `Payments.View`
/// (tuyến `Sales.ViewAll` cho nhân viên bán hàng), hoặc khách vãng lai cầm token ký của đúng đơn đó.
///
/// W1-1 đã bỏ phân quyền theo chuỗi vai trò: danh sách `{"Admin","Manager","Sale","Accountant"}`
/// hardcode ở W0-10 bỏ sót mọi vai trò tuỳ biến mà chủ tạo sau này và không theo ma trận quyền.
/// Ở đây chỉ còn kiểm QUYỀN.
/// </summary>
internal static class PaymentAccessGuard
{
    public static bool HasPermission(this ClaimsPrincipal user, string permission)
        => user.IsInRole(Roles.Admin)
           || user.FindAll(Permissions.PermissionType).Any(c => c.Value == permission);

    /// <summary>Nhân viên được xem mọi giao dịch thanh toán.</summary>
    public static bool IsPaymentsStaff(this ClaimsPrincipal user)
        => user.HasPermission(Permissions.Payments.View)
           || user.HasPermission(Permissions.Sales.ViewAll);

    /// <summary>Id người dùng đang gọi, null nếu token không mang `NameIdentifier`.</summary>
    public static Guid? UserId(this ClaimsPrincipal user)
        => Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static bool OwnsOrder(this ClaimsPrincipal user, Guid customerId)
        => user.UserId() is { } id && id == customerId;
}
