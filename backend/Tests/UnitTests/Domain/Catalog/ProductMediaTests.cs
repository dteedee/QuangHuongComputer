using Catalog.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Catalog;

/// <summary>
/// ProductMedia: URL bắt buộc, SortOrder không âm; SetPrimary chỉ dành cho Image;
/// khi thêm nhiều media Primary vào Product, Product.AddMedia phải giữ đúng 1 Primary.
/// </summary>
public class ProductMediaTests
{
    private static Product NewProduct() => new Product(
        name: "Laptop Gaming XYZ",
        price: 20_000_000m, costPrice: 17_000_000m,
        description: "desc",
        categoryId: Guid.NewGuid(), brandId: Guid.NewGuid(),
        stockQuantity: 10);

    [Fact]
    public void CreateImage_UrlRong_PhaiNemLoi()
    {
        var act = () => ProductMedia.CreateImage(Guid.NewGuid(), url: "");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void CreateImage_SortOrderAm_PhaiNemLoi()
    {
        var act = () => ProductMedia.CreateImage(Guid.NewGuid(), "https://cdn/img.jpg", sortOrder: -1);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void CreateVideo_MacDinh_IsPrimaryFalse()
    {
        var m = ProductMedia.CreateVideo(Guid.NewGuid(), "https://cdn/v.mp4");
        m.IsPrimary.Should().BeFalse();
        m.Type.Should().Be(MediaType.Video);
    }

    [Fact]
    public void SetPrimary_VideoKhongDuocLamAnhChinh_PhaiNemLoi()
    {
        var m = ProductMedia.CreateVideo(Guid.NewGuid(), "https://cdn/v.mp4");
        var act = () => m.SetPrimary(true);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CreateYoutubeEmbed_Type_LaYoutubeEmbed_IsPrimaryFalse()
    {
        var m = ProductMedia.CreateYoutubeEmbed(Guid.NewGuid(), "https://www.youtube.com/embed/abc123");
        m.Type.Should().Be(MediaType.YoutubeEmbed);
        m.IsPrimary.Should().BeFalse();
    }

    [Fact]
    public void Product_AddNhieuAnhPrimary_ChiConMotAnhPrimaryCuoiCung()
    {
        var product = NewProduct();
        var img1 = ProductMedia.CreateImage(product.Id, "https://cdn/1.jpg", isPrimary: true);
        var img2 = ProductMedia.CreateImage(product.Id, "https://cdn/2.jpg", isPrimary: true);
        var img3 = ProductMedia.CreateImage(product.Id, "https://cdn/3.jpg", isPrimary: false);

        product.AddMedia(img1);
        product.AddMedia(img2); // sẽ unset img1
        product.AddMedia(img3);

        img1.IsPrimary.Should().BeFalse();
        img2.IsPrimary.Should().BeTrue();
        img3.IsPrimary.Should().BeFalse();
        product.Medias.Count(m => m.IsPrimary).Should().Be(1);
    }

    [Fact]
    public void Product_SetPrimaryMedia_ChuyenAnhChinhSangAnhKhac()
    {
        var product = NewProduct();
        var img1 = ProductMedia.CreateImage(product.Id, "https://cdn/1.jpg", isPrimary: true);
        var img2 = ProductMedia.CreateImage(product.Id, "https://cdn/2.jpg");
        product.AddMedia(img1);
        product.AddMedia(img2);

        product.SetPrimaryMedia(img2.Id);

        img1.IsPrimary.Should().BeFalse();
        img2.IsPrimary.Should().BeTrue();
    }

    [Fact]
    public void Product_EffectiveImageUrl_UuTienAnhPrimary()
    {
        var product = NewProduct();
        product.UpdateImage("https://legacy/old.jpg"); // legacy
        product.EffectiveImageUrl.Should().Be("https://legacy/old.jpg");

        var m = ProductMedia.CreateImage(product.Id, "https://cdn/new.jpg", isPrimary: true);
        product.AddMedia(m);

        product.EffectiveImageUrl.Should().Be("https://cdn/new.jpg");
    }

    [Fact]
    public void Product_AddMedia_ProductIdKhongKhop_PhaiNemLoi()
    {
        var product = NewProduct();
        var otherId = Guid.NewGuid();
        var m = ProductMedia.CreateImage(otherId, "https://cdn/x.jpg");
        var act = () => product.AddMedia(m);
        act.Should().Throw<InvalidOperationException>();
    }
}
