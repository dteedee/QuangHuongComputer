using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using CRM.Infrastructure;
using CRM.Domain;

namespace CRM.BackgroundServices;

public class AutomationJobService : BackgroundService
{
    private readonly ILogger<AutomationJobService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public AutomationJobService(ILogger<AutomationJobService> logger, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CRM Automation Job Service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<CrmDbContext>();

                // 1. Lấy tất cả các rule đang active
                var activeRules = await dbContext.AutomationRules
                    .Where(r => r.IsActive)
                    .ToListAsync(stoppingToken);

                foreach (var rule in activeRules)
                {
                    // Lógica xử lý từng rule (có thể tối ưu hoá phân chia task)
                    await ProcessRuleAsync(rule, scope.ServiceProvider, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing CRM automation job.");
            }

            // Chạy mỗi 15 phút
            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }

    private async Task ProcessRuleAsync(AutomationRule rule, IServiceProvider serviceProvider, CancellationToken ct)
    {
        var db = serviceProvider.GetRequiredService<CrmDbContext>();
        
        switch (rule.Trigger)
        {
            case AutomationTrigger.AbandonedCart:
                // Tìm kiếm cart bị bỏ quên ở module Sales (trong hệ thống thực tế sẽ gọi via API/gRPC hoặc message bus)
                _logger.LogInformation("Processing AbandonedCart rule {RuleId}", rule.Id);
                // Implementation: Query Carts where LastModified < Now - TriggerDelayMinutes && Status = Draft
                break;
                
            case AutomationTrigger.WarrantyExpiration:
                _logger.LogInformation("Processing WarrantyExpiration rule {RuleId}", rule.Id);
                // Implementation: Query Warranty ends in <= 30 days
                break;
                
            case AutomationTrigger.VipInactivity:
                _logger.LogInformation("Processing VipInactivity rule {RuleId}", rule.Id);
                // Implementation: Find VIP segments who haven't purchased in > 60 days
                break;
                
            case AutomationTrigger.Birthday:
                _logger.LogInformation("Processing Birthday rule {RuleId}", rule.Id);
                // Check Customers with Birthday == Today
                break;
                
            case AutomationTrigger.PostPurchaseFollowUp:
                _logger.LogInformation("Processing PostPurchaseFollowUp rule {RuleId}", rule.Id);
                break;
        }

        rule.MarkRun(DateTime.UtcNow);
        await db.SaveChangesAsync(ct);
    }
}
