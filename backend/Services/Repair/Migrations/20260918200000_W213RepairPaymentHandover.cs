using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repair.Migrations
{
    /// <inheritdoc />
    /// <summary>W2-13: payment + handover columns on WorkOrders. WorkOrderStatus gained
    /// ReadyForPickup/Paid/Delivered values (12/13/14) - no schema change needed for
    /// those, the Status column already stores a plain int.</summary>
    public partial class W213RepairPaymentHandover : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PaidAt",
                table: "WorkOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentReference",
                table: "WorkOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HandoverAt",
                table: "WorkOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandoverReceivedByName",
                table: "WorkOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "HandoverStaffId",
                table: "WorkOrders",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "PaidAt", table: "WorkOrders");
            migrationBuilder.DropColumn(name: "PaymentReference", table: "WorkOrders");
            migrationBuilder.DropColumn(name: "HandoverAt", table: "WorkOrders");
            migrationBuilder.DropColumn(name: "HandoverReceivedByName", table: "WorkOrders");
            migrationBuilder.DropColumn(name: "HandoverStaffId", table: "WorkOrders");
        }
    }
}
