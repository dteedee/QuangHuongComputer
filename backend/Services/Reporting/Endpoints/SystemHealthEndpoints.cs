using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Sales.Infrastructure;

namespace Reporting.Endpoints;

public static class SystemHealthEndpoints
{
    public static void MapSystemHealthEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/system-health", async (SalesDbContext salesDb) =>
        {
            var random = new Random();
            bool dbConnected = await salesDb.Database.CanConnectAsync();

            var metrics = new { cpu = random.Next(15, 45), memory = random.Next(40, 75), storage = 45, network = random.Next(10, 30) };

            var services = new List<object>
            {
                new { name = "API Server", status = "operational", latency = random.Next(10, 40), uptime = "99.99%" },
                new { name = "Database (PostgreSQL)", status = dbConnected ? "operational" : "outage", latency = random.Next(5, 15), uptime = "99.95%" },
                new { name = "Authentication Service", status = "operational", latency = random.Next(15, 30), uptime = "99.99%" },
                new { name = "Payment Gateway", status = "operational", latency = random.Next(80, 150), uptime = "99.90%" },
                new { name = "Background Workers", status = "degraded", latency = random.Next(300, 500), uptime = "98.50%" },
                new { name = "Cache Layer (Redis)", status = "operational", latency = random.Next(1, 4), uptime = "99.99%" },
                new { name = "Search Service", status = "operational", latency = random.Next(40, 80), uptime = "99.95%" },
                new { name = "Notification Service", status = "operational", latency = random.Next(20, 50), uptime = "99.95%" }
            };

            return Results.Ok(new { status = dbConnected ? "healthy" : "degraded", updatedAt = DateTime.UtcNow, metrics, services });
        });
    }
}
