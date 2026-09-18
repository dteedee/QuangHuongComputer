using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W23SalesCheckoutSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReasonCode",
                schema: "public",
                table: "ReturnRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowOpenedBoxReturn",
                schema: "public",
                table: "ReturnPolicies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "DaysForStatutoryReturn",
                schema: "public",
                table: "ReturnPolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MissingAccessoriesFeePercent",
                schema: "public",
                table: "ReturnPolicies",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "AnonymousId",
                schema: "public",
                table: "Orders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "BusinessDate",
                schema: "public",
                table: "Orders",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<string>(
                name: "BuyerAddress",
                schema: "public",
                table: "Orders",
                type: "character varying(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuyerBudgetUnitCode",
                schema: "public",
                table: "Orders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuyerEmail",
                schema: "public",
                table: "Orders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuyerFullName",
                schema: "public",
                table: "Orders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuyerLegalName",
                schema: "public",
                table: "Orders",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuyerPhone",
                schema: "public",
                table: "Orders",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuyerTaxCode",
                schema: "public",
                table: "Orders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BuyerType",
                schema: "public",
                table: "Orders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "CashierId",
                schema: "public",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                schema: "public",
                table: "Orders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Web");

            migrationBuilder.AddColumn<bool>(
                name: "InvoiceRequested",
                schema: "public",
                table: "Orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentDueDate",
                schema: "public",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "QuotationId",
                schema: "public",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ShiftId",
                schema: "public",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingVatAmount",
                schema: "public",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingVatRate",
                schema: "public",
                table: "Orders",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                schema: "public",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TermsVersion",
                schema: "public",
                table: "Orders",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AllocatedOrderDiscount",
                schema: "public",
                table: "OrderItem",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "GrossBeforeDiscount",
                schema: "public",
                table: "OrderItem",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LineDiscount",
                schema: "public",
                table: "OrderItem",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "Sequence",
                schema: "public",
                table: "OrderItem",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "UnitName",
                schema: "public",
                table: "OrderItem",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "VatAmount",
                schema: "public",
                table: "OrderItem",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "VatRate",
                schema: "public",
                table: "OrderItem",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "VatReductionEligible",
                schema: "public",
                table: "OrderItem",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "VatStatutoryRate",
                schema: "public",
                table: "OrderItem",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "ReversalOf",
                schema: "public",
                table: "LoyaltyTransactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ConsentAt",
                schema: "public",
                table: "InstallmentApplications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                schema: "public",
                table: "InstallmentApplications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FinanceContractNumber",
                schema: "public",
                table: "InstallmentApplications",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnonymousId",
                schema: "public",
                table: "Carts",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HeldOrders",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: true),
                    CashierId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CustomerPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    ItemsJson = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    EstimatedTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "text", maxLength: 500, nullable: true),
                    ResumedOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    ResumedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HeldOrders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OrderPayments",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Method = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TenderedAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ChangeAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReceivedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsReversed = table.Column<bool>(type: "boolean", nullable: false),
                    ReversalOf = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "text", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderPayments", x => x.Id);
                    table.CheckConstraint("CK_OrderPayments_Amount_Positive", "\"Amount\" > 0");
                    table.ForeignKey(
                        name: "fk_order_payments_order_id",
                        column: x => x.OrderId,
                        principalSchema: "public",
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SalesQuotationLines",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LineDiscount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    LineTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ProductSku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    QuotationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    UnitName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: true),
                    VatRate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0m),
                    VatReductionEligible = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    VatStatutoryRate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesQuotationLines", x => x.Id);
                    table.CheckConstraint("CK_SalesQuotationLines_Quantity_Positive", "\"Quantity\" > 0");
                });

            migrationBuilder.CreateTable(
                name: "SalesQuotations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BuyerAddress = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    BuyerBudgetUnitCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    BuyerLegalName = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    BuyerTaxCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    BuyerType = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    ConvertedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConvertedOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CreatedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CustomerEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CustomerPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    PaymentTermDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    QuotationNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    SubtotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    TermsText = table.Column<string>(type: "text", nullable: true),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ValidUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesQuotations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_orders_anonymous_id",
                schema: "public",
                table: "Orders",
                column: "AnonymousId");

            migrationBuilder.CreateIndex(
                name: "ix_orders_quotation_id",
                schema: "public",
                table: "Orders",
                column: "QuotationId");

            migrationBuilder.CreateIndex(
                name: "ix_orders_shift_id",
                schema: "public",
                table: "Orders",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "ix_orders_store_id_order_date",
                schema: "public",
                table: "Orders",
                columns: new[] { "StoreId", "OrderDate" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_ShippingVatAmount_NonNegative",
                schema: "public",
                table: "Orders",
                sql: "\"ShippingVatAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_ShippingVatRate_Fraction",
                schema: "public",
                table: "Orders",
                sql: "\"ShippingVatRate\" >= 0 AND \"ShippingVatRate\" <= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_AllocatedOrderDiscount_NonNegative",
                schema: "public",
                table: "OrderItem",
                sql: "\"AllocatedOrderDiscount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_LineDiscount_NonNegative",
                schema: "public",
                table: "OrderItem",
                sql: "\"LineDiscount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_VatAmount_NonNegative",
                schema: "public",
                table: "OrderItem",
                sql: "\"VatAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_VatRate_Fraction",
                schema: "public",
                table: "OrderItem",
                sql: "\"VatRate\" >= 0 AND \"VatRate\" <= 1");

            migrationBuilder.CreateIndex(
                name: "ix_loyalty_transactions_reversal_of",
                schema: "public",
                table: "LoyaltyTransactions",
                column: "ReversalOf");

            migrationBuilder.CreateIndex(
                name: "ix_installment_applications_expires_at",
                schema: "public",
                table: "InstallmentApplications",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "ix_carts_anonymous_id",
                schema: "public",
                table: "Carts",
                column: "AnonymousId");

            migrationBuilder.CreateIndex(
                name: "ix_held_orders_store_shift",
                schema: "public",
                table: "HeldOrders",
                columns: new[] { "StoreId", "ShiftId" });

            migrationBuilder.CreateIndex(
                name: "ix_order_payments_method_reference",
                schema: "public",
                table: "OrderPayments",
                columns: new[] { "Method", "Reference" });

            migrationBuilder.CreateIndex(
                name: "ix_order_payments_order_id",
                schema: "public",
                table: "OrderPayments",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "ix_order_payments_shift_id",
                schema: "public",
                table: "OrderPayments",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "ix_sales_quotation_lines_quotation_id",
                schema: "public",
                table: "SalesQuotationLines",
                column: "QuotationId");

            migrationBuilder.CreateIndex(
                name: "ix_sales_quotations_customer_id",
                schema: "public",
                table: "SalesQuotations",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "ix_sales_quotations_number",
                schema: "public",
                table: "SalesQuotations",
                column: "QuotationNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_sales_quotations_status_valid_until",
                schema: "public",
                table: "SalesQuotations",
                columns: new[] { "Status", "ValidUntil" });

            // D08 — ĐÚNG MỘT chính sách đổi trả đang hiệu lực cho mỗi danh mục, KỂ CẢ chính sách
            // mặc định (CategoryId IS NULL). Viết tay vì EF không diễn đạt được index trên biểu thức:
            // PostgreSQL coi mọi NULL là khác nhau, nên UNIQUE("CategoryId") cho phép N chính sách
            // mặc định cùng lúc — và khi đó "chính sách nào đang áp dụng" là không xác định.
            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS ""ux_return_policies_one_active_per_category""
                ON public.""ReturnPolicies"" (COALESCE(""CategoryId"", '00000000-0000-0000-0000-000000000000'::uuid))
                WHERE ""IsActive"";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"DROP INDEX IF EXISTS public.""ux_return_policies_one_active_per_category"";");

            migrationBuilder.DropTable(
                name: "HeldOrders",
                schema: "public");

            migrationBuilder.DropTable(
                name: "OrderPayments",
                schema: "public");

            migrationBuilder.DropTable(
                name: "SalesQuotationLines",
                schema: "public");

            migrationBuilder.DropTable(
                name: "SalesQuotations",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "ix_orders_anonymous_id",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "ix_orders_quotation_id",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "ix_orders_shift_id",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "ix_orders_store_id_order_date",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_ShippingVatAmount_NonNegative",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_ShippingVatRate_Fraction",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_AllocatedOrderDiscount_NonNegative",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_LineDiscount_NonNegative",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_VatAmount_NonNegative",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_VatRate_Fraction",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropIndex(
                name: "ix_loyalty_transactions_reversal_of",
                schema: "public",
                table: "LoyaltyTransactions");

            migrationBuilder.DropIndex(
                name: "ix_installment_applications_expires_at",
                schema: "public",
                table: "InstallmentApplications");

            migrationBuilder.DropIndex(
                name: "ix_carts_anonymous_id",
                schema: "public",
                table: "Carts");

            migrationBuilder.DropColumn(
                name: "ReasonCode",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "AllowOpenedBoxReturn",
                schema: "public",
                table: "ReturnPolicies");

            migrationBuilder.DropColumn(
                name: "DaysForStatutoryReturn",
                schema: "public",
                table: "ReturnPolicies");

            migrationBuilder.DropColumn(
                name: "MissingAccessoriesFeePercent",
                schema: "public",
                table: "ReturnPolicies");

            migrationBuilder.DropColumn(
                name: "AnonymousId",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BusinessDate",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BuyerAddress",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BuyerBudgetUnitCode",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BuyerEmail",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BuyerFullName",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BuyerLegalName",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BuyerPhone",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BuyerTaxCode",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "BuyerType",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CashierId",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Channel",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "InvoiceRequested",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PaymentDueDate",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "QuotationId",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShiftId",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingVatAmount",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingVatRate",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "StoreId",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TermsVersion",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "AllocatedOrderDiscount",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "GrossBeforeDiscount",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "LineDiscount",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "Sequence",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "UnitName",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VatAmount",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VatRate",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VatReductionEligible",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VatStatutoryRate",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "ReversalOf",
                schema: "public",
                table: "LoyaltyTransactions");

            migrationBuilder.DropColumn(
                name: "ConsentAt",
                schema: "public",
                table: "InstallmentApplications");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                schema: "public",
                table: "InstallmentApplications");

            migrationBuilder.DropColumn(
                name: "FinanceContractNumber",
                schema: "public",
                table: "InstallmentApplications");

            migrationBuilder.DropColumn(
                name: "AnonymousId",
                schema: "public",
                table: "Carts");
        }
    }
}
