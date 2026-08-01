using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReturnPolicyAndReturnRequestFields : Migration
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
                name: "AttachmentUrls",
                schema: "public",
                table: "ReturnRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ExchangeOrderId",
                schema: "public",
                table: "ReturnRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ExchangeProductId",
                schema: "public",
                table: "ReturnRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ExchangeVariantId",
                schema: "public",
                table: "ReturnRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "InspectedAt",
                schema: "public",
                table: "ReturnRequests",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "InspectedBy",
                schema: "public",
                table: "ReturnRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InspectionNotes",
                schema: "public",
                table: "ReturnRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceDifference",
                schema: "public",
                table: "ReturnRequests",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReceivedCondition",
                schema: "public",
                table: "ReturnRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RestockWarehouseId",
                schema: "public",
                table: "ReturnRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                schema: "public",
                table: "ReturnRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ReturnPolicies",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    DaysForReturn = table.Column<int>(type: "integer", nullable: false),
                    DaysForExchange = table.Column<int>(type: "integer", nullable: false),
                    DaysForDefectReplace = table.Column<int>(type: "integer", nullable: false),
                    RequireOriginalPackaging = table.Column<bool>(type: "boolean", nullable: false),
                    RequireAllAccessories = table.Column<bool>(type: "boolean", nullable: false),
                    RestockingFeePercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnPolicies", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_return_requests_type",
                schema: "public",
                table: "ReturnRequests",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "ix_return_policies_category_id",
                schema: "public",
                table: "ReturnPolicies",
                column: "CategoryId");

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
                name: "ReturnPolicies",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "ix_return_requests_type",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "AttachmentUrls",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "ExchangeOrderId",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "ExchangeProductId",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "ExchangeVariantId",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "InspectedAt",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "InspectedBy",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "InspectionNotes",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "PriceDifference",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "ReceivedCondition",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "RestockWarehouseId",
                schema: "public",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "Type",
                schema: "public",
                table: "ReturnRequests");

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
