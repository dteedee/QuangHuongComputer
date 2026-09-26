using System.Security.Cryptography;
using System.Text;
using HR.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

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
/// Validator chấm công theo 4 phương thức:
/// - QR: mã TOTP 30s sinh từ StoreId (chống chụp màn hình)
/// - GPS: bán kính X mét từ Store (Haversine)
/// - WiFi: IP thuộc dải Store cho phép
/// - Manual: bắt buộc lý do + role Manager (kiểm ở endpoint)
/// </summary>
public class AttendanceValidator
{
    private readonly IStoreLocationProvider _stores;
    private readonly string? _totpSecret;
    private readonly ILogger<AttendanceValidator> _logger;

    /// <summary>Phương thức chấm công được PHÉP, đọc từ config <c>Hr:AllowedCheckInMethods</c>
    /// (CSV, mặc định KHÔNG có Web — chấm qua trình duyệt chỉ xác thực bằng IP, dễ giả mạo).</summary>
    private readonly HashSet<CheckInMethod> _allowedMethods;

    /// <summary>Lý do trả cho người dùng khi QR chưa cấu hình secret — không lộ chi tiết cấu hình.</summary>
    public const string QrNotConfiguredReason =
        "Chấm công bằng mã QR chưa được cấu hình trên hệ thống. Vui lòng liên hệ quản trị viên.";

    // Secret TOTP đọc từ Hr:AttendanceTotpSecret qua AttendanceTotpSecret — KHÔNG có fallback
    // hằng số trong mã nguồn. Thiếu ⇒ QR bị từ chối (fail-closed) và log lỗi; GPS/WiFi/Manual vẫn chạy.
    public AttendanceValidator(
        IStoreLocationProvider stores,
        IConfiguration? config = null,
        ILogger<AttendanceValidator>? logger = null)
    {
        _stores = stores;
        _logger = logger ?? NullLogger<AttendanceValidator>.Instance;
        _totpSecret = AttendanceTotpSecret.Resolve(config);

        var configured = config?["Hr:AllowedCheckInMethods"];
        if (string.IsNullOrWhiteSpace(configured))
        {
            // Mặc định: KHÔNG cho Web (chỉ IP, không đối chiếu vị trí/mạng thật).
            _allowedMethods = new HashSet<CheckInMethod>
                { CheckInMethod.QR, CheckInMethod.GPS, CheckInMethod.WiFi, CheckInMethod.Manual };
        }
        else
        {
            _allowedMethods = configured.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => Enum.TryParse<CheckInMethod>(s, true, out var m) ? (CheckInMethod?)m : null)
                .Where(m => m.HasValue).Select(m => m!.Value)
                .ToHashSet();
            if (_allowedMethods.Count == 0)
                _allowedMethods = new HashSet<CheckInMethod> { CheckInMethod.QR, CheckInMethod.GPS, CheckInMethod.WiFi, CheckInMethod.Manual };
        }
    }

    /// <summary>Phương thức có được bật cho hệ thống này không (độc lập với việc dữ liệu gửi lên hợp lệ).</summary>
    public bool IsMethodAllowed(CheckInMethod method) => _allowedMethods.Contains(method);

    // ==============================================================
    // QR — TOTP 30s
    // ==============================================================

    /// <summary>Secret TOTP đã được cấu hình hợp lệ hay chưa.</summary>
    public bool IsQrConfigured => _totpSecret is not null;

    /// <summary>
    /// Sinh QR code (chuỗi 6 chữ số) cho Store tại thời điểm now, dùng secret ĐÃ CẤU HÌNH của
    /// validator này — dùng ở endpoint thật (<c>GET /api/hr/attendance/qr-code</c>) để mã sinh ra
    /// khớp với secret mà <see cref="ValidateQr"/> sẽ kiểm. Null khi chưa cấu hình secret.
    /// </summary>
    public string? GenerateCode(Guid storeId, DateTimeOffset? now = null)
    {
        if (_totpSecret is null)
        {
            LogQrNotConfigured();
            return null;
        }
        return GenerateQr(storeId, _totpSecret, now);
    }

    /// <summary>Sinh QR code với secret truyền vào tường minh (không có secret mặc định).</summary>
    public static string GenerateQr(Guid storeId, string secret, DateTimeOffset? now = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(secret);
        var t = now ?? DateTimeOffset.UtcNow;
        var counter = t.ToUnixTimeSeconds() / 30;
        return ComputeTotp(storeId, counter, secret);
    }

    /// <summary>Validate QR: chấp nhận code của bucket hiện tại và 1 bucket trước (dung sai clock skew).</summary>
    public AttendanceValidationResult ValidateQr(string code, Guid storeId, DateTimeOffset? now = null)
    {
        if (_totpSecret is null)
        {
            LogQrNotConfigured();
            return AttendanceValidationResult.Fail(QrNotConfiguredReason);
        }
        if (string.IsNullOrWhiteSpace(code) || code.Length != 6)
            return AttendanceValidationResult.Fail("Mã QR không hợp lệ.");

        var t = now ?? DateTimeOffset.UtcNow;
        var currentBucket = t.ToUnixTimeSeconds() / 30;

        // Chấp nhận bucket hiện tại và bucket trước (dung sai 30s)
        for (long delta = 0; delta >= -1; delta--)
        {
            var expected = ComputeTotp(storeId, currentBucket + delta, _totpSecret);
            if (CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(code)))
                return AttendanceValidationResult.Ok();
        }
        return AttendanceValidationResult.Fail("Mã QR đã hết hạn hoặc sai.");
    }

    private void LogQrNotConfigured() => _logger.LogError(
        "Chấm công QR bị từ chối: {Key} chưa được cấu hình hợp lệ. Đặt biến môi trường " +
        "ATTENDANCE_TOTP_SECRET (tối thiểu {Min} ký tự, scripts/gen-secrets.sh sinh sẵn).",
        AttendanceTotpSecret.ConfigKey, AttendanceTotpSecret.MinimumLength);

    private static string ComputeTotp(Guid storeId, long counter, string secret)
    {
        var key = Encoding.UTF8.GetBytes(secret + ":" + storeId);
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
