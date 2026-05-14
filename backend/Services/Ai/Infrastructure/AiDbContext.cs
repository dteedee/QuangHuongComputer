using Microsoft.EntityFrameworkCore;
using Ai.Domain;

namespace Ai.Infrastructure;

public class AiDbContext : DbContext
{
    public AiDbContext(DbContextOptions<AiDbContext> options) : base(options)
    {
    }

    public DbSet<SearchEntry> SearchEntries { get; set; }
    public DbSet<ProductEmbedding> ProductEmbeddings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("ai");

        modelBuilder.Entity<SearchEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Price).HasPrecision(18, 2);
            entity.HasIndex(e => e.ExternalId);
        });

        modelBuilder.Entity<ProductEmbedding>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Price).HasPrecision(18, 2);
            entity.Property(e => e.SearchText).HasColumnType("text");
            entity.Property(e => e.EmbeddingJson).HasColumnType("text");
            entity.HasIndex(e => e.ProductId).IsUnique();
        });
    }
}
