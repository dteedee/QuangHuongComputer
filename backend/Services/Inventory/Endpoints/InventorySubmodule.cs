using Microsoft.AspNetCore.Routing;

namespace InventoryModule.Endpoints;

/// <summary>
/// Một nhóm endpoint của module Inventory (W2-5).
///
/// <para>
/// Trước đây mỗi nhóm là một extension method mà <c>ApiGateway/Program.cs</c> phải gọi tên một
/// cách thủ công, nên thêm nhóm mới = sửa file của track khác. Với interface này, host chỉ gọi
/// <c>app.MapInventoryEndpoints()</c> một lần và mọi nhóm trong assembly tự được nạp — W2-12 thêm
/// <c>Endpoints/Purchasing/*</c> mà không phải chạm vào ApiGateway.
/// </para>
/// </summary>
public interface IInventorySubmodule
{
    /// <summary>Thứ tự nạp (nhỏ trước). Chỉ cần khi một nhóm phải đăng ký route trước nhóm khác.</summary>
    int Order => 100;

    void Map(IEndpointRouteBuilder app);
}

/// <summary>Quét assembly Inventory tìm mọi <see cref="IInventorySubmodule"/>.</summary>
public static class InventorySubmodules
{
    public static IReadOnlyList<IInventorySubmodule> Discover()
        => typeof(InventorySubmodules).Assembly
            .GetTypes()
            .Where(t => typeof(IInventorySubmodule).IsAssignableFrom(t)
                        && t is { IsAbstract: false, IsInterface: false }
                        && t.GetConstructor(Type.EmptyTypes) is not null)
            .Select(t => (IInventorySubmodule)Activator.CreateInstance(t)!)
            // Thứ tự phải tất định: GetTypes() không cam kết thứ tự, và một route trùng nhau
            // nạp theo thứ tự khác nhau giữa hai lần khởi động là lỗi không thể tái hiện.
            .OrderBy(s => s.Order)
            .ThenBy(s => s.GetType().FullName, StringComparer.Ordinal)
            .ToList();
}
