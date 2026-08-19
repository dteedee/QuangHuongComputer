using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderCustomerSnapshot : Migration
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
                name: "CustomerEmail",
                schema: "public",
                table: "Orders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                schema: "public",
                table: "Orders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerPhone",
                schema: "public",
                table: "Orders",
                type: "character varying(30)",
                maxLength: 30,
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
                name: "CustomerEmail",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerName",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerPhone",
                schema: "public",
                table: "Orders");

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
