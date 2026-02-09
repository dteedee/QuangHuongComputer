using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProductSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.RenameTable(
                name: "Products",
                newName: "Products",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "Categories",
                newName: "Categories",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "Brands",
                newName: "Brands",
                newSchema: "public");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "Products",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Products",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "Products",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<float>(
                name: "AverageRating",
                schema: "public",
                table: "Products",
                type: "real",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<string>(
                name: "Barcode",
                schema: "public",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CanonicalUrl",
                schema: "public",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CostPrice",
                schema: "public",
                table: "Products",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                schema: "public",
                table: "Products",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DiscontinuedAt",
                schema: "public",
                table: "Products",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GalleryImages",
                schema: "public",
                table: "Products",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "public",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LowStockThreshold",
                schema: "public",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "MetaDescription",
                schema: "public",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaKeywords",
                schema: "public",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaTitle",
                schema: "public",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OldPrice",
                schema: "public",
                table: "Products",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                schema: "public",
                table: "Products",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReviewCount",
                schema: "public",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Sku",
                schema: "public",
                table: "Products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SoldCount",
                schema: "public",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Specifications",
                schema: "public",
                table: "Products",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                schema: "public",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "StockLocations",
                schema: "public",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                schema: "public",
                table: "Products",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ViewCount",
                schema: "public",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "WarrantyInfo",
                schema: "public",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Weight",
                schema: "public",
                table: "Products",
                type: "numeric(10,3)",
                precision: 10,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "Categories",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "Categories",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "Brands",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "public",
                table: "Brands",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "Brands",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.CreateTable(
                name: "ProductAttributes",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttributeName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AttributeValue = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsFilterable = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductAttributes", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_attributes_product_id",
                        column: x => x.ProductId,
                        principalSchema: "public",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductReviews",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<string>(type: "text", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Comment = table.Column<string>(type: "text", nullable: false),
                    IsVerifiedPurchase = table.Column<bool>(type: "boolean", nullable: false),
                    IsApproved = table.Column<bool>(type: "boolean", nullable: false),
                    HelpfulCount = table.Column<int>(type: "integer", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ApprovedBy = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductReviews", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_reviews_product_id",
                        column: x => x.ProductId,
                        principalSchema: "public",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_products_brand_id_status",
                schema: "public",
                table: "Products",
                columns: new[] { "BrandId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "ix_products_category_id_status",
                schema: "public",
                table: "Products",
                columns: new[] { "CategoryId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "ix_products_created_at",
                schema: "public",
                table: "Products",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "ix_products_low_stock",
                schema: "public",
                table: "Products",
                columns: new[] { "StockQuantity", "IsActive" },
                filter: "\"StockQuantity\" <= \"LowStockThreshold\"");

            migrationBuilder.CreateIndex(
                name: "ix_products_name_status",
                schema: "public",
                table: "Products",
                columns: new[] { "Name", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "ix_products_price_status",
                schema: "public",
                table: "Products",
                columns: new[] { "Price", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "uq_products_sku",
                schema: "public",
                table: "Products",
                column: "Sku",
                unique: true,
                filter: "\"IsActive\" = true");

            migrationBuilder.CreateIndex(
                name: "ix_product_attributes_name_filterable",
                schema: "public",
                table: "ProductAttributes",
                columns: new[] { "AttributeName", "IsFilterable" });

            migrationBuilder.CreateIndex(
                name: "ix_product_attributes_product_id_name",
                schema: "public",
                table: "ProductAttributes",
                columns: new[] { "ProductId", "AttributeName" });

            migrationBuilder.CreateIndex(
                name: "ix_product_reviews_product_id_approved",
                schema: "public",
                table: "ProductReviews",
                columns: new[] { "ProductId", "IsApproved" });

            migrationBuilder.CreateIndex(
                name: "ix_product_reviews_rating",
                schema: "public",
                table: "ProductReviews",
                column: "Rating");

            migrationBuilder.AddForeignKey(
                name: "fk_products_brand_id",
                schema: "public",
                table: "Products",
                column: "BrandId",
                principalSchema: "public",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_products_category_id",
                schema: "public",
                table: "Products",
                column: "CategoryId",
                principalSchema: "public",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_products_brand_id",
                schema: "public",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "fk_products_category_id",
                schema: "public",
                table: "Products");

            migrationBuilder.DropTable(
                name: "ProductAttributes",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductReviews",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "ix_products_brand_id_status",
                schema: "public",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "ix_products_category_id_status",
                schema: "public",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "ix_products_created_at",
                schema: "public",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "ix_products_low_stock",
                schema: "public",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "ix_products_name_status",
                schema: "public",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "ix_products_price_status",
                schema: "public",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "uq_products_sku",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "AverageRating",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Barcode",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "CanonicalUrl",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "CostPrice",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "DiscontinuedAt",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "GalleryImages",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "LowStockThreshold",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "MetaDescription",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "MetaKeywords",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "MetaTitle",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "OldPrice",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ReviewCount",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Sku",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SoldCount",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Specifications",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "StockLocations",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ViewCount",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "WarrantyInfo",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Weight",
                schema: "public",
                table: "Products");

            migrationBuilder.RenameTable(
                name: "Products",
                schema: "public",
                newName: "Products");

            migrationBuilder.RenameTable(
                name: "Categories",
                schema: "public",
                newName: "Categories");

            migrationBuilder.RenameTable(
                name: "Brands",
                schema: "public",
                newName: "Brands");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Products",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Products",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Products",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Categories",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Categories",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Categories",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Brands",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Brands",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Brands",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");
        }
    }
}
