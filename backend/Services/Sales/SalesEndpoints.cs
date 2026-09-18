using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Sales.Endpoints.AdminOrders;
using Sales.Endpoints.Carts;
using Sales.Endpoints.Loyalty;
using Sales.Endpoints.Orders;
using Sales.Endpoints.Pos;
using Sales.Endpoints.Quotations;
using Sales.Endpoints.Returns;
using Sales.Endpoints.Stats;
using Sales.Endpoints.Wishlist;

namespace Sales;

/// <summary>
/// ĐIỂM ĐĂNG KÝ route của module Sales — chỉ còn là một bảng mục lục.
///
/// Trước W2-3 file này dài 2.446 dòng và chứa toàn bộ handler của giỏ hàng, checkout, đơn hàng,
/// đổi trả, điểm thưởng, thống kê và quản trị đơn trong đúng một class. W2-3 tách NGUYÊN VĂN
/// từng nhóm sang <c>Endpoints/&lt;Feature&gt;/</c>; đường dẫn route giữ y hệt nên frontend đang
/// chạy không đổi một dòng nào.
///
/// Sở hữu sau khi tách (`plan.md` §"Standing rules" mục 5):
///   W2-3  → Cart, Wishlist, Checkout, AddressBook
///   W2-10 → AdminOrders, Returns, Loyalty, Stats, Pos
///   W2-23 → Orders (vòng đời đơn)
///   W2-19 → Quotations · W2-20 → Installments · W2-11 → Infrastructure/Shipping
/// Mỗi nhóm có sẵn điểm gọi ở đây để track sở hữu KHÔNG phải sửa file này.
/// </summary>
public static class SalesEndpoints
{
    public static void MapSalesEndpoints(this IEndpointRouteBuilder app)
    {
        // Nhánh "của chính tôi" (giỏ hàng, đơn của tôi, wishlist, điểm thưởng): mọi handler đều
        // lọc theo userId từ ClaimsPrincipal → chỉ cần đăng nhập (W1-10 self-service).
        var group = app.MapGroup("/api/sales").RequireAuthorization(SecurityPolicies.Authenticated);

        // W1-10: adminGroup được tạo từ `app` chứ KHÔNG phải `group.MapGroup("/admin")`.
        // Lý do: group cha đã gắn policy "Policy.Authenticated"; RequireModulePermissions bỏ qua
        // endpoint nào đã có policy tường minh, nên nếu kế thừa từ group thì quyền theo verb sẽ
        // không bao giờ được gắn và /api/sales/admin/** chỉ còn yêu cầu "đã đăng nhập".
        // GET → Sales.ViewAll, POST → Sales.ManageAll, PUT/PATCH → Sales.UpdateStatus,
        // DELETE → Sales.CancelOrder.
        var adminGroup = app.MapGroup("/api/sales/admin").RequireModulePermissions(PermissionModules.Sales);

        // ===== W2-3 =====
        CartEndpoints.MapCartEndpoints(group, adminGroup);
        WishlistEndpoints.MapWishlistEndpoints(group, adminGroup);

        // ===== W2-23 (vòng đời đơn) =====
        CustomerOrderEndpoints.MapCustomerOrderEndpoints(group, adminGroup);

        // ===== W2-10 (POS, đổi trả, điểm thưởng, quản trị đơn, thống kê) =====
        AdminOrderEndpoints.MapAdminOrderEndpoints(group, adminGroup);
        ReturnEndpoints.MapReturnEndpoints(group, adminGroup);
        AdminReturnEndpoints.MapAdminReturnEndpoints(group, adminGroup);
        LoyaltyEndpoints.MapLoyaltyEndpoints(group, adminGroup);
        StatsEndpoints.MapStatsEndpoints(group, adminGroup);
        PosEndpoints.MapPosEndpoints(group, adminGroup);

        // ===== W2-19 (báo giá) =====
        QuotationEndpoints.MapQuotationEndpoints(group, adminGroup);
    }
}
