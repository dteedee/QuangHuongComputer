using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckoutSessionAndPromotionSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CartItem_Carts_CartId",
                schema: "public",
                table: "CartItem");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItem_Orders_OrderId",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.AddColumn<string>(
                name: "AppliedPromotionsJson",
                schema: "public",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingDiscount",
                schema: "public",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "AppliedPromotionCode",
                schema: "public",
                table: "OrderItem",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsGift",
                schema: "public",
                table: "OrderItem",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AppliedPromotionCode",
                schema: "public",
                table: "CartItem",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsGift",
                schema: "public",
                table: "CartItem",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "CheckoutSessions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CartId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    WasExtended = table.Column<bool>(type: "boolean", nullable: false),
                    ReservationIdsJson = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CheckoutSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InstallmentApplications",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TermMonths = table.Column<int>(type: "integer", nullable: false),
                    DownPayment = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MonthlyAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    DocumentUrls = table.Column<string>(type: "text", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ProcessedBy = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstallmentApplications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_checkout_sessions_cart_id",
                schema: "public",
                table: "CheckoutSessions",
                column: "CartId");

            migrationBuilder.CreateIndex(
                name: "ix_checkout_sessions_status_expires",
                schema: "public",
                table: "CheckoutSessions",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "ix_installment_applications_order_id",
                schema: "public",
                table: "InstallmentApplications",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "ix_installment_applications_status",
                schema: "public",
                table: "InstallmentApplications",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_CartItem_Carts_CartId",
                schema: "public",
                table: "CartItem",
                column: "CartId",
                principalSchema: "public",
                principalTable: "Carts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItem_Orders_OrderId",
                schema: "public",
                table: "OrderItem",
                column: "OrderId",
                principalSchema: "public",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
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
                name: "CheckoutSessions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "InstallmentApplications",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "AppliedPromotionsJson",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingDiscount",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "AppliedPromotionCode",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "IsGift",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "AppliedPromotionCode",
                schema: "public",
                table: "CartItem");

            migrationBuilder.DropColumn(
                name: "IsGift",
                schema: "public",
                table: "CartItem");

            migrationBuilder.AddForeignKey(
                name: "FK_CartItem_Carts_CartId",
                schema: "public",
                table: "CartItem",
                column: "CartId",
                principalSchema: "public",
                principalTable: "Carts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItem_Orders_OrderId",
                schema: "public",
                table: "OrderItem",
                column: "OrderId",
                principalSchema: "public",
                principalTable: "Orders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
