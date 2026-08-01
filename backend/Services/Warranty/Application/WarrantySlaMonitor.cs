using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty.Application;

/// <summary>
/// Phase 07: cảnh báo claim đạt ngưỡng WarningAtPercent của SLA.
/// Chạy mỗi giờ (có thể chỉnh qua cấu hình sau).
/// Publish WarrantyClaimSlaWarningEvent — Communication service consume để gửi notification manager.
/// </summary>
public class WarrantySlaMonitor : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<WarrantySlaMonitor> _logger;
    private static readonly TimeSpan _interval = TimeSpan.FromHours(1);

    public WarrantySlaMonitor(IServiceProvider sp, ILogger<WarrantySlaMonitor> logger)
    {
        _sp = sp;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Đợi ứng dụng startup xong 30s để tránh gãy khi migration đang chạy.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); } catch { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "WarrantySlaMonitor tick lỗi");
            }
            try { await Task.Delay(_interval, stoppingToken); } catch { return; }
        }
    }

    public async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WarrantyDbContext>();
        var publish = scope.ServiceProvider.GetService<IPublishEndpoint>();

        // Lấy tất cả claim đang InProgress có SLA.
        var claims = await db.Claims
            .Where(c => c.Status == ClaimStatus.InProgress && c.SlaDeadline != null)
            .ToListAsync(ct);
        if (!claims.Any()) return;

        // Lấy policy SLA để đọc WarningAtPercent theo ClaimType.
        var policies = await db.SlaPolicies.Where(p => p.IsActive).ToListAsync(ct);
        var policyByType = policies.ToDictionary(p => p.ClaimType, p => p);

        var now = DateTime.UtcNow;
        var warnings = 0;
        foreach (var claim in claims)
        {
            if (!claim.ClaimType.HasValue) continue;
            var policy = policyByType.TryGetValue(claim.ClaimType.Value, out var p) ? p : null;
            var warnPct = policy?.WarningAtPercent ?? 80;

            if (claim.IsSlaBreachingAt(warnPct, now))
            {
                warnings++;
                if (publish != null)
                {
                    await publish.Publish(new WarrantyClaimSlaWarningEvent(
                        claim.Id, claim.CustomerId, claim.SerialNumber,
                        claim.ClaimType!.Value.ToString(), claim.SlaDeadline!.Value, now), ct);
                }
                _logger.LogWarning(
                    "SLA warning: claim {ClaimId} type {Type} deadline {Deadline}",
                    claim.Id, claim.ClaimType, claim.SlaDeadline);
            }
        }
        _logger.LogInformation("SLA monitor xong — {Total} claim InProgress, {Warn} cảnh báo",
            claims.Count, warnings);
    }
}

/// <summary>Event cảnh báo — Communication consume để gửi notification.</summary>
public record WarrantyClaimSlaWarningEvent(
    Guid ClaimId,
    Guid CustomerId,
    string SerialNumber,
    string ClaimType,
    DateTime SlaDeadline,
    DateTime DetectedAt);
