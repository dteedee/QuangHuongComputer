using BuildingBlocks.Contracts;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HR.Application.Commission;

public enum AccrualOutcome { Created, AlreadyRecorded, Reversed, ClawbackCreated, Unmapped, ZeroAmount, NotApplicable }

public sealed class CommissionSyncSummary
{
    public string Period { get; init; } = string.Empty;
    public int Scanned { get; set; }
    public int Created { get; set; }
    public int AlreadyRecorded { get; set; }
    public int Reversed { get; set; }
    public int ClawbacksCreated { get; set; }
    /// <summary>Phiếu đã thu tiền nhưng kỹ thuật viên chưa gắn tài khoản/nhân viên — cần HR xử lý.</summary>
    public List<string> Unmapped { get; } = new();
}

/// <summary>
/// Ghi nhận hoa hồng kỹ thuật từ phiếu sửa đã thu tiền. Luôn đọc sự thật qua
/// <see cref="IRepairCommissionSourceQuery"/>; gọi bao nhiêu lần cũng ra cùng kết quả
/// (khoá duy nhất SourceType+SourceId, cộng thêm bắt vi phạm unique khi hai luồng chạy đua).
/// </summary>
public sealed class CommissionAccrualService
{
    private readonly HRDbContext _db;
    private readonly IRepairCommissionSourceQuery _repair;
    private readonly CommissionDefaults _defaults;
    private readonly ILogger<CommissionAccrualService>? _logger;

    public CommissionAccrualService(HRDbContext db, IRepairCommissionSourceQuery repair,
        CommissionDefaults defaults, ILogger<CommissionAccrualService>? logger = null)
    {
        _db = db;
        _repair = repair;
        _defaults = defaults;
        _logger = logger;
    }

    public async Task<AccrualOutcome> ReconcileWorkOrderAsync(Guid workOrderId, CancellationToken ct = default)
    {
        var source = await _repair.GetAsync(workOrderId, ct);
        return source is null ? AccrualOutcome.NotApplicable : await ReconcileAsync(source, ct);
    }

    /// <summary>Đối soát mọi phiếu thu tiền trong kỳ (lưới an toàn khi sự kiện bị mất).</summary>
    public async Task<CommissionSyncSummary> SyncPeriodAsync(string period, CancellationToken ct = default)
    {
        var (fromUtc, toUtc) = CommissionPeriod.UtcBounds(period);
        var sources = await _repair.ListPaidBetweenAsync(fromUtc, toUtc, ct);
        var summary = new CommissionSyncSummary { Period = period, Scanned = sources.Count };
        foreach (var source in sources)
        {
            switch (await ReconcileAsync(source, ct))
            {
                case AccrualOutcome.Created: summary.Created++; break;
                case AccrualOutcome.AlreadyRecorded: summary.AlreadyRecorded++; break;
                case AccrualOutcome.Reversed: summary.Reversed++; break;
                case AccrualOutcome.ClawbackCreated: summary.ClawbacksCreated++; break;
                case AccrualOutcome.Unmapped:
                    summary.Unmapped.Add($"{source.TicketNumber} ({source.TechnicianName ?? "chưa phân công"})");
                    break;
            }
        }
        return summary;
    }

    public async Task<AccrualOutcome> ReconcileAsync(RepairCommissionSource source, CancellationToken ct = default)
    {
        var existing = await _db.CommissionEntries.FirstOrDefaultAsync(e =>
            e.SourceType == CommissionSourceTypes.RepairWorkOrder && e.SourceId == source.WorkOrderId, ct);

        if (source.IsVoidedAfterPayment)
            return existing is null ? AccrualOutcome.NotApplicable : await VoidAsync(existing, source, ct);
        if (!source.IsSettled) return AccrualOutcome.NotApplicable;
        if (existing is not null) return AccrualOutcome.AlreadyRecorded;

        var employee = await FindEmployeeAsync(source.TechnicianUserId, ct);
        if (employee is null)
        {
            _logger?.LogWarning("Hoa hồng: phiếu {Ticket} đã thu tiền nhưng kỹ thuật viên chưa gắn nhân viên.", source.TicketNumber);
            return AccrualOutcome.Unmapped;
        }

        var paidAt = source.PaidAtUtc ?? DateTime.UtcNow;
        var history = await _db.CommissionPolicies.AsNoTracking().Where(p => p.EmployeeId == employee.Id).ToListAsync(ct);
        var rate = CommissionCalculator.ResolveRate(history, CommissionCalculator.VietnamDate(paidAt), _defaults.Current());
        var quote = CommissionCalculator.Calculate(source.LaborAmount, source.ServiceFeeAmount, rate, paidAt);
        if (quote.Amount <= 0) return AccrualOutcome.ZeroAmount;

        var entry = new CommissionEntry(employee.Id, CommissionSourceTypes.RepairWorkOrder, source.WorkOrderId,
            source.TicketNumber, quote.BaseAmount, quote.RatePercent, quote.FixedAmount, quote.Amount, quote.Period, paidAt);
        return await TryInsertAsync(entry, AccrualOutcome.Created, ct);
    }

    /// <summary>
    /// Phiếu bị huỷ sau thanh toán: khoản chưa khoá -> Reversed; khoản đã nằm trong bảng lương
    /// đã duyệt/đã trả -> giữ nguyên, sinh bút toán thu hồi (số âm) ở kỳ hiện tại.
    /// </summary>
    private async Task<AccrualOutcome> VoidAsync(CommissionEntry existing, RepairCommissionSource source, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        if (existing.Status == CommissionStatus.Reversed) return AccrualOutcome.AlreadyRecorded;

        if (!await CommissionPayrollLinker.IsLockedInPayrollAsync(_db, existing, ct))
        {
            existing.Reverse("Phiếu sửa bị huỷ sau khi đã thanh toán", now);
            await _db.SaveChangesAsync(ct);
            return AccrualOutcome.Reversed;
        }

        var hasClawback = await _db.CommissionEntries.AnyAsync(e =>
            e.SourceType == CommissionSourceTypes.RepairWorkOrderClawback && e.SourceId == source.WorkOrderId, ct);
        if (hasClawback) return AccrualOutcome.AlreadyRecorded;

        var clawback = new CommissionEntry(existing.EmployeeId, CommissionSourceTypes.RepairWorkOrderClawback,
            source.WorkOrderId, source.TicketNumber, -existing.BaseAmount, existing.RatePercent,
            -existing.FixedAmount, -existing.Amount,
            CommissionPeriod.Of(CommissionCalculator.VietnamDate(now)), now);
        return await TryInsertAsync(clawback, AccrualOutcome.ClawbackCreated, ct);
    }

    private async Task<Employee?> FindEmployeeAsync(Guid? userId, CancellationToken ct)
    {
        if (userId is not { } id) return null;
        var key = id.ToString();
        return await _db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == key, ct);
    }

    /// <summary>Hai luồng (sự kiện + đối soát) cùng chèn một nguồn: bên thua gặp 23505 -> coi như đã có.</summary>
    private async Task<AccrualOutcome> TryInsertAsync(CommissionEntry entry, AccrualOutcome success, CancellationToken ct)
    {
        _db.CommissionEntries.Add(entry);
        try
        {
            await _db.SaveChangesAsync(ct);
            return success;
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
        {
            _db.Entry(entry).State = EntityState.Detached;
            return AccrualOutcome.AlreadyRecorded;
        }
    }
}
