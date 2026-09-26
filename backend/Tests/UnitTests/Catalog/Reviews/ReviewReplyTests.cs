using BuildingBlocks.Security;
using Catalog;
using Catalog.Domain;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace UnitTests.Catalog.Reviews;

/// <summary>"Phản hồi từ Quang Hưởng": luật nghiệp vụ + chỉ nhân viên có Catalog.Manage mới ghi được.</summary>
public class ReviewReplyTests
{
    private static ProductReview NewReview() => new(Guid.NewGuid(), "customer-1", 5, "Máy chạy êm, pin trâu.");

    [Fact]
    public void PhanHoiLanDau_LuuNoiDungNguoiVaThoiDiem()
    {
        var review = NewReview();
        var at = new DateTime(2026, 9, 26, 3, 0, 0, DateTimeKind.Utc);

        review.Reply("  Cảm ơn anh đã tin tưởng Quang Hưởng!  ", "staff-7", at);

        review.ReplyText.Should().Be("Cảm ơn anh đã tin tưởng Quang Hưởng!");
        review.RepliedBy.Should().Be("staff-7");
        review.RepliedAt.Should().Be(at);
    }

    [Fact]
    public void PhanHoiLanHai_PhaiDungSua_SuaThiGhiDe_XoaThiMatHet()
    {
        var review = NewReview();
        review.Reply("Lần 1", "staff-1", DateTime.UtcNow);

        review.Invoking(r => r.Reply("Lần 2", "staff-1", DateTime.UtcNow)).Should().Throw<InvalidOperationException>();

        review.EditReply("Đã sửa", "staff-2", DateTime.UtcNow);
        review.ReplyText.Should().Be("Đã sửa");
        review.RepliedBy.Should().Be("staff-2");

        review.DeleteReply();
        review.HasReply.Should().BeFalse();
        review.RepliedBy.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void PhanHoiRong_BiTuChoi(string text)
    {
        NewReview().Invoking(r => r.Reply(text, "staff-1", DateTime.UtcNow)).Should().Throw<ArgumentException>();
    }

    [Fact]
    public void PhanHoiQuaDai_BiTuChoi()
    {
        var text = new string('a', ProductReview.MaxReplyLength + 1);
        NewReview().Invoking(r => r.Reply(text, "staff-1", DateTime.UtcNow)).Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SuaHoacXoaKhiChuaCoPhanHoi_BiTuChoi()
    {
        NewReview().Invoking(r => r.EditReply("x", "s", DateTime.UtcNow)).Should().Throw<InvalidOperationException>();
        NewReview().Invoking(r => r.DeleteReply()).Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public void RoutePhanHoi_DoiQuyenCatalogManage(string verb)
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddRouting();
        // DbContext phải có trong DI, nếu không minimal API suy ra nó là body của request.
        builder.Services.AddDbContext<global::Catalog.Infrastructure.CatalogDbContext>(o => o.UseInMemoryDatabase("reply-routes"));
        var app = builder.Build();
        app.MapGroup("/api/catalog").MapCatalogReviewReplyEndpoints();

        var endpoint = ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).OfType<RouteEndpoint>()
            .Single(e => e.RoutePattern.RawText!.EndsWith("/reply")
                && e.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods.Contains(verb));

        endpoint.Metadata.OfType<IAuthorizeData>().Select(a => a.Policy).Should().Contain(Permissions.Catalog.Manage);
        endpoint.Metadata.OfType<IAllowAnonymous>().Should().BeEmpty();
    }

    [Fact]
    public void KhachHang_KhongCoQuyenPhanHoi()
    {
        RolePermissionMatrix.For(Roles.Customer).Should().NotContain(Permissions.Catalog.Manage);
    }
}
