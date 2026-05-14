using Catalog.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Catalog;

public class SlugGeneratorTests
{
    [Theory]
    [InlineData("Laptop Gaming ASUS ROG", "laptop-gaming-asus-rog")]
    [InlineData("Ổ cứng SSD 512GB", "o-cung-ssd-512gb")]
    [InlineData("Bàn phím cơ RGB", "ban-phim-co-rgb")]
    [InlineData("Màn hình 27 inch 4K", "man-hinh-27-inch-4k")]
    [InlineData("Card đồ họa RTX 4060", "card-do-hoa-rtx-4060")]
    public void Generate_WithVietnameseNames_RemovesDiacritics(string input, string expected)
    {
        SlugGenerator.Generate(input).Should().Be(expected);
    }

    [Fact]
    public void Generate_WithEmptyInput_ReturnsEmpty()
    {
        SlugGenerator.Generate("").Should().BeEmpty();
        SlugGenerator.Generate("   ").Should().BeEmpty();
    }

    [Fact]
    public void Generate_WithSpecialCharacters_RemovesThem()
    {
        SlugGenerator.Generate("Product (2024) - New!").Should().Be("product-2024-new");
    }

    [Fact]
    public void GenerateUnique_WithNoConflict_ReturnsBaseSlug()
    {
        var slug = SlugGenerator.GenerateUnique("Test Product", _ => false);
        slug.Should().Be("test-product");
    }

    [Fact]
    public void GenerateUnique_WithConflict_AppendsSuffix()
    {
        var slug = SlugGenerator.GenerateUnique("Test Product", s => s == "test-product");
        slug.Should().Be("test-product-2");
    }
}
