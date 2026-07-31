using FluentAssertions;
using InventoryModule.Application.Purchasing;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Landed cost — kiểm tra 3 phương pháp phân bổ và cập nhật weighted average cost đúng.
/// Dùng EF InMemory (không có bảng Products) → allocator fallback ByValue cho ByWeight.
/// </summary>
public class LandedCostAllocatorTests
{
    private static InventoryDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<InventoryDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new InventoryDbContext(opts);
    }

    private static (GoodsReceivedNote grn, InventoryItem item) SeedOneLineGrn(
        InventoryDbContext db, int qty, decimal unitCost, int existingStock = 0, decimal existingAvg = 0m)
    {
        var productId = Guid.NewGuid();
        var invItem = new InventoryItem(productId, existingStock, averageCost: existingAvg);
        // Simulate GRN confirmed: item stock đã tăng theo qty.
        invItem.ApplyPurchase(qty, unitCost);

        var grn = new GoodsReceivedNote
        {
            DocumentNumber = "GRN-TEST",
            Status = GRNStatus.Confirmed,
            Items = new List<GRNItem>
            {
                new GRNItem { ProductId = productId, ProductName = "P1", Quantity = qty, UnitCost = unitCost }
            }
        };
        db.GoodsReceivedNotes.Add(grn);
        db.InventoryItems.Add(invItem);
        db.SaveChanges();
        return (grn, invItem);
    }

    [Fact]
    public async Task ByValue_1Dong_PhanBoToanBoChiPhiVaoDongDo()
    {
        // 100 máy giá 10tr + 5tr ship → avg = 10.05tr/máy
        using var db = NewDb();
        var (grn, _) = SeedOneLineGrn(db, qty: 100, unitCost: 10_000_000m);
        db.LandedCosts.Add(new LandedCost(grn.Id, LandedCostType.Shipping, "Ship", 5_000_000m));
        await db.SaveChangesAsync();

        var allocator = new LandedCostAllocator(db);
        var result = await allocator.AllocateAsync(grn.Id);

        result.TotalCost.Should().Be(5_000_000m);
        result.Lines.Should().HaveCount(1);
        result.Lines[0].LandedCostShare.Should().Be(5_000_000m);
        result.Lines[0].UnitCostActual.Should().Be(10_050_000m);

        var inv = await db.InventoryItems.FirstAsync();
        inv.AverageCost.Should().Be(10_050_000m);
    }

    [Fact]
    public async Task ByValue_2Dong_ChiaTheoTyTrongLineTotal()
    {
        // Dòng A: 10 máy × 10tr = 100tr (66.67%)
        // Dòng B: 5 máy × 10tr = 50tr (33.33%)
        // Ship = 6tr → A nhận 4tr, B nhận 2tr
        using var db = NewDb();
        var productA = Guid.NewGuid();
        var productB = Guid.NewGuid();
        var itemA = new InventoryItem(productA, 0);
        itemA.ApplyPurchase(10, 10_000_000m);
        var itemB = new InventoryItem(productB, 0);
        itemB.ApplyPurchase(5, 10_000_000m);
        var grn = new GoodsReceivedNote
        {
            DocumentNumber = "GRN-X",
            Status = GRNStatus.Confirmed,
            Items = new List<GRNItem>
            {
                new GRNItem { ProductId = productA, ProductName = "A", Quantity = 10, UnitCost = 10_000_000m },
                new GRNItem { ProductId = productB, ProductName = "B", Quantity = 5, UnitCost = 10_000_000m }
            }
        };
        db.GoodsReceivedNotes.Add(grn);
        db.InventoryItems.AddRange(itemA, itemB);
        db.LandedCosts.Add(new LandedCost(grn.Id, LandedCostType.Shipping, "S", 6_000_000m));
        await db.SaveChangesAsync();

        var result = await new LandedCostAllocator(db).AllocateAsync(grn.Id);

        var lineA = result.Lines.First(l => l.ProductId == productA);
        var lineB = result.Lines.First(l => l.ProductId == productB);
        lineA.LandedCostShare.Should().BeApproximately(4_000_000m, 0.01m);
        lineB.LandedCostShare.Should().BeApproximately(2_000_000m, 0.01m);
    }

    [Fact]
    public async Task ByQuantity_ChiaDeuTheoSoLuong()
    {
        // Dòng A qty=3, Dòng B qty=1, ship=8tr → A nhận 6tr, B nhận 2tr
        using var db = NewDb();
        var pA = Guid.NewGuid();
        var pB = Guid.NewGuid();
        var iA = new InventoryItem(pA, 0); iA.ApplyPurchase(3, 5_000_000m);
        var iB = new InventoryItem(pB, 0); iB.ApplyPurchase(1, 5_000_000m);
        var grn = new GoodsReceivedNote
        {
            DocumentNumber = "GRN-Q",
            Status = GRNStatus.Confirmed,
            Items = new List<GRNItem>
            {
                new GRNItem { ProductId = pA, ProductName = "A", Quantity = 3, UnitCost = 5_000_000m },
                new GRNItem { ProductId = pB, ProductName = "B", Quantity = 1, UnitCost = 5_000_000m }
            }
        };
        db.GoodsReceivedNotes.Add(grn);
        db.InventoryItems.AddRange(iA, iB);
        db.LandedCosts.Add(new LandedCost(grn.Id, LandedCostType.CustomsFee, "Fee",
            8_000_000m, LandedCostAllocationMethod.ByQuantity));
        await db.SaveChangesAsync();

        var result = await new LandedCostAllocator(db).AllocateAsync(grn.Id);
        result.Lines.First(l => l.ProductId == pA).LandedCostShare.Should().Be(6_000_000m);
        result.Lines.First(l => l.ProductId == pB).LandedCostShare.Should().Be(2_000_000m);
    }

    [Fact]
    public async Task ByWeight_KhongCoWeightTable_FallbackByValue()
    {
        using var db = NewDb();
        var (grn, _) = SeedOneLineGrn(db, qty: 100, unitCost: 10_000_000m);
        db.LandedCosts.Add(new LandedCost(grn.Id, LandedCostType.Shipping, "Ship",
            5_000_000m, LandedCostAllocationMethod.ByWeight));
        await db.SaveChangesAsync();

        var result = await new LandedCostAllocator(db).AllocateAsync(grn.Id);
        result.Lines[0].LandedCostShare.Should().Be(5_000_000m);
    }

    [Fact]
    public async Task AllocateAsync_ZeroCost_KhongThayDoiAverageCost()
    {
        using var db = NewDb();
        var (grn, item) = SeedOneLineGrn(db, qty: 50, unitCost: 8_000_000m);
        // Không có landed cost → allocator không thay đổi gì.
        var result = await new LandedCostAllocator(db).AllocateAsync(grn.Id);
        result.TotalCost.Should().Be(0m);
        item.AverageCost.Should().Be(8_000_000m);
    }

    [Fact]
    public async Task AllocateAsync_Idempotent_KhongCongTrungKhiGoiLan2()
    {
        using var db = NewDb();
        var (grn, item) = SeedOneLineGrn(db, qty: 100, unitCost: 10_000_000m);
        db.LandedCosts.Add(new LandedCost(grn.Id, LandedCostType.Shipping, "Ship", 5_000_000m));
        await db.SaveChangesAsync();

        var allocator = new LandedCostAllocator(db);
        await allocator.AllocateAsync(grn.Id);
        var firstAvg = item.AverageCost;

        // Gọi lại — landed cost đã IsAllocated → bỏ qua, avg không đổi.
        var second = await allocator.AllocateAsync(grn.Id);
        second.TotalCost.Should().Be(0m);
        item.AverageCost.Should().Be(firstAvg);
    }

    [Fact]
    public async Task AllocateAsync_GhiStockMovementAdjustment()
    {
        using var db = NewDb();
        var (grn, item) = SeedOneLineGrn(db, qty: 20, unitCost: 3_000_000m);
        db.LandedCosts.Add(new LandedCost(grn.Id, LandedCostType.ImportTax, "Tax", 1_000_000m));
        await db.SaveChangesAsync();

        await new LandedCostAllocator(db).AllocateAsync(grn.Id);

        var movements = await db.StockMovements.Where(m => m.ProductId == item.ProductId).ToListAsync();
        movements.Should().Contain(m => m.Type == MovementType.Adjustment && m.ReferenceType == "GRN_LANDED_COST");
    }

    [Fact]
    public async Task AllocateAsync_MultipleCostsBothMethods_TongTienDung()
    {
        // 100 máy × 10tr, ship 5tr (ByValue) + tax 2tr (ByQuantity) → tổng landed = 7tr
        using var db = NewDb();
        var (grn, item) = SeedOneLineGrn(db, qty: 100, unitCost: 10_000_000m);
        db.LandedCosts.AddRange(
            new LandedCost(grn.Id, LandedCostType.Shipping, "Ship", 5_000_000m),
            new LandedCost(grn.Id, LandedCostType.ImportTax, "Tax", 2_000_000m, LandedCostAllocationMethod.ByQuantity));
        await db.SaveChangesAsync();

        var result = await new LandedCostAllocator(db).AllocateAsync(grn.Id);
        result.TotalCost.Should().Be(7_000_000m);
        item.AverageCost.Should().Be(10_070_000m);
    }
}
