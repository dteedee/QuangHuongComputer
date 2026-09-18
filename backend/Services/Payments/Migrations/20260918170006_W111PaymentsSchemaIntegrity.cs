using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Payments.Migrations
{
    /// <inheritdoc />
    public partial class W111PaymentsSchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "TransferAmount",
                schema: "payments",
                table: "SePayTransactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<decimal>(
                name: "Accumulated",
                schema: "payments",
                table: "SePayTransactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.CreateIndex(
                name: "IX_SePayTransactions_RelatedOrderId",
                schema: "payments",
                table: "SePayTransactions",
                column: "RelatedOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentIntents_Status_CreatedAt",
                schema: "payments",
                table: "PaymentIntents",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_PaymentIntents_Amount_NonNegative",
                schema: "payments",
                table: "PaymentIntents",
                sql: "\"Amount\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SePayTransactions_RelatedOrderId",
                schema: "payments",
                table: "SePayTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PaymentIntents_Status_CreatedAt",
                schema: "payments",
                table: "PaymentIntents");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PaymentIntents_Amount_NonNegative",
                schema: "payments",
                table: "PaymentIntents");

            migrationBuilder.AlterColumn<decimal>(
                name: "TransferAmount",
                schema: "payments",
                table: "SePayTransactions",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "Accumulated",
                schema: "payments",
                table: "SePayTransactions",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);
        }
    }
}
