using System.Text.Json;
using System.Threading.RateLimiting;
using BuildingBlocks.Endpoints;
using Microsoft.AspNetCore.RateLimiting;

namespace ApiGateway.Startup;

/// <summary>
/// Rate limiting for the whole API.
///
/// What was wrong before: ONE sliding window of 100 requests / 60s, partitioned by
/// <c>Connection.RemoteIpAddress</c>, with <c>QueueLimit = 10</c> and no <c>ForwardedHeaders</c>.
/// A storefront page issues 22-28 API calls, so three page views in a minute emptied the bucket and
/// the site started answering 429 — and because there is no proxy-aware client IP, EVERY visitor
/// behind the future Caddy edge would have shared a single bucket. The PDP even navigates away on a
/// 429, so the symptom was "products randomly disappear".
///
/// What it does now:
///   · one bucket per signed-in user, one bucket per client IP for anonymous traffic
///     (<see cref="RateLimitPartitionKeyResolver"/>; requires UseRateLimiter AFTER UseAuthentication)
///   · generous general limits — 600/min authenticated, 300/min anonymous
///   · <c>QueueLimit = 0</c>: over the limit fails fast instead of parking a request for 60s
///   · four STRICT named policies for the endpoints that are actually attackable. The general limit
///     protects availability; these protect credentials and money. Names are fixed and public so the
///     endpoint owners can attach them without waiting: <c>auth</c>, <c>lookup</c>, <c>contact</c>, <c>ai</c>.
/// </summary>
public static class RateLimitingSetup
{
    /// <summary>Login, register, forgot-password, reset-password. Brute-force defence.</summary>
    public const string AuthPolicy = "auth";

    /// <summary>Public lookups that enumerate real records (warranty by serial, order by code).</summary>
    public const string LookupPolicy = "lookup";

    /// <summary>Public write forms that reach a human or send mail (contact, callback request).</summary>
    public const string ContactPolicy = "contact";

    /// <summary>Endpoints that cost money per call (LLM chat, recommendations, semantic search).</summary>
    public const string AiPolicy = "ai";

    private const int DefaultAnonymousPermitLimit = 300;
    private const int DefaultAuthenticatedPermitLimit = 600;
    private const int DefaultWindowSeconds = 60;

    public static void Register(WebApplicationBuilder builder)
    {
        var config = builder.Configuration;

        // "RateLimiting:PermitLimit" keeps its original meaning (the anonymous general limit) so that
        // existing overrides — e.g. the TEST stack's --RateLimiting:PermitLimit=100000 — still work.
        var anonymousLimit = config.GetValue("RateLimiting:PermitLimit", DefaultAnonymousPermitLimit);
        var authenticatedLimit = config.GetValue(
            "RateLimiting:AuthenticatedPermitLimit",
            Math.Max(DefaultAuthenticatedPermitLimit, anonymousLimit));
        var window = TimeSpan.FromSeconds(config.GetValue("RateLimiting:WindowInSeconds", DefaultWindowSeconds));

        builder.Services.AddRateLimiter(options =>
        {
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var partition = RateLimitPartitionKeyResolver.Resolve(context);
                var permitLimit = partition.IsAuthenticated ? authenticatedLimit : anonymousLimit;

                return RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey: partition.Key,
                    factory: _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = permitLimit,
                        Window = window,
                        SegmentsPerWindow = 6,
                        // 0 on purpose: a queued request still holds a connection and a thread, and the
                        // caller has already given up by the time it is served.
                        QueueLimit = 0,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                    });
            });

            // Strict policies. All partition by IP: the traffic they defend against is anonymous by
            // definition, and an attacker must not be able to escape a bucket by signing up.
            AddStrictPolicy(options, config, AuthPolicy, defaultPermitLimit: 10);
            AddStrictPolicy(options, config, LookupPolicy, defaultPermitLimit: 30);
            AddStrictPolicy(options, config, ContactPolicy, defaultPermitLimit: 5);
            AddStrictPolicy(options, config, AiPolicy, defaultPermitLimit: 20);

            options.OnRejected = OnRejectedAsync;
        });
    }

    /// <summary>
    /// A fixed window (not sliding) for the strict policies: the reset is predictable, which is what
    /// a "try again in N seconds" message needs. Every value is overridable at
    /// <c>RateLimiting:Policies:&lt;name&gt;:{PermitLimit,WindowInSeconds}</c>.
    /// </summary>
    private static void AddStrictPolicy(
        RateLimiterOptions options,
        IConfiguration config,
        string policyName,
        int defaultPermitLimit)
    {
        var permitLimit = config.GetValue($"RateLimiting:Policies:{policyName}:PermitLimit", defaultPermitLimit);
        var windowSeconds = config.GetValue($"RateLimiting:Policies:{policyName}:WindowInSeconds", DefaultWindowSeconds);

        options.AddPolicy(policyName, context => RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{policyName}:{RateLimitPartitionKeyResolver.ClientIpKey(context)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromSeconds(windowSeconds),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));
    }

    private static async ValueTask OnRejectedAsync(OnRejectedContext context, CancellationToken cancellationToken)
    {
        var http = context.HttpContext;
        if (http.Response.HasStarted) return;

        // Prefer the limiter's own estimate so the client is not told to wait longer than necessary.
        var retryAfterSeconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
            ? Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds))
            : 60;

        http.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        http.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
        http.Response.ContentType = "application/problem+json";

        const string message = "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
        var body = new Dictionary<string, object?>
        {
            ["type"] = "https://httpstatuses.io/429",
            ["title"] = "Too Many Requests",
            ["status"] = StatusCodes.Status429TooManyRequests,
            ["instance"] = http.Request.Path.Value,
            ["traceId"] = http.TraceIdentifier,
            ["retryAfter"] = retryAfterSeconds,
            // Legacy keys the SPA reads, same as the global exception handler.
            ["error"] = message,
            ["message"] = message
        };

        await http.Response.WriteAsync(
            JsonSerializer.Serialize(body, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            cancellationToken);
    }
}
