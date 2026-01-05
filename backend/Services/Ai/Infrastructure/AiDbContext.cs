using Microsoft.EntityFrameworkCore;
using Ai.Domain;

namespace Ai.Infrastructure;

public class AiDbContext : DbContext
{
    public AiDbContext(DbContextOptions<AiDbContext> options) : base(options)
    {
    }

    public DbSet<SearchEntry> SearchEntries { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("ai");

        modelBuilder.Entity<SearchEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Price).HasPrecision(18, 2);
            entity.HasIndex(e => e.ExternalId);
            
            // Full text search could be configured here for Postgres
        });
    }
}
