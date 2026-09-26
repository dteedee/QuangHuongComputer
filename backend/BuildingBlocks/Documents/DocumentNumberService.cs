using Microsoft.Extensions.Configuration;
using Npgsql;

namespace BuildingBlocks.Documents;

/// <summary>
/// Hands out the human-readable number printed on a business document:
/// <c>PREFIX-yyyyMM-#####</c>, e.g. <c>PO-202609-00042</c>.
/// </summary>
public interface IDocumentNumberService
{
    /// <summary>
    /// Next number for <paramref name="documentType"/> (one of <see cref="DocumentNumberTypes.All"/>).
    /// Throws <see cref="ArgumentOutOfRangeException"/> for an unknown type - a typo must fail loudly,
    /// not invent a sequence name that does not exist.
    /// </summary>
    Task<string> NextAsync(string documentType, CancellationToken cancellationToken = default);
}

/// <summary>
/// The fixed document-type vocabulary. Frozen by W1-3 + D10; W1-11 migrates one PostgreSQL sequence
/// <c>docnum_&lt;type&gt;_seq</c> per entry. Adding a type means adding a migration - never rename one.
/// </summary>
public static class DocumentNumberTypes
{
    public const string PurchaseOrder = "po";
    public const string GoodsReceivedNote = "grn";
    public const string DeliveryNote = "dn";
    public const string Rma = "rma";
    public const string Invoice = "inv";
    public const string WorkOrder = "wo";
    public const string StockTransfer = "tr";
    public const string PurchaseRequisition = "pr";
    public const string RequestForQuotation = "rfq";
    public const string ReturnRequest = "ret";
    public const string Payment = "pay";
    public const string SalesOrder = "so";

    /// <summary>D10: báo giá / quotation.</summary>
    public const string Quotation = "bg";

    /// <summary>Lịch hẹn sửa chữa (Repair.ServiceBooking). Sequence do migration Repair AddBookingNumberAndNoShow tạo.</summary>
    public const string ServiceBooking = "lh";

    /// <summary>type -> printed prefix. Iteration order is the migration order in W1-11.</summary>
    public static readonly IReadOnlyDictionary<string, string> All =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [PurchaseOrder] = "PO",
            [GoodsReceivedNote] = "GRN",
            [DeliveryNote] = "DN",
            [Rma] = "RMA",
            [Invoice] = "INV",
            [WorkOrder] = "WO",
            [StockTransfer] = "TR",
            [PurchaseRequisition] = "PR",
            [RequestForQuotation] = "RFQ",
            [ReturnRequest] = "RET",
            [Payment] = "PAY",
            [SalesOrder] = "SO",
            [Quotation] = "BG",
            [ServiceBooking] = "LH"
        };

    /// <summary>Sequence name W1-11's migration must create for <paramref name="documentType"/>.</summary>
    public static string SequenceName(string documentType) => $"docnum_{documentType.ToLowerInvariant()}_seq";
}

/// <summary>
/// <c>nextval()</c> on a per-type PostgreSQL sequence.
///
/// Why a sequence and not <c>DateTime.Now</c> + a static counter (which is what
/// <c>Inventory/Domain/DocumentNumberGenerator.cs</c> did): a static counter restarts at 1 on every
/// deploy, is per-process so two API instances collide, and is not durable - it produced numbers the
/// DB's unique index then rejected as duplicates, surfacing as a 500 on "create PO". A sequence is
/// transaction-independent by design: <c>nextval</c> never blocks and never hands the same value to
/// two callers, even under rollback. Gaps are possible and are FINE - the number identifies a
/// document, it does not count them.
///
/// The month segment is Vietnam local time (<c>Asia/Ho_Chi_Minh</c>, UTC+7), so a document created at
/// 08:30 on the 1st (= 01:30 UTC) is numbered in the new month, matching what the accountant sees.
/// The sequence itself is never reset per month; the counter is global per type, which keeps the
/// number unique across months without any scheduled job.
/// </summary>
public sealed class DocumentNumberService : IDocumentNumberService
{
    /// <summary>
    /// UTC+7 with no DST. Vietnam has not observed DST since 1975, so a fixed offset is exact and -
    /// unlike <c>TimeZoneInfo.FindSystemTimeZoneById</c> - cannot throw on a container image that
    /// ships without the tz database.
    /// </summary>
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    private readonly string _connectionString;

    public DocumentNumberService(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is required by DocumentNumberService.");
    }

    public async Task<string> NextAsync(string documentType, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(documentType) ||
            !DocumentNumberTypes.All.TryGetValue(documentType.Trim(), out var prefix))
        {
            throw new ArgumentOutOfRangeException(nameof(documentType), documentType,
                $"Unknown document type. Known types: {string.Join(", ", DocumentNumberTypes.All.Keys)}.");
        }

        var sequence = DocumentNumberTypes.SequenceName(documentType.Trim());

        // Own connection, deliberately outside any ambient transaction: nextval is exempt from
        // rollback anyway, and borrowing a module's DbContext connection would make BuildingBlocks
        // depend on whichever module happens to call it.
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        // The sequence name comes from the frozen dictionary above, never from caller input, so the
        // interpolation cannot be injected into. It must be interpolated: nextval() takes a regclass
        // literal, which cannot be supplied as a parameter.
        await using var command = new NpgsqlCommand($"SELECT nextval('{sequence}')", connection);
        var value = (long)(await command.ExecuteScalarAsync(cancellationToken)
            ?? throw new InvalidOperationException($"nextval('{sequence}') returned NULL."));

        var month = DateTimeOffset.UtcNow.ToOffset(VietnamOffset);
        return Format(prefix, month, value);
    }

    /// <summary>
    /// <c>PO-202609-00042</c>. Five digits is a floor, not a cap: past 99.999 the number simply grows
    /// to six digits rather than wrapping and colliding.
    /// </summary>
    public static string Format(string prefix, DateTimeOffset vietnamLocalTime, long sequenceValue)
        => $"{prefix}-{vietnamLocalTime:yyyyMM}-{sequenceValue:D5}";
}
