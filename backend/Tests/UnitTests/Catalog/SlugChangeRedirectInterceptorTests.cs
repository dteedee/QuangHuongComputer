using BuildingBlocks.Seo;
using Catalog.Domain;
using Catalog.Infrastructure;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace UnitTests.Catalog;

/// <summary>Đổi slug danh mục/sản phẩm -> ghi nhận đường dẫn cũ/mới để tự tạo 301.</summary>
public class SlugChangeRedirectInterceptorTests
{
    private sealed class CapturingRecorder : ISlugRedirectRecorder
    {
        public List<SlugPathChange> Changes { get; } = new();

        public Task RecordAsync(IReadOnlyList<SlugPathChange> changes, string? actorId, CancellationToken ct)
        {
            Changes.AddRange(changes);
            return Task.CompletedTask;
        }
    }

    private static (CatalogDbContext Db, CapturingRecorder Recorder) Build()
    {
        var recorder = new CapturingRecorder();
        var services = new ServiceCollection().AddSingleton<ISlugRedirectRecorder>(recorder).BuildServiceProvider();
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new SlugChangeRedirectInterceptor(services))
            .Options;
        return (new CatalogDbContext(options), recorder);
    }

    [Fact]
    public async Task DoiSlugDanhMuc_GhiNhanDuongDanCuVaMoi()
    {
        var (db, recorder) = Build();
        var category = new Category("Laptop", "");
        category.SetSlug("laptop-cu");
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        recorder.Changes.Should().BeEmpty("thêm mới không phải đổi slug");

        category.SetSlug("laptop-moi");
        await db.SaveChangesAsync();

        recorder.Changes.Should().ContainSingle().Which.Should().Be(
            new SlugPathChange("/danh-muc/laptop-cu", "/danh-muc/laptop-moi", "category-slug"));
    }

    [Fact]
    public async Task SuaTruongKhac_KhongGhiNhan()
    {
        var (db, recorder) = Build();
        var category = new Category("Laptop", "");
        category.SetSlug("laptop");
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        category.UpdateDetails("Laptop gaming", "mô tả");
        await db.SaveChangesAsync();

        recorder.Changes.Should().BeEmpty();
    }
}
