using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantIdToStockReservation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "VariantId",
                table: "StockReservations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockReservation_Product_Variant_Status",
                table: "StockReservations",
                columns: new[] { "ProductId", "VariantId", "Status" },
                filter: "\"VariantId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StockReservation_Product_Variant_Status",
                table: "StockReservations");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "StockReservations");
        }
    }
}
