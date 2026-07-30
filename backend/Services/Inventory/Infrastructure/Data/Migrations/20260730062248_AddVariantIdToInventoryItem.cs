using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantIdToInventoryItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "VariantId",
                table: "InventoryItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Inventory_Product_Variant_Warehouse_Unique",
                table: "InventoryItems",
                columns: new[] { "ProductId", "VariantId", "WarehouseId" },
                unique: true,
                filter: "\"VariantId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Inventory_Product_Variant_Warehouse_Unique",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "InventoryItems");
        }
    }
}
