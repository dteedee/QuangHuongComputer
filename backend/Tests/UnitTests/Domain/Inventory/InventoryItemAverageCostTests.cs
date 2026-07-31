using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Giá vốn bình quân gia quyền — công thức:
///   newAvg = (oldQty * oldAvg + addedQty * unitCost) / (oldQty + addedQty)
/// </summary>
public class InventoryItemAverageCostTests
{
    private static InventoryItem NewItem(int qty = 0, decimal avg = 0m)
        => new(Guid.NewGuid(), initialQuantity: qty, averageCost: avg);

    [Fact]
    public void ApplyPurchase_LanDauKhiKho0_AvgBangUnitCost()
    {
        var item = NewItem();
        item.ApplyPurchase(100, 10_050_000m);
        item.QuantityOnHand.Should().Be(100);
        item.AverageCost.Should().Be(10_050_000m);
    }

    [Fact]
    public void ApplyPurchase_LanThuHai_TinhTrungBinhCoTrongSo()
    {
        var item = NewItem(qty: 100, avg: 10_000_000m);
        // Nhập 50 giá 11tr → avg = (100*10 + 50*11) / 150 = 1550/150 = 10.333...
        item.ApplyPurchase(50, 11_000_000m);
        item.QuantityOnHand.Should().Be(150);
        item.AverageCost.Should().BeApproximately(10_333_333.33m, 0.01m);
    }

    [Fact]
    public void ApplyPurchase_UnitCostAm_NemLoi()
    {
        var item = NewItem();
        var act = () => item.ApplyPurchase(10, -1m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ApplyPurchase_QtyAmHayZero_NemLoi()
    {
        var item = NewItem();
        ((Action)(() => item.ApplyPurchase(0, 100))).Should().Throw<ArgumentException>();
        ((Action)(() => item.ApplyPurchase(-1, 100))).Should().Throw<ArgumentException>();
    }

    [Fact]
    public void OverrideAverageCost_SetGiaVonKhongDoiTonKho()
    {
        var item = NewItem(qty: 20, avg: 5_000_000m);
        item.OverrideAverageCost(6_000_000m);
        item.AverageCost.Should().Be(6_000_000m);
        item.QuantityOnHand.Should().Be(20);
    }

    [Fact]
    public void OverrideAverageCost_GiaVonAm_NemLoi()
    {
        var item = NewItem(qty: 10, avg: 1_000_000m);
        var act = () => item.OverrideAverageCost(-1m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void TotalCostValue_BangQty_x_AverageCost()
    {
        var item = NewItem(qty: 25, avg: 4_000_000m);
        item.TotalCostValue.Should().Be(100_000_000m);
    }

    [Fact]
    public void ApplyPurchase_KichBanLanded_100May10tr_Ship5tr_Gia1005tr()
    {
        // Yêu cầu Success Criteria: 100 máy 10tr + 5tr ship → 10.05tr/máy
        var item = NewItem();
        // Nhập vào giá supplier
        item.ApplyPurchase(100, 10_000_000m);
        // Landed cost 5tr chia đều cho 100 máy → unitCostActual = 10.05tr
        // Chạy lại như allocator: OverrideAverageCost với newAvg = 10.05tr
        var newAvg = ((item.QuantityOnHand - 100) * 0m + 100 * (10_000_000m + 5_000_000m / 100)) / item.QuantityOnHand;
        item.OverrideAverageCost(newAvg);
        item.AverageCost.Should().Be(10_050_000m);
    }

    [Fact]
    public void ApplyPurchase_10KichBan_TinhChinhXac()
    {
        // Kịch bản 10 lần nhập với giá khác nhau — kiểm giá vốn cộng dồn đúng.
        var item = NewItem();
        var lots = new[]
        {
            (qty: 10, cost: 1000m),
            (qty: 20, cost: 1100m),
            (qty: 5, cost: 1200m),
            (qty: 15, cost: 900m),
            (qty: 30, cost: 1050m),
            (qty: 25, cost: 1250m),
            (qty: 40, cost: 950m),
            (qty: 12, cost: 1150m),
            (qty: 8, cost: 1300m),
            (qty: 35, cost: 1100m)
        };
        decimal expectedTotalValue = 0m;
        int expectedQty = 0;
        foreach (var (qty, cost) in lots)
        {
            item.ApplyPurchase(qty, cost);
            expectedTotalValue += qty * cost;
            expectedQty += qty;
            var expectedAvg = expectedTotalValue / expectedQty;
            item.AverageCost.Should().BeApproximately(expectedAvg, 0.01m);
            item.QuantityOnHand.Should().Be(expectedQty);
        }
    }

    [Fact]
    public void UpdateAverageCost_LegacyMethod_VanChayCoBackwardCompat()
    {
        var item = NewItem(qty: 10, avg: 100m);
        item.UpdateAverageCost(200m);
        // Legacy: (100*10 + 200*1) / 11 ≈ 109.09
        item.AverageCost.Should().BeApproximately(109.09m, 0.01m);
    }
}
