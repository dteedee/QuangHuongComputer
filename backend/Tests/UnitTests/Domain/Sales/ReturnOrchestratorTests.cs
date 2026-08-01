using Catalog.Domain;
using Catalog.Infrastructure;
using FluentAssertions;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Returns;
using Sales.Domain;
using Sales.Infrastructure;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Phase 07: ReturnOrchestrator + RestockService.
/// Kiểm tra:
///  - Chặn hoàn tiền khi ngoài hạn
///  - Refund: chặn Complete trước khi inspect (chống gian lận)
///  - Exchange: sinh Order mới, tính PriceDifference
///  - Replace: không phát sinh tiền
///  - RestockService: mỗi ReceivedCondition nhập kho đúng loại
/// </summary>
public class ReturnOrchestratorTests : IDisposable
{
    private readonly SalesDbContext _sales;
    private readonly CatalogDbContext _catalog;
    private readonly InventoryDbContext _inventory;

    public ReturnOrchestratorTests()
    {
        var uid = Guid.NewGuid().ToString();
        _sales = new SalesDbContext(new DbContextOptionsBuilder<SalesDbContext>()
            .UseInMemoryDatabase("sales-" + uid).Options);
        _catalog = new CatalogDbContext(new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase("cat-" + uid).Options);
        _inventory = new InventoryDbContext(new DbContextOptionsBuilder<InventoryDbContext>()
            .UseInMemoryDatabase("inv-" + uid).Options);
    }

    public void Dispose() { _sales.Dispose(); _catalog.Dispose(); _inventory.Dispose(); }

    private RestockService NewRestock() => new(_sales, _inventory);
    private ReturnOrchestrator NewOrch() => new(_sales, _catalog, NewRestock());

    private async Task<(Order order, OrderItem item, Product product, Warehouse mainWh)> SeedSoldAsync(
        Guid customerId, decimal price = 10_000_000m, Guid? categoryId = null)
    {
        var product = new Product("Laptop A", price, costPrice: 8_000_000m, description: "d",
            categoryId: categoryId ?? Guid.NewGuid(), brandId: Guid.NewGuid(), stockQuantity: 10);
        _catalog.Products.Add(product);
        await _catalog.SaveChangesAsync();

        var item = new OrderItem(product.Id, product.Name, product.Price, 1, product.Sku);
        var order = new Order(customerId, "HN", new List<OrderItem> { item });
        _sales.Orders.Add(order);

        // Default policy
        _sales.ReturnPolicies.Add(new ReturnPolicy("default",
            daysForReturn: 7, daysForExchange: 15, daysForDefectReplace: 7));

        var mainWh = new Warehouse("MAIN", "Kho chính", WarehouseType.Main);
        _inventory.Warehouses.Add(mainWh);
        await _sales.SaveChangesAsync();
        await _inventory.SaveChangesAsync();
        return (order, item, product, mainWh);
    }

    [Fact]
    public async Task RequestAsync_Refund_TaoRequestPending()
    {
        var customerId = Guid.NewGuid();
        var (order, item, _, _) = await SeedSoldAsync(customerId);

        var orch = NewOrch();
        var rr = await orch.RequestAsync(new CreateReturnRequestInput(
            order.Id, item.Id, ReturnType.Refund, "Không thích"), customerId);

        rr.Status.Should().Be(ReturnStatus.Pending);
        rr.RefundAmount.Should().Be(10_000_000m);
    }

    [Fact]
    public async Task RequestAsync_OrderKhongThuocKhach_Throw()
    {
        var owner = Guid.NewGuid();
        var stranger = Guid.NewGuid();
        var (order, item, _, _) = await SeedSoldAsync(owner);
        var orch = NewOrch();
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await orch.RequestAsync(new CreateReturnRequestInput(order.Id, item.Id, ReturnType.Refund, "x"), stranger));
    }

    [Fact]
    public async Task RequestAsync_NgoaiHan_Throw()
    {
        var customerId = Guid.NewGuid();
        var (order, item, _, _) = await SeedSoldAsync(customerId);
        // Rewind OrderDate 30 ngày trước
        typeof(Order).GetProperty(nameof(Order.OrderDate))!.SetValue(order, DateTime.UtcNow.AddDays(-30));
        await _sales.SaveChangesAsync();

        var orch = NewOrch();
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await orch.RequestAsync(new CreateReturnRequestInput(order.Id, item.Id, ReturnType.Refund, "x"), customerId));
    }

    [Fact]
    public async Task ProcessAfterInspection_ChanKhiChuaKiemHang()
    {
        var customerId = Guid.NewGuid();
        var (order, item, _, _) = await SeedSoldAsync(customerId);
        var orch = NewOrch();
        var rr = await orch.RequestAsync(new CreateReturnRequestInput(order.Id, item.Id, ReturnType.Refund, "x"), customerId);
        rr.Approve("emp");
        await _sales.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await orch.ProcessAfterInspectionAsync(rr.Id, "emp"));
    }

    [Fact]
    public async Task Refund_TinhTrangIntact_NhapKhoMain_HoanTienDayDu()
    {
        var customerId = Guid.NewGuid();
        var (order, item, _, mainWh) = await SeedSoldAsync(customerId);
        var orch = NewOrch();
        var rr = await orch.RequestAsync(new CreateReturnRequestInput(order.Id, item.Id, ReturnType.Refund, "x"), customerId);
        rr.Approve("emp");
        rr.RecordInspection(ReceivedCondition.Intact, mainWh.Id, Guid.NewGuid());
        await _sales.SaveChangesAsync();

        var res = await orch.ProcessAfterInspectionAsync(rr.Id, "emp");
        res.Type.Should().Be(ReturnType.Refund);
        res.RefundAmount.Should().Be(10_000_000m);
        // Kho Main tăng 1
        var inv = await _inventory.InventoryItems.FirstAsync(i => i.ProductId == item.ProductId && i.WarehouseId == mainWh.Id);
        inv.QuantityOnHand.Should().Be(1);
        // StockMovement ghi nhận
        (await _inventory.StockMovements.CountAsync(m => m.ReferenceId == rr.Id.ToString())).Should().Be(1);
    }

    [Fact]
    public async Task Refund_MissingAccessories_HoanTien80Percent()
    {
        var customerId = Guid.NewGuid();
        var (order, item, _, _) = await SeedSoldAsync(customerId);
        var returnsWh = new Warehouse("RET", "Kho trả", WarehouseType.Returns);
        _inventory.Warehouses.Add(returnsWh);
        await _inventory.SaveChangesAsync();

        var orch = NewOrch();
        var rr = await orch.RequestAsync(new CreateReturnRequestInput(order.Id, item.Id, ReturnType.Refund, "x"), customerId);
        rr.Approve("emp");
        rr.RecordInspection(ReceivedCondition.MissingAccessories, returnsWh.Id, Guid.NewGuid());
        await _sales.SaveChangesAsync();

        var res = await orch.ProcessAfterInspectionAsync(rr.Id, "emp");
        res.RefundAmount.Should().Be(8_000_000m); // 80% của 10M
    }

    [Fact]
    public async Task Refund_UserDamage_HoanTien0()
    {
        var customerId = Guid.NewGuid();
        var (order, item, _, _) = await SeedSoldAsync(customerId);
        var defWh = new Warehouse("DEF", "Kho lỗi", WarehouseType.Defective);
        _inventory.Warehouses.Add(defWh);
        await _inventory.SaveChangesAsync();

        var orch = NewOrch();
        var rr = await orch.RequestAsync(new CreateReturnRequestInput(order.Id, item.Id, ReturnType.Refund, "x"), customerId);
        rr.Approve("emp");
        rr.RecordInspection(ReceivedCondition.UserDamage, defWh.Id, Guid.NewGuid());
        await _sales.SaveChangesAsync();

        var res = await orch.ProcessAfterInspectionAsync(rr.Id, "emp");
        res.RefundAmount.Should().Be(0m);
    }

    [Fact]
    public async Task Exchange_SinhOrderMoi_TinhPriceDifference()
    {
        var customerId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var (order, item, _, mainWh) = await SeedSoldAsync(customerId, price: 20_000_000m, categoryId: categoryId);

        // Product mới 25M
        var newProduct = new Product("Laptop B", 25_000_000m, 20_000_000m, "d",
            categoryId, Guid.NewGuid(), 5);
        _catalog.Products.Add(newProduct);
        await _catalog.SaveChangesAsync();

        var orch = NewOrch();
        var rr = await orch.RequestAsync(new CreateReturnRequestInput(
            order.Id, item.Id, ReturnType.Exchange, "Đổi lên đời",
            ExchangeProductId: newProduct.Id), customerId);
        rr.Approve("emp");
        rr.RecordInspection(ReceivedCondition.Intact, mainWh.Id, Guid.NewGuid());
        await _sales.SaveChangesAsync();

        var res = await orch.ProcessAfterInspectionAsync(rr.Id, "emp");
        res.Type.Should().Be(ReturnType.Exchange);
        res.ExchangeOrderId.Should().NotBeNull();
        // Đơn mới 25M + tax 10% = 27.5M − 20M gốc = 7.5M khách bù
        res.PriceDifference.Should().Be(27_500_000m - 20_000_000m);
    }

    [Fact]
    public async Task Replace_KhongPhatSinhTien()
    {
        var customerId = Guid.NewGuid();
        var (order, item, _, _) = await SeedSoldAsync(customerId, price: 15_000_000m);
        var defWh = new Warehouse("DEF", "Kho lỗi", WarehouseType.Defective);
        _inventory.Warehouses.Add(defWh);
        await _inventory.SaveChangesAsync();

        var orch = NewOrch();
        var rr = await orch.RequestAsync(new CreateReturnRequestInput(order.Id, item.Id, ReturnType.Replace, "Máy lỗi"), customerId);
        rr.Approve("emp");
        rr.RecordInspection(ReceivedCondition.DefectiveTechnical, defWh.Id, Guid.NewGuid());
        await _sales.SaveChangesAsync();

        var res = await orch.ProcessAfterInspectionAsync(rr.Id, "emp");
        res.Type.Should().Be(ReturnType.Replace);
        res.RefundAmount.Should().Be(0m);
        res.ExchangeOrderId.Should().BeNull();
    }

    [Fact]
    public async Task Restock_ChonKhoSaiLoai_Throw()
    {
        var customerId = Guid.NewGuid();
        var (order, item, _, mainWh) = await SeedSoldAsync(customerId);
        var orch = NewOrch();
        var rr = await orch.RequestAsync(new CreateReturnRequestInput(order.Id, item.Id, ReturnType.Refund, "x"), customerId);
        rr.Approve("emp");
        // DefectiveTechnical NHƯNG kho Main → phải throw
        rr.RecordInspection(ReceivedCondition.DefectiveTechnical, mainWh.Id, Guid.NewGuid());
        await _sales.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await orch.ProcessAfterInspectionAsync(rr.Id, "emp"));
    }
}
