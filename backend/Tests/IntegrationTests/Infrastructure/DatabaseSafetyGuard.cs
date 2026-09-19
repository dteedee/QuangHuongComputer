using Npgsql;

namespace IntegrationTests.Infrastructure;

/// <summary>
/// Chốt chặn fail-closed (D12): bộ test này TUYỆT ĐỐI không được chạm vào database của chủ máy.
///
/// Không dựa vào "tôi đã set config đúng" — sau khi host dựng xong, mọi chuỗi kết nối thực tế
/// đều phải đi qua đây: chỉ chấp nhận cổng của container Testcontainers vừa khởi động và tên
/// database do chính test sinh ra. Sai một ly (config override không thắng, biến môi trường
/// .env đè lên) thì test ném ngay thay vì ghi vào quanghuongdb.
/// </summary>
public static class DatabaseSafetyGuard
{
    /// <summary>Những tên database không bao giờ được xuất hiện trong test.</summary>
    private static readonly string[] ForbiddenDatabases = { "quanghuongdb", "quanghuongdb_test" };

    private const int ForbiddenPort = 5432; // cổng Postgres của chủ máy

    public static void AssertIsThrowawayContainer(string connectionString, string expectedDatabase, int expectedPort)
    {
        NpgsqlConnectionStringBuilder parsed;
        try
        {
            parsed = new NpgsqlConnectionStringBuilder(connectionString);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Chuỗi kết nối test không phân tích được — từ chối chạy.", ex);
        }

        var database = parsed.Database ?? "";

        if (ForbiddenDatabases.Contains(database, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"CHẶN: test đang trỏ vào database '{database}' của môi trường thật. Dừng lại.");
        }

        if (parsed.Port == ForbiddenPort)
        {
            throw new InvalidOperationException(
                $"CHẶN: test đang trỏ vào cổng {ForbiddenPort} (Postgres của chủ máy), không phải container tạm.");
        }

        if (!string.Equals(database, expectedDatabase, StringComparison.Ordinal) || parsed.Port != expectedPort)
        {
            throw new InvalidOperationException(
                $"CHẶN: chuỗi kết nối thực tế (db='{database}', port={parsed.Port}) khác container tạm " +
                $"(db='{expectedDatabase}', port={expectedPort}) — cấu hình override đã không thắng.");
        }
    }
}
