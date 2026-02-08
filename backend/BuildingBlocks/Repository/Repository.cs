using Microsoft.EntityFrameworkCore;
using BuildingBlocks.SharedKernel;

namespace BuildingBlocks.Repository;

public class Repository<TEntity, TId, TDbContext> : IRepository<TEntity, TId>
    where TEntity : Entity<TId>
    where TDbContext : DbContext
{
    protected readonly TDbContext _context;
    protected readonly DbSet<TEntity> _dbSet;

    public Repository(TDbContext context)
    {
        _context = context;
        _dbSet = context.Set<TEntity>();
    }

    public virtual async Task<TEntity?> GetByIdAsync(TId id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id }, cancellationToken);
    }

    public virtual async Task<PagedResult<TEntity>> GetPagedAsync(
        QueryParams queryParams,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet.AsQueryable();

        // Apply active filter unless explicitly including inactive
        if (!queryParams.IncludeInactive)
        {
            query = query.Where(e => e.IsActive);
        }

        // Apply search if provided (override in derived class for entity-specific search)
        query = ApplySearch(query, queryParams.Search);

        // Get total count before pagination
        var total = await query.CountAsync(cancellationToken);

        // Apply sorting
        query = ApplySorting(query, queryParams.SortBy, queryParams.SortDescending);

        // Apply pagination
        var items = await query
            .Skip(queryParams.Skip)
            .Take(queryParams.Take)
            .ToListAsync(cancellationToken);

        return new PagedResult<TEntity>(items, total, queryParams.Page, queryParams.PageSize);
    }

    public virtual async Task<TEntity> AddAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.IsActive = true;
        await _dbSet.AddAsync(entity, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public virtual async Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public virtual async Task DeleteAsync(TId id, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity != null)
        {
            // Soft delete
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public virtual async Task<bool> ExistsAsync(TId id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.AnyAsync(e => e.Id!.Equals(id), cancellationToken);
    }

    protected virtual IQueryable<TEntity> ApplySearch(IQueryable<TEntity> query, string? search)
    {
        // Override in derived classes for entity-specific search
        return query;
    }

    protected virtual IQueryable<TEntity> ApplySorting(
        IQueryable<TEntity> query,
        string? sortBy,
        bool descending)
    {
        if (string.IsNullOrWhiteSpace(sortBy))
        {
            // Default sort by CreatedAt descending
            return query.OrderByDescending(e => e.CreatedAt);
        }

        // Use reflection to sort by property name
        var property = typeof(TEntity).GetProperty(sortBy);
        if (property == null)
        {
            return query.OrderByDescending(e => e.CreatedAt);
        }

        return descending
            ? query.OrderByDescending(e => EF.Property<object>(e, sortBy))
            : query.OrderBy(e => EF.Property<object>(e, sortBy));
    }
}
