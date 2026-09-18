namespace BuildingBlocks.Security;

/// <summary>
/// Tên các policy KHÔNG phải permission. Mọi policy còn lại trùng tên với chính
/// permission key (xem <c>ApiGateway/Startup/AuthenticationSetup.cs</c>).
/// </summary>
public static class SecurityPolicies
{
    /// <summary>
    /// Lưới an toàn: người dùng đã đăng nhập VÀ thuộc một role nhân viên nội bộ
    /// (<see cref="Roles.Staff"/>). Dùng làm <c>FallbackPolicy</c> khi bật
    /// <c>Security:FallbackPolicy:Enabled</c>, và cho vài endpoint back-office chung
    /// chưa quy được về một module cụ thể. KHÔNG dùng thay cho permission policy.
    /// </summary>
    public const string Staff = "Policy.Staff";

    /// <summary>Chỉ cần đăng nhập — dành cho endpoint "của chính tôi" (/me, đơn của tôi...).</summary>
    public const string Authenticated = "Policy.Authenticated";

    public const string FallbackPolicyEnabledKey = "Security:FallbackPolicy:Enabled";
}
