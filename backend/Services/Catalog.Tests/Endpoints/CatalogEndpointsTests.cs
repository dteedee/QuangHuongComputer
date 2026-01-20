using Catalog.Domain;
using Catalog.Infrastructure;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Catalog.Tests.Endpoints;

public class CatalogEndpointsTests : IDisposable
{
    private readonly CatalogDbContext _context;
    private readonly Guid _categoryId;
    private readonly Guid _brandId;

    public CatalogEndpointsTests()
    {
        var options = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new CatalogDbContext(options);

        // Setup test data
        _categoryId = Guid.NewGuid();
        _brandId = Guid.NewGuid();

        var category = new Category("Laptop", "Laptop Gaming");
        var brand = new Brand("ASUS", "ASUS Brand");

        // Use reflection to set Ids for test entities
        typeof(Category).GetProperty("Id")!.SetValue(category, _categoryId);
        typeof(Brand).GetProperty("Id")!.SetValue(brand, _brandId);

        _context.Categories.Add(category);
        _context.Brands.Add(brand);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task SearchProducts_WithCategoryFilter_ReturnsFilteredProducts()
    {
        // Arrange
        var product1 = new Product(
            "ASUS ROG Strix",
            25000000,
            "Gaming laptop",
            _categoryId,
            _brandId,
            10,
            "QH-TEST001",
            28000000,
            "{\"RAM\":\"16GB\",\"SSD\":\"512GB\"}",
            "Bảo hành 24 tháng"
        );

        var otherCategoryId = Guid.NewGuid();
        var otherCategory = new Category("PC Gaming", "PC Gaming");
        typeof(Category).GetProperty("Id")!.SetValue(otherCategory, otherCategoryId);
        _context.Categories.Add(otherCategory);

        var product2 = new Product(
            "Gaming PC",
            30000000,
            "Desktop PC",
            otherCategoryId,
            _brandId,
            5
        );

        _context.Products.AddRange(product1, product2);
        await _context.SaveChangesAsync();

        // Act
        var query = _context.Products.AsQueryable();
        query = query.Where(p => p.CategoryId == _categoryId);
        var results = await query.ToListAsync();

        // Assert
        results.Should().HaveCount(1);
        results.First().Name.Should().Be("ASUS ROG Strix");
        results.First().CategoryId.Should().Be(_categoryId);
    }

    [Fact]
    public async Task SearchProducts_WithPriceRangeFilter_ReturnsProductsInRange()
    {
        // Arrange
        var product1 = new Product("Product 1", 10000000, "Description 1", _categoryId, _brandId, 10);
        var product2 = new Product("Product 2", 20000000, "Description 2", _categoryId, _brandId, 10);
        var product3 = new Product("Product 3", 30000000, "Description 3", _categoryId, _brandId, 10);

        _context.Products.AddRange(product1, product2, product3);
        await _context.SaveChangesAsync();

        // Act
        decimal minPrice = 15000000;
        decimal maxPrice = 25000000;

        var query = _context.Products.AsQueryable();
        query = query.Where(p => p.Price >= minPrice && p.Price <= maxPrice);
        var results = await query.ToListAsync();

        // Assert
        results.Should().HaveCount(1);
        results.First().Price.Should().Be(20000000);
    }

    [Fact]
    public async Task SearchProducts_WithBrandFilter_ReturnsFilteredProducts()
    {
        // Arrange
        var otherBrandId = Guid.NewGuid();
        var otherBrand = new Brand("Dell", "Dell Brand");
        typeof(Brand).GetProperty("Id")!.SetValue(otherBrand, otherBrandId);
        _context.Brands.Add(otherBrand);

        var product1 = new Product("ASUS Product", 20000000, "ASUS Description", _categoryId, _brandId, 10);
        var product2 = new Product("Dell Product", 25000000, "Dell Description", _categoryId, otherBrandId, 10);

        _context.Products.AddRange(product1, product2);
        await _context.SaveChangesAsync();

        // Act
        var query = _context.Products.AsQueryable();
        query = query.Where(p => p.BrandId == _brandId);
        var results = await query.ToListAsync();

        // Assert
        results.Should().HaveCount(1);
        results.First().Name.Should().Be("ASUS Product");
    }

    [Fact]
    public async Task SearchProducts_WithTextSearch_ReturnsMatchingProducts()
    {
        // Arrange
        var product1 = new Product("ASUS ROG Gaming", 25000000, "High performance gaming laptop", _categoryId, _brandId, 10);
        var product2 = new Product("Dell Workstation", 30000000, "Professional workstation", _categoryId, _brandId, 10);

        _context.Products.AddRange(product1, product2);
        await _context.SaveChangesAsync();

        // Act
        string searchQuery = "gaming";
        var query = _context.Products.AsQueryable();
        query = query.Where(p => p.Name.Contains(searchQuery) || p.Description.Contains(searchQuery));
        var results = await query.ToListAsync();

        // Assert
        results.Should().HaveCount(1);
        results.First().Name.Should().Contain("Gaming");
    }

    [Fact]
    public async Task SearchProducts_WithInStockFilter_ReturnsOnlyInStockProducts()
    {
        // Arrange
        var product1 = new Product("In Stock Product", 20000000, "Available", _categoryId, _brandId, 10);
        var product2 = new Product("Out of Stock Product", 25000000, "Not available", _categoryId, _brandId, 0);

        _context.Products.AddRange(product1, product2);
        await _context.SaveChangesAsync();

        // Act
        var query = _context.Products.AsQueryable();
        query = query.Where(p => p.StockQuantity > 0);
        var results = await query.ToListAsync();

        // Assert
        results.Should().HaveCount(1);
        results.First().Name.Should().Be("In Stock Product");
    }

    [Theory]
    [InlineData("price_asc", new[] { 10000000m, 20000000m, 30000000m })]
    [InlineData("price_desc", new[] { 30000000m, 20000000m, 10000000m })]
    [InlineData("name", new[] { "Product A", "Product B", "Product C" })]
    public async Task SearchProducts_WithSorting_ReturnsSortedProducts(string sortBy, object expectedOrder)
    {
        // Arrange
        var product1 = new Product("Product C", 30000000, "Description", _categoryId, _brandId, 10);
        var product2 = new Product("Product A", 10000000, "Description", _categoryId, _brandId, 10);
        var product3 = new Product("Product B", 20000000, "Description", _categoryId, _brandId, 10);

        _context.Products.AddRange(product1, product2, product3);
        await _context.SaveChangesAsync();

        // Act
        var query = _context.Products.AsQueryable();

        query = sortBy switch
        {
            "price_asc" => query.OrderBy(p => p.Price),
            "price_desc" => query.OrderByDescending(p => p.Price),
            "name" => query.OrderBy(p => p.Name),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        var results = await query.ToListAsync();

        // Assert
        results.Should().HaveCount(3);

        if (sortBy == "price_asc" || sortBy == "price_desc")
        {
            var expectedPrices = (decimal[])expectedOrder;
            results.Select(p => p.Price).Should().Equal(expectedPrices);
        }
        else if (sortBy == "name")
        {
            var expectedNames = (string[])expectedOrder;
            results.Select(p => p.Name).Should().Equal(expectedNames);
        }
    }

    [Fact]
    public async Task SearchProducts_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        for (int i = 1; i <= 25; i++)
        {
            var product = new Product($"Product {i}", 10000000 + i, $"Description {i}", _categoryId, _brandId, 10);
            _context.Products.Add(product);
        }
        await _context.SaveChangesAsync();

        // Act
        int page = 2;
        int pageSize = 10;

        var query = _context.Products.AsQueryable();
        var total = await query.CountAsync();
        var results = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Assert
        total.Should().Be(25);
        results.Should().HaveCount(10);
        results.First().Name.Should().Be("Product 11");
    }

    [Fact]
    public async Task SearchProducts_WithCombinedFilters_ReturnsCorrectResults()
    {
        // Arrange
        var product1 = new Product("ASUS Gaming Laptop", 25000000, "Gaming laptop with RTX", _categoryId, _brandId, 15);
        var product2 = new Product("ASUS Office Laptop", 15000000, "Office laptop", _categoryId, _brandId, 5);
        var product3 = new Product("ASUS High-End Gaming", 35000000, "High-end gaming laptop", _categoryId, _brandId, 0);

        _context.Products.AddRange(product1, product2, product3);
        await _context.SaveChangesAsync();

        // Act
        string searchQuery = "gaming";
        decimal minPrice = 20000000;
        bool inStock = true;

        var query = _context.Products.AsQueryable();
        query = query.Where(p =>
            (p.Name.Contains(searchQuery) || p.Description.Contains(searchQuery)) &&
            p.Price >= minPrice &&
            p.StockQuantity > 0
        );
        var results = await query.ToListAsync();

        // Assert
        results.Should().HaveCount(1);
        results.First().Name.Should().Be("ASUS Gaming Laptop");
    }

    [Fact]
    public async Task GetProduct_WithValidId_ReturnsProduct()
    {
        // Arrange
        var product = new Product(
            "Test Product",
            25000000,
            "Test Description",
            _categoryId,
            _brandId,
            10,
            "QH-TEST123",
            28000000,
            "{\"RAM\":\"16GB\"}",
            "Bảo hành 36 tháng"
        );

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // Act
        var result = await _context.Products.FindAsync(product.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Test Product");
        result.Sku.Should().Be("QH-TEST123");
        result.OldPrice.Should().Be(28000000);
        result.WarrantyInfo.Should().Be("Bảo hành 36 tháng");
    }

    [Fact]
    public async Task GetProduct_WithInvalidId_ReturnsNull()
    {
        // Act
        var result = await _context.Products.FindAsync(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void Product_WithDefaultValues_HasCorrectDefaults()
    {
        // Act
        var product = new Product(
            "Test Product",
            25000000,
            "Description",
            _categoryId,
            _brandId,
            10
        );

        // Assert
        product.Sku.Should().StartWith("QH-");
        product.WarrantyInfo.Should().Be("Bảo hành 24 tháng");
        product.Status.Should().Be(ProductStatus.InStock);
    }

    [Theory]
    [InlineData(15, ProductStatus.InStock)]
    [InlineData(5, ProductStatus.LowStock)]
    [InlineData(0, ProductStatus.OutOfStock)]
    public void Product_WithDifferentStockLevels_HasCorrectStatus(int stock, ProductStatus expectedStatus)
    {
        // Act
        var product = new Product(
            "Test Product",
            25000000,
            "Description",
            _categoryId,
            _brandId,
            stock
        );

        // Assert
        product.Status.Should().Be(expectedStatus);
    }
}
