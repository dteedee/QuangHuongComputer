using CRM.Domain;
using Microsoft.EntityFrameworkCore;

namespace CRM.Infrastructure.Seed;

/// <summary>
/// W2-8 step 12: seed mặc định cho pipeline lead + phân khúc RFM. Chỉ INSERT khi bảng trống
/// (idempotent - không bao giờ ghi đè dữ liệu người dùng đã sửa).
///
/// NOTE (đã ghi vào integration-requests-w2.md): các seeder khác được gọi từ
/// ApiGateway/Startup/DatabaseMigrationRunner.cs (vd. CatalogDbSeeder, HRDbSeeder) - file đó ngoài
/// phạm vi sở hữu của track này. Cần thêm một dòng gọi
/// <c>await CrmDefaultsSeeder.SeedAsync(sp.GetRequiredService&lt;CrmDbContext&gt;());</c> theo
/// đúng mẫu các seeder khác.
/// </summary>
public static class CrmDefaultsSeeder
{
    public static async Task SeedAsync(CrmDbContext db, CancellationToken cancellationToken = default)
    {
        await SeedPipelineStagesAsync(db, cancellationToken);
        await SeedRfmSegmentsAsync(db, cancellationToken);
    }

    private static async Task SeedPipelineStagesAsync(CrmDbContext db, CancellationToken cancellationToken)
    {
        if (await db.LeadPipelineStages.AnyAsync(cancellationToken))
            return;

        var stages = new[]
        {
            new LeadPipelineStage("Mới", sortOrder: 1, winProbability: 5),
            new LeadPipelineStage("Đã liên hệ", sortOrder: 2, winProbability: 15),
            new LeadPipelineStage("Báo giá", sortOrder: 3, winProbability: 40),
            new LeadPipelineStage("Đàm phán", sortOrder: 4, winProbability: 65),
            new LeadPipelineStage("Thắng", sortOrder: 5, winProbability: 100),
            new LeadPipelineStage("Thua", sortOrder: 6, winProbability: 0),
        };

        stages[4].SetAsFinalStage(isWon: true);
        stages[5].SetAsFinalStage(isWon: false);

        db.LeadPipelineStages.AddRange(stages);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedRfmSegmentsAsync(CrmDbContext db, CancellationToken cancellationToken)
    {
        if (await db.CustomerSegments.AnyAsync(cancellationToken))
            return;

        // Ngưỡng khớp với RfmCalculationService.GetRecencyScore/GetFrequencyScore/GetMonetaryScore
        // (RecencyScore/FrequencyScore/MonetaryScore mỗi cái 1-5, TotalRfmScore tối đa 15) và
        // LifecycleStage trong CustomerAnalytics.UpdateLifecycleStage.
        var vip = new CustomerSegment("VIP", "VIP", "Điểm RFM cao nhất, chi tiêu lớn, mua thường xuyên");
        vip.Update("VIP", vip.Description, "#F59E0B", sortOrder: 1);
        vip.SetAutoAssignRules("""{"minRfmScore":12}""");

        var loyal = new CustomerSegment("Trung thành", "LOYAL", "Mua đều đặn, điểm RFM khá");
        loyal.Update("Trung thành", loyal.Description, "#10B981", sortOrder: 2);
        loyal.SetAutoAssignRules("""{"minRfmScore":9,"maxRfmScore":11}""");

        var atRisk = new CustomerSegment("Có nguy cơ", "AT_RISK", "Từng mua nhiều nhưng lâu chưa quay lại");
        atRisk.Update("Có nguy cơ", atRisk.Description, "#F97316", sortOrder: 3);
        atRisk.SetAutoAssignRules("""{"lifecycleStages":["AtRisk"]}""");

        var dormant = new CustomerSegment("Ngủ đông", "DORMANT", "Không mua hàng trong thời gian dài");
        dormant.Update("Ngủ đông", dormant.Description, "#6B7280", sortOrder: 4);
        dormant.SetAutoAssignRules("""{"lifecycleStages":["Churned"]}""");

        var newCustomer = new CustomerSegment("Mới", "NEW", "Chưa có hoặc mới có đơn hàng đầu tiên");
        newCustomer.Update("Mới", newCustomer.Description, "#3B82F6", sortOrder: 5);
        newCustomer.SetAutoAssignRules("""{"lifecycleStages":["New"]}""");

        db.CustomerSegments.AddRange(vip, loyal, atRisk, dormant, newCustomer);
        await db.SaveChangesAsync(cancellationToken);
    }
}
