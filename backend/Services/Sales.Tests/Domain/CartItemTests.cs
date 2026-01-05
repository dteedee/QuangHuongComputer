using FluentAssertions;
using Sales.Domain;
using Xunit;
using Xunit;

namespace Sales.Tests.Domain;

public class CartItemTests
{
    [Fact]
    public void UpdateQuantity_ValidQuantity_Updates()
    {
        // Arrange
        var item = new CartItem(Guid.NewGuid(), "Test Product", 100m, 2);

        // Act
        item.UpdateQuantity(5);

        // Assert
        item.Quantity.Should().Be(5);
    }

    [Fact]
    public void UpdateQuantity_ZeroQuantity_ThrowsException()
    {
        // Arrange
        var item = new CartItem(Guid.NewGuid(), "Test Product", 100m, 2);

        // Act
        var act = () => item.UpdateQuantity(0);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Quantity must be greater than 0");
    }

    [Fact]
    public void UpdateQuantity_NegativeQuantity_ThrowsException()
    {
        // Arrange
        var item = new CartItem(Guid.NewGuid(), "Test Product", 100m, 2);

        // Act
        var act = () => item.UpdateQuantity(-1);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Quantity must be greater than 0");
    }

    [Fact]
    public void Subtotal_CalculatesCorrectly()
    {
        // Arrange
        var item = new CartItem(Guid.NewGuid(), "Test Product", 25.50m, 4);

        // Assert
        item.Subtotal.Should().Be(102m);
    }

    [Fact]
    public void Constructor_SetsPropertiesCorrectly()
    {
        // Arrange
        var productId = Guid.NewGuid();

        // Act
        var item = new CartItem(productId, "Test Product", 99.99m, 3);

        // Assert
        item.ProductId.Should().Be(productId);
        item.ProductName.Should().Be("Test Product");
        item.Price.Should().Be(99.99m);
        item.Quantity.Should().Be(3);
    }
}
