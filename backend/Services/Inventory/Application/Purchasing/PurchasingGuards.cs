using System.Security.Claims;
using BuildingBlocks.Endpoints;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.Purchasing;

/// <summary>
/// Các kiểm tra cần CSDL của luồng mua hàng (W2-12 bước 5). Validator FluentValidation chỉ nhìn
/// được body; "nhà cung cấp có tồn tại và còn hoạt động không", "kho có thật không" thì phải hỏi
/// CSDL — theo `docs/api-conventions.md` §2 những luật đó ném
/// <see cref="RequestValidationException"/> để thân lỗi giống hệt bộ lọc validation.
/// </summary>
public static class PurchasingGuards
{
    /// <summary>NCC phải tồn tại và còn hoạt động — không cho đặt hàng một NCC đã ngừng hợp tác.</summary>
    public static async Task EnsureSupplierUsableAsync(
        InventoryDbContext db, Guid supplierId, string field = "supplierId", CancellationToken ct = default)
    {
        var state = await db.Suppliers
            .Where(s => s.Id == supplierId)
            .Select(s => (bool?)s.IsActive)
            .FirstOrDefaultAsync(ct);

        if (state is null)
            throw new RequestValidationException(field, "Nhà cung cấp không tồn tại.");
        if (state == false)
            throw new RequestValidationException(field, "Nhà cung cấp đã ngừng hoạt động.");
    }

    /// <summary>Kho phải tồn tại và còn hoạt động.</summary>
    public static async Task EnsureWarehouseUsableAsync(
        InventoryDbContext db, Guid warehouseId, string field = "warehouseId", CancellationToken ct = default)
    {
        var active = await db.Warehouses
            .Where(w => w.Id == warehouseId)
            .Select(w => (bool?)w.IsActive)
            .FirstOrDefaultAsync(ct);

        if (active is null)
            throw new RequestValidationException(field, "Kho không tồn tại.");
        if (active == false)
            throw new RequestValidationException(field, "Kho đã ngừng hoạt động.");
    }

    /// <summary>
    /// Người thực hiện LUÔN lấy từ JWT, không bao giờ từ body: nếu tin body thì ai cũng ký được
    /// chứng từ mua hàng dưới tên người khác.
    /// </summary>
    public static Guid RequireUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(raw, out var id)
            ? id
            : throw new ForbiddenException("Không xác định được người dùng từ phiên đăng nhập.");
    }

    /// <summary>Tên hiển thị của người thực hiện (để chụp lên chứng từ).</summary>
    public static string ResolveUserName(ClaimsPrincipal user)
        => user.Identity?.Name
           ?? user.FindFirstValue(ClaimTypes.Email)
           ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? "system";
}
