using FluentAssertions;
using Repair.Domain;
using Xunit;

namespace Repair.Tests.Domain;

public class WorkOrderTests
{
    [Fact]
    public void Constructor_SetsStatusToPending()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var description = "Fix my computer";

        // Act
        var wo = new WorkOrder(customerId, "Dell XPS", "SN123", description);

        // Assert
        wo.Id.Should().NotBeEmpty();
        wo.TicketNumber.Should().StartWith("TKT-");
        wo.Status.Should().Be(WorkOrderStatus.Pending);
        wo.CustomerId.Should().Be(customerId);
        wo.Description.Should().Be(description);
    }

    [Fact]
    public void AssignTechnician_SetsStatusToAssigned()
    {
        // Arrange
        var wo = new WorkOrder(Guid.NewGuid(), "Dell XPS", "SN123", "Fix it");
        var techId = Guid.NewGuid();

        // Act
        wo.AssignTechnician(techId);

        // Assert
        wo.TechnicianId.Should().Be(techId);
        wo.Status.Should().Be(WorkOrderStatus.Assigned);
    }

    [Fact]
    public void StartRepair_FromAssigned_SetsStatusToInProgress()
    {
        // Arrange
        var wo = new WorkOrder(Guid.NewGuid(), "Dell XPS", "SN123", "Fix it");
        wo.AssignTechnician(Guid.NewGuid());

        // Act
        wo.StartRepair();

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.InProgress);
        wo.StartedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void StartRepair_FromPending_ThrowsException()
    {
        // Arrange
        var wo = new WorkOrder(Guid.NewGuid(), "Dell XPS", "SN123", "Fix it");

        // Act
        var act = () => wo.StartRepair();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Work order must be assigned before starting");
    }

    [Fact]
    public void CompleteRepair_FromInProgress_SetsStatusToCompleted()
    {
        // Arrange
        var wo = new WorkOrder(Guid.NewGuid(), "Dell XPS", "SN123", "Fix it");
        wo.AssignTechnician(Guid.NewGuid());
        wo.StartRepair();

        // Act
        wo.CompleteRepair(100m, 50m, "Fixed fan");

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.Completed);
        wo.PartsCost.Should().Be(100m);
        wo.LaborCost.Should().Be(50m);
        wo.TotalCost.Should().Be(150m);
        wo.TechnicalNotes.Should().Be("Fixed fan");
        wo.FinishedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void CompleteRepair_FromPending_ThrowsException()
    {
        // Arrange
        var wo = new WorkOrder(Guid.NewGuid(), "Dell XPS", "SN123", "Fix it");

        // Act
        var act = () => wo.CompleteRepair(100m, 50m, "Fixed");

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Work order must be in progress or on hold to complete");
    }

    [Fact]
    public void Cancel_SetsStatusAndReason()
    {
        // Arrange
        var wo = new WorkOrder(Guid.NewGuid(), "Dell XPS", "SN123", "Fix it");

        // Act
        wo.Cancel("Changed mind");

        // Assert
        wo.Status.Should().Be(WorkOrderStatus.Cancelled);
        wo.TechnicalNotes.Should().Contain("Cancelled: Changed mind");
    }
}
