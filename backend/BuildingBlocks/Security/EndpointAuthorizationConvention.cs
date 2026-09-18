using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace BuildingBlocks.Security;

public enum AuthorizationViolationKind
{
    /// <summary>Không có metadata phân quyền nào và không nằm trong allow-list công khai.</summary>
    Missing,
    /// <summary>Chỉ <c>RequireAuthorization()</c> trống — ai đăng nhập cũng vào được, kể cả khách hàng.</summary>
    AuthenticatedOnly,
    /// <summary>Phân quyền theo tên role thay vì permission policy.</summary>
    RoleBased,
    /// <summary>Đánh dấu <c>AllowAnonymous</c> nhưng không có trong allow-list công khai.</summary>
    UndeclaredAnonymous
}

public sealed record EndpointAuthorizationViolation(
    string DisplayName,
    string? RoutePattern,
    string Methods,
    AuthorizationViolationKind Kind,
    string Detail);

/// <summary>
/// Luật "fail-closed" của W1-1: MỌI endpoint phải hoặc nằm trong
/// <see cref="PublicEndpointAllowList"/>, hoặc mang một policy permission có tên.
/// <see cref="Analyze"/> là hàm thuần, không phụ thuộc host — nhờ vậy vừa unit-test
/// được với tập endpoint giả, vừa chạy được trên <see cref="EndpointDataSource"/> thật.
/// </summary>
public static class EndpointAuthorizationConvention
{
    public static IReadOnlyList<EndpointAuthorizationViolation> Analyze(IEnumerable<Endpoint> endpoints)
    {
        var violations = new List<EndpointAuthorizationViolation>();

        foreach (var endpoint in endpoints)
        {
            var routePattern = (endpoint as RouteEndpoint)?.RoutePattern.RawText;
            var methods = endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods
                          ?? (IReadOnlyList<string>)Array.Empty<string>();
            var isPublic = PublicEndpointAllowList.IsPublic(routePattern, methods);

            var allowAnonymous = endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null;
            var authorizeData = endpoint.Metadata.OfType<IAuthorizeData>().ToList();

            if (allowAnonymous)
            {
                if (!isPublic)
                {
                    violations.Add(Violation(endpoint, routePattern, methods, AuthorizationViolationKind.UndeclaredAnonymous,
                        "AllowAnonymous nhưng không có trong PublicEndpointAllowList."));
                }
                continue;
            }

            if (isPublic) continue;

            if (authorizeData.Count == 0)
            {
                violations.Add(Violation(endpoint, routePattern, methods, AuthorizationViolationKind.Missing,
                    "Không có metadata phân quyền nào."));
                continue;
            }

            if (authorizeData.Any(a => !string.IsNullOrWhiteSpace(a.Policy))) continue;

            var roles = authorizeData
                .Select(a => a.Roles)
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .ToList();

            if (roles.Count > 0)
            {
                violations.Add(Violation(endpoint, routePattern, methods, AuthorizationViolationKind.RoleBased,
                    $"Phân quyền theo role ({string.Join("|", roles)}); phải đổi sang policy permission."));
            }
            else
            {
                violations.Add(Violation(endpoint, routePattern, methods, AuthorizationViolationKind.AuthenticatedOnly,
                    "RequireAuthorization() trống — mọi tài khoản đăng nhập đều vào được."));
            }
        }

        return violations;
    }

    private static EndpointAuthorizationViolation Violation(
        Endpoint endpoint, string? routePattern, IReadOnlyList<string> methods,
        AuthorizationViolationKind kind, string detail) =>
        new(endpoint.DisplayName ?? routePattern ?? "(unnamed endpoint)",
            routePattern,
            methods.Count == 0 ? "*" : string.Join(",", methods),
            kind,
            detail);

    /// <summary>Tóm tắt một dòng cho log/báo cáo.</summary>
    public static string Describe(EndpointAuthorizationViolation v) =>
        $"{v.Methods} {v.RoutePattern ?? v.DisplayName} [{v.Kind}] {v.Detail}";
}
