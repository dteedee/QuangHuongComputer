using Microsoft.EntityFrameworkCore.Migrations;

namespace Accounting.Infrastructure.Migrations;

/// <summary>
/// Migration to add performance indexes for Accounting service
/// </summary>
public partial class AddAccountingPerformanceIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Invoice Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Invoices_InvoiceNumber",
            table: "Invoices",
            column: "InvoiceNumber",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Invoices_CustomerId",
            table: "Invoices",
            column: "CustomerId");

        migrationBuilder.CreateIndex(
            name: "IX_Invoices_OrderId",
            table: "Invoices",
            column: "OrderId");

        migrationBuilder.CreateIndex(
            name: "IX_Invoices_CreatedAt",
            table: "Invoices",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Invoices_Status",
            table: "Invoices",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "IX_Invoices_Status_CreatedAt",
            table: "Invoices",
            columns: new[] { "Status", "CreatedAt" });

        // Optimized indexes for AR/AP queries
        migrationBuilder.CreateIndex(
            name: "IX_Invoices_Type_Status",
            table: "Invoices",
            columns: new[] { "Type", "Status" });

        migrationBuilder.CreateIndex(
            name: "IX_Invoices_Type_AgingBucket",
            table: "Invoices",
            columns: new[] { "Type", "AgingBucket" });

        migrationBuilder.CreateIndex(
            name: "IX_Invoices_IssueDate",
            table: "Invoices",
            column: "IssueDate");

        // Payment Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Payments_InvoiceId",
            table: "Payments",
            column: "InvoiceId");

        migrationBuilder.CreateIndex(
            name: "IX_Payments_Method",
            table: "Payments",
            column: "Method");

        migrationBuilder.CreateIndex(
            name: "IX_Payments_CreatedAt",
            table: "Payments",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Payments_Status",
            table: "Payments",
            column: "Status");

        // ExpenseCategory Indexes
        migrationBuilder.CreateIndex(
            name: "IX_ExpenseCategories_IsActive",
            table: "ExpenseCategories",
            column: "IsActive");

        // Expense Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Expenses_ExpenseCategoryId",
            table: "Expenses",
            column: "ExpenseCategoryId");

        migrationBuilder.CreateIndex(
            name: "IX_Expenses_CreatedAt",
            table: "Expenses",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Expenses_Status",
            table: "Expenses",
            column: "Status");

        // Optimized index for expense queries
        migrationBuilder.CreateIndex(
            name: "IX_Expenses_Status_ExpenseDate",
            table: "Expenses",
            columns: new[] { "Status", "ExpenseDate" });

        migrationBuilder.CreateIndex(
            name: "IX_Expenses_ExpenseDate",
            table: "Expenses",
            column: "ExpenseDate");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Invoices_InvoiceNumber", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Invoices_CustomerId", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Invoices_OrderId", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Invoices_CreatedAt", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Invoices_Status", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Invoices_Status_CreatedAt", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Payments_InvoiceId", table: "Payments");
        migrationBuilder.DropIndex(name: "IX_Payments_Method", table: "Payments");
        migrationBuilder.DropIndex(name: "IX_Payments_CreatedAt", table: "Payments");
        migrationBuilder.DropIndex(name: "IX_Payments_Status", table: "Payments");
        migrationBuilder.DropIndex(name: "IX_ExpenseCategories_IsActive", table: "ExpenseCategories");
        migrationBuilder.DropIndex(name: "IX_Expenses_ExpenseCategoryId", table: "Expenses");
        migrationBuilder.DropIndex(name: "IX_Expenses_CreatedAt", table: "Expenses");
        migrationBuilder.DropIndex(name: "IX_Expenses_Status", table: "Expenses");
        migrationBuilder.DropIndex(name: "IX_Invoices_Type_Status", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Invoices_Type_AgingBucket", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Invoices_IssueDate", table: "Invoices");
        migrationBuilder.DropIndex(name: "IX_Expenses_Status_ExpenseDate", table: "Expenses");
        migrationBuilder.DropIndex(name: "IX_Expenses_ExpenseDate", table: "Expenses");
    }
}
