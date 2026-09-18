namespace BuildingBlocks.Security;

/// <summary>Một mục trong danh sách endpoint công khai.</summary>
/// <param name="Pattern">Route pattern. <c>**</c> khớp phần còn lại, <c>*</c> hoặc <c>{...}</c> khớp đúng một đoạn.</param>
/// <param name="Methods">HTTP verb được phép ẩn danh. Rỗng = mọi verb.</param>
/// <param name="Justification">Lý do endpoint này không cần đăng nhập. BẮT BUỘC.</param>
public sealed record PublicEndpointRule(string Pattern, string[] Methods, string Justification);

/// <summary>
/// Danh sách TƯỜNG MINH những endpoint được phép truy cập khi chưa đăng nhập (W1-1).
/// Mọi endpoint khác phải có policy permission — <see cref="EndpointAuthorizationConvention"/>
/// coi việc thiếu policy là vi phạm.
///
/// Quy tắc bất di bất dịch: route chứa đoạn <c>admin</c> KHÔNG BAO GIỜ công khai,
/// kể cả khi trùng một pattern bên dưới (xem <see cref="NeverPublicSegments"/>).
/// Thêm mục mới phải kèm lý do; W1-10 gửi integration request, không tự sửa file này.
/// </summary>
public static class PublicEndpointAllowList
{
    /// <summary>Đoạn route không bao giờ được công khai, bất kể pattern nào khớp.</summary>
    public static readonly string[] NeverPublicSegments = { "admin", "backoffice", "internal" };

    private static readonly string[] Get = { "GET", "HEAD" };
    private static readonly string[] Post = { "POST" };
    /// <summary>Mọi verb — chỉ dùng cho endpoint thật sự không phân biệt verb (healthcheck).</summary>
    private static readonly string[] AnyMethod = Array.Empty<string>();

    public static readonly IReadOnlyList<PublicEndpointRule> Rules = new[]
    {
        // --- Hạ tầng vận hành ---
        // MapHealthChecks không gắn HttpMethodMetadata (endpoint trả lời mọi verb) nên rule
        // phải là AnyMethod; nếu để Get thì IsPublic() sẽ loại nó ra sau khi siết verb.
        new PublicEndpointRule("/health", AnyMethod, "Docker/monitor healthcheck — không có danh tính, chỉ trả trạng thái."),
        new PublicEndpointRule("/health/**", AnyMethod, "Biến thể ready/live của healthcheck ở Program.cs:69-78."),
        new PublicEndpointRule("/swagger/**", Get, "Swagger UI, chỉ bật ở môi trường Development."),

        // --- Đăng nhập / khôi phục mật khẩu: bản chất phải ẩn danh ---
        new PublicEndpointRule("/api/auth/login", Post, "Không thể yêu cầu token để lấy token. Có rate limit riêng."),
        new PublicEndpointRule("/api/auth/register", Post, "Khách tự đăng ký tài khoản."),
        new PublicEndpointRule("/api/auth/refresh-token", Post, "Access token đã hết hạn nên không gửi kèm được."),
        new PublicEndpointRule("/api/auth/logout", Post, "Thu hồi refresh token; token truy cập có thể đã hết hạn."),
        new PublicEndpointRule("/api/auth/google", Post, "Đăng nhập Google, xác thực bằng id_token của Google."),
        new PublicEndpointRule("/api/auth/forgot-password", Post, "Người dùng mất mật khẩu nên không đăng nhập được."),
        new PublicEndpointRule("/api/auth/reset-password", Post, "Xác thực bằng token gửi qua email, không bằng JWT."),

        // --- Storefront: chỉ ĐỌC, và chỉ nhánh không chứa 'admin' ---
        new PublicEndpointRule("/api/catalog/**", Get, "Danh mục sản phẩm là mặt tiền cửa hàng; chỉ GET."),
        new PublicEndpointRule("/api/content/**", Get, "Trang tĩnh, bài viết, banner hiển thị cho khách; chỉ GET."),
        new PublicEndpointRule("/api/promotions", Get, "Danh sách khuyến mãi đang chạy hiển thị trên storefront."),
        new PublicEndpointRule("/api/promotions/{code}", Get, "Tra cứu một mã khuyến mãi trước khi đăng nhập."),
        new PublicEndpointRule("/api/stores", Get, "D09: danh sách cửa hàng/địa chỉ liên hệ công khai."),
        new PublicEndpointRule("/api/stores/{id}", Get, "D09: chi tiết một cửa hàng."),
        new PublicEndpointRule("/api/ai/recommendations/**", Get, "Gợi ý sản phẩm cho khách vãng lai."),

        // --- Tra cứu tự phục vụ (bí mật nằm ở serial/mã đơn, không ở JWT) ---
        new PublicEndpointRule("/api/public/warranty/lookup", Get, "Tra bảo hành bằng số serial in trên máy."),
        new PublicEndpointRule("/api/public/warranty/lookup-by-phone", Get, "Tra bảo hành bằng SĐT đã mua hàng."),

        // --- Mua hàng không cần tài khoản ---
        new PublicEndpointRule("/api/sales/public/guest-checkout", Post, "Đặt hàng không cần tài khoản (SalesEndpoints.cs:36)."),
        // KHÔNG mở cả /api/shipping/** : cây đó còn create-shipment (staff, ShippingEndpoints.cs:78)
        // và tracking/{orderId} (đã đăng nhập, :95). Mở rộng sẽ nuốt luôn hai endpoint đó khỏi
        // báo cáo vi phạm và biến chúng thành công khai.
        new PublicEndpointRule("/api/shipping/calculate-fee", Post, "Tính phí ship ở trang giỏ hàng trước khi đăng nhập (ShippingEndpoints.cs:21)."),
        new PublicEndpointRule("/api/shipping/webhook", Post, "GHN gọi vào, xác thực bằng token/chữ ký chứ không bằng JWT (ShippingEndpoints.cs:100-163)."),
        new PublicEndpointRule("/api/payments/methods", Get, "Liệt kê phương thức thanh toán ở trang giỏ hàng (PaymentMethodsEndpoint.cs:33)."),

        // --- Webhook nhà cung cấp: xác thực bằng chữ ký, không bằng JWT ---
        new PublicEndpointRule("/api/payments/v2/sepay/webhook", Post, "D04: SePay gọi vào, ký HMAC (SePayWebhookEndpoint.cs:151)."),
        new PublicEndpointRule("/api/payments/v2/momo/callback", Post, "D04: MoMo IPN, ký HMAC (MoMoWebhookEndpoint.cs:98)."),
        new PublicEndpointRule("/api/payments/v2/vnpay/callback", Get, "D04: VNPay redirect người dùng về kèm chữ ký (VnPayWebhookEndpoint.cs:78)."),

        // --- Marketing ---
        new PublicEndpointRule("/api/communication/newsletter/subscribe", Post, "Đăng ký nhận tin từ footer storefront."),
        new PublicEndpointRule("/api/communication/newsletter/unsubscribe", Post, "Huỷ nhận tin từ link trong email, người dùng không đăng nhập."),
    };

    /// <summary>Endpoint này có được phép ẩn danh không?</summary>
    public static bool IsPublic(string? routePattern, IEnumerable<string> httpMethods)
    {
        if (string.IsNullOrWhiteSpace(routePattern)) return false;

        var path = "/" + routePattern.Trim('/');
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Any(s => NeverPublicSegments.Contains(s, StringComparer.OrdinalIgnoreCase)))
            return false;

        var methods = httpMethods.ToList();
        // Endpoint KHÔNG khai báo verb (app.Map(...)) trả lời mọi verb — chỉ công khai được
        // nếu rule cũng cho phép mọi verb. Trước đây `methods.Count == 0` làm nó khớp cả
        // rule chỉ-GET, tức là một `app.Map("/api/catalog/reindex", ...)` sẽ thành công khai.
        return Rules.Any(rule =>
            Matches(rule.Pattern, segments) &&
            (rule.Methods.Length == 0 ||
             (methods.Count > 0 && methods.All(m => rule.Methods.Contains(m, StringComparer.OrdinalIgnoreCase)))));
    }

    /// <summary>Quy tắc đầu tiên khớp (để báo cáo lý do).</summary>
    public static PublicEndpointRule? FindRule(string? routePattern) =>
        string.IsNullOrWhiteSpace(routePattern)
            ? null
            : Rules.FirstOrDefault(r => Matches(r.Pattern, routePattern.Split('/', StringSplitOptions.RemoveEmptyEntries)));

    private static bool Matches(string pattern, string[] pathSegments)
    {
        var patternSegments = pattern.Split('/', StringSplitOptions.RemoveEmptyEntries);

        for (var i = 0; i < patternSegments.Length; i++)
        {
            if (patternSegments[i] == "**")
                return pathSegments.Length >= i; // '**' nuốt phần còn lại (kể cả rỗng)

            if (i >= pathSegments.Length) return false;

            var p = patternSegments[i];
            var isWildcard = p == "*" || (p.StartsWith('{') && p.EndsWith('}'));
            if (!isWildcard && !string.Equals(p, pathSegments[i], StringComparison.OrdinalIgnoreCase))
                return false;
        }

        return patternSegments.Length == pathSegments.Length;
    }
}
