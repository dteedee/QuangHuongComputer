using BuildingBlocks.Repository;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using BuildingBlocks.SharedKernel;

namespace BuildingBlocks.Endpoints;

public class CrudEndpointBuilder<TEntity, TId, TDbContext>
    where TEntity : Entity<TId>
    where TDbContext : DbContext
{
    private readonly RouteGroupBuilder _group;
    private readonly string _basePath;

    public CrudEndpointBuilder(RouteGroupBuilder group, string basePath = "")
    {
        _group = group;
        _basePath = basePath;
    }

    public CrudEndpointBuilder<TEntity, TId, TDbContext> WithList(string? permission = null)
    {
        var endpoint = _group.MapGet(_basePath, async (
            [AsParameters] QueryParams queryParams,
            TDbContext db) =>
        {
            var repository = new Repository<TEntity, TId, TDbContext>(db);
            var result = await repository.GetPagedAsync(queryParams);
            return Results.Ok(result);
        });

        if (!string.IsNullOrEmpty(permission))
        {
            endpoint.RequireAuthorization(permission);
        }

        return this;
    }

    public CrudEndpointBuilder<TEntity, TId, TDbContext> WithGet(string? permission = null)
    {
        var endpoint = _group.MapGet($"{_basePath}/{{id}}", async (
            TId id,
            TDbContext db) =>
        {
            var repository = new Repository<TEntity, TId, TDbContext>(db);
            var entity = await repository.GetByIdAsync(id);
            return entity != null ? Results.Ok(entity) : Results.NotFound();
        });

        if (!string.IsNullOrEmpty(permission))
        {
            endpoint.RequireAuthorization(permission);
        }

        return this;
    }

    public CrudEndpointBuilder<TEntity, TId, TDbContext> WithCreate<TCreateDto>(
        Func<TCreateDto, TEntity> mapFunc,
        IValidator<TCreateDto>? validator = null,
        string? permission = null)
    {
        var endpoint = _group.MapPost(_basePath, async (
            TCreateDto dto,
            TDbContext db) =>
        {
            // Validate if validator is provided
            if (validator != null)
            {
                var validationResult = await validator.ValidateAsync(dto);
                if (!validationResult.IsValid)
                {
                    return Results.BadRequest(new { errors = validationResult.Errors });
                }
            }

            var entity = mapFunc(dto);
            var repository = new Repository<TEntity, TId, TDbContext>(db);
            var created = await repository.AddAsync(entity);
            return Results.Created($"{_basePath}/{created.Id}", created);
        });

        if (!string.IsNullOrEmpty(permission))
        {
            endpoint.RequireAuthorization(permission);
        }

        return this;
    }

    public CrudEndpointBuilder<TEntity, TId, TDbContext> WithUpdate<TUpdateDto>(
        Func<TEntity, TUpdateDto, TEntity> updateFunc,
        IValidator<TUpdateDto>? validator = null,
        string? permission = null)
    {
        var endpoint = _group.MapPut($"{_basePath}/{{id}}", async (
            TId id,
            TUpdateDto dto,
            TDbContext db) =>
        {
            // Validate if validator is provided
            if (validator != null)
            {
                var validationResult = await validator.ValidateAsync(dto);
                if (!validationResult.IsValid)
                {
                    return Results.BadRequest(new { errors = validationResult.Errors });
                }
            }

            var repository = new Repository<TEntity, TId, TDbContext>(db);
            var entity = await repository.GetByIdAsync(id);
            if (entity == null)
            {
                return Results.NotFound();
            }

            var updated = updateFunc(entity, dto);
            await repository.UpdateAsync(updated);
            return Results.Ok(updated);
        });

        if (!string.IsNullOrEmpty(permission))
        {
            endpoint.RequireAuthorization(permission);
        }

        return this;
    }

    public CrudEndpointBuilder<TEntity, TId, TDbContext> WithDelete(
        string? permission = null,
        bool hardDelete = false)
    {
        var endpoint = _group.MapDelete($"{_basePath}/{{id}}", async (
            TId id,
            TDbContext db) =>
        {
            var repository = new Repository<TEntity, TId, TDbContext>(db);
            var entity = await repository.GetByIdAsync(id);
            if (entity == null)
            {
                return Results.NotFound();
            }

            if (hardDelete)
            {
                db.Set<TEntity>().Remove(entity);
                await db.SaveChangesAsync();
            }
            else
            {
                await repository.DeleteAsync(id);
            }

            return Results.NoContent();
        });

        if (!string.IsNullOrEmpty(permission))
        {
            endpoint.RequireAuthorization(permission);
        }

        return this;
    }

    public CrudEndpointBuilder<TEntity, TId, TDbContext> WithToggleActive(string? permission = null)
    {
        var endpoint = _group.MapPut($"{_basePath}/{{id}}/toggle-active", async (
            TId id,
            TDbContext db) =>
        {
            var repository = new Repository<TEntity, TId, TDbContext>(db);
            var entity = await repository.GetByIdAsync(id);
            if (entity == null)
            {
                return Results.NotFound();
            }

            entity.IsActive = !entity.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(entity);
        });

        if (!string.IsNullOrEmpty(permission))
        {
            endpoint.RequireAuthorization(permission);
        }

        return this;
    }
}
