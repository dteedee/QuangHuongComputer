using BuildingBlocks.Security;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// Luật fail-closed của W1-1: mỗi endpoint phải có policy permission HOẶC nằm trong
/// <see cref="PublicEndpointAllowList"/>. Test chạy trên tập endpoint giả (không cần
/// dựng ApiGateway) đúng như thiết kế trong phase-10.
/// </summary>
public class EndpointAuthorizationConventionTests
{
    private static Endpoint Endpoint(string pattern, string method, params object[] metadata)
    {
        var all = metadata.Append(new HttpMethodMetadata(new[] { method })).ToArray();
        return new RouteEndpoint(
            _ => Task.CompletedTask,
            RoutePatternFactory.Parse(pattern),
            order: 0,
            new EndpointMetadataCollection(all),
            $"{method} {pattern}");
    }

    private static Endpoint Protected(string pattern, string method, string permission) =>
        Endpoint(pattern, method, new AuthorizeAttribute(permission));

    [Fact]
    public void Endpoint_WithoutAnyAuthorization_IsAViolation()
    {
        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Endpoint("/api/hr/payroll", "GET")
        });

        violations.Should().ContainSingle()
            .Which.Kind.Should().Be(AuthorizationViolationKind.Missing);
    }

    [Fact]
    public void Endpoint_WithNamedPermissionPolicy_IsClean()
    {
        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Protected("/api/hr/payroll", "GET", Permissions.HR.ViewPayroll)
        });

        violations.Should().BeEmpty();
    }

    [Fact]
    public void Endpoint_WithRoleListOnly_IsFlaggedAsRoleBased()
    {
        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Endpoint("/api/hr/payroll", "GET", new AuthorizeAttribute { Roles = "Admin,Manager" })
        });

        violations.Should().ContainSingle()
            .Which.Kind.Should().Be(AuthorizationViolationKind.RoleBased);
    }

    [Fact]
    public void Endpoint_WithBareRequireAuthorization_IsFlaggedAsAuthenticatedOnly()
    {
        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Endpoint("/api/hr/payroll", "GET", new AuthorizeAttribute())
        });

        violations.Should().ContainSingle()
            .Which.Kind.Should().Be(AuthorizationViolationKind.AuthenticatedOnly);
    }

    [Fact]
    public void AllowAnonymous_OutsideTheAllowList_IsAViolation()
    {
        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Endpoint("/api/hr/payroll", "GET", new AllowAnonymousAttribute())
        });

        violations.Should().ContainSingle()
            .Which.Kind.Should().Be(AuthorizationViolationKind.UndeclaredAnonymous);
    }

    [Fact]
    public void PublicStorefrontReads_AreAllowedWithoutAuthorization()
    {
        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Endpoint("/api/catalog/products", "GET"),
            Endpoint("/api/catalog/products/{id}", "GET"),
            Endpoint("/api/content/posts", "GET"),
            Endpoint("/api/auth/login", "POST"),
            Endpoint("/health", "GET")
        });

        violations.Should().BeEmpty();
    }

    [Fact]
    public void PublicPrefix_DoesNotCoverWrites()
    {
        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Endpoint("/api/catalog/products", "POST")
        });

        violations.Should().ContainSingle()
            .Which.Kind.Should().Be(AuthorizationViolationKind.Missing);
    }

    [Fact]
    public void RouteContainingAdminSegment_IsNeverPublic()
    {
        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Endpoint("/api/catalog/reviews/admin", "GET"),
            Endpoint("/api/content/admin/pages", "GET")
        });

        violations.Should().HaveCount(2);
        violations.Should().OnlyContain(v => v.Kind == AuthorizationViolationKind.Missing);
    }

    /// <summary>
    /// Tiêu chí nghiệm thu của phase-10: bỏ policy khỏi ĐÚNG MỘT endpoint thì test đỏ.
    /// </summary>
    [Fact]
    public void RemovingThePolicyFromOneEndpoint_TurnsTheConventionRed()
    {
        var healthy = new[]
        {
            Protected("/api/hr/employees", "GET", Permissions.HR.ViewEmployees),
            Protected("/api/hr/payroll", "GET", Permissions.HR.ViewPayroll),
            Protected("/api/sales/orders", "POST", Permissions.Sales.ManageAll)
        };
        EndpointAuthorizationConvention.Analyze(healthy).Should().BeEmpty();

        var tampered = new[]
        {
            Protected("/api/hr/employees", "GET", Permissions.HR.ViewEmployees),
            Endpoint("/api/hr/payroll", "GET"), // policy bị gỡ
            Protected("/api/sales/orders", "POST", Permissions.Sales.ManageAll)
        };

        var violations = EndpointAuthorizationConvention.Analyze(tampered);
        violations.Should().ContainSingle();
        violations[0].RoutePattern.Should().Be("/api/hr/payroll");
        EndpointAuthorizationConvention.Describe(violations[0]).Should().Contain("Missing");
    }

    /// <summary>
    /// Allow-list không được nuốt endpoint đã có bảo vệ: nếu một rule quá rộng khớp phải
    /// chúng thì <see cref="EndpointAuthorizationConvention.Analyze"/> bỏ qua, W1-10 không
    /// bao giờ nhận được chúng trong worklist và role-check cũ sống sót mãi.
    /// </summary>
    [Fact]
    public void ShippingAllowList_CoversOnlyTheTwoTrulyAnonymousRoutes()
    {
        PublicEndpointAllowList.IsPublic("/api/shipping/calculate-fee", new[] { "POST" }).Should().BeTrue();
        PublicEndpointAllowList.IsPublic("/api/shipping/webhook", new[] { "POST" }).Should().BeTrue();

        // Staff-only (ShippingEndpoints.cs:78) và đã-đăng-nhập (:95).
        PublicEndpointAllowList.IsPublic("/api/shipping/create-shipment/{orderId:guid}", new[] { "POST" })
            .Should().BeFalse();
        PublicEndpointAllowList.IsPublic("/api/shipping/tracking/{orderId:guid}", new[] { "GET" })
            .Should().BeFalse();

        var violations = EndpointAuthorizationConvention.Analyze(new[]
        {
            Endpoint("/api/shipping/create-shipment/{orderId:guid}", "POST",
                new AuthorizeAttribute { Roles = "Admin,Manager,Sale" }),
            Endpoint("/api/shipping/tracking/{orderId:guid}", "GET", new AuthorizeAttribute())
        });

        violations.Should().HaveCount(2);
        violations.Select(v => v.Kind).Should().BeEquivalentTo(new[]
        {
            AuthorizationViolationKind.RoleBased,
            AuthorizationViolationKind.AuthenticatedOnly
        });
    }

    /// <summary>
    /// Endpoint khai báo bằng <c>app.Map(...)</c> không có HttpMethodMetadata nên trả lời
    /// MỌI verb. Nó chỉ được coi là công khai khi rule cũng cho phép mọi verb
    /// (healthcheck), không phải khi rule chỉ mở GET.
    /// </summary>
    [Fact]
    public void EndpointWithoutDeclaredVerb_IsNotPublicUnderAGetOnlyRule()
    {
        PublicEndpointAllowList.IsPublic("/api/catalog/reindex", Array.Empty<string>()).Should().BeFalse();
        PublicEndpointAllowList.IsPublic("/health", Array.Empty<string>()).Should().BeTrue();
        PublicEndpointAllowList.IsPublic("/health/ready", Array.Empty<string>()).Should().BeTrue();
    }

    [Fact]
    public void EveryAllowListEntry_CarriesAJustification()
    {
        PublicEndpointAllowList.Rules.Should().NotBeEmpty();
        PublicEndpointAllowList.Rules.Should().AllSatisfy(rule =>
        {
            rule.Justification.Should().NotBeNullOrWhiteSpace();
            rule.Justification.Length.Should().BeGreaterThan(15);
            rule.Pattern.Should().StartWith("/");
        });
    }

    [Fact]
    public void AllowList_NeverCoversAnAdminRoute()
    {
        foreach (var rule in PublicEndpointAllowList.Rules)
        {
            foreach (var segment in PublicEndpointAllowList.NeverPublicSegments)
            {
                PublicEndpointAllowList.IsPublic($"{rule.Pattern.TrimEnd('*', '/')}/{segment}", new[] { "GET" })
                    .Should().BeFalse($"'{segment}' không bao giờ được công khai (rule {rule.Pattern})");
            }
        }
    }
}
