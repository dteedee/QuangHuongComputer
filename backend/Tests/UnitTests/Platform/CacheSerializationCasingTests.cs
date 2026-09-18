using System.Reflection;
using System.Text;
using System.Text.Json;
using BuildingBlocks.Caching;
using BuildingBlocks.Caching.Redis;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// Reproduces audit finding rt-admin-07 at unit level and proves the fix.
///
/// The Redis cache stored values with <c>JsonSerializer</c> DEFAULT options (PascalCase) while the
/// API serialized responses camelCase. <c>GET /api/content/menus</c> reads its cache entry as
/// <c>List&lt;dynamic&gt;</c> — i.e. <see cref="JsonElement"/> — which re-emits whatever casing was
/// stored. So a cache MISS returned <c>items</c> and a cache HIT returned <c>Items</c>, and
/// MenuManager.tsx:148 <c>[...selectedMenu.items]</c> threw on the second page load.
///
/// The fix is one shared <c>JsonSerializerDefaults.Web</c> options instance in
/// <c>RedisDistributedCache</c> (and <c>CacheService</c>), asserted here.
/// </summary>
public class CacheSerializationCasingTests
{
    private static readonly JsonSerializerOptions CacheOptions = new(JsonSerializerDefaults.Web);

    /// <summary>The shape ContentEndpoints projects menus into before caching.</summary>
    private static object SampleMenu() => new
    {
        Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
        Name = "Header",
        Items = new[] { new { Label = "Trang chủ", Url = "/" } }
    };

    [Fact]
    public void DefaultOptions_ReproduceTheBug()
    {
        // Documents the old behaviour so the regression is recognisable if anyone reverts the options.
        var stored = JsonSerializer.Serialize(SampleMenu());
        // Explicitly typed: Serialize() of a dynamic argument returns dynamic, which defeats extensions.
        string hit = JsonSerializer.Serialize(JsonSerializer.Deserialize<JsonElement>(stored));

        stored.Should().Contain("\"Items\"");
        hit.Should().Contain("\"Items\"", "a dynamic read re-emits the casing that was stored");
    }

    [Fact]
    public void WebOptions_StoreCamelCase()
    {
        var stored = JsonSerializer.Serialize(SampleMenu(), CacheOptions);

        stored.Should().Contain("\"items\"").And.Contain("\"label\"").And.Contain("\"name\"");
        stored.Should().NotContain("\"Items\"").And.NotContain("\"Label\"");
    }

    [Fact]
    public void WebOptions_CacheHitMatchesCacheMiss()
    {
        // MISS: the endpoint projects and the response pipeline serializes camelCase.
        var miss = JsonSerializer.Serialize(new[] { SampleMenu() }, CacheOptions);

        // HIT: the same bytes go into Redis, come back as JsonElement and are written out again.
        var fromCache = JsonSerializer.Deserialize<List<dynamic>>(miss, CacheOptions);
        var hit = JsonSerializer.Serialize(fromCache, CacheOptions);

        hit.Should().Be(miss, "a cached menu must be byte-identical to a freshly projected one");
        hit.Should().Contain("\"items\"");
    }

    [Fact]
    public void WebOptions_StillReadEntriesWrittenBeforeTheFix()
    {
        // Redis keys written by the old code live for up to an hour after deployment. Web defaults are
        // case-insensitive on read, so they must still deserialize instead of throwing or returning null.
        var legacyPascalCase = """{"Name":"Header","DisplayOrder":3}""";

        var restored = JsonSerializer.Deserialize<LegacyMenu>(legacyPascalCase, CacheOptions);

        restored.Should().NotBeNull();
        restored!.Name.Should().Be("Header");
        restored.DisplayOrder.Should().Be(3);
    }

    private sealed class LegacyMenu
    {
        public string? Name { get; set; }
        public int DisplayOrder { get; set; }
    }

    // ---------------------------------------------------------------------------------------
    // The tests above assert what System.Text.Json does with a locally built options object, so
    // they would still pass if someone reverted CacheService/RedisDistributedCache to the default
    // options. The two below pin the PRODUCTION classes that were actually changed.
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task CacheService_WritesCamelCase_AndReadsLegacyPascalCaseBack()
    {
        var backing = new InMemoryDistributedCache();
        var cache = new CacheService(backing);

        await cache.SetAsync("menus:HeaderMain", new LegacyMenu { Name = "Header", DisplayOrder = 3 });

        backing.Stored["menus:HeaderMain"].Should().Contain("\"name\"").And.Contain("\"displayOrder\"");
        backing.Stored["menus:HeaderMain"].Should().NotContain("\"Name\"").And.NotContain("\"DisplayOrder\"");

        // An entry written by the pre-fix code must still deserialize (case-insensitive read).
        backing.Stored["legacy"] = """{"Name":"Header","DisplayOrder":3}""";
        var legacy = await cache.GetAsync<LegacyMenu>("legacy");

        legacy.Should().NotBeNull();
        legacy!.Name.Should().Be("Header");
        legacy.DisplayOrder.Should().Be(3);
    }

    [Theory]
    [InlineData(typeof(CacheService))]
    [InlineData(typeof(RedisDistributedCache))]
    public void CacheImplementations_UseWebSerializerDefaults(Type implementation)
    {
        // RedisDistributedCache is the registered ICacheService (RedisConfiguration.cs) and cannot be
        // constructed without a live IConnectionMultiplexer, so its options instance is pinned here.
        var options = ProductionOptions(implementation);

        options.PropertyNamingPolicy.Should().Be(JsonNamingPolicy.CamelCase, "cache writes must match API responses");
        options.PropertyNameCaseInsensitive.Should().BeTrue("entries written before the fix must still load");
    }

    // =======================================================================================
    // W0 gate residual defect 3. Casing was only HALF of rt-admin-07. The options still differed
    // from the response pipeline on enums and on DateTime, and a dynamic read re-emits the
    // stored bytes, so a cache HIT still did not match a cache MISS:
    //   GET /api/content/menus   miss "location":"HeaderMain"   hit "location":0
    //   GET /api/catalog/products  miss "...T04:42:38.3389518Z"  hit "...T04:42:38.3389518"
    // The cache must therefore use ApiJsonOptions ITSELF, not merely something camelCase.
    // =======================================================================================

    private enum SampleLocation { HeaderMain = 0, FooterLinks = 1 }

    private sealed class TypedMenu
    {
        public SampleLocation Location { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    [Theory]
    [InlineData(typeof(CacheService))]
    [InlineData(typeof(RedisDistributedCache))]
    public void CacheImplementations_MatchTheApiResponsePipelineExactly(Type implementation)
    {
        var cacheOptions = ProductionOptions(implementation);

        var responseOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        BuildingBlocks.Endpoints.ApiJsonOptions.Apply(responseOptions);

        var value = new TypedMenu
        {
            Location = SampleLocation.FooterLinks,
            CreatedAt = new DateTime(2026, 9, 18, 4, 42, 38, DateTimeKind.Unspecified)
        };

        JsonSerializer.Serialize(value, cacheOptions)
            .Should().Be(JsonSerializer.Serialize(value, responseOptions),
                $"{implementation.Name} writes the bytes a dynamic cache read hands straight back to the client");
    }

    [Theory]
    [InlineData(typeof(CacheService))]
    [InlineData(typeof(RedisDistributedCache))]
    public void CacheRoundTrip_OfADynamicShape_IsByteIdenticalToAFreshProjection(Type implementation)
    {
        var options = ProductionOptions(implementation);

        // MISS: endpoint projects, response pipeline serializes.
        var miss = JsonSerializer.Serialize(new[]
        {
            new
            {
                Location = SampleLocation.HeaderMain,
                CreatedAt = new DateTime(2026, 9, 18, 4, 42, 38, DateTimeKind.Unspecified),
                Items = new[] { new { Label = "Trang chủ", Type = SampleLocation.FooterLinks } }
            }
        }, options);

        // HIT: those exact bytes come back out of Redis as List<dynamic> and are re-serialized.
        var hit = JsonSerializer.Serialize(JsonSerializer.Deserialize<List<dynamic>>(miss, options), options);

        hit.Should().Be(miss);
        miss.Should().Contain("\"location\":\"HeaderMain\"", "enums must survive as strings, not ordinals");
        miss.Should().Contain("Z\"", "a cached timestamp must keep its UTC designator");
    }

    private static JsonSerializerOptions ProductionOptions(Type implementation)
    {
        var field = implementation.GetField("SerializerOptions", BindingFlags.NonPublic | BindingFlags.Static);
        field.Should().NotBeNull($"{implementation.Name} must own one shared JsonSerializerOptions");
        return (JsonSerializerOptions)field!.GetValue(null)!;
    }

    /// <summary>Minimal IDistributedCache that keeps the raw stored string, so casing is observable.</summary>
    private sealed class InMemoryDistributedCache : IDistributedCache
    {
        public Dictionary<string, string> Stored { get; } = new();

        public byte[]? Get(string key) => Stored.TryGetValue(key, out var v) ? Encoding.UTF8.GetBytes(v) : null;

        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => Task.FromResult(Get(key));

        public void Set(string key, byte[] value, DistributedCacheEntryOptions options)
            => Stored[key] = Encoding.UTF8.GetString(value);

        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
        {
            Set(key, value, options);
            return Task.CompletedTask;
        }

        public void Refresh(string key) { }

        public Task RefreshAsync(string key, CancellationToken token = default) => Task.CompletedTask;

        public void Remove(string key) => Stored.Remove(key);

        public Task RemoveAsync(string key, CancellationToken token = default)
        {
            Remove(key);
            return Task.CompletedTask;
        }
    }
}
