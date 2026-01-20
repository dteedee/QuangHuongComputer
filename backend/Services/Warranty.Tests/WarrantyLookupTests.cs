using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;
using Xunit;

namespace Warranty.Tests;

public class WarrantyLookupTests
{
    private WarrantyDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<WarrantyDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new WarrantyDbContext(options);
    }

    [Fact]
    public async Task LookupBySerial_WhenSerialDoesNotExist_ShouldReturnNotFound()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var nonExistentSerial = "NONEXISTENT123";

        // Act
        var result = await context.ProductWarranties
            .FirstOrDefaultAsync(w => w.SerialNumber == nonExistentSerial);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LookupBySerial_WhenSerialExists_ShouldReturnWarranty()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var purchaseDate = DateTime.UtcNow.AddDays(-30);

        var warranty = new ProductWarranty(
            productId,
            serialNumber,
            customerId,
            purchaseDate,
            warrantyPeriodMonths: 12,
            orderNumber: "ORD-001"
        );

        context.ProductWarranties.Add(warranty);
        await context.SaveChangesAsync();

        // Act
        var result = await context.ProductWarranties
            .FirstOrDefaultAsync(w => w.SerialNumber == serialNumber);

        // Assert
        result.Should().NotBeNull();
        result!.SerialNumber.Should().Be(serialNumber);
        result.ProductId.Should().Be(productId);
        result.CustomerId.Should().Be(customerId);
    }

    [Fact]
    public async Task LookupBySerial_WhenWarrantyIsActive_ShouldReturnActiveStatus()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var purchaseDate = DateTime.UtcNow.AddDays(-30);

        var warranty = new ProductWarranty(
            productId,
            serialNumber,
            customerId,
            purchaseDate,
            warrantyPeriodMonths: 12
        );

        context.ProductWarranties.Add(warranty);
        await context.SaveChangesAsync();

        // Act
        var result = await context.ProductWarranties
            .FirstOrDefaultAsync(w => w.SerialNumber == serialNumber);

        // Assert
        result.Should().NotBeNull();
        result!.IsValid().Should().BeTrue();
        result.Status.Should().Be(WarrantyStatus.Active);
    }

    [Fact]
    public async Task LookupBySerial_WhenWarrantyIsExpired_ShouldReturnExpiredStatus()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var purchaseDate = DateTime.UtcNow.AddMonths(-13); // 13 months ago

        var warranty = new ProductWarranty(
            productId,
            serialNumber,
            customerId,
            purchaseDate,
            warrantyPeriodMonths: 12
        );

        context.ProductWarranties.Add(warranty);
        await context.SaveChangesAsync();

        // Act
        var result = await context.ProductWarranties
            .FirstOrDefaultAsync(w => w.SerialNumber == serialNumber);

        // Assert
        result.Should().NotBeNull();
        result!.IsValid().Should().BeFalse();
    }

    [Fact]
    public async Task LookupByInvoice_WhenInvoiceDoesNotExist_ShouldReturnEmpty()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var nonExistentInvoice = "INV-NOTFOUND";

        // Act
        var result = await context.ProductWarranties
            .Where(w => w.OrderNumber == nonExistentInvoice)
            .ToListAsync();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task LookupByInvoice_WhenInvoiceExists_ShouldReturnAllWarrantiesForThatInvoice()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var orderNumber = "ORD-20260120-001";
        var purchaseDate = DateTime.UtcNow.AddDays(-30);

        // Add multiple warranties for the same order
        var warranty1 = new ProductWarranty(
            Guid.NewGuid(),
            "SN001",
            customerId,
            purchaseDate,
            12,
            orderNumber
        );

        var warranty2 = new ProductWarranty(
            Guid.NewGuid(),
            "SN002",
            customerId,
            purchaseDate,
            12,
            orderNumber
        );

        context.ProductWarranties.AddRange(warranty1, warranty2);
        await context.SaveChangesAsync();

        // Act
        var result = await context.ProductWarranties
            .Where(w => w.OrderNumber == orderNumber)
            .ToListAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(w => w.SerialNumber == "SN001");
        result.Should().Contain(w => w.SerialNumber == "SN002");
    }

    [Fact]
    public async Task LookupWithClaimHistory_ShouldReturnClaimsForSerial()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var purchaseDate = DateTime.UtcNow.AddDays(-30);

        var warranty = new ProductWarranty(
            productId,
            serialNumber,
            customerId,
            purchaseDate,
            12
        );

        var claim1 = new WarrantyClaim(
            customerId,
            serialNumber,
            "Screen is broken",
            ResolutionPreference.Replace
        );

        var claim2 = new WarrantyClaim(
            customerId,
            serialNumber,
            "Battery not charging",
            ResolutionPreference.Repair
        );

        context.ProductWarranties.Add(warranty);
        context.Claims.AddRange(claim1, claim2);
        await context.SaveChangesAsync();

        // Act
        var claims = await context.Claims
            .Where(c => c.SerialNumber == serialNumber)
            .OrderByDescending(c => c.FiledDate)
            .ToListAsync();

        // Assert
        claims.Should().HaveCount(2);
        claims.Should().Contain(c => c.IssueDescription == "Screen is broken");
        claims.Should().Contain(c => c.IssueDescription == "Battery not charging");
    }
}
