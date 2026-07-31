using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;

namespace InventoryModule.Application.BackgroundServices;

/// <summary>
/// Quét tồn kho định kỳ. Với mỗi InventoryItem có QuantityOnHand ≤ ReorderPoint,
/// SINH PurchaseRequisition (Source="AutoReorder") thay vì PO trực tiếp.
/// Bộ phận mua hàng sẽ chọn NCC + duyệt để convert thành PO.
///
/// Chống trùng: mỗi ProductId chỉ có tối đa 1 PR đang mở (Draft/Submitted/Approved) do AutoReorder tạo.
/// </summary>
public class AutoReorderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AutoReorderService> _logger;
    private static readonly Guid SystemUserId = Guid.Empty; // Sinh bởi hệ thống

    public AutoReorderService(IServiceScopeFactory scopeFactory, ILogger<AutoReorderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ScanAndCreateRequisitionsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AutoReorder] Error scanning inventory for reorder");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    internal async Task ScanAndCreateRequisitionsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var lowStockItems = await db.InventoryItems
            .Where(i => i.QuantityOnHand <= i.ReorderPoint && i.ReorderQuantity > 0)
            .Select(i => new { i.ProductId, i.QuantityOnHand, i.ReorderPoint, i.ReorderQuantity })
            .ToListAsync(ct);

        if (lowStockItems.Count == 0) return;

        var productIds = lowStockItems.Select(l => l.ProductId).Distinct().ToList();

        // Chống trùng: bỏ qua sản phẩm đã có PR AutoReorder đang mở.
        var openStatuses = new[]
        {
            PurchaseRequisitionStatus.Draft,
            PurchaseRequisitionStatus.Submitted,
            PurchaseRequisitionStatus.Approved
        };
        var alreadyOpen = await db.PurchaseRequisitions
            .Where(pr => pr.Source == "AutoReorder" && openStatuses.Contains(pr.Status))
            .Include(pr => pr.Items)
            .SelectMany(pr => pr.Items.Select(i => i.ProductId))
            .Distinct()
            .ToListAsync(ct);

        var toReorder = lowStockItems.Where(l => !alreadyOpen.Contains(l.ProductId)).ToList();
        if (toReorder.Count == 0)
        {
            _logger.LogInformation("[AutoReorder] {Count} sản phẩm thấp kho đã có PR mở, bỏ qua.", lowStockItems.Count);
            return;
        }

        var items = toReorder.Select(l => new PurchaseRequisitionItem(
            l.ProductId,
            $"Product {l.ProductId}",
            l.ReorderQuantity,
            $"Tồn {l.QuantityOnHand} ≤ điểm đặt {l.ReorderPoint}"
        )).ToList();

        var pr = new PurchaseRequisition(
            requestedBy: SystemUserId,
            requesterName: "AutoReorder",
            items: items,
            urgency: UrgencyLevel.Medium,
            reason: "Tự sinh khi tồn kho ≤ điểm đặt hàng",
            source: "AutoReorder");
        pr.Submit();

        db.PurchaseRequisitions.Add(pr);
        await db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[AutoReorder] Đã tạo PR {Number} cho {Count} sản phẩm thấp kho.",
            pr.Number, items.Count);
    }
}
