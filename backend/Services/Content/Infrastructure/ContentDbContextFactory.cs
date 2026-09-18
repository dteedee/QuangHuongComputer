using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Content.Infrastructure;

/// <summary>
/// Design-time factory cho ContentDbContext.
/// Dùng bởi `dotnet ef` khi chạy migration mà không cần startup project.
/// </summary>
public class ContentDbContextFactory : IDesignTimeDbContextFactory<ContentDbContext>
{
    public ContentDbContext CreateDbContext(string[] args)
    {
        // No dev fallback on purpose (D12): a bare `dotnet ef database update` must never
        // reach the owner's database. Caller supplies CONTENT_DB explicitly.
        var connectionString = Environment.GetEnvironmentVariable("CONTENT_DB");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "CONTENT_DB is not set. Set it to the target connection string before running `dotnet ef` " +
                "(the database name must end with '_test' outside of a promote).");
        }

        var optionsBuilder = new DbContextOptionsBuilder<ContentDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new ContentDbContext(optionsBuilder.Options);
    }
}
