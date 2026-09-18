using BuildingBlocks.Paging;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// <c>ToPagedResultAsync</c> over a real EF provider (InMemory), because the interesting behaviour -
/// the COUNT before Skip/Take, and the short-circuit past the end - only exists against a provider.
/// </summary>
public class QueryablePagingExtensionsTests : IDisposable
{
    private sealed class Widget
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Rank { get; set; }
    }

    private sealed class PagingDbContext : DbContext
    {
        public PagingDbContext(DbContextOptions<PagingDbContext> options) : base(options) { }
        public DbSet<Widget> Widgets => Set<Widget>();
    }

    private readonly PagingDbContext _db;

    public QueryablePagingExtensionsTests()
    {
        var options = new DbContextOptionsBuilder<PagingDbContext>()
            .UseInMemoryDatabase($"paging-{Guid.NewGuid()}")
            .Options;
        _db = new PagingDbContext(options);

        _db.Widgets.AddRange(Enumerable.Range(1, 55).Select(i => new Widget
        {
            Id = i,
            Name = $"Linh kiện {i:D2}",
            Rank = 100 - i
        }));
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task TraVeDungSoLuongVaTongSoBanGhi()
    {
        var request = new PagedRequest { PageNumber = 2, Size = 20 };

        var result = await _db.Widgets.OrderBy(w => w.Id).ToPagedResultAsync(request);

        result.Total.Should().Be(55);
        result.Items.Should().HaveCount(20);
        result.Items[0].Id.Should().Be(21);
        result.Page.Should().Be(2);
        result.PageSize.Should().Be(20);
        result.TotalPages.Should().Be(3);
        result.HasPreviousPage.Should().BeTrue();
        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public async Task TrangCuoi_TraVePhanConLai()
    {
        var result = await _db.Widgets.OrderBy(w => w.Id)
            .ToPagedResultAsync(new PagedRequest { PageNumber = 3, Size = 20 });

        result.Items.Should().HaveCount(15);
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public async Task TrangVuotQuaCuoi_TraVeRong_NhungVanGiuTong()
    {
        var result = await _db.Widgets.OrderBy(w => w.Id)
            .ToPagedResultAsync(new PagedRequest { PageNumber = 99, Size = 20 });

        result.Items.Should().BeEmpty();
        result.Total.Should().Be(55);
    }

    /// <summary>Đúng 100 dòng dù người gọi xin 5.000 - trần nằm ở PagedRequest, không ở endpoint.</summary>
    [Fact]
    public async Task KichThuocTrangBiChan_ThiTruyVanChiLay100Dong()
    {
        var result = await _db.Widgets.OrderBy(w => w.Id)
            .ToPagedResultAsync(new PagedRequest { Size = 5000 });

        result.PageSize.Should().Be(100);
        result.Items.Should().HaveCount(55); // toàn bộ tập, vì nhỏ hơn 100
    }

    [Fact]
    public void ApplySort_ChiChapNhanCotTrongDanhSachChoPhep()
    {
        var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<Widget, object?>>>
        {
            ["name"] = w => w.Name,
            ["rank"] = w => w.Rank
        };

        var byRankDesc = _db.Widgets
            .ApplySort(new PagedRequest { SortBy = "rank", SortDir = "desc" }, sortable, w => w.Id)
            .ToList();
        byRankDesc[0].Id.Should().Be(1); // Rank 99 là lớn nhất

        // Cột lạ (hoặc do người dùng bịa ra) -> rơi về sắp xếp mặc định, KHÔNG ném lỗi và KHÔNG
        // dựng ORDER BY từ chuỗi người dùng gửi lên.
        var unknown = _db.Widgets
            .ApplySort(new PagedRequest { SortBy = "'; DROP TABLE Widgets; --" }, sortable, w => w.Id)
            .ToList();
        unknown[0].Id.Should().Be(1);
        unknown.Should().HaveCount(55);
    }
}
