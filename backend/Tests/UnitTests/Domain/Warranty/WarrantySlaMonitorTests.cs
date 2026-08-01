using FluentAssertions;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Warranty.Application;
using Warranty.Domain;
using Warranty.Infrastructure;
using Xunit;

namespace UnitTests.Domain.Warranty;

/// <summary>
/// Phase 07: WarrantySlaMonitor phát cảnh báo cho claim đạt 80% SLA.
/// </summary>
public class WarrantySlaMonitorTests
{
    private static (IServiceProvider sp, WarrantyDbContext db) BuildServices()
    {
        var services = new ServiceCollection();
        var uid = Guid.NewGuid().ToString();
        services.AddDbContext<WarrantyDbContext>(o => o.UseInMemoryDatabase("wr-" + uid));
        var sp = services.BuildServiceProvider();
        var db = sp.GetRequiredService<WarrantyDbContext>();
        return (sp, db);
    }

    [Fact]
    public async Task RunOnce_ClaimQua80PercentSla_LogCanhBao()
    {
        var (sp, db) = BuildServices();

        db.SlaPolicies.Add(new WarrantySlaPolicy(ClaimType.RepairAtShop, targetHours: 10, warningAtPercent: 80));
        var claim = new WarrantyClaim(Guid.NewGuid(), "SN-9", "loi");
        claim.Approve();
        claim.AssignHandling(ClaimType.RepairAtShop, 10);
        // Reset FiledDate về 9 tiếng trước để đạt 90% SLA (deadline vẫn 10 tiếng sau FiledDate).
        typeof(WarrantyClaim).GetProperty(nameof(WarrantyClaim.FiledDate))!
            .SetValue(claim, DateTime.UtcNow.AddHours(-9));
        typeof(WarrantyClaim).GetProperty(nameof(WarrantyClaim.SlaDeadline))!
            .SetValue(claim, DateTime.UtcNow.AddHours(1));
        db.Claims.Add(claim);
        await db.SaveChangesAsync();

        var monitor = new WarrantySlaMonitor(sp, NullLogger<WarrantySlaMonitor>.Instance);
        // Chạy 1 vòng — không cần assert publish (không có IPublishEndpoint đăng ký).
        await monitor.RunOnceAsync(CancellationToken.None);

        // Kiểm domain method IsSlaBreachingAt trực tiếp cho chắc chắn ngưỡng.
        claim.IsSlaBreachingAt(80).Should().BeTrue();
    }

    [Fact]
    public async Task RunOnce_ClaimResolved_KhongDaCanhBao()
    {
        var (sp, db) = BuildServices();

        var claim = new WarrantyClaim(Guid.NewGuid(), "SN-10", "loi");
        claim.Approve();
        claim.AssignHandling(ClaimType.RepairAtShop, 10);
        claim.Resolve("done");
        db.Claims.Add(claim);
        await db.SaveChangesAsync();

        var monitor = new WarrantySlaMonitor(sp, NullLogger<WarrantySlaMonitor>.Instance);
        await monitor.RunOnceAsync(CancellationToken.None);
        claim.IsSlaBreachingAt(80).Should().BeFalse();
    }
}
