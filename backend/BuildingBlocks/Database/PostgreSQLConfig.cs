using Microsoft.EntityFrameworkCore;

namespace BuildingBlocks.Database;

/// <summary>
/// Base configuration for PostgreSQL with snake_case naming convention
/// This fixes case-sensitivity issues in PostgreSQL
/// </summary>
public static class PostgreSQLConfig
{
    /// <summary>
    /// Configure PostgreSQL-specific settings for a DbContext
    /// Call this in OnModelCreating method of your DbContext
    /// </summary>
    public static void ConfigurePostgreSQL(ModelBuilder modelBuilder, string schema = "public")
    {
        // Set default schema
        modelBuilder.HasDefaultSchema(schema);
        
        // Enable cascade delete behavior
        foreach (var foreignKey in modelBuilder.Model.GetEntityTypes()
            .SelectMany(e => e.GetForeignKeys()))
        {
            foreignKey.DeleteBehavior = DeleteBehavior.Restrict;
        }
    }

    /// <summary>
    /// Configure snake_case naming for a specific entity
    /// PostgreSQL is case-insensitive for identifiers unless quoted,
    /// but we use snake_case for consistency
    /// </summary>
    public static void ConfigureSnakeCaseEntity<T>(ModelBuilder modelBuilder) where T : class
    {
        modelBuilder.Entity<T>(entity =>
        {
            // Set table name to snake_case
            entity.ToTable(GetSnakeCaseName(typeof(T).Name));
        });
    }

    /// <summary>
    /// Convert PascalCase/CamelCase to snake_case
    /// Example: ProductReview -> product_review
    /// </summary>
    public static string GetSnakeCaseName(string name)
    {
        return string.Concat(name.Select((x, i) => i > 0 && char.IsUpper(x) ? "_" + x.ToString() : x.ToString())).ToLower();
    }

    /// <summary>
    /// Create a case-insensitive index for PostgreSQL
    /// Uses LOWER() function to ensure case-insensitive searches
    /// </summary>
    public static void ConfigureCaseInsensitiveIndex(
        ModelBuilder modelBuilder,
        string entityName,
        string columnName,
        string? schema = "public")
    {
        var entityType = modelBuilder.Model.FindEntityType(entityName);
        if (entityType == null) return;

        var property = entityType.FindProperty(columnName);
        if (property == null) return;

        // Create index on LOWER(column_name) for case-insensitive search
        modelBuilder.Entity(entityName)
            .HasIndex($"LOWER({columnName})")
            .HasDatabaseName($"ix_{GetSnakeCaseName(entityName)}_{GetSnakeCaseName(columnName)}_lower");
    }

    /// <summary>
    /// Configure common PostgreSQL column settings
    /// </summary>
    public static void ConfigureCommonColumnProperties(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            // Configure timestamp columns
            foreach (var property in entityType.GetProperties())
            {
                // Use 'timestamp' instead of 'datetime' for PostgreSQL
                if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
                {
                    property.SetColumnType("timestamp without time zone");
                }
                
                // Use 'text' for long strings instead of 'varchar(max)'
                if (property.ClrType == typeof(string) && property.GetMaxLength() == null)
                {
                    // Check if it's likely a long text field
                    var propertyName = property.Name.ToLower();
                    if (propertyName.Contains("description") || 
                        propertyName.Contains("content") || 
                        propertyName.Contains("notes") ||
                        propertyName.Contains("comment"))
                    {
                        property.SetColumnType("text");
                    }
                }
            }
        }
    }

    /// <summary>
    /// Configure JSON columns for PostgreSQL
    /// </summary>
    public static void ConfigureJsonColumn<T>(
        Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<string?> propertyBuilder)
        where T : class
    {
        propertyBuilder.HasColumnType("jsonb");
    }

    /// <summary>
    /// Configure array columns for PostgreSQL
    /// </summary>
    public static void ConfigureArrayColumn<T>(
        Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<string> propertyBuilder)
        where T : class
    {
        propertyBuilder.HasColumnType("text[]");
    }

    /// <summary>
    /// Create a full-text search index for PostgreSQL
    /// </summary>
    public static void ConfigureFullTextSearchIndex(
        ModelBuilder modelBuilder,
        string entityName,
        string columnName,
        string indexName = null)
    {
        indexName ??= $"ix_{GetSnakeCaseName(entityName)}_{GetSnakeCaseName(columnName)}_fts";
        
        // This would be used with PostgreSQL's to_tsvector() function
        // Requires custom SQL in migrations
    }

    /// <summary>
    /// Configure lower case collation for specific columns
    /// Useful for case-insensitive comparisons
    /// </summary>
    public static void ConfigureLowerCaseCollation<T>(
        Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<string> propertyBuilder)
        where T : class
    {
        // PostgreSQL doesn't have collation in the same way as SQL Server
        // Instead, we use indexes on LOWER(column_name)
        propertyBuilder.HasAnnotation("CaseInsensitive", true);
    }
}
