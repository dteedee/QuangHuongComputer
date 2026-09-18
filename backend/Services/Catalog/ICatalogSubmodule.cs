using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Catalog;

/// <summary>
/// Điểm mở rộng cho các phân hệ con của Catalog nằm NGOÀI sở hữu của track này (vd PC Builder
/// của W2-9: <c>AiPCBuilderEndpoints.cs</c>, <c>CatalogPCBuilderEndpoints.cs</c>,
/// <c>Application/PcBuilder/**</c>, <c>Endpoints/PcBuilder/**</c>).
///
/// Implement interface này ở BẤT KỲ đâu trong assembly Catalog (constructor không tham số) và nó
/// TỰ được tìm thấy + đăng ký bởi <see cref="CatalogSubmoduleExtensions.AddCatalogSubmodules"/> /
/// <see cref="CatalogSubmoduleExtensions.MapCatalogSubmodules"/> - không cần sửa
/// <c>DependencyInjection.cs</c>, <c>CatalogEndpoints.cs</c> (sở hữu bởi W2-1) hay
/// <c>ApiGateway/Program.cs</c> để thêm một phân hệ mới.
/// </summary>
public interface ICatalogSubmodule
{
    /// <summary>Đăng ký DI riêng của phân hệ (services, HttpClient...). Có thể để trống.</summary>
    void Register(IServiceCollection services);

    /// <summary>Map route của phân hệ (thường <c>app.MapGroup("/api/catalog/...")</c> riêng).</summary>
    void Map(IEndpointRouteBuilder app);
}
