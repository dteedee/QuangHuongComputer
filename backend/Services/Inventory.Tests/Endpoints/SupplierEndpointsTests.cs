using BuildingBlocks.Repository;
using BuildingBlocks.Testing;
using FluentAssertions;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using InventoryModule.Repository;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Inventory.Tests.Endpoints;

public class SupplierEndpointsTests : TestBase<InventoryDbContext>
{
    private SupplierRepository GetRepository() => new SupplierRepository(DbContext);

    private Supplier CreateValidSupplier(string name = "Test Supplier")
    {
        return new Supplier(
            name,
            "Contact Person",
            "contact@test.com",
            "0123456789",
            "123 Test Street"
        );
    }

    [Fact]
    public async Task GetPaged_WithNoSuppliers_ReturnsEmptyList()
    {
        // Arrange
        var repository = GetRepository();
        var queryParams = new QueryParams { Page = 1, PageSize = 20 };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().BeEmpty();
        result.Total.Should().Be(0);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetPaged_WithSuppliers_ReturnsPagedList()
    {
        // Arrange
        var repository = GetRepository();
        var supplier1 = CreateValidSupplier("Supplier A");
        var supplier2 = CreateValidSupplier("Supplier B");
        var supplier3 = CreateValidSupplier("Supplier C");

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);
        await repository.AddAsync(supplier3);

        var queryParams = new QueryParams { Page = 1, PageSize = 2 };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(2);
        result.Total.Should().Be(3);
        result.TotalPages.Should().Be(2);
        result.HasNextPage.Should().BeTrue();
        result.HasPreviousPage.Should().BeFalse();
    }

    [Fact]
    public async Task GetPaged_WithSearch_FiltersResults()
    {
        // Arrange
        var repository = GetRepository();
        var supplier1 = CreateValidSupplier("ABC Electronics");
        var supplier2 = CreateValidSupplier("XYZ Corporation");
        var supplier3 = CreateValidSupplier("ABC Supplies");

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);
        await repository.AddAsync(supplier3);

        var queryParams = new QueryParams { Search = "ABC" };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(2);
        result.Items.Should().OnlyContain(s => s.Name.Contains("ABC"));
    }

    [Fact]
    public async Task GetPaged_SearchByContactPerson_ReturnsMatchingSuppliers()
    {
        // Arrange
        var repository = GetRepository();
        var supplier1 = new Supplier("Supplier A", "John Doe", "john@test.com", "0123456789", "Address A");
        var supplier2 = new Supplier("Supplier B", "Jane Smith", "jane@test.com", "0987654321", "Address B");

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);

        var queryParams = new QueryParams { Search = "John" };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items.First().ContactPerson.Should().Be("John Doe");
    }

    [Fact]
    public async Task GetPaged_SearchByEmail_ReturnsMatchingSuppliers()
    {
        // Arrange
        var repository = GetRepository();
        var supplier1 = new Supplier("Supplier A", "Contact A", "unique@test.com", "0123456789", "Address A");
        var supplier2 = new Supplier("Supplier B", "Contact B", "common@test.com", "0987654321", "Address B");

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);

        var queryParams = new QueryParams { Search = "unique" };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items.First().Email.Should().Be("unique@test.com");
    }

    [Fact]
    public async Task GetPaged_SearchByPhone_ReturnsMatchingSuppliers()
    {
        // Arrange
        var repository = GetRepository();
        var supplier1 = new Supplier("Supplier A", "Contact A", "a@test.com", "1234567890", "Address A");
        var supplier2 = new Supplier("Supplier B", "Contact B", "b@test.com", "0987654321", "Address B");

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);

        var queryParams = new QueryParams { Search = "12345" };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items.First().Phone.Should().Be("1234567890");
    }

    [Fact]
    public async Task GetPaged_SearchByAddress_ReturnsMatchingSuppliers()
    {
        // Arrange
        var repository = GetRepository();
        var supplier1 = new Supplier("Supplier A", "Contact A", "a@test.com", "0123456789", "123 Main Street");
        var supplier2 = new Supplier("Supplier B", "Contact B", "b@test.com", "0987654321", "456 Oak Avenue");

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);

        var queryParams = new QueryParams { Search = "Main" };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items.First().Address.Should().Be("123 Main Street");
    }

    [Fact]
    public async Task GetPaged_WithSortByName_ReturnsSortedResults()
    {
        // Arrange
        var repository = GetRepository();
        var supplier1 = CreateValidSupplier("Zebra Corp");
        var supplier2 = CreateValidSupplier("Alpha Inc");
        var supplier3 = CreateValidSupplier("Beta LLC");

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);
        await repository.AddAsync(supplier3);

        var queryParams = new QueryParams { SortBy = "Name", SortDescending = false };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(3);
        result.Items[0].Name.Should().Be("Alpha Inc");
        result.Items[1].Name.Should().Be("Beta LLC");
        result.Items[2].Name.Should().Be("Zebra Corp");
    }

    [Fact]
    public async Task GetPaged_WithSortDescending_ReturnsSortedResults()
    {
        // Arrange
        var repository = GetRepository();
        var supplier1 = CreateValidSupplier("Alpha Inc");
        var supplier2 = CreateValidSupplier("Beta LLC");

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);

        var queryParams = new QueryParams { SortBy = "Name", SortDescending = true };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(2);
        result.Items[0].Name.Should().Be("Beta LLC");
        result.Items[1].Name.Should().Be("Alpha Inc");
    }

    [Fact]
    public async Task GetPaged_ExcludesInactive_ByDefault()
    {
        // Arrange
        var repository = GetRepository();
        var activeSupplier = CreateValidSupplier("Active Supplier");
        var inactiveSupplier = CreateValidSupplier("Inactive Supplier");

        await repository.AddAsync(activeSupplier);
        await repository.AddAsync(inactiveSupplier);

        // Soft delete the inactive supplier
        await repository.DeleteAsync(inactiveSupplier.Id);

        var queryParams = new QueryParams { IncludeInactive = false };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items.First().Name.Should().Be("Active Supplier");
    }

    [Fact]
    public async Task GetPaged_IncludesInactive_WhenSpecified()
    {
        // Arrange
        var repository = GetRepository();
        var activeSupplier = CreateValidSupplier("Active Supplier");
        var inactiveSupplier = CreateValidSupplier("Inactive Supplier");

        await repository.AddAsync(activeSupplier);
        await repository.AddAsync(inactiveSupplier);

        // Soft delete the inactive supplier
        await repository.DeleteAsync(inactiveSupplier.Id);

        var queryParams = new QueryParams { IncludeInactive = true };

        // Act
        var result = await DbContext.Suppliers
            .IgnoreQueryFilters()
            .Skip(queryParams.Skip)
            .Take(queryParams.Take)
            .ToListAsync();

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetById_ExistingSupplier_ReturnsSupplier()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier();
        await repository.AddAsync(supplier);

        // Act
        var result = await repository.GetByIdAsync(supplier.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(supplier.Id);
        result.Name.Should().Be(supplier.Name);
    }

    [Fact]
    public async Task GetById_NonExistentSupplier_ReturnsNull()
    {
        // Arrange
        var repository = GetRepository();
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await repository.GetByIdAsync(nonExistentId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task Create_ValidSupplier_CreatesSuccessfully()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier();

        // Act
        var created = await repository.AddAsync(supplier);

        // Assert
        created.Should().NotBeNull();
        created.Id.Should().NotBe(Guid.Empty);
        created.IsActive.Should().BeTrue();
        created.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        created.UpdatedAt.Should().BeNull();
    }

    [Fact]
    public async Task Update_ExistingSupplier_UpdatesSuccessfully()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier("Original Name");
        await repository.AddAsync(supplier);

        // Act
        supplier.UpdateDetails(
            "Updated Name",
            "Updated Contact",
            "updated@test.com",
            "9999999999",
            "Updated Address"
        );
        await repository.UpdateAsync(supplier);

        var updated = await repository.GetByIdAsync(supplier.Id);

        // Assert
        updated.Should().NotBeNull();
        updated!.Name.Should().Be("Updated Name");
        updated.ContactPerson.Should().Be("Updated Contact");
        updated.Email.Should().Be("updated@test.com");
        updated.Phone.Should().Be("9999999999");
        updated.Address.Should().Be("Updated Address");
        updated.UpdatedAt.Should().NotBeNull();
        updated.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Delete_ExistingSupplier_SoftDeletesSuccessfully()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier();
        await repository.AddAsync(supplier);

        // Act
        await repository.DeleteAsync(supplier.Id);

        // Assert - Should not be found in normal queries
        var result = await repository.GetByIdAsync(supplier.Id);
        result.Should().BeNull();

        // Assert - Should still exist in database but marked as inactive
        var deleted = await DbContext.Suppliers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == supplier.Id);

        deleted.Should().NotBeNull();
        deleted!.IsActive.Should().BeFalse();
        deleted.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Delete_SupplierWithActivePurchaseOrders_ShouldPreventDeletion()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier();
        await repository.AddAsync(supplier);

        // Create a purchase order for this supplier
        var poItems = new List<PurchaseOrderItem>
        {
            new PurchaseOrderItem(Guid.NewGuid(), 10, 100.00m)
        };
        var po = new PurchaseOrder(supplier.Id, poItems);
        DbContext.PurchaseOrders.Add(po);
        await DbContext.SaveChangesAsync();

        // Act
        var hasActivePOs = await repository.HasActivePurchaseOrders(supplier.Id);

        // Assert
        hasActivePOs.Should().BeTrue();
    }

    [Fact]
    public async Task Delete_SupplierWithoutPurchaseOrders_AllowsDeletion()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier();
        await repository.AddAsync(supplier);

        // Act
        var hasActivePOs = await repository.HasActivePurchaseOrders(supplier.Id);

        // Assert
        hasActivePOs.Should().BeFalse();
    }

    [Fact]
    public async Task Delete_SupplierWithInactivePurchaseOrders_AllowsDeletion()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier();
        await repository.AddAsync(supplier);

        // Create an inactive purchase order
        var poItems = new List<PurchaseOrderItem>
        {
            new PurchaseOrderItem(Guid.NewGuid(), 10, 100.00m)
        };
        var po = new PurchaseOrder(supplier.Id, poItems);
        po.IsActive = false;
        DbContext.PurchaseOrders.Add(po);
        await DbContext.SaveChangesAsync();

        // Act
        var hasActivePOs = await repository.HasActivePurchaseOrders(supplier.Id);

        // Assert
        hasActivePOs.Should().BeFalse();
    }

    [Fact]
    public async Task ToggleActive_ActiveSupplier_MakesInactive()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier();
        await repository.AddAsync(supplier);

        supplier.IsActive.Should().BeTrue();

        // Act
        supplier.IsActive = false;
        supplier.UpdatedAt = DateTime.UtcNow;
        await DbContext.SaveChangesAsync();

        var updated = await DbContext.Suppliers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == supplier.Id);

        // Assert
        updated.Should().NotBeNull();
        updated!.IsActive.Should().BeFalse();
        updated.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task ToggleActive_InactiveSupplier_MakesActive()
    {
        // Arrange
        var repository = GetRepository();
        var supplier = CreateValidSupplier();
        await repository.AddAsync(supplier);
        await repository.DeleteAsync(supplier.Id);

        // Act
        var inactiveSupplier = await DbContext.Suppliers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == supplier.Id);

        inactiveSupplier!.IsActive = true;
        inactiveSupplier.UpdatedAt = DateTime.UtcNow;
        await DbContext.SaveChangesAsync();

        var updated = await repository.GetByIdAsync(supplier.Id);

        // Assert
        updated.Should().NotBeNull();
        updated!.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task Pagination_SecondPage_ReturnsCorrectItems()
    {
        // Arrange
        var repository = GetRepository();
        for (int i = 1; i <= 25; i++)
        {
            await repository.AddAsync(CreateValidSupplier($"Supplier {i:D2}"));
        }

        var queryParams = new QueryParams { Page = 2, PageSize = 10 };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(10);
        result.Total.Should().Be(25);
        result.Page.Should().Be(2);
        result.TotalPages.Should().Be(3);
        result.HasPreviousPage.Should().BeTrue();
        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public async Task Pagination_LastPage_ReturnsRemainingItems()
    {
        // Arrange
        var repository = GetRepository();
        for (int i = 1; i <= 25; i++)
        {
            await repository.AddAsync(CreateValidSupplier($"Supplier {i:D2}"));
        }

        var queryParams = new QueryParams { Page = 3, PageSize = 10 };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(5);
        result.Total.Should().Be(25);
        result.Page.Should().Be(3);
        result.TotalPages.Should().Be(3);
        result.HasPreviousPage.Should().BeTrue();
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public async Task SearchAndPagination_Combined_WorksCorrectly()
    {
        // Arrange
        var repository = GetRepository();
        for (int i = 1; i <= 15; i++)
        {
            await repository.AddAsync(CreateValidSupplier($"ABC Supplier {i:D2}"));
        }
        for (int i = 1; i <= 10; i++)
        {
            await repository.AddAsync(CreateValidSupplier($"XYZ Supplier {i:D2}"));
        }

        var queryParams = new QueryParams
        {
            Search = "ABC",
            Page = 2,
            PageSize = 5
        };

        // Act
        var result = await repository.GetPagedAsync(queryParams);

        // Assert
        result.Items.Should().HaveCount(5);
        result.Total.Should().Be(15);
        result.TotalPages.Should().Be(3);
        result.Items.Should().OnlyContain(s => s.Name.Contains("ABC"));
    }
}
