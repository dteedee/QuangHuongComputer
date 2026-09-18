using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Documents;
using BuildingBlocks.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.CashBook;

/// <summary>
/// Sổ quỹ tiền mặt: phiếu thu / phiếu chi và số dư luỹ kế theo từng quỹ.
///
/// Số phiếu lấy từ dãy <c>pay</c> của <see cref="IDocumentNumberService"/> với tiền tố
/// <c>PT/</c> (phiếu thu) hoặc <c>PC/</c> (phiếu chi) — không tự sinh số trong module,
/// vì bộ đếm trong tiến trình là đúng cái lỗi W1-3 đã dẹp (khởi động lại là về 1, hai instance đụng nhau).
/// </summary>
public class CashBookService
{
    private readonly AccountingDbContext _db;
    private readonly IDocumentNumberService _documentNumbers;
    private readonly IBusinessClock _clock;
    private readonly ILogger<CashBookService> _logger;

    public CashBookService(
        AccountingDbContext db,
        IDocumentNumberService documentNumbers,
        IBusinessClock clock,
        ILogger<CashBookService> logger)
    {
        _db = db;
        _documentNumbers = documentNumbers;
        _clock = clock;
        _logger = logger;
    }

    /// <summary>Mã quỹ mặc định của một cửa hàng/kho.</summary>
    public static string FundCodeFor(Guid warehouseId) => $"CASH-{warehouseId:N}".ToUpperInvariant();

    /// <summary>
    /// Ghi một phiếu. Trả <c>null</c> khi <paramref name="sourceKey"/> đã có phiếu
    /// (chốt ca hai lần, sự kiện phát lại) — sổ quỹ không được phép nhân đôi.
    /// </summary>
    public async Task<CashVoucher?> RecordAsync(
        CashVoucherKind kind,
        string fundCode,
        decimal amount,
        string description,
        CashVoucherSource source,
        DateTime? voucherDate = null,
        string? counterpartyName = null,
        Guid? shiftSessionId = null,
        Guid? expenseId = null,
        Guid? invoiceId = null,
        Guid? orderId = null,
        string? sourceKey = null,
        Guid? createdByUserId = null,
        CancellationToken ct = default)
    {
        if (amount <= 0) return null;

        if (sourceKey is not null &&
            await _db.CashVouchers.AsNoTracking().AnyAsync(v => v.SourceKey == sourceKey, ct))
        {
            _logger.LogInformation("Phiếu quỹ {SourceKey} đã tồn tại — bỏ qua.", sourceKey);
            return null;
        }

        var prefix = kind == CashVoucherKind.Receipt ? "PT/" : "PC/";
        var number = prefix + await _documentNumbers.NextAsync(DocumentNumberTypes.Payment, ct);
        var at = voucherDate ?? _clock.UtcNow.UtcDateTime;

        var voucher = CashVoucher.Create(
            number, kind, fundCode, amount, at, _clock.ToBusinessDate(at),
            description, source, counterpartyName,
            shiftSessionId, expenseId, invoiceId, orderId, sourceKey, createdByUserId);

        _db.CashVouchers.Add(voucher);
        return voucher;
    }

    /// <summary>
    /// Sổ quỹ của một quỹ trong một khoảng thời gian, kèm số dư ĐẦU KỲ (tổng mọi phiếu trước
    /// <paramref name="from"/>) và số dư luỹ kế từng dòng.
    /// </summary>
    public async Task<CashBookDto> GetBookAsync(
        string fundCode, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var normalized = fundCode.Trim().ToUpperInvariant();
        var all = _db.CashVouchers.AsNoTracking().Where(v => v.FundCode == normalized);

        var opening = from.HasValue
            ? await all.Where(v => v.VoucherDate < from.Value)
                .SumAsync(v => v.Kind == CashVoucherKind.Receipt ? v.Amount : -v.Amount, ct)
            : 0m;

        var page = all;
        if (from.HasValue) page = page.Where(v => v.VoucherDate >= from.Value);
        if (to.HasValue) page = page.Where(v => v.VoucherDate <= to.Value);

        var vouchers = await page
            .OrderBy(v => v.VoucherDate).ThenBy(v => v.CreatedAt)
            .ToListAsync(ct);

        var entries = new List<CashBookEntryDto>(vouchers.Count);
        var running = opening;
        foreach (var v in vouchers)
        {
            running += v.SignedAmount;
            entries.Add(new CashBookEntryDto(Endpoints.InvoiceMapping.ToDto(v), running));
        }

        return new CashBookDto(
            normalized, from, to, opening,
            vouchers.Where(v => v.Kind == CashVoucherKind.Receipt).Sum(v => v.Amount),
            vouchers.Where(v => v.Kind == CashVoucherKind.Payment).Sum(v => v.Amount),
            running,
            entries);
    }
}
