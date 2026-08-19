using Identity.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Sales.Application.Consumers;

/// <summary>
/// Tra cứu email/tên khách hàng thật từ IdentityDbContext (ApplicationUser) theo CustomerId.
/// Dùng chung cho các consumer gửi email đơn hàng/thanh toán — tránh dữ liệu giả kiểu customer-{id}@example.com.
/// </summary>
public static class CustomerContactResolver
{
    public static async Task<(string Email, string Name)> ResolveAsync(
        IdentityDbContext identityDb, Guid customerId, CancellationToken ct = default)
    {
        var user = await identityDb.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == customerId.ToString(), ct);

        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            // Khách vãng lai/không tìm thấy user — không gửi email giả, log để theo dõi ở nơi gọi.
            return (string.Empty, "Quý khách");
        }

        var name = string.IsNullOrWhiteSpace(user.FullName) ? user.Email : user.FullName;
        return (user.Email, name);
    }
}
