using BuildingBlocks.Documents;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace InventoryModule.Application.Stock;

/// <summary>
/// Số chứng từ cho Inventory (W2-5 bước 10). Thay cho
/// <c>Domain/DocumentNumberGenerator.cs</c> — bộ đếm tĩnh trong process, khởi động lại từ 1 sau mỗi
/// lần deploy và đụng unique index thành 500.
///
/// <para>
/// Loại chứng từ đã có trong từ vựng đóng băng của W1-3 (<see cref="DocumentNumberTypes"/>) đi
/// thẳng qua <see cref="IDocumentNumberService"/>. Hai loại riêng của kho — kiểm kê (<c>cnt</c>)
/// và phiếu điều chỉnh (<c>adj</c>) — chưa có trong từ vựng đó; migration của W2-5 tạo
/// <c>docnum_cnt_seq</c>/<c>docnum_adj_seq</c> và lớp này đọc chúng theo đúng định dạng
/// <c>PREFIX-yyyyMM-#####</c>. Khi integration request W2-5-01 thêm hai hằng số vào
/// <c>DocumentNumberTypes</c>, nhánh dưới tự tắt vì nhánh trên khớp trước.
/// </para>
/// </summary>
public sealed class InventoryDocumentNumbers
{
    /// <summary>UTC+7 cố định — Việt Nam không có DST từ 1975; tránh phụ thuộc tzdata của container.</summary>
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Loại chứng từ chỉ Inventory dùng, chưa nằm trong từ vựng W1-3.</summary>
    public const string InventoryCount = "cnt";
    public const string StockAdjustment = "adj";

    private static readonly IReadOnlyDictionary<string, string> LocalPrefixes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [InventoryCount] = "KK",
            [StockAdjustment] = "DC"
        };

    private readonly IDocumentNumberService _documentNumbers;
    private readonly string _connectionString;

    public InventoryDocumentNumbers(IDocumentNumberService documentNumbers, IConfiguration configuration)
    {
        _documentNumbers = documentNumbers;
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection là bắt buộc.");
    }

    public async Task<string> NextAsync(string documentType, CancellationToken ct = default)
    {
        if (DocumentNumberTypes.All.ContainsKey(documentType))
            return await _documentNumbers.NextAsync(documentType, ct);

        if (!LocalPrefixes.TryGetValue(documentType, out var prefix))
            throw new ArgumentOutOfRangeException(nameof(documentType), documentType,
                "Loại chứng từ không hợp lệ.");

        var sequence = DocumentNumberTypes.SequenceName(documentType);

        // Kết nối riêng, cố ý nằm ngoài transaction đang mở: nextval miễn nhiễm rollback, và
        // giữ connection của DbContext sẽ khiến số chứng từ bị cuốn theo một rollback nghiệp vụ.
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = new NpgsqlCommand($"SELECT nextval('{sequence}')", connection);
        var value = (long)(await command.ExecuteScalarAsync(ct) ?? 0L);

        var month = DateTime.UtcNow.ToOffset(VietnamOffset).ToString("yyyyMM");
        return $"{prefix}-{month}-{value:D5}";
    }
}

internal static class DateTimeOffsetExtensions
{
    /// <summary>UTC <see cref="DateTime"/> -> giờ Việt Nam, không phụ thuộc tz database.</summary>
    public static DateTimeOffset ToOffset(this DateTime utc, TimeSpan offset)
        => new DateTimeOffset(DateTime.SpecifyKind(utc, DateTimeKind.Utc)).ToOffset(offset);
}
