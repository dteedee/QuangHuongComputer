using System.Linq.Expressions;

namespace BuildingBlocks.Repository;

public static class IQueryableExtensions
{
    public static IQueryable<T> WhereIf<T>(
        this IQueryable<T> query,
        bool condition,
        Expression<Func<T, bool>> predicate)
    {
        return condition ? query.Where(predicate) : query;
    }

    public static IQueryable<T> OrderByProperty<T>(
        this IQueryable<T> query,
        string propertyName,
        bool descending = false)
    {
        if (string.IsNullOrWhiteSpace(propertyName))
            return query;

        var property = typeof(T).GetProperty(propertyName);
        if (property == null)
            return query;

        var parameter = Expression.Parameter(typeof(T), "x");
        var propertyAccess = Expression.MakeMemberAccess(parameter, property);
        var lambda = Expression.Lambda(propertyAccess, parameter);

        var methodName = descending ? "OrderByDescending" : "OrderBy";
        var method = typeof(Queryable).GetMethods()
            .First(m => m.Name == methodName && m.GetParameters().Length == 2)
            .MakeGenericMethod(typeof(T), property.PropertyType);

        return (IQueryable<T>)method.Invoke(null, new object[] { query, lambda })!;
    }

    public static IQueryable<T> Paginate<T>(
        this IQueryable<T> query,
        int page,
        int pageSize)
    {
        return query.Skip((page - 1) * pageSize).Take(pageSize);
    }
}
