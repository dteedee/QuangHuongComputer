using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Payments.Application;
using Payments.Application.Configuration;
using Payments.Application.Guest;
using Payments.Application.Providers;
using Payments.Application.Refunds;
using Payments.Infrastructure;
using Payments.Infrastructure.Reconciliation;
using Payments.Infrastructure.SePay;
using BuildingBlocks.Database;

namespace Payments;

public static class DependencyInjection
{
    public static IServiceCollection AddPaymentsModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<PaymentsDbContext>((serviceProvider, options) =>
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

        // Phase 04: webhook handler idempotent.
        services.AddScoped<PaymentWebhookHandler>();

        // W0-10 (D04 R2): "chỉ bật khi đã cấu hình" — nguồn duy nhất quyết định provider nào tồn tại.
        services.AddSingleton<PaymentConfigGuard>();
        services.AddSingleton<PaymentSettings>();
        services.AddSingleton<GuestOrderTokenService>();

        // W2-4 (D04 R2): chiến lược cổng thanh toán, đăng ký bằng ASSEMBLY SCAN.
        // W2-21 (VNPay) chỉ cần thêm file `IPaymentProvider` vào assembly này — không sửa DI nữa.
        AddPaymentProviders(services);
        services.AddScoped<PaymentProviderRegistry>();
        services.AddScoped<PaymentInitiationService>();
        services.AddScoped<PaymentRefundService>();
        services.AddScoped<Endpoints.PaymentQrImageService>();

        // Đối soát: client đọc sổ phụ SePay + job chạy theo giờ.
        services.AddHttpClient(SePayTransactionListClient.HttpClientName,
            client => client.Timeout = TimeSpan.FromSeconds(20));
        services.AddScoped<SePayTransactionListClient>();
        services.AddHostedService<PaymentReconciliationJob>();

        // IR #20/#21: job đối soát VNPay (querydr) chưa từng được đăng ký, và HttpClient có tên
        // "vnpay-merchant" cũng chưa đăng ký nên rơi về timeout mặc định 100 giây — một lần VNPay
        // treo là giữ luồng suốt 100s. Đặt timeout ngắn, hợp với một lệnh gọi đối soát.
        services.AddHostedService<Payments.Infrastructure.VNPay.VnPayReconciliationJob>();
        services.AddHttpClient(Payments.Infrastructure.VNPay.VnPayMerchantApiClient.HttpClientName,
            c => c.Timeout = TimeSpan.FromSeconds(15));

        // Bước 10 phase-22: nói ra ENABLED/DISABLED ngay lúc boot thay vì chờ khách đầu tiên.
        services.AddHostedService<PaymentConfigStartupValidator>();

        return services;
    }

    /// <summary>
    /// Quét assembly Payments tìm mọi cài đặt <see cref="IPaymentProvider"/> cụ thể.
    /// Một cổng KHÔNG có cài đặt ở đây đơn giản là không tồn tại với hệ thống: `/methods` không
    /// liệt kê nó và `/initiate` trả 400. Không có bảng đăng ký tay để ai đó quên cập nhật.
    /// </summary>
    private static void AddPaymentProviders(IServiceCollection services)
    {
        var providerTypes = typeof(DependencyInjection).Assembly
            .GetTypes()
            .Where(t => t is { IsAbstract: false, IsInterface: false, IsGenericTypeDefinition: false })
            .Where(t => typeof(IPaymentProvider).IsAssignableFrom(t));

        foreach (var type in providerTypes)
            services.Add(new ServiceDescriptor(typeof(IPaymentProvider), type, ServiceLifetime.Scoped));
    }
}
