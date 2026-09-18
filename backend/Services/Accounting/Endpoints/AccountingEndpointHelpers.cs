using System.Security.Claims;
using BuildingBlocks.Endpoints;

namespace Accounting.Endpoints;

/// <summary>Tiện ích dùng chung cho các nhóm endpoint của module Kế toán.</summary>
public static class AccountingEndpointHelpers
{
    /// <summary>
    /// Id người dùng LẤY TỪ JWT. Không bao giờ nhận id người thao tác từ body request —
    /// nếu nhận thì bất kỳ ai cũng mở/chốt được ca của người khác.
    /// </summary>
    public static Guid RequireUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? user.FindFirstValue("sub");

        if (!Guid.TryParse(raw, out var id) || id == Guid.Empty)
            throw new ForbiddenException("Không xác định được người dùng từ phiên đăng nhập.");

        return id;
    }
}
