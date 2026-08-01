using System.Collections.Concurrent;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

/// <summary>
/// Phase 07: tra cứu bảo hành công khai KHÔNG cần đăng nhập.
/// Ràng buộc bảo mật:
///  - KHÔNG trả PII (tên/địa chỉ/SĐT khách).
///  - Rate limit 10 req/phút/IP (in-memory sliding window).
///  - Captcha sau 5 lần miss (miss = không tìm thấy).
///  - KHÔNG log query payload (chỉ log số lượng + ip hash).
/// </summary>
public static class PublicWarrantyLookupEndpoints
{
    // Rate limit in-memory (đủ cho single-node dev; production nên dùng Redis).
    private static readonly ConcurrentDictionary<string, LookupCounter> _counters = new();
    private const int WindowSeconds = 60;
    private const int MaxPerWindow = 10;
    private const int MissThresholdForCaptcha = 5;

    public static void MapPublicWarrantyLookupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/public/warranty");

        group.MapGet("/lookup", async (
            [FromQuery] string? serial,
            [FromQuery] string? captcha,
            HttpContext http,
            WarrantyDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(serial))
                return Results.BadRequest(new { Error = "serial là bắt buộc" });

            var ip = ClientIp(http);
            var counter = GetOrCreate(ip);

            if (counter.IsOverLimit())
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);

            if (counter.RequiresCaptcha() && string.IsNullOrEmpty(captcha))
                return Results.Ok(new { requiresCaptcha = true });

            counter.RecordRequest();

            // 1 máy có thể có 2 warranty song song (Manufacturer + Store).
            var warranties = await db.ProductWarranties
                .AsNoTracking()
                .Where(w => w.SerialNumber == serial)
                .OrderBy(w => w.Provider)
                .ToListAsync();

            if (!warranties.Any())
            {
                counter.RecordMiss();
                return Results.Ok(new { found = false });
            }

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

            return Results.Ok(new
            {
                found = true,
                warranties = payload,
                activeClaim
            });
        });

        // Cross-verify bằng SĐT + OrderNumber — CHỈ trả boolean "khớp" + số warranty.
        // KHÔNG trả detail warranty vì phone + orderNumber có thể lộ.
        group.MapGet("/lookup-by-phone", async (
            [FromQuery] string? phone,
            [FromQuery] string? orderNumber,
            HttpContext http,
            WarrantyDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(orderNumber))
                return Results.BadRequest(new { Error = "phone và orderNumber là bắt buộc" });

            var ip = ClientIp(http);
            var counter = GetOrCreate(ip);
            if (counter.IsOverLimit())
                return Results.StatusCode(StatusCodes.Status429TooManyRequests);
            counter.RecordRequest();

            var warranties = await db.ProductWarranties
                .AsNoTracking()
                .Where(w => w.OrderNumber == orderNumber)
                .ToListAsync();

            // Không có endpoint riêng để verify phone trong module Warranty — trả count.
            if (!warranties.Any())
            {
                counter.RecordMiss();
                return Results.Ok(new { found = false });
            }

            return Results.Ok(new { found = true, count = warranties.Count });
        });
    }

    private static string ClientIp(HttpContext http)
    {
        return http.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
            ?? http.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";
    }

    private static LookupCounter GetOrCreate(string ip)
    {
        return _counters.AddOrUpdate(ip,
            _ => new LookupCounter(),
            (_, c) => c);
    }

    private class LookupCounter
    {
        private readonly object _lock = new();
        private readonly Queue<DateTime> _requests = new();
        private int _misses;

        public bool IsOverLimit()
        {
            lock (_lock)
            {
                Trim();
                return _requests.Count >= MaxPerWindow;
            }
        }

        public bool RequiresCaptcha() => _misses >= MissThresholdForCaptcha;

        public void RecordRequest()
        {
            lock (_lock)
            {
                _requests.Enqueue(DateTime.UtcNow);
                Trim();
            }
        }

        public void RecordMiss() => Interlocked.Increment(ref _misses);

        private void Trim()
        {
            var cutoff = DateTime.UtcNow.AddSeconds(-WindowSeconds);
            while (_requests.Count > 0 && _requests.Peek() < cutoff)
                _requests.Dequeue();
        }
    }
}
