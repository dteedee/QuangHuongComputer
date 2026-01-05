using Microsoft.EntityFrameworkCore;
using Warranty.Domain;

namespace Warranty.Infrastructure;

public class WarrantyDbContext : DbContext
{
    public WarrantyDbContext(DbContextOptions<WarrantyDbContext> options) : base(options)
    {
    }

    public DbSet<WarrantyPolicy> Policies { get; set; }
    public DbSet<WarrantyClaim> Claims { get; set; }
    public DbSet<ProductWarranty> ProductWarranties { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<WarrantyPolicy>(entity =>
        {
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<WarrantyClaim>(entity =>
        {
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<ProductWarranty>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SerialNumber).IsUnique();
        });
    }
}
