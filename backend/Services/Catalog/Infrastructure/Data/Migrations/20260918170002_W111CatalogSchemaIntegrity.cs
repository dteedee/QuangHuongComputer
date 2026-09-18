using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W111CatalogSchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "OldPrice",
                schema: "public",
                table: "Products",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "VatRate",
                schema: "public",
                table: "Categories",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.10m,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0.10m);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SavedPcBuildItems_Quantity_Positive",
                schema: "public",
                table: "SavedPcBuildItems",
                sql: "\"Quantity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SavedPcBuildItems_UnitPrice_NonNegative",
                schema: "public",
                table: "SavedPcBuildItems",
                sql: "\"UnitPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductVariants_CostPrice_NonNegative",
                schema: "public",
                table: "ProductVariants",
                sql: "\"CostPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductVariants_OldPrice_NonNegative",
                schema: "public",
                table: "ProductVariants",
                sql: "\"OldPrice\" IS NULL OR \"OldPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductVariants_Price_NonNegative",
                schema: "public",
                table: "ProductVariants",
                sql: "\"Price\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductVariants_StockQuantity_NonNegative",
                schema: "public",
                table: "ProductVariants",
                sql: "\"StockQuantity\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_AverageRating_Range",
                schema: "public",
                table: "Products",
                sql: "\"AverageRating\" >= 0 AND \"AverageRating\" <= 5");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_CostPrice_NonNegative",
                schema: "public",
                table: "Products",
                sql: "\"CostPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_OldPrice_NonNegative",
                schema: "public",
                table: "Products",
                sql: "\"OldPrice\" IS NULL OR \"OldPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_Price_NonNegative",
                schema: "public",
                table: "Products",
                sql: "\"Price\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_StockQuantity_NonNegative",
                schema: "public",
                table: "Products",
                sql: "\"StockQuantity\" >= 0");

            migrationBuilder.CreateIndex(
                name: "ix_product_reviews_customer_id",
                schema: "public",
                table: "ProductReviews",
                column: "CustomerId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductReviews_Rating_Range",
                schema: "public",
                table: "ProductReviews",
                sql: "\"Rating\" >= 1 AND \"Rating\" <= 5");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductBundles_OriginalPrice_NonNegative",
                schema: "public",
                table: "ProductBundles",
                sql: "\"OriginalPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductBundles_TotalPrice_NonNegative",
                schema: "public",
                table: "ProductBundles",
                sql: "\"TotalPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductBundleItems_DiscountPercentage_Range",
                schema: "public",
                table: "ProductBundleItems",
                sql: "\"DiscountPercentage\" >= 0 AND \"DiscountPercentage\" <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductBundleItems_OriginalUnitPrice_NonNegative",
                schema: "public",
                table: "ProductBundleItems",
                sql: "\"OriginalUnitPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductBundleItems_Quantity_Positive",
                schema: "public",
                table: "ProductBundleItems",
                sql: "\"Quantity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Categories_VatRate_Fraction",
                schema: "public",
                table: "Categories",
                sql: "\"VatRate\" >= 0 AND \"VatRate\" <= 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SavedPcBuildItems_Quantity_Positive",
                schema: "public",
                table: "SavedPcBuildItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SavedPcBuildItems_UnitPrice_NonNegative",
                schema: "public",
                table: "SavedPcBuildItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductVariants_CostPrice_NonNegative",
                schema: "public",
                table: "ProductVariants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductVariants_OldPrice_NonNegative",
                schema: "public",
                table: "ProductVariants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductVariants_Price_NonNegative",
                schema: "public",
                table: "ProductVariants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductVariants_StockQuantity_NonNegative",
                schema: "public",
                table: "ProductVariants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_AverageRating_Range",
                schema: "public",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_CostPrice_NonNegative",
                schema: "public",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_OldPrice_NonNegative",
                schema: "public",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_Price_NonNegative",
                schema: "public",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_StockQuantity_NonNegative",
                schema: "public",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "ix_product_reviews_customer_id",
                schema: "public",
                table: "ProductReviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductReviews_Rating_Range",
                schema: "public",
                table: "ProductReviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductBundles_OriginalPrice_NonNegative",
                schema: "public",
                table: "ProductBundles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductBundles_TotalPrice_NonNegative",
                schema: "public",
                table: "ProductBundles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductBundleItems_DiscountPercentage_Range",
                schema: "public",
                table: "ProductBundleItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductBundleItems_OriginalUnitPrice_NonNegative",
                schema: "public",
                table: "ProductBundleItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductBundleItems_Quantity_Positive",
                schema: "public",
                table: "ProductBundleItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Categories_VatRate_Fraction",
                schema: "public",
                table: "Categories");

            migrationBuilder.AlterColumn<decimal>(
                name: "OldPrice",
                schema: "public",
                table: "Products",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "VatRate",
                schema: "public",
                table: "Categories",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0.10m,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,4)",
                oldPrecision: 5,
                oldScale: 4,
                oldDefaultValue: 0.10m);
        }
    }
}
