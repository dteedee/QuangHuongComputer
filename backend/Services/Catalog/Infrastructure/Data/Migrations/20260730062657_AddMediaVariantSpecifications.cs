using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaVariantSpecifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // TODO Phase 03: migrate legacy Product.ImageUrl + GalleryImages (JSON) → ProductMedia records.
            // Cần script Python/SQL riêng vì logic parse JSON phức tạp; giữ ImageUrl/GalleryImages ở Product
            // để ProductCard/giỏ hàng cũ vẫn hoạt động qua Product.EffectiveImageUrl.
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                schema: "public",
                table: "Products",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ImageUrls",
                schema: "public",
                table: "ProductReviews",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                schema: "public",
                table: "ProductReviews",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                schema: "public",
                table: "Categories",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeactivatedAt",
                schema: "public",
                table: "Categories",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeactivatedBy",
                schema: "public",
                table: "Categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Slug",
                schema: "public",
                table: "Categories",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "VatRate",
                schema: "public",
                table: "Categories",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0.10m);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                schema: "public",
                table: "Brands",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeactivatedAt",
                schema: "public",
                table: "Brands",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeactivatedBy",
                schema: "public",
                table: "Brands",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductBundles",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OriginalPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    ValidFrom = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ValidTo = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductBundles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductMedias",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Url = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    AltText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductMedias", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_medias_product_id",
                        column: x => x.ProductId,
                        principalSchema: "public",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductOptionTypes",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    InputType = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductOptionTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sku = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OldPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    CostPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    StockQuantity = table.Column<int>(type: "integer", nullable: false),
                    Barcode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_variants_product_id",
                        column: x => x.ProductId,
                        principalSchema: "public",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SavedPcBuilds",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    BuildCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalWattage = table.Column<int>(type: "integer", nullable: false),
                    IsCompatible = table.Column<bool>(type: "boolean", nullable: false),
                    CompatibilityIssues = table.Column<string>(type: "jsonb", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedPcBuilds", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SpecificationGroups",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpecificationGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductBundleItems",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BundleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsMainItem = table.Column<bool>(type: "boolean", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    OriginalUnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountPercentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductBundleItems", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_bundle_items_bundle_id",
                        column: x => x.BundleId,
                        principalSchema: "public",
                        principalTable: "ProductBundles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_product_bundle_items_product_id",
                        column: x => x.ProductId,
                        principalSchema: "public",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductOptionValues",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OptionTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DisplayValue = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ColorHex = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductOptionValues", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_option_values_option_type_id",
                        column: x => x.OptionTypeId,
                        principalSchema: "public",
                        principalTable: "ProductOptionTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SavedPcBuildItems",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BuildId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    ComponentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedPcBuildItems", x => x.Id);
                    table.ForeignKey(
                        name: "fk_saved_pc_build_items_build_id",
                        column: x => x.BuildId,
                        principalSchema: "public",
                        principalTable: "SavedPcBuilds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_saved_pc_build_items_product_id",
                        column: x => x.ProductId,
                        principalSchema: "public",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SpecificationAttributes",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DataType = table.Column<int>(type: "integer", nullable: false),
                    EnumValuesJson = table.Column<string>(type: "jsonb", nullable: true),
                    IsFilterable = table.Column<bool>(type: "boolean", nullable: false),
                    IsComparable = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpecificationAttributes", x => x.Id);
                    table.ForeignKey(
                        name: "fk_specification_attributes_group_id",
                        column: x => x.GroupId,
                        principalSchema: "public",
                        principalTable: "SpecificationGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariantOptions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    OptionTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    OptionValueId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariantOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariantOptions_ProductVariants_VariantId",
                        column: x => x.VariantId,
                        principalSchema: "public",
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_product_variant_options_option_type_id",
                        column: x => x.OptionTypeId,
                        principalSchema: "public",
                        principalTable: "ProductOptionTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_product_variant_options_option_value_id",
                        column: x => x.OptionValueId,
                        principalSchema: "public",
                        principalTable: "ProductOptionValues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductSpecificationValues",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttributeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ValueText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ValueNumber = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    ValueBool = table.Column<bool>(type: "boolean", nullable: true),
                    ValueEnum = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductSpecificationValues", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_spec_values_attribute_id",
                        column: x => x.AttributeId,
                        principalSchema: "public",
                        principalTable: "SpecificationAttributes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_product_spec_values_product_id",
                        column: x => x.ProductId,
                        principalSchema: "public",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "uq_products_slug",
                schema: "public",
                table: "Products",
                column: "Slug",
                unique: true,
                filter: "\"Slug\" IS NOT NULL AND \"Slug\" != ''");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_DeactivatedAt",
                schema: "public",
                table: "Categories",
                column: "DeactivatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name_IsActive",
                schema: "public",
                table: "Categories",
                columns: new[] { "Name", "IsActive" },
                unique: true,
                filter: "\"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "uq_categories_slug",
                schema: "public",
                table: "Categories",
                column: "Slug",
                unique: true,
                filter: "\"Slug\" IS NOT NULL AND \"Slug\" != ''");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_DeactivatedAt",
                schema: "public",
                table: "Brands",
                column: "DeactivatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_Name_IsActive",
                schema: "public",
                table: "Brands",
                columns: new[] { "Name", "IsActive" },
                unique: true,
                filter: "\"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "ix_product_bundle_items_product_id_main",
                schema: "public",
                table: "ProductBundleItems",
                columns: new[] { "ProductId", "IsMainItem" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductBundleItems_BundleId",
                schema: "public",
                table: "ProductBundleItems",
                column: "BundleId");

            migrationBuilder.CreateIndex(
                name: "ix_product_bundles_valid_from",
                schema: "public",
                table: "ProductBundles",
                column: "ValidFrom");

            migrationBuilder.CreateIndex(
                name: "ix_product_bundles_valid_to",
                schema: "public",
                table: "ProductBundles",
                column: "ValidTo");

            migrationBuilder.CreateIndex(
                name: "ix_product_medias_primary",
                schema: "public",
                table: "ProductMedias",
                column: "ProductId",
                filter: "\"IsPrimary\" = true");

            migrationBuilder.CreateIndex(
                name: "ix_product_medias_product_id_sort",
                schema: "public",
                table: "ProductMedias",
                columns: new[] { "ProductId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "ix_product_medias_variant_id",
                schema: "public",
                table: "ProductMedias",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "uq_product_option_types_name",
                schema: "public",
                table: "ProductOptionTypes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_product_option_values_type_value",
                schema: "public",
                table: "ProductOptionValues",
                columns: new[] { "OptionTypeId", "Value" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_product_spec_values_attribute_enum",
                schema: "public",
                table: "ProductSpecificationValues",
                columns: new[] { "AttributeId", "ValueEnum" });

            migrationBuilder.CreateIndex(
                name: "ix_product_spec_values_attribute_number",
                schema: "public",
                table: "ProductSpecificationValues",
                columns: new[] { "AttributeId", "ValueNumber" });

            migrationBuilder.CreateIndex(
                name: "ix_product_spec_values_attribute_text",
                schema: "public",
                table: "ProductSpecificationValues",
                columns: new[] { "AttributeId", "ValueText" });

            migrationBuilder.CreateIndex(
                name: "uq_product_spec_values_product_attribute",
                schema: "public",
                table: "ProductSpecificationValues",
                columns: new[] { "ProductId", "AttributeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariantOptions_OptionTypeId",
                schema: "public",
                table: "ProductVariantOptions",
                column: "OptionTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariantOptions_OptionValueId",
                schema: "public",
                table: "ProductVariantOptions",
                column: "OptionValueId");

            migrationBuilder.CreateIndex(
                name: "uq_product_variant_options_variant_type",
                schema: "public",
                table: "ProductVariantOptions",
                columns: new[] { "VariantId", "OptionTypeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_product_variants_product_default",
                schema: "public",
                table: "ProductVariants",
                columns: new[] { "ProductId", "IsDefault" });

            migrationBuilder.CreateIndex(
                name: "uq_product_variants_product_sku",
                schema: "public",
                table: "ProductVariants",
                columns: new[] { "ProductId", "Sku" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedPcBuildItems_BuildId",
                schema: "public",
                table: "SavedPcBuildItems",
                column: "BuildId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedPcBuildItems_ProductId",
                schema: "public",
                table: "SavedPcBuildItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "ix_saved_pc_builds_customer_id",
                schema: "public",
                table: "SavedPcBuilds",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "uq_saved_pc_builds_code",
                schema: "public",
                table: "SavedPcBuilds",
                column: "BuildCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_specification_attributes_group_sort",
                schema: "public",
                table: "SpecificationAttributes",
                columns: new[] { "GroupId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "ix_specification_attributes_key",
                schema: "public",
                table: "SpecificationAttributes",
                column: "Key");

            migrationBuilder.CreateIndex(
                name: "uq_specification_attributes_group_key",
                schema: "public",
                table: "SpecificationAttributes",
                columns: new[] { "GroupId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_specification_groups_category_id",
                schema: "public",
                table: "SpecificationGroups",
                column: "CategoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductBundleItems",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductMedias",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductSpecificationValues",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductVariantOptions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "SavedPcBuildItems",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductBundles",
                schema: "public");

            migrationBuilder.DropTable(
                name: "SpecificationAttributes",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductVariants",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductOptionValues",
                schema: "public");

            migrationBuilder.DropTable(
                name: "SavedPcBuilds",
                schema: "public");

            migrationBuilder.DropTable(
                name: "SpecificationGroups",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductOptionTypes",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "uq_products_slug",
                schema: "public",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Categories_DeactivatedAt",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name_IsActive",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "uq_categories_slug",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Brands_DeactivatedAt",
                schema: "public",
                table: "Brands");

            migrationBuilder.DropIndex(
                name: "IX_Brands_Name_IsActive",
                schema: "public",
                table: "Brands");

            migrationBuilder.DropColumn(
                name: "Slug",
                schema: "public",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ImageUrls",
                schema: "public",
                table: "ProductReviews");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                schema: "public",
                table: "ProductReviews");

            migrationBuilder.DropColumn(
                name: "DeactivatedAt",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "DeactivatedBy",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Slug",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "VatRate",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "DeactivatedAt",
                schema: "public",
                table: "Brands");

            migrationBuilder.DropColumn(
                name: "DeactivatedBy",
                schema: "public",
                table: "Brands");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                schema: "public",
                table: "Categories",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                schema: "public",
                table: "Brands",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);
        }
    }
}
