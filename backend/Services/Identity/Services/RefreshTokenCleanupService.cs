using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Identity.Services;

public class RefreshTokenCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RefreshTokenCleanupService> _logger;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(24); // Run cleanup daily

    public RefreshTokenCleanupService(IServiceProvider serviceProvider, ILogger<RefreshTokenCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Refresh Token Cleanup Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("Running refresh token cleanup...");

                using (var scope = _serviceProvider.CreateScope())
                {
                    var refreshTokenService = scope.ServiceProvider.GetRequiredService<IRefreshTokenService>();
                    await refreshTokenService.CleanupExpiredTokensAsync();
                }

                _logger.LogInformation("Refresh token cleanup completed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while cleaning up expired refresh tokens.");
            }

            // Wait for next cleanup interval
            await Task.Delay(_cleanupInterval, stoppingToken);
        }

        _logger.LogInformation("Refresh Token Cleanup Service is stopping.");
    }
}
