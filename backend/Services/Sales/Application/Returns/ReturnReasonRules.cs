using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Application.Returns;

/// <summary>
/// D08 — MA TRẬN LÝ DO TRẢ HÀNG. Quyết định hai câu hỏi: còn hạn trả không, và khấu trừ bao nhiêu.
///
/// Điểm cốt lõi mà bản cũ làm sai: nó đọc <c>RestockingFeePercent</c> cho MỌI lý do và trừ cứng
/// 20% (<c>baseAmount * 0.8m</c>) khi thiếu phụ kiện. Theo D08 chỉ DUY NHẤT
/// <see cref="ReturnReasonCode.ChangeOfMind"/> (đổi ý) được phép mang phí. Hàng lỗi, giao sai,
/// hỏng do vận chuyển, không đúng mô tả, thiếu thông tin — tất cả là nghĩa vụ của người bán,
/// khấu trừ 0%, KHÔNG đọc chính sách. Trừ tiền khách trong những ca đó là trừ sai luật.
///
/// Hạn trả:
///  · <c>WrongItem</c> / <c>NotAsDescribed</c>: KHÔNG có hạn. Nghĩa vụ nhận lại hàng theo Luật
///    Thương mại điện tử 2025 không kèm thời hạn, nên đặt trần là hạn chế một nghĩa vụ luật định
///    (vô hiệu). Chạy đến hết bảo hành sản phẩm (<c>DaysForStatutoryReturn = 0</c> ⇒ không giới hạn).
///  · <c>InfoDefect</c>: bỏ qua MỌI cửa sổ thời gian, phí 0%, phải có quản lý duyệt.
///  · <c>DefectiveTechnical</c>: đi vào luồng BẢO HÀNH, phí 0%.
///  · <c>ChangeOfMind</c>: cửa sổ mua lại tự nguyện <c>DaysForReturn</c>, tính từ NGÀY GIAO
///    (<c>DeliveredAt</c>) chứ không phải ngày đặt — đơn đặt trước có thể giao sau hàng tuần.
/// </summary>
public static class ReturnReasonRules
{
    public sealed record Assessment(
        bool Allowed,
        string? Reason,
        decimal FeePercent,
        bool RequiresManagerApproval,
        bool RoutesToWarranty,
        DateTime? Deadline);

    /// <summary>Lý do này có bị cửa sổ đổi ý giới hạn không.</summary>
    public static bool IsVoluntary(ReturnReasonCode code) => code == ReturnReasonCode.ChangeOfMind;

    /// <summary>Phí khấu trừ (%). Chỉ đổi ý mới có phí — D08.</summary>
    public static decimal FeePercent(
        ReturnReasonCode code, ReceivedCondition? condition, EffectiveReturnPolicy policy)
    {
        if (!IsVoluntary(code)) return 0m;

        return condition switch
        {
            ReceivedCondition.Intact => 0m,
            ReceivedCondition.UsedGood => policy.RestockingFeePercent,
            ReceivedCondition.MissingAccessories =>
                policy.RestockingFeePercent + policy.MissingAccessoriesFeePercent,
            ReceivedCondition.UserDamage => 100m, // từ chối hoàn — chỉ quản lý override được
            _ => 0m,
        };
    }

    /// <summary>
    /// Đánh giá một yêu cầu trả hàng: được phép không, hạn đến khi nào, phí bao nhiêu.
    /// <paramref name="deliveredAt"/> null nghĩa là đơn CHƯA GIAO — chưa giao thì chưa trả được.
    /// </summary>
    public static Assessment Assess(
        ReturnReasonCode code,
        ReturnType type,
        EffectiveReturnPolicy? policy,
        bool productExcluded,
        int warrantyMonths,
        DateTime? deliveredAt,
        DateTime now)
    {
        if (policy == null)
            return Deny("Không có chính sách đổi trả áp dụng cho sản phẩm này.");

        if (!deliveredAt.HasValue)
            return Deny("Đơn chưa được giao nên chưa phát sinh quyền đổi trả.");

        // Thiếu thông tin / sai thông tin sản phẩm: bỏ qua mọi cửa sổ, 0%, cần quản lý duyệt.
        if (code == ReturnReasonCode.InfoDefect)
            return new Assessment(true, null, 0m, RequiresManagerApproval: true, false, null);

        if (code == ReturnReasonCode.DefectiveTechnical)
            return new Assessment(true, null, 0m, false, RoutesToWarranty: true,
                Deadline: warrantyMonths > 0 ? deliveredAt.Value.AddMonths(warrantyMonths) : null);

        // Nghĩa vụ nhận lại hàng theo luật — không có hạn do người bán đặt ra.
        if (code is ReturnReasonCode.WrongItem or ReturnReasonCode.NotAsDescribed)
        {
            var statutoryDays = policy.DaysForStatutoryReturn;
            var deadline = statutoryDays > 0
                ? deliveredAt.Value.AddDays(statutoryDays)
                : warrantyMonths > 0 ? deliveredAt.Value.AddMonths(warrantyMonths) : (DateTime?)null;

            if (deadline.HasValue && now > deadline.Value)
                return Deny($"Đã quá hạn nhận lại hàng ({deadline.Value:dd/MM/yyyy}).");

            return new Assessment(true, null, 0m, false, false, deadline);
        }

        if (code == ReturnReasonCode.ShippingDamage)
            return new Assessment(true, null, 0m, false, false, null);

        // Còn lại: ĐỔI Ý — cửa sổ mua lại tự nguyện.
        if (productExcluded)
            return Deny("Sản phẩm này không áp dụng đổi trả do đổi ý.");

        var days = policy.AllowedDaysFor(type);
        if (days <= 0)
            return Deny("Chính sách không cho phép đổi trả do đổi ý với nhóm sản phẩm này.");

        var voluntaryDeadline = deliveredAt.Value.AddDays(days);
        if (now > voluntaryDeadline)
            return Deny($"Đã quá hạn đổi ý {days} ngày kể từ ngày giao ({voluntaryDeadline:dd/MM/yyyy}).");

        return new Assessment(true, null, 0m, false, false, voluntaryDeadline);
    }

    private static Assessment Deny(string reason)
        => new(false, reason, 0m, false, false, null);
}
