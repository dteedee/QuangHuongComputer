using System.Linq;
using Content.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Content;

/// <summary>
/// W2-2 D10: một predicate lịch xuất bản duy nhất (Post.PublishedPredicate) dùng chung
/// list/detail/related/sitemap — trước đây detail-by-slug thiếu filter, lộ draft/scheduled post.
/// </summary>
public class PostTests
{
    [Fact]
    public void PublishedPredicate_BaiDraft_KhongKhop()
    {
        var post = new Post("Tin tuc", "tin-tuc", "noi dung");
        // mặc định Status = Draft, PublishedAt = null

        var matches = new[] { post }.AsQueryable().Where(Post.PublishedPredicate(System.DateTime.UtcNow));

        matches.Should().BeEmpty();
    }

    [Fact]
    public void PublishedPredicate_BaiDaXuatBanQuaKhu_Khop()
    {
        var post = new Post("Tin tuc", "tin-tuc", "noi dung");
        post.Publish(); // PublishedAt = UtcNow

        var matches = new[] { post }.AsQueryable().Where(Post.PublishedPredicate(System.DateTime.UtcNow.AddMinutes(1)));

        matches.Should().ContainSingle();
    }

    [Fact]
    public void PublishedPredicate_BaiLenLichTuongLai_KhongKhop()
    {
        // Published nhưng PublishedAt trong tương lai (nhập tay qua admin) — vẫn phải bị chặn.
        var post = new Post("Tin tuc", "tin-tuc", "noi dung");
        post.Publish();

        // "now" ở đây SỚM HƠN PublishedAt của post -> mô phỏng bài lên lịch tương lai.
        var matches = new[] { post }.AsQueryable().Where(Post.PublishedPredicate(System.DateTime.UtcNow.AddDays(-1)));

        matches.Should().BeEmpty();
    }
}
