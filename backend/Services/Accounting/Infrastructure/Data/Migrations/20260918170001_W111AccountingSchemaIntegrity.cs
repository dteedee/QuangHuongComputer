using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Accounting.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W111AccountingSchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_ShiftSessions_ClosingBalance_NonNegative",
                table: "ShiftSessions",
                sql: "\"ClosingBalance\" IS NULL OR \"ClosingBalance\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ShiftSessions_OpeningBalance_NonNegative",
                table: "ShiftSessions",
                sql: "\"OpeningBalance\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PaymentApplications_Amount_NonNegative",
                table: "PaymentApplications",
                sql: "\"Amount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payment_Amount_NonNegative",
                table: "Payment",
                sql: "\"Amount\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_CustomerId",
                table: "Invoices",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_InvoiceNumber_Unique",
                table: "Invoices",
                column: "InvoiceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_OrganizationAccountId",
                table: "Invoices",
                column: "OrganizationAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_PurchaseOrderId",
                table: "Invoices",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_Status_DueDate",
                table: "Invoices",
                columns: new[] { "Status", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_SupplierId",
                table: "Invoices",
                column: "SupplierId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_PaidAmount_LteTotal",
                table: "Invoices",
                sql: "\"PaidAmount\" <= \"TotalAmount\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_PaidAmount_NonNegative",
                table: "Invoices",
                sql: "\"PaidAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_SubTotal_NonNegative",
                table: "Invoices",
                sql: "\"SubTotal\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_TotalAmount_NonNegative",
                table: "Invoices",
                sql: "\"TotalAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_VatAmount_NonNegative",
                table: "Invoices",
                sql: "\"VatAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Invoices_VatRate_Percent",
                table: "Invoices",
                sql: "\"VatRate\" >= 0 AND \"VatRate\" <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InvoiceLine_Quantity_Positive",
                table: "InvoiceLine",
                sql: "\"Quantity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InvoiceLine_UnitPrice_NonNegative",
                table: "InvoiceLine",
                sql: "\"UnitPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InvoiceLine_VatRate_Percent",
                table: "InvoiceLine",
                sql: "\"VatRate\" >= 0 AND \"VatRate\" <= 100");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_EmployeeId",
                table: "Expenses",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_SupplierId",
                table: "Expenses",
                column: "SupplierId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Expenses_Amount_NonNegative",
                table: "Expenses",
                sql: "\"Amount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Expenses_TotalAmount_NonNegative",
                table: "Expenses",
                sql: "\"TotalAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Expenses_VatAmount_NonNegative",
                table: "Expenses",
                sql: "\"VatAmount\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ShiftSessions_ClosingBalance_NonNegative",
                table: "ShiftSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ShiftSessions_OpeningBalance_NonNegative",
                table: "ShiftSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PaymentApplications_Amount_NonNegative",
                table: "PaymentApplications");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payment_Amount_NonNegative",
                table: "Payment");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_CustomerId",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_InvoiceNumber_Unique",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_OrganizationAccountId",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_PurchaseOrderId",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_Status_DueDate",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_SupplierId",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_PaidAmount_LteTotal",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_PaidAmount_NonNegative",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_SubTotal_NonNegative",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_TotalAmount_NonNegative",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_VatAmount_NonNegative",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Invoices_VatRate_Percent",
                table: "Invoices");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InvoiceLine_Quantity_Positive",
                table: "InvoiceLine");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InvoiceLine_UnitPrice_NonNegative",
                table: "InvoiceLine");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InvoiceLine_VatRate_Percent",
                table: "InvoiceLine");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_EmployeeId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_SupplierId",
                table: "Expenses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Expenses_Amount_NonNegative",
                table: "Expenses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Expenses_TotalAmount_NonNegative",
                table: "Expenses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Expenses_VatAmount_NonNegative",
                table: "Expenses");

        }
    }
}
