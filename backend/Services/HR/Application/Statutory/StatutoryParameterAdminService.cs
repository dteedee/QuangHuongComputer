using BuildingBlocks.Endpoints;
using BuildingBlocks.TaxEngine;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HR.Application.Statutory;

/// <summary>
/// W2-25 / D06 §3 — CRUD tham số pháp luật với KHOÁ DÒNG QUÁ KHỨ.
///
/// Một dòng có <c>EffectiveFrom</c> nằm trong hoặc trước kỳ lương đã <c>Paid</c> gần nhất không
/// được sửa/xoá nữa (409): bảng lương đã trả phải tái lập được y hệt khi thanh tra. Muốn đổi luật
/// thì THÊM một dòng có mốc hiệu lực mới.
/// </summary>
public sealed class StatutoryParameterAdminService
{
    private readonly HRDbContext _db;
    private readonly IMemoryCache _cache;

    public StatutoryParameterAdminService(HRDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    /// <summary>
    /// Mốc khoá = ngày trả của kỳ lương đã Paid gần nhất (hoặc ngày cuối tháng của kỳ đó nếu
    /// kỳ lương cũ chưa có <c>PayDate</c>). <c>null</c> = chưa trả kỳ nào, mọi dòng còn sửa được.
    /// </summary>
    public async Task<DateOnly?> GetLockBoundaryAsync(CancellationToken ct = default)
    {
        var paid = await _db.PayrollRuns
            .Where(r => r.Status == PayrollRunStatus.Paid)
            .OrderByDescending(r => r.Year).ThenByDescending(r => r.Month)
            .Select(r => new { r.Year, r.Month, r.PayDate })
            .FirstOrDefaultAsync(ct);

        if (paid is null) return null;

        var endOfPeriod = new DateOnly(paid.Year, paid.Month, DateTime.DaysInMonth(paid.Year, paid.Month));
        var payDate = paid.PayDate;
        return payDate.HasValue && payDate.Value > endOfPeriod ? payDate.Value : endOfPeriod;
    }

    public async Task<IReadOnlyList<StatutoryParameterDto>> ListAsync(
        string? code,
        DateOnly? asOf,
        CancellationToken ct = default)
    {
        var query = _db.StatutoryParameters.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(code))
        {
            var normalized = StatutoryParameter.Normalize(code);
            query = query.Where(p => p.Code == normalized);
        }

        if (asOf.HasValue)
            query = query.Where(p => p.EffectiveFrom <= asOf.Value);

        var rows = await query
            .OrderBy(p => p.Code).ThenByDescending(p => p.EffectiveFrom)
            .ToListAsync(ct);

        // ?asOf= nghĩa là "bộ đang có hiệu lực tại ngày đó": mỗi Code chỉ giữ mốc mới nhất <= asOf.
        if (asOf.HasValue)
            rows = rows.GroupBy(r => r.Code).Select(g => g.First()).OrderBy(r => r.Code).ToList();

        var boundary = await GetLockBoundaryAsync(ct);
        return rows.Select(r => ToDto(r, boundary)).ToList();
    }

    public async Task<StatutoryParameterDto> CreateAsync(
        CreateStatutoryParameterDto dto,
        CancellationToken ct = default)
    {
        var code = StatutoryParameter.Normalize(dto.Code);
        if (!StatutoryParameterCodes.All.Contains(code))
        {
            throw new RequestValidationException("code",
                $"Mã tham số '{dto.Code}' không có trong danh mục. Mã hợp lệ: {string.Join(", ", StatutoryParameterCodes.All)}.");
        }

        var duplicate = await _db.StatutoryParameters
            .AnyAsync(p => p.Code == code && p.EffectiveFrom == dto.EffectiveFrom, ct);
        if (duplicate)
            throw new ConflictException($"Đã có dòng {code} hiệu lực từ {dto.EffectiveFrom:dd/MM/yyyy}. Sửa dòng đó hoặc chọn mốc khác.");

        var boundary = await GetLockBoundaryAsync(ct);
        if (boundary.HasValue && dto.EffectiveFrom <= boundary.Value)
        {
            throw new ConflictException(
                $"Không thêm được mốc {dto.EffectiveFrom:dd/MM/yyyy}: kỳ lương đã trả đến {boundary.Value:dd/MM/yyyy}. "
                + "Tham số của kỳ đã trả là bất biến — hãy thêm mốc hiệu lực sau ngày đó.");
        }

        var entity = new StatutoryParameter(code, dto.EffectiveFrom, dto.NumberValue, dto.JsonValue,
            dto.Unit, dto.LegalBasis, dto.SourceUrl, dto.Note, isSeed: false, isVerified: dto.IsVerified);

        await ValidateResolvableAsync(entity, ct);

        _db.StatutoryParameters.Add(entity);
        await _db.SaveChangesAsync(ct);
        HrStatutoryParameterProvider.Invalidate(_cache);

        return ToDto(entity, boundary);
    }

    public async Task<StatutoryParameterDto> UpdateAsync(
        Guid id,
        UpdateStatutoryParameterDto dto,
        CancellationToken ct = default)
    {
        var entity = await _db.StatutoryParameters.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw NotFoundException.For("tham số pháp luật", id);

        await RequireUnlockedAsync(entity, ct);

        entity.Update(dto.NumberValue, dto.JsonValue, dto.Unit, dto.LegalBasis, dto.SourceUrl,
            dto.Note, dto.IsVerified);

        await ValidateResolvableAsync(entity, ct);

        await _db.SaveChangesAsync(ct);
        HrStatutoryParameterProvider.Invalidate(_cache);

        return ToDto(entity, await GetLockBoundaryAsync(ct));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.StatutoryParameters.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw NotFoundException.For("tham số pháp luật", id);

        await RequireUnlockedAsync(entity, ct);

        var remaining = await _db.StatutoryParameters
            .CountAsync(p => p.Code == entity.Code, ct);
        if (remaining <= 1)
        {
            throw new ConflictException(
                $"{entity.Code} chỉ còn một mốc hiệu lực — xoá nốt thì hệ thống mất tham số này. Hãy thêm mốc mới trước.");
        }

        _db.StatutoryParameters.Remove(entity);
        await _db.SaveChangesAsync(ct);
        HrStatutoryParameterProvider.Invalidate(_cache);
    }

    private async Task RequireUnlockedAsync(StatutoryParameter entity, CancellationToken ct)
    {
        var boundary = await GetLockBoundaryAsync(ct);
        if (boundary.HasValue && entity.EffectiveFrom <= boundary.Value)
        {
            throw new ConflictException(
                $"{entity.Code} hiệu lực từ {entity.EffectiveFrom:dd/MM/yyyy} đã được dùng cho kỳ lương đã trả "
                + $"(đến {boundary.Value:dd/MM/yyyy}) nên không sửa/xoá được. Đổi luật = THÊM mốc hiệu lực mới.");
        }
    }

    /// <summary>
    /// Sau mỗi thay đổi, bộ tham số tại chính mốc đó phải resolve được (biểu thuế tăng dần, bậc cuối
    /// không trần, đủ vùng lương tối thiểu...). Nếu không, trả 400 ngay thay vì để bảng lương nổ sau.
    /// </summary>
    private async Task ValidateResolvableAsync(StatutoryParameter entity, CancellationToken ct)
    {
        var others = await _db.StatutoryParameters
            .AsNoTracking()
            .Where(p => p.Id != entity.Id)
            .ToListAsync(ct);

        var rows = others.Select(o => o.ToRow()).Append(entity.ToRow()).ToList();
        var codes = rows.Where(r => r.EffectiveFrom <= entity.EffectiveFrom).Select(r => r.Code)
            .ToHashSet(StringComparer.Ordinal);
        rows.AddRange(VietnamStatutoryDefaults.Rows.Where(r => !codes.Contains(r.Code)));

        try
        {
            StatutoryParameterSetFactory.Resolve(rows, entity.EffectiveFrom);
        }
        catch (InvalidOperationException ex)
        {
            throw new RequestValidationException("value", ex.Message);
        }
    }

    private static StatutoryParameterDto ToDto(StatutoryParameter p, DateOnly? lockBoundary)
        => new(p.Id, p.Code, p.EffectiveFrom, p.NumberValue, p.JsonValue, p.Unit.ToString(),
               p.LegalBasis, p.SourceUrl, p.Note, p.IsSeed, p.IsVerified,
               lockBoundary.HasValue && p.EffectiveFrom <= lockBoundary.Value);
}
