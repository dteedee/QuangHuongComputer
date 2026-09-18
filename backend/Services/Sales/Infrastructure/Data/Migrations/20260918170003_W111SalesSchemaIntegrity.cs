using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W111SalesSchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // W1-11: 22 cột thời gian của Sales/Content đã là timestamptz trong CSDL đang chạy
            // nhưng snapshot ghi `timestamp without time zone` (migration
            // 20260728073010_FixSalesSchemaAndIndexes chỉ đổi kiểu trong Down()).
            // Khối này vá cả hai chiều: cài mới thì đổi kiểu thật, CSDL đang chạy thì bỏ qua.
            // `AT TIME ZONE 'UTC'` là bắt buộc - ứng dụng ghi giá trị UTC không có hậu tố.
            migrationBuilder.Sql(@"
                DO $$
                DECLARE r record;
                BEGIN
                    FOR r IN SELECT * FROM (VALUES
                    ('Carts','CreatedAt'),
                    ('Carts','UpdatedAt'),
                    ('LoyaltyAccounts','CreatedAt'),
                    ('LoyaltyAccounts','UpdatedAt'),
                    ('LoyaltyAccounts','LastActivityAt'),
                    ('LoyaltyAccounts','TierExpiresAt'),
                    ('LoyaltyTransactions','CreatedAt'),
                    ('LoyaltyTransactions','UpdatedAt'),
                    ('OrderItem','CreatedAt'),
                    ('OrderItem','UpdatedAt'),
                    ('Orders','CreatedAt'),
                    ('Orders','UpdatedAt'),
                    ('Orders','OrderDate'),
                    ('Orders','ConfirmedAt'),
                    ('Orders','PaidAt'),
                    ('Orders','FulfilledAt'),
                    ('Orders','ShippedAt'),
                    ('Orders','DeliveredAt'),
                    ('Orders','CompletedAt'),
                    ('Orders','CancelledAt')
                    ) AS t(tbl, col)
                    LOOP
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = 'public' AND table_name = r.tbl
                              AND column_name = r.col
                              AND data_type = 'timestamp without time zone')
                        THEN
                            EXECUTE format(
                                'ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',
                                r.tbl, r.col, r.col);
                        END IF;
                    END LOOP;
                END $$;");

            // W1-11 / audit db-schema-migrations-23: snapshot ghi numeric(18,2) nhưng CSDL
            // thật vẫn là `numeric` không giới hạn, nên EF không sinh được AlterColumn.
            migrationBuilder.Sql(@"
                ALTER TABLE public.""Orders""
                    ALTER COLUMN ""DiscountAmount"" TYPE numeric(18,2),
                    ALTER COLUMN ""ShippingAmount"" TYPE numeric(18,2);");

            migrationBuilder.AlterColumn<decimal>(
                name: "TaxRate",
                schema: "public",
                table: "Orders",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<decimal>(
                name: "ShippingFee",
                schema: "public",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.CreateIndex(
                name: "ix_orders_customer_id_created_at",
                schema: "public",
                table: "Orders",
                columns: new[] { "CustomerId", "CreatedAt" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_DiscountAmount_NonNegative",
                schema: "public",
                table: "Orders",
                sql: "\"DiscountAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_ShippingAmount_NonNegative",
                schema: "public",
                table: "Orders",
                sql: "\"ShippingAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_ShippingDiscount_NonNegative",
                schema: "public",
                table: "Orders",
                sql: "\"ShippingDiscount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_ShippingFee_NonNegative",
                schema: "public",
                table: "Orders",
                sql: "\"ShippingFee\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_SubtotalAmount_NonNegative",
                schema: "public",
                table: "Orders",
                sql: "\"SubtotalAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_TaxAmount_NonNegative",
                schema: "public",
                table: "Orders",
                sql: "\"TaxAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_TaxRate_Fraction",
                schema: "public",
                table: "Orders",
                sql: "\"TaxRate\" >= 0 AND \"TaxRate\" <= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Orders_TotalAmount_NonNegative",
                schema: "public",
                table: "Orders",
                sql: "\"TotalAmount\" >= 0");

            migrationBuilder.CreateIndex(
                name: "ix_order_item_product_id",
                schema: "public",
                table: "OrderItem",
                column: "ProductId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_DiscountAmount_NonNegative",
                schema: "public",
                table: "OrderItem",
                sql: "\"DiscountAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_LineTotal_NonNegative",
                schema: "public",
                table: "OrderItem",
                sql: "\"LineTotal\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_Quantity_Positive",
                schema: "public",
                table: "OrderItem",
                sql: "\"Quantity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_UnitPrice_NonNegative",
                schema: "public",
                table: "OrderItem",
                sql: "\"UnitPrice\" >= 0");

            migrationBuilder.CreateIndex(
                name: "ix_carts_customer_id",
                schema: "public",
                table: "Carts",
                column: "CustomerId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Carts_DiscountAmount_NonNegative",
                schema: "public",
                table: "Carts",
                sql: "\"DiscountAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Carts_ShippingAmount_NonNegative",
                schema: "public",
                table: "Carts",
                sql: "\"ShippingAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Carts_TaxRate_Fraction",
                schema: "public",
                table: "Carts",
                sql: "\"TaxRate\" >= 0 AND \"TaxRate\" <= 1");

            migrationBuilder.CreateIndex(
                name: "ix_cart_item_product_id",
                schema: "public",
                table: "CartItem",
                column: "ProductId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CartItem_Price_NonNegative",
                schema: "public",
                table: "CartItem",
                sql: "\"Price\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CartItem_Quantity_Positive",
                schema: "public",
                table: "CartItem",
                sql: "\"Quantity\" > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_orders_customer_id_created_at",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_DiscountAmount_NonNegative",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_ShippingAmount_NonNegative",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_ShippingDiscount_NonNegative",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_ShippingFee_NonNegative",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_SubtotalAmount_NonNegative",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_TaxAmount_NonNegative",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_TaxRate_Fraction",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Orders_TotalAmount_NonNegative",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "ix_order_item_product_id",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_DiscountAmount_NonNegative",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_LineTotal_NonNegative",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_Quantity_Positive",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_UnitPrice_NonNegative",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropIndex(
                name: "ix_carts_customer_id",
                schema: "public",
                table: "Carts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Carts_DiscountAmount_NonNegative",
                schema: "public",
                table: "Carts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Carts_ShippingAmount_NonNegative",
                schema: "public",
                table: "Carts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Carts_TaxRate_Fraction",
                schema: "public",
                table: "Carts");

            migrationBuilder.DropIndex(
                name: "ix_cart_item_product_id",
                schema: "public",
                table: "CartItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CartItem_Price_NonNegative",
                schema: "public",
                table: "CartItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CartItem_Quantity_Positive",
                schema: "public",
                table: "CartItem");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "TaxRate",
                schema: "public",
                table: "Orders",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,4)",
                oldPrecision: 5,
                oldScale: 4);

            migrationBuilder.AlterColumn<decimal>(
                name: "ShippingFee",
                schema: "public",
                table: "Orders",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTime>(
                name: "ShippedAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "PaidAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "OrderDate",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "FulfilledAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "DeliveredAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ConfirmedAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CompletedAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CancelledAt",
                schema: "public",
                table: "Orders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "OrderItem",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "OrderItem",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "LoyaltyTransactions",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "LoyaltyTransactions",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "LoyaltyAccounts",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "TierExpiresAt",
                schema: "public",
                table: "LoyaltyAccounts",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastActivityAt",
                schema: "public",
                table: "LoyaltyAccounts",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "LoyaltyAccounts",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "public",
                table: "Carts",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "public",
                table: "Carts",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");
        }
    }
}
