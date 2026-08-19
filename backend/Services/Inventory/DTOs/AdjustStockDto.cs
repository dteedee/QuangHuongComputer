namespace InventoryModule.DTOs;

// Request body cho PUT /api/inventory/stock/{id}/adjust — điều chỉnh tồn kho thủ công.
public record AdjustStockDto(int Amount, string Reason);
