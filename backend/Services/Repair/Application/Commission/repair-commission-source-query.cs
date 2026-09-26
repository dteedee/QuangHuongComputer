using BuildingBlocks.Contracts;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair.Application.Commission;

/// <summary>
/// Cài đặt <see cref="IRepairCommissionSourceQuery"/> — chỉ ĐỌC, không đổi schema Repair.
/// Căn cứ hoa hồng = tiền công + phí dịch vụ; linh kiện bị loại.
/// <para>
/// Báo giá chi tiết theo dòng (RepairQuoteLine): khi phiếu có báo giá hiện hành KHÁCH ĐÃ DUYỆT, tiền
/// công/dịch vụ lấy từ báo giá đó — <c>RepairQuote.LaborCost</c> = Σ dòng Công,
/// <c>RepairQuote.ServiceFee</c> = Σ dòng Dịch vụ + Khác, đều là số SAU giảm giá (dòng + phân bổ
/// giảm giá cả phiếu), ĐÃ GỒM VAT; dòng Linh kiện không bao giờ vào căn cứ. Phiếu không qua báo
/// giá (hoặc báo giá chưa duyệt) giữ cách cũ: <c>WorkOrder.LaborCost + WorkOrder.ServiceFee</c>.
/// </para>
/// </summary>
public sealed class RepairCommissionSourceQuery : IRepairCommissionSourceQuery
{
    private readonly RepairDbContext _db;

    public RepairCommissionSourceQuery(RepairDbContext db) => _db = db;

    public async Task<RepairCommissionSource?> GetAsync(Guid workOrderId, CancellationToken cancellationToken = default)
    {
        var workOrder = await _db.WorkOrders.AsNoTracking()
            .Include(w => w.Quotes)
            .FirstOrDefaultAsync(w => w.Id == workOrderId, cancellationToken);
        if (workOrder is null) return null;

        var technician = workOrder.TechnicianId is { } techId
            ? await _db.Technicians.AsNoTracking().FirstOrDefaultAsync(t => t.Id == techId, cancellationToken)
            : null;
        return Map(workOrder, technician);
    }

    public async Task<IReadOnlyList<RepairCommissionSource>> ListPaidBetweenAsync(
        DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default)
    {
        // Cột PaidAt là "timestamp without time zone" chứa giờ UTC -> so sánh với giá trị Unspecified.
        var from = DateTime.SpecifyKind(fromUtc, DateTimeKind.Unspecified);
        var to = DateTime.SpecifyKind(toUtc, DateTimeKind.Unspecified);

        var workOrders = await _db.WorkOrders.AsNoTracking()
            .Include(w => w.Quotes)
            .Where(w => w.PaidAt != null && w.PaidAt >= from && w.PaidAt < to)
            .ToListAsync(cancellationToken);

        var techIds = workOrders.Where(w => w.TechnicianId.HasValue).Select(w => w.TechnicianId!.Value).Distinct().ToList();
        var technicians = await _db.Technicians.AsNoTracking()
            .Where(t => techIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, cancellationToken);

        return workOrders
            .Select(w => Map(w, w.TechnicianId is { } id && technicians.TryGetValue(id, out var t) ? t : null))
            .ToList();
    }

    internal static RepairCommissionSource Map(WorkOrder w, Technician? technician)
    {
        var (labor, service) = CommissionBase(w);
        return new(
            w.Id,
            w.TicketNumber,
            w.TechnicianId,
            technician?.UserId,
            technician?.Name,
            labor,
            service,
            w.PaidAt is { } paid ? DateTime.SpecifyKind(paid, DateTimeKind.Utc) : null,
            IsSettled: w.Status is WorkOrderStatus.Paid or WorkOrderStatus.Delivered,
            IsVoidedAfterPayment: w.PaidAt.HasValue && w.Status == WorkOrderStatus.Cancelled);
    }

    /// <summary>(Tiền công, phí dịch vụ) làm căn cứ hoa hồng — xem ghi chú đầu lớp. Cần w.Quotes đã nạp.</summary>
    public static (decimal Labor, decimal Service) CommissionBase(WorkOrder w)
    {
        var approved = w.Quotes.FirstOrDefault(q => q.Id == w.CurrentQuoteId && q.Status == QuoteStatus.Approved);
        return approved is not null
            ? (approved.LaborCost, approved.ServiceFee)
            : (w.LaborCost, w.ServiceFee);
    }
}
