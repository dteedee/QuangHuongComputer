using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W25InventoryStockLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BalanceAfter",
                table: "StockMovements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ReasonCode",
                table: "StockMovements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "StockMovements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "VariantId",
                table: "StockMovements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WarehouseId",
                table: "StockMovements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Reason",
                table: "StockAdjustments",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ApprovedBy",
                table: "StockAdjustments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AdjustmentNumber",
                table: "StockAdjustments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "AdjustedBy",
                table: "StockAdjustments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPosted",
                table: "StockAdjustments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PostedAt",
                table: "StockAdjustments",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "StockAdjustments",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProductSku",
                table: "StockAdjustmentItem",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProductName",
                table: "StockAdjustmentItem",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GoodsReceivedNoteItemId",
                table: "SerialNumbers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReceivedQuantity",
                table: "PurchaseOrderItem",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "InventoryItemId",
                table: "InventoryCountItems",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "VariantId",
                table: "InventoryCountItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "WarehouseId",
                table: "InventoryCountItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockMovement_ReasonCode",
                table: "StockMovements",
                column: "ReasonCode");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovement_Warehouse_Date",
                table: "StockMovements",
                columns: new[] { "WarehouseId", "MovementDate" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_StockMovements_UnitCost_NonNegative",
                table: "StockMovements",
                sql: "\"UnitCost\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustmentItem_InventoryItem",
                table: "StockAdjustmentItem",
                column: "InventoryItemId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StockAdjustmentItems_QuantityAfter_NonNegative",
                table: "StockAdjustmentItem",
                sql: "\"QuantityAfter\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Serial_GRNItem",
                table: "SerialNumbers",
                column: "GoodsReceivedNoteItemId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseOrderItem_ReceivedQuantity_NonNegative",
                table: "PurchaseOrderItem",
                sql: "\"ReceivedQuantity\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_CountItem_InventoryItem",
                table: "InventoryCountItems",
                column: "InventoryItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_GoodsReceivedNotes_PurchaseOrders_PurchaseOrderId",
                table: "GoodsReceivedNotes",
                column: "PurchaseOrderId",
                principalTable: "PurchaseOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // --- W2-5 bổ sung tay (không sinh được từ model) ---

            // Hai loại chứng từ riêng của kho chưa nằm trong từ vựng đóng băng của W1-3
            // (DocumentNumberTypes): kiểm kê (cnt) và phiếu điều chỉnh (adj). Sequence đi trước,
            // hằng số trong BuildingBlocks theo sau (integration request W2-5-01) — thứ tự này an
            // toàn vì InventoryDocumentNumbers đọc trực tiếp sequence khi chưa có hằng số.
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS docnum_cnt_seq AS bigint START WITH 1 INCREMENT BY 1 NO CYCLE;");
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS docnum_adj_seq AS bigint START WITH 1 INCREMENT BY 1 NO CYCLE;");

            // Bút toán cũ (trước sổ cái) không có kho/biến thể. Lấy lại từ chính dòng tồn mà chúng
            // tham chiếu — không đoán, chỉ đọc quan hệ đã có.
            migrationBuilder.Sql("""
                UPDATE "StockMovements" m
                SET "WarehouseId" = i."WarehouseId", "VariantId" = i."VariantId"
                FROM "InventoryItems" i
                WHERE i."Id" = m."InventoryItemId" AND m."WarehouseId" IS NULL;
                """);

            // BalanceAfter của bút toán cũ KHÔNG backfill được: tồn tại thời điểm đó không còn dấu
            // vết nào trong CSDL. Ghi chú lại để báo cáo không hiểu nhầm 0 là "tồn bằng 0".
            migrationBuilder.Sql("""
                COMMENT ON COLUMN "StockMovements"."BalanceAfter" IS
                'Tồn của dòng tồn NGAY SAU bút toán. Bút toán ghi trước W2-5 mang giá trị 0 vì không
                 tái dựng được, KHÔNG có nghĩa là tồn bằng 0.';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS docnum_cnt_seq;");
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS docnum_adj_seq;");

            migrationBuilder.DropForeignKey(
                name: "FK_GoodsReceivedNotes_PurchaseOrders_PurchaseOrderId",
                table: "GoodsReceivedNotes");

            migrationBuilder.DropIndex(
                name: "IX_StockMovement_ReasonCode",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockMovement_Warehouse_Date",
                table: "StockMovements");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StockMovements_UnitCost_NonNegative",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockAdjustmentItem_InventoryItem",
                table: "StockAdjustmentItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StockAdjustmentItems_QuantityAfter_NonNegative",
                table: "StockAdjustmentItem");

            migrationBuilder.DropIndex(
                name: "IX_Serial_GRNItem",
                table: "SerialNumbers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseOrderItem_ReceivedQuantity_NonNegative",
                table: "PurchaseOrderItem");

            migrationBuilder.DropIndex(
                name: "IX_CountItem_InventoryItem",
                table: "InventoryCountItems");

            migrationBuilder.DropColumn(
                name: "BalanceAfter",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "ReasonCode",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "WarehouseId",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "IsPosted",
                table: "StockAdjustments");

            migrationBuilder.DropColumn(
                name: "PostedAt",
                table: "StockAdjustments");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "StockAdjustments");

            migrationBuilder.DropColumn(
                name: "GoodsReceivedNoteItemId",
                table: "SerialNumbers");

            migrationBuilder.DropColumn(
                name: "ReceivedQuantity",
                table: "PurchaseOrderItem");

            migrationBuilder.DropColumn(
                name: "InventoryItemId",
                table: "InventoryCountItems");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "InventoryCountItems");

            migrationBuilder.DropColumn(
                name: "WarehouseId",
                table: "InventoryCountItems");

            migrationBuilder.AlterColumn<string>(
                name: "Reason",
                table: "StockAdjustments",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "ApprovedBy",
                table: "StockAdjustments",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AdjustmentNumber",
                table: "StockAdjustments",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<string>(
                name: "AdjustedBy",
                table: "StockAdjustments",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProductSku",
                table: "StockAdjustmentItem",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProductName",
                table: "StockAdjustmentItem",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(300)",
                oldMaxLength: 300,
                oldNullable: true);
        }
    }
}
