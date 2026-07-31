using BuildingBlocks.SharedKernel;

namespace HR.Domain;

/// <summary>
/// Loại phụ cấp — cấu hình mức miễn thuế theo quy định VN.
/// Ví dụ ăn trưa: 730.000đ/tháng miễn thuế, phần vượt tính vào thu nhập chịu thuế.
/// </summary>
public class AllowanceType : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;      // "Ăn trưa"
    public string Code { get; private set; } = string.Empty;      // UNIQUE — "LUNCH"
    public decimal TaxFreeMonthlyLimit { get; private set; }        // Ngưỡng miễn thuế / tháng (0 = miễn hoàn toàn hoặc chịu 100%)
    public bool IsTaxable { get; private set; }                     // true = toàn bộ tính vào TN chịu thuế
    public bool IsInsurable { get; private set; }                   // true = tính vào lương đóng BHXH

    public AllowanceType(
        string name,
        string code,
        decimal taxFreeMonthlyLimit,
        bool isTaxable,
        bool isInsurable)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name là bắt buộc.");
        if (string.IsNullOrWhiteSpace(code)) throw new ArgumentException("Code là bắt buộc.");
        if (taxFreeMonthlyLimit < 0) throw new ArgumentException("TaxFreeMonthlyLimit không thể âm.");

        Id = Guid.NewGuid();
        Name = name;
        Code = code.ToUpperInvariant();
        TaxFreeMonthlyLimit = taxFreeMonthlyLimit;
        IsTaxable = isTaxable;
        IsInsurable = isInsurable;
    }

    protected AllowanceType() { }

    /// <summary>Seed 6 loại phụ cấp phổ biến theo TT 111/2013 + văn bản hướng dẫn.</summary>
    public static IEnumerable<AllowanceType> GetDefaults() => new[]
    {
        // Ăn trưa: TT 26/2016/TT-BLĐTBXH — miễn tối đa 730k
        new AllowanceType("Ăn trưa/giữa ca", "LUNCH",              730_000m, isTaxable: false, isInsurable: false),
        // Xăng xe/đi lại theo quy chế: coi là công tác phí, không tính thuế
        new AllowanceType("Xăng xe/đi lại",  "TRANSPORT",          0m,        isTaxable: false, isInsurable: false),
        // Điện thoại: theo quy chế công ty (không có ngưỡng cụ thể)
        new AllowanceType("Điện thoại",      "PHONE",              0m,        isTaxable: false, isInsurable: false),
        // Trang phục: 5tr/năm ≈ 416.667/tháng nếu bằng tiền
        new AllowanceType("Trang phục",      "UNIFORM",            416_667m,  isTaxable: false, isInsurable: false),
        // Độc hại: chịu thuế nhưng có bao gồm trong lương đóng BHXH
        new AllowanceType("Độc hại/nguy hiểm", "HAZARD",           0m,        isTaxable: true,  isInsurable: true),
        // Trách nhiệm: chịu thuế và đóng BHXH
        new AllowanceType("Trách nhiệm",     "RESPONSIBILITY",     0m,        isTaxable: true,  isInsurable: true)
    };
}
