using System.Security.Claims;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair.Application.Quotes;

/// <summary>
/// Ai được soạn/sửa/gửi báo giá của một phiếu: Quản lý/Admin, hoặc kỹ thuật viên ĐANG được giao
/// phiếu đó (qua <see cref="TechnicianAccess.ResolveTechnicianAsync"/> — so Technician.Id, không so
/// id tài khoản; bản cũ so nhầm hai không gian id nên kỹ thuật viên luôn bị 403, lỗi W0-11).
/// </summary>
public static class RepairQuoteAccess
{
    public static async Task<bool> CanManageAsync(RepairDbContext db, ClaimsPrincipal user, WorkOrder workOrder)
    {
        if (TechnicianAccess.IsManager(user)) return true;
        if (!TechnicianAccess.TryGetUserId(user, out var userId)) return false;
        var technician = await TechnicianAccess.ResolveTechnicianAsync(db, userId);
        return technician != null && workOrder.TechnicianId == technician.Id;
    }

    /// <summary>Nhân viên sửa chữa được xem mọi báo giá (vai trò), khách chỉ xem phiếu của mình.</summary>
    public static bool IsRepairStaff(ClaimsPrincipal user)
    {
        var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToHashSet();
        return roles.Overlaps(new[] { "Admin", "Manager", "TechnicianInShop", "TechnicianOnSite" });
    }
}
