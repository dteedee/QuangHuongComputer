using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Warranty.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class W111WarrantySchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_SlaPolicies_WarningAtPercent_Range",
                table: "SlaPolicies",
                sql: "\"WarningAtPercent\" >= 0 AND \"WarningAtPercent\" <= 100");

            migrationBuilder.CreateIndex(
                name: "IX_ProductWarranties_CustomerId",
                table: "ProductWarranties",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductWarranties_ProductId",
                table: "ProductWarranties",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductWarranties_SerialNumberId",
                table: "ProductWarranties",
                column: "SerialNumberId");

            migrationBuilder.CreateIndex(
                name: "IX_Claims_CustomerId",
                table: "Claims",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Claims_RmaId",
                table: "Claims",
                column: "RmaId");

            migrationBuilder.CreateIndex(
                name: "IX_Claims_Status_CreatedAt",
                table: "Claims",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Claims_WorkOrderId",
                table: "Claims",
                column: "WorkOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SlaPolicies_WarningAtPercent_Range",
                table: "SlaPolicies");

            migrationBuilder.DropIndex(
                name: "IX_ProductWarranties_CustomerId",
                table: "ProductWarranties");

            migrationBuilder.DropIndex(
                name: "IX_ProductWarranties_ProductId",
                table: "ProductWarranties");

            migrationBuilder.DropIndex(
                name: "IX_ProductWarranties_SerialNumberId",
                table: "ProductWarranties");

            migrationBuilder.DropIndex(
                name: "IX_Claims_CustomerId",
                table: "Claims");

            migrationBuilder.DropIndex(
                name: "IX_Claims_RmaId",
                table: "Claims");

            migrationBuilder.DropIndex(
                name: "IX_Claims_Status_CreatedAt",
                table: "Claims");

            migrationBuilder.DropIndex(
                name: "IX_Claims_WorkOrderId",
                table: "Claims");
        }
    }
}
