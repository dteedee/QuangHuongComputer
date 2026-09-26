namespace BuildingBlocks.Messaging.IntegrationEvents;

// phase-14 (W1-5) step 3 - contracts only, not yet published (Repair/Warranty wave-2 wire them).

public record RepairCompletedEvent(Guid BookingId, Guid CustomerId, string DeviceDescription, decimal FinalCost, DateTime OccurredOn);

public record WarrantyClaimUpdatedEvent(Guid ClaimId, Guid CustomerId, string SerialNumber, string NewStatus, DateTime OccurredOn);

/// <summary>
/// Phiếu sửa vừa được ghi nhận thanh toán, hoặc bị huỷ sau khi đã thanh toán. Payload cố ý tối
/// thiểu: bên nhận (HR — hoa hồng kỹ thuật) đọc lại trạng thái thật qua
/// <c>BuildingBlocks.Contracts.IRepairCommissionSourceQuery</c>, nên sự kiện đến trễ/trùng/đảo
/// thứ tự đều vô hại.
/// </summary>
public record RepairWorkOrderSettlementChangedEvent(Guid WorkOrderId, DateTime OccurredOn);
