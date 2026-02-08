using Microsoft.EntityFrameworkCore.Migrations;

namespace InventoryModule.Infrastructure.Migrations;

/// <summary>
/// Migration to add performance indexes for Inventory service
/// </summary>
public partial class AddInventoryPerformanceIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // InventoryItem Indexes
        migrationBuilder.CreateIndex(
            name: "IX_InventoryItems_ProductId",
            table: "InventoryItems",
            column: "ProductId");

        migrationBuilder.CreateIndex(
            name: "IX_InventoryItems_IsActive",
            table: "InventoryItems",
            column: "IsActive");

        migrationBuilder.CreateIndex(
            name: "IX_InventoryItems_LastUpdatedAt",
            table: "InventoryItems",
            column: "LastUpdatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_InventoryItems_StockQuantity",
            table: "InventoryItems",
            column: "StockQuantity");

        // PurchaseOrder Indexes
        migrationBuilder.CreateIndex(
            name: "IX_PurchaseOrders_PONumber",
            table: "PurchaseOrders",
            column: "PONumber",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_PurchaseOrders_Status",
            table: "PurchaseOrders",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "IX_PurchaseOrders_CreatedAt",
            table: "PurchaseOrders",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_PurchaseOrders_SupplierId",
            table: "PurchaseOrders",
            column: "SupplierId");

        // StockMovement Indexes
        migrationBuilder.CreateIndex(
            name: "IX_StockMovements_InventoryItemId",
            table: "StockMovements",
            column: "InventoryItemId");

        migrationBuilder.CreateIndex(
            name: "IX_StockMovements_CreatedAt",
            table: "StockMovements",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_StockMovements_MovementType",
            table: "StockMovements",
            column: "MovementType");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_InventoryItems_ProductId", table: "InventoryItems");
        migrationBuilder.DropIndex(name: "IX_InventoryItems_IsActive", table: "InventoryItems");
        migrationBuilder.DropIndex(name: "IX_InventoryItems_LastUpdatedAt", table: "InventoryItems");
        migrationBuilder.DropIndex(name: "IX_InventoryItems_StockQuantity", table: "InventoryItems");
        migrationBuilder.DropIndex(name: "IX_PurchaseOrders_PONumber", table: "PurchaseOrders");
        migrationBuilder.DropIndex(name: "IX_PurchaseOrders_Status", table: "PurchaseOrders");
        migrationBuilder.DropIndex(name: "IX_PurchaseOrders_CreatedAt", table: "PurchaseOrders");
        migrationBuilder.DropIndex(name: "IX_PurchaseOrders_SupplierId", table: "PurchaseOrders");
        migrationBuilder.DropIndex(name: "IX_StockMovements_InventoryItemId", table: "StockMovements");
        migrationBuilder.DropIndex(name: "IX_StockMovements_CreatedAt", table: "StockMovements");
        migrationBuilder.DropIndex(name: "IX_StockMovements_MovementType", table: "StockMovements");
    }
}
