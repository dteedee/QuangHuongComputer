using Accounting.Domain;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Infrastructure.Seed;

/// <summary>
/// Danh mục chi phí mặc định của một cửa hàng máy tính.
///
/// Vì sao cần: bảng <c>ExpenseCategories</c> trống trơn trên DEV (0 dòng, kiểm tra 18/09/2026),
/// mà <c>POST /api/accounting/expenses</c> bắt buộc phải có <c>CategoryId</c> hợp lệ — nghĩa là
/// tính năng "ghi khoản chi" không dùng được ngay từ đầu. Consumer lương cũng tự tạo lẻ một
/// danh mục SALARY, để lại một danh mục mồ côi không có mã thống nhất.
///
/// Thêm-mới-không-ghi-đè: danh mục do kế toán tự sửa tên sẽ không bị lần seed sau ghi đè lại.
/// </summary>
public static class ExpenseCategorySeeder
{
    /// <summary>(Mã, Tên, Mô tả). Mã là khoá đối chiếu, không bao giờ đổi.</summary>
    private static readonly (string Code, string Name, string Description)[] Defaults =
    {
        ("SALARY", "Lương và phụ cấp", "Lương, phụ cấp, thưởng cho nhân viên"),
        ("INSURANCE", "Bảo hiểm bắt buộc", "Phần BHXH, BHYT, BHTN do công ty đóng"),
        ("RENT", "Thuê mặt bằng", "Tiền thuê cửa hàng, kho"),
        ("UTILITIES", "Điện nước", "Tiền điện, nước, rác"),
        ("INTERNET", "Internet và viễn thông", "Cước internet, điện thoại, tổng đài"),
        ("MARKETING", "Marketing và quảng cáo", "Quảng cáo, khuyến mại, in ấn"),
        ("SHIPPING", "Vận chuyển", "Cước giao hàng, xăng xe giao hàng"),
        ("SUPPLIES", "Văn phòng phẩm và vật tư", "Vật tư tiêu hao, văn phòng phẩm"),
        ("MAINTENANCE", "Sửa chữa và bảo trì", "Bảo trì thiết bị, sửa chữa cửa hàng"),
        ("WARRANTY", "Chi phí bảo hành", "Linh kiện thay thế, chi phí bảo hành cho khách"),
        ("BANK_FEE", "Phí ngân hàng và cổng thanh toán", "Phí chuyển khoản, phí cổng thanh toán"),
        ("TAX_FEE", "Thuế, phí, lệ phí", "Lệ phí môn bài và các khoản phí nhà nước"),
        ("OTHER", "Chi phí khác", "Các khoản chi không thuộc nhóm nào ở trên")
    };

    /// <summary>Trả về số danh mục vừa được thêm.</summary>
    public static async Task<int> SeedAsync(AccountingDbContext db, CancellationToken ct = default)
    {
        var existing = await db.ExpenseCategories
            .Select(c => c.Code)
            .ToListAsync(ct);

        var have = new HashSet<string>(existing, StringComparer.OrdinalIgnoreCase);
        var added = 0;

        foreach (var (code, name, description) in Defaults)
        {
            if (have.Contains(code)) continue;
            db.ExpenseCategories.Add(ExpenseCategory.Create(name, code, description));
            added++;
        }

        if (added > 0) await db.SaveChangesAsync(ct);
        return added;
    }
}
