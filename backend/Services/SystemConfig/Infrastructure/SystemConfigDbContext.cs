using Microsoft.EntityFrameworkCore;
using SystemConfig.Domain;

namespace SystemConfig.Infrastructure;

public class SystemConfigDbContext : DbContext
{
    public SystemConfigDbContext(DbContextOptions<SystemConfigDbContext> options) : base(options) { }

    public DbSet<ConfigurationEntry> Configurations => Set<ConfigurationEntry>();
    public DbSet<BackofficeMenuGroup> BackofficeMenuGroups => Set<BackofficeMenuGroup>();
    public DbSet<BackofficeMenuItem> BackofficeMenuItems => Set<BackofficeMenuItem>();
    public DbSet<ReportDefinition> ReportDefinitions => Set<ReportDefinition>();
    public DbSet<SavedReportPreset> SavedReportPresets => Set<SavedReportPreset>();

    // Phase 05 luồng B — chi nhánh cửa hàng
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<StoreWarehouse> StoreWarehouses => Set<StoreWarehouse>();
    public DbSet<StoreEmployee> StoreEmployees => Set<StoreEmployee>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("config");

        modelBuilder.Entity<ConfigurationEntry>(e =>
        {
            e.HasKey(c => c.Key);
            e.Property(c => c.Module).HasMaxLength(50).HasDefaultValue("Global");
            // Default value must be the CLR enum value; EF applies the string conversion itself
            e.Property(c => c.ValueType).HasConversion<string>().HasMaxLength(20).HasDefaultValue(ConfigValueType.String);
            e.Property(c => c.JsonValue).HasColumnType("jsonb");
            e.Property(c => c.IsSystem).HasDefaultValue(false);
            e.Property(c => c.SortOrder).HasDefaultValue(0);
            e.HasIndex(c => new { c.Module, c.Category });
        });

        modelBuilder.Entity<BackofficeMenuGroup>(e =>
        {
            e.HasKey(g => g.Id);
            e.Property(g => g.Title).HasMaxLength(100).IsRequired();
            e.Property(g => g.IconName).HasMaxLength(50);
            e.Property(g => g.ColorClass).HasMaxLength(50);
            e.Property(g => g.IsActive).HasDefaultValue(true);
            e.Property(g => g.DisplayOrder).HasDefaultValue(0);
            e.HasMany(g => g.Items)
             .WithOne(i => i.Group)
             .HasForeignKey(i => i.GroupId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BackofficeMenuItem>(e =>
        {
            e.HasKey(i => i.Id);
            e.Property(i => i.Title).HasMaxLength(100).IsRequired();
            e.Property(i => i.Description).HasMaxLength(200);
            e.Property(i => i.IconName).HasMaxLength(50);
            e.Property(i => i.Path).HasMaxLength(200).IsRequired();
            e.Property(i => i.AllowedRoles)
             .HasColumnType("jsonb")
             .HasDefaultValueSql("'[\"Admin\"]'::jsonb");
            e.Property(i => i.BadgeSource).HasMaxLength(50);
            e.Property(i => i.IsActive).HasDefaultValue(true);
            e.Property(i => i.DisplayOrder).HasDefaultValue(0);
            e.Property(i => i.OpenInNewTab).HasDefaultValue(false);
            e.HasIndex(i => new { i.GroupId, i.DisplayOrder });
        });

        modelBuilder.Entity<ReportDefinition>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Code).HasMaxLength(50).IsRequired();
            e.HasIndex(r => r.Code).IsUnique();
            e.Property(r => r.Name).HasMaxLength(200).IsRequired();
            e.Property(r => r.Description).HasMaxLength(500);
            e.Property(r => r.Category).HasMaxLength(50).IsRequired();
            e.Property(r => r.DataSourceEndpoint).HasMaxLength(200).IsRequired();
            e.Property(r => r.AvailableColumns).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            e.Property(r => r.AvailableFilters).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            e.Property(r => r.DefaultSortColumn).HasMaxLength(50);
            e.Property(r => r.DefaultSortDirection).HasMaxLength(4).HasDefaultValue("desc");
            e.Property(r => r.AllowedRoles).HasColumnType("jsonb").HasDefaultValueSql("'[\"Admin\",\"Manager\"]'::jsonb");
            e.Property(r => r.IsActive).HasDefaultValue(true);
            e.Property(r => r.DisplayOrder).HasDefaultValue(0);
            e.HasMany(r => r.Presets)
             .WithOne(p => p.ReportDefinition)
             .HasForeignKey(p => p.ReportDefinitionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SavedReportPreset>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Name).HasMaxLength(100).IsRequired();
            e.Property(p => p.VisibleColumns).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            e.Property(p => p.ColumnOrder).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            e.Property(p => p.FilterValues).HasColumnType("jsonb").HasDefaultValueSql("'{}'::jsonb");
            e.Property(p => p.SortColumn).HasMaxLength(50);
            e.Property(p => p.SortDirection).HasMaxLength(4);
            e.Property(p => p.IsDefault).HasDefaultValue(false);
            e.Property(p => p.IsShared).HasDefaultValue(false);
            e.HasIndex(p => new { p.ReportDefinitionId, p.UserId });
        });

        // === Phase 05 luồng B — Store (chi nhánh) ===
        modelBuilder.Entity<Store>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Code).IsRequired().HasMaxLength(20);
            e.Property(s => s.Name).IsRequired().HasMaxLength(200);
            e.Property(s => s.Address).IsRequired().HasMaxLength(300);
            e.Property(s => s.Ward).HasMaxLength(100);
            e.Property(s => s.District).HasMaxLength(100);
            e.Property(s => s.Province).HasMaxLength(100);
            e.Property(s => s.Phone).HasMaxLength(20);
            e.Property(s => s.Email).HasMaxLength(200);
            e.Property(s => s.OpeningHoursJson).HasColumnType("jsonb").HasDefaultValueSql("'{}'::jsonb");
            e.Property(s => s.Latitude).HasPrecision(9, 6);
            e.Property(s => s.Longitude).HasPrecision(9, 6);
            e.Property(s => s.IsActive).HasDefaultValue(true);
            e.Property(s => s.IsPickupPoint).HasDefaultValue(true);
            e.Property(s => s.SortOrder).HasDefaultValue(0);
            e.HasIndex(s => s.Code).IsUnique().HasDatabaseName("IX_Store_Code");
            e.HasIndex(s => new { s.IsActive, s.SortOrder }).HasDatabaseName("IX_Store_Active_Sort");
            e.HasMany(s => s.Warehouses)
             .WithOne()
             .HasForeignKey(w => w.StoreId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(s => s.Employees)
             .WithOne()
             .HasForeignKey(w => w.StoreId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreWarehouse>(e =>
        {
            e.HasKey(w => w.Id);
            e.HasIndex(w => new { w.StoreId, w.WarehouseId }).IsUnique()
                .HasDatabaseName("IX_StoreWarehouse_Store_Warehouse");
            e.HasIndex(w => w.WarehouseId).HasDatabaseName("IX_StoreWarehouse_Warehouse");
        });

        modelBuilder.Entity<StoreEmployee>(e =>
        {
            e.HasKey(w => w.Id);
            e.Property(w => w.Role).HasMaxLength(50);
            e.HasIndex(w => new { w.StoreId, w.EmployeeId }).IsUnique()
                .HasDatabaseName("IX_StoreEmployee_Store_Employee");
            e.HasIndex(w => w.EmployeeId).HasDatabaseName("IX_StoreEmployee_Employee");
        });

        base.OnModelCreating(modelBuilder);
    }
}
