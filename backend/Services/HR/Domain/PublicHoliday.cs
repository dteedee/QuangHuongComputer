using BuildingBlocks.SharedKernel;

namespace HR.Domain;

/// <summary>
/// W2-25 / D06 §4 — ngày nghỉ lễ hưởng nguyên lương (BLLĐ Đ.112), bảng <c>hr."PublicHolidays"</c>.
///
/// Thay cho <c>VNHolidayCalendar</c> hardcode: ngày Giỗ Tổ Hùng Vương là ngày ÂM LỊCH nên không
/// suy ra được bằng công thức dương lịch, và mỗi năm Chính phủ ra một thông báo nghỉ lễ riêng.
/// D06 ghi rõ code cũ SAI CẢ HAI năm (`VNHolidayCalendar.cs:26` ghi 27/03/2026 và 15/04/2027;
/// đúng là 26/04/2026 và 16/04/2027) và thiếu 24/11 (NQ 28/2026/QH16, lần đầu áp dụng 2026).
///
/// <see cref="IsConfirmed"/> = HR đã đối chiếu với thông báo nghỉ lễ chính thức. Hai ngày Giỗ Tổ
/// 2026/2027 được seed với <c>IsConfirmed = false</c> vì D06 đánh dấu CHƯA XÁC MINH.
/// UNIQUE (Date).
/// </summary>
public class PublicHoliday : Entity<Guid>
{
    public DateOnly Date { get; private set; }
    public string Name { get; private set; } = string.Empty;

    /// <summary>Hưởng nguyên lương (BLLĐ Đ.112) — false dành cho ngày nghỉ bù/không hưởng lương.</summary>
    public bool IsPaid { get; private set; } = true;

    /// <summary>HR đã xác nhận với thông báo nghỉ lễ chính thức của năm đó.</summary>
    public bool IsConfirmed { get; private set; }

    public string? LegalBasis { get; private set; }
    public string? Note { get; private set; }

    public PublicHoliday(
        DateOnly date,
        string name,
        bool isPaid = true,
        bool isConfirmed = false,
        string? legalBasis = null,
        string? note = null)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Tên ngày lễ là bắt buộc.", nameof(name));

        Id = Guid.NewGuid();
        Date = date;
        Name = name.Trim();
        IsPaid = isPaid;
        IsConfirmed = isConfirmed;
        LegalBasis = legalBasis;
        Note = note;
    }

    protected PublicHoliday() { }

    public void Update(string name, bool isPaid, bool isConfirmed, string? legalBasis, string? note)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Tên ngày lễ là bắt buộc.", nameof(name));
        Name = name.Trim();
        IsPaid = isPaid;
        IsConfirmed = isConfirmed;
        LegalBasis = legalBasis;
        Note = note;
    }

    public void Confirm() => IsConfirmed = true;

    private const string BlldArticle112 = "BLLĐ 45/2019/QH14 Đ.112";
    private const string CultureDayBasis = "NQ 28/2026/QH16 (hiệu lực 01/07/2026)";

    /// <summary>
    /// Bộ ngày lễ seed cho 2025-2027. Seeder chỉ INSERT ngày còn thiếu, không ghi đè ngày HR đã sửa.
    /// 2025 giữ lại để test hồi quy các kỳ lương cũ.
    /// </summary>
    public static IEnumerable<PublicHoliday> GetSeed()
    {
        foreach (var year in new[] { 2025, 2026, 2027 })
        {
            yield return New(year, 1, 1, "Tết Dương lịch");
            yield return New(year, 4, 30, "Ngày Giải phóng miền Nam");
            yield return New(year, 5, 1, "Ngày Quốc tế Lao động");
            yield return New(year, 9, 2, "Quốc khánh");
            yield return New(year, 9, 3, "Quốc khánh (ngày liền kề)");

            // NQ 28/2026/QH16 hiệu lực 01/07/2026 -> 24/11/2026 là lần nghỉ đầu tiên.
            if (year >= 2026)
                yield return New(year, 11, 24, "Ngày Văn hoá Việt Nam", basis: CultureDayBasis);
        }

        // Giỗ Tổ Hùng Vương (10/3 âm lịch). 2025 = 07/04 đã xảy ra và đúng; 2026/2027 tính bằng
        // thuật toán âm lịch VN (TZ+7) — D06 §4 đánh dấu CHƯA XÁC MINH với thông báo chính thức.
        yield return new PublicHoliday(new DateOnly(2025, 4, 7), "Giỗ Tổ Hùng Vương",
            isConfirmed: true, legalBasis: BlldArticle112);
        yield return new PublicHoliday(new DateOnly(2026, 4, 26), "Giỗ Tổ Hùng Vương",
            isConfirmed: false, legalBasis: BlldArticle112,
            note: "D06: code cũ ghi 27/03/2026 — SAI. HR đối chiếu thông báo nghỉ lễ chính thức 2026.");
        yield return new PublicHoliday(new DateOnly(2027, 4, 16), "Giỗ Tổ Hùng Vương",
            isConfirmed: false, legalBasis: BlldArticle112,
            note: "D06: code cũ ghi 15/04/2027 — SAI. HR đối chiếu thông báo nghỉ lễ chính thức 2027.");

        // Tết Nguyên đán — 5 ngày, giữ đúng các mốc VNHolidayCalendar đang dùng.
        foreach (var d in TetDays(2025, new DateOnly(2025, 1, 28))) yield return d;
        foreach (var d in TetDays(2026, new DateOnly(2026, 2, 16))) yield return d;
        foreach (var d in TetDays(2027, new DateOnly(2027, 2, 5))) yield return d;
    }

    private static IEnumerable<PublicHoliday> TetDays(int year, DateOnly first)
    {
        for (var i = 0; i < 5; i++)
        {
            yield return new PublicHoliday(first.AddDays(i),
                i == 0 ? "Tết Nguyên đán" : $"Tết Nguyên đán (ngày {i + 1})",
                isConfirmed: year <= 2025, legalBasis: BlldArticle112);
        }
    }

    private static PublicHoliday New(int year, int month, int day, string name, string? basis = null)
        => new(new DateOnly(year, month, day), name, isConfirmed: true, legalBasis: basis ?? BlldArticle112);
}
