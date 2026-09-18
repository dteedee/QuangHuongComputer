using Catalog.Infrastructure.Data.Import;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;

namespace Warranty.Infrastructure.Seed;

/// <summary>
/// The fallback warranty policy plus the internal SLA table (D08).
///
/// Two clearly separated layers - D08 §4 is explicit that they must never be mixed:
///   * the PUBLISHED policy (this <c>WarrantyPolicy</c> row) is what the customer is promised;
///   * the SLA rows are internal operational targets that only ever raise an admin warning.
///
/// DEFAULT = 12 months, Manufacturer provider, matching the DEFAULT line of D08's matrix. Per-leaf
/// category policies need <c>Policies.CategoryId</c>, which the current schema does not have
/// (W1-11 adds it); the wave-2 warranty owner seeds the matrix once it exists.
/// </summary>
public static class WarrantyPolicySeeder
{
    public const string PolicyName = "DEFAULT";

    private const string CoverageTerms =
        "Bảo hành theo tiêu chuẩn của nhà sản xuất, tính từ ngày giao hàng thành công hoặc ngày " +
        "bán tại quầy. Tiếp nhận tại cửa hàng (carry-in); cửa hàng là đầu mối nhận mọi sản phẩm " +
        "đã bán. Thời hạn công bố: phản hồi kết quả thẩm định tối đa 03 ngày làm việc, sửa tại " +
        "cửa hàng tối đa 15 ngày, gửi trung tâm bảo hành hãng trong nước tối đa 30 ngày. Số ngày " +
        "giữ máy được cộng bù vào thời hạn bảo hành. Quá thời hạn công bố, hoặc đã bảo hành từ 3 " +
        "lần mà vẫn lỗi: đổi sản phẩm mới tương đương hoặc thu hồi và hoàn tiền.";

    private const string Exclusions =
        "Hết hạn bảo hành; tem/serial mờ, rách, bị sửa; rơi vỡ, móp, vào nước, cháy nổ do điện áp; " +
        "côn trùng, thiên tai; tự ý tháo sửa; hàng thanh lý/trưng bày; phần mềm và dữ liệu.";

    /// <summary>
    /// D08 §4(b). Hours, not days: RepairAtShop 7 days, SendToManufacturer 21 days, ExchangeNew 48h.
    /// Rejected claims have no turnaround target.
    /// </summary>
    private static readonly (ClaimType Type, int TargetHours, string Notes)[] SlaRows =
    {
        (ClaimType.RepairAtShop,       168, "SLA nội bộ: sửa tại cửa hàng trong 7 ngày. Không in cho khách."),
        (ClaimType.SendToManufacturer, 504, "SLA nội bộ: gửi hãng và nhận lại trong 21 ngày. Không in cho khách."),
        (ClaimType.ExchangeNew,         48, "SLA nội bộ: đổi máy mới trong 48 giờ. Không in cho khách."),
    };

    public static async Task<int> SeedAsync(WarrantyDbContext db, CancellationToken ct = default)
    {
        var changes = 0;

        if (!await db.Policies.AnyAsync(p => p.Name == PolicyName, ct))
        {
            var policy = new WarrantyPolicy(
                name: PolicyName,
                description: "Chính sách bảo hành mặc định khi sản phẩm chưa khai báo số tháng riêng.",
                durationMonths: 12,
                coverageTerms: CoverageTerms,
                scope: "Áp dụng cho mọi sản phẩm chưa có chính sách riêng theo danh mục.",
                exclusions: Exclusions,
                provider: WarrantyProvider.Manufacturer);

            db.Policies.Add(policy);
            db.Entry(policy).Property("Id").CurrentValue =
                DeterministicGuid.Create(DeterministicGuid.UrlNamespace, "warranty-policy:" + PolicyName);
            changes++;
        }

        var existingSla = await db.SlaPolicies.Select(s => s.ClaimType).ToListAsync(ct);
        foreach (var (type, hours, notes) in SlaRows)
        {
            if (existingSla.Contains(type)) continue;

            var sla = new WarrantySlaPolicy(type, hours, warningAtPercent: 80, isActive: true, notes: notes);
            db.SlaPolicies.Add(sla);
            db.Entry(sla).Property("Id").CurrentValue =
                DeterministicGuid.Create(DeterministicGuid.UrlNamespace, "warranty-sla:" + type);
            changes++;
        }

        if (changes > 0) await db.SaveChangesAsync(ct);
        return changes;
    }
}
