using System.Globalization;
using BuildingBlocks.SharedKernel;

namespace HR.Domain;

/// <summary>
/// Mức hoa hồng kỹ thuật của MỘT nhân viên từ một ngày hiệu lực. Không sửa/xoá dòng cũ: đổi
/// mức = thêm dòng mới với <see cref="EffectiveFrom"/> mới, nên phiếu sửa tháng trước vẫn tính
/// theo mức của tháng trước. Nhân viên không có dòng nào -> dùng mặc định ở SystemConfig.
/// </summary>
public class CommissionPolicy : Entity<Guid>
{
    public Guid EmployeeId { get; private set; }
    /// <summary>% trên tiền công + phí dịch vụ của phiếu sửa (0..100).</summary>
    public decimal LaborPercent { get; private set; }
    /// <summary>Tiền cố định mỗi phiếu sửa hoàn tất (VND, có thể 0).</summary>
    public decimal FixedAmountPerJob { get; private set; }
    public DateOnly EffectiveFrom { get; private set; }
    public string? Note { get; private set; }

    public CommissionPolicy(Guid employeeId, decimal laborPercent, decimal fixedAmountPerJob,
        DateOnly effectiveFrom, string? note = null)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId là bắt buộc.");
        if (laborPercent < 0 || laborPercent > 100) throw new ArgumentException("Tỷ lệ hoa hồng phải trong 0..100%.");
        if (fixedAmountPerJob < 0) throw new ArgumentException("Tiền cố định mỗi phiếu không thể âm.");
        if (fixedAmountPerJob != Math.Round(fixedAmountPerJob, 0))
            throw new ArgumentException("Tiền cố định mỗi phiếu phải là số nguyên VND.");

        Id = Guid.NewGuid();
        EmployeeId = employeeId;
        LaborPercent = laborPercent;
        FixedAmountPerJob = fixedAmountPerJob;
        EffectiveFrom = effectiveFrom;
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
    }

    protected CommissionPolicy() { }
}

/// <summary>Kỳ hoa hồng dạng chuỗi "yyyy-MM" (so sánh chuỗi = so sánh thời gian).</summary>
public static class CommissionPeriod
{
    public static string Of(int year, int month) => $"{year:D4}-{month:D2}";

    public static string Of(DateOnly date) => Of(date.Year, date.Month);

    public static bool IsValid(string? period) =>
        !string.IsNullOrEmpty(period)
        && period.Length == 7
        && DateTime.TryParseExact(period + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out _);

    /// <summary>[đầu kỳ, đầu kỳ sau) theo giờ Việt Nam, quy ra UTC (VN không có DST: +07:00 cố định).</summary>
    public static (DateTime FromUtc, DateTime ToUtc) UtcBounds(string period)
    {
        if (!IsValid(period)) throw new ArgumentException("Kỳ phải có dạng yyyy-MM.", nameof(period));
        var start = DateTime.ParseExact(period + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var offset = TimeSpan.FromHours(7);
        return (DateTime.SpecifyKind(start - offset, DateTimeKind.Utc),
            DateTime.SpecifyKind(start.AddMonths(1) - offset, DateTimeKind.Utc));
    }
}
