using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGRNSourceCustomerReturn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReferenceOrderId",
                table: "GoodsReceivedNotes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "GoodsReceivedNotes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_GRN_Source",
                table: "GoodsReceivedNotes",
                column: "Source");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GRN_Source",
                table: "GoodsReceivedNotes");

            migrationBuilder.DropColumn(
                name: "ReferenceOrderId",
                table: "GoodsReceivedNotes");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "GoodsReceivedNotes");
        }
    }
}
