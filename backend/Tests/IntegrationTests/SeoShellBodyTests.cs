using System.Net;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using Content.Domain;
using Content.Infrastructure;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// SEO shell chạy thật (ApiGateway + Postgres): thân trang vẽ sẵn vào `#root` cho bot, trang CMS
/// catch-all `/{slug}`, và `GET /api/promotions/{id}` chỉ lộ khuyến mãi đang chạy cho khách.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class SeoShellBodyTests
{
    private readonly IntegrationTestFixture _fixture;

    public SeoShellBodyTests(IntegrationTestFixture fixture) => _fixture = fixture;

    private static string Unique() => Guid.NewGuid().ToString("N")[..8];

    [Fact(DisplayName = "SEO shell: /_shell/san-pham/{slug} có H1 và giá trong #root")]
    public async Task TrangSanPham_CoH1VaGia()
    {
        var product = await TestCatalogData.CreateProductWithStockAsync(_fixture, 12_990_000m, 20); // > LowStockThreshold (5)
        string slug, name;
        using (var scope = _fixture.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            var entity = await db.Products.SingleAsync(p => p.Id == product.Id);
            entity.Publish();
            await db.SaveChangesAsync();
            (slug, name) = (entity.Slug, entity.Name);
        }

        using var anonymous = _fixture.CreateClient();
        var response = await anonymous.GetAsync($"/_shell/san-pham/{slug}");
        var html = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK, html);
        var root = html[html.IndexOf("<div id=\"root\">", StringComparison.Ordinal)..];
        root.Should().Contain($"<h1>{name}</h1>");
        root.Should().Contain("<strong>Giá:</strong> 12.990.000 ₫");
        root.Should().Contain("<strong>Tình trạng:</strong> Còn hàng");
        root.Should().Contain("<main class=\"seo-snapshot\">").And.NotContain("<!-- giải thích -->");

        var cached = await anonymous.GetAsync($"/_shell/san-pham/{slug}?utm_source=zalo");
        (await cached.Content.ReadAsStringAsync()).Should().Contain($"<h1>{name}</h1>", "bản cache vẫn giữ thân trang");
    }

    [Fact(DisplayName = "SEO shell: trang CMS catch-all /{slug} — 200 khi xuất bản, 404 khi không, 301 từ /chinh-sach")]
    public async Task TrangCms_CatchAll()
    {
        var n = Unique();
        using (var scope = _fixture.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
            var page = new CMSPage("Hướng dẫn mua hàng", $"huong-dan-{n}", "<h1>Bước 1</h1><p onclick=\"x()\">Chọn <b>sản phẩm</b></p><script>alert(1)</script>");
            page.Publish();
            db.Pages.Add(page);
            db.Pages.Add(new CMSPage("Nháp", $"nhap-{n}", "x"));
            await db.SaveChangesAsync();
        }

        using var anonymous = _fixture.CreateClient();
        var ok = await anonymous.GetAsync($"/_shell/huong-dan-{n}");
        var html = await ok.Content.ReadAsStringAsync();
        ok.StatusCode.Should().Be(HttpStatusCode.OK, html);
        html.Should().Contain("<h1>Hướng dẫn mua hàng</h1>").And.Contain("<h2>Bước 1</h2><p>Chọn <b>sản phẩm</b></p>");
        html.Should().NotContain("alert(1)").And.NotContain("onclick");

        (await anonymous.GetAsync($"/_shell/nhap-{n}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await anonymous.GetAsync($"/_shell/khong-co-{n}")).StatusCode.Should().Be(HttpStatusCode.NotFound);

        var moved = await anonymous.GetAsync($"/_shell/chinh-sach/huong-dan-{n}");
        moved.StatusCode.Should().Be(HttpStatusCode.MovedPermanently);
        moved.Headers.Location!.ToString().Should().EndWith($"/huong-dan-{n}");

        var cart = await anonymous.GetAsync("/_shell/gio-hang");
        cart.StatusCode.Should().Be(HttpStatusCode.OK, "route thật không bị catch-all nuốt");
    }

    [Fact(DisplayName = "Khuyến mãi: khách chỉ đọc được chương trình đang chạy; nhân viên đọc cả bản nháp")]
    public async Task KhuyenMai_KhachChiThayDangChay()
    {
        var n = Unique().ToUpperInvariant();
        Guid draftId, runningId;
        using (var scope = _fixture.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
            Promotion Make(string code) => Promotion.Create(code, code, null, PromotionType.Code,
                DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(7), PromotionDiscountType.Fixed, 10_000m, null);
            var draft = Make($"NHAP{n}");
            var running = Make($"CHAY{n}");
            running.Activate();
            db.Promotions.AddRange(draft, running);
            await db.SaveChangesAsync();
            (draftId, runningId) = (draft.Id, running.Id);
        }

        using var anonymous = _fixture.CreateClient();
        (await anonymous.GetAsync($"/api/promotions/{runningId}")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await anonymous.GetAsync($"/api/promotions/{draftId}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        ((int)(await anonymous.GetAsync($"/api/promotions/admin/{draftId}")).StatusCode).Should().BeOneOf(401, 403);

        var admin = await TestAuthentication.SharedAccountAsync(_fixture, Roles.Admin);
        using var staff = TestAuthentication.ClientFor(_fixture, admin);
        (await staff.GetAsync($"/api/promotions/admin/{draftId}")).StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
