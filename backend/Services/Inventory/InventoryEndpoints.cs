using InventoryModule.Endpoints;
using Microsoft.AspNetCore.Routing;

namespace InventoryModule;

/// <summary>
/// Điểm vào DUY NHẤT của module Inventory (W2-5).
///
/// <para>
/// Trước W2-5 file này dài 947 dòng và trộn lẫn tồn kho, đơn mua hàng, nhà cung cấp và timeline
/// serial; trong đó có đường nhận hàng thứ hai (<c>PUT /api/inventory/po/{id}/receive</c>) đi vòng
/// qua sổ cái, không đặt giá vốn, không sinh serial. Đường đó đã bị xoá: GRN (W2-12) là đường nhập
/// kho duy nhất, ngoại lệ duy nhất là tồn đầu kỳ (D10).
/// </para>
///
/// <para>
/// Nội dung đã tách thành các <see cref="IInventorySubmodule"/> trong <c>Endpoints/</c>.
/// Hàm này chỉ quét và nạp chúng, nên thêm nhóm endpoint mới không phải sửa ApiGateway.
/// </para>
/// </summary>
public static class InventoryEndpoints
{
    public static void MapInventoryEndpoints(this IEndpointRouteBuilder app)
    {
        foreach (var submodule in InventorySubmodules.Discover())
            submodule.Map(app);
    }

    // ------------------------------------------------------------------ tương thích ApiGateway
    // backend/ApiGateway/Program.cs (file của track khác) còn gọi tên 4 hàm dưới. Nội dung của
    // chúng đã nằm trong các submodule ở trên và được MapInventoryEndpoints() nạp; gọi lại lần nữa
    // sẽ đăng ký route trùng. Giữ hàm rỗng cho tới khi integration request W2-5-02 gỡ lời gọi.

    /// <summary>Đã gộp vào <see cref="MapInventoryEndpoints"/>. Giữ rỗng cho ApiGateway compile.</summary>
    public static void MapWarehouseEndpoints(this IEndpointRouteBuilder app) { }

    /// <summary>Đã gộp vào <see cref="MapInventoryEndpoints"/>. Giữ rỗng cho ApiGateway compile.</summary>
    public static void MapInventoryCountEndpoints(this IEndpointRouteBuilder app) { }

    /// <summary>Đã gộp vào <see cref="MapInventoryEndpoints"/>. Giữ rỗng cho ApiGateway compile.</summary>
    public static void MapBarcodeEndpoints(this IEndpointRouteBuilder app) { }

    /// <summary>Đã gộp vào <see cref="MapInventoryEndpoints"/>. Giữ rỗng cho ApiGateway compile.</summary>
    public static void MapDeliveryNoteEndpoints(this IEndpointRouteBuilder app) { }
}
