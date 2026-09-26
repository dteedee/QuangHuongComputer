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
        // Đã có /api/catalog/** phủ; ghi riêng vì đây là mục DUY NHẤT dưới catalog đọc dữ liệu Sales.
        new PublicEndpointRule("/api/catalog/products/{productId}/bought-together", Get, "Gợi ý 'Thường được mua cùng' trên trang sản phẩm/giỏ: chỉ sản phẩm đã đăng web + SỐ ĐƠN tổng hợp (ICoPurchaseQuery), không mã đơn, không khách; cache 3 giờ (CatalogBoughtTogetherEndpoints.cs:27-44)."),
        new PublicEndpointRule("/api/content/**", Get, "Trang tĩnh, bài viết, banner hiển thị cho khách; chỉ GET."),
        new PublicEndpointRule("/api/promotions", Get, "Danh sách khuyến mãi đang chạy hiển thị trên storefront."),
        new PublicEndpointRule("/api/promotions/{code}", Get, "Xem một khuyến mãi ĐANG CHẠY (Promotion.RunningPredicate); nháp/tạm dừng -> 404, nhân viên dùng /admin/{id}."),
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

        // ============================ W4-5: 38 endpoint còn lại ============================
        // Mỗi mục dưới đây đã được ĐỌC HANDLER trước khi thêm, không mục nào là "đóng dấu cho qua".
        // Mục nào cần chặn thêm thì chặn ở handler/rate-limit TRƯỚC, rồi mới ghi vào đây.

        // --- SEO / hạ tầng render cho bot ---
        new PublicEndpointRule("/_shell/**", Get, "Shell HTML cho bot tìm kiếm, chỉ đọc dữ liệu đã công khai (SeoShellEndpoints.cs:19-21)."),
        new PublicEndpointRule("/sitemap.xml", Get, "Sitemap cho bot; sinh từ cùng provider với trang công khai (SeoShellEndpoints.cs:23-25)."),
        new PublicEndpointRule("/robots.txt", Get, "robots.txt cho bot (SeoShellEndpoints.cs:27-29)."),

        // --- Đăng nhập: bước 2 bắt buộc ẩn danh ---
        new PublicEndpointRule("/api/auth/login/2fa", Post, "Bước 2 của đăng nhập: bước 1 CHƯA phát token nào. Đầu vào là challengeToken (không phải email) nên không dò được tài khoản; rate limit 'auth' (TwoFactorLoginEndpoint.cs:94-99)."),

        // --- Cấu hình / nội dung storefront ---
        new PublicEndpointRule("/api/config/public", Get, "Danh sách TRẮNG khoá cấu hình storefront (SystemConfigPublicEndpointsKeys), chặn thêm ValueType=Secret (SystemConfigEndpoints.cs:68-95)."),
        new PublicEndpointRule("/api/content/contact", Post, "Form liên hệ storefront; rate limit 'contact' 5/phút/IP (ContentEndpoints.cs:317-341)."),

        // --- PC Builder: chỉ đọc catalog đã đăng web, POST vì payload là cả cấu hình ---
        new PublicEndpointRule("/api/catalog/pc-builder/check", Post, "Kiểm tra tương thích cấu hình đang lắp; chỉ đọc, không ghi (PcBuilderCheckEndpoint.cs:20-22)."),
        new PublicEndpointRule("/api/catalog/pc-builder/suggest", Post, "Gợi ý theo ngân sách, rule-based trên catalog công khai (PcBuilderSuggestEndpoint.cs:26-28)."),

        // --- AI storefront ---
        new PublicEndpointRule("/api/ai/chat", Post, "Chatbot cho khách vãng lai; MỖI LƯỢT GỌI TỐN TIỀN nhà cung cấp -> rate limit 'ai' 20/phút/IP (AiEndpoints.cs:16-29)."),
        new PublicEndpointRule("/api/ai/search", Post, "Ô tìm kiếm storefront. Thực chất là ILIKE trên CatalogDb (KHÔNG gọi nhà cung cấp AI), nhưng vẫn rate limit 'lookup' vì là POST ẩn danh tốn CPU/DB (SemanticSearchEndpoints.cs:22-27)."),

        // --- Tra cứu mã giảm giá / ưu đãi trước khi đăng nhập ---
        new PublicEndpointRule("/api/coupons/apply", Get, "Alias cũ của tra mã giảm giá ở giỏ hàng. PHÂN BIỆT mã thật/mã sai nên là oracle dò mã -> rate limit 'lookup' (PromotionEndpoints.cs:234-266)."),
        new PublicEndpointRule("/api/promotions/evaluate", Post, "Xem trước ưu đãi cho giỏ chưa đặt; không ghi DB. Cảnh báo lỗi coupon là oracle dò mã -> rate limit 'lookup' (PromotionPreviewEndpoints.cs:24-26)."),

        // --- Email marketing: bí mật nằm ở trackingId trong link, người nhận chưa đăng nhập ---
        new PublicEndpointRule("/api/crm/track/open/{trackingId}", Get, "Pixel 1x1 đo tỉ lệ mở email (CrmEndpoints.cs:1100-1115)."),
        new PublicEndpointRule("/api/crm/track/click/{trackingId}", Get, "Link trong email; đích redirect qua allow-list host, chống open redirect (CrmEndpoints.cs:1117-1136)."),
        new PublicEndpointRule("/api/crm/unsubscribe/{trackingId}", Get, "Huỷ nhận email từ link; chỉ tác động đúng trackingId trong link (CrmEndpoints.cs:1138-1145)."),

        // --- Tồn kho hiển thị trên storefront (quyết định D09) ---
        // ĐÃ KIỂM: cả ba chỉ trả QuantityOnHand/Reserved của kho BÁN ĐƯỢC. KHÔNG có AverageCost,
        // KHÔNG có nhà cung cấp, KHÔNG có kho nội bộ (lọc Branch/Showroom).
        new PublicEndpointRule("/api/inventory/products/{productId}/stock", Get, "Tồn khả dụng của 1 sản phẩm; không giá vốn, không nhà cung cấp (StockEndpoints.cs:72-83)."),
        new PublicEndpointRule("/api/inventory/products/{productId}/variants/{variantId}/stock", Get, "Như trên, theo biến thể (StockEndpoints.cs:85-96)."),
        new PublicEndpointRule("/api/inventory/products/{productId}/stock-by-branch", Get, "Tồn theo chi nhánh; chỉ kho Branch/Showroom và chỉ địa chỉ/SĐT cửa hàng vốn đã công khai ở /api/stores (StockEndpoints.cs:99-134)."),
        new PublicEndpointRule("/api/stores/{id}/stock/{productId}", Get, "Còn/Sắp hết/Hết tại một chi nhánh — KHÔNG trả số lượng chính xác (StoreEndpoints.cs:57-75)."),

        // --- Thanh toán cho khách vãng lai: xác thực bằng token ký sẵn, không bằng JWT ---
        // ĐÃ KIỂM: mọi route đều gọi RequireToken(token, orderId) — token HMAC chỉ mở ĐÚNG MỘT đơn,
        // chưa cấu hình secret thì 503, token trỏ sang đơn khác thì 401. Không tạo được intent cho
        // đơn tuỳ ý. Số tiền đọc từ đơn phía server, DTO không có trường Amount.
        new PublicEndpointRule("/api/payments/guest/initiate", Post, "Khách vãng lai trả tiền đơn của mình; token ký sẵn gắn đúng 1 orderId (PaymentGuestEndpoints.cs:27-42)."),
        new PublicEndpointRule("/api/payments/guest/{id}", Get, "Trạng thái giao dịch, cùng token ký sẵn (PaymentGuestEndpoints.cs:44-55)."),
        new PublicEndpointRule("/api/payments/guest/{id}/qr.png", Get, "Ảnh QR của giao dịch, cùng token ký sẵn (PaymentGuestEndpoints.cs:57-68)."),
        new PublicEndpointRule("/api/payments/v2/vnpay/ipn", Get, "Máy chủ VNPay gọi vào; xác thực bằng chữ ký HashSecret, chưa cấu hình thì 503 (VnPayGatewayEndpoints.cs:33-56)."),
        new PublicEndpointRule("/api/payments/v2/vnpay/return", Get, "Trình duyệt khách quay về; KHÔNG ghi DB (handler không nhận DbContext/bus), chữ ký sai thì không tiết lộ gì (VnPayGatewayEndpoints.cs:58-88)."),

        // --- Tuyển dụng ---
        new PublicEndpointRule("/api/recruitment", Get, "Tin tuyển dụng đang mở (HREndpoints.cs:35-42)."),
        new PublicEndpointRule("/api/recruitment/{id}", Get, "Chi tiết tin tuyển dụng; W4-5 đã lọc Active + chưa hết hạn để bản nháp không lộ (HREndpoints.cs:44-56)."),

        // --- Mua hàng / tra cứu không cần tài khoản ---
        new PublicEndpointRule("/api/sales/public/cart", Get, "Giỏ vãng lai, khoá bằng cookie qh_aid HttpOnly ngẫu nhiên (GuestCartEndpoints.cs:30-46)."),
        new PublicEndpointRule("/api/sales/public/cart/items", Post, "Thêm hàng vào giỏ vãng lai; GIÁ KHÔNG lấy từ client, chốt đơn đọc lại giá thật (GuestCartEndpoints.cs:48-60)."),
        new PublicEndpointRule("/api/sales/public/orders/track", Get, "Tra đơn bằng mã đơn VÀ số điện thoại (hai yếu tố, sai một trong hai trả cùng 404); rate limit 'lookup' (GuestOrderTrackingEndpoints.cs:25-80)."),
        new PublicEndpointRule("/api/sales/return-policies/effective", Get, "Chính sách đổi trả áp cho 1 sản phẩm — tham số chính sách, không PII (ReturnPolicyEndpoints.cs:80-122)."),
        new PublicEndpointRule("/api/sales/return-policies/public-matrix", Get, "Bảng chính sách đổi trả trên trang 'Chính sách' (ReturnPolicyEndpoints.cs:124-140)."),
        new PublicEndpointRule("/api/sales/shipping/provinces", Get, "Dữ liệu tham chiếu tỉnh/thành tĩnh (ShippingAddressEndpoints.cs:33-38)."),
        new PublicEndpointRule("/api/sales/shipping/provinces/{code}/wards", Get, "Dữ liệu tham chiếu xã/phường tĩnh (ShippingAddressEndpoints.cs:40-48)."),
        new PublicEndpointRule("/api/sales/shipping/quote", Post, "Phí ship ở trang giỏ hàng trước khi đăng nhập; phí do server tính, client không gửi phí (ShippingQuoteEndpoints.cs:24-42)."),

        // --- Sửa chữa / bảo hành: tra cứu tự phục vụ + tham số chính sách ---
        new PublicEndpointRule("/api/repair/onsite-fee", Get, "Phí tận nơi niêm yết; 2 con số từ cấu hình, không đọc DB (PublicTrackingEndpoints.cs:22-31)."),
        new PublicEndpointRule("/api/repair/track/{ticketNumber}", Get, "Tra phiếu sửa bằng mã phiếu VÀ số điện thoại; sai một trong hai trả cùng 404; rate limit 'contact' (PublicTrackingEndpoints.cs:35-85)."),
        new PublicEndpointRule("/api/warranty/policies/effective", Get, "Số tháng bảo hành áp cho 1 sản phẩm, không hồ sơ bảo hành, không PII (policy-endpoints.cs:27-43)."),
        new PublicEndpointRule("/api/warranty/policies/public-matrix", Get, "Ma trận chính sách bảo hành trên trang 'Chính sách' (policy-endpoints.cs:45-62)."),
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
