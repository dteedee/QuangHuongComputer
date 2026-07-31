using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule.Application.Purchasing;

/// <summary>
/// Điều phối quy trình duyệt PO:
///  - Chọn POApprovalRule khớp tổng tiền → tạo POApprovalRequest.
///  - Chặn tự duyệt (người tạo/gửi != người duyệt).
///  - Cập nhật trạng thái PO (Approved/Rejected).
///  - Publish PoSubmittedForApprovalIntegrationEvent để Communication gửi thông báo.
/// </summary>
public class PoApprovalService
{
    private readonly InventoryDbContext _db;
    private readonly IPublishEndpoint _bus;
    private readonly ILogger<PoApprovalService> _logger;

    public PoApprovalService(InventoryDbContext db, IPublishEndpoint bus, ILogger<PoApprovalService> logger)
    {
        _db = db;
        _bus = bus;
        _logger = logger;
    }

    public async Task<POApprovalRequest> SubmitForApprovalAsync(Guid poId, Guid userId, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == poId, ct)
            ?? throw new InvalidOperationException("Không tìm thấy PO.");

        var rule = await FindMatchingRuleAsync(po.TotalAmount, ct)
            ?? throw new InvalidOperationException(
                $"Không có hạn mức duyệt cho tổng {po.TotalAmount:N0}đ. Kiểm tra POApprovalRule.");

        po.SubmitForApproval(userId);

        var request = new POApprovalRequest(po.Id, rule.Id, rule.RequiredRole, po.TotalAmount, userId);
        _db.POApprovalRequests.Add(request);
        await _db.SaveChangesAsync(ct);

        // Publish sự kiện để Communication service gửi thông báo cho người có role phù hợp.
        try
        {
            await _bus.Publish(new PoSubmittedForApprovalIntegrationEvent(
                po.Id, po.PONumber, po.TotalAmount, rule.RequiredRole, userId, DateTime.UtcNow), ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể publish PoSubmittedForApprovalIntegrationEvent cho PO {PoId}", po.Id);
        }

        return request;
    }

    public async Task ApproveAsync(Guid poId, Guid approverUserId, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == poId, ct)
            ?? throw new InvalidOperationException("Không tìm thấy PO.");

        EnsureNotSelfApproval(po, approverUserId);

        var request = await _db.POApprovalRequests
            .Where(r => r.PurchaseOrderId == poId && r.Decision == POApprovalDecision.Pending)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException("Không có yêu cầu duyệt đang chờ cho PO này.");

        po.Approve(approverUserId);
        request.Approve(approverUserId);
        await _db.SaveChangesAsync(ct);

        try
        {
            await _bus.Publish(new PoApprovalDecidedIntegrationEvent(
                po.Id, po.PONumber, approverUserId, Approved: true, Reason: null, DateTime.UtcNow), ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể publish PoApprovalDecidedIntegrationEvent cho PO {PoId}", po.Id);
        }
    }

    public async Task RejectAsync(Guid poId, Guid approverUserId, string reason, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Phải nhập lý do từ chối.", nameof(reason));

        var po = await _db.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == poId, ct)
            ?? throw new InvalidOperationException("Không tìm thấy PO.");

        EnsureNotSelfApproval(po, approverUserId);

        var request = await _db.POApprovalRequests
            .Where(r => r.PurchaseOrderId == poId && r.Decision == POApprovalDecision.Pending)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException("Không có yêu cầu duyệt đang chờ cho PO này.");

        po.Reject(approverUserId, reason);
        request.Reject(approverUserId, reason);
        await _db.SaveChangesAsync(ct);

        try
        {
            await _bus.Publish(new PoApprovalDecidedIntegrationEvent(
                po.Id, po.PONumber, approverUserId, Approved: false, Reason: reason, DateTime.UtcNow), ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể publish PoApprovalDecidedIntegrationEvent cho PO {PoId}", po.Id);
        }
    }

    private async Task<POApprovalRule?> FindMatchingRuleAsync(decimal amount, CancellationToken ct)
    {
        // Chọn rule active mà (MinAmount ≤ amount < MaxAmount). Nếu nhiều rule khớp, ưu tiên SortOrder tăng dần.
        var rules = await _db.POApprovalRules
            .Where(r => r.IsActive && r.MinAmount <= amount && amount < r.MaxAmount)
            .OrderBy(r => r.SortOrder)
            .ToListAsync(ct);
        return rules.FirstOrDefault();
    }

    /// <summary>Chặn người tạo/gửi tự duyệt PO của mình — chỉ kiểm ở server, không tin client.</summary>
    public static void EnsureNotSelfApproval(PurchaseOrder po, Guid approverUserId)
    {
        if (po.CreatedByUserId.HasValue && po.CreatedByUserId.Value == approverUserId)
            throw new InvalidOperationException("Người tạo PO không được tự duyệt.");
        if (po.SubmittedBy.HasValue && po.SubmittedBy.Value == approverUserId)
            throw new InvalidOperationException("Người gửi duyệt không được tự duyệt.");
    }
}

// Integration events publish qua MassTransit — Communication + FE nghe để nhắc duyệt.
public record PoSubmittedForApprovalIntegrationEvent(
    Guid POId,
    string PONumber,
    decimal TotalAmount,
    string RequiredRole,
    Guid SubmittedBy,
    DateTime OccurredAt);

public record PoApprovalDecidedIntegrationEvent(
    Guid POId,
    string PONumber,
    Guid ApproverId,
    bool Approved,
    string? Reason,
    DateTime OccurredAt);
