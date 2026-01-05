using System.Reflection;
using System.Text.Json;
using BuildingBlocks.SharedKernel;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Messaging.Outbox;

public class OutboxProcessorBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OutboxProcessorBackgroundService> _logger;

    public OutboxProcessorBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<OutboxProcessorBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Outbox Processor Background Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessOutboxMessagesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing outbox messages.");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    private async Task ProcessOutboxMessagesAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        // Since we are in a monorepo monolith, we might have multiple DbContext types.
        // For simplicity, we assume there's a convention or we provide the specific DbContext type.
        // Here we search for all DbContexts that have a DbSet<OutboxMessage>
        
        var dbContexts = scope.ServiceProvider.GetServices<DbContext>();

        foreach (var dbContext in dbContexts)
        {
            var outboxMessages = await dbContext.Set<OutboxMessage>()
                .Where(m => m.ProcessedOnUtc == null)
                .Take(20)
                .ToListAsync(stoppingToken);

            if (!outboxMessages.Any()) continue;

            var publishEndpoint = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();

            foreach (var message in outboxMessages)
            {
                try
                {
                    var type = Type.GetType(message.Type + ", " + GetModuleNameFromType(message.Type)); 
                    // Note: This needs a more robust way to resolve types in a monolith.
                    // For now, let's assume events are in the same assembly or known.
                    
                    if (type == null)
                    {
                        // Fallback: search all loaded assemblies
                        type = AppDomain.CurrentDomain.GetAssemblies()
                            .SelectMany(a => a.GetTypes())
                            .FirstOrDefault(t => t.Name == message.Type);
                    }

                    if (type != null)
                    {
                        var domainEvent = JsonSerializer.Deserialize(message.Content, type);
                        if (domainEvent != null)
                        {
                            await publishEndpoint.Publish(domainEvent, type, stoppingToken);
                        }
                    }
                    
                    message.ProcessedOnUtc = DateTime.UtcNow;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process outbox message {MessageId}", message.Id);
                    message.Error = ex.Message;
                }
            }

            await dbContext.SaveChangesAsync(stoppingToken);
        }
    }

    private string GetModuleNameFromType(string typeFullName)
    {
        // Simple logic to extract module name if it follows naming conventions
        return typeFullName.Split('.')[0];
    }
}
