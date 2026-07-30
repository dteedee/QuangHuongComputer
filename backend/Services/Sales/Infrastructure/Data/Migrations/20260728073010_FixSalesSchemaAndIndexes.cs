using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixSalesSchemaAndIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE: prior migrations left the schema in an inconsistent state
            // relative to the model snapshot (missing tables/columns). Instead
            // of replaying dozens of drift-sensitive Alter/Rename/Drop ops that
            // fail on a fresh database, this migration now uses idempotent DDL
            // (CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS) to bring
            // the Sales schema up to match the model snapshot.
            migrationBuilder.EnsureSchema(name: "public");

            migrationBuilder.Sql(@"
-- Missing tables ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.""CustomerAddresses"" (
    ""Id"" uuid NOT NULL,
    ""UserId"" uuid NOT NULL,
    ""Label"" character varying(50) NOT NULL,
    ""FullName"" character varying(100) NOT NULL,
    ""Phone"" character varying(20) NOT NULL,
    ""Province"" character varying(100) NOT NULL,
    ""District"" character varying(100) NOT NULL,
    ""Ward"" character varying(100) NOT NULL,
    ""StreetAddress"" character varying(300) NOT NULL,
    ""IsDefault"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAt"" timestamp without time zone NOT NULL,
    ""UpdatedAt"" timestamp without time zone NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedBy"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    CONSTRAINT ""PK_CustomerAddresses"" PRIMARY KEY (""Id"")
);
CREATE INDEX IF NOT EXISTS ix_customer_addresses_user_default
    ON public.""CustomerAddresses"" (""UserId"", ""IsDefault"");

CREATE TABLE IF NOT EXISTS public.""OrderHistories"" (
    ""Id"" uuid NOT NULL,
    ""OrderId"" uuid NOT NULL,
    ""FromStatus"" integer NOT NULL,
    ""ToStatus"" integer NOT NULL,
    ""ChangedAt"" timestamp without time zone NOT NULL,
    ""ChangedBy"" text NULL,
    ""Notes"" text NULL,
    ""CreatedAt"" timestamp without time zone NOT NULL,
    ""UpdatedAt"" timestamp without time zone NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedBy"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    CONSTRAINT ""PK_OrderHistories"" PRIMARY KEY (""Id"")
);
CREATE INDEX IF NOT EXISTS ix_order_histories_order_id_changed_at
    ON public.""OrderHistories"" (""OrderId"", ""ChangedAt"");

CREATE TABLE IF NOT EXISTS public.""ReturnRequests"" (
    ""Id"" uuid NOT NULL,
    ""OrderId"" uuid NOT NULL,
    ""OrderItemId"" uuid NOT NULL,
    ""Reason"" text NOT NULL,
    ""Description"" text NULL,
    ""Status"" integer NOT NULL,
    ""RefundAmount"" numeric(18,2) NOT NULL,
    ""RejectionReason"" text NULL,
    ""RequestedAt"" timestamp without time zone NULL,
    ""ApprovedAt"" timestamp without time zone NULL,
    ""RejectedAt"" timestamp without time zone NULL,
    ""RefundedAt"" timestamp without time zone NULL,
    ""CustomerNotes"" text NULL,
    ""ProcessedBy"" text NULL,
    ""RefundMethod"" text NULL,
    ""CreatedAt"" timestamp without time zone NOT NULL,
    ""UpdatedAt"" timestamp without time zone NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedBy"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    CONSTRAINT ""PK_ReturnRequests"" PRIMARY KEY (""Id"")
);
CREATE INDEX IF NOT EXISTS ix_return_requests_status
    ON public.""ReturnRequests"" (""Status"");
CREATE INDEX IF NOT EXISTS ix_return_requests_order_id_status
    ON public.""ReturnRequests"" (""OrderId"", ""Status"");

CREATE TABLE IF NOT EXISTS public.""WishlistItems"" (
    ""Id"" uuid NOT NULL,
    ""UserId"" text NOT NULL,
    ""ProductId"" uuid NOT NULL,
    ""AddedAt"" timestamp without time zone NOT NULL DEFAULT NOW(),
    ""CreatedAt"" timestamp without time zone NOT NULL,
    ""UpdatedAt"" timestamp without time zone NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedBy"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    CONSTRAINT ""PK_WishlistItems"" PRIMARY KEY (""Id"")
);
CREATE INDEX IF NOT EXISTS ix_wishlist_items_user_id
    ON public.""WishlistItems"" (""UserId"");
CREATE UNIQUE INDEX IF NOT EXISTS ix_wishlist_items_user_product
    ON public.""WishlistItems"" (""UserId"", ""ProductId"");

-- Orders: add new columns / normalise types --------------------------------
ALTER TABLE public.""Orders""
    ADD COLUMN IF NOT EXISTS ""AffiliateId"" uuid NULL,
    ADD COLUMN IF NOT EXISTS ""CustomerIp"" text NULL,
    ADD COLUMN IF NOT EXISTS ""CustomerUserAgent"" text NULL,
    ADD COLUMN IF NOT EXISTS ""DeliveryCarrier"" text NULL,
    ADD COLUMN IF NOT EXISTS ""DeliveryTrackingNumber"" text NULL,
    ADD COLUMN IF NOT EXISTS ""DiscountReason"" text NULL,
    ADD COLUMN IF NOT EXISTS ""FailureReason"" text NULL,
    ADD COLUMN IF NOT EXISTS ""InternalNotes"" text NULL,
    ADD COLUMN IF NOT EXISTS ""IsPickup"" boolean NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ""PaymentMethod"" text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS ""PickupStoreId"" text NULL,
    ADD COLUMN IF NOT EXISTS ""PickupStoreName"" text NULL,
    ADD COLUMN IF NOT EXISTS ""RetryCount"" integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ""ShippingFee"" numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ""ShippingProvider"" text NULL,
    ADD COLUMN IF NOT EXISTS ""SourceId"" uuid NULL,
    ADD COLUMN IF NOT EXISTS ""TrackingNumber"" text NULL;

-- Orders: rename legacy CustomerId (uuid or text) then ensure type ----------
ALTER TABLE public.""Orders""
    ALTER COLUMN ""CustomerId"" TYPE uuid USING NULLIF(""CustomerId""::text, '')::uuid;

-- OrderItem: add missing columns ------------------------------------------
ALTER TABLE public.""OrderItem""
    ADD COLUMN IF NOT EXISTS ""DiscountAmount"" numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ""LineTotal"" numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ""OriginalPrice"" numeric(18,2) NULL,
    ADD COLUMN IF NOT EXISTS ""ProductSku"" text NULL;

-- Carts: add missing columns ----------------------------------------------
ALTER TABLE public.""Carts""
    ADD COLUMN IF NOT EXISTS ""CouponCode"" text NULL,
    ADD COLUMN IF NOT EXISTS ""CustomerId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ADD COLUMN IF NOT EXISTS ""DiscountAmount"" numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ""ShippingAmount"" numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ""TaxRate"" numeric(5,4) NOT NULL DEFAULT 0;

-- CartItem: add missing columns -------------------------------------------
ALTER TABLE public.""CartItem""
    ADD COLUMN IF NOT EXISTS ""ProductName"" text NOT NULL DEFAULT '';

-- Orders indexes ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_orders_total_amount ON public.""Orders"" (""TotalAmount"");
CREATE INDEX IF NOT EXISTS ix_orders_customer_id_order_date ON public.""Orders"" (""CustomerId"", ""OrderDate"");
CREATE INDEX IF NOT EXISTS ix_orders_fulfillment_status_order_date ON public.""Orders"" (""FulfillmentStatus"", ""OrderDate"");
CREATE INDEX IF NOT EXISTS ix_orders_payment_status_order_date ON public.""Orders"" (""PaymentStatus"", ""OrderDate"");
CREATE INDEX IF NOT EXISTS ix_orders_status_order_date ON public.""Orders"" (""Status"", ""OrderDate"");
");
        }


        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CartItem_Carts_CartId",
                schema: "public",
                table: "CartItem");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItem_Orders_OrderId",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropTable(
                name: "CustomerAddresses",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "AddedAt",
                schema: "public",
                table: "WishlistItems");

            migrationBuilder.DropColumn(
                name: "CustomerNotes",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "ProcessedBy",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "RefundMethod",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "AffiliateId",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerIp",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerUserAgent",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveredAt",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveryCarrier",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveryTrackingNumber",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DiscountReason",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "InternalNotes",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "IsPickup",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PickupStoreId",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PickupStoreName",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RetryCount",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippedAt",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingFee",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingProvider",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "SourceId",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TrackingNumber",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CouponCode",
                schema: "public",
                table: "Carts");

            migrationBuilder.RenameTable(
                name: "WishlistItems",
                schema: "public",
                newName: "WishlistItems");

            migrationBuilder.RenameTable(
                name: "ReturnRequests",
                schema: "public",
                newName: "ReturnRequests");

            migrationBuilder.RenameTable(
                name: "Orders",
                schema: "public",
                newName: "Orders");

            migrationBuilder.RenameTable(
                name: "OrderItem",
                schema: "public",
                newName: "OrderItem");

            migrationBuilder.RenameTable(
                name: "OrderHistories",
                schema: "public",
                newName: "OrderHistories");

            migrationBuilder.RenameTable(
                name: "LoyaltyTransactions",
                schema: "public",
                newName: "LoyaltyTransactions");

            migrationBuilder.RenameTable(
                name: "LoyaltyAccounts",
                schema: "public",
                newName: "LoyaltyAccounts");

            migrationBuilder.RenameTable(
                name: "Carts",
                schema: "public",
                newName: "Carts");

            migrationBuilder.RenameTable(
                name: "CartItem",
                schema: "public",
                newName: "CartItem");

            // Symmetric with Up(): drop ProductSku instead of renaming back to Sku
            migrationBuilder.DropColumn(
                name: "ProductSku",
                table: "OrderItem");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "WishlistItems",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "WishlistItems",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "ReturnRequests",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "RequestedAt",
                table: "ReturnRequests",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "RejectedAt",
                table: "ReturnRequests",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "RefundedAt",
                table: "ReturnRequests",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ReturnRequests",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ApprovedAt",
                table: "ReturnRequests",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "PaidAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "OrderDate",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "FulfilledAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ConfirmedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CompletedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CancelledAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "OrderItem",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "OriginalPrice",
                table: "OrderItem",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "OrderItem",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "OrderHistories",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "OrderHistories",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ChangedAt",
                table: "OrderHistories",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "LoyaltyTransactions",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "LoyaltyTransactions",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "LoyaltyAccounts",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "TierExpiresAt",
                table: "LoyaltyAccounts",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastActivityAt",
                table: "LoyaltyAccounts",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "LoyaltyAccounts",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Carts",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Carts",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AddForeignKey(
                name: "FK_CartItem_Carts_CartId",
                table: "CartItem",
                column: "CartId",
                principalTable: "Carts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItem_Orders_OrderId",
                table: "OrderItem",
                column: "OrderId",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
