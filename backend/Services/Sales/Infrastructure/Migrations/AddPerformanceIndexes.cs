using Microsoft.EntityFrameworkCore.Migrations;

namespace Sales.Infrastructure.Migrations;

/// <summary>
/// Migration to add performance indexes for Sales service
/// </summary>
public partial class AddSalesPerformanceIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Order Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Orders_OrderCode",
            table: "Orders",
            column: "OrderCode",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Orders_CustomerId",
            table: "Orders",
            column: "CustomerId");

        migrationBuilder.CreateIndex(
            name: "IX_Orders_CreatedAt",
            table: "Orders",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Orders_Status",
            table: "Orders",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "IX_Orders_CustomerId_Status",
            table: "Orders",
            columns: new[] { "CustomerId", "Status" });

        migrationBuilder.CreateIndex(
            name: "IX_Orders_Status_CreatedAt",
            table: "Orders",
            columns: new[] { "Status", "CreatedAt" });

        // OrderItem Indexes
        migrationBuilder.CreateIndex(
            name: "IX_OrderItems_OrderId",
            table: "OrderItems",
            column: "OrderId");

        migrationBuilder.CreateIndex(
            name: "IX_OrderItems_ProductId",
            table: "OrderItems",
            column: "ProductId");

        // Cart Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Carts_CustomerId",
            table: "Carts",
            column: "CustomerId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Carts_CreatedAt",
            table: "Carts",
            column: "CreatedAt");

        // CartItem Indexes
        migrationBuilder.CreateIndex(
            name: "IX_CartItems_CartId",
            table: "CartItems",
            column: "CartId");

        migrationBuilder.CreateIndex(
            name: "IX_CartItems_ProductId",
            table: "CartItems",
            column: "ProductId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Orders_OrderCode", table: "Orders");
        migrationBuilder.DropIndex(name: "IX_Orders_CustomerId", table: "Orders");
        migrationBuilder.DropIndex(name: "IX_Orders_CreatedAt", table: "Orders");
        migrationBuilder.DropIndex(name: "IX_Orders_Status", table: "Orders");
        migrationBuilder.DropIndex(name: "IX_Orders_CustomerId_Status", table: "Orders");
        migrationBuilder.DropIndex(name: "IX_Orders_Status_CreatedAt", table: "Orders");
        migrationBuilder.DropIndex(name: "IX_OrderItems_OrderId", table: "OrderItems");
        migrationBuilder.DropIndex(name: "IX_OrderItems_ProductId", table: "OrderItems");
        migrationBuilder.DropIndex(name: "IX_Carts_CustomerId", table: "Carts");
        migrationBuilder.DropIndex(name: "IX_Carts_CreatedAt", table: "Carts");
        migrationBuilder.DropIndex(name: "IX_CartItems_CartId", table: "CartItems");
        migrationBuilder.DropIndex(name: "IX_CartItems_ProductId", table: "CartItems");
    }
}
