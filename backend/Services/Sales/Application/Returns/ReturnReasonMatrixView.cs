using Sales.Domain;

namespace Sales.Application.Returns;

/// <summary>
/// Ma trận "lý do × (hạn, phí)" mà KHÁCH đọc được trên trang chính sách và trang sản phẩm (D08).
/// Không chép lại con số nào: mọi giá trị hỏi thẳng <see cref="ReturnReasonRules"/>, nên trang
/// chính sách không thể lệch với thứ mà API đổi trả thật sự thi hành.
/// </summary>
public static class ReturnReasonMatrixView
{
    /// <summary>
    /// Ma trận lý do × (hạn, phí) mà khách đọc được. Nguồn duy nhất là
    /// <see cref="ReturnReasonRules"/> — không chép lại con số nào ở đây.
    /// </summary>
    public static object Build(EffectiveReturnPolicy policy)
        => Enum.GetValues<ReturnReasonCode>().Select(code => new
        {
            code = code.ToString(),
            label = Label(code),
            hasDeadline = ReturnReasonRules.IsVoluntary(code)
                          || (code is ReturnReasonCode.WrongItem or ReturnReasonCode.NotAsDescribed
                              && policy.DaysForStatutoryReturn > 0),
            days = ReturnReasonRules.IsVoluntary(code)
                ? policy.DaysForReturn
                : code is ReturnReasonCode.WrongItem or ReturnReasonCode.NotAsDescribed
                    ? policy.DaysForStatutoryReturn
                    : 0,
            feePercentIntact = ReturnReasonRules.FeePercent(code, ReceivedCondition.Intact, policy),
            feePercentUsedGood = ReturnReasonRules.FeePercent(code, ReceivedCondition.UsedGood, policy),
            feePercentMissingAccessories =
                ReturnReasonRules.FeePercent(code, ReceivedCondition.MissingAccessories, policy),
            requiresManagerApproval = code == ReturnReasonCode.InfoDefect,
            routesToWarranty = code == ReturnReasonCode.DefectiveTechnical,
        }).ToList();

    private static string Label(ReturnReasonCode code) => code switch
    {
        ReturnReasonCode.DefectiveTechnical => "Lỗi kỹ thuật của nhà sản xuất",
        ReturnReasonCode.WrongItem => "Giao sai hàng",
        ReturnReasonCode.ShippingDamage => "Hư hỏng khi vận chuyển",
        ReturnReasonCode.NotAsDescribed => "Không đúng mô tả",
        ReturnReasonCode.InfoDefect => "Thông tin sản phẩm thiếu/sai",
        ReturnReasonCode.ChangeOfMind => "Khách đổi ý",
        _ => code.ToString(),
    };
}
