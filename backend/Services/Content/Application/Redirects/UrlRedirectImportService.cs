using BuildingBlocks.Spreadsheet;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Application.Redirects;

public sealed record UrlRedirectImportReport(
    string Mode, int TotalRows, int Created, int Updated, int Skipped, IReadOnlyList<ExcelImportError> Errors)
{
    public bool IsValid => Errors.Count == 0;
}

/// <summary>
/// Bulk import/export of the redirect table for migrating an old website (hundreds of URLs at a
/// time). Reuses the back office's one import pipeline (<see cref="ExcelImportPipeline{TRow}"/>,
/// CSV or XLSX) and the same snapshot rules as a single admin save, so a file can never slip in a
/// chain, a loop or a reserved path that the form would have refused.
///
/// All-or-nothing: <c>commit</c> writes only when EVERY row validates. <c>dryRun</c> (default)
/// reports what would happen.
/// </summary>
public sealed class UrlRedirectImportService
{
    private readonly ContentDbContext _db;
    private readonly UrlRedirectTable _table;

    public UrlRedirectImportService(ContentDbContext db, UrlRedirectTable table)
    {
        _db = db;
        _table = table;
    }

    public static byte[] BuildCsvTemplate() => CsvTable.Write(new[] { UrlRedirectImportColumns.Headers });

    /// <exception cref="InvalidDataException">The FILE is unusable (format, size, missing header).</exception>
    public async Task<UrlRedirectImportReport> ImportAsync(
        Stream file, string fileName, bool commit, bool updateDuplicates, string? actorId, CancellationToken ct)
    {
        var rules = await UrlRedirectRules.LoadAsync(_db, ct);
        var createdInFile = new HashSet<Guid>();

        IEnumerable<string> Plan(UrlRedirectImportRow row)
        {
            var check = rules.Validate(row.ToInput(), existingId: null);
            if (check.Failure == UrlRedirectRuleFailure.Duplicate)
            {
                var duplicateOf = check.DuplicateOfId!.Value;
                if (createdInFile.Contains(duplicateOf)) return new[] { "Trùng đường dẫn cũ với một dòng khác trong tệp." };
                if (!updateDuplicates) { row.Action = UrlRedirectImportAction.Skip; return Array.Empty<string>(); }

                check = rules.Validate(row.ToInput(), duplicateOf);
                if (!check.Ok) return new[] { check.Error! };
                row.Action = UrlRedirectImportAction.Update;
                row.ExistingId = duplicateOf;
            }
            else if (!check.Ok)
            {
                return new[] { check.Error! };
            }
            else
            {
                row.Action = UrlRedirectImportAction.Create;
                row.ExistingId = Guid.NewGuid();
                createdInFile.Add(row.ExistingId.Value);
            }

            row.Value = check.Value;
            rules.Track(row.ExistingId!.Value, check.Value!);
            return Array.Empty<string>();
        }

        var pipeline = new ExcelImportPipeline<UrlRedirectImportRow>(UrlRedirectImportColumns.Build(), Plan);
        var parsed = ExcelImportPipeline<UrlRedirectImportRow>.IsCsvFileName(fileName)
            ? pipeline.ReadCsv(file)
            : pipeline.Read(file);

        var created = parsed.Rows.Count(r => r.Action == UrlRedirectImportAction.Create);
        var updated = parsed.Rows.Count(r => r.Action == UrlRedirectImportAction.Update);
        var skipped = parsed.Rows.Count(r => r.Action == UrlRedirectImportAction.Skip);
        var report = new UrlRedirectImportReport(commit ? "commit" : "dryRun", parsed.TotalRows, created, updated, skipped, parsed.Errors);

        if (!commit || !report.IsValid || created + updated == 0) return report;

        await WriteAsync(parsed.Rows, actorId, ct);
        await _table.InvalidateAsync(ct);
        return report;
    }

    private async Task WriteAsync(IReadOnlyList<UrlRedirectImportRow> rows, string? actorId, CancellationToken ct)
    {
        var updateIds = rows.Where(r => r.Action == UrlRedirectImportAction.Update).Select(r => r.ExistingId!.Value).ToList();
        var existing = await _db.UrlRedirects.Where(r => updateIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id, ct);

        foreach (var row in rows)
        {
            if (row.Value is not { } v) continue; // skipped duplicates carry no value
            if (row.Action == UrlRedirectImportAction.Create)
            {
                _db.UrlRedirects.Add(new UrlRedirect(v.FromPath, v.ToPath, v.StatusCode, v.Note, UrlRedirectSources.Import, actorId)
                {
                    IsActive = v.IsActive,
                });
            }
            else if (row.Action == UrlRedirectImportAction.Update && existing.TryGetValue(row.ExistingId!.Value, out var target))
            {
                target.Update(v.FromPath, v.ToPath, v.StatusCode, v.Note, actorId);
                target.IsActive = v.IsActive;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    /// <summary>Whole table as CSV, same leading columns as the import (re-importable), plus read-only stats.</summary>
    public async Task<byte[]> ExportCsvAsync(CancellationToken ct)
    {
        var rows = await _db.UrlRedirects.AsNoTracking().OrderBy(r => r.FromPath).ToListAsync(ct);
        var header = UrlRedirectImportColumns.Headers.Concat(new[] { "Lượt truy cập", "Truy cập gần nhất", "Nguồn" }).ToArray();
        var lines = new List<IReadOnlyList<string?>> { header };
        lines.AddRange(rows.Select(r => (IReadOnlyList<string?>)new[]
        {
            r.FromPath, r.ToPath, r.StatusCode.ToString(), r.Note, r.IsActive ? "1" : "0",
            r.HitCount.ToString(), r.LastHitAt?.ToString("yyyy-MM-dd HH:mm:ss"), r.Source,
        }));
        return CsvTable.Write(lines);
    }
}
