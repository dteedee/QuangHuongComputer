using Microsoft.Extensions.Configuration;

namespace Sales.Application.Pos;

/// <summary>
/// TRẦN GIẢM GIÁ TAY ở quầy (IR w2#10 + phase-48 §Security Considerations).
///
/// Lỗ hổng được vá: <c>CheckoutRequestGuard</c> chỉ đòi <c>ApprovedBy</c> khác rỗng, còn
/// <c>/api/sales/staff-checkout</c> điền chính user id của người gọi — nên "phải có người duyệt"
/// luôn được thoả bằng cách TỰ DUYỆT, và không có trần nào cả (`manualDiscount` chỉ cần >= 0).
/// Một thu ngân có quyền <c>Sales.Pos</c> giảm được mọi đơn về 0đ.
///
/// Quy tắc ở đây:
///  1. Giảm tay không bao giờ vượt <c>Pos:ManualDiscountPercentCap</c> % của tạm tính (mặc định 10%).
///  2. Trong hạn mức tự duyệt (<c>Pos:SelfApproveLimit</c>, mặc định 200.000đ) thu ngân tự quyết.
///  3. Trên hạn mức đó phải có NGƯỜI DUYỆT KHÁC thu ngân; tự điền id của mình bị từ chối.
/// </summary>
public static class PosManualDiscountPolicy
{
    public const decimal DefaultPercentCap = 10m;
    public const decimal DefaultSelfApproveLimit = 200_000m;

    public sealed record Decision(decimal Allowed, string? Error, string? Warning);

    public static decimal PercentCap(IConfiguration config)
        => Read(config, "Pos:ManualDiscountPercentCap", DefaultPercentCap, 0m, 100m);

    public static decimal SelfApproveLimit(IConfiguration config)
        => Read(config, "Pos:SelfApproveLimit", DefaultSelfApproveLimit, 0m, decimal.MaxValue);

    /// <summary>
    /// Trả về số tiền giảm ĐƯỢC PHÉP. <paramref name="requested"/> vượt trần % thì bị cắt xuống
    /// trần (kèm cảnh báo hiện trên màn hình quầy) — cắt chứ không từ chối, vì thu ngân đã đọc
    /// số cho khách rồi và một lỗi 400 ở bước này chỉ làm hàng đợi dài thêm.
    /// Thiếu người duyệt hợp lệ thì TỪ CHỐI: đó là chốt chặn chống gian lận, không phải tiện ích.
    /// </summary>
    public static Decision Evaluate(
        decimal requested, decimal subtotal, string? approvedBy, string cashierId, IConfiguration config)
    {
        if (requested <= 0m) return new Decision(0m, null, null);

        var cap = Math.Round(subtotal * PercentCap(config) / 100m, 0, MidpointRounding.AwayFromZero);
        var allowed = requested;
        string? warning = null;

        if (allowed > cap)
        {
            warning = $"Giảm giá tay bị cắt từ {requested:#,##0}đ xuống trần {cap:#,##0}đ "
                      + $"({PercentCap(config):0.#}% tạm tính).";
            allowed = cap;
        }

        if (allowed > SelfApproveLimit(config))
        {
            if (string.IsNullOrWhiteSpace(approvedBy))
                return new Decision(0m,
                    $"Giảm giá trên {SelfApproveLimit(config):#,##0}đ phải có quản lý duyệt.", warning);

            if (string.Equals(approvedBy.Trim(), cashierId, StringComparison.OrdinalIgnoreCase))
                return new Decision(0m,
                    "Người duyệt giảm giá phải khác thu ngân — không được tự duyệt.", warning);
        }

        return new Decision(allowed, null, warning);
    }

    private static decimal Read(IConfiguration config, string key, decimal fallback, decimal min, decimal max)
    {
        var raw = config[key];
        if (string.IsNullOrWhiteSpace(raw) || !decimal.TryParse(raw, out var value)) return fallback;
        if (value < min || value > max) return fallback;
        return value;
    }
}
