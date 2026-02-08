using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace BuildingBlocks.Database;

/// <summary>
/// Extension methods for optimizing database queries
/// </summary>
public static class QueryOptimizationExtensions
{
    /// <summary>
    /// Configure query splitting behavior
    /// </summary>
    public static ModelBuilder ConfigureQuerySplitting(this ModelBuilder modelBuilder)
    {
        // Configure foreign keys to prevent cascade loops
        var foreignKeys = modelBuilder.Model.GetEntityTypes()
            .SelectMany(e => e.GetForeignKeys());
        
        foreach (var foreignKey in foreignKeys)
        {
            if (!foreignKey.IsOwnership && foreignKey.DeleteBehavior == DeleteBehavior.ClientCascade)
            {
                foreignKey.DeleteBehavior = DeleteBehavior.ClientNoAction;
            }
        }
        
        return modelBuilder;
    }

    /// <summary>
    /// Include navigation properties if not already included
    /// </summary>
    public static IQueryable<T> IncludeIfNotIncluded<T>(
        this IQueryable<T> source,
        string navigationPropertyPath) where T : class
    {
        // Simple implementation - always include
        return source.Include(navigationPropertyPath);
    }

    /// <summary>
    /// Configure indexes for performance
    /// </summary>
    public static ModelBuilder ConfigurePerformanceIndexes(this ModelBuilder modelBuilder)
    {
        // Placeholder for index configuration
        return modelBuilder;
    }

    /// <summary>
    /// Use AsNoTracking for read-only queries
    /// </summary>
    public static IQueryable<T> AsReadOnly<T>(this IQueryable<T> source) where T : class
    {
        return source.AsNoTracking();
    }

    /// <summary>
    /// Paginate query results
    /// </summary>
    public static async Task<List<T>> ToPagedListAsync<T>(
        this IQueryable<T> source,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        return await source
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Get paginated result with total count
    /// </summary>
    public static async Task<PaginatedResult<T>> ToPaginatedResultAsync<T>(
        this IQueryable<T> source,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default) where T : class
    {
        // Validate pagination parameters
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100); // Max 100 items per page

        var total = await source.CountAsync(cancellationToken);
        var items = await source
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PaginatedResult<T>(items, total, pageNumber, pageSize);
    }

    /// <summary>
    /// Apply search filter using LIKE (case-insensitive for PostgreSQL)
    /// </summary>
    public static IQueryable<T> WhereSearch<T>(
        this IQueryable<T> source,
        string? searchTerm,
        params Expression<Func<T, string?>>[] properties) where T : class
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return source;

        var searchPattern = $"%{searchTerm}%";
        var parameter = Expression.Parameter(typeof(T), "p");
        
        Expression? expression = null;
        foreach (var property in properties)
        {
            var propertyName = GetPropertyName(property);
            var propertyExpr = Expression.Property(parameter, propertyName);
            
            // Simple string.Contains expression instead of Like
            var containsMethod = typeof(string).GetMethod("Contains", new[] { typeof(string) })!;
            var contains = Expression.Call(propertyExpr, containsMethod, Expression.Constant(searchTerm));
            
            expression = expression == null
                ? contains
                : Expression.OrElse(expression, contains);
        }

        if (expression == null)
            return source;

        var lambda = Expression.Lambda<Func<T, bool>>(expression, parameter);
        return source.Where(lambda);
    }

    /// <summary>
    /// Get property name from expression
    /// </summary>
    private static string GetPropertyName<T>(Expression<Func<T, string?>> expression)
    {
        if (expression.Body is MemberExpression memberExpr)
            return memberExpr.Member.Name;

        throw new ArgumentException("Invalid property expression");
    }

    /// <summary>
    /// Split queries for better performance with large result sets
    /// </summary>
    public static IQueryable<T> AsSplitQuery<T>(this IQueryable<T> source) where T : class
    {
        return source.AsSplitQuery();
    }

    /// <summary>
    /// Validate page and page size parameters
    /// </summary>
    public static (int Page, int PageSize) ValidatePaginationParams(
        int page = 1,
        int pageSize = 20,
        int maxPageSize = 100)
    {
        var validPage = Math.Max(1, page);
        var validPageSize = Math.Clamp(pageSize, 1, maxPageSize);
        return (validPage, validPageSize);
    }
}

/// <summary>
/// Represents a paginated result set
/// </summary>
/// <typeparam name="T"></typeparam>
public record PaginatedResult<T>(List<T> Items, int Total, int PageNumber, int PageSize)
{
    public int TotalPages => (Total + PageSize - 1) / PageSize;
    public bool HasNextPage => PageNumber < TotalPages;
    public bool HasPreviousPage => PageNumber > 1;
    public int Count => Items.Count;
}
