using BuildingBlocks.Database;
using BuildingBlocks.Spreadsheet;
using Catalog.Infrastructure;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.BulkOps;

/// <summary>
/// Orchestrates the opening-balance import (phase-67 Implementation Steps #1-3): read + validate
/// through <see cref="OpeningBalanceRowValidator"/>, commit through <see cref="IStockLedger"/> —
/// this track NEVER writes an <c>InventoryItem</c> directly (Architecture).
/// </summary>
internal sealed class OpeningBalanceImportService
{
    private readonly CatalogDbContext _catalog;
    private readonly InventoryDbContext _db;
    private readonly IStockLedger _ledger;

    public OpeningBalanceImportService(CatalogDbContext catalog, InventoryDbContext db, IStockLedger ledger)
    {
        _catalog = catalog;
        _db = db;
        _ledger = ledger;
    }

    public async Task<byte[]> BuildTemplateAsync(CancellationToken ct)
    {
        var lookup = await OpeningBalanceLookup.LoadAsync(_catalog, _db, ct);
        var pipeline = new ExcelImportPipeline<OpeningBalanceImportRow>(OpeningBalanceImportColumns.Build());
        return BulkOpsLookupSheets.BuildOpeningBalanceTemplate(pipeline, lookup);
    }

    public async Task<(OpeningBalanceImportReport report, ExcelImportResult<OpeningBalanceImportRow> parsed, ExcelImportPipeline<OpeningBalanceImportRow> pipeline)>
        RunAsync(Stream upload, string mode, string performedBy, string? fileName, CancellationToken ct)
    {
        var lookup = await OpeningBalanceLookup.LoadAsync(_catalog, _db, ct);
        var validator = new OpeningBalanceRowValidator(lookup);
        var pipeline = new ExcelImportPipeline<OpeningBalanceImportRow>(OpeningBalanceImportColumns.Build(), validator.Validate);

        var parsed = pipeline.Read(upload);
        var report = new OpeningBalanceImportReport { Mode = mode, TotalRows = parsed.TotalRows };
        report.Errors.AddRange(parsed.Errors);

        if (mode == "commit" && report.IsValid && parsed.Rows.Count > 0)
        {
            report.Committed = await CommitAsync(parsed.Rows, performedBy, fileName, ct);
        }

        return (report, parsed, pipeline);
    }

    /// <summary>NFR "one transaction per commit": every row's <c>Receive</c> plus its serials share
    /// the single ambient transaction opened by <c>InTransactionAsync</c> — either the whole file
    /// lands, or none of it does.</summary>
    private async Task<int> CommitAsync(List<OpeningBalanceImportRow> rows, string performedBy, string? fileName, CancellationToken ct)
    {
        using var scope = AuditScope.Bulk("Nhập tồn đầu kỳ", fileName);

        return await _ledger.InTransactionAsync(async token =>
        {
            var committed = 0;
            foreach (var row in rows)
            {
                var ctx = new StockLedgerContext(
                    performedBy,
                    ReferenceId: row.ProductId.ToString(),
                    ReferenceType: "OpeningBalanceImport",
                    DocumentReference: fileName,
                    Notes: $"Tồn đầu kỳ — SKU {row.Sku}, kho {row.WarehouseCode}");

                await _ledger.ReceiveAsync(
                    new StockLocation(row.ProductId, null, row.WarehouseId),
                    row.Quantity, row.UnitCostExclVat, ctx, StockMovementReason.OpeningBalance, token);

                if (row.Serials.Count > 0)
                {
                    var serials = row.Serials.Select(serial => new SerialNumber(
                        serial, row.ProductId, row.WarehouseId, purchaseOrderId: null,
                        row.ProductName, row.Sku, warrantyMonths: row.WarrantyMonths));
                    _db.SerialNumbers.AddRange(serials);
                }

                committed++;
            }

            await _db.SaveChangesAsync(token); // Flush serials thêm ở trên (Receive đã tự lưu bút toán).
            return committed;
        }, ct);
    }
}
