namespace Repair.Services;

/// <summary>
/// Interface for integrating with Inventory Service
/// </summary>
public interface IInventoryService
{
    /// <summary>
    /// Reserve parts for a work order
    /// </summary>
    Task<bool> ReservePartsAsync(Guid workOrderId, List<ReservePartDto> parts);

    /// <summary>
    /// Consume reserved parts when work is completed
    /// </summary>
    Task<bool> ConsumePartsAsync(Guid workOrderId);

    /// <summary>
    /// Release reservation when work order is cancelled
    /// </summary>
    Task<bool> ReleaseReservationAsync(Guid workOrderId);

    /// <summary>
    /// Get inventory item details
    /// </summary>
    Task<InventoryItemDto?> GetItemAsync(Guid itemId);

    /// <summary>
    /// Search for inventory items by name or part number
    /// </summary>
    Task<List<InventoryItemDto>> SearchItemsAsync(string searchTerm, int maxResults = 20);
}

public record ReservePartDto(Guid ItemId, int Quantity);

public record InventoryItemDto(
    Guid Id,
    string Name,
    string? PartNumber,
    int QuantityOnHand,
    int QuantityReserved,
    int QuantityAvailable,
    decimal UnitPrice
);

/// <summary>
/// Placeholder implementation - to be replaced with actual API integration
/// </summary>
public class InventoryServicePlaceholder : IInventoryService
{
    public Task<bool> ConsumePartsAsync(Guid workOrderId)
    {
        // TODO: Implement actual API call to inventory service
        return Task.FromResult(true);
    }

    public Task<InventoryItemDto?> GetItemAsync(Guid itemId)
    {
        // TODO: Implement actual API call to inventory service
        return Task.FromResult<InventoryItemDto?>(new InventoryItemDto(
            itemId,
            "Sample Part",
            "PART-001",
            100,
            0,
            100,
            50.00m
        ));
    }

    public Task<bool> ReleaseReservationAsync(Guid workOrderId)
    {
        // TODO: Implement actual API call to inventory service
        return Task.FromResult(true);
    }

    public Task<bool> ReservePartsAsync(Guid workOrderId, List<ReservePartDto> parts)
    {
        // TODO: Implement actual API call to inventory service
        return Task.FromResult(true);
    }

    public Task<List<InventoryItemDto>> SearchItemsAsync(string searchTerm, int maxResults = 20)
    {
        // TODO: Implement actual API call to inventory service
        return Task.FromResult(new List<InventoryItemDto>
        {
            new InventoryItemDto(Guid.NewGuid(), "Sample Part 1", "PART-001", 100, 0, 100, 50.00m),
            new InventoryItemDto(Guid.NewGuid(), "Sample Part 2", "PART-002", 50, 0, 50, 75.00m)
        });
    }
}
