using BuildingBlocks.Security;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// <c>RequireModulePermissions</c>: GET -> View, POST -> Create, PUT/PATCH -> Edit,
/// DELETE -> Delete. Đây là helper W1-10 dùng để quét toàn bộ endpoint.
/// </summary>
public class ModulePermissionConventionTests
{
    /// <summary>
    /// Builder giả: gom convention rồi áp lên một endpoint builder thật.
    /// Mô phỏng đúng thứ tự của ASP.NET Core: convention <c>Add</c> chạy trước,
    /// convention <c>Finally</c> chạy sau cùng — và metadata tường minh của endpoint
    /// ("seed") được gắn giữa hai pha, y như khi <c>MapGroup</c> bọc một endpoint.
    /// Thứ tự này đã được <c>GroupConventionOrderingTests</c> đo trên bảng route thật.
    /// </summary>
    private sealed class FakeConventionBuilder : IEndpointConventionBuilder
    {
        private readonly List<Action<EndpointBuilder>> _conventions = new();
        private readonly List<Action<EndpointBuilder>> _finally = new();
        public void Add(Action<EndpointBuilder> convention) => _conventions.Add(convention);
        public void Finally(Action<EndpointBuilder> convention) => _finally.Add(convention);

        public RouteEndpointBuilder Apply(string method, params object[] seedMetadata)
        {
            var builder = new RouteEndpointBuilder(
                _ => Task.CompletedTask, RoutePatternFactory.Parse("/api/x"), order: 0);
            builder.Metadata.Add(new HttpMethodMetadata(new[] { method }));
            foreach (var convention in _conventions) convention(builder);
            // Metadata do chính endpoint khai báo xuất hiện SAU convention của group.
            foreach (var item in seedMetadata) builder.Metadata.Add(item);
            foreach (var convention in _finally) convention(builder);
            return builder;
        }
    }

    private static string? PolicyFor(ModulePermissionSet module, string method, params object[] seed)
    {
        var builder = new FakeConventionBuilder();
        builder.RequireModulePermissions(module);
        return builder.Apply(method, seed).Metadata.OfType<IAuthorizeData>()
            .Select(a => a.Policy).LastOrDefault();
    }

    [Theory]
    [InlineData("GET", "Permissions.Users.View")]
    [InlineData("HEAD", "Permissions.Users.View")]
    [InlineData("POST", "Permissions.Users.Create")]
    [InlineData("PUT", "Permissions.Users.Edit")]
    [InlineData("PATCH", "Permissions.Users.Edit")]
    [InlineData("DELETE", "Permissions.Users.Delete")]
    public void VerbMapsToTheMatchingPermission(string method, string expected)
    {
        PolicyFor(PermissionModules.Users, method).Should().Be(expected);
    }

    [Fact]
    public void ExplicitPolicyOnTheEndpoint_WinsOverTheGroupConvention()
    {
        var builder = new FakeConventionBuilder();
        builder.RequireModulePermissions(PermissionModules.Users);
        var endpoint = builder.Apply("GET", new AuthorizeAttribute(Permissions.Users.ManageRoles));

        // Phải là policy DUY NHẤT: nếu group cộng thêm Users.View thì hai policy bị AND
        // và role chỉ có ManageRoles sẽ bị 403.
        endpoint.Metadata.OfType<IAuthorizeData>().Select(a => a.Policy)
            .Should().Equal(Permissions.Users.ManageRoles);
    }

    [Fact]
    public void AllowAnonymousEndpoint_IsLeftAlone()
    {
        var builder = new FakeConventionBuilder();
        builder.RequireModulePermissions(PermissionModules.Catalog);
        var endpoint = builder.Apply("GET", new AllowAnonymousAttribute());

        endpoint.Metadata.OfType<IAuthorizeData>().Should().BeEmpty();
    }

    [Fact]
    public void RequirePermission_AppliesOneNamedPolicyToEveryVerb()
    {
        var builder = new FakeConventionBuilder();
        builder.RequirePermission(Permissions.Inventory.ApprovePurchaseOrder);

        foreach (var method in new[] { "GET", "POST", "DELETE" })
        {
            builder.Apply(method).Metadata.OfType<IAuthorizeData>()
                .Select(a => a.Policy).Should().Contain(Permissions.Inventory.ApprovePurchaseOrder);
        }
    }

    [Fact]
    public void MultiVerbEndpoint_TakesTheMostRestrictivePermission()
    {
        PermissionModules.Users.ForMethods(new[] { "GET", "POST" })
            .Should().Be(Permissions.Users.Create);

        PermissionModules.Users.ForMethods(new[] { "GET", "DELETE" })
            .Should().Be(Permissions.Users.Delete);
    }

    [Fact]
    public void UnknownVerb_FallsBackToEdit_FailClosed()
    {
        PermissionModules.Users.ForMethod("TRACE").Should().Be(Permissions.Users.Edit);
    }

    [Fact]
    public void EveryModuleSet_OnlyReferencesPermissionsThatExist()
    {
        var catalog = Permissions.GetAllPermissions().ToHashSet(StringComparer.Ordinal);

        foreach (var module in PermissionModules.All())
        {
            module.All().Should().AllSatisfy(p =>
                catalog.Should().Contain(p, $"module set '{module.Module}' tham chiếu quyền không tồn tại"));
        }
    }
}
