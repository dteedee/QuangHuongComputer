using Microsoft.EntityFrameworkCore.Migrations;

namespace Repair.Infrastructure.Migrations;

/// <summary>
/// Migration to add performance indexes for Repair service
/// </summary>
public partial class AddRepairPerformanceIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Repair Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Repairs_RepairCode",
            table: "Repairs",
            column: "RepairCode",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Repairs_CustomerId",
            table: "Repairs",
            column: "CustomerId");

        migrationBuilder.CreateIndex(
            name: "IX_Repairs_CreatedAt",
            table: "Repairs",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Repairs_Status",
            table: "Repairs",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "IX_Repairs_Status_CreatedAt",
            table: "Repairs",
            columns: new[] { "Status", "CreatedAt" });

        // RepairItem Indexes
        migrationBuilder.CreateIndex(
            name: "IX_RepairItems_RepairId",
            table: "RepairItems",
            column: "RepairId");

        migrationBuilder.CreateIndex(
            name: "IX_RepairItems_ProductId",
            table: "RepairItems",
            column: "ProductId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Repairs_RepairCode", table: "Repairs");
        migrationBuilder.DropIndex(name: "IX_Repairs_CustomerId", table: "Repairs");
        migrationBuilder.DropIndex(name: "IX_Repairs_CreatedAt", table: "Repairs");
        migrationBuilder.DropIndex(name: "IX_Repairs_Status", table: "Repairs");
        migrationBuilder.DropIndex(name: "IX_Repairs_Status_CreatedAt", table: "Repairs");
        migrationBuilder.DropIndex(name: "IX_RepairItems_RepairId", table: "RepairItems");
        migrationBuilder.DropIndex(name: "IX_RepairItems_ProductId", table: "RepairItems");
    }
}
