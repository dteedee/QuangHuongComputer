using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace Sales.Tests.Domain;

public class OrderTests
{
    [Fact]
    public void Constructor_SetsCorrectDefaults()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var items = new List<OrderItem>
        {
            new OrderItem(Guid.NewGuid(), "Product 1", 100m, 2)
        };

        // Act
        var order = new Order(customerId, "123 Main St", items, 0.1m);

        // Assert
        order.Id.Should().NotBeEmpty();
        order.OrderNumber.Should().StartWith("ORD-");
        order.CustomerId.Should().Be(customerId);
        order.ShippingAddress.Should().Be("123 Main St");
        order.Status.Should().Be(OrderStatus.Pending);
        order.OrderDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Constructor_CalculatesAmountsCorrectly()
    {
        // Arrange
        var items = new List<OrderItem>
        {
            new OrderItem(Guid.NewGuid(), "Product 1", 100m, 2),  // 200
            new OrderItem(Guid.NewGuid(), "Product 2", 50m, 3)    // 150
        };

        // Act
        var order = new Order(Guid.NewGuid(), "123 Main St", items, 0.1m);

        // Assert
        order.SubtotalAmount.Should().Be(350m);
        order.TaxAmount.Should().Be(35m);          // 10% of 350
        order.TotalAmount.Should().Be(385m);       // 350 + 35
    }

    [Fact]
    public void SetStatus_UpdatesStatusAndTimestamp_Confirmed()
    {
        // Arrange
        var items = new List<OrderItem>
        {
            new OrderItem(Guid.NewGuid(), "Product 1", 100m, 1)
        };
        var order = new Order(Guid.NewGuid(), "123 Main St", items);

        // Act
        order.SetStatus(OrderStatus.Confirmed);

        // Assert
        order.Status.Should().Be(OrderStatus.Confirmed);
        order.ConfirmedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void SetStatus_UpdatesStatusAndTimestamp_Shipped()
    {
        // Arrange
        var items = new List<OrderItem>
        {
            new OrderItem(Guid.NewGuid(), "Product 1", 100m, 1)
        };
        var order = new Order(Guid.NewGuid(), "123 Main St", items);

        // Act
        order.SetStatus(OrderStatus.Shipped);

        // Assert
        order.Status.Should().Be(OrderStatus.Shipped);
        order.FulfilledAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void SetStatus_UpdatesStatusAndTimestamp_Cancelled()
    {
        // Arrange
        var items = new List<OrderItem>
        {
            new OrderItem(Guid.NewGuid(), "Product 1", 100m, 1)
        };
        var order = new Order(Guid.NewGuid(), "123 Main St", items);

        // Act
        order.SetStatus(OrderStatus.Cancelled);

        // Assert
        order.Status.Should().Be(OrderStatus.Cancelled);
        order.CancelledAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void AddItem_UpdatesItemsAndRecalculatesAmounts()
    {
        // Arrange
        var items = new List<OrderItem>
        {
            new OrderItem(Guid.NewGuid(), "Product 1", 100m, 1)  // 100
        };
        var order = new Order(Guid.NewGuid(), "123 Main St", items);

        // Act
        order.AddItem(Guid.NewGuid(), "Product 2", 50m, 2);  // + 100 = 200 total

        // Assert
        order.Items.Should().HaveCount(2);
        order.SubtotalAmount.Should().Be(200m);
        order.TaxAmount.Should().Be(20m);
        order.TotalAmount.Should().Be(220m);
    }

    [Fact]
    public void Constructor_WithNotes_SetsNotes()
    {
        // Arrange
        var items = new List<OrderItem>
        {
            new OrderItem(Guid.NewGuid(), "Product 1", 100m, 1)
        };

        // Act
        var order = new Order(Guid.NewGuid(), "123 Main St", items, 0.1m, "Please deliver after 5pm");

        // Assert
        order.Notes.Should().Be("Please deliver after 5pm");
    }
}
