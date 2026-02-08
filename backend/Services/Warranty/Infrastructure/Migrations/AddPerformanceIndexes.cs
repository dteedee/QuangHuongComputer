using Microsoft.EntityFrameworkCore.Migrations;

namespace Warranty.Infrastructure.Migrations;

/// <summary>
/// Migration to add performance indexes for Warranty service
/// </summary>
public partial class AddWarrantyPerformanceIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Warranty Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Warranties_ProductId",
            table: "Warranties",
            column: "ProductId");

        migrationBuilder.CreateIndex(
            name: "IX_Warranties_SerialNumber",
            table: "Warranties",
            column: "SerialNumber",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Warranties_CustomerId",
            table: "Warranties",
            column: "CustomerId");

        migrationBuilder.CreateIndex(
            name: "IX_Warranties_Status",
            table: "Warranties",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "IX_Warranties_ExpiryDate",
            table: "Warranties",
            column: "ExpiryDate");

        migrationBuilder.CreateIndex(
            name: "IX_Warranties_Status_ExpiryDate",
            table: "Warranties",
            columns: new[] { "Status", "ExpiryDate" });

        // WarrantyClaim Indexes
        migrationBuilder.CreateIndex(
            name: "IX_WarrantyClaims_WarrantyId",
            table: "WarrantyClaims",
            column: "WarrantyId");

        migrationBuilder.CreateIndex(
            name: "IX_WarrantyClaims_Status",
            table: "WarrantyClaims",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "IX_WarrantyClaims_CreatedAt",
            table: "WarrantyClaims",
            column: "CreatedAt");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Warranties_ProductId", table: "Warranties");
        migrationBuilder.DropIndex(name: "IX_Warranties_SerialNumber", table: "Warranties");
        migrationBuilder.DropIndex(name: "IX_Warranties_CustomerId", table: "Warranties");
        migrationBuilder.DropIndex(name: "IX_Warranties_Status", table: "Warranties");
        migrationBuilder.DropIndex(name: "IX_Warranties_ExpiryDate", table: "Warranties");
        migrationBuilder.DropIndex(name: "IX_Warranties_Status_ExpiryDate", table: "Warranties");
        migrationBuilder.DropIndex(name: "IX_WarrantyClaims_WarrantyId", table: "WarrantyClaims");
        migrationBuilder.DropIndex(name: "IX_WarrantyClaims_Status", table: "WarrantyClaims");
        migrationBuilder.DropIndex(name: "IX_WarrantyClaims_CreatedAt", table: "WarrantyClaims");
    }
}
