namespace BuildingBlocks.SharedKernel;

/// <summary>
/// Single source of truth cho các mức thuế suất áp dụng chung toàn hệ thống.
/// Đặt ở BuildingBlocks để các module downstream (Sales, Inventory, Catalog...)
/// dùng chung mà không phải reference ngược Accounting.
/// </summary>
public static class TaxRates
{
    /// <summary>
    /// VAT chuẩn cho hàng hoá thông thường (bao gồm máy tính, linh kiện).
    /// 8% theo diện giảm thuế GTGT hiện hành (Nghị quyết Quốc hội).
    /// Trước đây là 10% — hardcode 0.1m trong Cart là BUG pháp lý.
    /// </summary>
    public const decimal VatStandard = 0.08m;

    /// <summary>10% cho viễn thông, tài chính, bất động sản.</summary>
    public const decimal VatTelecom = 0.10m;

    /// <summary>0% cho hàng xuất khẩu.</summary>
    public const decimal VatExport = 0.00m;

    /// <summary>Cờ miễn thuế (âm để phân biệt với 0%).</summary>
    public const decimal VatExempt = -1m;
}
