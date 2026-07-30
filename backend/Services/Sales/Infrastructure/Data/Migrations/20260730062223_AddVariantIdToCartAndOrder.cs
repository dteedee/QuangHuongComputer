using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantIdToCartAndOrder : Migration
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

            migrationBuilder.AddColumn<Guid>(
                name: "VariantId",
                schema: "public",
                table: "OrderItem",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VariantName",
                schema: "public",
                table: "OrderItem",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VariantSku",
                schema: "public",
                table: "OrderItem",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VariantId",
                schema: "public",
                table: "CartItem",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VariantName",
                schema: "public",
                table: "CartItem",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VariantSku",
                schema: "public",
                table: "CartItem",
                type: "text",
                nullable: true);

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

            migrationBuilder.DropColumn(
                name: "VariantId",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VariantName",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VariantSku",
                schema: "public",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VariantId",
                schema: "public",
                table: "CartItem");

            migrationBuilder.DropColumn(
                name: "VariantName",
                schema: "public",
                table: "CartItem");

            migrationBuilder.DropColumn(
                name: "VariantSku",
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
