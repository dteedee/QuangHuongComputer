#if QH_APIGATEWAY
using System;
using ApiGateway;
using FluentAssertions;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// IR W0 #45: <see cref="ReviewValidationMiddleware.TryMatchReviewRoute"/> phải khớp route
/// review bất kể dấu "/" cuối hay hoa/thường — trước bản vá này, <c>StartsWithSegments</c> +
/// <c>EndsWith("/reviews")</c> để lọt <c>/api/catalog/products/{id}/reviews/</c> (không header
/// verified-purchase mà vẫn review được). Guard này chỉ biên dịch khi cổng bật
/// <c>IncludeApiGatewayTests=true</c> (xem UnitTests.csproj) vì ApiGateway.csproj chưa nằm trong
/// build mặc định của track này (IR W0 #46) — chờ cổng W1-G bật cờ sau lần build sạch đầu tiên.
/// </summary>
public class ReviewRouteMatchingTests
{
    private static readonly Guid ProductId = Guid.Parse("11111111-2222-3333-4444-555555555555");

    [Fact]
    public void DuongDanChuan_ThiKhop()
    {
        var matched = ReviewValidationMiddleware.TryMatchReviewRoute(
            $"/api/catalog/products/{ProductId}/reviews", out var productId);

        matched.Should().BeTrue();
        productId.Should().Be(ProductId);
    }

    [Fact]
    public void DuongDanCoDauSlashCuoi_ThiVanKhop()
    {
        // Đây là lỗ hổng gốc: StartsWithSegments+EndsWith đi qua được route có "/" cuối.
        var matched = ReviewValidationMiddleware.TryMatchReviewRoute(
            $"/api/catalog/products/{ProductId}/reviews/", out var productId);

        matched.Should().BeTrue();
        productId.Should().Be(ProductId);
    }

    [Fact]
    public void DuongDanChuHoa_ThiVanKhop()
    {
        var matched = ReviewValidationMiddleware.TryMatchReviewRoute(
            $"/API/Catalog/Products/{ProductId}/Reviews", out var productId);

        matched.Should().BeTrue();
        productId.Should().Be(ProductId);
    }

    [Fact]
    public void DuongDanCoDuoiThua_ThiKhongKhop()
    {
        var matched = ReviewValidationMiddleware.TryMatchReviewRoute(
            $"/api/catalog/products/{ProductId}/reviews/extra", out _);

        matched.Should().BeFalse();
    }

    [Fact]
    public void ProductIdKhongPhaiGuid_ThiKhongKhop()
    {
        var matched = ReviewValidationMiddleware.TryMatchReviewRoute(
            "/api/catalog/products/not-a-guid/reviews", out _);

        matched.Should().BeFalse();
    }
}
#endif
