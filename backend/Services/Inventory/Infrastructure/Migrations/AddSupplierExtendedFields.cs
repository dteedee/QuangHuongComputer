using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using InventoryModule.Infrastructure;

namespace InventoryModule.Infrastructure.Migrations;

/// <summary>
/// Migration to add extended supplier fields for better business management
/// </summary>
[DbContext(typeof(InventoryDbContext))]
[Migration("20240215_AddSupplierExtendedFields")]
public class AddSupplierExtendedFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Add new columns to Suppliers table
        migrationBuilder.AddColumn<string>(
            name: "Code",
            table: "Suppliers",
            type: "character varying(20)",
            maxLength: 20,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "ShortName",
            table: "Suppliers",
            type: "character varying(50)",
            maxLength: 50,
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "SupplierType",
            table: "Suppliers",
            type: "integer",
            nullable: false,
            defaultValue: 1); // Distributor

        migrationBuilder.AddColumn<string>(
            name: "Description",
            table: "Suppliers",
            type: "character varying(1000)",
            maxLength: 1000,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Website",
            table: "Suppliers",
            type: "character varying(200)",
            maxLength: 200,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "LogoUrl",
            table: "Suppliers",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true);

        // Business info
        migrationBuilder.AddColumn<string>(
            name: "TaxCode",
            table: "Suppliers",
            type: "character varying(20)",
            maxLength: 20,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "BankAccount",
            table: "Suppliers",
            type: "character varying(30)",
            maxLength: 30,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "BankName",
            table: "Suppliers",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "BankBranch",
            table: "Suppliers",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "PaymentTerms",
            table: "Suppliers",
            type: "integer",
            nullable: false,
            defaultValue: 0); // COD

        migrationBuilder.AddColumn<int>(
            name: "PaymentDays",
            table: "Suppliers",
            type: "integer",
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "CreditLimit",
            table: "Suppliers",
            type: "numeric(18,2)",
            precision: 18,
            scale: 2,
            nullable: false,
            defaultValue: 0m);

        migrationBuilder.AddColumn<decimal>(
            name: "CurrentDebt",
            table: "Suppliers",
            type: "numeric(18,2)",
            precision: 18,
            scale: 2,
            nullable: false,
            defaultValue: 0m);

        // Contact info
        migrationBuilder.AddColumn<string>(
            name: "ContactTitle",
            table: "Suppliers",
            type: "character varying(50)",
            maxLength: 50,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Fax",
            table: "Suppliers",
            type: "character varying(20)",
            maxLength: 20,
            nullable: true);

        // Address details
        migrationBuilder.AddColumn<string>(
            name: "Ward",
            table: "Suppliers",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "District",
            table: "Suppliers",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "City",
            table: "Suppliers",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Country",
            table: "Suppliers",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true,
            defaultValue: "Việt Nam");

        migrationBuilder.AddColumn<string>(
            name: "PostalCode",
            table: "Suppliers",
            type: "character varying(20)",
            maxLength: 20,
            nullable: true);

        // Notes and categories
        migrationBuilder.AddColumn<int>(
            name: "Rating",
            table: "Suppliers",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "Notes",
            table: "Suppliers",
            type: "character varying(2000)",
            maxLength: 2000,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Categories",
            table: "Suppliers",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Brands",
            table: "Suppliers",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true);

        // Statistics
        migrationBuilder.AddColumn<int>(
            name: "TotalOrders",
            table: "Suppliers",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<decimal>(
            name: "TotalPurchaseAmount",
            table: "Suppliers",
            type: "numeric(18,2)",
            precision: 18,
            scale: 2,
            nullable: false,
            defaultValue: 0m);

        migrationBuilder.AddColumn<DateTime>(
            name: "LastOrderDate",
            table: "Suppliers",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "FirstOrderDate",
            table: "Suppliers",
            type: "timestamp with time zone",
            nullable: true);

        // Generate codes for existing suppliers
        migrationBuilder.Sql(@"
            WITH numbered_suppliers AS (
                SELECT ""Id"", ROW_NUMBER() OVER (ORDER BY ""CreatedAt"") as rn
                FROM ""Suppliers""
            )
            UPDATE ""Suppliers"" s
            SET ""Code"" = 'NCC-' || LPAD(ns.rn::text, 4, '0')
            FROM numbered_suppliers ns
            WHERE s.""Id"" = ns.""Id"" AND (s.""Code"" IS NULL OR s.""Code"" = '');
        ");

        // Create indexes
        migrationBuilder.CreateIndex(
            name: "IX_Supplier_Code",
            table: "Suppliers",
            column: "Code",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Supplier_TaxCode",
            table: "Suppliers",
            column: "TaxCode");

        migrationBuilder.CreateIndex(
            name: "IX_Supplier_Email",
            table: "Suppliers",
            column: "Email");

        migrationBuilder.CreateIndex(
            name: "IX_Supplier_Type",
            table: "Suppliers",
            column: "SupplierType");

        migrationBuilder.CreateIndex(
            name: "IX_Supplier_City",
            table: "Suppliers",
            column: "City");

        migrationBuilder.CreateIndex(
            name: "IX_Supplier_Debt",
            table: "Suppliers",
            columns: new[] { "CurrentDebt", "CreditLimit" },
            filter: "\"CurrentDebt\" > 0");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Drop indexes
        migrationBuilder.DropIndex(name: "IX_Supplier_Code", table: "Suppliers");
        migrationBuilder.DropIndex(name: "IX_Supplier_TaxCode", table: "Suppliers");
        migrationBuilder.DropIndex(name: "IX_Supplier_Email", table: "Suppliers");
        migrationBuilder.DropIndex(name: "IX_Supplier_Type", table: "Suppliers");
        migrationBuilder.DropIndex(name: "IX_Supplier_City", table: "Suppliers");
        migrationBuilder.DropIndex(name: "IX_Supplier_Debt", table: "Suppliers");

        // Drop columns
        migrationBuilder.DropColumn(name: "Code", table: "Suppliers");
        migrationBuilder.DropColumn(name: "ShortName", table: "Suppliers");
        migrationBuilder.DropColumn(name: "SupplierType", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Description", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Website", table: "Suppliers");
        migrationBuilder.DropColumn(name: "LogoUrl", table: "Suppliers");
        migrationBuilder.DropColumn(name: "TaxCode", table: "Suppliers");
        migrationBuilder.DropColumn(name: "BankAccount", table: "Suppliers");
        migrationBuilder.DropColumn(name: "BankName", table: "Suppliers");
        migrationBuilder.DropColumn(name: "BankBranch", table: "Suppliers");
        migrationBuilder.DropColumn(name: "PaymentTerms", table: "Suppliers");
        migrationBuilder.DropColumn(name: "PaymentDays", table: "Suppliers");
        migrationBuilder.DropColumn(name: "CreditLimit", table: "Suppliers");
        migrationBuilder.DropColumn(name: "CurrentDebt", table: "Suppliers");
        migrationBuilder.DropColumn(name: "ContactTitle", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Fax", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Ward", table: "Suppliers");
        migrationBuilder.DropColumn(name: "District", table: "Suppliers");
        migrationBuilder.DropColumn(name: "City", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Country", table: "Suppliers");
        migrationBuilder.DropColumn(name: "PostalCode", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Rating", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Notes", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Categories", table: "Suppliers");
        migrationBuilder.DropColumn(name: "Brands", table: "Suppliers");
        migrationBuilder.DropColumn(name: "TotalOrders", table: "Suppliers");
        migrationBuilder.DropColumn(name: "TotalPurchaseAmount", table: "Suppliers");
        migrationBuilder.DropColumn(name: "LastOrderDate", table: "Suppliers");
        migrationBuilder.DropColumn(name: "FirstOrderDate", table: "Suppliers");
    }
}
