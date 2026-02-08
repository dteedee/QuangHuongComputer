using FluentAssertions;
using FluentAssertions.Primitives;
using BuildingBlocks.SharedKernel;

namespace BuildingBlocks.Testing;

public static class EntityTestHelpers
{
    public static void ShouldHaveValidAuditFields<TId>(this Entity<TId> entity)
    {
        entity.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        entity.IsActive.Should().BeTrue();
    }

    public static void ShouldBeInactive<TId>(this Entity<TId> entity)
    {
        entity.IsActive.Should().BeFalse();
        entity.UpdatedAt.Should().NotBeNull();
        entity.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    public static void ShouldBeUpdated<TId>(this Entity<TId> entity)
    {
        entity.UpdatedAt.Should().NotBeNull();
        entity.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }
}
