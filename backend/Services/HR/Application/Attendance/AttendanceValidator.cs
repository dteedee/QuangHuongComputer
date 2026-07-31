using System.Security.Cryptography;
using System.Text;

namespace HR.Application.Attendance;

/// <summary>Kết quả validate chấm công.</summary>
public class AttendanceValidationResult
{
    public bool IsValid { get; init; }
    public string? Reason { get; init; }
    public static AttendanceValidationResult Ok() => new() { IsValid = true };
    public static AttendanceValidationResult Fail(string reason) => new() { IsValid = false, Reason = reason };
}

/// <summary>
/// Cung cấp toạ độ + danh sách IP cho từng Store (chi nhánh).
/// Được inject để tránh phụ thuộc trực tiếp vào SystemConfigDbContext (cross-module).
/// </summary>
public interface IStoreLocationProvider
{
    Task<StoreLocationInfo?> GetAsync(Guid storeId, CancellationToken ct = default);
}

public record StoreLocationInfo(
    Guid StoreId,
    decimal? Latitude,
    decimal? Longitude,
    IReadOnlyCollection<string> AllowedIps);

/// <summary>Fallback in-memory nếu chưa cấu hình SystemConfig.</summary>
public class InMemoryStoreLocationProvider : IStoreLocationProvider
{
    private readonly Dictionary<Guid, StoreLocationInfo> _stores;
    public InMemoryStoreLocationProvider(Dictionary<Guid, StoreLocationInfo>? seed = null)
        => _stores = seed ?? new();
    public void Add(StoreLocationInfo info) => _stores[info.StoreId] = info;
    public Task<StoreLocationInfo?> GetAsync(Guid storeId, CancellationToken ct = default)
        => Task.FromResult(_stores.TryGetValue(storeId, out var info) ? info : null);
}

/// <summary>
/// Validator chấm công theo 4 phương thức:
/// - QR: mã TOTP 30s sinh từ StoreId (chống chụp màn hình)
/// - GPS: bán kính X mét từ Store (Haversine)
/// - WiFi: IP thuộc dải Store cho phép
/// - Manual: bắt buộc lý do + role Manager (kiểm ở endpoint)
/// </summary>
public class AttendanceValidator
{
    private readonly IStoreLocationProvider _stores;

    // TOTP secret dùng chung cho toàn hệ thống - có thể chuyển sang SystemConfig ở Phase 08
    private const string TotpSecret = "QuangHuongComputer2026-TOTP-Secret-DoNotShare";

    public AttendanceValidator(IStoreLocationProvider stores) => _stores = stores;

    // ==============================================================
    // QR — TOTP 30s
    // ==============================================================

    /// <summary>Sinh QR code (chuỗi 6 chữ số) cho Store tại thời điểm now. Đổi mỗi 30 giây.</summary>
    public static string GenerateQr(Guid storeId, DateTimeOffset? now = null)
    {
        var t = now ?? DateTimeOffset.UtcNow;
        var counter = t.ToUnixTimeSeconds() / 30;
        return ComputeTotp(storeId, counter);
    }

    /// <summary>Validate QR: chấp nhận code của bucket hiện tại và 1 bucket trước (dung sai clock skew).</summary>
    public AttendanceValidationResult ValidateQr(string code, Guid storeId, DateTimeOffset? now = null)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != 6)
            return AttendanceValidationResult.Fail("Mã QR không hợp lệ.");

        var t = now ?? DateTimeOffset.UtcNow;
        var currentBucket = t.ToUnixTimeSeconds() / 30;

        // Chấp nhận bucket hiện tại và bucket trước (dung sai 30s)
        for (long delta = 0; delta >= -1; delta--)
        {
            var expected = ComputeTotp(storeId, currentBucket + delta);
            if (CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(code)))
                return AttendanceValidationResult.Ok();
        }
        return AttendanceValidationResult.Fail("Mã QR đã hết hạn hoặc sai.");
    }

    private static string ComputeTotp(Guid storeId, long counter)
    {
        var key = Encoding.UTF8.GetBytes(TotpSecret + ":" + storeId);
        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian) Array.Reverse(counterBytes);

        using var hmac = new HMACSHA1(key);
        var hash = hmac.ComputeHash(counterBytes);
        var offset = hash[^1] & 0x0F;
        var binary = ((hash[offset] & 0x7F) << 24)
                   | ((hash[offset + 1] & 0xFF) << 16)
                   | ((hash[offset + 2] & 0xFF) << 8)
                   | (hash[offset + 3] & 0xFF);
        return (binary % 1_000_000).ToString("D6");
    }

    // ==============================================================
    // GPS — Haversine
    // ==============================================================

    /// <summary>Validate toạ độ nằm trong bán kính (mét) từ Store.</summary>
    public async Task<AttendanceValidationResult> ValidateGpsAsync(
        Guid storeId,
        decimal latitude,
        decimal longitude,
        int radiusMeters = 100,
        CancellationToken ct = default)
    {
        var store = await _stores.GetAsync(storeId, ct);
        if (store == null) return AttendanceValidationResult.Fail("Không tìm thấy chi nhánh.");
        if (!store.Latitude.HasValue || !store.Longitude.HasValue)
            return AttendanceValidationResult.Fail("Chi nhánh chưa cấu hình toạ độ GPS.");

        var distance = HaversineMeters(
            (double)store.Latitude.Value, (double)store.Longitude.Value,
            (double)latitude, (double)longitude);

        return distance <= radiusMeters
            ? AttendanceValidationResult.Ok()
            : AttendanceValidationResult.Fail(
                $"Vị trí cách chi nhánh {distance:F0}m (giới hạn {radiusMeters}m).");
    }

    /// <summary>Khoảng cách 2 toạ độ (mét) — công thức Haversine.</summary>
    public static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6_371_000; // bán kính Trái Đất (m)
        var φ1 = ToRad(lat1);
        var φ2 = ToRad(lat2);
        var Δφ = ToRad(lat2 - lat1);
        var Δλ = ToRad(lon2 - lon1);

        var a = Math.Sin(Δφ / 2) * Math.Sin(Δφ / 2)
              + Math.Cos(φ1) * Math.Cos(φ2) * Math.Sin(Δλ / 2) * Math.Sin(Δλ / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180.0;

    // ==============================================================
    // WiFi — IP whitelist
    // ==============================================================

    public async Task<AttendanceValidationResult> ValidateWifiAsync(
        Guid storeId,
        string clientIp,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(clientIp))
            return AttendanceValidationResult.Fail("Không lấy được IP client.");

        var store = await _stores.GetAsync(storeId, ct);
        if (store == null) return AttendanceValidationResult.Fail("Không tìm thấy chi nhánh.");
        if (store.AllowedIps.Count == 0)
            return AttendanceValidationResult.Fail("Chi nhánh chưa cấu hình IP mạng.");

        // Chấp nhận: exact match hoặc prefix (CIDR đơn giản = tiền tố dấu chấm)
        var normalized = clientIp.Trim();
        foreach (var allowed in store.AllowedIps)
        {
            if (allowed == normalized) return AttendanceValidationResult.Ok();
            if (allowed.EndsWith(".*"))
            {
                var prefix = allowed[..^1];   // "192.168.1."
                if (normalized.StartsWith(prefix)) return AttendanceValidationResult.Ok();
            }
        }
        return AttendanceValidationResult.Fail($"IP {normalized} không thuộc dải mạng chi nhánh.");
    }

    // ==============================================================
    // Manual — quản lý chấm hộ
    // ==============================================================

    /// <summary>Validate lý do chấm tay. Kiểm role Manager phải làm ở endpoint (Authorization).</summary>
    public AttendanceValidationResult ValidateManual(Guid managerId, string? reason)
    {
        if (managerId == Guid.Empty)
            return AttendanceValidationResult.Fail("Manager ID là bắt buộc.");
        if (string.IsNullOrWhiteSpace(reason))
            return AttendanceValidationResult.Fail("Phải ghi lý do chấm tay.");
        if (reason.Length < 10)
            return AttendanceValidationResult.Fail("Lý do quá ngắn (tối thiểu 10 ký tự).");
        return AttendanceValidationResult.Ok();
    }
}
