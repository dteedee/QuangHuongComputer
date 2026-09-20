using BuildingBlocks.Configuration;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Sales.Application.Pricing;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// W0-4 — phí ship do server quyết định, một nguồn duy nhất.
/// Trước đây công thức bị chép ở guest-checkout, checkout và frontend; checkout còn
/// tin thẳng `shippingFee` client gửi lên (khách set 0đ được).
/// </summary>
public class ShippingFeePolicyTests
{
    private static IConfiguration Config(params (string Key, string Value)[] pairs) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(pairs.Select(p => new KeyValuePair<string, string?>(p.Key, p.Value)))
            .Build();

    [Fact]
    public void DuoiNguong_TinhPhiPhang()
    {
        ShippingFeePolicy.Calculate(499_999m, isPickup: false).Should().Be(30_000m);
    }

    [Fact]
    public void DungNguong_MienPhi()
    {
        ShippingFeePolicy.Calculate(500_000m, isPickup: false).Should().Be(0m);
    }

    [Fact]
    public void NhanTaiCuaHang_LuonMienPhi()
    {
        ShippingFeePolicy.Calculate(10_000m, isPickup: true).Should().Be(0m);
    }

    [Fact]
    public void DocNguongVaPhiTuConfig()
    {
        var config = Config(("Shipping:FreeThreshold", "1000000"), ("Shipping:FlatFee", "45000"));

        ShippingFeePolicy.Calculate(999_999m, isPickup: false, config).Should().Be(45_000m);
        ShippingFeePolicy.Calculate(1_000_000m, isPickup: false, config).Should().Be(0m);
    }

    [Fact]
    public void ConfigRac_RoiVeMacDinh()
    {
        var config = Config(("Shipping:FreeThreshold", "abc"), ("Shipping:FlatFee", "-1"));

        ShippingFeePolicy.Calculate(499_999m, isPickup: false, config).Should().Be(30_000m);
        ShippingFeePolicy.Calculate(500_000m, isPickup: false, config).Should().Be(0m);
    }

    [Fact]
    public void TamTinhAm_KhongLamPhiShipSai()
    {
        ShippingFeePolicy.Calculate(-100m, isPickup: false).Should().Be(30_000m);
    }

    /// <summary>
    /// Bảng cấu hình admin (FREESHIP_THRESHOLD / SHIPPING_COST) chỉ trả đúng những khoá được set;
    /// khoá thiếu rơi về fallback của người gọi — giống hệt <see cref="AppSettings"/> thật.
    /// </summary>
    private sealed class FakeAdminSettings : IAppSettings
    {
        private readonly Dictionary<string, string> _values;

        public FakeAdminSettings(params (string Key, string Value)[] pairs)
            => _values = pairs.ToDictionary(p => p.Key, p => p.Value, StringComparer.OrdinalIgnoreCase);

        public string GetString(string key, string fallback)
            => _values.TryGetValue(key, out var v) ? v : fallback;

        public int GetInt(string key, int fallback)
            => _values.TryGetValue(key, out var v) && int.TryParse(v, out var parsed) ? parsed : fallback;

        public decimal GetDecimal(string key, decimal fallback)
            => _values.TryGetValue(key, out var v) && decimal.TryParse(v, out var parsed) ? parsed : fallback;

        public bool GetBool(string key, bool fallback)
            => _values.TryGetValue(key, out var v) && bool.TryParse(v, out var parsed) ? parsed : fallback;

        public void Invalidate() { }
    }

    /// <summary>
    /// Lỗi thật trước 2026-09-20: khoá admin hiện trong back office VÀ được đẩy xuống storefront
    /// (thanh "mua thêm X để miễn phí giao hàng" đọc chính nó), nhưng server không đọc — admin hạ
    /// ngưỡng xuống 300K thì web quảng cáo freeship còn checkout vẫn thu 30.000đ.
    /// </summary>
    [Fact]
    public void CauHinhAdmin_GhiDe_Appsettings()
    {
        var settings = new FakeAdminSettings(
            ("FREESHIP_THRESHOLD", "300000"),
            ("SHIPPING_COST", "45000"));
        var config = Config(("Shipping:FreeThreshold", "500000"), ("Shipping:FlatFee", "30000"));

        ShippingFeePolicy.Calculate(300_000m, isPickup: false, settings, config).Should().Be(0m);
        ShippingFeePolicy.Calculate(299_999m, isPickup: false, settings, config).Should().Be(45_000m);
    }

    [Fact]
    public void ThieuKhoaAdmin_RoiVeAppsettings_KhongNhayXuongHangSo()
    {
        var settings = new FakeAdminSettings(); // bảng cấu hình rỗng
        var config = Config(("Shipping:FreeThreshold", "1000000"), ("Shipping:FlatFee", "45000"));

        ShippingFeePolicy.Calculate(999_999m, isPickup: false, settings, config).Should().Be(45_000m);
        ShippingFeePolicy.Calculate(1_000_000m, isPickup: false, settings, config).Should().Be(0m);
    }

    [Fact]
    public void NhanTaiCuaHang_LuonMienPhi_DuCauHinhAdminDatNguongCao()
    {
        var settings = new FakeAdminSettings(("FREESHIP_THRESHOLD", "99000000"));

        ShippingFeePolicy.Calculate(10_000m, isPickup: true, settings, config: null).Should().Be(0m);
    }
}
