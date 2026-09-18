using BuildingBlocks.Security;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// Kiểm chứng trên bảng route THẬT (WebApplication + MapGroup), không phải builder giả.
///
/// Lý do tồn tại: convention của <c>MapGroup</c> chạy TRƯỚC convention của từng endpoint.
/// Nếu <see cref="ModulePermissionConventions.RequireModulePermissions"/> dùng
/// <c>builder.Add(...)</c> thì lúc nó chạy, metadata <c>.RequireAuthorization(policy)</c> /
/// <c>.AllowAnonymous()</c> của endpoint CHƯA tồn tại — hai lệnh kiểm tra thành code chết,
/// policy của group bị AND thêm vào policy tường minh và khoá nhầm role
/// (ví dụ Marketing có CRM.SendCampaigns nhưng không có CRM.ManageCustomers).
/// Test này sẽ đỏ nếu ai đó đổi <c>Finally</c> ngược về <c>Add</c>.
/// </summary>
public class GroupConventionOrderingTests
{
    private static IReadOnlyList<Endpoint> BuildEndpoints(Action<IEndpointRouteBuilder> map)
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddRouting();
        var app = builder.Build();
        map(app);
        return ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).ToList();
    }

    private static List<string?> PoliciesOf(IEnumerable<Endpoint> endpoints, string suffix) =>
        endpoints.Single(e => (e as RouteEndpoint)!.RoutePattern.RawText!.EndsWith(suffix))
                 .Metadata.OfType<IAuthorizeData>().Select(a => a.Policy).ToList();

    [Fact]
    public void OnARealMapGroup_ExplicitPolicyWins_AndAllowAnonymousStaysOpen()
    {
        var endpoints = BuildEndpoints(app =>
        {
            var group = app.MapGroup("/api/probe").RequireModulePermissions(PermissionModules.Users);
            group.MapGet("/explicit", () => "ok").RequireAuthorization(Permissions.Users.ManageRoles);
            group.MapGet("/plain", () => "ok");
            group.MapPost("/anon", () => "ok").AllowAnonymous();
        });

        // Chỉ policy tường minh, KHÔNG kèm Users.View của group.
        PoliciesOf(endpoints, "/explicit").Should().Equal(Permissions.Users.ManageRoles);

        // Endpoint không tự khai báo -> lấy theo verb của group.
        PoliciesOf(endpoints, "/plain").Should().Equal(Permissions.Users.View);

        // AllowAnonymous không bị gắn thêm policy nào.
        PoliciesOf(endpoints, "/anon").Should().BeEmpty();
    }

    [Fact]
    public void RequirePermission_OnARealMapGroup_AppliesToEveryVerbButSkipsAnonymous()
    {
        var endpoints = BuildEndpoints(app =>
        {
            var group = app.MapGroup("/api/po").RequirePermission(Permissions.Inventory.ApprovePurchaseOrder);
            group.MapPost("/{id}/approve", (string id) => id);
            group.MapGet("/public-ping", () => "ok").AllowAnonymous();
        });

        PoliciesOf(endpoints, "/approve").Should().Contain(Permissions.Inventory.ApprovePurchaseOrder);
        PoliciesOf(endpoints, "/public-ping").Should().BeEmpty();
    }
}
