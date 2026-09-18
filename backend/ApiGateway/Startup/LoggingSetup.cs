using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;

namespace ApiGateway.Startup;

/// <summary>
/// Structured logging with Serilog.
///
/// Before this the only sink was the default console logger, which writes unstructured text with no
/// request correlation — when an endpoint 500s there is no way to tie the stack trace to the request
/// that caused it, and the <c>traceId</c> the error response hands the user leads nowhere.
///
/// Sinks:
///   · console — human-readable in Development (the owner reads this terminal), compact JSON
///     everywhere else so a log shipper can parse it;
///   · rolling file — Development only (decision D05) AND opt-in: it writes only when
///     <c>Serilog:FilePath</c> is set. Deliberately unset by default, because both the owner's API
///     and the isolated TEST API run with their working directory inside the repository, so a
///     default relative path would drop TEST log files into the owner's tree and mix the two
///     instances into one file. In production the container's stdout is the log anyway.
///
/// Every line carries <c>RequestId</c>, and <c>UseSerilogRequestLogging</c> emits one summary line per
/// request with method, path, status and elapsed ms — replacing several noisy framework lines.
/// </summary>
public static class LoggingSetup
{
    public static void Configure(WebApplicationBuilder builder)
    {
        builder.Host.UseSerilog((context, services, configuration) =>
        {
            var isDevelopment = context.HostingEnvironment.IsDevelopment();

            configuration
                // Keeps appsettings "Serilog" section authoritative when present, and honours the
                // existing "Logging:LogLevel" conventions through the minimum-level overrides below.
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", "QuangHuongApi")
                .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information);

            if (isDevelopment)
            {
                configuration.WriteTo.Console(
                    outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}");

                // Development-only file sink (D05), opt-in via Serilog:FilePath — see the class remarks.
                var logPath = context.Configuration.GetValue<string>("Serilog:FilePath");
                if (!string.IsNullOrWhiteSpace(logPath))
                {
                    configuration.WriteTo.File(
                        formatter: new CompactJsonFormatter(),
                        path: logPath,
                        rollingInterval: RollingInterval.Day,
                        retainedFileCountLimit: 7,
                        shared: true);
                }
            }
            else
            {
                configuration.WriteTo.Console(new CompactJsonFormatter());
            }
        });
    }

    /// <summary>
    /// One log line per request. Registered near the TOP of the pipeline: this middleware wraps
    /// everything downstream, so it still reports the final status code — including the one the
    /// global exception handler produced — while also covering requests that CORS, the rate limiter
    /// or authentication short-circuit before they reach an endpoint.
    /// </summary>
    public static void UseRequestLogging(WebApplication app)
    {
        app.UseSerilogRequestLogging(options =>
        {
            options.MessageTemplate = "{RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
            options.GetLevel = (httpContext, elapsed, exception) =>
            {
                if (exception is not null || httpContext.Response.StatusCode >= 500) return LogEventLevel.Error;
                if (httpContext.Response.StatusCode >= 400) return LogEventLevel.Warning;
                // Health probes run every few seconds; at Information they would drown everything else.
                if (httpContext.Request.Path.StartsWithSegments("/health")) return LogEventLevel.Verbose;
                return LogEventLevel.Information;
            };
            options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
            {
                diagnosticContext.Set("ClientIp", httpContext.Connection.RemoteIpAddress?.ToString());
                diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());
            };
        });
    }
}
