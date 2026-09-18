using Microsoft.AspNetCore.Routing;

namespace Sales.Endpoints.Pos;

/// <summary>
/// Bán hàng tại quầy (POS) — **W2-10** (`phase-48`). Mục lục route; mỗi nhóm nằm ở file riêng để
/// giữ mọi file dưới 200 dòng.
///
/// Toàn bộ nhóm nằm dưới `/api/sales/pos/**` và gắn policy <c>Permissions.Sales.Pos</c> — KHÔNG
/// dùng chuỗi vai trò (docs/permission-matrix.md). Lý do route nằm trên <c>group</c> (nhánh
/// "đã đăng nhập") chứ không phải <c>adminGroup</c>: <c>adminGroup</c> gán quyền THEO VERB
/// (POST ⇒ <c>Sales.ManageAll</c>), mà vai trò Sale ở quầy cố tình KHÔNG có quyền đó.
/// </summary>
internal static class PosEndpoints
{
    public static void MapPosEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        PosSaleEndpoints.Map(group);
        PosCustomerEndpoints.Map(group);
        PosHeldOrderEndpoints.Map(group);
    }
}
