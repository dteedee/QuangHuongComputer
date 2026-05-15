using Microsoft.EntityFrameworkCore;
using SystemConfig.Domain;

namespace SystemConfig.Infrastructure;

public class CustomFieldDbContext : DbContext
{
    public CustomFieldDbContext(DbContextOptions<CustomFieldDbContext> options) : base(options) { }

    public DbSet<CustomFieldDefinition> CustomFieldDefinitions => Set<CustomFieldDefinition>();
    public DbSet<FormDefinition> FormDefinitions => Set<FormDefinition>();
    public DbSet<AutomationRule> AutomationRules => Set<AutomationRule>();

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

        modelBuilder.Entity<FormDefinition>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.Code).HasMaxLength(50).IsRequired();
            e.Property(f => f.Name).HasMaxLength(200).IsRequired();
            e.Property(f => f.Description).HasMaxLength(500);
            e.Property(f => f.EntityType).HasMaxLength(50);
            e.Property(f => f.FieldsSchema).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            e.Property(f => f.IsActive).HasDefaultValue(true);
            e.Property(f => f.CreatedAt).HasDefaultValueSql("now()");
            e.HasIndex(f => f.Code).IsUnique();
        });

        modelBuilder.Entity<AutomationRule>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Name).HasMaxLength(200).IsRequired();
            e.Property(r => r.EntityType).HasMaxLength(50).IsRequired();
            e.Property(r => r.TriggerEvent).HasMaxLength(50).IsRequired();
            e.Property(r => r.TriggerField).HasMaxLength(50);
            e.Property(r => r.ConditionJson).HasColumnType("jsonb").HasDefaultValueSql("'{}'::jsonb");
            e.Property(r => r.ActionType).HasMaxLength(50).IsRequired();
            e.Property(r => r.ActionConfig).HasColumnType("jsonb").HasDefaultValueSql("'{}'::jsonb");
            e.Property(r => r.IsActive).HasDefaultValue(true);
            e.Property(r => r.ExecutionOrder).HasDefaultValue(0);
            e.Property(r => r.CreatedAt).HasDefaultValueSql("now()");
            e.HasIndex(r => new { r.EntityType, r.IsActive, r.ExecutionOrder });
        });

        base.OnModelCreating(modelBuilder);
    }
}
