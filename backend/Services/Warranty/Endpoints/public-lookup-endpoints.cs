using BuildingBlocks.Endpoints;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Identity.Infrastructure;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

/// <summary>
/// W2-6 (Implementation Step 10, binding): tra cứu bảo hành công khai KHÔNG cần đăng nhập.
///
/// Thay đổi so với bản Phase-07 cũ (xem integration-requests-w2.md cho lý do đầy đủ):
///  - XOÁ bộ đếm in-memory tự chế + "captcha" giả (chấp nhận BẤT KỲ chuỗi non-empty nào là hợp lệ
///    - không xác minh thật, chỉ là một cổng UI vô nghĩa). Phase file cho 2 lựa chọn: captcha thật,
///    hoặc bỏ claim captcha. Không có provider captcha nào trong repo (grep rỗng) nên chọn vế thứ 2:
///    XOÁ hẳn cờ requiresCaptcha khỏi response — không giả vờ có captcha nữa.
///  - Dùng platform rate limiter (W0-2, <c>RateLimitingSetup.LookupPolicy</c> = "lookup",
///    đăng ký ở ApiGateway) qua <c>RequireRateLimiting("lookup")</c> thay vì tự đếm request bằng
///    <c>ConcurrentDictionary</c> per-instance (không sống sót qua nhiều instance, không có
///    Retry-After chuẩn). Không thể reference hằng số <c>RateLimitingSetup.LookupPolicy</c> trực
///    tiếp (Warranty.csproj không, và không nên, reference ngược ApiGateway.csproj) nên dùng chuỗi
///    "lookup" - PHẢI khớp tên policy đăng ký ở backend/ApiGateway/Startup/RateLimitingSetup.cs.
///  - IP thật: <c>HttpContext.Connection.RemoteIpAddress</c> qua
///    <see cref="RateLimitPartitionKeyResolver.ClientIpKey"/> - IP này đã được ApiGateway's
///    <c>UseForwardedHeaders()</c> giải mã từ X-Forwarded-For CHỈ với proxy tin cậy (không tự đọc
///    header thô như bản cũ, vốn nhận bất kỳ header giả mạo nào từ client).
///  - lookup-by-phone giờ xác minh THẬT số điện thoại (chuẩn hoá số) khớp với
///    <c>ApplicationUser.PhoneNumber</c> của khách hàng sở hữu warranty theo orderNumber - bản cũ
///    nhận tham số phone nhưng KHÔNG BAO GIỜ dùng nó, chỉ khớp theo orderNumber (bất kỳ ai biết số
///    hoá đơn public thì "phone" nào cũng qua được).
/// Bảo mật giữ nguyên: KHÔNG trả PII (tên/địa chỉ/SĐT khách), KHÔNG log query payload.
/// </summary>
public static class PublicWarrantyLookupEndpoints
{
    /// <summary>Phải khớp <c>ApiGateway.Startup.RateLimitingSetup.LookupPolicy</c> — không thể
    /// tham chiếu hằng số đó trực tiếp (xem class doc).</summary>
    private const string LookupRateLimitPolicy = "lookup";

    public static void MapPublicWarrantyLookupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/public/warranty")
            .RequireRateLimiting(LookupRateLimitPolicy);

        group.MapGet("/lookup", async (
            [FromQuery] string? serial,
            HttpContext http,
            WarrantyDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(serial))
                return Results.BadRequest(new { Error = "serial là bắt buộc" });

            // 1 máy có thể có 2 warranty song song (Manufacturer + Store).
            var warranties = await db.ProductWarranties
                .AsNoTracking()
                .Where(w => w.SerialNumber == serial)
                .OrderBy(w => w.Provider)
                .ToListAsync();

            if (!warranties.Any())
                return Results.Ok(new { found = false });

            // Active claim (chưa Resolved/Rejected) — chỉ trả metadata tối thiểu.
            var activeClaim = await db.Claims.AsNoTracking()
                .Where(c => c.SerialNumber == serial
                            && c.Status != ClaimStatus.Resolved
                            && c.Status != ClaimStatus.Rejected)
                .OrderByDescending(c => c.FiledDate)
                .Select(c => new { status = c.Status.ToString(), filedDate = c.FiledDate })
                .FirstOrDefaultAsync();

            var payload = warranties.Select(w => new
            {
                provider = w.Provider.ToString(),
                isValid = w.IsValid(),
                expiresAt = w.ExpirationDate.Date // ẩn giờ để giảm rò rỉ
            });

            return Results.Ok(new { found = true, warranties = payload, activeClaim });
        });

        // Cross-verify bằng SĐT + OrderNumber — CHỈ trả boolean "khớp" + số warranty.
        // KHÔNG trả detail warranty vì phone + orderNumber có thể lộ.
        group.MapGet("/lookup-by-phone", async (
            [FromQuery] string? phone,
            [FromQuery] string? orderNumber,
            WarrantyDbContext db,
            IdentityDbContext identityDb) =>
        {
            if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(orderNumber))
                return Results.BadRequest(new { Error = "phone và orderNumber là bắt buộc" });

            var normalizedInput = NormalizePhone(phone);
            if (normalizedInput.Length < 9)
                return Results.BadRequest(new { Error = "Số điện thoại không hợp lệ" });

            var warranties = await db.ProductWarranties
                .AsNoTracking()
                .Where(w => w.OrderNumber == orderNumber)
                .ToListAsync();

            if (!warranties.Any())
                return Results.Ok(new { found = false });

            // Xác minh thật: SĐT phải khớp chủ sở hữu warranty (trước đây tham số phone không
            // được dùng — bất kỳ ai biết orderNumber công khai đều "khớp").
            // ApplicationUser.Id is IdentityUser's string key; ProductWarranty.CustomerId is a Guid.
            var customerIds = warranties.Select(w => w.CustomerId.ToString()).Distinct().ToList();
            var owns = await identityDb.Users
                .AsNoTracking()
                .Where(u => customerIds.Contains(u.Id) && u.PhoneNumber != null)
                .Select(u => u.PhoneNumber!)
                .ToListAsync();

            var matches = owns.Any(p => NormalizePhone(p) == normalizedInput);
            if (!matches)
                return Results.Ok(new { found = false });

            return Results.Ok(new { found = true, count = warranties.Count });
        });
    }

    /// <summary>Chỉ giữ chữ số, quy 84xxxxxxxxx -> 0xxxxxxxxx để khớp cả 2 định dạng nhập liệu
    /// VN (giống pattern NormalizePhone ở Repair/PublicTrackingEndpoints.cs, mở rộng thêm 84-prefix
    /// vì trường phone ở đây có thể do khách gõ tay ở nhiều định dạng khác nhau).</summary>
    private static string NormalizePhone(string? phone)
    {
        var digits = new string((phone ?? string.Empty).Where(char.IsDigit).ToArray());
        if (digits.Length == 11 && digits.StartsWith("84"))
            return "0" + digits[2..];
        if (digits.Length == 10 && digits.StartsWith("84"))
            return "0" + digits[2..]; // hiếm nhưng phòng trường hợp thiếu số đầu di động
        return digits;
    }
}
