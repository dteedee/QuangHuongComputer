using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Identity.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Sales.Endpoints.Pos;

/// <summary>
/// TÌM KHÁCH Ở QUẦY — phase-48 bước 3.
///
/// Vì sao không dùng `/api/auth/users`: endpoint đó đòi <c>Permissions.Users.View</c> (quyền quản
/// trị tài khoản) và trả về cả NHÂN VIÊN. Vai trò Sale ở quầy không có — và không được có — quyền
/// đó, nên màn hình POS hoặc phải chạy bằng tài khoản Admin (sai), hoặc không tìm được khách.
/// <see cref="IUserDirectory"/> là lối đi hẹp đúng nghĩa: chỉ khách hàng đang hoạt động, chỉ
/// tên/điện thoại/email, không mật khẩu, không vai trò.
/// </summary>
internal static class PosCustomerEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        var pos = group.MapGroup("/pos");

        pos.MapGet("/customers", async (
            string? q,
            IUserDirectory directory,
            CancellationToken ct,
            int limit = 20) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return Results.Ok(new { total = 0, items = Array.Empty<object>() });

            var matches = await directory.SearchCustomersAsync(q.Trim(), Math.Clamp(limit, 1, 50), ct);
            var items = matches.Select(m => new
            {
                id = m.Id,
                fullName = m.FullName,
                phone = m.PhoneNumber,
                email = m.Email,
            }).ToList();

            return Results.Ok(new { total = items.Count, items });
        }).RequireAuthorization(Permissions.Sales.Pos);

        // Tạo nhanh khách mới ngay ở quầy. Idempotent theo email: gọi hai lần trả về cùng một
        // tài khoản thay vì 409 dội vào mặt thu ngân giữa hàng đợi.
        pos.MapPost("/customers", async (
            PosQuickCustomerRequest req,
            IUserDirectory directory,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.FullName))
                throw new RequestValidationException("fullName", "Tên khách hàng là bắt buộc.");

            // Hạn chế đã biết: bản cài đặt hiện tại của IUserDirectory BẮT BUỘC email để tạo tài
            // khoản (UserManager cần UserName). Khách chỉ có số điện thoại thì bán khách vãng lai
            // (bỏ trống customerId) — xem integration request W2-10 về provision theo số điện thoại.
            if (string.IsNullOrWhiteSpace(req.Email))
                throw new RequestValidationException("email",
                    "Tạo tài khoản khách cần email. Không có email thì bán cho khách vãng lai.");

            var result = await directory.ProvisionCustomerAsync(
                req.FullName.Trim(), req.Email.Trim(), req.Phone?.Trim(), ct);

            if (!result.Succeeded || result.User == null)
                throw new DomainException(result.Error ?? "Không tạo được tài khoản khách.");

            return Results.Ok(new
            {
                id = result.User.Id,
                fullName = result.User.FullName,
                phone = result.User.PhoneNumber,
                email = result.User.Email,
                alreadyExisted = result.AlreadyExisted,
            });
        }).RequireAuthorization(Permissions.Sales.Pos);
    }
}

/// <summary>Tạo nhanh khách ở quầy.</summary>
public sealed record PosQuickCustomerRequest(string FullName, string? Phone, string? Email);
