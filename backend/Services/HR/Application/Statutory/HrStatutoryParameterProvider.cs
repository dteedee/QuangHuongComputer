using BuildingBlocks.TaxEngine;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace HR.Application.Statutory;

/// <summary>
/// W2-25 / D06 §3 — implementation thật của <see cref="IStatutoryParameterProvider"/> trên bảng
/// <c>hr."StatutoryParameters"</c>.
///
/// Quy tắc (D06 §3):
///  · mỗi <c>Code</c> lấy dòng <c>EffectiveFrom &lt;= asOf</c> lớn nhất — làm bởi
///    <see cref="StatutoryParameterSetFactory"/>, MỘT đường parse duy nhất cho cả DB lẫn mặc định;
///  · thiếu dòng cho một Code -> lấy mặc định biên dịch sẵn <see cref="VietnamStatutoryDefaults"/>
///    CHO RIÊNG Code đó và ghi log warning (không vứt bỏ các dòng admin đã sửa);
///  · cache 10 phút, xoá cache ngay khi có ghi (<see cref="Invalidate"/>).
///
/// Ngày truyền vào luôn là ngày VN: ngày 01 của tháng lương (bảo hiểm/LTT vùng/hệ số OT) hoặc
/// <c>PayrollRun.PayDate</c> (thuế TNCN) — không bao giờ <c>DateTime.UtcNow</c>.
/// </summary>
public sealed class HrStatutoryParameterProvider : IStatutoryParameterProvider
{
    public const string CacheKey = "hr:statutory-parameters:rows";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

    private readonly HRDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ILogger<HrStatutoryParameterProvider> _logger;

    public HrStatutoryParameterProvider(
        HRDbContext db,
        IMemoryCache cache,
        ILogger<HrStatutoryParameterProvider> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public async Task<StatutoryParameterSet> ResolveAsync(DateOnly asOf, CancellationToken ct = default)
    {
        var rows = await GetRowsAsync(ct);
        var effectiveCodes = rows
            .Where(r => r.EffectiveFrom <= asOf)
            .Select(r => r.Code)
            .ToHashSet(StringComparer.Ordinal);

        var missing = StatutoryParameterCodes.All.Where(c => !effectiveCodes.Contains(c)).ToList();
        if (missing.Count > 0)
        {
            _logger.LogWarning(
                "[statutory] Thiếu tham số {Codes} tại {AsOf:yyyy-MM-dd} trong hr.StatutoryParameters — dùng mặc định biên dịch sẵn (D06 §3).",
                string.Join(", ", missing), asOf);

            var fallback = VietnamStatutoryDefaults.Rows.Where(r => missing.Contains(r.Code));
            rows = rows.Concat(fallback).ToList();
        }

        try
        {
            return StatutoryParameterSetFactory.Resolve(rows, asOf);
        }
        catch (InvalidOperationException ex)
        {
            // Một dòng hỏng (JSON sai, biểu thuế không tăng dần) không được làm chết bảng lương:
            // rơi về bộ mặc định đã kiểm chứng và hét lên thật to trong log.
            _logger.LogError(ex,
                "[statutory] Bộ tham số tại {AsOf:yyyy-MM-dd} không hợp lệ — dùng toàn bộ mặc định biên dịch sẵn.",
                asOf);
            return VietnamStatutoryDefaults.Resolve(asOf);
        }
    }

    /// <summary>Các dòng thô đã cache — dùng cho endpoint quản trị (hiện căn cứ pháp lý theo dòng).</summary>
    public async Task<IReadOnlyList<StatutoryParameterRow>> GetRowsAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out IReadOnlyList<StatutoryParameterRow>? cached) && cached is not null)
            return cached;

        var rows = await _db.StatutoryParameters
            .AsNoTracking()
            .OrderBy(p => p.Code).ThenBy(p => p.EffectiveFrom)
            .ToListAsync(ct);

        IReadOnlyList<StatutoryParameterRow> result = rows.Select(r => r.ToRow()).ToList();
        _cache.Set(CacheKey, result, CacheTtl);
        return result;
    }

    /// <summary>Gọi sau MỌI thao tác ghi lên bảng tham số.</summary>
    public static void Invalidate(IMemoryCache cache) => cache.Remove(CacheKey);
}
