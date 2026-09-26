using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Chuyển kho: chọn serial khi lập phiếu, nhận hàng có chênh lệch, huỷ có dấu vết.
    /// Token xmin của StockTransfers là cột hệ thống của Postgres — chỉ đổi model, không có DDL.
    /// </summary>
    public partial class W2StockTransferReceiptSerials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "StockTransfers",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancelledBy",
                table: "StockTransfers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiveNote",
                table: "StockTransfers",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SerialNumbers",
                table: "StockTransferItem",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");

            migrationBuilder.AddColumn<int>(
                name: "ReceivedQuantity",
                table: "StockTransferItem",
                type: "integer",
                nullable: true);

            // Phiếu đã nhận trước bản này: bản cũ luôn nhập đủ số đã xuất.
            migrationBuilder.Sql(
                "UPDATE \"StockTransferItem\" i SET \"ReceivedQuantity\" = i.\"Quantity\" " +
                "FROM \"StockTransfers\" t WHERE t.\"Id\" = i.\"StockTransferId\" AND t.\"Status\" = 3;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CancelledAt", table: "StockTransfers");
            migrationBuilder.DropColumn(name: "CancelledBy", table: "StockTransfers");
            migrationBuilder.DropColumn(name: "ReceiveNote", table: "StockTransfers");
            migrationBuilder.DropColumn(name: "SerialNumbers", table: "StockTransferItem");
            migrationBuilder.DropColumn(name: "ReceivedQuantity", table: "StockTransferItem");
        }
    }
}
