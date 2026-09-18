using Catalog.Endpoints.PcBuilder;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Catalog;

/// <summary>
/// W2-9: điểm vào duy nhất của phân hệ PC Builder (rebuild trên category tree + spec values thật -
/// xem <c>docs/api-contracts/pc-builder.md</c>). Logic thật nằm ở
/// <c>Application/PcBuilder/**</c> + <c>Endpoints/PcBuilder/**</c>; file này chỉ đăng ký route.
///
/// KHÔNG dùng <see cref="ICatalogSubmodule"/> dù Related Code Files của phase-47 gợi ý vậy:
/// <c>ApiGateway/Program.cs:92-93</c> đã gọi thẳng <c>MapAiPCBuilderEndpoints()</c> +
/// <c>MapCatalogPCBuilderEndpoints()</c> TRƯỚC KHI track này chạy, và <c>CatalogEndpoints.cs</c>
/// (chạy trước đó trong Program.cs) đã unconditionally gọi <c>MapCatalogSubmodules()</c> - một
/// class implement <see cref="ICatalogSubmodule"/> trong assembly Catalog sẽ TỰ được quét và Map()
/// một lần nữa, đăng ký trùng route (`/api/catalog/pc-builder/**` hai lần) và có thể vỡ ở
/// runtime (AmbiguousMatchException). Giữ đúng hai tên phương thức cũ để không phải sửa
/// Program.cs (ngoài ownership) - xem báo cáo track, mục "Deviations".
/// </summary>
public static class CatalogPCBuilderEndpoints
{
    public static void MapCatalogPCBuilderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/pc-builder");

        group.MapPcBuilderSlots();
        group.MapPcBuilderCandidates();
        group.MapPcBuilderCheck();
        group.MapPcBuilderBuilds();
    }
}
