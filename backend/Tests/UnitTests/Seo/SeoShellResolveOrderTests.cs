#if QH_APIGATEWAY
using ApiGateway.Seo;
using BuildingBlocks.Seo;
using Content.Seo;
using FluentAssertions;
using Xunit;
using static UnitTests.Seo.SeoContentTestData;

namespace UnitTests.Seo;

/// <summary>
/// Phần của SEO shell nằm trong ApiGateway: thứ tự hỏi provider (cụ thể -> template-only -> catch-all)
/// và chèn thân trang giữa hai marker. Chỉ biên dịch khi bật `-p:IncludeApiGatewayTests=true`
/// (UnitTests.csproj); đường đi thật end-to-end nằm ở IntegrationTests/SeoShellBodyTests.cs.
/// </summary>
public class SeoShellResolveOrderTests
{
    /// <summary>Provider catch-all giả nhận MỌI đường dẫn — để chứng minh thứ tự của shell, không phụ thuộc danh sách slug cấm.</summary>
    private sealed class CatchEverything : ISeoPageProvider
    {
        public bool IsFallback => true;
        public bool TryMatch(string path) => true;
        public Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct) =>
            Task.FromResult<SeoPage?>(new SeoPage { Status = 200, Title = "fallback", CanonicalPath = path });
        public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
        {
            await Task.CompletedTask;
            yield break;
        }
    }

    [Fact]
    public async Task Shell_CatchAllChayCuoi_KhongCheTemplateOnlyHayProviderCuThe()
    {
        var db = NewDb();
        // Catch-all đứng ĐẦU danh sách đăng ký — thứ tự vẫn phải do IsFallback quyết định.
        var providers = new ISeoPageProvider[] { new CatchEverything(), new ContentPageSeoProvider(db) };

        var login = await SeoShellEndpoints.ResolvePageAsync(providers, "/login", "", CancellationToken.None);
        login.Robots.Should().Be("noindex,nofollow", "template-only thắng catch-all");
        login.Title.Should().NotBe("fallback");

        var about = await SeoShellEndpoints.ResolvePageAsync(providers, "/gioi-thieu", "", CancellationToken.None);
        about.Status.Should().Be(404, "provider cụ thể nhận đường dẫn trước (chưa có trang gioi-thieu)");

        var other = await SeoShellEndpoints.ResolvePageAsync(providers, "/huong-dan-mua-hang", "", CancellationToken.None);
        other.Title.Should().Be("fallback");
    }

    [Fact]
    public void ChenGiuaHaiMarker_ThayChuThich()
    {
        const string template = "<div id=\"root\"><!-- seo:body --><!-- ghi chú --><!-- /seo:body --></div>";

        SeoShellMarkerReplacer.InjectBody(template, "<main>x</main>")
            .Should().Be("<div id=\"root\"><!-- seo:body --><main>x</main><!-- /seo:body --></div>");
        SeoShellMarkerReplacer.InjectBody("<div id=\"root\"><!-- seo:body --></div>", "<main>x</main>")
            .Should().Be("<div id=\"root\"><!-- seo:body --><main>x</main></div>");
        SeoShellMarkerReplacer.InjectBody("<div id=\"root\"></div>", "<main>x</main>")
            .Should().Be("<div id=\"root\"></div>");
    }
}
#endif
