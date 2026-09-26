using Catalog.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Catalog.Reviews;

/// <summary>Ảnh đánh giá: chỉ URL do chính kho media của cửa hàng sinh ra, tối đa 5 ảnh.</summary>
public class ReviewPhotoPolicyTests
{
    private const string Own = "/media/u/reviews/2026/09/0123456789abcdef0123456789abcdef-review-w1600.webp";
    private const string OwnThumb = "/media/u/reviews/2026/09/fedcba9876543210fedcba9876543210-review-w400.webp";

    [Theory]
    [InlineData(Own, true)]
    [InlineData(OwnThumb, true)]
    [InlineData("https://evil.example/x.webp", false)]
    [InlineData("/media/u/products/2026/09/0123456789abcdef0123456789abcdef-review-w400.webp", false)]
    [InlineData("/media/u/reviews/2026/09/../../products/a.webp", false)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("/media/u/reviews/2026/09/0123456789abcdef0123456789abcdef-review-w400.svg", false)]
    public void ChiNhanUrlCuaKhoCuaHang(string url, bool expected)
    {
        ReviewPhotoPolicy.IsOwnStorageUrl(url).Should().Be(expected);
    }

    [Fact]
    public void DocDuLieu_BoAnhNgoai_VaDuLieuCuKhongHopLe()
    {
        var json = ReviewPhotoPolicy.Serialize(new[]
        {
            new ReviewPhoto(Own, OwnThumb),
            new ReviewPhoto("https://evil.example/a.jpg", OwnThumb),
        });

        ReviewPhotoPolicy.Parse(json).Should().ContainSingle().Which.Url.Should().Be(Own);
        ReviewPhotoPolicy.Parse("[\"https://legacy.example/a.jpg\"]").Should().BeEmpty();
        ReviewPhotoPolicy.Parse(null).Should().BeEmpty();
    }

    [Fact]
    public void ValidatorTuChoiQuaNamAnh_VaAnhNgoai()
    {
        var validator = new global::Catalog.Validators.CreateProductReviewDtoValidator();
        var six = Enumerable.Range(0, 6).Select(_ => new global::Catalog.ReviewPhotoDto(Own, OwnThumb)).ToList();
        var foreign = new List<global::Catalog.ReviewPhotoDto> { new("https://evil.example/a.webp", OwnThumb) };

        validator.Validate(new global::Catalog.CreateProductReviewDto(5, "Sản phẩm rất tốt", Photos: six)).IsValid.Should().BeFalse();
        validator.Validate(new global::Catalog.CreateProductReviewDto(5, "Sản phẩm rất tốt", Photos: foreign)).IsValid.Should().BeFalse();
        validator.Validate(new global::Catalog.CreateProductReviewDto(5, "Sản phẩm rất tốt",
            Photos: new() { new(Own, OwnThumb) }, Pros: "Nhẹ", Cons: "Nóng")).IsValid.Should().BeTrue();
    }
}
