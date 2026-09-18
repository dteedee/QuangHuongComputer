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
/// DEFAULT = 12 months, Manufacturer provider, matching the DEFAULT line of D08's matrix.
/// Per-leaf category policies (<see cref="CategoryMatrix"/>) use <c>Policies.CategoryId</c>,
/// added by the W2-6 migration <c>20260918145859_W26WarrantyD08Fields</c>.
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

    /// <summary>
    /// D08 §"Ma trận seed" (slug lá theo W0-6 taxonomy; leo lá -> cha -> DEFAULT). Catalog in this
    /// deployment is 10 flat leaf categories (no ParentId populated - confirmed by SELECT, 2026-09-18),
    /// so several matrix rows (CPU/Mainboard/RAM/PSU/VGA/SSD, Case/Tản nhiệt, Phần mềm/key) have no
    /// matching category and are intentionally left out here — <c>Product.WarrantyMonths</c> (higher
    /// priority than category policy in <see cref="WarrantyPolicyResolver"/>) is the real source for
    /// those per the phase Overview ("dataset already carries warrantyMonths - W0-6 imported it").
    /// `linh-kien-may-tinh` (the catch-all "Linh Kiện Máy Tính" leaf) gets 24 months as a conservative
    /// fallback for that mixed bucket (CPU/Mainboard/RAM/PSU want 36, VGA/SSD want 24 - 24 never
    /// UNDER-promises against the legal floor while not over-promising the 36-month rows either;
    /// products in that bucket should carry their own WarrantyMonths to get the precise number).
    /// </summary>
    private static readonly (string Slug, int Months, WarrantyProvider Provider, string Notes)[] CategoryMatrix =
    {
        ("laptop", 12, WarrantyProvider.Manufacturer, "Laptop: pin/sạc theo hãng; điểm chết theo hãng, shop nhận đổi khi >= 5 điểm trong 15 ngày."),
        ("pc-gaming", 24, WarrantyProvider.Store, "PC Gaming lắp sẵn (Store): 1 đổi 1 15 ngày - đổi linh kiện lỗi, không đổi nguyên bộ; không BH phần mềm/dữ liệu."),
        ("pc-do-hoa", 24, WarrantyProvider.Store, "PC Đồ họa lắp sẵn (Store): 1 đổi 1 15 ngày - đổi linh kiện lỗi, không đổi nguyên bộ; không BH phần mềm/dữ liệu."),
        ("linh-kien-may-tinh", 24, WarrantyProvider.Manufacturer, "Linh kiện (CPU/Mainboard/RAM/PSU/VGA/SSD gộp chung do catalog chưa có danh mục con) - mức bảo thủ; ưu tiên Product.WarrantyMonths khi có."),
        ("man-hinh-may-tinh", 24, WarrantyProvider.Manufacturer, "Màn hình: >= 5 điểm chết/sáng (chuẩn GearVN cho hàng mới); áp dụng chính sách hãng nếu tốt hơn."),
        ("thiet-bi-mang", 24, WarrantyProvider.Manufacturer, "Thiết bị mạng."),
        ("camera", 24, WarrantyProvider.Manufacturer, "Camera."),
        ("gaming-gear", 12, WarrantyProvider.Manufacturer, "Phím/Chuột Gaming Gear: hao mòn tự nhiên (switch, feet) không BH; SP < 1 triệu: BH bằng đổi tương đương."),
        ("loa-mic-webcam-stream", 12, WarrantyProvider.Manufacturer, "Loa/Mic/Webcam/Stream."),
        ("phu-kien-may-tinh-laptop", 6, WarrantyProvider.Manufacturer, "Phụ kiện: cáp, túi, lót chuột, pin = tiêu hao."),
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

        // D08 category matrix. Same physical Postgres DB as Catalog (modular monolith) - a raw scalar
        // SELECT avoids taking a CatalogDbContext dependency into this seeder (its registration in
        // DatabaseMigrationRunner.cs, which this track does not own, only resolves WarrantyDbContext).
        foreach (var (slug, months, provider, notes) in CategoryMatrix)
        {
            Guid? categoryId;
            try
            {
                categoryId = await db.Database
                    .SqlQueryRaw<Guid>("SELECT \"Id\" FROM \"Categories\" WHERE \"Slug\" = {0} LIMIT 1", slug)
                    .SingleOrDefaultAsync(ct);
                if (categoryId == Guid.Empty) categoryId = null;
            }
            catch (Exception)
            {
                // Categories table missing/renamed in some environment - degrade to "skip this row"
                // rather than fail the whole seed pass (DEFAULT + SLA rows above must still land).
                categoryId = null;
            }
            if (categoryId is null) continue;

            var exists = await db.Policies.AnyAsync(
                p => p.CategoryId == categoryId && p.Provider == provider && p.IsActive, ct);
            if (exists) continue;

            var catPolicy = new WarrantyPolicy(
                name: $"D08-{slug}-{provider}",
                description: $"Chính sách bảo hành theo danh mục '{slug}' (D08 ma trận seed).",
                durationMonths: months,
                coverageTerms: CoverageTerms,
                scope: notes,
                exclusions: Exclusions,
                provider: provider,
                categoryId: categoryId);
            db.Policies.Add(catPolicy);
            db.Entry(catPolicy).Property("Id").CurrentValue =
                DeterministicGuid.Create(DeterministicGuid.UrlNamespace, $"warranty-policy:{slug}:{provider}");
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
