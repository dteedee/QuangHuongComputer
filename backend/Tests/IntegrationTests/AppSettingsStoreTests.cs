using System.Net;
using System.Net.Http.Json;
using BuildingBlocks.Configuration;
using BuildingBlocks.Security;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using SystemConfig.Domain;
using SystemConfig.Infrastructure;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Cấu hình admin phải tới được code nghiệp vụ.
///
/// Lỗi thật: không module nào đăng ký <see cref="IAppSettingsStore"/>, nên IAppSettings luôn trả
/// hằng số mặc định — admin đổi phí ship / % hoa hồng / sức chứa khung giờ mà server không thấy.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class AppSettingsStoreTests
{
    private readonly IntegrationTestFixture _fixture;

    public AppSettingsStoreTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Cấu hình: IAppSettings đọc giá trị từ bảng cấu hình admin")]
    public async Task AppSettings_DocTuBangCauHinh()
    {
        var key = $"Test.Setting.{Guid.NewGuid():N}";
        using (var scope = _fixture.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<SystemConfigDbContext>();
            db.Configurations.Add(new ConfigurationEntry
            {
                Key = key, Value = "42", Category = "Test", ValueType = ConfigValueType.Number,
                LastUpdated = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        var settings = _fixture.Services.GetRequiredService<IAppSettings>();
        settings.Invalidate();

        settings.GetInt(key, 7).Should().Be(42, "giá trị trong bảng cấu hình phải thắng hằng số mặc định");
    }

    [Fact(DisplayName = "Cấu hình: admin sửa qua API thì có hiệu lực ngay, không chờ hết cache")]
    public async Task AdminSuaCauHinh_CoHieuLucNgay()
    {
        var key = $"Test.Live.{Guid.NewGuid():N}";
        var settings = _fixture.Services.GetRequiredService<IAppSettings>();
        var admin = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Admin);
        using var client = TestAuthentication.ClientFor(_fixture, admin);

        var create = await client.PostAsJsonAsync($"/api/config/{key}", new
        {
            key, value = "100", category = "Test", module = "Global", valueType = (int)ConfigValueType.Number, description = "test",
        });
        create.StatusCode.Should().Be(HttpStatusCode.OK, await create.Content.ReadAsStringAsync());

        // Nạp snapshot vào cache trước khi sửa: nếu endpoint quên Invalidate, lần đọc sau sẽ trả 100.
        settings.GetInt(key, 0).Should().Be(100);

        var update = await client.PostAsJsonAsync($"/api/config/{key}", new
        {
            key, value = "250", category = "Test", module = "Global", valueType = (int)ConfigValueType.Number, description = "test",
        });
        update.StatusCode.Should().Be(HttpStatusCode.OK, await update.Content.ReadAsStringAsync());

        settings.GetInt(key, 0).Should().Be(250, "endpoint ghi cấu hình phải xoá snapshot của IAppSettings");
    }
}
