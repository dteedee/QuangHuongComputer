namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §3 — MỘT tham số pháp luật tại MỘT mốc hiệu lực. Đây là hình dạng của một dòng
/// trong bảng <c>hr."StatutoryParameters"</c> (W2-25 tạo) và cũng là hình dạng của mặc định
/// biên dịch sẵn <see cref="VietnamStatutoryDefaults"/>.
///
/// CỐ Ý KHÔNG có <c>EffectiveTo</c>: khoảng hiệu lực suy ra từ dòng kế tiếp, nên không thể
/// tồn tại lỗ hổng hay chồng lấn. Đổi luật = THÊM một dòng, không sửa dòng cũ.
/// UNIQUE (Code, EffectiveFrom). Đúng một trong <c>NumberValue</c>/<c>JsonValue</c> có giá trị.
/// </summary>
/// <param name="Code">Mã tham số — xem <see cref="StatutoryParameterCodes"/>.</param>
/// <param name="EffectiveFrom">Ngày bắt đầu áp dụng (giờ VN, bao gồm).</param>
/// <param name="NumberValue">Giá trị số (VND / tỉ lệ / giờ / ngày / lần). Null nếu dùng JSON.</param>
/// <param name="JsonValue">Giá trị JSON — kể cả chuỗi (<c>"I"</c>) và bool (<c>true</c>). Null nếu dùng số.</param>
/// <param name="Unit">Đơn vị, để UI hiển thị và để validate.</param>
/// <param name="LegalBasis">Căn cứ pháp lý (số hiệu văn bản + điều khoản) — in kèm trên màn hình quản trị.</param>
/// <param name="SourceUrl">Link nguồn đã truy cập 2026-09-18.</param>
/// <param name="Note">Ghi chú diễn giải.</param>
/// <param name="IsVerified">false = CHƯA XÁC MINH từ nguồn sơ cấp (D06 đánh dấu) — kế toán cần ký xác nhận.</param>
public sealed record StatutoryParameterRow(
    string Code,
    DateOnly EffectiveFrom,
    decimal? NumberValue,
    string? JsonValue,
    StatutoryParameterUnit Unit,
    string LegalBasis,
    string SourceUrl,
    string? Note = null,
    bool IsVerified = true)
{
    /// <summary>Dòng có đúng một cột giá trị và giá trị hợp lệ theo đơn vị hay không.</summary>
    public bool TryValidate(out string? error)
    {
        if ((NumberValue is null) == (JsonValue is null))
        {
            error = $"{Code}@{EffectiveFrom:yyyy-MM-dd}: phải có ĐÚNG MỘT trong NumberValue/JsonValue.";
            return false;
        }

        switch (Unit)
        {
            case StatutoryParameterUnit.Rate when NumberValue is < 0m or > 1m:
                error = $"{Code}@{EffectiveFrom:yyyy-MM-dd}: tỉ lệ {NumberValue} phải nằm trong [0;1].";
                return false;
            case StatutoryParameterUnit.Vnd when NumberValue < 0m:
                error = $"{Code}@{EffectiveFrom:yyyy-MM-dd}: số tiền {NumberValue} không được âm.";
                return false;
            case StatutoryParameterUnit.Hours or StatutoryParameterUnit.Days or StatutoryParameterUnit.Count
                when NumberValue < 0m:
                error = $"{Code}@{EffectiveFrom:yyyy-MM-dd}: {NumberValue} không được âm.";
                return false;
        }

        error = null;
        return true;
    }
}

/// <summary>
/// Đơn vị của một tham số. W2-25 dùng ĐÚNG tập này cho CHECK constraint của
/// <c>hr."StatutoryParameters".Unit</c> — thêm giá trị mới đồng nghĩa với một migration.
/// <c>Json</c>, <c>Text</c>, <c>Bool</c> đều lưu ở cột <c>JsonValue</c> (jsonb).
/// </summary>
public enum StatutoryParameterUnit
{
    /// <summary>Số tiền Việt Nam đồng, ≥ 0.</summary>
    Vnd,

    /// <summary>Tỉ lệ dạng phân số, 0..1 (0.08 = 8%).</summary>
    Rate,

    /// <summary>Số giờ, ≥ 0.</summary>
    Hours,

    /// <summary>Số ngày làm việc, ≥ 0.</summary>
    Days,

    /// <summary>Hệ số/số lần (ví dụ trần = 20 lần mức tham chiếu), ≥ 0.</summary>
    Count,

    /// <summary>Cấu trúc JSON (biểu thuế, lương tối thiểu vùng, hệ số OT).</summary>
    Json,

    /// <summary>Chuỗi, lưu dạng JSON string: <c>"I"</c>.</summary>
    Text,

    /// <summary>Cờ bật/tắt, lưu dạng JSON bool: <c>true</c>.</summary>
    Bool
}
