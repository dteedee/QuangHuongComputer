using System.Security.Claims;
using BuildingBlocks.Security;

namespace Sales.Infrastructure.Shipping.Endpoints;

/// <summary>
/// Ai được xem vận đơn của một đơn hàng: CHỦ đơn, hoặc nhân viên có <c>Sales.ViewAll</c>.
/// Cùng khuôn mẫu <c>Payments.Endpoints.PaymentAccessGuard</c> (W1-1: chỉ kiểm QUYỀN, không kiểm
/// chuỗi vai trò hardcode) — tách guard riêng vì <c>PaymentAccessGuard</c> là <c>internal</c> của
/// module Payments, module này không gọi được.
/// </summary>
internal static class ShippingAccessGuard
{
    public static bool HasPermission(this ClaimsPrincipal user, string permission)
        => user.IsInRole(Roles.Admin)
           || user.FindAll(Permissions.PermissionType).Any(c => c.Value == permission);

    public static Guid? UserId(this ClaimsPrincipal user)
        => Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>Chủ đơn, hoặc nhân viên xem được mọi đơn (W1-10 IDOR fix cho tra vận đơn).</summary>
    public static bool CanViewOrderShipment(this ClaimsPrincipal user, Guid orderCustomerId)
        => user.HasPermission(Permissions.Sales.ViewAll)
           || (user.UserId() is { } id && id == orderCustomerId);
}
