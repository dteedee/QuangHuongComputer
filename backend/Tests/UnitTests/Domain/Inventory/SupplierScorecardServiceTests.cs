using FluentAssertions;
using InventoryModule.Application.Suppliers;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Kiểm SupplierScorecardService:
///  - OnTimeRate: hiện fallback 100% (chờ luồng A bổ sung ExpectedDeliveryDate)
///  - DefectRate: dựa GRNItem.AcceptedQty/RejectedQty
///  - PriceRank: xếp hạng giá trung bình so với NCC khác cùng ProductId
/// </summary>
public class SupplierScorecardServiceTests
{
    private static InventoryDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<InventoryDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new InventoryDbContext(opts);
    }

    private static Supplier NewSupplier(string code = "S001", string name = "NCC A")
        => new(code, name, "Nguyễn Văn A", "a@x.com", "0900000000", "HN");

    private static GoodsReceivedNote NewGrn(
        Guid supplierId, DateTime date, params (Guid productId, int qty, int accepted, int rejected, decimal unitCost)[] items)
    {
        var grn = new GoodsReceivedNote
        {
            DocumentNumber = $"GRN-{Guid.NewGuid().ToString("N").Substring(0, 6)}",
            DocumentDate = date,
            SupplierId = supplierId,
            Status = GRNStatus.Confirmed,
            Items = items.Select(i =>
            {
                var it = new GRNItem
                {
                    ProductId = i.productId,
                    ProductName = "P",
                    Quantity = i.qty,
                    UnitCost = i.unitCost
                };
                it.Inspect(i.accepted, i.rejected, i.rejected > 0 ? "hàng lỗi" : null);
                return it;
            }).ToList()
        };
        return grn;
    }

    [Fact]
    public async Task ComputeAsync_KhongCoGRN_TraDiemMacDinh()
    {
        using var db = NewDb();
        var s = NewSupplier();
        db.Suppliers.Add(s);
        await db.SaveChangesAsync();

        var svc = new SupplierScorecardService(db);
        var sc = await svc.ComputeAsync(s.Id, DateTime.UtcNow.AddMonths(-1), DateTime.UtcNow);

        sc.TotalGRN.Should().Be(0);
        sc.OnTimeRate.Should().Be(0m);
        sc.DefectRate.Should().Be(0m);
    }

    [Fact]
    public async Task ComputeAsync_10Nhap_2Loi_DefectRate20Phan()
    {
        using var db = NewDb();
        var s = NewSupplier();
        db.Suppliers.Add(s);
        var pid = Guid.NewGuid();
        // 10 máy, 8 đạt / 2 lỗi
        db.GoodsReceivedNotes.Add(NewGrn(s.Id, DateTime.UtcNow.AddDays(-3),
            (pid, 10, 8, 2, 5_000_000m)));
        await db.SaveChangesAsync();

        var svc = new SupplierScorecardService(db);
        var sc = await svc.ComputeAsync(s.Id, DateTime.UtcNow.AddMonths(-1), DateTime.UtcNow);
        sc.AcceptedQty.Should().Be(8);
        sc.RejectedQty.Should().Be(2);
        sc.DefectRate.Should().Be(0.2m);
    }

    [Fact]
    public async Task ComputeAsync_PriceRank_NCCReHonNhat_DiemCao()
    {
        using var db = NewDb();
        var sA = NewSupplier("A", "A"); var sB = NewSupplier("B", "B");
        db.Suppliers.AddRange(sA, sB);
        var pid = Guid.NewGuid();
        db.GoodsReceivedNotes.AddRange(
            NewGrn(sA.Id, DateTime.UtcNow.AddDays(-2), (pid, 5, 5, 0, 10_000m)),
            NewGrn(sB.Id, DateTime.UtcNow.AddDays(-1), (pid, 5, 5, 0, 12_000m))
        );
        await db.SaveChangesAsync();

        var svc = new SupplierScorecardService(db);
        var scA = await svc.ComputeAsync(sA.Id, DateTime.UtcNow.AddMonths(-1), DateTime.UtcNow);
        var scB = await svc.ComputeAsync(sB.Id, DateTime.UtcNow.AddMonths(-1), DateTime.UtcNow);

        scA.PriceRank.Should().Be(1);
        scB.PriceRank.Should().Be(2);
        scA.PriceScore.Should().BeGreaterThan(scB.PriceScore);
    }

    [Fact]
    public async Task ComputeAsync_OverallScoreCoTrongSo_KetHopOnTimeQualityPrice()
    {
        // NCC hoàn hảo: 0 lỗi, giá rẻ nhất → 100 (OnTime 100 * 0.4 + Quality 100 * 0.4 + Price 100 * 0.2)
        using var db = NewDb();
        var sA = NewSupplier("A", "A"); var sB = NewSupplier("B", "B");
        db.Suppliers.AddRange(sA, sB);
        var pid = Guid.NewGuid();
        db.GoodsReceivedNotes.AddRange(
            NewGrn(sA.Id, DateTime.UtcNow.AddDays(-2), (pid, 10, 10, 0, 5_000m)),
            NewGrn(sB.Id, DateTime.UtcNow.AddDays(-2), (pid, 10, 10, 0, 6_000m))
        );
        await db.SaveChangesAsync();

        var svc = new SupplierScorecardService(db);
        var scA = await svc.ComputeAsync(sA.Id, DateTime.UtcNow.AddMonths(-1), DateTime.UtcNow);

        scA.OnTimeRate.Should().Be(1m); // fallback 100%
        scA.DefectRate.Should().Be(0m);
        scA.OverallScore.Should().Be(100m);
    }

    [Fact]
    public async Task GetAllAsync_SapXepTheoOverallGiamDan()
    {
        using var db = NewDb();
        var sA = NewSupplier("A", "A");
        var sB = NewSupplier("B", "B");
        db.Suppliers.AddRange(sA, sB);
        var pid = Guid.NewGuid();
        // B chất lượng thấp hơn A
        db.GoodsReceivedNotes.AddRange(
            NewGrn(sA.Id, DateTime.UtcNow.AddDays(-2), (pid, 10, 10, 0, 5_000m)),
            NewGrn(sB.Id, DateTime.UtcNow.AddDays(-2), (pid, 10, 6, 4, 5_000m))
        );
        await db.SaveChangesAsync();

        var svc = new SupplierScorecardService(db);
        var list = await svc.GetAllAsync(DateTime.UtcNow.AddMonths(-1), DateTime.UtcNow);
        list.Should().HaveCount(2);
        list[0].OverallScore.Should().BeGreaterThan(list[1].OverallScore);
    }
}
