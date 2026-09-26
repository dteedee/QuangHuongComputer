using BuildingBlocks.Contracts;
using Catalog;
using Catalog.Application.Products;
using Catalog.Domain;
using Catalog.Infrastructure;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Catalog;

/// <summary>
/// Khối "Thường được mua cùng": giữ thứ hạng của Sales, chỉ hàng đã đăng web + còn hàng,
/// và rơi về "related" (cùng danh mục/thương hiệu) khi dữ liệu mua kèm chưa đủ.
/// </summary>
public class BoughtTogetherServiceTests : IDisposable
{
    private sealed class FakeCoPurchase : ICoPurchaseQuery
    {
        public List<CoPurchaseCount> Rows { get; } = new();

        public Task<IReadOnlyList<CoPurchaseCount>> GetCoPurchasedAsync(
            Guid productId, TimeSpan window, int minOrders, int take, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<CoPurchaseCount>>(
                Rows.Where(r => r.OrderCount >= minOrders).Take(take).ToList());
    }

    private readonly CatalogDbContext _db = new(new DbContextOptionsBuilder<CatalogDbContext>()
        .UseInMemoryDatabase("bought-together-" + Guid.NewGuid()).Options);
    private readonly FakeCoPurchase _coPurchase = new();
    private readonly Category _laptops = new("Laptop", "");
    private readonly Category _mice = new("Chuột", "");
    private readonly Brand _brand = new("Hãng A", "");
    private readonly Brand _otherBrand = new("Hãng B", "");

    public BoughtTogetherServiceTests()
    {
        _db.Categories.AddRange(_laptops, _mice);
        _db.Brands.AddRange(_brand, _otherBrand);
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private BoughtTogetherService Service() => new(_db, _coPurchase);

    private Product Add(string name, decimal price, Category category, Brand brand, int stock = 5, bool published = true)
    {
        var product = new Product(name, price, price / 2, "", category.Id, brand.Id, stock, sku: name);
        if (published) product.Publish(); else product.Unpublish();
        _db.Products.Add(product);
        _db.SaveChanges();
        return product;
    }

    [Fact]
    public async Task DuDuLieuMuaKem_GiuThuHangVaTinhTongTaiServer()
    {
        var laptop = Add("laptop", 20_000_000m, _laptops, _brand);
        var mouse = Add("chuot", 300_000m, _mice, _otherBrand);
        var bag = Add("balo", 500_000m, _mice, _otherBrand);
        _coPurchase.Rows.AddRange(new[] { new CoPurchaseCount(bag.Id, 5), new CoPurchaseCount(mouse.Id, 3) });

        var result = await Service().GetAsync(laptop.Id, 6);

        result!.Source.Should().Be(BoughtTogetherService.SourceCoPurchase);
        result.Items.Select(i => (i.Product.Id, i.OrderCount)).Should().Equal((bag.Id, 5), (mouse.Id, 3));
        result.Total.Should().Be(20_800_000m);
    }

    [Fact]
    public async Task HangHetHang_HoacChuaDangWeb_BiLoai()
    {
        var laptop = Add("laptop", 20_000_000m, _laptops, _brand);
        var soldOut = Add("het-hang", 100_000m, _mice, _otherBrand, stock: 0);
        var hidden = Add("an", 100_000m, _mice, _otherBrand, published: false);
        var mouse = Add("chuot", 300_000m, _mice, _otherBrand);
        var bag = Add("balo", 500_000m, _mice, _otherBrand);
        _coPurchase.Rows.AddRange(new[]
        {
            new CoPurchaseCount(soldOut.Id, 9), new CoPurchaseCount(hidden.Id, 8),
            new CoPurchaseCount(mouse.Id, 3), new CoPurchaseCount(bag.Id, 2),
        });

        var result = await Service().GetAsync(laptop.Id, 6);

        result!.Items.Select(i => i.Product.Id).Should().Equal(mouse.Id, bag.Id);
    }

    [Fact]
    public async Task ChuaDuDuLieu_RoiVeRelated_CungDanhMucTruoc()
    {
        var laptop = Add("laptop", 20_000_000m, _laptops, _brand);
        var sameCategory = Add("laptop-2", 15_000_000m, _laptops, _otherBrand);
        var sameBrand = Add("chuot-hang-a", 200_000m, _mice, _brand);
        Add("khong-lien-quan", 100_000m, _mice, _otherBrand);
        Add("cung-danh-muc-het-hang", 9_000_000m, _laptops, _brand, stock: 0);
        var onlyOne = Add("chuot", 300_000m, _mice, _otherBrand);
        _coPurchase.Rows.Add(new CoPurchaseCount(onlyOne.Id, 4)); // 1 gợi ý < ngưỡng 2

        var result = await Service().GetAsync(laptop.Id, 6);

        result!.Source.Should().Be(BoughtTogetherService.SourceRelated);
        result.Items.Select(i => i.Product.Id).Should().Equal(sameCategory.Id, sameBrand.Id);
        result.Items.Should().OnlyContain(i => i.OrderCount == 0);
        result.Total.Should().Be(35_200_000m);
    }

    [Fact]
    public async Task SanPhamGocChuaDangWeb_TraNull()
    {
        var hidden = Add("an", 1m, _laptops, _brand, published: false);

        (await Service().GetAsync(hidden.Id, 6)).Should().BeNull();
    }

    [Fact]
    public async Task CatTheoLimit_TinhLaiTong()
    {
        var laptop = Add("laptop", 1_000m, _laptops, _brand);
        var a = Add("a", 100m, _mice, _otherBrand);
        var b = Add("b", 10m, _mice, _otherBrand);
        _coPurchase.Rows.AddRange(new[] { new CoPurchaseCount(a.Id, 3), new CoPurchaseCount(b.Id, 2) });
        var full = await Service().GetAsync(laptop.Id, BoughtTogetherService.MaxLimit);

        var sliced = CatalogBoughtTogetherEndpoints.Slice(full!, 1);

        sliced.Items.Should().ContainSingle().Which.Product.Id.Should().Be(a.Id);
        sliced.Total.Should().Be(1_100m);
        // Khách bỏ chọn món "a": tổng vẫn do server tính; id lạ bị bỏ qua.
        var selected = CatalogBoughtTogetherEndpoints.ParseSelected($"{b.Id}, khong-phai-guid,{Guid.NewGuid()}");
        var partial = CatalogBoughtTogetherEndpoints.Slice(full!, 12, selected);
        partial.Items.Should().HaveCount(2, "danh sách gợi ý không đổi khi bỏ chọn");
        partial.Total.Should().Be(1_010m);
        CatalogBoughtTogetherEndpoints.ParseSelected(null).Should().BeNull();
        CatalogBoughtTogetherEndpoints.Slice(full!, 12, CatalogBoughtTogetherEndpoints.ParseSelected(""))
            .Total.Should().Be(1_000m, "không chọn món nào = chỉ sản phẩm gốc");

        BoughtTogetherService.ClampLimit(null).Should().Be(6);
        BoughtTogetherService.ClampLimit(100).Should().Be(BoughtTogetherService.MaxLimit);
    }
}
