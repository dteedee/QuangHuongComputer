using System.Net;
using System.Text;
using ApiGateway.Seo;
using Microsoft.Extensions.DependencyInjection;

namespace IntegrationTests.Infrastructure;

/// <summary>
/// Thay nguồn `index.html` của SEO shell trong host test: không phụ thuộc Vite/Caddy đang chạy trên
/// máy (dev trỏ `http://localhost:5174/index.html` — có thể có, có thể không, có thể là bản khác).
/// Template giữ đúng marker thật của `frontend/index.html` để test đi qua đúng đường chèn head/body.
/// </summary>
public static class ShellTemplateStub
{
    public const string Url = "http://shell-template.test/index.html";

    public const string Html =
        "<!doctype html><html lang=\"vi\"><head><meta charset=\"UTF-8\" />"
        + "<!-- seo:head --><title>mặc định</title><!-- /seo:head --></head>"
        + "<body><div id=\"root\"><div class=\"seo-shell\"><!-- seo:body --><!-- giải thích --><!-- /seo:body --></div></div>"
        + "<script type=\"module\" src=\"/assets/index.js\"></script></body></html>";

    public static void Register(IServiceCollection services) =>
        services.AddHttpClient(SeoShellTemplateLoader.HttpClientName)
            .ConfigurePrimaryHttpMessageHandler(() => new Handler());

    private sealed class Handler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(Html, Encoding.UTF8, "text/html"),
            });
    }
}
