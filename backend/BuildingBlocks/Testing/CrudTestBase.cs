using BuildingBlocks.Repository;
using Microsoft.EntityFrameworkCore;
using Xunit;
using FluentAssertions;

namespace BuildingBlocks.Testing;

public abstract class CrudTestBase<TEntity, TId, TDbContext> : TestBase<TDbContext>
    where TEntity : Entity<TId>
    where TDbContext : DbContext
{
    protected abstract TEntity CreateValidEntity();
    protected abstract TEntity CreateInvalidEntity();
    protected abstract void UpdateEntity(TEntity entity);

    protected IRepository<TEntity, TId> GetRepository()
    {
        return new Repository<TEntity, TId, TDbContext>(DbContext);
    }

    [Fact]
    public virtual async Task Create_ValidData_Success()
    {
        // Arrange
        var repository = GetRepository();
        var entity = CreateValidEntity();

        // Act
        var created = await repository.AddAsync(entity);

        // Assert
        created.Should().NotBeNull();
        created.Id.Should().NotBe(default(TId));
        created.IsActive.Should().BeTrue();
        created.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public virtual async Task GetById_ExistingEntity_ReturnsEntity()
    {
        // Arrange
        var repository = GetRepository();
        var entity = CreateValidEntity();
        var created = await repository.AddAsync(entity);

        // Act
        var retrieved = await repository.GetByIdAsync(created.Id);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Id.Should().Be(created.Id);
    }

    [Fact]
    public virtual async Task GetById_NonExistentEntity_ReturnsNull()
    {
        // Arrange
        var repository = GetRepository();
        var nonExistentId = default(TId);

        // Act
        var result = await repository.GetByIdAsync(nonExistentId!);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public virtual async Task Update_ExistingEntity_Success()
    {
        // Arrange
        var repository = GetRepository();
        var entity = CreateValidEntity();
        var created = await repository.AddAsync(entity);

        // Act
        UpdateEntity(created);
        await repository.UpdateAsync(created);
        var updated = await repository.GetByIdAsync(created.Id);

        // Assert
        updated.Should().NotBeNull();
        updated!.UpdatedAt.Should().NotBeNull();
        updated.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public virtual async Task Delete_ExistingEntity_SoftDeletes()
    {
        // Arrange
        var repository = GetRepository();
        var entity = CreateValidEntity();
        var created = await repository.AddAsync(entity);

        // Act
        await repository.DeleteAsync(created.Id);

        // Assert
        var deleted = await DbContext.Set<TEntity>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id!.Equals(created.Id));
        deleted.Should().NotBeNull();
        deleted!.IsActive.Should().BeFalse();
    }

    [Fact]
    public virtual async Task GetPaged_ReturnsCorrectPage()
    {
        // Arrange
        var repository = GetRepository();
        var entities = Enumerable.Range(1, 25)
            .Select(_ => CreateValidEntity())
            .ToList();

        foreach (var entity in entities)
        {
            await repository.AddAsync(entity);
        }

        var queryParams = new QueryParams { Page = 2, PageSize = 10 };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(10);
        result.Total.Should().Be(25);
        result.Page.Should().Be(2);
        result.PageSize.Should().Be(10);
        result.TotalPages.Should().Be(3);
    }

    [Fact]
    public virtual async Task Exists_ExistingEntity_ReturnsTrue()
    {
        // Arrange
        var repository = GetRepository();
        var entity = CreateValidEntity();
        var created = await repository.AddAsync(entity);

        // Act
        var exists = await repository.ExistsAsync(created.Id);

        // Assert
        exists.Should().BeTrue();
    }

    [Fact]
    public virtual async Task Exists_NonExistentEntity_ReturnsFalse()
    {
        // Arrange
        var repository = GetRepository();
        var nonExistentId = default(TId);

        // Act
        var exists = await repository.ExistsAsync(nonExistentId!);

        // Assert
        exists.Should().BeFalse();
    }
}
