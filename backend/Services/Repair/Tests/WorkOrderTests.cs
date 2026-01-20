using Xunit;
using Repair.Domain;

namespace Repair.Tests.Domain;

/// <summary>
/// Unit tests for WorkOrder domain logic
/// These tests verify business rules and status transitions
/// </summary>
public class WorkOrderTests
{
    [Fact]
    public void Constructor_ShouldSetInitialStatusToRequested()
    {
        // Arrange
        var customerId = Guid.NewGuid();

        // Act
        var workOrder = new WorkOrder(customerId, "iPhone 14", "ABC123", "Screen broken");

        // Assert
        Assert.Equal(WorkOrderStatus.Requested, workOrder.Status);
        Assert.Equal(customerId, workOrder.CustomerId);
        Assert.Equal("iPhone 14", workOrder.DeviceModel);
    }

    [Fact]
    public void AssignTechnician_ShouldUpdateStatusToAssigned()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        var technicianId = Guid.NewGuid();

        // Act
        workOrder.AssignTechnician(technicianId);

        // Assert
        Assert.Equal(WorkOrderStatus.Assigned, workOrder.Status);
        Assert.Equal(technicianId, workOrder.TechnicianId);
        Assert.NotNull(workOrder.AssignedAt);
    }

    [Fact]
    public void AssignTechnician_WhenAlreadyInProgress_ShouldThrowException()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());
        workOrder.StartRepair();

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            workOrder.AssignTechnician(Guid.NewGuid())
        );
        Assert.Contains("Cannot assign technician", exception.Message);
    }

    [Fact]
    public void DeclineAssignment_ShouldResetTechnicianAndStatus()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());

        // Act
        workOrder.DeclineAssignment();

        // Assert
        Assert.Equal(WorkOrderStatus.Declined, workOrder.Status);
        Assert.Null(workOrder.TechnicianId);
        Assert.Null(workOrder.AssignedAt);
    }

    [Fact]
    public void MarkAsDiagnosed_ShouldUpdateStatusAndNotes()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());
        var diagnosticNotes = "LCD panel needs replacement";

        // Act
        workOrder.MarkAsDiagnosed(diagnosticNotes);

        // Assert
        Assert.Equal(WorkOrderStatus.Diagnosed, workOrder.Status);
        Assert.Equal(diagnosticNotes, workOrder.TechnicalNotes);
        Assert.NotNull(workOrder.DiagnosedAt);
    }

    [Fact]
    public void CreateQuote_ShouldUpdateStatusToQuoted()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());
        workOrder.MarkAsDiagnosed("Diagnosed");

        var quote = new RepairQuote(
            workOrder.Id,
            partsCost: 100m,
            laborCost: 50m,
            serviceFee: 10m,
            estimatedHours: 2m,
            hourlyRate: 25m
        );

        // Act
        workOrder.CreateQuote(quote);

        // Assert
        Assert.Equal(WorkOrderStatus.Quoted, workOrder.Status);
        Assert.Equal(quote.Id, workOrder.CurrentQuoteId);
        Assert.NotNull(workOrder.QuotedAt);
        Assert.Single(workOrder.Quotes);
    }

    [Fact]
    public void CreateQuote_BeforeDiagnosis_ShouldThrowException()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        var quote = new RepairQuote(workOrder.Id, 100m, 50m, 10m, 2m, 25m);

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            workOrder.CreateQuote(quote)
        );
        Assert.Contains("Must diagnose issue", exception.Message);
    }

    [Fact]
    public void ApproveQuote_ShouldUpdateStatusToApproved()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());
        workOrder.MarkAsDiagnosed("Diagnosed");
        var quote = new RepairQuote(workOrder.Id, 100m, 50m, 10m, 2m, 25m);
        workOrder.CreateQuote(quote);
        workOrder.MarkAwaitingApproval();

        // Act
        workOrder.ApproveQuote();

        // Assert
        Assert.Equal(WorkOrderStatus.Approved, workOrder.Status);
        Assert.NotNull(workOrder.ApprovedAt);
    }

    [Fact]
    public void StartRepair_WhenApproved_ShouldUpdateStatusToInProgress()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());
        workOrder.MarkAsDiagnosed("Diagnosed");
        var quote = new RepairQuote(workOrder.Id, 100m, 50m, 10m, 2m, 25m);
        workOrder.CreateQuote(quote);
        workOrder.MarkAwaitingApproval();
        workOrder.ApproveQuote();

        // Act
        workOrder.StartRepair();

        // Assert
        Assert.Equal(WorkOrderStatus.InProgress, workOrder.Status);
        Assert.NotNull(workOrder.StartedAt);
    }

    [Fact]
    public void CompleteRepair_ShouldCalculateTotalCostWithServiceFee()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());
        workOrder.StartRepair();

        // Act
        workOrder.CompleteRepair(partsCost: 100m, laborCost: 50m, notes: "Completed successfully");

        // Assert
        Assert.Equal(WorkOrderStatus.Completed, workOrder.Status);
        Assert.Equal(100m, workOrder.PartsCost);
        Assert.Equal(50m, workOrder.LaborCost);
        Assert.Equal(150m, workOrder.ActualCost); // Parts + Labor + ServiceFee
        Assert.NotNull(workOrder.FinishedAt);
        Assert.Contains("Completed successfully", workOrder.TechnicalNotes);
    }

    [Fact]
    public void AddPart_ShouldCalculatePartsCost()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        var part1 = new WorkOrderPart(workOrder.Id, Guid.NewGuid(), "LCD Screen", 1, 100m);
        var part2 = new WorkOrderPart(workOrder.Id, Guid.NewGuid(), "Battery", 1, 50m);

        // Act
        workOrder.AddPart(part1);
        workOrder.AddPart(part2);

        // Assert
        Assert.Equal(2, workOrder.Parts.Count);
        Assert.Equal(150m, workOrder.PartsCost);
    }

    [Fact]
    public void RemovePart_ShouldRecalculatePartsCost()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        var part1 = new WorkOrderPart(workOrder.Id, Guid.NewGuid(), "LCD Screen", 1, 100m);
        var part2 = new WorkOrderPart(workOrder.Id, Guid.NewGuid(), "Battery", 1, 50m);
        workOrder.AddPart(part1);
        workOrder.AddPart(part2);

        // Act
        workOrder.RemovePart(part1.Id);

        // Assert
        Assert.Single(workOrder.Parts);
        Assert.Equal(50m, workOrder.PartsCost);
    }

    [Fact]
    public void PutOnHold_ShouldUpdateStatusAndAddNote()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());
        workOrder.StartRepair();

        // Act
        workOrder.PutOnHold("Waiting for customer response");

        // Assert
        Assert.Equal(WorkOrderStatus.OnHold, workOrder.Status);
        Assert.Contains("Waiting for customer response", workOrder.TechnicalNotes);
    }

    [Fact]
    public void ResumeFromHold_ShouldUpdateStatusToInProgress()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        workOrder.AssignTechnician(Guid.NewGuid());
        workOrder.StartRepair();
        workOrder.PutOnHold("Waiting");

        // Act
        workOrder.ResumeFromHold();

        // Assert
        Assert.Equal(WorkOrderStatus.InProgress, workOrder.Status);
    }

    [Fact]
    public void Cancel_ShouldUpdateStatusAndAddReason()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        var reason = "Customer requested cancellation";

        // Act
        workOrder.Cancel(reason);

        // Assert
        Assert.Equal(WorkOrderStatus.Cancelled, workOrder.Status);
        Assert.Contains(reason, workOrder.TechnicalNotes);
    }

    [Fact]
    public void AddNote_ShouldCreateActivityLog()
    {
        // Arrange
        var workOrder = new WorkOrder(Guid.NewGuid(), "iPhone", "123", "Issue");
        var userId = Guid.NewGuid();

        // Act
        workOrder.AddNote("Customer called for update", userId, "John Doe");

        // Assert
        Assert.Single(workOrder.ActivityLogs);
        Assert.Equal("Note added", workOrder.ActivityLogs[0].Activity);
        Assert.Contains("Customer called for update", workOrder.ActivityLogs[0].Description);
    }

    [Fact]
    public void ServiceBookingConstructor_ShouldValidateOnSiteFee()
    {
        // Arrange & Act
        var booking = new ServiceBooking(
            Guid.NewGuid(),
            ServiceType.OnSite,
            "iPhone 14",
            "Screen broken",
            DateTime.UtcNow.AddDays(1),
            TimeSlot.Morning,
            true,
            "John Doe",
            "0123456789",
            "john@example.com"
        );

        // Assert
        Assert.Equal(50.0m, booking.OnSiteFee);
    }

    [Fact]
    public void ServiceBooking_ValidateBooking_ShouldThrowIfTermsNotAccepted()
    {
        // Arrange
        var booking = new ServiceBooking(
            Guid.NewGuid(),
            ServiceType.InShop,
            "iPhone 14",
            "Screen broken",
            DateTime.UtcNow.AddDays(1),
            TimeSlot.Morning,
            false, // Terms not accepted
            "John Doe",
            "0123456789",
            "john@example.com"
        );

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            booking.ValidateBooking()
        );
        Assert.Contains("Terms and conditions must be accepted", exception.Message);
    }

    [Fact]
    public void ServiceBooking_ValidateBooking_ShouldThrowIfOnSiteWithoutAddress()
    {
        // Arrange
        var booking = new ServiceBooking(
            Guid.NewGuid(),
            ServiceType.OnSite,
            "iPhone 14",
            "Screen broken",
            DateTime.UtcNow.AddDays(1),
            TimeSlot.Morning,
            true,
            "John Doe",
            "0123456789",
            "john@example.com"
        );
        // Not setting address

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            booking.ValidateBooking()
        );
        Assert.Contains("Service address is required", exception.Message);
    }

    [Fact]
    public void RepairQuote_Approve_ShouldThrowIfExpired()
    {
        // Arrange
        var quote = new RepairQuote(Guid.NewGuid(), 100m, 50m, 10m, 2m, 25m);
        // Manually set expiration (for testing purposes, you'd use a test helper)
        var expiryField = typeof(RepairQuote).GetProperty("ValidUntil");
        expiryField?.SetValue(quote, DateTime.UtcNow.AddDays(-1));

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() =>
            quote.Approve()
        );
        Assert.Contains("Quote has expired", exception.Message);
    }

    [Fact]
    public void RepairQuote_Reject_ShouldRequireReason()
    {
        // Arrange
        var quote = new RepairQuote(Guid.NewGuid(), 100m, 50m, 10m, 2m, 25m);

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            quote.Reject("")
        );
        Assert.Contains("Rejection reason is required", exception.Message);
    }
}
