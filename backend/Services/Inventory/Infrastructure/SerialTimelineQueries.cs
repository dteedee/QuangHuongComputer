using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InventoryModule.Infrastructure;

/// <summary>
/// Đọc dữ liệu vòng đời của một serial ở các module hạ nguồn (Sales, Repair, Warranty) — W2-5 bước 8.
///
/// <para>
/// <b>Vì sao còn SQL thô:</b> Inventory không tham chiếu project Sales/Repair/Warranty (chiều phụ
/// thuộc ngược lại), nên trước khi W2-6 công bố query service read-only thì đọc thẳng bảng của
/// module bạn là cách duy nhất. Điều ĐÃ sửa: bản cũ nuốt trọn mọi lỗi bằng <c>catch { }</c>, nên
/// một bảng đổi tên cột sẽ khiến timeline im lặng thiếu mục mãi mãi. Giờ mọi lỗi đều được log
/// kèm serial; timeline vẫn trả về phần đọc được.
/// </para>
///
/// <para>Toàn bộ lớp này CHỈ đọc: mỗi câu lệnh là một <c>SELECT</c> có tham số hoá.</para>
/// </summary>
public sealed class SerialTimelineQueries
{
    private readonly InventoryDbContext _db;
    private readonly ILogger<SerialTimelineQueries> _logger;

    public SerialTimelineQueries(InventoryDbContext db, ILogger<SerialTimelineQueries> logger)
    {
        _db = db;
        _logger = logger;
    }

    public sealed record TimelineRow(string Reference, string Status, DateTime At, string? Extra);

    /// <summary>Đơn bán đã bán chiếc máy này (Sales.Orders).</summary>
    public Task<TimelineRow?> FindOrderAsync(Guid orderId, string serial, CancellationToken ct) =>
        QuerySingleAsync(
            """SELECT "OrderNumber", "CustomerName", "CreatedAt" FROM "Orders" WHERE "Id" = @p0 LIMIT 1""",
            orderId, serial, "Sales.Orders", ct);

    /// <summary>Phiếu sửa chữa đang/đã xử lý chiếc máy này (Repair.WorkOrders).</summary>
    public Task<TimelineRow?> FindWorkOrderAsync(Guid workOrderId, string serial, CancellationToken ct) =>
        QuerySingleAsync(
            """SELECT "WorkOrderNumber", "Status", "CreatedAt" FROM "WorkOrders" WHERE "Id" = @p0 LIMIT 1""",
            workOrderId, serial, "Repair.WorkOrders", ct);

    /// <summary>Mọi yêu cầu bảo hành gắn với chuỗi serial (Warranty.WarrantyClaims).</summary>
    public async Task<IReadOnlyList<TimelineRow>> FindWarrantyClaimsAsync(string serial, CancellationToken ct)
    {
        var rows = new List<TimelineRow>();
        try
        {
            await using var command = await CreateCommandAsync(
                """
                SELECT "ClaimNumber", "Status", "ClaimDate"
                FROM "WarrantyClaims" WHERE "SerialNumber" = @p0 ORDER BY "ClaimDate" ASC
                """, serial, ct);

            await using var reader = await command.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
                rows.Add(Materialize(reader));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Không đọc được lịch sử bảo hành của serial {Serial} từ Warranty.WarrantyClaims. " +
                "Timeline trả về thiếu mục này.", serial);
        }
        return rows;
    }

    private async Task<TimelineRow?> QuerySingleAsync(
        string sql, Guid id, string serial, string source, CancellationToken ct)
    {
        try
        {
            await using var command = await CreateCommandAsync(sql, id, ct);
            await using var reader = await command.ExecuteReaderAsync(ct);
            return await reader.ReadAsync(ct) ? Materialize(reader) : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Không đọc được {Source} cho serial {Serial} (khoá {Id}). Timeline trả về thiếu mục này.",
                source, serial, id);
            return null;
        }
    }

    private async Task<System.Data.Common.DbCommand> CreateCommandAsync(string sql, object parameter, CancellationToken ct)
    {
        var connection = _db.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
            await connection.OpenAsync(ct);

        var command = connection.CreateCommand();
        command.CommandText = sql;
        var p = command.CreateParameter();
        p.ParameterName = "p0";
        p.Value = parameter;
        command.Parameters.Add(p);
        return command;
    }

    private static TimelineRow Materialize(System.Data.Common.DbDataReader reader) => new(
        reader.IsDBNull(0) ? string.Empty : reader.GetValue(0).ToString() ?? string.Empty,
        reader.IsDBNull(1) ? string.Empty : reader.GetValue(1).ToString() ?? string.Empty,
        reader.IsDBNull(2) ? DateTime.UtcNow : reader.GetDateTime(2),
        null);
}
