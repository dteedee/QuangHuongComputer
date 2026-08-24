using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Reporting.Endpoints;

public static class SystemHealthEndpoints
{
    public static void MapSystemHealthEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/system-health", async (HealthCheckService healthCheckService) =>
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));

            // Real process metrics (no random values). Any failure -> null instead of a fake number.
            var (cpuPercent, memoryMb, memoryPercent, storagePercent, uptime) = MeasureProcessMetrics();

            // Reuse the health checks already registered in ApiGateway (postgres/redis/rabbitmq)
            // instead of re-implementing separate pings — DRY + honest (same probes used by /health).
            HealthReport? report = null;
            try
            {
                report = await healthCheckService.CheckHealthAsync(cts.Token);
            }
            catch
            {
                // Health check subsystem unreachable/timed out -> every dependency reports "unknown" below.
            }

            var apiService = new ServiceStatus("api", "operational", 0, FormatUptime(uptime));
            var dbService = BuildServiceStatus(report, "postgres", "database");
            var redisService = BuildServiceStatus(report, "redis", "redis");
            var rabbitService = BuildServiceStatus(report, "rabbitmq", "rabbitmq");
            var services = new[] { apiService, dbService, redisService, rabbitService };

            var dbEntry = GetEntry(report, "postgres");
            var anyDown = services.Any(s => s.Status == "down");
            var anyUnknown = services.Any(s => s.Status == "unknown");

            string overallStatus = dbEntry is null || dbEntry.Value.Status == HealthStatus.Unhealthy
                ? "outage"
                : anyDown || anyUnknown || dbEntry.Value.Status == HealthStatus.Degraded
                    ? "degraded"
                    : "healthy";

            var metrics = new
            {
                cpu = cpuPercent,
                memory = memoryPercent,
                memoryMb,
                storage = storagePercent,
                network = (double?)null
            };

            return Results.Ok(new
            {
                status = overallStatus,
                updatedAt = DateTime.UtcNow,
                metrics,
                services = services.Select(s => new
                {
                    name = s.Name,
                    status = s.Status,
                    latencyMs = s.LatencyMs,
                    uptime = s.Uptime
                })
            });
        });
    }

    private readonly record struct ServiceStatus(string Name, string Status, double? LatencyMs, string? Uptime);

    private static HealthReportEntry? GetEntry(HealthReport? report, string key)
    {
        if (report is null) return null;
        return report.Entries.TryGetValue(key, out var entry) ? entry : null;
    }

    private static ServiceStatus BuildServiceStatus(HealthReport? report, string key, string displayName)
    {
        var entry = GetEntry(report, key);
        if (entry is null)
        {
            return new ServiceStatus(displayName, "unknown", null, null);
        }

        var status = entry.Value.Status switch
        {
            HealthStatus.Healthy => "operational",
            HealthStatus.Degraded => "degraded",
            _ => "down"
        };

        return new ServiceStatus(displayName, status, Math.Round(entry.Value.Duration.TotalMilliseconds, 1), null);
    }

    private static (double? cpu, double? memoryMb, double? memoryPercent, double? storagePercent, TimeSpan? uptime) MeasureProcessMetrics()
    {
        double? cpu = null;
        double? memoryMb = null;
        double? memoryPercent = null;
        double? storagePercent = null;
        TimeSpan? uptime = null;

        try
        {
            var proc = Process.GetCurrentProcess();

            var cpuStart = proc.TotalProcessorTime;
            var timer = Stopwatch.StartNew();
            Thread.Sleep(200); // short sample window; endpoint stays well under the 2s budget
            proc.Refresh();
            var cpuElapsedMs = timer.Elapsed.TotalMilliseconds * Environment.ProcessorCount;
            if (cpuElapsedMs > 0)
            {
                cpu = Math.Round((proc.TotalProcessorTime - cpuStart).TotalMilliseconds / cpuElapsedMs * 100, 1);
            }

            memoryMb = Math.Round(proc.WorkingSet64 / 1024.0 / 1024.0, 1);

            var totalMemory = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes;
            if (totalMemory > 0)
            {
                memoryPercent = Math.Round(proc.WorkingSet64 / (double)totalMemory * 100, 1);
            }

            uptime = DateTime.UtcNow - proc.StartTime.ToUniversalTime();
        }
        catch
        {
            // Leave metrics null — never fabricate values we couldn't measure.
        }

        try
        {
            var drive = new DriveInfo(Path.GetPathRoot(AppContext.BaseDirectory) ?? "/");
            if (drive.IsReady && drive.TotalSize > 0)
            {
                storagePercent = Math.Round((drive.TotalSize - drive.AvailableFreeSpace) / (double)drive.TotalSize * 100, 1);
            }
        }
        catch
        {
            storagePercent = null;
        }

        return (cpu, memoryMb, memoryPercent, storagePercent, uptime);
    }

    private static string? FormatUptime(TimeSpan? uptime)
    {
        if (uptime is null) return null;
        var u = uptime.Value;
        return $"{(int)u.TotalDays}d {u.Hours}h {u.Minutes}m";
    }
}
