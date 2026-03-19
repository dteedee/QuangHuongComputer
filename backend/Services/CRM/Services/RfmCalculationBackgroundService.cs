using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CRM.Services;

/// <summary>
/// Background service that runs nightly RFM calculations
/// </summary>
public class RfmCalculationBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RfmCalculationBackgroundService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(24); // Run daily

    public RfmCalculationBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<RfmCalculationBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RFM Calculation Background Service started");

        // Wait a bit before first run to let the application start up
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Calculate time until next 2 AM (optimal time for batch processing)
                var now = DateTime.UtcNow;
                var nextRun = now.Date.AddDays(1).AddHours(2); // 2 AM UTC next day
                if (now.Hour < 2)
                {
                    nextRun = now.Date.AddHours(2); // 2 AM UTC today
                }

                var delay = nextRun - now;
                _logger.LogInformation("Next RFM calculation scheduled for {NextRun} (in {Delay})", nextRun, delay);

                await Task.Delay(delay, stoppingToken);

                await RunCalculationsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Service is stopping
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RFM Calculation Background Service");
                // Wait before retrying
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }

        _logger.LogInformation("RFM Calculation Background Service stopped");
    }

    private async Task RunCalculationsAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting nightly RFM calculation batch");

        using var scope = _serviceProvider.CreateScope();
        var rfmService = scope.ServiceProvider.GetRequiredService<IRfmCalculationService>();
        var segmentationService = scope.ServiceProvider.GetRequiredService<ISegmentationService>();
        var leadService = scope.ServiceProvider.GetRequiredService<ILeadManagementService>();
        var campaignService = scope.ServiceProvider.GetRequiredService<IEmailCampaignService>();

        try
        {
            // 1. Calculate RFM scores for all customers
            var rfmCount = await rfmService.CalculateForAllCustomersAsync(cancellationToken);
            _logger.LogInformation("RFM calculation completed for {Count} customers", rfmCount);

            // 2. Run segment auto-assignment
            var segmentCount = await segmentationService.RunAutoAssignmentAsync(cancellationToken);
            _logger.LogInformation("Segment auto-assignment completed, {Count} new assignments", segmentCount);

            // 3. Update segment counts
            await segmentationService.UpdateSegmentCountsAsync(cancellationToken);
            _logger.LogInformation("Segment counts updated");

            // 4. Update lead pipeline statistics
            await leadService.UpdatePipelineStatsAsync(cancellationToken);
            _logger.LogInformation("Lead pipeline stats updated");

            // 5. Process scheduled email campaigns
            await campaignService.ProcessScheduledCampaignsAsync(cancellationToken);
            _logger.LogInformation("Scheduled campaigns processed");

            _logger.LogInformation("Nightly CRM batch processing completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during nightly CRM batch processing");
            throw;
        }
    }
}
