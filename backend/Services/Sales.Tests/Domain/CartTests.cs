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
    public void SubtotalAmount_CalculatesCorrectly()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 2);
        cart.AddItem(Guid.NewGuid(), "Product 2", 50m, 3);

        // Assert
        cart.SubtotalAmount.Should().Be(350m); // (100*2) + (50*3)
    }

    [Fact]
    public void TotalAmount_NoCoupon_CalculatesWithTax()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 2); // 200
        cart.AddItem(Guid.NewGuid(), "Product 2", 50m, 2);  // 100
        // Subtotal = 300
        // Tax (10%) = 30
        // Total = 330

        // Assert
        cart.SubtotalAmount.Should().Be(300m);
        cart.TotalAmount.Should().Be(330m);
    }

    [Fact]
    public void ApplyCoupon_ValidPercentageCoupon_CalculatesCorrectDiscount()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 2); // 200
        // Subtotal = 200
        // Discount (20%) = 40
        // After discount = 160
        // Tax (10%) = 16
        // Total = 176

        // Act
        cart.ApplyCoupon("SAVE20", 40m);

        // Assert
        cart.CouponCode.Should().Be("SAVE20");
        cart.DiscountAmount.Should().Be(40m);
        cart.SubtotalAmount.Should().Be(200m);
        cart.TotalAmount.Should().Be(176m);
    }

    [Fact]
    public void ApplyCoupon_ValidFixedAmountCoupon_CalculatesCorrectDiscount()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 3); // 300
        // Subtotal = 300
        // Fixed discount = 50
        // After discount = 250
        // Tax (10%) = 25
        // Total = 275

        // Act
        cart.ApplyCoupon("FLAT50", 50m);

        // Assert
        cart.CouponCode.Should().Be("FLAT50");
        cart.DiscountAmount.Should().Be(50m);
        cart.TotalAmount.Should().Be(275m);
    }

    [Fact]
    public void ApplyCoupon_DiscountGreaterThanSubtotal_TotalIsZeroPlusTax()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 50m, 1); // 50
        // Subtotal = 50
        // Discount = 100 (more than subtotal)
        // After discount = 0
        // Tax (10% of 0) = 0
        // Total = 0

        // Act
        cart.ApplyCoupon("MEGA100", 100m);

        // Assert
        cart.TotalAmount.Should().Be(0m);
    }

    [Fact]
    public void RemoveCoupon_RemovesDiscountAndCode()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 2); // 200
        cart.ApplyCoupon("SAVE20", 40m);

        // Act
        cart.RemoveCoupon();

        // Assert
        cart.CouponCode.Should().BeNull();
        cart.DiscountAmount.Should().Be(0m);
        cart.TotalAmount.Should().Be(220m); // 200 + 20 tax
    }

    [Fact]
    public void SetShippingAmount_ValidAmount_UpdatesTotal()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 2); // 200
        // Subtotal = 200
        // Tax = 20
        // Shipping = 30
        // Total = 250

        // Act
        cart.SetShippingAmount(30m);

        // Assert
        cart.ShippingAmount.Should().Be(30m);
        cart.TotalAmount.Should().Be(250m);
    }

    [Fact]
    public void SetShippingAmount_NegativeAmount_ThrowsException()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());

        // Act & Assert
        var act = () => cart.SetShippingAmount(-10m);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Shipping amount cannot be negative");
    }

    [Fact]
    public void TotalAmount_WithCouponAndShipping_CalculatesCorrectly()
    {
        // Arrange
        var cart = new Cart(Guid.NewGuid());
        cart.AddItem(Guid.NewGuid(), "Product 1", 100m, 2); // 200
        // Subtotal = 200
        // Discount = 40
        // After discount = 160
        // Tax (10% of 160) = 16
        // Shipping = 25
        // Total = 201

        // Act
        cart.ApplyCoupon("SAVE20", 40m);
        cart.SetShippingAmount(25m);

        // Assert
        cart.TotalAmount.Should().Be(201m);
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
