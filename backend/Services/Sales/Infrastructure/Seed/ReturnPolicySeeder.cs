using Catalog.Infrastructure.Data.Import;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Infrastructure.Seed;

/// <summary>
/// The fallback return policy (D08). One row, <c>CategoryId = null</c>, which
/// <c>GetEffectivePolicyAsync</c> falls back to when no leaf/parent category policy matches.
/// A fresh install had zero rows, so every return request resolved to "no policy" and the
/// returns flow was dead out of the box.
///
/// Values are the DEFAULT line of D08's matrix: 12-month warranty fallback (Warranty module),
/// 7 days for a manufacturer-defect one-for-one swap, and the R-B buy-back window - 7 days,
/// sealed box only, 0% deduction. The finer D08 columns (<c>AllowOpenedBoxReturn</c>,
/// <c>MissingAccessoriesFeePercent</c>, <c>DaysForStatutoryReturn</c>) do not exist in the
/// current schema; W1-11 adds them and the wave-2 owner seeds them.
/// </summary>
public static class ReturnPolicySeeder
{
    public const string PolicyName = "DEFAULT";

    private const string Notes =
        "Chính sách mặc định (D08). Nhóm lý do luật định (lỗi nhà sản xuất, giao sai, hư hỏng do " +
        "vận chuyển, không đúng mô tả) miễn phí hoàn toàn và không bị giới hạn bởi cửa sổ 7 ngày " +
        "này. 7 ngày là cửa sổ MUA LẠI tự nguyện: chỉ nhận lại hàng còn nguyên seal, khấu trừ 0%.";

    public static async Task<int> SeedAsync(SalesDbContext db, CancellationToken ct = default)
    {
        if (await db.ReturnPolicies.AnyAsync(p => p.Name == PolicyName, ct)) return 0;

        var policy = new ReturnPolicy(
            name: PolicyName,
            categoryId: null,
            daysForReturn: 7,
            daysForExchange: 7,
            daysForDefectReplace: 7,
            requireOriginalPackaging: true,
            requireAllAccessories: true,
            restockingFeePercent: 0m,
            isActive: true,
            notes: Notes);

        db.ReturnPolicies.Add(policy);
        db.Entry(policy).Property("Id").CurrentValue =
            DeterministicGuid.Create(DeterministicGuid.UrlNamespace, "return-policy:" + PolicyName);

        await db.SaveChangesAsync(ct);
        return 1;
    }
}
