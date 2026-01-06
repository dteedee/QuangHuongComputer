using Microsoft.EntityFrameworkCore;
using SystemConfig.Domain;

namespace SystemConfig.Infrastructure;

public class SystemConfigDbContext : DbContext
{
    public SystemConfigDbContext(DbContextOptions<SystemConfigDbContext> options) : base(options) { }

    public DbSet<ConfigurationEntry> Configurations => Set<ConfigurationEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("config");
        modelBuilder.Entity<ConfigurationEntry>().HasKey(e => e.Key);
        base.OnModelCreating(modelBuilder);
    }
}
