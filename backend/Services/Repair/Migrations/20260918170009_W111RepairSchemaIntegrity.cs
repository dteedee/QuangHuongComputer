using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repair.Migrations
{
    /// <inheritdoc />
    public partial class W111RepairSchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_WorkOrders_ActualCost_NonNegative",
                table: "WorkOrders",
                sql: "\"ActualCost\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_WorkOrders_EstimatedCost_NonNegative",
                table: "WorkOrders",
                sql: "\"EstimatedCost\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_WorkOrders_LaborCost_NonNegative",
                table: "WorkOrders",
                sql: "\"LaborCost\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_WorkOrders_PartsCost_NonNegative",
                table: "WorkOrders",
                sql: "\"PartsCost\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_WorkOrders_ServiceFee_NonNegative",
                table: "WorkOrders",
                sql: "\"ServiceFee\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_WorkOrderParts_Quantity_Positive",
                table: "WorkOrderParts",
                sql: "\"Quantity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_WorkOrderParts_UnitPrice_NonNegative",
                table: "WorkOrderParts",
                sql: "\"UnitPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ServiceBookings_EstimatedCost_NonNegative",
                table: "ServiceBookings",
                sql: "\"EstimatedCost\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ServiceBookings_OnSiteFee_NonNegative",
                table: "ServiceBookings",
                sql: "\"OnSiteFee\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_RepairRequests_CustomerId",
                table: "RepairRequests",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_RepairRequests_Status_RequestDate",
                table: "RepairRequests",
                columns: new[] { "Status", "RequestDate" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_RepairRequests_EstimatedCost_NonNegative",
                table: "RepairRequests",
                sql: "\"EstimatedCost\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_WorkOrders_ActualCost_NonNegative",
                table: "WorkOrders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WorkOrders_EstimatedCost_NonNegative",
                table: "WorkOrders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WorkOrders_LaborCost_NonNegative",
                table: "WorkOrders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WorkOrders_PartsCost_NonNegative",
                table: "WorkOrders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WorkOrders_ServiceFee_NonNegative",
                table: "WorkOrders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WorkOrderParts_Quantity_Positive",
                table: "WorkOrderParts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WorkOrderParts_UnitPrice_NonNegative",
                table: "WorkOrderParts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ServiceBookings_EstimatedCost_NonNegative",
                table: "ServiceBookings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ServiceBookings_OnSiteFee_NonNegative",
                table: "ServiceBookings");

            migrationBuilder.DropIndex(
                name: "IX_RepairRequests_CustomerId",
                table: "RepairRequests");

            migrationBuilder.DropIndex(
                name: "IX_RepairRequests_Status_RequestDate",
                table: "RepairRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RepairRequests_EstimatedCost_NonNegative",
                table: "RepairRequests");
        }
    }
}
