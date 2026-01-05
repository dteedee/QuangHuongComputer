using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace Sales.Tests.Domain;

public class CartTests
{
    [Fact]
    public void AddItem_NewProduct_AddsToItems()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        var productId = Guid.NewGuid();

        // Act
        cart.AddItem(productId, "Test Product", 100m, 2);

        // Assert
        cart.Items.Should().HaveCount(1);
        cart.Items[0].ProductId.Should().Be(productId);
        cart.Items[0].ProductName.Should().Be("Test Product");
        cart.Items[0].Price.Should().Be(100m);
        cart.Items[0].Quantity.Should().Be(2);
    }

    [Fact]
    public void AddItem_ExistingProduct_UpdatesQuantity()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        var productId = Guid.NewGuid();
        cart.AddItem(productId, "Test Product", 100m, 2);

        // Act
        cart.AddItem(productId, "Test Product", 100m, 3);

        // Assert
        cart.Items.Should().HaveCount(1);
        cart.Items[0].Quantity.Should().Be(5);
    }

    [Fact]
    public void RemoveItem_ExistingProduct_RemovesFromItems()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        var productId = Guid.NewGuid();
        cart.AddItem(productId, "Test Product", 100m, 2);

        // Act
        cart.RemoveItem(productId);

        // Assert
        cart.Items.Should().BeEmpty();
    }

    [Fact]
    public void RemoveItem_NonExistingProduct_NoEffect()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Test Product", 100m, 2);

        // Act
        cart.RemoveItem(Guid.NewGuid());

        // Assert
        cart.Items.Should().HaveCount(1);
    }

    [Fact]
    public void UpdateItemQuantity_ValidQuantity_UpdatesItem()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        var productId = Guid.NewGuid();
        cart.AddItem(productId, "Test Product", 100m, 2);

        // Act
        cart.UpdateItemQuantity(productId, 5);

        // Assert
        cart.Items[0].Quantity.Should().Be(5);
    }

    [Fact]
    public void UpdateItemQuantity_ZeroQuantity_RemovesItem()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        var productId = Guid.NewGuid();
        cart.AddItem(productId, "Test Product", 100m, 2);

        // Act
        cart.UpdateItemQuantity(productId, 0);

        // Assert
        cart.Items.Should().BeEmpty();
    }

    [Fact]
    public void TotalAmount_CalculatesCorrectly()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 2);
        cart.AddItem(Guid.NewGuid(), "Product 2", 50m, 3);

        // Assert
        cart.TotalAmount.Should().Be(350m); // (100*2) + (50*3)
    }

    [Fact]
    public void Clear_RemovesAllItems()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 2);
        cart.AddItem(Guid.NewGuid(), "Product 2", 50m, 3);

        // Act
        cart.Clear();

        // Assert
        cart.Items.Should().BeEmpty();
    }
}
