using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace Inventory.Tests.Domain;

public class PurchaseOrderTests
{
    [Fact]
    public void Constructor_SetsCorrectDefaults()
    {
        // Arrange
        var supplierId = Guid.NewGuid();
        var items = new List<PurchaseOrderItem>
        {
            new PurchaseOrderItem(Guid.NewGuid(), 10, 100m)
        };

        // Act
        var po = new PurchaseOrder(supplierId, items);

        // Assert
        po.Id.Should().NotBeEmpty();
        po.PONumber.Should().StartWith("PO-");
        po.SupplierId.Should().Be(supplierId);
        po.Status.Should().Be(POStatus.Sent);
        po.Items.Should().HaveCount(1);
    }

    [Fact]
    public void Constructor_CalculatesTotalAmount()
    {
        // Arrange
        var items = new List<PurchaseOrderItem>
        {
            new PurchaseOrderItem(Guid.NewGuid(), 10, 100m), // 1000
            new PurchaseOrderItem(Guid.NewGuid(), 5, 50m)    // 250
        };

        // Act
        var po = new PurchaseOrder(Guid.NewGuid(), items);

        // Assert
        po.TotalAmount.Should().Be(1250m);
    }

    [Fact]
    public void ReceiveAll_SetsStatusToReceived()
    {
        // Arrange
        var items = new List<PurchaseOrderItem>
        {
            new PurchaseOrderItem(Guid.NewGuid(), 1, 100m)
        };
        var po = new PurchaseOrder(Guid.NewGuid(), items);

        // Act
        po.ReceiveAll();

        // Assert
        po.Status.Should().Be(POStatus.Received);
    }

    [Fact]
    public void Cancel_SetsStatusToCancelled()
    {
        // Arrange
        var items = new List<PurchaseOrderItem>
        {
            new PurchaseOrderItem(Guid.NewGuid(), 1, 100m)
        };
        var po = new PurchaseOrder(Guid.NewGuid(), items);

        // Act
        po.Cancel();

        // Assert
        po.Status.Should().Be(POStatus.Cancelled);
    }
}
