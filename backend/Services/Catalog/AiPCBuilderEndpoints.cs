using Catalog.Endpoints.PcBuilder;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Catalog;

/// <summary>
/// W2-9 / D10 (binding): route "AI suggest" cũ (<c>POST /ai-suggest</c>, chia ngân sách theo tỷ lệ
/// cố định, KHÔNG kiểm tương thích - xem lịch sử file) đã bị THAY THẾ bằng
/// <c>POST /api/catalog/pc-builder/suggest</c>, rule-based, mỗi lựa chọn phải qua
/// <c>check = compatible</c> (<see cref="Application.PcBuilder.PcBuilderBudgetAllocator"/>). Tên
/// file/class giữ nguyên vì <c>ApiGateway/Program.cs:92</c> gọi thẳng
/// <c>MapAiPCBuilderEndpoints()</c> (ngoài ownership của track - xem
/// <c>CatalogPCBuilderEndpoints.cs</c> cho lý do không dùng <c>ICatalogSubmodule</c>).
/// </summary>
public static class AiPCBuilderEndpoints
{
    public static void MapAiPCBuilderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/pc-builder");
        group.MapPcBuilderSuggest();
    }
}
