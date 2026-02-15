using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Migrations
{
    /// <inheritdoc />
    public partial class AddFlashSale : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FlashSales",
                schema: "content",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    BannerImageUrl = table.Column<string>(type: "text", nullable: true),
                    DiscountType = table.Column<int>(type: "integer", nullable: false),
                    DiscountValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MaxDiscount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProductIds = table.Column<string>(type: "text", nullable: true),
                    CategoryIds = table.Column<string>(type: "text", nullable: true),
                    ApplyToAllProducts = table.Column<bool>(type: "boolean", nullable: false),
                    MaxQuantityPerOrder = table.Column<int>(type: "integer", nullable: true),
                    TotalQuantityLimit = table.Column<int>(type: "integer", nullable: true),
                    SoldQuantity = table.Column<int>(type: "integer", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    BadgeText = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    BadgeColor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlashSales", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FlashSale_Active_Status_DateRange",
                schema: "content",
                table: "FlashSales",
                columns: new[] { "IsActive", "Status", "StartTime", "EndTime" });

            migrationBuilder.CreateIndex(
                name: "IX_FlashSale_Status_Order",
                schema: "content",
                table: "FlashSales",
                columns: new[] { "Status", "DisplayOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FlashSales",
                schema: "content");
        }
    }
}
