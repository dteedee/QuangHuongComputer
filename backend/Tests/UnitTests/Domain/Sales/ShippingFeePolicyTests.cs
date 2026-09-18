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
}
