using FluentAssertions;
using InventoryModule.Infrastructure;
using InventoryModule.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// W4-5 / M7 — số dư đầu kỳ là con số TUYỆT ĐỐI.
///
/// `UpdateAverageCost` trộn thêm 1 đơn vị vào bình quân gia quyền thay vì gán, nên chốt tồn đầu kỳ
/// không bao giờ đặt đúng giá vốn của dữ liệu nguồn, và trôi thêm mỗi lần seed lại.
/// </summary>
public class OpeningBalanceSeederCostTests
{
    private static InventoryDbContext NewDb() =>
        new(new DbContextOptionsBuilder<InventoryDbContext>()
            .UseInMemoryDatabase($"inventory-opening-{Guid.NewGuid()}")
            .Options);

    [Fact]
    public async Task SeedLai_DatDungGiaVonDauKy_KhongTron()
    {
        using var db = NewDb();
        var productId = Guid.NewGuid();

        var first = new List<(Guid, string, int, decimal)> { (productId, "SKU-1", 5, 1_000_000m) };
        await OpeningBalanceSeeder.SeedAsync(db, first);

        var item = await db.InventoryItems.FirstAsync();
        item.QuantityOnHand.Should().Be(5);
        item.AverageCost.Should().Be(1_000_000m);

        // Sửa giá vốn nguồn rồi seed lại: giá vốn phải bằng ĐÚNG số mới.
        var second = new List<(Guid, string, int, decimal)> { (productId, "SKU-1", 5, 1_200_000m) };
        await OpeningBalanceSeeder.SeedAsync(db, second);

        var reloaded = await db.InventoryItems.FirstAsync();
        reloaded.QuantityOnHand.Should().Be(5);
        reloaded.AverageCost.Should().Be(1_200_000m);

        // Và lần seed thứ ba với cùng số liệu không được làm trôi thêm.
        await OpeningBalanceSeeder.SeedAsync(db, second);
        (await db.InventoryItems.FirstAsync()).AverageCost.Should().Be(1_200_000m);
    }
}
