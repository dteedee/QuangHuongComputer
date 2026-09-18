using BuildingBlocks.Spreadsheet;
using ClosedXML.Excel;
using InventoryModule.Domain;

namespace InventoryModule.Application.BulkOps;

/// <summary>
/// Implementation Steps #6: "the data sheet plus a DanhMuc lookup sheet (warehouses and
/// suppliers) built from the database as data validation, so nobody has to know an internal
/// code." Re-opens the bytes <c>ExcelImportPipeline.BuildTemplate</c> produced, same approach as
/// Catalog's <c>ProductImportWorkbookExtras</c> — the package is already a transitive dependency.
/// </summary>
internal static class BulkOpsLookupSheets
{
    private const int FirstDataRow = 3; // Hàng 1 = tiêu đề, hàng 2 = gợi ý (ExcelImportPipeline.BuildTemplate).
    private const int LastDataRow = ExcelImportPipeline<OpeningBalanceImportRow>.DefaultMaxRows + 2;

    /// <summary>Opening-balance template: DanhMuc lists active warehouse codes (dropdown on cột
    /// "Mã kho") and active SKUs (dropdown on cột "Mã SKU") — a shop owner types quantities, not
    /// internal codes (IR w0 spirit: never make a non-technical operator guess a code).</summary>
    public static byte[] BuildOpeningBalanceTemplate(ExcelImportPipeline<OpeningBalanceImportRow> pipeline, OpeningBalanceLookup lookup)
    {
        using var workbook = OpenGenerated(pipeline);
        var sheet = AddDanhMucSheet(workbook, "Mã kho", "Mã SKU");

        var warehouseCodes = lookup.WarehousesByCode.Keys.OrderBy(c => c, StringComparer.OrdinalIgnoreCase).ToList();
        var skus = lookup.ProductsBySku.Keys.OrderBy(s => s, StringComparer.OrdinalIgnoreCase).ToList();
        WriteColumn(sheet, 1, warehouseCodes);
        WriteColumn(sheet, 2, skus);

        var dataSheet = workbook.Worksheets.Worksheet(1);
        ApplyListValidation(dataSheet, columnIndex: 2, sheet, sourceColumn: 1, warehouseCodes.Count); // "Mã kho"
        ApplyListValidation(dataSheet, columnIndex: 1, sheet, sourceColumn: 2, skus.Count);            // "Mã SKU"

        return Save(workbook);
    }

    /// <summary>Supplier template: DanhMuc lists the valid <see cref="PaymentTermType"/> codes
    /// (dropdown on cột "Điều khoản thanh toán") plus existing supplier names, so staff can see at
    /// a glance who is already in the system before typing a near-duplicate.</summary>
    public static byte[] BuildSupplierTemplate(ExcelImportPipeline<SupplierImportRow> pipeline, IReadOnlyList<string> existingSupplierNames)
    {
        using var workbook = OpenGenerated(pipeline);
        var sheet = AddDanhMucSheet(workbook, "Điều khoản thanh toán hợp lệ", "Nhà cung cấp đã có (tránh trùng)");

        var terms = Enum.GetNames<PaymentTermType>().ToList();
        WriteColumn(sheet, 1, terms);
        WriteColumn(sheet, 2, existingSupplierNames);

        var dataSheet = workbook.Worksheets.Worksheet(1);
        ApplyListValidation(dataSheet, columnIndex: SupplierImportColumns.PaymentTermsColumnIndex, sheet, sourceColumn: 1, terms.Count);

        return Save(workbook);
    }

    private static XLWorkbook OpenGenerated<TRow>(ExcelImportPipeline<TRow> pipeline) where TRow : new()
        => new(new MemoryStream(pipeline.BuildTemplate()));

    private static IXLWorksheet AddDanhMucSheet(XLWorkbook workbook, string header1, string header2)
    {
        var sheet = workbook.Worksheets.Add("DanhMuc");
        sheet.Cell(1, 1).Value = header1;
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Cell(1, 2).Value = header2;
        sheet.Cell(1, 2).Style.Font.Bold = true;
        sheet.Column(1).Width = 30;
        sheet.Column(2).Width = 40;
        return sheet;
    }

    private static void WriteColumn(IXLWorksheet sheet, int column, IReadOnlyList<string> values)
    {
        for (var i = 0; i < values.Count; i++) sheet.Cell(i + 2, column).Value = values[i];
    }

    private static void ApplyListValidation(IXLWorksheet dataSheet, int columnIndex, IXLWorksheet lookupSheet, int sourceColumn, int count)
    {
        if (count == 0) return;
        var sourceRange = lookupSheet.Range(2, sourceColumn, count + 1, sourceColumn);
        dataSheet.Range(FirstDataRow, columnIndex, LastDataRow, columnIndex).CreateDataValidation().List(sourceRange);
    }

    private static byte[] Save(XLWorkbook workbook)
    {
        using var output = new MemoryStream();
        workbook.SaveAs(output);
        return output.ToArray();
    }
}
