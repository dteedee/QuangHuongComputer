using Communication.Application;
using Communication.Infrastructure;
using Communication.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Communication;

public static class DependencyInjection
{
    public static IServiceCollection AddCommunicationModule(this IServiceCollection services, IConfiguration configuration)
    {
        // Email is registered globally in BuildingBlocks.Email

        // Database with Connection Pooling
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContextPool<CommunicationDbContext>(options =>
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
            }),
            poolSize: 128);

        // Repositories
        services.AddScoped<IConversationRepository, ConversationRepository>();

        // AI Chat Service
        services.AddScoped<IAiChatService, AiChatService>();

        // HTTP Client for AI Service
        services.AddHttpClient("AiService", client =>
        {
            var aiServiceUrl = configuration["Services:AiService:Url"] ?? "http://localhost:5000";
            client.BaseAddress = new Uri(aiServiceUrl);
        });

        return services;
    }
}
