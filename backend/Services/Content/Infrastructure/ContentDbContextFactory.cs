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
        var connectionString = Environment.GetEnvironmentVariable("CONTENT_DB")
            ?? "Host=localhost;Port=5432;Database=quanghuongdb;Username=postgres;Password=postgres123";

        var optionsBuilder = new DbContextOptionsBuilder<ContentDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new ContentDbContext(optionsBuilder.Options);
    }
}
