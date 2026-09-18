using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Inventory;

/// <summary>
/// Nhả tồn kho của các phiên checkout ĐÃ HẾT HẠN.
///
/// Vì sao bắt buộc phải có: phiên checkout giữ chỗ 15 phút. Khách bỏ ngang (đóng tab, hết pin,
/// đổi ý) là trường hợp THƯỜNG GẶP NHẤT, không phải ngoại lệ. Không có job này thì mỗi lần bỏ
/// ngang là vĩnh viễn khoá mất số hàng đó: <c>AvailableQuantity</c> tụt dần trong khi hàng vẫn
/// nằm trên kệ, và cuối cùng website báo hết hàng cho sản phẩm còn đầy trong kho.
///
/// Chạy mỗi phút, xử lý theo lô nhỏ, và mỗi lô một scope DI riêng để một phiên hỏng không kéo
/// theo cả vòng lặp.
/// </summary>
public class CheckoutSessionExpiryJob : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);
    private const int BatchSize = 50;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CheckoutSessionExpiryJob> _logger;

    public CheckoutSessionExpiryJob(IServiceScopeFactory scopeFactory, ILogger<CheckoutSessionExpiryJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Chờ một nhịp để host khởi động xong (migration, seed) trước khi đụng vào CSDL.
        try { await Task.Delay(Interval, stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpireBatchAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // Một vòng lỗi KHÔNG được giết job — nếu không, tồn kho ngừng được nhả vĩnh viễn.
                _logger.LogError(ex, "Vòng quét phiên checkout hết hạn thất bại");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task ExpireBatchAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var salesDb = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
        var inventoryDb = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
        var reservations = scope.ServiceProvider.GetRequiredService<InventoryReservationService>();

        var now = DateTime.UtcNow;
        var expired = await salesDb.CheckoutSessions
            .Where(s => s.Status == CheckoutSessionStatus.Active && s.ExpiresAt < now)
            .OrderBy(s => s.ExpiresAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (expired.Count == 0) return;

        foreach (var session in expired)
        {
            var released = await reservations.ReleaseAsync(
                session.Id.ToString(), "Phiên checkout hết hạn", ct);
            session.MarkExpired();

            _logger.LogInformation(
                "Phiên checkout {SessionId} hết hạn, đã nhả {Count} lượt giữ chỗ",
                session.Id, released);
        }

        // Phải lưu CẢ HAI: nhả chỗ nằm ở InventoryDbContext, trạng thái phiên ở SalesDbContext.
        // Chỉ lưu Sales thì phiên thành Expired mà tồn kho vẫn bị khoá — đúng lỗi mà job này sinh ra để tránh.
        await inventoryDb.SaveChangesAsync(ct);
        await salesDb.SaveChangesAsync(ct);
    }
}
