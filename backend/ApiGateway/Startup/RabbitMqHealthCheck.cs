using Microsoft.Extensions.Diagnostics.HealthChecks;
using RabbitMQ.Client;

namespace ApiGateway.Startup;

/// <summary>
/// Health check cho RabbitMQ, viết thẳng trên RabbitMQ.Client 7.x.
///
/// Vì sao không dùng package AspNetCore.HealthChecks.Rabbitmq: bản 8.0.1 gọi
/// <c>RabbitMQ.Client.IModel</c> — kiểu đã bị xoá ở client 7.x — nên health check ném
/// <c>TypeLoadException</c> và <c>/health</c> trả 503 dù MassTransit vẫn chạy bình thường
/// (Docker healthcheck và Caddy sẽ tưởng app chết). Bản 9.0.0 thì đổi chữ ký, đòi tự đăng ký
/// một <c>IConnection</c> trong DI chỉ để phục vụ health check. Tự viết ~40 dòng vừa bỏ được
/// một phụ thuộc, vừa cắt hẳn cái bẫy lệch phiên bản đã tái diễn nhiều lần ở dự án này.
///
/// Mở kết nối theo từng lần kiểm tra rồi đóng: health check chạy thưa, và một kết nối dùng lại
/// lâu ngày có thể "khoẻ" trên giấy trong khi broker đã từ chối kết nối mới.
/// </summary>
public sealed class RabbitMqHealthCheck : IHealthCheck
{
    private readonly string _connectionString;

    public RabbitMqHealthCheck(string connectionString) => _connectionString = connectionString;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var factory = new ConnectionFactory
            {
                Uri = new Uri(_connectionString),
                ClientProvidedName = "qh-healthcheck",
                // Không để health check tự treo: nếu broker không trả lời nhanh thì coi là hỏng.
                RequestedConnectionTimeout = TimeSpan.FromSeconds(5),
            };

            await using var connection = await factory.CreateConnectionAsync(cancellationToken);
            // Mở channel mới là phép thử thật: kết nối TCP đứng được không có nghĩa broker
            // còn nhận channel (hết tài nguyên, vhost bị xoá, quyền bị thu hồi...).
            await using var channel = await connection.CreateChannelAsync(cancellationToken: cancellationToken);

            return channel.IsOpen
                ? HealthCheckResult.Healthy($"RabbitMQ sẵn sàng (vhost '{factory.VirtualHost}')")
                : HealthCheckResult.Unhealthy("Mở được kết nối RabbitMQ nhưng channel không ở trạng thái open");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Không kết nối được RabbitMQ", ex);
        }
    }
}
