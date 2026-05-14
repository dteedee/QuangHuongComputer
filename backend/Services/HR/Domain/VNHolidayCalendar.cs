namespace HR.Domain;

public static class VNHolidayCalendar
{
    private static readonly Dictionary<int, List<(DateTime Date, string Name)>> TetDates = new()
    {
        { 2025, new() { (new(2025, 1, 28), "Tết Nguyên Đán"), (new(2025, 1, 29), "Tết"), (new(2025, 1, 30), "Tết"), (new(2025, 1, 31), "Tết"), (new(2025, 2, 1), "Tết") } },
        { 2026, new() { (new(2026, 2, 16), "Tết Nguyên Đán"), (new(2026, 2, 17), "Tết"), (new(2026, 2, 18), "Tết"), (new(2026, 2, 19), "Tết"), (new(2026, 2, 20), "Tết") } },
        { 2027, new() { (new(2027, 2, 5), "Tết Nguyên Đán"), (new(2027, 2, 6), "Tết"), (new(2027, 2, 7), "Tết"), (new(2027, 2, 8), "Tết"), (new(2027, 2, 9), "Tết") } },
    };

    public static List<(DateTime Date, string Name)> GetHolidaysForYear(int year)
    {
        var holidays = new List<(DateTime Date, string Name)>
        {
            (new(year, 1, 1), "Tết Dương Lịch"),
            (new(year, 4, 30), "Ngày Giải Phóng"),
            (new(year, 5, 1), "Quốc Tế Lao Động"),
            (new(year, 9, 2), "Quốc Khánh"),
            (new(year, 9, 3), "Quốc Khánh (nghỉ bù)"),
        };

        // Giỗ Tổ Hùng Vương - 10/3 Âm lịch (approximate)
        var hungVuong = new Dictionary<int, DateTime>
        {
            { 2025, new(2025, 4, 7) }, { 2026, new(2026, 3, 27) }, { 2027, new(2027, 4, 15) }
        };
        if (hungVuong.TryGetValue(year, out var hv))
            holidays.Add((hv, "Giỗ Tổ Hùng Vương"));

        if (TetDates.TryGetValue(year, out var tet))
            holidays.AddRange(tet);

        return holidays.OrderBy(h => h.Date).ToList();
    }

    public static bool IsHoliday(DateTime date) =>
        GetHolidaysForYear(date.Year).Any(h => h.Date.Date == date.Date);
}
