using Catalog.Application.BulkOps;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Catalog.Endpoints.BulkOps;

/// <summary>
/// W2-22: điểm vào của phân hệ bulk ops (import/export/đổi giá hàng loạt). Dùng
/// <see cref="ICatalogSubmodule"/> vì đây là track mở rộng KHÔNG sở hữu `CatalogEndpoints.cs` /
/// `DependencyInjection.cs` (xem `ICatalogSubmodule.cs`) - tự được quét và Map() một lần bởi
/// `CatalogEndpoints.MapCatalogEndpoints` -> `MapCatalogSubmodules()`, không trùng route như
/// cảnh báo ở `CatalogPCBuilderEndpoints.cs` (không có route `/api/catalog/bulk/**` nào được
/// map thủ công ở ApiGateway/Program.cs tại thời điểm viết track này - đã grep xác nhận).
/// </summary>
public sealed class CatalogBulkOpsSubmodule : ICatalogSubmodule
{
    public void Register(IServiceCollection services)
    {
        services.AddScoped<ProductImportService>();
        services.AddScoped<ProductExportService>();
        services.AddScoped<BulkPriceChangeService>();
        services.AddScoped<ErrorWorkbookCache>();
    }

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/bulk");
        group.MapCatalogImportEndpoints();
        group.MapCatalogExportEndpoints();
        group.MapCatalogBulkPriceEndpoints();
    }
}
