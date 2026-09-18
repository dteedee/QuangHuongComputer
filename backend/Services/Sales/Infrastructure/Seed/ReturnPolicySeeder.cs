using Catalog.Infrastructure;
using Catalog.Infrastructure.Data.Import;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Infrastructure.Seed;

/// <summary>
/// MA TRẬN CHÍNH SÁCH ĐỔI TRẢ (D08). Một dòng mặc định (<c>CategoryId = null</c>) + một dòng cho
/// mỗi nhóm hàng, khớp theo SLUG danh mục lá.
///
/// Vì sao phải seed: bản cài mới có 0 dòng <c>ReturnPolicies</c>, nên
/// <c>GetEffectivePolicyAsync</c> trả null và MỌI yêu cầu đổi trả bị từ chối với "không có chính
/// sách áp dụng" — luồng đổi trả chết ngay từ lúc cài.
///
/// Ba nhóm hồ sơ của D08 §"Ma trận seed":
///   R-A: mua lại trong 7 ngày / đổi sang SP khác trong 15 ngày; nguyên seal 0%, đã mở 15%,
///        thiếu phụ kiện +10%.
///   R-B: 7 ngày, CHỈ nhận lại khi còn nguyên seal, khấu trừ 0%.
///   R-C: không mua lại (chỉ còn 1 đổi 1 lỗi nhà sản xuất).
/// Số ngày "1 đổi 1 lỗi NSX" nằm ở <c>DaysForDefectReplace</c>.
///
/// <c>DaysForStatutoryReturn = 0</c> ở mọi dòng là CỐ Ý: 0 nghĩa là "theo hạn bảo hành sản phẩm",
/// tức nghĩa vụ nhận lại hàng giao sai / không đúng mô tả KHÔNG bị cắt bởi cửa sổ 7-15 ngày.
/// </summary>
public static class ReturnPolicySeeder
{
    public const string PolicyName = "DEFAULT";

    private const string DefaultNotes =
        "Chính sách mặc định (D08). Nhóm lý do luật định (lỗi nhà sản xuất, giao sai, hư hỏng do " +
        "vận chuyển, không đúng mô tả, thiếu/sai thông tin công bố) miễn phí hoàn toàn và không bị " +
        "giới hạn bởi cửa sổ 7 ngày này. 7 ngày là cửa sổ MUA LẠI tự nguyện: chỉ nhận lại hàng còn " +
        "nguyên seal, khấu trừ 0%.";

    /// <summary>Một dòng của ma trận. <c>Slug</c> null = dòng mặc định.</summary>
    private sealed record Row(
        string? Slug,
        string Name,
        int DaysForReturn,
        int DaysForExchange,
        int DaysForDefectReplace,
        decimal RestockingFeePercent,
        decimal MissingAccessoriesFeePercent,
        bool AllowOpenedBoxReturn,
        string Notes);

    private static readonly Row[] Matrix =
    {
        // R-A — mua lại 7 ngày / đổi 15 ngày, nhận cả hàng đã mở hộp (khấu trừ 15%).
        RA("laptop-may-tinh-xach-tay", "Laptop", 15),
        RA("linh-kien-may-tinh", "Linh kiện máy tính", 15),
        RA("man-hinh-may-tinh", "Màn hình", 15),
        RA("thiet-bi-mang", "Thiết bị mạng", 15),
        RA("camera", "Camera", 15),
        RA("loa-mic-webcam-stream", "Loa / Mic / Webcam", 15),

        // R-B — 7 ngày, chỉ nhận lại hàng còn nguyên seal, khấu trừ 0%.
        RB("phim-chuot-gaming-gear", "Phím / Chuột / Gaming gear", 15),
        RB("phu-kien-may-tinh-laptop", "Phụ kiện", 7),

        // R-C — không mua lại; máy lắp sẵn chỉ đổi LINH KIỆN lỗi, không đổi nguyên bộ.
        RC("may-tinh-choi-game", "PC Gaming (lắp sẵn)", 15),
        RC("may-tinh-do-hoa", "PC Đồ hoạ (lắp sẵn)", 15),
    };

    private static Row RA(string slug, string name, int defectDays) => new(
        slug, name, DaysForReturn: 7, DaysForExchange: 15, DaysForDefectReplace: defectDays,
        RestockingFeePercent: 15m, MissingAccessoriesFeePercent: 10m, AllowOpenedBoxReturn: true,
        Notes: "Hồ sơ R-A (D08): mua lại 7 ngày / đổi sang sản phẩm khác 15 ngày. "
               + "Nguyên seal khấu trừ 0%, đã mở còn nguyên vẹn đủ hộp 15%, thiếu phụ kiện thêm 10%.");

    private static Row RB(string slug, string name, int defectDays) => new(
        slug, name, DaysForReturn: 7, DaysForExchange: 7, DaysForDefectReplace: defectDays,
        RestockingFeePercent: 0m, MissingAccessoriesFeePercent: 0m, AllowOpenedBoxReturn: false,
        Notes: "Hồ sơ R-B (D08): chỉ nhận lại hàng còn NGUYÊN SEAL trong 7 ngày, khấu trừ 0%.");

    private static Row RC(string slug, string name, int defectDays) => new(
        slug, name, DaysForReturn: 0, DaysForExchange: 0, DaysForDefectReplace: defectDays,
        RestockingFeePercent: 0m, MissingAccessoriesFeePercent: 0m, AllowOpenedBoxReturn: false,
        Notes: "Hồ sơ R-C (D08): không áp dụng mua lại do đổi ý. "
               + "Máy lắp sẵn chỉ đổi linh kiện lỗi, không đổi nguyên bộ.");

    /// <summary>
    /// Idempotent theo tên chính sách. <paramref name="catalogDb"/> là tuỳ chọn để điểm gọi hiện
    /// tại (<c>DatabaseMigrationRunner</c>, file của gate) không phải đổi ngay; thiếu nó thì chỉ
    /// seed dòng mặc định và BỎ QUA ma trận theo danh mục — xem integration request W2-10.
    /// </summary>
    public static async Task<int> SeedAsync(
        SalesDbContext db, CancellationToken ct = default, CatalogDbContext? catalogDb = null)
    {
        var seeded = 0;
        seeded += await SeedDefaultAsync(db, ct);
        if (catalogDb != null) seeded += await SeedMatrixAsync(db, catalogDb, ct);
        return seeded;
    }

    private static async Task<int> SeedDefaultAsync(SalesDbContext db, CancellationToken ct)
    {
        if (await db.ReturnPolicies.IgnoreQueryFilters().AnyAsync(p => p.Name == PolicyName, ct)) return 0;

        var policy = new ReturnPolicy(
            name: PolicyName, categoryId: null,
            daysForReturn: 7, daysForExchange: 7, daysForDefectReplace: 7,
            requireOriginalPackaging: true, requireAllAccessories: true,
            restockingFeePercent: 0m, isActive: true, notes: DefaultNotes);

        db.ReturnPolicies.Add(policy);
        db.Entry(policy).Property("Id").CurrentValue =
            DeterministicGuid.Create(DeterministicGuid.UrlNamespace, "return-policy:" + PolicyName);
        SetD08Fields(db, policy, allowOpenedBox: false, missingAccessoriesFee: 0m);

        await db.SaveChangesAsync(ct);
        return 1;
    }

    private static async Task<int> SeedMatrixAsync(
        SalesDbContext db, CatalogDbContext catalogDb, CancellationToken ct)
    {
        var slugs = Matrix.Select(r => r.Slug!).ToList();
        var categories = await catalogDb.Categories.AsNoTracking()
            .Where(c => slugs.Contains(c.Slug))
            .Select(c => new { c.Id, c.Slug })
            .ToListAsync(ct);

        var existing = await db.ReturnPolicies.IgnoreQueryFilters()
            .Select(p => p.Name).ToListAsync(ct);

        var added = 0;
        foreach (var row in Matrix)
        {
            var category = categories.FirstOrDefault(c => c.Slug == row.Slug);
            if (category == null) continue;               // danh mục chưa tồn tại ở môi trường này
            if (existing.Contains(row.Name)) continue;    // idempotent

            var policy = new ReturnPolicy(
                name: row.Name, categoryId: category.Id,
                daysForReturn: row.DaysForReturn,
                daysForExchange: row.DaysForExchange,
                daysForDefectReplace: row.DaysForDefectReplace,
                requireOriginalPackaging: true, requireAllAccessories: true,
                restockingFeePercent: row.RestockingFeePercent,
                isActive: true, notes: row.Notes);

            db.ReturnPolicies.Add(policy);
            db.Entry(policy).Property("Id").CurrentValue =
                DeterministicGuid.Create(DeterministicGuid.UrlNamespace, "return-policy:" + row.Slug);
            SetD08Fields(db, policy, row.AllowOpenedBoxReturn, row.MissingAccessoriesFeePercent);
            added++;
        }

        if (added > 0) await db.SaveChangesAsync(ct);
        return added;
    }

    /// <summary>
    /// Ba cột D08 còn là SHADOW PROPERTY (cột có thật; file cấu hình EF thuộc W2-3) nên phải ghi
    /// qua <c>Entry(...).Property(...)</c>.
    /// </summary>
    private static void SetD08Fields(
        SalesDbContext db, ReturnPolicy policy, bool allowOpenedBox, decimal missingAccessoriesFee)
    {
        var entry = db.Entry(policy);
        entry.Property("AllowOpenedBoxReturn").CurrentValue = allowOpenedBox;
        entry.Property("MissingAccessoriesFeePercent").CurrentValue = missingAccessoriesFee;
        // 0 = "theo hạn bảo hành sản phẩm" cho WrongItem / NotAsDescribed (D08, Đ16.2.d).
        entry.Property("DaysForStatutoryReturn").CurrentValue = 0;
    }
}
