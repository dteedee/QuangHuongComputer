using System.Reflection;
using ApiGateway.Startup;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Bài test "cài mới": database RỖNG -> host tự migrate 15 DbContext -> seed reference.
///
/// Đây là lưới bắt cho đúng lớp lỗi đã lọt ra production nhiều tháng:
/// - <c>payments.PaymentIntents</c> bị Down() xoá mà Up() không tạo: lịch sử migration nói "đã chạy",
///   model nói "có bảng", còn database thì không có bảng (42P01 trên mọi giao dịch thanh toán).
/// - <c>CustomFieldDbContext</c> từng bị bỏ khỏi danh sách context nên bảng của nó không bao giờ được tạo.
/// - Migration viết tay không có file .Designer.cs bị MigrateAsync lặng lẽ bỏ qua.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class FreshInstallTests
{
    private readonly IntegrationTestFixture _fixture;

    public FreshInstallTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Cài mới: sau khi migrate không còn migration nào treo ở bất kỳ DbContext nào")]
    public async Task Migrate_KhongConMigrationTreo()
    {
        using var scope = _fixture.CreateScope();
        var pending = new List<string>();

        foreach (var context in DatabaseMigrationRunner.ResolveAllContexts(scope.ServiceProvider))
        {
            foreach (var migration in await context.Database.GetPendingMigrationsAsync())
            {
                pending.Add($"{context.GetType().Name}:{migration}");
            }
        }

        pending.Should().BeEmpty("host phải áp dụng hết migration của mọi context khi khởi động trên DB rỗng");
    }

    [Fact(DisplayName = "Cài mới: mọi bảng EF model khai báo đều thực sự tồn tại (hồi quy PaymentIntents)")]
    public async Task Migrate_MoiBangTrongModelDeuTonTai()
    {
        using var scope = _fixture.CreateScope();
        var missing = new List<string>();

        foreach (var context in DatabaseMigrationRunner.ResolveAllContexts(scope.ServiceProvider))
        {
            var existing = await ExistingRelationsAsync(context);
            var defaultSchema = context.Model.GetDefaultSchema() ?? "public";

            foreach (var entityType in context.Model.GetEntityTypes())
            {
                var table = entityType.GetTableName();
                if (string.IsNullOrEmpty(table)) continue;

                var qualified = $"{entityType.GetSchema() ?? defaultSchema}.{table}";
                if (!existing.Contains(qualified)) missing.Add($"{context.GetType().Name} -> {qualified}");
            }
        }

        missing.Distinct().Should().BeEmpty(
            "một bảng có trong model nhưng không có trong database = mọi request chạm vào nó sẽ lỗi 42P01");
    }

    [Fact(DisplayName = "Cài mới: truy vấn được mọi DbSet (bắt cả trường hợp thiếu CỘT, không chỉ thiếu bảng)")]
    public async Task Migrate_MoiDbSetTruyVanDuoc()
    {
        using var scope = _fixture.CreateScope();
        var failures = new List<string>();

        foreach (var context in DatabaseMigrationRunner.ResolveAllContexts(scope.ServiceProvider))
        {
            foreach (var entityType in context.Model.GetEntityTypes())
            {
                // Kiểu owned dùng chung bảng của chủ sở hữu; truy vấn trực tiếp chúng là vô nghĩa.
                if (entityType.IsOwned() || entityType.ClrType is null) continue;
                if (string.IsNullOrEmpty(entityType.GetTableName())) continue;

                try
                {
                    await QueryOneRowAsync(context, entityType.ClrType,
                        entityType.HasSharedClrType ? entityType.Name : null);
                }
                catch (Exception ex)
                {
                    failures.Add($"{context.GetType().Name}.{entityType.ClrType.Name}: {Root(ex).Message}");
                }
            }
        }

        failures.Should().BeEmpty("mỗi entity phải đọc được ít nhất 1 dòng từ Postgres thật");
    }

    [Fact(DisplayName = "Cài mới: chạy seed reference lần thứ hai không thay đổi dòng nào (idempotent)")]
    public async Task Seed_ChayLanHaiKhongDoiGi()
    {
        _fixture.FirstSeedChangeCount.Should().BeGreaterThan(0,
            "lần seed đầu trên DB rỗng bắt buộc phải tạo dữ liệu nền, nếu 0 thì seeder không chạy gì cả");

        var second = await _fixture.RunReferenceSeedAsync();

        second.Should().Be(0, "seed phải idempotent: chạy lại trên DB đã seed không được ghi thêm gì");
    }

    private static Exception Root(Exception ex) => ex.InnerException is null ? ex : Root(ex.InnerException);

    private static async Task<HashSet<string>> ExistingRelationsAsync(DbContext context)
    {
        var result = new HashSet<string>(StringComparer.Ordinal);
        var connection = context.Database.GetDbConnection();
        var openedHere = connection.State != System.Data.ConnectionState.Open;
        if (openedHere) await connection.OpenAsync();
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT n.nspname || '.' || c.relname FROM pg_class c " +
                "JOIN pg_namespace n ON n.oid = c.relnamespace " +
                "WHERE c.relkind IN ('r','p','v','m','f') AND n.nspname NOT IN ('pg_catalog','information_schema')";
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync()) result.Add(reader.GetString(0));
        }
        finally
        {
            if (openedHere) await connection.CloseAsync();
        }

        return result;
    }

    private static Task QueryOneRowAsync(DbContext context, Type clrType, string? sharedTypeName) =>
        (Task)typeof(FreshInstallTests)
            .GetMethod(nameof(QueryOneAsync), BindingFlags.NonPublic | BindingFlags.Static)!
            .MakeGenericMethod(clrType)
            .Invoke(null, new object?[] { context, sharedTypeName })!;

    /// <summary>
    /// Bảng nối many-to-many được EF map bằng shared-type entity (Dictionary&lt;string,object&gt;),
    /// chỉ lấy được qua overload Set&lt;T&gt;(tên) — vẫn phải kiểm tra vì đó cũng là bảng thật.
    /// </summary>
    private static async Task QueryOneAsync<TEntity>(DbContext context, string? sharedTypeName) where TEntity : class
    {
        var set = sharedTypeName is null ? context.Set<TEntity>() : context.Set<TEntity>(sharedTypeName);
        await set.AsNoTracking().Take(1).ToListAsync();
    }
}
