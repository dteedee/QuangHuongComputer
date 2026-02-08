using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace BuildingBlocks.Database;

/// <summary>
/// Extension methods for database migrations
/// </summary>
public static class MigrationExtensions
{
    /// <summary>
    /// Configure indexes for better query performance
    /// </summary>
    public static ModelBuilder ConfigureIndexes(this ModelBuilder modelBuilder)
    {
        // Configure common indexes
        // This should be implemented in specific DbContexts
        
        return modelBuilder;
    }

    /// <summary>
    /// Configure query splitting behavior
    /// </summary>
    public static ModelBuilder ConfigureQuerySplitting(this ModelBuilder modelBuilder)
    {
        // Use SplitQuery to prevent Cartesian explosion
        modelBuilder.Model.GetEntityTypes()
            .SelectMany(e => e.GetForeignKeys())
            .Where(fk => !fk.IsOwnership && fk.DeleteBehavior == DeleteBehavior.ClientCascade)
            .ToList()
            .ForEach(fk => fk.DeleteBehavior = DeleteBehavior.ClientNoAction);
        
        return modelBuilder;
    }

    /// <summary>
    /// Configure cascade delete behavior
    /// </summary>
    public static ModelBuilder ConfigureCascadeDeletes(this ModelBuilder modelBuilder)
    {
        // Configure cascade deletes
        // This should be implemented in specific DbContexts
        
        return modelBuilder;
    }
}
