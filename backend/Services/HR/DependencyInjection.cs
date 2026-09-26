using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HR.Infrastructure;
using HR.Application.Attendance;
using HR.Application.Commission;
using HR.Application.Payroll;
using HR.Application.Leave;
using HR.Application.Statutory;
using HR.Application.Tax;
using BuildingBlocks.Database;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;

namespace HR;

public static class DependencyInjection
{
    public static IServiceCollection AddHRModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<HRDbContext>((serviceProvider, options) =>
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

        // W2-7: IBusinessClock was written by W1-15 but no host ever called AddBusinessClock()/
        // AddPlatformKernel() — every module still used DateTime.UtcNow directly, which is why
        // attendance compared UTC instants against VN wall-clock shift times (early-leave ~7h
        // every day, see AttendanceRecord.RecordCheckIn/RecordCheckOut). TryAddSingleton so this
        // is harmless if another module (or the host) also calls it. Real fix belongs in
        // ApiGateway/Startup/ServiceRegistration.cs (frozen this wave) — see integration-requests-w2.md.
        services.AddBusinessClock();

        // Phase 06 — Application services
        services.AddSingleton<IStoreLocationProvider, InMemoryStoreLocationProvider>();
        services.AddScoped<AttendanceValidator>();
        // Thiếu Hr:AttendanceTotpSecret ⇒ log lỗi lúc boot (QR bị từ chối, không có secret mặc định).
        services.AddHostedService<AttendanceTotpStartupCheck>();
        services.AddScoped<AttendanceCheckInService>();
        services.AddScoped<AttendanceAggregationService>();
        services.AddScoped<PayrollCalculationService>();
        services.AddScoped<PayrollRunService>();
        services.AddScoped<PayslipGenerator>();
        services.AddScoped<BankTransferFileGenerator>();
        services.AddScoped<LeaveApprovalService>();

        // W2-25 / D06 — tham số lương/thuế/bảo hiểm hiệu lực theo ngày.
        // IMemoryCache cần cho cache 10 phút của provider; TryAdd nên vô hại nếu host đã gọi.
        services.AddMemoryCache();
        services.AddScoped<HrStatutoryParameterProvider>();
        services.AddScoped<IStatutoryParameterProvider>(sp => sp.GetRequiredService<HrStatutoryParameterProvider>());
        services.AddScoped<StatutoryParameterAdminService>();
        services.AddScoped<OvertimeScheduleService>();
        services.AddScoped<PitFinalizationService>();

        // Hoa hồng kỹ thuật: cần IRepairCommissionSourceQuery do module Repair đăng ký.
        services.AddScoped<CommissionDefaults>();
        services.AddScoped<CommissionAccrualService>();

        return services;
    }
}
