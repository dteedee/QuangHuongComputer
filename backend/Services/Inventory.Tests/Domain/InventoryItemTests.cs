using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace Inventory.Tests.Domain;

public class InventoryItemTests
{
    [Fact]
    public void Constructor_SetsPropertiesCorrectly()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var initQty = 100;
        var reorderLevel = 10;

        // Act
        var item = new InventoryItem(productId, initQty, reorderLevel);

        // Assert
        item.ProductId.Should().Be(productId);
        item.QuantityOnHand.Should().Be(initQty);
        item.ReorderLevel.Should().Be(reorderLevel);
    }

    [Fact]
    public void AdjustStock_PositiveQuantity_IncreasesStock()
    {
        // Arrange
        var item = new InventoryItem(Guid.NewGuid(), 100);

        // Act
        item.AdjustStock(50);

        // Assert
        item.QuantityOnHand.Should().Be(150);
    }

    [Fact]
    public void AdjustStock_NegativeQuantity_DecreasesStock()
    {
        // Arrange
        var item = new InventoryItem(Guid.NewGuid(), 100);

        // Act
        item.AdjustStock(-30);

        // Assert
        item.QuantityOnHand.Should().Be(70);
    }

    [Fact]
    public void NeedsReorder_BelowThreshold_ReturnsTrue()
    {
        // Arrange
        var item = new InventoryItem(Guid.NewGuid(), 10, 20); // Qty 10 < Level 20

        // Assert
        item.NeedsReorder().Should().BeTrue();
    }

    [Fact]
    public void NeedsReorder_AboveThreshold_ReturnsFalse()
    {
        // Arrange
        var item = new InventoryItem(Guid.NewGuid(), 30, 20); // Qty 30 > Level 20

        // Assert
        item.NeedsReorder().Should().BeFalse();
    }

    [Fact]
    public void NeedsReorder_AtThreshold_ReturnsTrue()
    {
        // Arrange
        var item = new InventoryItem(Guid.NewGuid(), 20, 20); // Qty 20 == Level 20

        // Assert
        item.NeedsReorder().Should().BeTrue();
    }
}
