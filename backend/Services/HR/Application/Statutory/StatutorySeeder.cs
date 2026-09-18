using BuildingBlocks.TaxEngine;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Statutory;

/// <summary>
/// W2-25 / D06 §3 — seed dữ liệu pháp luật vào HR: tham số hiệu lực theo ngày, ngày nghỉ lễ,
/// loại phụ cấp.
///
/// Quy tắc bất di bất dịch: **chỉ INSERT những gì còn thiếu**. Một dòng admin đã sửa (hoặc đã
/// thêm mới) không bao giờ bị seeder ghi đè — nếu không, mỗi lần khởi động API sẽ âm thầm khôi
/// phục số liệu cũ trên một bảng lương đã trả.
/// </summary>
public static class StatutorySeeder
{
    public static async Task SeedAsync(HRDbContext db, CancellationToken ct = default)
    {
        var inserted = 0;
        inserted += await SeedParametersAsync(db, ct);
        inserted += await SeedPublicHolidaysAsync(db, ct);
        inserted += await SeedAllowanceTypesAsync(db, ct);

        if (inserted > 0) await db.SaveChangesAsync(ct);
    }

    /// <summary>Bảng D06 §2 — mỗi (Code, EffectiveFrom) một dòng, kèm căn cứ pháp lý và link nguồn.</summary>
    public static async Task<int> SeedParametersAsync(HRDbContext db, CancellationToken ct = default)
    {
        var existing = await db.StatutoryParameters
            .Select(p => new { p.Code, p.EffectiveFrom })
            .ToListAsync(ct);

        var have = existing
            .Select(e => (e.Code, e.EffectiveFrom))
            .ToHashSet();

        var added = 0;
        foreach (var row in VietnamStatutoryDefaults.Rows)
        {
            if (have.Contains((row.Code, row.EffectiveFrom))) continue;
            db.StatutoryParameters.Add(StatutoryParameter.FromRow(row, isSeed: true));
            have.Add((row.Code, row.EffectiveFrom));
            added++;
        }

        return added;
    }

    /// <summary>Ngày nghỉ lễ 2025-2027, kể cả 2 ngày Giỗ Tổ D06 đã sửa và 24/11 từ 2026.</summary>
    public static async Task<int> SeedPublicHolidaysAsync(HRDbContext db, CancellationToken ct = default)
    {
        var have = (await db.PublicHolidays.Select(h => h.Date).ToListAsync(ct)).ToHashSet();

        var added = 0;
        foreach (var holiday in PublicHoliday.GetSeed())
        {
            if (!have.Add(holiday.Date)) continue;
            db.PublicHolidays.Add(holiday);
            added++;
        }

        return added;
    }

    /// <summary>
    /// Loại phụ cấp mặc định (ăn trưa, xăng xe, điện thoại, trang phục, độc hại, trách nhiệm).
    /// Hạn mức miễn thuế của ăn ca KHÔNG lấy ở đây mà lấy từ tham số hiệu lực theo ngày
    /// <c>PIT_MEAL_TAXFREE_CAP</c> (730.000 đến 30/06/2026, 1.200.000 từ 01/07/2026) — cột
    /// <c>TaxFreeMonthlyLimit</c> của loại LUNCH chỉ còn là giá trị hiển thị.
    /// </summary>
    public static async Task<int> SeedAllowanceTypesAsync(HRDbContext db, CancellationToken ct = default)
    {
        var have = (await db.AllowanceTypes.Select(t => t.Code).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var added = 0;
        foreach (var type in AllowanceType.GetDefaults())
        {
            if (!have.Add(type.Code)) continue;
            db.AllowanceTypes.Add(type);
            added++;
        }

        return added;
    }
}
