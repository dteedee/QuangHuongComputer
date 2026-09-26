using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Combo tiết kiệm: thêm chế độ giá theo % (<c>ProductBundles.DiscountPercent</c>, null = giá cố
    /// định <c>TotalPrice</c>). [Migration]/[DbContext] gắn trực tiếp, không có Designer.cs — cùng quy
    /// ước với Content <c>20260926090000_AddUrlRedirects</c>; model snapshot được cập nhật tay.
    /// </summary>
    [DbContext(typeof(CatalogDbContext))]
    [Migration("20260926100000_AddBundlePricingMode")]
    public partial class AddBundlePricingMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DiscountPercent",
                schema: "public",
                table: "ProductBundles",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductBundles_DiscountPercent_Range",
                schema: "public",
                table: "ProductBundles",
                sql: "\"DiscountPercent\" IS NULL OR (\"DiscountPercent\" > 0 AND \"DiscountPercent\" < 100)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductBundles_DiscountPercent_Range",
                schema: "public",
                table: "ProductBundles");

            migrationBuilder.DropColumn(
                name: "DiscountPercent",
                schema: "public",
                table: "ProductBundles");
        }
    }
}
