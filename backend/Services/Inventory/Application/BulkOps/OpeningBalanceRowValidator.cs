namespace InventoryModule.Application.BulkOps;

/// <summary>
/// Row-level rule for the opening-balance import (phase-67 Implementation Steps #2): resolves the
/// SKU and warehouse code, enforces the zero-quantity + no-movement precondition (D10 rule 5),
/// and — for serial-tracked categories (D08) — that the serial count matches the quantity and
/// that no serial repeats within the file or already exists in the database.
///
/// <para>Runs synchronously inside <c>ExcelImportPipeline&lt;TRow&gt;</c>'s validation hook, so it
/// only ever reads from <see cref="OpeningBalanceLookup"/> (loaded once before <c>Read</c>) plus
/// its own in-memory "seen in this file" sets — never the database directly.</para>
/// </summary>
internal sealed class OpeningBalanceRowValidator
{
    private readonly OpeningBalanceLookup _lookup;
    private readonly HashSet<(Guid ProductId, Guid WarehouseId)> _seenPairs = new();
    private readonly HashSet<string> _seenSerials = new(StringComparer.OrdinalIgnoreCase);

    public OpeningBalanceRowValidator(OpeningBalanceLookup lookup) => _lookup = lookup;

    public IEnumerable<string> Validate(OpeningBalanceImportRow row)
    {
        var errors = new List<string>();

        if (!_lookup.ProductsBySku.TryGetValue(row.Sku, out var product))
        {
            errors.Add($"Không tìm thấy SKU '{row.Sku}' đang hoạt động trong danh mục sản phẩm.");
            return errors; // Không đủ để kiểm tiếp — SKU sai thì mọi thứ khác vô nghĩa.
        }

        if (!_lookup.WarehousesByCode.TryGetValue(row.WarehouseCode, out var warehouseId))
        {
            errors.Add($"Không tìm thấy mã kho '{row.WarehouseCode}' đang hoạt động.");
            return errors;
        }

        row.ProductId = product.ProductId;
        row.ProductName = product.Name;
        row.IsSerialTracked = product.IsSerialTracked;
        row.WarrantyMonths = product.WarrantyMonths;
        row.WarehouseId = warehouseId;

        // D10 rule 5 / phase-67: đã có phát sinh HOẶC đã có số dư -> từ chối, dùng kiểm kê/điều
        // chỉnh thay vì tồn đầu kỳ. Không có dòng InventoryItem nào cho cặp này thì coi là 0/chưa
        // phát sinh — được phép.
        if (_lookup.ExistingStock.TryGetValue((product.ProductId, warehouseId), out var existing)
            && (existing.QuantityOnHand != 0 || existing.HasAnyMovement))
        {
            errors.Add($"SKU '{row.Sku}' tại kho '{row.WarehouseCode}' đã có phát sinh hoặc còn số dư — dùng phiếu kiểm kê hoặc phiếu điều chỉnh.");
        }

        var pairKey = (product.ProductId, warehouseId);
        if (!_seenPairs.Add(pairKey))
        {
            errors.Add($"SKU '{row.Sku}' tại kho '{row.WarehouseCode}' bị lặp lại trong chính tệp này.");
        }

        ValidateSerials(row, errors);

        return errors;
    }

    private void ValidateSerials(OpeningBalanceImportRow row, List<string> errors)
    {
        var serials = string.IsNullOrWhiteSpace(row.SerialsRaw)
            ? new List<string>()
            : row.SerialsRaw.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

        if (row.IsSerialTracked && serials.Count != row.Quantity)
        {
            errors.Add($"SKU '{row.Sku}' thuộc danh mục theo dõi serial: cần đúng {row.Quantity} serial (đang có {serials.Count}).");
            return; // Số lượng đã sai thì không kiểm trùng nữa — tránh lấn át bằng lỗi thứ 2.
        }

        var inRowDuplicates = serials
            .GroupBy(s => s, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();
        if (inRowDuplicates.Count > 0)
        {
            errors.Add($"Serial lặp lại trong cùng dòng: {string.Join(", ", inRowDuplicates)}.");
        }

        foreach (var serial in serials.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (_lookup.ExistingSerials.Contains(serial))
            {
                errors.Add($"Serial '{serial}' đã tồn tại trong hệ thống.");
            }
            else if (!_seenSerials.Add(serial))
            {
                errors.Add($"Serial '{serial}' bị lặp lại trong tệp này (ở một dòng khác).");
            }
            else
            {
                row.Serials.Add(serial);
            }
        }
    }
}
