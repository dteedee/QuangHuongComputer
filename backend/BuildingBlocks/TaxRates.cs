namespace BuildingBlocks.SharedKernel;

/// <summary>
/// W1-15 / D01 — hằng số LUẬT ĐỊNH về thuế GTGT, dùng làm fallback khi SystemConfig thiếu/sai.
///
/// Mô hình của D01 (phương án C): thuế suất áp dụng = <b>thuế suất luật định</b>
/// (<c>Categories.VatRate</c>, mặc định <see cref="VatStatutoryStandard"/> = 10%)
/// <b>trừ mức giảm tạm thời</b> <see cref="VatReductionPoints"/> = 2 điểm, chỉ khi dòng hàng
/// thuộc diện được giảm và NGÀY GIAO DỊCH (giờ VN) nằm trong cửa sổ
/// [<see cref="VatReductionFrom"/>, <see cref="VatReductionTo"/>].
/// Tự về 10% lúc 00:00 01/01/2027 giờ VN mà không cần deploy; Quốc hội gia hạn → sửa 1 ngày trong config.
///
/// Căn cứ: NQ 204/2025/QH15 Đ.1.1 + Đ.2; NĐ 174/2025/NĐ-CP Đ.1.1-1.4, Đ.2.1
/// (CNTT/máy tính/linh kiện/màn hình/camera KHÔNG thuộc diện loại trừ → được giảm còn 8%);
/// Luật Thuế GTGT 48/2024/QH15 Đ.9.3-9.4.
///
/// KHÔNG hardcode thuế suất ở nơi khác: giải thuế suất qua
/// <c>BuildingBlocks.TaxEngine.VatRateResolver</c>.
/// </summary>
public static class TaxRates
{
    /// <summary>
    /// Thuế suất GTGT LUẬT ĐỊNH của nhóm hàng hoá thông thường (máy tính, linh kiện, phụ kiện,
    /// dịch vụ sửa chữa, phí vận chuyển) = 10%. Đây là giá trị đúng của <c>Categories.VatRate</c>.
    /// </summary>
    public const decimal VatStatutoryStandard = 0.10m;

    /// <summary>Số ĐIỂM PHẦN TRĂM được giảm trong cửa sổ giảm thuế (10% − 2 điểm = 8%).</summary>
    public const decimal VatReductionPoints = 0.02m;

    /// <summary>Ngày bắt đầu cửa sổ giảm 2 điểm — NQ 204/2025/QH15 Đ.2; NĐ 174/2025 Đ.2.1.</summary>
    public static readonly DateOnly VatReductionFrom = new(2025, 7, 1);

    /// <summary>Ngày cuối cùng còn được giảm (bao gồm). 01/01/2027 thuế suất tự về 10%.</summary>
    public static readonly DateOnly VatReductionTo = new(2026, 12, 31);

    /// <summary>Căn cứ pháp lý in trên hoá đơn/báo cáo khi áp dụng mức giảm.</summary>
    public const string VatReductionLegalBasis = "NQ 204/2025/QH15; NĐ 174/2025/NĐ-CP";

    /// <summary>10% — giữ lại cho nhóm không được giảm (viễn thông, tài chính, BĐS — Phụ lục I NĐ 174/2025).</summary>
    public const decimal VatTelecom = 0.10m;

    /// <summary>0% cho hàng xuất khẩu.</summary>
    public const decimal VatExport = 0.00m;

    /// <summary>Cờ miễn thuế (âm để phân biệt với thuế suất 0%).</summary>
    public const decimal VatExempt = -1m;

    /// <summary>
    /// CŨ — thuế suất 8% coi như hằng số không có ngày hiệu lực. Sai kể từ 01/01/2027 và không
    /// diễn đạt được hàng không thuộc diện giảm. Dùng <c>VatRateResolver.Resolve(...)</c>.
    /// Giữ lại để 63 test thuế hiện có và các caller wave-0/1 còn biên dịch; W4-5 xoá.
    /// </summary>
    [Obsolete("D01/W1-15: dùng VatRateResolver.Resolve(statutoryRate, reductionEligible, businessDateVn). " +
              "Hằng số này không có ngày hiệu lực và sẽ sai từ 01/01/2027. Xoá ở W4-5.")]
    public const decimal VatStandard = 0.08m;
}
