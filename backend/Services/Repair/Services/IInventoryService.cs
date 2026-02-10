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
/// Actual implementation integrating with Inventory Service
/// </summary>
public class InventoryService : IInventoryService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<InventoryService> _logger;
    private const string InventoryServiceBaseUrl = "http://localhost:5001/api/inventory";

    public InventoryService(IHttpClientFactory httpClientFactory, ILogger<InventoryService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<bool> ReservePartsAsync(Guid workOrderId, List<ReservePartDto> parts)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("InventoryService");

            foreach (var part in parts)
            {
                var response = await client.PostAsJsonAsync(
                    $"{InventoryServiceBaseUrl}/stock/{part.ItemId}/reserve",
                    new
                    {
                        Quantity = part.Quantity,
                        ReferenceId = workOrderId.ToString(),
                        ReferenceType = "WorkOrder"
                    });

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to reserve part {ItemId} for work order {WorkOrderId}",
                        part.ItemId, workOrderId);
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reserving parts for work order {WorkOrderId}", workOrderId);
            return false;
        }
    }

    public async Task<bool> ConsumePartsAsync(Guid workOrderId)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("InventoryService");
            var response = await client.PostAsync(
                $"{InventoryServiceBaseUrl}/reservations/{workOrderId}/fulfill",
                null);

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error consuming parts for work order {WorkOrderId}", workOrderId);
            return false;
        }
    }

    public async Task<bool> ReleaseReservationAsync(Guid workOrderId)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("InventoryService");
            var response = await client.PostAsJsonAsync(
                $"{InventoryServiceBaseUrl}/reservations/{workOrderId}/release",
                new { Reason = "Work order cancelled or changed" });

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error releasing reservation for work order {WorkOrderId}", workOrderId);
            return false;
        }
    }

    public async Task<InventoryItemDto?> GetItemAsync(Guid itemId)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("InventoryService");
            var response = await client.GetAsync($"{InventoryServiceBaseUrl}/stock/{itemId}");

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var item = await response.Content.ReadFromJsonAsync<InventoryItemResponse>();
            if (item == null) return null;

            return new InventoryItemDto(
                item.Id,
                item.ProductName ?? "Unknown",
                item.Barcode,
                item.QuantityOnHand,
                item.ReservedQuantity,
                item.AvailableQuantity,
                item.AverageCost
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory item {ItemId}", itemId);
            return null;
        }
    }

    public async Task<List<InventoryItemDto>> SearchItemsAsync(string searchTerm, int maxResults = 20)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("InventoryService");
            var response = await client.GetAsync(
                $"{InventoryServiceBaseUrl}/stock?search={Uri.EscapeDataString(searchTerm)}&pageSize={maxResults}");

            if (!response.IsSuccessStatusCode)
            {
                return new List<InventoryItemDto>();
            }

            var items = await response.Content.ReadFromJsonAsync<List<InventoryItemResponse>>();
            if (items == null) return new List<InventoryItemDto>();

            return items.Select(i => new InventoryItemDto(
                i.Id,
                i.ProductName ?? "Unknown",
                i.Barcode,
                i.QuantityOnHand,
                i.ReservedQuantity,
                i.AvailableQuantity,
                i.AverageCost
            )).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching inventory items with term '{SearchTerm}'", searchTerm);
            return new List<InventoryItemDto>();
        }
    }

    private record InventoryItemResponse(
        Guid Id,
        Guid ProductId,
        string? ProductName,
        string? Barcode,
        int QuantityOnHand,
        int ReservedQuantity,
        int AvailableQuantity,
        decimal AverageCost
    );
}
