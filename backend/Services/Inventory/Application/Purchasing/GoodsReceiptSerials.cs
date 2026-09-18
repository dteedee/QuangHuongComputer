using BuildingBlocks.Endpoints;
using InventoryModule.Domain;

namespace InventoryModule.Application.Purchasing;

/// <summary>
/// Sinh serial cho hàng đạt của một dòng GRN (W2-12 bước 1).
///
/// <para>
/// Trước W2-12 phiếu nhập không sinh serial nào: <c>GRNItem.SerialNumbers</c> chỉ là một chuỗi
/// người dùng gõ vào, còn bảng <c>SerialNumbers</c> trống, nên bảo hành theo máy, chống hàng giả
/// và trả hàng theo serial đều không chạy được.
/// </para>
/// </summary>
internal static class GoodsReceiptSerials
{
    private static readonly char[] Separators = { ',', ';', '\n', '\r', '\t', '|' };

    /// <summary>Tách chuỗi serial người dùng nhập; bỏ khoảng trắng và dòng rỗng.</summary>
    internal static List<string> Parse(string? raw)
        => string.IsNullOrWhiteSpace(raw)
            ? new List<string>()
            : raw.Split(Separators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                 .Distinct(StringComparer.OrdinalIgnoreCase)
                 .ToList();

    /// <summary>
    /// Kiểm tra + dựng các <see cref="SerialNumber"/> cho phần hàng đạt.
    ///
    /// <para>
    /// Sản phẩm thuộc danh mục theo dõi serial thì SỐ SERIAL PHẢI BẰNG SỐ HÀNG ĐẠT — thiếu một cái
    /// là một chiếc máy trong kho không có lai lịch bảo hành. Sản phẩm không theo dõi serial mà vẫn
    /// khai serial thì vẫn ghi nhận (linh kiện có số máy), nhưng không bắt buộc số lượng.
    /// </para>
    /// </summary>
    internal static List<SerialNumber> Build(
        GRNItem line,
        ProductReceiptFacts facts,
        int acceptedQty,
        Guid warehouseId,
        Guid? purchaseOrderId,
        IReadOnlyCollection<string> alreadyInStock)
    {
        var serials = Parse(line.SerialNumbers);

        if (facts.IsSerialTracked && serials.Count != acceptedQty)
            throw new RequestValidationException(
                $"items[{line.Id}].serialNumbers",
                $"Sản phẩm \"{facts.Name}\" theo dõi serial: phải khai đúng {acceptedQty} serial cho phần hàng đạt (đang có {serials.Count}).");

        var duplicates = serials.Where(s => alreadyInStock.Contains(s, StringComparer.OrdinalIgnoreCase)).ToList();
        if (duplicates.Count > 0)
            throw new ConflictException(
                $"Serial đã tồn tại trong kho: {string.Join(", ", duplicates.Take(5))}.");

        if (serials.Count == 0) return new List<SerialNumber>();

        return serials
            .Take(facts.IsSerialTracked ? acceptedQty : serials.Count)
            .Select(serial => new SerialNumber(
                serial,
                line.ProductId,
                warehouseId,
                purchaseOrderId,
                facts.Name,
                facts.Sku,
                facts.WarrantyMonths)
            {
                GoodsReceivedNoteItemId = line.Id
            })
            .ToList();
    }
}
