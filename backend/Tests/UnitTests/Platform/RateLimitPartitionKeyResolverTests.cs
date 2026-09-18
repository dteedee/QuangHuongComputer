using System.Net;
using System.Security.Claims;
using BuildingBlocks.Endpoints;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// Partitioning is what stops one visitor (or one agent on 127.0.0.1) from 429-ing everybody else.
/// </summary>
public class RateLimitPartitionKeyResolverTests
{
    private static HttpContext Anonymous(string ip)
        => new DefaultHttpContext { Connection = { RemoteIpAddress = IPAddress.Parse(ip) } };

    private static HttpContext SignedIn(string ip, string userId)
    {
        var context = Anonymous(ip);
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, userId) },
            authenticationType: "TestJwt"));
        return context;
    }

    [Fact]
    public void AnonymousRequests_ArePartitionedByClientIp()
    {
        var partition = RateLimitPartitionKeyResolver.Resolve(Anonymous("203.0.113.7"));

        partition.IsAuthenticated.Should().BeFalse();
        partition.Key.Should().Be("ip:203.0.113.7");
    }

    [Fact]
    public void SignedInRequests_ArePartitionedByUserId_NotByIp()
    {
        // Two users behind one NAT / one proxy must not share a bucket — that was the whole bug.
        var first = RateLimitPartitionKeyResolver.Resolve(SignedIn("203.0.113.7", "user-a"));
        var second = RateLimitPartitionKeyResolver.Resolve(SignedIn("203.0.113.7", "user-b"));

        first.IsAuthenticated.Should().BeTrue();
        first.Key.Should().Be("u:user-a");
        second.Key.Should().Be("u:user-b");
        first.Key.Should().NotBe(second.Key);
    }

    [Fact]
    public void UserKeysAndIpKeys_CannotCollide()
    {
        var user = RateLimitPartitionKeyResolver.Resolve(SignedIn("203.0.113.7", "203.0.113.7"));
        var ip = RateLimitPartitionKeyResolver.Resolve(Anonymous("203.0.113.7"));

        user.Key.Should().NotBe(ip.Key);
    }

    [Fact]
    public void UnauthenticatedIdentity_FallsBackToIp()
    {
        var context = Anonymous("198.51.100.4");
        // An identity with no authentication type is NOT authenticated — it must not create a bucket.
        context.User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "ghost") }));

        RateLimitPartitionKeyResolver.Resolve(context).Key.Should().Be("ip:198.51.100.4");
    }

    [Fact]
    public void Ipv4MappedToIpv6_SharesOneBucketWithPlainIpv4()
    {
        // Kestrel reports an IPv4 client on a dual-stack socket as ::ffff:127.0.0.1.
        RateLimitPartitionKeyResolver.NormalizeIp(IPAddress.Parse("::ffff:203.0.113.7"))
            .Should().Be("203.0.113.7");
    }

    [Fact]
    public void MissingRemoteAddress_StillProducesAKey()
    {
        // Unix socket / test server: no address. Falling through to null would crash the limiter.
        RateLimitPartitionKeyResolver.Resolve(new DefaultHttpContext()).Key
            .Should().Be(RateLimitPartitionKeyResolver.AnonymousFallbackKey);
    }
}
