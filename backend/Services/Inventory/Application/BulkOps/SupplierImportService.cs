using BuildingBlocks.Database;
using BuildingBlocks.Spreadsheet;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.BulkOps;

/// <summary>
/// Orchestrates the supplier import (phase-67 Implementation Steps #4): match on tax code, then
/// on name; never create a duplicate silently — a match updates the existing supplier's contact
/// info instead of adding a second row for the same company.
/// </summary>
internal sealed class SupplierImportService
{
    private readonly InventoryDbContext _db;

    public SupplierImportService(InventoryDbContext db) => _db = db;

    public async Task<byte[]> BuildTemplateAsync(CancellationToken ct)
    {
        var names = await _db.Suppliers.AsNoTracking().OrderBy(s => s.Name).Select(s => s.Name).ToListAsync(ct);
        var pipeline = new ExcelImportPipeline<SupplierImportRow>(SupplierImportColumns.Build());
        return BulkOpsLookupSheets.BuildSupplierTemplate(pipeline, names);
    }

    public async Task<(SupplierImportReport report, ExcelImportResult<SupplierImportRow> parsed, ExcelImportPipeline<SupplierImportRow> pipeline)>
        RunAsync(Stream upload, string mode, CancellationToken ct)
    {
        var byTaxCode = await _db.Suppliers.AsNoTracking()
            .Where(s => s.TaxCode != null && s.TaxCode != "")
            .ToDictionaryAsync(s => s.TaxCode!.Trim(), s => s.Id, StringComparer.OrdinalIgnoreCase, ct);
        var byName = await _db.Suppliers.AsNoTracking()
            .ToDictionaryAsync(s => s.Name.Trim(), s => s.Id, StringComparer.OrdinalIgnoreCase, ct);

        var pipeline = new ExcelImportPipeline<SupplierImportRow>(SupplierImportColumns.Build(), row =>
        {
            if (row.TaxCode is not null && byTaxCode.TryGetValue(row.TaxCode.Trim(), out var byTax))
            {
                row.MatchedSupplierId = byTax;
                row.MatchedBy = "taxCode";
            }
            else if (byName.TryGetValue(row.Name.Trim(), out var byNameId))
            {
                row.MatchedSupplierId = byNameId;
                row.MatchedBy = "name";
            }
            return Array.Empty<string>(); // Khớp trùng không phải lỗi — quyết định tạo mới/cập nhật, không chặn dòng.
        });

        var parsed = pipeline.Read(upload);
        var report = new SupplierImportReport { Mode = mode, TotalRows = parsed.TotalRows };
        report.Errors.AddRange(parsed.Errors);
        report.Created = parsed.Rows.Count(r => r.MatchedSupplierId is null);
        report.Matched = parsed.Rows.Count(r => r.MatchedSupplierId is not null);

        if (mode == "commit" && report.IsValid && parsed.Rows.Count > 0)
        {
            await CommitAsync(parsed.Rows, ct);
        }

        return (report, parsed, pipeline);
    }

    /// <summary>NFR "one transaction per commit".</summary>
    private async Task CommitAsync(List<SupplierImportRow> rows, CancellationToken ct)
    {
        using var scope = AuditScope.Bulk("Nhập nhà cung cấp");
        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var toUpdateIds = rows.Where(r => r.MatchedSupplierId.HasValue).Select(r => r.MatchedSupplierId!.Value).ToList();
        var tracked = toUpdateIds.Count == 0
            ? new List<Supplier>()
            : await _db.Suppliers.Where(s => toUpdateIds.Contains(s.Id)).ToListAsync(ct);
        var trackedById = tracked.ToDictionary(s => s.Id);

        var sequence = 0;
        foreach (var row in rows)
        {
            if (row.MatchedSupplierId is { } id)
            {
                var supplier = trackedById[id];
                supplier.UpdateContact(supplier.ContactPerson, supplier.ContactTitle, row.Email, row.Phone, supplier.Fax);
                supplier.UpdateAddress(row.Address, supplier.Ward, supplier.District, supplier.City, supplier.Country, supplier.PostalCode);
                supplier.UpdateBusinessInfo(row.TaxCode, supplier.BankAccount, supplier.BankName, supplier.BankBranch,
                    row.PaymentTerms, supplier.PaymentDays, supplier.CreditLimit);
            }
            else
            {
                sequence++;
                var code = $"NCC-{DateTime.UtcNow:yyMMddHHmmss}{sequence:000}";
                var supplier = new Supplier(code, row.Name, contactPerson: row.Name, row.Email, row.Phone, row.Address,
                    paymentTerms: row.PaymentTerms);
                supplier.UpdateBusinessInfo(row.TaxCode, null, null, null, row.PaymentTerms, null, 0);
                _db.Suppliers.Add(supplier);
            }
        }

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
