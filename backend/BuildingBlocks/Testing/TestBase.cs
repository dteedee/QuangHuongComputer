using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Testing;

public abstract class TestBase<TDbContext> : IDisposable where TDbContext : DbContext
{
    protected readonly ServiceProvider ServiceProvider;
    protected readonly TDbContext DbContext;

    protected TestBase()
    {
        var services = new ServiceCollection();

        // Configure in-memory database
        services.AddDbContext<TDbContext>(options =>
            options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}"));

        ServiceProvider = services.BuildServiceProvider();
        DbContext = ServiceProvider.GetRequiredService<TDbContext>();

        // Ensure database is created
        DbContext.Database.EnsureCreated();
    }

    public void Dispose()
    {
        DbContext?.Database.EnsureDeleted();
        DbContext?.Dispose();
        ServiceProvider?.Dispose();
    }

    protected async Task<T> AddEntityAsync<T>(T entity) where T : class
    {
        DbContext.Set<T>().Add(entity);
        await DbContext.SaveChangesAsync();
        DbContext.Entry(entity).State = EntityState.Detached;
        return entity;
    }

    protected async Task<List<T>> AddEntitiesAsync<T>(params T[] entities) where T : class
    {
        DbContext.Set<T>().AddRange(entities);
        await DbContext.SaveChangesAsync();
        foreach (var entity in entities)
        {
            DbContext.Entry(entity).State = EntityState.Detached;
        }
        return entities.ToList();
    }
}
