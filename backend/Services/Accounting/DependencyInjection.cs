using Accounting.Application.CashBook;
using Accounting.Application.Invoicing;
using Accounting.Infrastructure;
using Accounting.Infrastructure.EInvoice;
using BuildingBlocks.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Accounting;

public static class DependencyInjection
{
    public static IServiceCollection AddAccountingModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<AccountingDbContext>((serviceProvider, options) =>
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

        // W2-14: dịch vụ nghiệp vụ của module.
        services.AddScoped<OrderInvoiceService>();
        services.AddScoped<ManualInvoiceService>();
        services.AddScoped<CreditNoteService>();
        services.AddScoped<CashBookService>();

        // E-invoice (D07): adapter TRUNG LẬP, chọn theo EInvoice:Mode.
        //   External (mặc định, cả Production) — hệ thống vẫn sinh hoá đơn nội bộ và xếp hàng
        //     "chờ xuất HĐĐT"; kế toán xuất trên phần mềm NCC đang dùng rồi ghi nhận số/ký hiệu.
        //   Sandbox — đánh dấu rõ là mô phỏng (tiền tố SandboxPrefix), chỉ dùng cho dev/demo.
        // MISAEInvoiceProvider đã bị xoá: nó gọi một API hư cấu (D07 §Phản biện) và không bao giờ
        // phát hành được hoá đơn thật. MockEInvoiceProvider được SandboxEInvoiceProvider thay thế.
        // Tầng Application/EInvoice (hàng đợi + dịch vụ phát hành) là phần việc còn lại của W2-24.
        var einvoiceOptions = new EInvoiceOptions();
        configuration.GetSection("EInvoice").Bind(einvoiceOptions);
        services.AddSingleton(einvoiceOptions);

        // Chốt an toàn khởi động (Sandbox trên Production / Live chưa có adapter).
        EInvoiceStartupGuard.Validate(einvoiceOptions, configuration);

        if (einvoiceOptions.Mode == EInvoiceMode.Sandbox)
            services.AddScoped<IEInvoiceProvider, SandboxEInvoiceProvider>();
        else
            services.AddScoped<IEInvoiceProvider, ExternalEInvoiceProvider>();

        // Tầng nghiệp vụ HĐĐT (W2-24): phát hành có kiểm tra trạng thái + hàng đợi chờ xuất.
        services.AddScoped<Application.EInvoice.EInvoiceService>();
        services.AddScoped<Application.EInvoice.EInvoiceQueueService>();

        // Khối "người bán" in trên hoá đơn — đọc từ cấu hình, không còn là hằng số trong template.
        var companyProfile = new CompanyProfileOptions();
        configuration.GetSection(CompanyProfileOptions.SectionName).Bind(companyProfile);
        services.AddSingleton(companyProfile);

        return services;
    }
}
