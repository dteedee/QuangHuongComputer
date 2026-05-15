using Microsoft.EntityFrameworkCore;
using SystemConfig.Domain;

namespace SystemConfig.Infrastructure;

public class CustomFieldDbContext : DbContext
{
    public CustomFieldDbContext(DbContextOptions<CustomFieldDbContext> options) : base(options) { }

    public DbSet<CustomFieldDefinition> CustomFieldDefinitions => Set<CustomFieldDefinition>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("config");

        modelBuilder.Entity<CustomFieldDefinition>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.EntityType).HasMaxLength(50).IsRequired();
            e.Property(f => f.FieldKey).HasMaxLength(100).IsRequired();
            e.Property(f => f.Label).HasMaxLength(150).IsRequired();
            e.Property(f => f.FieldType).HasMaxLength(20).IsRequired().HasDefaultValue("text");
            e.Property(f => f.OptionsJson).HasColumnType("jsonb");
            e.Property(f => f.DefaultValue).HasMaxLength(500);
            e.Property(f => f.IsRequired).HasDefaultValue(false);
            e.Property(f => f.IsVisibleInList).HasDefaultValue(false);
            e.Property(f => f.IsFilterable).HasDefaultValue(false);
            e.Property(f => f.IsPublic).HasDefaultValue(false);
            e.Property(f => f.DisplayOrder).HasDefaultValue(0);
            e.Property(f => f.IsActive).HasDefaultValue(true);
            e.Property(f => f.CreatedAt).HasDefaultValueSql("now()");
            e.HasIndex(f => new { f.EntityType, f.FieldKey }).IsUnique();
            e.HasIndex(f => new { f.EntityType, f.IsActive, f.DisplayOrder });
        });

        base.OnModelCreating(modelBuilder);
    }
}
