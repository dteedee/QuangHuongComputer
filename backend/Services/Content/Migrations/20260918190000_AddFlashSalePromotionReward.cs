using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Content.Infrastructure;

#nullable disable

namespace Content.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// W2-2: hợp đồng "một động cơ khuyến mãi" (phase-20 §Risk Assessment, binding).
    /// Thêm FlashPrice/QuantityLimit/SoldCount lên PromotionRewards để Promotion
    /// Type=FlashSale mang được giá cố định + hạn mức theo từng sản phẩm — W2-3 build
    /// PricingEngine trên các cột này thay vì bảng FlashSale [Obsolete] riêng.
    /// [Migration]/[DbContext] gắn trực tiếp ở đây (không tách Designer.cs riêng) vì
    /// qh-build.sh không có sub-command cho `dotnet ef` trong track này — cần attribute
    /// để migration được assembly scan nhận diện khi gate chạy `database update`.
    /// </summary>
    [DbContext(typeof(ContentDbContext))]
    [Migration("20260918190000_AddFlashSalePromotionReward")]
    public partial class AddFlashSalePromotionReward : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FlashPrice",
                schema: "content",
                table: "PromotionRewards",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuantityLimit",
                schema: "content",
                table: "PromotionRewards",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SoldCount",
                schema: "content",
                table: "PromotionRewards",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_PromotionRewards_FlashPrice_NonNegative",
                schema: "content",
                table: "PromotionRewards",
                sql: "\"FlashPrice\" IS NULL OR \"FlashPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PromotionRewards_SoldCount_NonNegative",
                schema: "content",
                table: "PromotionRewards",
                sql: "\"SoldCount\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_PromotionRewards_FlashPrice_NonNegative",
                schema: "content",
                table: "PromotionRewards");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PromotionRewards_SoldCount_NonNegative",
                schema: "content",
                table: "PromotionRewards");

            migrationBuilder.DropColumn(
                name: "FlashPrice",
                schema: "content",
                table: "PromotionRewards");

            migrationBuilder.DropColumn(
                name: "QuantityLimit",
                schema: "content",
                table: "PromotionRewards");

            migrationBuilder.DropColumn(
                name: "SoldCount",
                schema: "content",
                table: "PromotionRewards");
        }
    }
}
