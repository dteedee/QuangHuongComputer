using Microsoft.EntityFrameworkCore;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Infrastructure.Reconciliation;

/// <summary>
/// Reconciles pending payments that may have been completed externally
/// but whose callbacks were not received (e.g. network issues).
/// </summary>
public class PaymentReconciliationService
{
    private readonly PaymentsDbContext _db;

    public PaymentReconciliationService(PaymentsDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns all pending payments older than the given threshold.
    /// Caller is responsible for querying provider API and calling
    /// <see cref="MarkSucceeded"/> or <see cref="MarkFailed"/>.
    /// </summary>
    public async Task<List<PaymentIntent>> GetStalePaymentsAsync(TimeSpan staleness, CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow - staleness;
        return await _db.PaymentIntents
            .Where(p => p.Status == PaymentStatus.Pending && p.CreatedAt < cutoff)
            .ToListAsync(ct);
    }

    public async Task MarkSucceeded(Guid paymentId, CancellationToken ct = default)
    {
        var payment = await _db.PaymentIntents.FindAsync(new object[] { paymentId }, ct);
        if (payment == null || payment.Status != PaymentStatus.Pending) return;

        payment.Succeed();
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkFailed(Guid paymentId, string reason, CancellationToken ct = default)
    {
        var payment = await _db.PaymentIntents.FindAsync(new object[] { paymentId }, ct);
        if (payment == null || payment.Status != PaymentStatus.Pending) return;

        payment.Fail(reason);
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Returns a summary of payment statuses grouped by provider for a date range.
    /// </summary>
    public async Task<List<ReconciliationSummary>> GetSummaryAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        return await _db.PaymentIntents
            .Where(p => p.CreatedAt >= from && p.CreatedAt <= to)
            .GroupBy(p => new { p.Provider, p.Status })
            .Select(g => new ReconciliationSummary
            {
                Provider = g.Key.Provider,
                Status = g.Key.Status,
                Count = g.Count(),
                TotalAmount = g.Sum(p => p.Amount)
            })
            .ToListAsync(ct);
    }
}

public class ReconciliationSummary
{
    public PaymentProvider Provider { get; set; }
    public PaymentStatus Status { get; set; }
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}
