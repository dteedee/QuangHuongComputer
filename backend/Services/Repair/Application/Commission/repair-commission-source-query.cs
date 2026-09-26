using BuildingBlocks.Contracts;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair.Application.Commission;

/// <summary>
/// Cài đặt <see cref="IRepairCommissionSourceQuery"/> — chỉ ĐỌC, không đổi schema Repair.
/// Căn cứ hoa hồng = <c>LaborCost + ServiceFee</c> của phiếu; linh kiện (PartsCost) bị loại.
/// Nếu cấu trúc tiền công của phiếu sửa đổi (dòng báo giá/dịch vụ), chỉ cần sửa
/// <see cref="Map"/> ở đây — HR không biết gì về cấu trúc đó.
/// </summary>
public sealed class RepairCommissionSourceQuery : IRepairCommissionSourceQuery
{
    private readonly RepairDbContext _db;

    public RepairCommissionSourceQuery(RepairDbContext db) => _db = db;

    public async Task<RepairCommissionSource?> GetAsync(Guid workOrderId, CancellationToken cancellationToken = default)
    {
        var workOrder = await _db.WorkOrders.AsNoTracking()
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

    internal static RepairCommissionSource Map(WorkOrder w, Technician? technician) => new(
        w.Id,
        w.TicketNumber,
        w.TechnicianId,
        technician?.UserId,
        technician?.Name,
        w.LaborCost,
        w.ServiceFee,
        w.PaidAt is { } paid ? DateTime.SpecifyKind(paid, DateTimeKind.Utc) : null,
        IsSettled: w.Status is WorkOrderStatus.Paid or WorkOrderStatus.Delivered,
        IsVoidedAfterPayment: w.PaidAt.HasValue && w.Status == WorkOrderStatus.Cancelled);
}
