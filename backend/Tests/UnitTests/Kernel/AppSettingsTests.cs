using System.Globalization;
using BuildingBlocks.Configuration;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// Typed reads over the admin-editable settings table. The culture assertions are the point: this
/// server runs with a Vietnamese culture in places, where <c>","</c> is the DECIMAL separator, so a
/// culture-sensitive parse turns a VAT rate of <c>"0.1"</c> into <c>1</c> on one host and <c>0.1</c>
/// on another. For money that is a silent 10x, not a formatting nit.
/// </summary>
public class AppSettingsTests
{
    private sealed class FakeStore : IAppSettingsStore
    {
        private readonly Dictionary<string, string?> _values;
        public int LoadCount { get; private set; }

        public FakeStore(Dictionary<string, string?> values) => _values = values;

        public Task<IReadOnlyDictionary<string, string?>> LoadAllAsync(CancellationToken cancellationToken = default)
        {
            LoadCount++;
            return Task.FromResult<IReadOnlyDictionary<string, string?>>(
                new Dictionary<string, string?>(_values, StringComparer.OrdinalIgnoreCase));
        }
    }

    private sealed class ThrowingStore : IAppSettingsStore
    {
        public Task<IReadOnlyDictionary<string, string?>> LoadAllAsync(CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("database is down");
    }

    /// <summary>
    /// The store is resolved from a scope, so the test hands the real container one - that is also
    /// what proves a SCOPED store (which a DbContext-backed one must be) is usable from the
    /// singleton <see cref="AppSettings"/> without a captive-dependency failure.
    /// </summary>
    private static AppSettings Create(IAppSettingsStore store, ServiceLifetime lifetime = ServiceLifetime.Scoped)
    {
        IServiceCollection services = new ServiceCollection();
        services.Add(new ServiceDescriptor(typeof(IAppSettingsStore), _ => store, lifetime));
        var provider = services.BuildServiceProvider(validateScopes: true);

        return new AppSettings(provider.GetRequiredService<IServiceScopeFactory>(),
            new MemoryCache(new MemoryCacheOptions()), NullLogger<AppSettings>.Instance);
    }

    private static (AppSettings Settings, FakeStore Store) Build(Dictionary<string, string?> values)
    {
        var store = new FakeStore(values);
        return (Create(store), store);
    }

    [Fact]
    public void DocDuocGiaTriTheoKieu()
    {
        var (settings, _) = Build(new Dictionary<string, string?>
        {
            ["Shipping:FreeThreshold"] = "500000",
            ["Tax:VatRate"] = "0.08",
            ["Repair:OnSiteFee"] = "150000.50",
            ["Feature:PosEnabled"] = "true",
            ["Company:Name"] = "Quang Hương Computer"
        });

        settings.GetInt("Shipping:FreeThreshold", 0).Should().Be(500_000);
        settings.GetDecimal("Tax:VatRate", 0m).Should().Be(0.08m);
        settings.GetDecimal("Repair:OnSiteFee", 0m).Should().Be(150_000.50m);
        settings.GetBool("Feature:PosEnabled", false).Should().BeTrue();
        settings.GetString("Company:Name", "?").Should().Be("Quang Hương Computer");
    }

    /// <summary>Phân tích số LUÔN theo InvariantCulture, bất kể CurrentCulture của luồng.</summary>
    [Fact]
    public void PhanTichSo_KhongPhuThuocCultureCuaLuong()
    {
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("vi-VN");
            var (settings, _) = Build(new Dictionary<string, string?> { ["Tax:VatRate"] = "0.1" });

            settings.GetDecimal("Tax:VatRate", 0m).Should().Be(0.1m);
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Theory]
    [InlineData("1", true)]
    [InlineData("0", false)]
    [InlineData("YES", true)]
    [InlineData("off", false)]
    public void Bool_ChapNhanCacDangThuongGap(string raw, bool expected)
    {
        var (settings, _) = Build(new Dictionary<string, string?> { ["k"] = raw });

        settings.GetBool("k", !expected).Should().Be(expected);
    }

    [Fact]
    public void ThieuKhoaHoacGiaTriRong_ThiDungMacDinhCuaNguoiGoi()
    {
        var (settings, _) = Build(new Dictionary<string, string?> { ["blank"] = "   " });

        settings.GetInt("khong-ton-tai", 7).Should().Be(7);
        settings.GetString("blank", "mặc định").Should().Be("mặc định");
        settings.GetDecimal("blank", 1.5m).Should().Be(1.5m);
    }

    [Fact]
    public void GiaTriKhongPhanTichDuoc_ThiDungMacDinh_KhongNemLoi()
    {
        var (settings, _) = Build(new Dictionary<string, string?> { ["Shipping:FreeThreshold"] = "năm trăm nghìn" });

        settings.GetInt("Shipping:FreeThreshold", 300_000).Should().Be(300_000);
    }

    /// <summary>Kho dữ liệu hỏng không được làm sập request đang đọc cấu hình.</summary>
    [Fact]
    public void KhoDuLieuLoi_ThiXuongMacDinh()
    {
        var settings = Create(new ThrowingStore());

        settings.GetInt("bat-ky", 42).Should().Be(42);
    }

    [Fact]
    public void CacheMotAnhChup_VaInvalidateLamMoiNgay()
    {
        var (settings, store) = Build(new Dictionary<string, string?> { ["a"] = "1", ["b"] = "2" });

        settings.GetInt("a", 0);
        settings.GetInt("b", 0);
        store.LoadCount.Should().Be(1, "cả bảng được nạp một lần, không phải mỗi khoá một lần");

        settings.Invalidate();
        settings.GetInt("a", 0);
        store.LoadCount.Should().Be(2);
    }

    [Fact]
    public void KhoRong_LaHanhViXuongCapDuocGhiNhan()
    {
        var settings = Create(new EmptyAppSettingsStore(), ServiceLifetime.Singleton);

        settings.GetString("Company:Name", "Quang Hương").Should().Be("Quang Hương");
    }

    /// <summary>
    /// Dấu phẩy KHÔNG được hiểu là dấu phân nhóm hàng nghìn.
    ///
    /// Người quản trị gõ thuế suất theo kiểu Việt Nam ("0,1") là chuyện bình thường. Với
    /// <c>NumberStyles.Number</c> + InvariantCulture, ",", bị coi là dấu phân nhóm nên "0,1" ra 1 -
    /// tức 100% thay vì 10%, âm thầm, không cảnh báo. Giá trị nhập nhằng phải RƠI VỀ mặc định của
    /// người gọi (và ghi log), không bao giờ được tự diễn giải thành một con số khác.
    /// </summary>
    [Theory]
    [InlineData("0,1")]
    [InlineData("500,000")]
    [InlineData("1.234,56")]
    public void DauPhay_LaNhapNhang_ThiDungMacDinh_KhongDoanBua(string raw)
    {
        var (settings, _) = Build(new Dictionary<string, string?> { ["Tax:VatRate"] = raw });

        settings.GetDecimal("Tax:VatRate", 0.08m).Should().Be(0.08m);
    }
}
