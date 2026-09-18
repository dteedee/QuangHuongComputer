namespace Sales.Domain;

/// <summary>
/// D08 — SÁU MÃ LÝ DO TRẢ HÀNG. Quyết định hạn trả và mức khấu trừ, nên không được để khách gõ
/// tự do: một chuỗi "hàng lỗi" viết hoa khác chữ thường là một chính sách khác.
///
/// Lưu xuống cột <c>ReturnRequests.ReasonCode</c> (int). Cột do W2-3 tạo và hiện còn khai dưới
/// dạng shadow property ở <c>SalesAfterSalesModelConfiguration</c> (file của W2-3) — xem
/// integration request W2-10 để nâng thành property thật.
/// </summary>
public enum ReturnReasonCode
{
    /// <summary>Lỗi kỹ thuật của nhà sản xuất → đi vào luồng BẢO HÀNH, khấu trừ 0%.</summary>
    DefectiveTechnical = 1,
    /// <summary>Giao sai hàng — nghĩa vụ nhận lại của người bán, KHÔNG có hạn.</summary>
    WrongItem = 2,
    /// <summary>Hư hỏng trong vận chuyển — khấu trừ 0%.</summary>
    ShippingDamage = 3,
    /// <summary>Không đúng mô tả — nghĩa vụ nhận lại của người bán, KHÔNG có hạn.</summary>
    NotAsDescribed = 4,
    /// <summary>Thông tin sản phẩm thiếu/sai — 0%, bỏ qua mọi cửa sổ, cần quản lý duyệt.</summary>
    InfoDefect = 5,
    /// <summary>Khách đổi ý — LÝ DO DUY NHẤT được phép mang phí khấu trừ (D08).</summary>
    ChangeOfMind = 6,
}

public enum ReturnType
{
    Refund = 1,
    Exchange = 2,
    Replace = 3
}

public enum ReceivedCondition
{
    Intact = 1,              // Nguyên vẹn, còn seal → kho chính
    UsedGood = 2,            // Đã mở, còn tốt → kho Returns
    DefectiveTechnical = 3,  // Lỗi kỹ thuật → kho Defective (gửi hãng)
    UserDamage = 4,          // Hỏng do người dùng → kho Defective, từ chối/trừ tiền
    MissingAccessories = 5   // Thiếu phụ kiện → kho Returns, trừ tiền
}

public enum ReturnStatus
{
    Pending,
    Approved,
    Rejected,
    Refunded,
    Completed,
    Cancelled
}
