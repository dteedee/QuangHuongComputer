using BuildingBlocks.Security;
using Microsoft.AspNetCore.Authorization;

namespace ApiGateway.Startup;

/// <summary>
/// Đăng ký tầng phân quyền theo permission (W1-1).
///
/// Xác thực JWT nằm trong module Identity (<c>Identity.DependencyInjection.AddIdentityModule</c>).
/// Lớp này chỉ dựng policy để endpoint gọi <c>.RequireAuthorization(Permissions.X.Y)</c>
/// hoặc <c>.RequireModulePermissions(PermissionModules.X)</c>.
///
/// Ba việc nó làm:
/// 1. Mỗi permission trong <see cref="Permissions"/> -> một policy cùng tên.
/// 2. Hai policy chung: <see cref="SecurityPolicies.Authenticated"/> và
///    <see cref="SecurityPolicies.Staff"/>; <c>FallbackPolicy</c> chỉ bật khi cấu hình
///    cho phép (bật sớm là chặn luôn cả storefront công khai).
/// 3. Audit bảng route lúc khởi động (mặc định chỉ cảnh báo).
/// </summary>
public static class AuthenticationSetup
{
    public static void Configure(WebApplicationBuilder builder)
    {
        var enableFallback = builder.Configuration.GetValue<bool>(SecurityPolicies.FallbackPolicyEnabledKey);
        var failOnAuditViolation = builder.Configuration.GetValue<bool>(EndpointAuthorizationAuditor.FailOnViolationKey);

        builder.Services.AddAuthorization(options =>
        {
            // 1. Một policy cho mỗi permission. RequireAuthenticatedUser để request ẩn danh
            //    nhận 401 (đăng nhập lại) thay vì 403 (sai quyền) — FE phân biệt hai ca này.
            foreach (var permission in Permissions.GetAllPermissions())
            {
                options.AddPolicy(permission, policy =>
                {
                    policy.RequireAuthenticatedUser();
                    policy.Requirements.Add(new PermissionRequirement(permission));
                });
            }

            // 2. Policy chung.
            options.AddPolicy(SecurityPolicies.Authenticated, policy => policy.RequireAuthenticatedUser());
            options.AddPolicy(SecurityPolicies.Staff, policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.RequireRole(Roles.Staff);
            });

            if (enableFallback)
            {
                // Chỉ bật sau khi W1-10 quét xong toàn bộ endpoint (cổng W1-G).
                options.FallbackPolicy = options.GetPolicy(SecurityPolicies.Staff);
            }
        });

        builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

        builder.Services.AddHostedService(sp => new EndpointAuthorizationAuditor(
            sp,
            sp.GetRequiredService<ILogger<EndpointAuthorizationAuditor>>(),
            failOnAuditViolation));
    }
}
