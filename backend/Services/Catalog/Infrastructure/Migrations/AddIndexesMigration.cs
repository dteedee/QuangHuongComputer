using Microsoft.EntityFrameworkCore.Migrations;

namespace Catalog.Infrastructure.Migrations;

/// <summary>
/// Migration to add performance indexes to all tables
/// </summary>
public partial class AddPerformanceIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Product Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Products_CategoryId",
            table: "Products",
            column: "CategoryId");

        migrationBuilder.CreateIndex(
            name: "IX_Products_BrandId",
            table: "Products",
            column: "BrandId");

        migrationBuilder.CreateIndex(
            name: "IX_Products_IsActive",
            table: "Products",
            column: "IsActive");

        migrationBuilder.CreateIndex(
            name: "IX_Products_CreatedAt",
            table: "Products",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Products_Name",
            table: "Products",
            column: "Name");

        migrationBuilder.CreateIndex(
            name: "IX_Products_Sku",
            table: "Products",
            column: "Sku",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Products_IsActive_CategoryId",
            table: "Products",
            columns: new[] { "IsActive", "CategoryId" });

        migrationBuilder.CreateIndex(
            name: "IX_Products_IsActive_CreatedAt",
            table: "Products",
            columns: new[] { "IsActive", "CreatedAt" });

        // Category Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Categories_IsActive",
            table: "Categories",
            column: "IsActive");

        migrationBuilder.CreateIndex(
            name: "IX_Categories_Name",
            table: "Categories",
            column: "Name");

        // Brand Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Brands_IsActive",
            table: "Brands",
            column: "IsActive");

        migrationBuilder.CreateIndex(
            name: "IX_Brands_Name",
            table: "Brands",
            column: "Name");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Drop all created indexes
        migrationBuilder.DropIndex(name: "IX_Products_CategoryId", table: "Products");
        migrationBuilder.DropIndex(name: "IX_Products_BrandId", table: "Products");
        migrationBuilder.DropIndex(name: "IX_Products_IsActive", table: "Products");
        migrationBuilder.DropIndex(name: "IX_Products_CreatedAt", table: "Products");
        migrationBuilder.DropIndex(name: "IX_Products_Name", table: "Products");
        migrationBuilder.DropIndex(name: "IX_Products_Sku", table: "Products");
        migrationBuilder.DropIndex(name: "IX_Products_IsActive_CategoryId", table: "Products");
        migrationBuilder.DropIndex(name: "IX_Products_IsActive_CreatedAt", table: "Products");
        migrationBuilder.DropIndex(name: "IX_Categories_IsActive", table: "Categories");
        migrationBuilder.DropIndex(name: "IX_Categories_Name", table: "Categories");
        migrationBuilder.DropIndex(name: "IX_Brands_IsActive", table: "Brands");
        migrationBuilder.DropIndex(name: "IX_Brands_Name", table: "Brands");
    }
}
