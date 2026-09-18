using BuildingBlocks.Documents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Application.BackgroundServices;
using InventoryModule.Application.Purchasing;
using InventoryModule.Application.Stock;
using Microsoft.Extensions.Configuration;
using BuildingBlocks.Database;

namespace InventoryModule;

public static class DependencyInjection
{
    public static IServiceCollection AddInventoryModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<InventoryDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
            });

            var interceptor = serviceProvider.GetService<AuditSaveChangesInterceptor>();
            if (interceptor != null)
                options.AddInterceptors(interceptor);
        });

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

        // Register background service để tự động release expired reservations
        services.AddHostedService<ExpiredReservationCleanupService>();

        // Auto-reorder background service
        services.AddHostedService<AutoReorderService>();

        // Phase 05 luồng A — quy trình mua hàng chuyên nghiệp
        services.AddScoped<PoApprovalService>();

        // W2-5 — sổ cái tồn kho: người ghi DUY NHẤT của số lượng tồn. Scoped vì nó dùng chung
        // DbContext (và transaction) với endpoint đang xử lý request.
        services.AddScoped<StockLedgerService>();
        services.AddScoped<IStockLedger>(sp => sp.GetRequiredService<StockLedgerService>());

        // W1-3 gói IDocumentNumberService trong AddPlatformKernel(), nhưng host CHƯA BAO GIỜ gọi
        // AddPlatformKernel — ServiceRegistration.cs:48 chỉ gọi AddApplicationValidators(). Không có
        // dòng này thì mọi endpoint tạo chứng từ của kho ném lỗi DI lúc chạy. TryAdd nên khi
        // integration request W2-5-05 thêm AddPlatformKernel() vào host thì cũng không xung đột.
        services.TryAddSingleton<IDocumentNumberService, DocumentNumberService>();
        services.AddScoped<InventoryDocumentNumbers>();
        services.AddScoped<SerialTimelineQueries>();

        return services;
    }
}
