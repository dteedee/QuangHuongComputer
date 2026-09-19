using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Security;

/// <summary>
/// Chạy <see cref="EndpointAuthorizationConvention"/> trên bảng route THẬT lúc khởi động
/// và ghi danh sách endpoint chưa có policy permission ra log.
///
/// Mặc định CHỈ CẢNH BÁO. Chỉ khi <c>Security:EndpointAuthorizationAudit:FailOnViolation</c>
/// = true thì mới ném lỗi và chặn app khởi động (fail-closed thật sự) — bật cờ này là
/// việc của cổng W1-G, sau khi W1-10 quét xong toàn bộ endpoint. Bật sớm sẽ làm sập API.
/// </summary>
public sealed class EndpointAuthorizationAuditor : IHostedService
{
    public const string FailOnViolationKey = "Security:EndpointAuthorizationAudit:FailOnViolation";
    public const string LogPrefix = "[authz-audit]";

    /// <summary>
    /// W4-5: đặt true khi <see cref="RunOn"/> đã quét xong bảng route THẬT trong Program.cs.
    /// Hosted service chạy SAU đó và luôn thấy DI rỗng (xem ghi chú ở <see cref="Run"/>);
    /// nếu không có cái chốt này thì bật <see cref="FailOnViolationKey"/> = true sẽ làm app
    /// KHÔNG BAO GIỜ khởi động được, kể cả khi bảng route hoàn toàn sạch.
    /// Vẫn fail-closed: chốt chỉ mở khi RunOn thực sự đã chạy: xoá lời gọi trong Program.cs
    /// thì hosted service lại ném lỗi như cũ.
    /// </summary>
    private static bool _routeTableAudited;

    private readonly IServiceProvider _services;
    private readonly ILogger<EndpointAuthorizationAuditor> _logger;
    private readonly bool _failOnViolation;

    public EndpointAuthorizationAuditor(
        IServiceProvider services,
        ILogger<EndpointAuthorizationAuditor> logger,
        bool failOnViolation)
    {
        _services = services;
        _logger = logger;
        _failOnViolation = failOnViolation;
    }

    /// <summary>
    /// Chạy ngay trong StartAsync: mọi lời gọi <c>app.Map*</c> trong Program.cs đã nạp
    /// route vào EndpointDataSource TRƯỚC khi host start, nên bảng route đã đầy đủ.
    /// Ném lỗi ở đây mới thực sự chặn được app khởi động (callback ApplicationStarted
    /// bị host nuốt exception).
    /// </summary>
    public Task StartAsync(CancellationToken cancellationToken)
    {
        Run();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private void Run()
    {
        try
        {
            var endpoints = ResolveEndpoints();
            if (endpoints.Count == 0)
            {
                // ĐO ĐƯỢC 2026-09-18 trên :5050: đây là nhánh LUÔN chạy. WebApplication giữ
                // EndpointDataSource của các lệnh app.Map* trong chính nó (IEndpointRouteBuilder
                // .DataSources) chứ KHÔNG đăng ký vào DI, nên GetServices<EndpointDataSource>()
                // trả về rỗng và audit không kiểm tra được gì. Cách duy nhất là gọi
                // RunOn(app) một dòng trong Program.cs (không thuộc quyền sửa của W1-1).
                // Log ở mức Warning để cổng W1-G không đọc nhầm "im lặng" thành "sạch".
                if (_routeTableAudited)
                {
                    // Program.cs đã gọi RunOn trên bảng route thật — không có gì để làm thêm.
                    _logger.LogDebug("{Prefix} bảng route đã được RunOn kiểm tra trước đó.", LogPrefix);
                    return;
                }

                _logger.LogWarning(
                    "{Prefix} KHÔNG CHẠY ĐƯỢC: DI không có EndpointDataSource nào. " +
                    "Thêm `app.Services.GetRequiredService<EndpointAuthorizationAuditor>()` … hoặc đơn giản " +
                    "`EndpointAuthorizationAuditor.RunOn(app, logger, failOnViolation)` vào Program.cs sau các lệnh app.Map*.",
                    LogPrefix);
                if (_failOnViolation && !_routeTableAudited)
                {
                    throw new InvalidOperationException(
                        $"{LogPrefix} bật {FailOnViolationKey}=true nhưng audit không đọc được bảng route — " +
                        "fail-closed: từ chối khởi động thay vì giả vờ đã kiểm tra.");
                }
                return;
            }

            var violations = EndpointAuthorizationConvention.Analyze(endpoints);
            Report(endpoints.Count, violations);

            if (_failOnViolation && violations.Count > 0)
            {
                throw new InvalidOperationException(
                    $"{LogPrefix} {violations.Count}/{endpoints.Count} endpoint chưa có policy permission. " +
                    $"Đặt {FailOnViolationKey}=false để khởi động ở chế độ cảnh báo.");
            }
        }
        catch (InvalidOperationException) when (_failOnViolation)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Audit KHÔNG BAO GIỜ được làm sập API khi đang ở chế độ cảnh báo.
            _logger.LogWarning(ex, "{Prefix} chạy thất bại, bỏ qua.", LogPrefix);
        }
    }

    private List<Endpoint> ResolveEndpoints()
    {
        var sources = _services.GetServices<EndpointDataSource>().ToList();
        return sources.SelectMany(s => s.Endpoints).Distinct().ToList();
    }

    /// <summary>
    /// Chạy audit trên bảng route THẬT của một <see cref="IEndpointRouteBuilder"/>
    /// (tức là chính <c>app</c> trong Program.cs, sau mọi lệnh <c>app.Map*</c>).
    /// Đây là cách duy nhất audit đọc được endpoint — xem ghi chú ở <see cref="Run"/>.
    /// </summary>
    public static IReadOnlyList<EndpointAuthorizationViolation> RunOn(
        IEndpointRouteBuilder app, ILogger<EndpointAuthorizationAuditor> logger, bool failOnViolation = false)
    {
        var endpoints = app.DataSources.SelectMany(s => s.Endpoints).Distinct().ToList();
        var violations = EndpointAuthorizationConvention.Analyze(endpoints);
        _routeTableAudited = true;

        new EndpointAuthorizationAuditor(null!, logger, failOnViolation).Report(endpoints.Count, violations);

        if (failOnViolation && violations.Count > 0)
        {
            throw new InvalidOperationException(
                $"{LogPrefix} {violations.Count}/{endpoints.Count} endpoint chưa có policy permission.");
        }

        return violations;
    }

    /// <summary>Ghi kết quả audit ra log (tách riêng để gọi được từ Program.cs hoặc test).</summary>
    public void Report(int endpointCount, IReadOnlyList<EndpointAuthorizationViolation> violations)
    {
        if (violations.Count == 0)
        {
            _logger.LogInformation("{Prefix} OK — {Count} endpoint đều có policy permission hoặc nằm trong allow-list công khai.",
                LogPrefix, endpointCount);
            return;
        }

        var byKind = violations.GroupBy(v => v.Kind)
            .OrderByDescending(g => g.Count())
            .Select(g => $"{g.Key}={g.Count()}");

        _logger.LogWarning("{Prefix} {Violations}/{Total} endpoint chưa đạt chuẩn ({Breakdown}).",
            LogPrefix, violations.Count, endpointCount, string.Join(" ", byKind));

        foreach (var violation in violations.OrderBy(v => v.RoutePattern, StringComparer.Ordinal))
        {
            _logger.LogWarning("{Prefix} {Line}", LogPrefix, EndpointAuthorizationConvention.Describe(violation));
        }
    }
}
