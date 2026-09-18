using Catalog.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Catalog;

/// <summary>
/// Sản phẩm: SKU tự sinh dạng "QH-XXXXXXXX" khi không truyền vào; Status suy ra từ tồn kho
/// (>10 InStock, 1-10 LowStock, 0 OutOfStock); LowStockThreshold mặc định 5.
/// Ctor tự sinh Slug, validate giá/cost âm; có API HasNegativeMargin() để phát hiện bán lỗ.
/// </summary>
public class ProductTests
{
    private static Product NewProduct(
        decimal price = 10_000_000m,
        decimal cost = 8_000_000m,
        int stock = 15,
        string? sku = null)
        => new Product(
            name: "Laptop ASUS ROG Strix G16",
            price: price,
            costPrice: cost,
            description: "Laptop gaming cao cấp",
            categoryId: Guid.NewGuid(),
            brandId: Guid.NewGuid(),
            stockQuantity: stock,
            sku: sku);

    [Fact]
    public void KhoiTao_KhongTruyenSku_TuSinhSkuTheoDinhDangQH()
    {
        var p = NewProduct(sku: null);

        p.Sku.Should().StartWith("QH-");
        p.Sku.Length.Should().Be(11); // "QH-" + 8 ký tự
        p.Sku.Should().MatchRegex("^QH-[0-9A-F]{8}$");
    }

    [Fact]
    public void KhoiTao_HaiSanPham_SkuTuSinhKhongTrung()
    {
        var p1 = NewProduct();
        var p2 = NewProduct();

        p1.Sku.Should().NotBe(p2.Sku);
    }

    [Fact]
    public void KhoiTao_TruyenSku_GiuNguyenSkuNguoiDung()
    {
        var p = NewProduct(sku: "CUSTOM-SKU-001");

        p.Sku.Should().Be("CUSTOM-SKU-001");
    }

    [Fact]
    public void KhoiTao_TonKho15_StatusInStock()
    {
        var p = NewProduct(stock: 15);

        p.Status.Should().Be(ProductStatus.InStock);
    }

    [Fact]
    public void KhoiTao_TonKho1Den10_StatusLowStock()
    {
        NewProduct(stock: 1).Status.Should().Be(ProductStatus.LowStock);
        NewProduct(stock: 10).Status.Should().Be(ProductStatus.LowStock);
    }

    [Fact]
    public void KhoiTao_TonKho0_StatusOutOfStock()
    {
        var p = NewProduct(stock: 0);

        p.Status.Should().Be(ProductStatus.OutOfStock);
    }

    [Fact]
    public void KhoiTao_KhongCoBaoHanh_ThiDeTrong()
    {
        // D08: thời hạn bảo hành là dữ liệu của từng sản phẩm (WarrantyMonths),
        // không còn chuỗi mặc định "Bảo hành 24 tháng" gán cứng trong constructor.
        // Không truyền vào => để null, tầng trên rơi về ma trận theo danh mục.
        var p = NewProduct();

        p.WarrantyInfo.Should().BeNull();
        p.WarrantyMonths.Should().BeNull();
    }

    [Fact]
    public void UpdateStock_ThemHang_TangTonKho_CapNhatStatus()
    {
        var p = NewProduct(stock: 0);
        p.Status.Should().Be(ProductStatus.OutOfStock);

        p.UpdateStock(20);

        p.StockQuantity.Should().Be(20);
        p.Status.Should().Be(ProductStatus.InStock);
    }

    [Fact]
    public void UpdateStock_XuatHang_GiamTonKho()
    {
        var p = NewProduct(stock: 20);

        p.UpdateStock(-15);

        p.StockQuantity.Should().Be(5);
        p.Status.Should().Be(ProductStatus.LowStock);
    }

    [Fact]
    public void IsLowStock_DuoiHoacBangNguong_TraVeTrue()
    {
        var p = NewProduct(stock: 5);
        p.IsLowStock().Should().BeTrue();

        p.UpdateStockQuantity(4);
        p.IsLowStock().Should().BeTrue();

        p.UpdateStockQuantity(6);
        p.IsLowStock().Should().BeFalse();
    }

    [Fact]
    public void UpdateLowStockThreshold_DoiNguong_DoiKetQuaIsLowStock()
    {
        var p = NewProduct(stock: 8);
        p.IsLowStock().Should().BeFalse();

        p.UpdateLowStockThreshold(10);

        p.IsLowStock().Should().BeTrue();
    }

    [Fact]
    public void IncrementViewCount_TangDemLuotXem()
    {
        var p = NewProduct();

        p.IncrementViewCount();
        p.IncrementViewCount();

        p.ViewCount.Should().Be(2);
    }

    [Fact]
    public void IncrementSoldCount_TangDemDaBan()
    {
        var p = NewProduct();

        p.IncrementSoldCount(3);
        p.IncrementSoldCount();

        p.SoldCount.Should().Be(4);
    }

    [Fact]
    public void Discontinue_DanhDauNgungKinhDoanh_ChuyenIsActiveFalse()
    {
        var p = NewProduct();

        p.Discontinue();

        p.DiscontinuedAt.Should().NotBeNull();
        p.IsActive.Should().BeFalse();
    }

    [Fact]
    public void UpdatePrice_CapNhatGiaMoi_GiuGiaCuNeuTruyen()
    {
        var p = NewProduct(price: 10_000_000m);

        p.UpdatePrice(8_000_000m, oldPrice: 10_000_000m);

        p.Price.Should().Be(8_000_000m);
        p.OldPrice.Should().Be(10_000_000m);
    }

    /// <summary>
    /// Ctor phải tự sinh Slug từ Name qua SlugGenerator (đảm bảo SEO nhất quán).
    /// </summary>
    [Fact]
    public void KhoiTao_TuSinhSlugTuName_KhongDeChuoiRong()
    {
        var p = NewProduct();

        p.Slug.Should().NotBeNullOrEmpty();
        p.Slug.Should().Be(SlugGenerator.Generate(p.Name));
    }

    /// <summary>
    /// Ctor phải chặn giá bán âm bằng ArgumentException.
    /// </summary>
    [Fact]
    public void KhoiTao_GiaAm_PhaiNemLoi()
    {
        var act = () => NewProduct(price: -1_000_000m);

        act.Should().Throw<ArgumentException>();
    }

    /// <summary>
    /// Ctor phải chặn giá vốn âm bằng ArgumentException.
    /// </summary>
    [Fact]
    public void KhoiTao_GiaVonAm_PhaiNemLoi()
    {
        var act = () => NewProduct(cost: -500_000m);

        act.Should().Throw<ArgumentException>();
    }

    /// <summary>
    /// Có API HasNegativeMargin() để nghiệp vụ phát hiện bán lỗ.
    /// Không throw trong ctor vì có trường hợp hợp lệ (xả hàng có chủ đích);
    /// nghiệp vụ chủ động dùng cờ này để cảnh báo.
    /// </summary>
    [Fact]
    public void GiaVonLonHonGiaBan_PhaiCoCoDeNhanBietLai_Am()
    {
        var p = NewProduct(price: 5_000_000m, cost: 8_000_000m);

        // Cần một API kiểu p.HasNegativeMargin() -> true để nghiệp vụ chặn xuất kho lỗ vô ý
        var hasFlag = p.GetType().GetMethod("HasNegativeMargin")
                   ?? p.GetType().GetMethod("IsSellingAtLoss");

        hasFlag.Should().NotBeNull("cần API để nghiệp vụ phát hiện tình huống bán lỗ");
    }

    // ------- W2-1 (D10): "lên web" = PublishedAt, tách khỏi IsActive -------

    [Fact]
    public void KhoiTao_KhongCoAnh_ChuaLenWeb()
    {
        var p = NewProduct();

        p.PublishedAt.Should().BeNull("chưa có ảnh thì chưa nên hiện trên storefront");
    }

    [Fact]
    public void KhoiTao_CoAnhNgay_TuDongLenWeb()
    {
        var p = new Product(
            name: "Laptop có ảnh", price: 10_000_000m, costPrice: 8_000_000m,
            description: "d", categoryId: Guid.NewGuid(), brandId: Guid.NewGuid(),
            stockQuantity: 5, imageUrl: "/media/seed/products/x/01.webp");

        p.PublishedAt.Should().NotBeNull();
    }

    [Fact]
    public void Publish_SauKhiGoiThi_PublishedAtCoGiaTri()
    {
        var p = NewProduct();
        p.PublishedAt.Should().BeNull();

        p.Publish();

        p.PublishedAt.Should().NotBeNull();
    }

    [Fact]
    public void Unpublish_XoaPublishedAt_KhongDungIsActive()
    {
        var p = NewProduct();
        p.Publish();
        p.IsActive.Should().BeTrue();

        p.Unpublish();

        p.PublishedAt.Should().BeNull();
        p.IsActive.Should().BeTrue("gỡ khỏi web khác với ngừng kinh doanh - vẫn bán được ở POS/kho");
    }

    // ------- W2-1 (D07): đơn vị tính -------

    [Fact]
    public void KhoiTao_KhongTruyenUnitName_MacDinhChiec()
    {
        var p = NewProduct();

        p.UnitName.Should().Be("Chiếc");
    }

    [Fact]
    public void SetUnitName_ChuoiRong_NemLoi()
    {
        var p = NewProduct();

        var act = () => p.SetUnitName("  ");

        act.Should().Throw<ArgumentException>();
    }

    // ------- W2-1: thống kê đánh giá tính lại đúng cả hai trường -------

    [Fact]
    public void UpdateReviewStats_GhiCaHaiTruong()
    {
        var p = NewProduct();

        p.UpdateReviewStats(4.5f, 12);

        p.AverageRating.Should().Be(4.5f);
        p.ReviewCount.Should().Be(12);
    }
}
