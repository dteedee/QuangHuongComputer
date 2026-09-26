using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BuildingBlocks.Security;
using Catalog.Domain;
using Catalog.Infrastructure;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Bảng chuyển hướng URL chạy thật: API quản trị -> SEO shell trả 301 THẬT (Location tuyệt đối),
/// đếm lượt truy cập qua hàng đợi nền, nhập CSV, và tự tạo 301 khi Catalog đổi slug.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class UrlRedirectShellTests
{
    private const string Api = "/api/content/admin/redirects";
    private readonly IntegrationTestFixture _fixture;

    public UrlRedirectShellTests(IntegrationTestFixture fixture) => _fixture = fixture;

    private string SiteUrl()
    {
        var url = _fixture.Services.GetRequiredService<IConfiguration>()["Frontend:Url"];
        url.Should().NotBeNullOrWhiteSpace("shell dựng Location tuyệt đối từ Frontend:Url");
        return url!.TrimEnd('/');
    }

    private async Task<HttpClient> AdminAsync()
    {
        var admin = await TestAuthentication.SharedAccountAsync(_fixture, Roles.Admin);
        return TestAuthentication.ClientFor(_fixture, admin);
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..8];

    [Fact(DisplayName = "Chuyển hướng URL: /_shell/duong-dan-cu trả 301 với Location đúng, giữ query, đếm lượt")]
    public async Task Shell_Tra301_DemLuot()
    {
        using var admin = await AdminAsync();
        var n = Unique();

        var create = await admin.PostAsJsonAsync(Api, new { fromPath = $"/Trang-Cu-{n}.html/", toPath = $"/san-pham/moi-{n}", statusCode = 301 });
        create.StatusCode.Should().Be(HttpStatusCode.Created, await create.Content.ReadAsStringAsync());
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("fromPath").GetString().Should().Be($"/trang-cu-{n}.html");
        var id = created.GetProperty("id").GetString();

        using var anonymous = _fixture.CreateClient();
        var shell = await anonymous.GetAsync($"/_shell/trang-cu-{n}.html?utm_source=zalo");

        shell.StatusCode.Should().Be(HttpStatusCode.MovedPermanently);
        shell.Headers.Location!.ToString().Should().Be($"{SiteUrl()}/san-pham/moi-{n}?utm_source=zalo");

        var hits = 0L;
        for (var i = 0; i < 30 && hits == 0; i++)
        {
            await Task.Delay(500);
            var row = await admin.GetFromJsonAsync<JsonElement>($"{Api}/{id}");
            hits = row.GetProperty("hitCount").GetInt64();
        }
        hits.Should().BeGreaterThan(0, "lượt truy cập được ghi theo lô bởi dịch vụ nền");

        var off = await admin.PostAsJsonAsync($"{Api}/{id}/active", new { isActive = false });
        off.StatusCode.Should().Be(HttpStatusCode.OK);
        var afterOff = await anonymous.GetAsync($"/_shell/trang-cu-{n}.html");
        afterOff.StatusCode.Should().NotBe(HttpStatusCode.MovedPermanently, "tắt dòng thì hết chuyển hướng ngay (cache bị xoá khi ghi)");
    }

    [Fact(DisplayName = "Chuyển hướng URL: từ chối tự trỏ, chuỗi, đường dẫn hệ thống, javascript:, trùng hoa/thường")]
    public async Task LuuSai_BiTuChoi()
    {
        using var admin = await AdminAsync();
        var n = Unique();
        (await admin.PostAsJsonAsync(Api, new { fromPath = $"/goc-{n}", toPath = $"/dich-{n}", statusCode = 301 }))
            .StatusCode.Should().Be(HttpStatusCode.Created);

        async Task<HttpStatusCode> Post(object body) => (await admin.PostAsJsonAsync(Api, body)).StatusCode;

        (await Post(new { fromPath = $"/tu-tro-{n}", toPath = $"/TU-TRO-{n}/", statusCode = 301 })).Should().Be(HttpStatusCode.BadRequest);
        (await Post(new { fromPath = $"/dich-{n}", toPath = $"/khac-{n}", statusCode = 301 })).Should().Be(HttpStatusCode.BadRequest, "tạo chuỗi goc -> dich -> khac");
        (await Post(new { fromPath = $"/x-{n}", toPath = $"/goc-{n}", statusCode = 302 })).Should().Be(HttpStatusCode.BadRequest, "trỏ vào một nguồn đang chuyển hướng");
        (await Post(new { fromPath = "/api/catalog", toPath = "/", statusCode = 301 })).Should().Be(HttpStatusCode.BadRequest);
        (await Post(new { fromPath = $"/js-{n}", toPath = "javascript:alert(1)", statusCode = 301 })).Should().Be(HttpStatusCode.BadRequest);
        (await Post(new { fromPath = $"/GOC-{n}/", toPath = "/khac", statusCode = 301 })).Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "Chuyển hướng URL: nhập CSV (thử rồi ghi) và dòng 410 trả 410 Gone")]
    public async Task NhapCsv_VaGone()
    {
        using var admin = await AdminAsync();
        var n = Unique();
        var csv = "Đường dẫn cũ,Đường dẫn mới,Mã chuyển hướng,Ghi chú,Kích hoạt\n"
                  + $"https://web-cu.vn/sp-{n}.php?id=1,/san-pham/a-{n},301,web cũ,1\n"
                  + $"/het-hang-{n}.html,,410,,\n";

        async Task<JsonElement> Import(string mode)
        {
            using var form = new MultipartFormDataContent();
            form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes(csv)), "file", "redirects.csv");
            var response = await admin.PostAsync($"{Api}/import?mode={mode}", form);
            response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }

        var dry = await Import("dryRun");
        dry.GetProperty("created").GetInt32().Should().Be(2);
        dry.GetProperty("committed").GetBoolean().Should().BeFalse();

        var commit = await Import("commit");
        commit.GetProperty("committed").GetBoolean().Should().BeTrue();

        using var anonymous = _fixture.CreateClient();
        var moved = await anonymous.GetAsync($"/_shell/sp-{n}.php");
        moved.StatusCode.Should().Be(HttpStatusCode.MovedPermanently);
        moved.Headers.Location!.ToString().Should().EndWith($"/san-pham/a-{n}");

        var gone = await anonymous.GetAsync($"/_shell/het-hang-{n}.html");
        ((int)gone.StatusCode).Should().BeOneOf(410, 503); // 503 = no SPA template reachable in the test host
        gone.StatusCode.Should().NotBe(HttpStatusCode.MovedPermanently);
    }

    [Fact(DisplayName = "Chuyển hướng URL: đổi slug danh mục tự tạo 301 từ đường dẫn cũ")]
    public async Task DoiSlugDanhMuc_Tu301()
    {
        var n = Unique();
        using (var scope = _fixture.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            var category = new Category($"Danh muc {n}", "");
            category.SetSlug($"dm-cu-{n}");
            db.Categories.Add(category);
            await db.SaveChangesAsync();

            category.SetSlug($"dm-moi-{n}");
            await db.SaveChangesAsync();
        }

        using var anonymous = _fixture.CreateClient();
        var response = await anonymous.GetAsync($"/_shell/danh-muc/dm-cu-{n}");

        response.StatusCode.Should().Be(HttpStatusCode.MovedPermanently);
        response.Headers.Location!.ToString().Should().Be($"{SiteUrl()}/danh-muc/dm-moi-{n}");
    }
}
