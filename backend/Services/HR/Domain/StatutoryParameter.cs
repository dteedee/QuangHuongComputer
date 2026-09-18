using BuildingBlocks.SharedKernel;
using BuildingBlocks.TaxEngine;

namespace HR.Domain;

/// <summary>
/// W2-25 / D06 §3 — MỘT tham số pháp luật (thuế TNCN, bảo hiểm, lương tối thiểu vùng, hệ số OT)
/// tại MỘT mốc hiệu lực. Bảng <c>hr."StatutoryParameters"</c>.
///
/// CỐ Ý KHÔNG có <c>EffectiveTo</c>: khoảng hiệu lực suy ra từ dòng kế tiếp nên không thể hở hay
/// chồng lấn. **Đổi luật = THÊM một dòng, không sửa dòng cũ** — dòng có <c>EffectiveFrom</c> nằm
/// trong hoặc trước kỳ lương đã trả bị khoá (endpoint trả 409).
///
/// UNIQUE (Code, EffectiveFrom); CHECK đúng một trong <c>NumberValue</c>/<c>JsonValue</c>.
/// Hình dạng dòng khớp 1-1 với <see cref="StatutoryParameterRow"/> của BuildingBlocks (W1-15) —
/// đó là hợp đồng chung giữa bảng DB và bộ mặc định biên dịch sẵn.
/// </summary>
public class StatutoryParameter : Entity<Guid>
{
    public string Code { get; private set; } = string.Empty;
    public DateOnly EffectiveFrom { get; private set; }
    public decimal? NumberValue { get; private set; }
    public string? JsonValue { get; private set; }
    public StatutoryParameterUnit Unit { get; private set; }
    public string LegalBasis { get; private set; } = string.Empty;
    public string SourceUrl { get; private set; } = string.Empty;
    public string? Note { get; private set; }

    /// <summary>true = do seeder tạo từ <c>VietnamStatutoryDefaults</c>; false = do người dùng thêm.</summary>
    public bool IsSeed { get; private set; }

    /// <summary>false = D06 đánh dấu CHƯA XÁC MINH từ nguồn sơ cấp — kế toán cần ký xác nhận.</summary>
    public bool IsVerified { get; private set; } = true;

    public StatutoryParameter(
        string code,
        DateOnly effectiveFrom,
        decimal? numberValue,
        string? jsonValue,
        StatutoryParameterUnit unit,
        string legalBasis,
        string sourceUrl,
        string? note = null,
        bool isSeed = false,
        bool isVerified = true)
    {
        Id = Guid.NewGuid();
        Code = Normalize(code);
        EffectiveFrom = effectiveFrom;
        Unit = unit;
        LegalBasis = legalBasis ?? string.Empty;
        SourceUrl = sourceUrl ?? string.Empty;
        Note = note;
        IsSeed = isSeed;
        IsVerified = isVerified;
        SetValue(numberValue, jsonValue);
    }

    protected StatutoryParameter() { }

    /// <summary>Sửa giá trị/căn cứ của MỘT dòng. KHÔNG đổi <c>Code</c> và <c>EffectiveFrom</c> —
    /// đổi mốc hiệu lực nghĩa là thêm dòng mới (D06 §3).</summary>
    public void Update(
        decimal? numberValue,
        string? jsonValue,
        StatutoryParameterUnit unit,
        string legalBasis,
        string sourceUrl,
        string? note,
        bool isVerified)
    {
        Unit = unit;
        LegalBasis = legalBasis ?? string.Empty;
        SourceUrl = sourceUrl ?? string.Empty;
        Note = note;
        IsVerified = isVerified;
        IsSeed = false; // một dòng đã bị sửa tay thì seeder không được đụng vào nữa
        SetValue(numberValue, jsonValue);
    }

    /// <summary>Đổi sang hình dạng thuần của kernel để <see cref="StatutoryParameterSetFactory"/> resolve.</summary>
    public StatutoryParameterRow ToRow()
        => new(Code, EffectiveFrom, NumberValue, JsonValue, Unit, LegalBasis, SourceUrl, Note, IsVerified);

    public static StatutoryParameter FromRow(StatutoryParameterRow row, bool isSeed)
        => new(row.Code, row.EffectiveFrom, row.NumberValue, row.JsonValue, row.Unit,
               row.LegalBasis, row.SourceUrl, row.Note, isSeed, row.IsVerified);

    public static string Normalize(string code)
        => (code ?? string.Empty).Trim().ToUpperInvariant();

    private void SetValue(decimal? numberValue, string? jsonValue)
    {
        if (string.IsNullOrWhiteSpace(jsonValue)) jsonValue = null;
        NumberValue = numberValue;
        JsonValue = jsonValue;

        if (!ToRow().TryValidate(out var error))
            throw new ArgumentException(error);
    }
}
