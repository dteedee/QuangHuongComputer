using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Endpoints;

/// <summary>Which bucket a request was charged to, and whether that bucket is a signed-in user.</summary>
/// <param name="Key">Partition key. Prefixed so a user id can never collide with an IP.</param>
/// <param name="IsAuthenticated">True when the key identifies a signed-in user rather than an address.</param>
public readonly record struct RateLimitPartitionKey(string Key, bool IsAuthenticated);

/// <summary>
/// Chooses the rate-limit partition for a request.
///
/// Before this existed the limiter partitioned on <c>Connection.RemoteIpAddress</c> only. Behind a
/// reverse proxy that is ONE address for the whole internet, and on a dev box it is <c>127.0.0.1</c>
/// for the owner and every agent at once — so a single storefront page (22-28 API calls) could push
/// the shared 100/min bucket over the edge and 429 everybody, including the PDP, which then
/// redirects away from the product.
///
/// Rules:
///   signed in  -> one bucket per user id, so one noisy visitor cannot throttle a logged-in customer
///   anonymous  -> one bucket per client IP (already un-proxied by UseForwardedHeaders)
///
/// NOTE: this reads <see cref="HttpContext.User"/>, so <c>UseRateLimiter()</c> MUST be registered
/// after <c>UseAuthentication()</c> — see MiddlewarePipeline. Before authentication runs, every
/// request looks anonymous and would land in the IP bucket.
/// </summary>
public static class RateLimitPartitionKeyResolver
{
    public const string AnonymousFallbackKey = "ip:unknown";

    public static RateLimitPartitionKey Resolve(HttpContext context)
    {
        var userId = GetUserId(context.User);
        if (!string.IsNullOrEmpty(userId))
        {
            return new RateLimitPartitionKey("u:" + userId, true);
        }

        return new RateLimitPartitionKey(ClientIpKey(context), false);
    }

    /// <summary>IP-only partition — for the strict anonymous policies (login, public lookup, contact form).</summary>
    public static string ClientIpKey(HttpContext context) => "ip:" + NormalizeIp(context.Connection.RemoteIpAddress);

    private static string? GetUserId(ClaimsPrincipal? user)
    {
        if (user?.Identity?.IsAuthenticated != true) return null;

        // The Identity module issues NameIdentifier; "sub" is kept as a fallback because
        // JwtSecurityTokenHandler only maps it when ClaimActions are left at their defaults.
        return user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("sub")?.Value
            ?? user.FindFirst(ClaimTypes.Email)?.Value;
    }

    /// <summary>
    /// Kestrel reports an IPv4 client on a dual-stack socket as <c>::ffff:127.0.0.1</c>. Without this,
    /// the same caller would get two independent buckets depending on the socket it happened to hit.
    /// </summary>
    public static string NormalizeIp(IPAddress? address)
    {
        if (address is null) return "unknown";
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        return address.ToString();
    }
}
