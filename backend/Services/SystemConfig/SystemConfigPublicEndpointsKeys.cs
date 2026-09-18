namespace SystemConfig;

/// <summary>
/// W1-10 — DANH SÁCH TRẮNG (allow-list) các khoá cấu hình được phép trả về cho người dùng
/// CHƯA ĐĂNG NHẬP qua <c>GET /api/config/public</c>.
///
/// Trước đây endpoint dùng danh sách ĐEN (loại bỏ vài category "nhạy cảm"), nên mọi khoá mới
/// seed vào một category chưa có trong danh sách đen sẽ tự động lộ ra Internet
/// (finding <c>audit-be-identity-config-platform-11</c>, nửa "exposure"). Đảo lại thành
/// allow-list: khoá nào không có tên ở đây thì KHÔNG bao giờ ra public, dù thuộc category nào.
///
/// Thêm khoá mới vào đây phải trả lời được: storefront (khách vãng lai) có thật sự cần không?
/// Nếu chỉ back-office dùng thì để nguyên — <c>GET /api/config</c> (Admin) vẫn trả đủ.
/// </summary>
public static class SystemConfigPublicEndpointsKeys
{
    /// <summary>
    /// Khoá công khai, đối chiếu chính xác (phân biệt chữ hoa/thường như trong DB).
    /// Nguồn: quét frontend 2026-09-18 (Footer, ContactPage, ThemeContext, use-company-info,
    /// product-buying-guide-tab) + danh mục thật trong bảng <c>config.Configurations</c>.
    /// </summary>
    public static readonly IReadOnlySet<string> Keys = new HashSet<string>(StringComparer.Ordinal)
    {
        // --- Thông tin doanh nghiệp: hiển thị ở footer, trang liên hệ, hoá đơn ---
        "COMPANY_NAME", "COMPANY_NAME_EN", "COMPANY_SHORT_NAME", "COMPANY_LEGAL_NAME",
        "COMPANY_ADDRESS", "COMPANY_TAX_ADDRESS", "COMPANY_TAX_CODE", "COMPANY_REPRESENTATIVE",
        "COMPANY_PHONE", "COMPANY_PHONE_2", "COMPANY_HOTLINE", "COMPANY_EMAIL", "COMPANY_WEBSITE",
        "COMPANY_WORKING_HOURS", "COMPANY_BUSINESS_HOURS", "COMPANY_ESTABLISHED_DATE",
        "COMPANY_SINCE", "COMPANY_BRAND_TEXT_1", "COMPANY_BRAND_TEXT_2",
        // Số tài khoản NHẬN tiền của cửa hàng — in trên hướng dẫn chuyển khoản, không phải bí mật.
        "COMPANY_BANK_ACCOUNT",

        // --- Mạng xã hội (link ở footer) ---
        "FACEBOOK_PAGE", "FACEBOOK_URL", "YOUTUBE_CHANNEL", "YOUTUBE_URL", "ZALO_OA", "ZALO_URL",

        // --- Giao diện: màu nhấn + logo, ThemeContext đọc ngay khi tải trang ---
        "theme.accentPrimary", "theme.accentPrimaryHover", "theme.logoUrl",

        // --- Điều kiện bán hàng hiển thị cho khách ở trang sản phẩm/giỏ hàng ---
        "SHIPPING_COST", "FREESHIP_THRESHOLD", "MIN_ORDER_VALUE", "RETURN_WINDOW_DAYS",
        "LOYALTY_POINTS_RATE",
        // D01: giá đã gồm VAT — thuế suất hiển thị công khai trên hoá đơn/giỏ hàng.
        "TAX_RATE",

        // --- Bảng giá/SLA dịch vụ sửa chữa công bố trên trang đặt lịch ---
        "DIAGNOSIS_FEE", "EXPRESS_REPAIR_FEE", "EXPRESS_REPAIR_SLA_HOURS",
        "STANDARD_REPAIR_SLA_HOURS", "WARRANTY_REPAIR_DAYS",

        // --- Bật/tắt widget chatbot ở storefront (chỉ cờ bật/tắt, không kèm tham số model) ---
        "AI_ENABLED",
    };

    /// <summary>
    /// Khoá cache Redis của <c>GET /api/config/public</c>, kèm dấu vân tay của <see cref="Keys"/>.
    ///
    /// Không có code nào xoá cache này (TTL 1 giờ là đường duy nhất để nó hết hạn), nên nếu khoá
    /// cache đứng yên thì mọi lần siết allow-list đều fail-open tới 1 giờ sau khi triển khai —
    /// đã đo được trên :5050 ngày 2026-09-18. Đưa hash của allow-list vào tên khoá: allow-list đổi
    /// => tên khoá đổi => bản cache cũ (rộng hơn) không bao giờ được đọc nữa.
    /// </summary>
    public static readonly string CacheKey = "cache:systemconfigs:public:" + Fingerprint();

    private static string Fingerprint()
    {
        var joined = string.Join(",", Keys.OrderBy(k => k, StringComparer.Ordinal));
        var hash = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(joined));
        return Convert.ToHexString(hash, 0, 6).ToLowerInvariant();
    }

    // CỐ TÌNH KHÔNG công khai (ghi lại để lần sau không ai "thêm cho đủ"):
    //   COMMISSION_RATE, MAX_DISCOUNT_PERCENT, SPARE_PARTS_MARKUP  -> biên lợi nhuận nội bộ
    //   toàn bộ category Security (IP_WHITELIST, MAX_LOGIN_ATTEMPTS, PASSWORD_MIN_LENGTH,
    //     REQUIRE_2FA_FOR_ADMIN, SESSION_TIMEOUT_MINUTES)          -> lộ bề mặt tấn công
    //   toàn bộ category HR & Payroll và Tax (TAX_BASE_SALARY...)  -> lương/thuế nội bộ (D06)
    //   AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS                    -> chi tiết nhà cung cấp AI
    //   Notifications (EMAIL/SMS/PUSH_NOTIFICATIONS)               -> cấu hình vận hành
}
