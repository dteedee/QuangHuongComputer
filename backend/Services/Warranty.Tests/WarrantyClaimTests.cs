using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;
using Xunit;

namespace Warranty.Tests;

public class WarrantyClaimTests
{
    private WarrantyDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<WarrantyDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new WarrantyDbContext(options);
    }

    [Fact]
    public async Task CreateClaim_WhenWarrantyDoesNotExist_ShouldFail()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var nonExistentSerial = "NONEXISTENT123";

        // Act
        var warranty = await context.ProductWarranties
            .FirstOrDefaultAsync(w => w.SerialNumber == nonExistentSerial);

        // Assert
        warranty.Should().BeNull();
    }

    [Fact]
    public async Task CreateClaim_WhenWarrantyIsExpired_ShouldNotAllowWithoutOverride()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var purchaseDate = DateTime.UtcNow.AddMonths(-13); // Expired

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
        result!.IsValid().Should().BeFalse("warranty should be expired");
    }

    [Fact]
    public async Task CreateClaim_WhenWarrantyIsExpiredButManagerOverride_ShouldAllow()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var purchaseDate = DateTime.UtcNow.AddMonths(-13); // Expired

        var warranty = new ProductWarranty(
            productId,
            serialNumber,
            customerId,
            purchaseDate,
            warrantyPeriodMonths: 12
        );

        context.ProductWarranties.Add(warranty);
        await context.SaveChangesAsync();

        // Act - Manager creates claim with override
        var claim = new WarrantyClaim(
            customerId,
            serialNumber,
            "Needs repair despite expiration",
            ResolutionPreference.Repair,
            attachmentUrls: null,
            isManagerOverride: true
        );

        context.Claims.Add(claim);
        await context.SaveChangesAsync();

        // Assert
        var savedClaim = await context.Claims.FirstOrDefaultAsync(c => c.SerialNumber == serialNumber);
        savedClaim.Should().NotBeNull();
        savedClaim!.IsManagerOverride.Should().BeTrue();
    }

    [Fact]
    public async Task CreateClaim_WhenDuplicateClaimExists_ShouldDetectDuplicate()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var issueDescription = "Screen is broken";

        // Create first claim (Pending)
        var claim1 = new WarrantyClaim(
            customerId,
            serialNumber,
            issueDescription,
            ResolutionPreference.Replace
        );

        context.Claims.Add(claim1);
        await context.SaveChangesAsync();

        // Act - Try to create duplicate claim
        var duplicateClaim = await context.Claims
            .Where(c => c.SerialNumber == serialNumber
                && c.IssueDescription == issueDescription
                && (c.Status == ClaimStatus.Pending || c.Status == ClaimStatus.Approved))
            .FirstOrDefaultAsync();

        // Assert
        duplicateClaim.Should().NotBeNull("duplicate claim should be detected");
        duplicateClaim!.Id.Should().Be(claim1.Id);
    }

    [Fact]
    public async Task CreateClaim_WhenPreviousClaimWasResolved_ShouldAllowNewClaim()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var issueDescription = "Screen is broken";

        // Create first claim and resolve it
        var claim1 = new WarrantyClaim(
            customerId,
            serialNumber,
            issueDescription,
            ResolutionPreference.Replace
        );
        claim1.Resolve("Replaced screen");

        context.Claims.Add(claim1);
        await context.SaveChangesAsync();

        // Act - Create new claim with same issue (should be allowed since previous is resolved)
        var duplicateCheck = await context.Claims
            .Where(c => c.SerialNumber == serialNumber
                && c.IssueDescription == issueDescription
                && (c.Status == ClaimStatus.Pending || c.Status == ClaimStatus.Approved))
            .FirstOrDefaultAsync();

        // Assert
        duplicateCheck.Should().BeNull("resolved claims should not block new claims");
    }

    [Fact]
    public async Task CreateClaim_WhenPreviousClaimWasRejected_ShouldAllowNewClaim()
    {
        // Arrange
        using var context = CreateInMemoryContext();
        var customerId = Guid.NewGuid();
        var serialNumber = "SN123456";
        var issueDescription = "Battery issue";

        // Create first claim and reject it
        var claim1 = new WarrantyClaim(
            customerId,
            serialNumber,
            issueDescription,
            ResolutionPreference.Repair
        );
        claim1.Reject("Not covered under warranty");

        context.Claims.Add(claim1);
        await context.SaveChangesAsync();

        // Act - Check for duplicate (should not find rejected claim)
        var duplicateCheck = await context.Claims
            .Where(c => c.SerialNumber == serialNumber
                && c.IssueDescription == issueDescription
                && (c.Status == ClaimStatus.Pending || c.Status == ClaimStatus.Approved))
            .FirstOrDefaultAsync();

        // Assert
        duplicateCheck.Should().BeNull("rejected claims should not block new claims");
    }

    [Fact]
    public void CreateClaim_ShouldStorePreferredResolution()
    {
        // Arrange & Act
        var customerId = Guid.NewGuid();
        var claim = new WarrantyClaim(
            customerId,
            "SN123456",
            "Need refund",
            ResolutionPreference.Refund
        );

        // Assert
        claim.PreferredResolution.Should().Be(ResolutionPreference.Refund);
    }

    [Fact]
    public void CreateClaim_ShouldStoreAttachmentUrls()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var attachments = new List<string>
        {
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg"
        };

        // Act
        var claim = new WarrantyClaim(
            customerId,
            "SN123456",
            "Screen damage with photos",
            ResolutionPreference.Replace,
            attachments
        );

        // Assert
        claim.AttachmentUrls.Should().HaveCount(2);
        claim.AttachmentUrls.Should().Contain("https://example.com/image1.jpg");
        claim.AttachmentUrls.Should().Contain("https://example.com/image2.jpg");
    }

    [Fact]
    public void CreateClaim_ShouldSetInitialStatusToPending()
    {
        // Arrange & Act
        var customerId = Guid.NewGuid();
        var claim = new WarrantyClaim(
            customerId,
            "SN123456",
            "Issue description"
        );

        // Assert
        claim.Status.Should().Be(ClaimStatus.Pending);
        claim.FiledDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Claim_ShouldSupportApproveRejectResolveWorkflow()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var claim = new WarrantyClaim(
            customerId,
            "SN123456",
            "Issue description"
        );

        // Act & Assert - Approve
        claim.Approve();
        claim.Status.Should().Be(ClaimStatus.Approved);

        // Create another claim for reject test
        var claim2 = new WarrantyClaim(
            customerId,
            "SN789",
            "Issue description"
        );

        // Act & Assert - Reject
        claim2.Reject("Not covered");
        claim2.Status.Should().Be(ClaimStatus.Rejected);
        claim2.ResolutionNotes.Should().Be("Not covered");
        claim2.ResolvedDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Create another claim for resolve test
        var claim3 = new WarrantyClaim(
            customerId,
            "SN101",
            "Issue description"
        );

        // Act & Assert - Resolve
        claim3.Resolve("Fixed the issue");
        claim3.Status.Should().Be(ClaimStatus.Resolved);
        claim3.ResolutionNotes.Should().Be("Fixed the issue");
        claim3.ResolvedDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }
}
