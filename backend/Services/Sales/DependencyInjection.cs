using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Sales.Infrastructure;
using Sales.Application.Checkout;
using Sales.Application.Inventory;
using Sales.Application.Pricing;
using BuildingBlocks.Database;
using BuildingBlocks.Time;

namespace Sales;

public static class DependencyInjection
{
    public static IServiceCollection AddSalesModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<SalesDbContext>((serviceProvider, options) =>
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

        // D01 — đồng hồ nghiệp vụ giờ VN. TryAdd nên gọi nhiều lần vô hại; đăng ký ở đây để Sales
        // không phụ thuộc vào việc module khác có được nạp trước hay không.
        services.AddBusinessClock();

        // ===== Luồng chốt đơn (W2-3) =====
        services.AddScoped<CheckoutOrchestrator>();
        services.AddScoped<InventoryReservationService>();
        services.AddScoped<LineVatProfileResolver>();
        // Combo: giá combo cho giỏ + chốt đơn, một nguồn duy nhất.
        services.AddScoped<Sales.Application.Pricing.Bundles.BundleCartPricingService>();

        // Nguồn giá mặc định: giá niêm yết trong Catalog. W2-19 đăng ký thêm nguồn giá báo giá.
        services.AddScoped<IOrderPriceSource, CatalogOrderPriceSource>();

        services.TryAddScopedIfMissing<IPricingEngine, PricingEngine>();

        // Nhả tồn kho của phiên checkout hết hạn (15 phút) — nếu thiếu, tồn khả dụng tụt dần
        // mỗi lần khách bỏ ngang và website báo hết hàng cho hàng còn trên kệ.
        services.AddHostedService<CheckoutSessionExpiryJob>();

        // Phase 07: Return workflow (3 luồng + nhập lại kho).
        services.AddScoped<Sales.Application.Returns.RestockService>();
        services.AddScoped<Sales.Application.Returns.ReturnOrchestrator>();

        // W0-10: Payments hỏi Sales về đơn hàng (số tiền + chủ sở hữu) qua interface khai báo ở Payments.
        // Thiếu đăng ký này thì `/api/payments/initiate` không chạy được — đó là hành vi đúng
        // (fail-closed), vì không còn đường nào lấy số tiền từ client.
        services.AddScoped<Payments.Application.IOrderPaymentInfoProvider,
                           Sales.Application.Payments.OrderPaymentInfoProvider>();

        // Catalog hỏi "khách đã nhận món này chưa" (huy hiệu đánh giá đã mua) qua contract ở
        // BuildingBlocks — Catalog không tham chiếu Sales. Thiếu đăng ký ⇒ endpoint review 500,
        // không bao giờ tự cấp huy hiệu (fail-closed).
        services.AddScoped<BuildingBlocks.Contracts.IPurchaseVerificationQuery,
                           Sales.Application.Orders.PurchaseVerificationQuery>();

        return services;
    }

    private static void TryAddScopedIfMissing<TService, TImpl>(this IServiceCollection services)
        where TService : class
        where TImpl : class, TService
    {
        if (!services.Any(s => s.ServiceType == typeof(TService)))
        {
            services.AddScoped<TService, TImpl>();
        }
    }
}
