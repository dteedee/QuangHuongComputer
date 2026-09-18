using Communication.Application;
using Communication.Infrastructure;
using Communication.Repositories;
using Communication.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using BuildingBlocks.Database;

namespace Communication;

public static class DependencyInjection
{
    public static IServiceCollection AddCommunicationModule(this IServiceCollection services, IConfiguration configuration)
    {
        // Email is registered globally in BuildingBlocks.Email

        // Database with Connection Pooling
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<CommunicationDbContext>((serviceProvider, options) =>
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

        // Repositories
        services.AddScoped<IConversationRepository, ConversationRepository>();

        // Notification Service
        services.AddScoped<INotificationService, NotificationService>();

        // AI Chat Service (W2-15: calls Ai.Application.IAiService in-process now, no more
        // "AiService" HttpClient looping back to this same host)
        services.AddScoped<IAiChatService, AiChatService>();

        return services;
    }
}
