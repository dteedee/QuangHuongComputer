using FluentAssertions;
using Warranty.Domain;
using Warranty.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Domain.Warranty;

/// <summary>
/// Phase 07: 1 máy có 2 warranty song song (Manufacturer + Store).
/// Kiểm tra field mới: Provider, PolicyId, SerialNumberId.
/// </summary>
public class ProductWarrantyProviderTests
{
    [Fact]
    public void KhoiTao_MacDinhProvider_Manufacturer()
    {
        var w = new ProductWarranty(Guid.NewGuid(), "SN-1", Guid.NewGuid(), DateTime.UtcNow, 24);
        w.Provider.Should().Be(WarrantyProvider.Manufacturer);
    }

    [Fact]
    public void KhoiTao_ChonProvider_Store_LuuLai()
    {
        var w = new ProductWarranty(Guid.NewGuid(), "SN-1", Guid.NewGuid(), DateTime.UtcNow, 6,
            provider: WarrantyProvider.Store);
        w.Provider.Should().Be(WarrantyProvider.Store);
    }

    [Fact]
    public void AttachSerialNumberId_CapNhatVaTimestamp()
    {
        var w = new ProductWarranty(Guid.NewGuid(), "SN-1", Guid.NewGuid(), DateTime.UtcNow, 24);
        var snId = Guid.NewGuid();
        w.AttachSerialNumberId(snId);
        w.SerialNumberId.Should().Be(snId);
        w.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task DbContext_ChoPhepHaiWarrantyCungSerial_KhacProvider()
    {
        using var db = new WarrantyDbContext(new DbContextOptionsBuilder<WarrantyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        var mfr = new ProductWarranty(Guid.NewGuid(), "SN-XX", Guid.NewGuid(),
            DateTime.UtcNow, 24, provider: WarrantyProvider.Manufacturer);
        var store = new ProductWarranty(mfr.ProductId, "SN-XX", mfr.CustomerId,
            DateTime.UtcNow, 6, provider: WarrantyProvider.Store);
        db.ProductWarranties.AddRange(mfr, store);
        await db.SaveChangesAsync();

        var count = await db.ProductWarranties.CountAsync(w => w.SerialNumber == "SN-XX");
        count.Should().Be(2);
    }
}
