using InventoryModule.Domain;

namespace InventoryModule.Endpoints;

// Request DTO của các nhóm endpoint trong Endpoints/. Gom về một chỗ để mỗi file endpoint chỉ còn
// phần định tuyến + xử lý (quy tắc < 200 LOC/file). Namespace giữ nguyên InventoryModule.Endpoints
// nên không call site nào phải đổi using.

// --- Tồn kho ---

public record ReserveStockDto(
    int Quantity,
    string ReferenceId,
    string ReferenceType,
    Guid? VariantId = null,
    Guid? WarehouseId = null,
    int? ExpirationHours = 24,
    string? Notes = null);

public record ReleaseReservationDto(string Reason);

/// <summary>D10: tồn đầu kỳ — số lượng và giá vốn ban đầu của một dòng tồn.</summary>
public record OpeningBalanceDto(
    Guid ProductId,
    int Quantity,
    decimal UnitCost,
    Guid? VariantId = null,
    Guid? WarehouseId = null,
    string? Notes = null);

// --- Kho ---

public record CreateWarehouseDto(
    string Code,
    string Name,
    string Type,
    string? Address,
    string? City,
    string? District,
    string? Ward,
    string? Phone,
    string? ManagerName,
    string? ManagerEmail,
    string? Description,
    int Capacity = 10000,
    bool IsDefault = false);

public record UpdateWarehouseDto(
    string Name,
    string Type,
    string? Address,
    string? City,
    string? District,
    string? Ward,
    string? Phone,
    string? ManagerName,
    string? ManagerEmail,
    string? Description,
    int Capacity = 10000,
    bool IsDefault = false);

// --- Chuyển kho ---

public record CreateTransferDto(
    Guid FromWarehouseId,
    Guid ToWarehouseId,
    List<TransferItemDto> Items,
    string? RequestedBy,
    string? Notes);

/// <param name="ProductName">Bỏ qua — tên/SKU chụp từ Catalog phía server, không tin client.</param>
/// <param name="SerialNumbers">Bắt buộc cho hàng theo dõi serial: đúng <paramref name="Quantity"/> serial đang InStock ở kho xuất.</param>
public record TransferItemDto(
    Guid InventoryItemId, int Quantity, string? ProductName, string? ProductSku,
    List<string>? SerialNumbers = null);

/// <summary>Nhận hàng chuyển kho. Không gửi body (hoặc <c>Lines</c> rỗng) = nhận đủ mọi dòng.</summary>
public record ReceiveTransferDto(List<ReceiveTransferLineDto>? Lines, string? Note);

/// <param name="ItemId">Id dòng phiếu (<c>StockTransferItem.Id</c>).</param>
/// <param name="ReceivedSerials">Hàng serial: những máy thực sự nhận được (tập con của máy đã xuất).</param>
public record ReceiveTransferLineDto(Guid ItemId, int ReceivedQuantity, List<string>? ReceivedSerials);

// --- Serial ---

public record CreateSerialDto(
    string Serial,
    Guid ProductId,
    Guid? WarehouseId,
    Guid? PurchaseOrderId,
    string? ProductName,
    string? ProductSku,
    int? WarrantyMonths = null);

public record BatchCreateSerialDto(
    List<string> Serials,
    Guid ProductId,
    Guid? WarehouseId,
    Guid? PurchaseOrderId,
    string? ProductName,
    string? ProductSku,
    int? WarrantyMonths = null);

public record TransferSerialDto(Guid WarehouseId);

public record UpdateSerialStatusDto(
    string Action,    // sell, reserve, release, return, defective, repair, complete-repair
    Guid? ReferenceId,
    string? CustomerId,
    string? Notes);

// --- Kiểm kê ---

public record CreateCountSessionDto(
    Guid? WarehouseId,
    CountScope Scope,
    Guid? CategoryId,
    DateTime? CountDate,
    string? Notes);

public record RecordCountItemDto(Guid ItemId, int CountedQuantity, string? CountedBy, string? Notes);

// --- Phiếu điều chỉnh ---

public record CreateStockAdjustmentDto(
    Guid WarehouseId,
    AdjustmentType Type,
    string Reason,
    List<StockAdjustmentLineDto> Items);

public record StockAdjustmentLineDto(
    Guid InventoryItemId,
    int QuantityAdjusted,
    string? ProductName,
    string? ProductSku);

public record RejectAdjustmentDto(string Reason);

// --- Phiếu xuất kho ---

public record CreateDNDto(
    Guid? WarehouseId,
    Guid? OrderId,
    string DeliveredBy,
    DNReason Reason,
    DateTime? DocumentDate,
    string? Notes,
    List<CreateDNItemDto> Items);

public record CreateDNItemDto(Guid ProductId, string ProductName, int Quantity, string? SerialNumbers);
