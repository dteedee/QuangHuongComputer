using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;

namespace HR.Application.Commission;

/// <summary>
/// Repair báo "phiếu X vừa thanh toán / bị huỷ sau thanh toán" -> HR đối soát đúng phiếu đó.
/// Nội dung sự kiện không được tin: dịch vụ đọc lại trạng thái thật qua contract, nên sự kiện
/// trùng hay đến trễ đều không tạo khoản thứ hai (khoá duy nhất theo nguồn).
/// </summary>
public sealed class RepairSettlementCommissionConsumer : IConsumer<RepairWorkOrderSettlementChangedEvent>
{
    private readonly CommissionAccrualService _accrual;

    public RepairSettlementCommissionConsumer(CommissionAccrualService accrual) => _accrual = accrual;

    public Task Consume(ConsumeContext<RepairWorkOrderSettlementChangedEvent> context)
        => _accrual.ReconcileWorkOrderAsync(context.Message.WorkOrderId, context.CancellationToken);
}
