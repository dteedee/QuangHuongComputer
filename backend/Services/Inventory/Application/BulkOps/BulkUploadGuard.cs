using System.IO.Compression;
using BuildingBlocks.Endpoints;

namespace InventoryModule.Application.BulkOps;

/// <summary>
/// Non-functional requirements (phase-67): ".xlsx only, &lt;= 10MB, magic-byte checked, macros
/// rejected, cell VALUES only". <c>ExcelImportPipeline</c> (W1-3) already caps size and row count,
/// but does not check the byte signature or look for a macro project — both checks belong to this
/// track because they are about what is safe to hand to ClosedXML at all, before a single row is
/// parsed.
///
/// <para>
/// An <c>.xlsx</c>/<c>.xlsm</c> file is a zip. The magic-byte check rejects anything that is not a
/// zip before it is decompressed at all (a non-zip "renamed" upload). The macro check then opens
/// the zip's central directory (cheap — it does not inflate entries) and rejects a workbook that
/// contains <c>xl/vbaProject.bin</c>, which is what turns a plain <c>.xlsx</c> into a macro-enabled
/// <c>.xlsm</c> regardless of the file's extension.
/// </para>
/// </summary>
internal static class BulkUploadGuard
{
    internal const long MaxBytes = 10 * 1024 * 1024; // 10 MB (phase-67 NFR)
    private static readonly byte[] ZipSignature = { 0x50, 0x4B, 0x03, 0x04 };

    /// <summary>Reads the upload fully into memory (never returns a non-seekable stream downstream:
    /// <see cref="ExcelImportPipeline{TRow}"/> and this guard both need <c>Seek</c>), enforcing the
    /// 10 MB cap while copying so an oversized stream never sits fully in RAM.</summary>
    internal static async Task<MemoryStream> ReadAndValidateAsync(Stream upload, string fileName, CancellationToken ct)
    {
        if (!fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            throw new RequestValidationException("file", "Chỉ nhận tệp .xlsx.");

        var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await upload.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + read > MaxBytes)
                throw new RequestValidationException("file", "Tệp vượt quá giới hạn 10 MB.");
            await buffer.WriteAsync(chunk.AsMemory(0, read), ct);
        }

        if (buffer.Length < ZipSignature.Length)
            throw new RequestValidationException("file", "Tệp không phải là tệp Excel (.xlsx) hợp lệ.");

        buffer.Position = 0;
        var header = new byte[ZipSignature.Length];
        _ = buffer.Read(header, 0, header.Length);
        buffer.Position = 0;
        if (!header.AsSpan().SequenceEqual(ZipSignature))
            throw new RequestValidationException("file", "Tệp không phải là tệp Excel (.xlsx) hợp lệ (sai định dạng nhị phân).");

        RejectMacros(buffer);
        buffer.Position = 0;
        return buffer;
    }

    private static void RejectMacros(MemoryStream buffer)
    {
        buffer.Position = 0;
        try
        {
            using var zip = new ZipArchive(buffer, ZipArchiveMode.Read, leaveOpen: true);
            if (zip.Entries.Any(e => e.FullName.Equals("xl/vbaProject.bin", StringComparison.OrdinalIgnoreCase)))
                throw new RequestValidationException("file", "Tệp chứa macro (VBA) — không được phép. Lưu lại dưới dạng .xlsx thường (không macro) rồi tải lên lại.");
        }
        catch (InvalidDataException)
        {
            throw new RequestValidationException("file", "Tệp không phải là tệp Excel (.xlsx) hợp lệ.");
        }
    }
}
