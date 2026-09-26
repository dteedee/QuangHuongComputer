using BuildingBlocks.Endpoints;
using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Một dòng phiếu chuyển kho.
///
/// <para><see cref="SerialNumbers"/>: với hàng theo dõi serial, người lập phiếu chọn ĐÚNG từng máy
/// (số serial = số lượng). Lúc xuất kho, dòng không chọn sẵn (phiếu cũ) được ghi lại những serial
/// thực sự đã đi — để lúc nhận biết máy nào về, máy nào thiếu.</para>
/// <para><see cref="ReceivedQuantity"/>: null khi chưa nhận; nhỏ hơn <see cref="Quantity"/> là nhận thiếu.</para>
/// </summary>
public class StockTransferItem : Entity<Guid>
{
    public Guid StockTransferId { get; private set; }
    public Guid InventoryItemId { get; private set; }
    public int Quantity { get; private set; }
    public string? ProductName { get; private set; }
    public string? ProductSku { get; private set; }
    public List<string> SerialNumbers { get; private set; } = new();
    public int? ReceivedQuantity { get; private set; }

    /// <summary>Số thiếu khi nhận (0 nếu chưa nhận hoặc nhận đủ).</summary>
    public int Shortage => ReceivedQuantity is int r ? Quantity - r : 0;

    public StockTransferItem(
        Guid inventoryItemId, int quantity, string? productName = null, string? productSku = null,
        IEnumerable<string>? serialNumbers = null)
    {
        Id = Guid.NewGuid();
        InventoryItemId = inventoryItemId;
        Quantity = quantity;
        ProductName = productName;
        ProductSku = productSku;
        SerialNumbers = serialNumbers?.ToList() ?? new List<string>();
    }

    protected StockTransferItem() { }

    /// <summary>Ghi lại serial thực sự đã xuất (dòng lập trước khi có chọn serial).</summary>
    public void RecordShippedSerials(IEnumerable<string> serials) => SerialNumbers = serials.ToList();

    internal void MarkReceived(int received)
    {
        if (received < 0 || received > Quantity)
            throw new DomainException(
                $"Số nhận của '{ProductName ?? ProductSku ?? InventoryItemId.ToString()}' phải từ 0 đến {Quantity}.");
        ReceivedQuantity = received;
    }
}
