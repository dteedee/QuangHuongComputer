using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W111InventorySchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---------------------------------------------------------------- 1. dọn dữ liệu
            // D09: mọi InventoryItem phải thuộc về một kho. Backfill về kho mặc định
            // (IsDefault = true), nếu chưa có thì về KHO-CHINH. Không có kho nào -> bỏ qua,
            // ràng buộc duy nhất phía dưới vẫn dùng COALESCE nên không vỡ.
            migrationBuilder.Sql(@"
                UPDATE public.""InventoryItems"" i
                   SET ""WarehouseId"" = w.""Id""
                  FROM (
                        SELECT ""Id"" FROM public.""Warehouses""
                         WHERE ""IsDefault"" = true
                         ORDER BY ""CreatedAt""
                         LIMIT 1
                       ) w
                 WHERE i.""WarehouseId"" IS NULL;

                UPDATE public.""InventoryItems"" i
                   SET ""WarehouseId"" = w.""Id""
                  FROM (
                        SELECT ""Id"" FROM public.""Warehouses""
                         WHERE ""Code"" = 'KHO-CHINH'
                         ORDER BY ""CreatedAt""
                         LIMIT 1
                       ) w
                 WHERE i.""WarehouseId"" IS NULL;");

            // D09: nhiều kho cùng IsDefault = true sẽ làm chỉ mục duy nhất bên dưới thất bại.
            // Giữ lại kho mặc định cũ nhất, hạ cờ những kho còn lại.
            migrationBuilder.Sql(@"
                UPDATE public.""Warehouses""
                   SET ""IsDefault"" = false
                 WHERE ""IsDefault"" = true
                   AND ""Id"" <> (SELECT ""Id"" FROM public.""Warehouses""
                                   WHERE ""IsDefault"" = true
                                   ORDER BY ""CreatedAt"" LIMIT 1);");

            migrationBuilder.DropIndex(
                name: "IX_Warehouse_Default",
                table: "Warehouses");

            migrationBuilder.CreateIndex(
                name: "IX_Warehouse_Default",
                table: "Warehouses",
                column: "IsDefault",
                unique: true,
                filter: "\"IsDefault\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Warehouses_Capacity_NonNegative",
                table: "Warehouses",
                sql: "\"Capacity\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StockReservations_Quantity_NonNegative",
                table: "StockReservations",
                sql: "\"Quantity\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovement_InventoryItemId",
                table: "StockMovements",
                column: "InventoryItemId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseOrders_TotalAmount_NonNegative",
                table: "PurchaseOrders",
                sql: "\"TotalAmount\" >= 0");

            // NOT VALID có chủ đích: CSDL dev còn 1 dòng rác do agent kiểm toán tạo ngày
            // 2026-09-17 (PurchaseOrderItem Id = 1, Quantity = -10, UnitPrice = -5.00).
            // NOT VALID chặn mọi dòng MỚI nhưng không quét dòng cũ, nên migration không
            // thất bại và không có dữ liệu nào bị xoá. Sau khi D03 dọn dữ liệu thử, chạy:
            //   ALTER TABLE public."PurchaseOrderItem"
            //     VALIDATE CONSTRAINT "CK_PurchaseOrderItem_Quantity_Positive";
            //   ALTER TABLE public."PurchaseOrderItem"
            //     VALIDATE CONSTRAINT "CK_PurchaseOrderItem_UnitPrice_NonNegative";
            migrationBuilder.Sql(@"
                ALTER TABLE public.""PurchaseOrderItem""
                    ADD CONSTRAINT ""CK_PurchaseOrderItem_Quantity_Positive""
                    CHECK (""Quantity"" > 0) NOT VALID;

                ALTER TABLE public.""PurchaseOrderItem""
                    ADD CONSTRAINT ""CK_PurchaseOrderItem_UnitPrice_NonNegative""
                    CHECK (""UnitPrice"" >= 0) NOT VALID;");

            // W1-11 (kiểm chứng đối kháng): dòng rác CHỈ tồn tại trên bản sao CSDL test, không có
            // trên CSDL của chủ sở hữu. Nếu để NOT VALID vĩnh viễn thì PostgreSQL không bảo đảm
            // các dòng CŨ - trên CSDL sạch thì đó là mất mát vô cớ. Vì vậy: tự VALIDATE ngay khi
            // không còn dòng vi phạm; nếu còn thì bỏ qua (giữ nguyên hành vi dung thứ cũ).
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM public.""PurchaseOrderItem"" WHERE ""Quantity"" <= 0) THEN
                        ALTER TABLE public.""PurchaseOrderItem""
                            VALIDATE CONSTRAINT ""CK_PurchaseOrderItem_Quantity_Positive"";
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM public.""PurchaseOrderItem"" WHERE ""UnitPrice"" < 0) THEN
                        ALTER TABLE public.""PurchaseOrderItem""
                            VALIDATE CONSTRAINT ""CK_PurchaseOrderItem_UnitPrice_NonNegative"";
                    END IF;
                END $$;");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LandedCosts_Amount_NonNegative",
                table: "LandedCosts",
                sql: "\"Amount\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Inventory_WarehouseId",
                table: "InventoryItems",
                column: "WarehouseId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InventoryItems_AverageCost_NonNegative",
                table: "InventoryItems",
                sql: "\"AverageCost\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InventoryItems_QuantityOnHand_NonNegative",
                table: "InventoryItems",
                sql: "\"QuantityOnHand\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InventoryItems_ReorderQuantity_NonNegative",
                table: "InventoryItems",
                sql: "\"ReorderQuantity\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InventoryItems_Reserved_LteOnHand",
                table: "InventoryItems",
                sql: "\"ReservedQuantity\" <= \"QuantityOnHand\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InventoryItems_ReservedQuantity_NonNegative",
                table: "InventoryItems",
                sql: "\"ReservedQuantity\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_GRNItems_AcceptedQty_NonNegative",
                table: "GRNItems",
                sql: "\"AcceptedQty\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_GRNItems_Inspected_LteQuantity",
                table: "GRNItems",
                sql: "\"AcceptedQty\" + \"RejectedQty\" <= \"Quantity\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_GRNItems_Quantity_Positive",
                table: "GRNItems",
                sql: "\"Quantity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_GRNItems_RejectedQty_NonNegative",
                table: "GRNItems",
                sql: "\"RejectedQty\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_GRNItems_UnitCost_NonNegative",
                table: "GRNItems",
                sql: "\"UnitCost\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_GRN_PurchaseOrderId",
                table: "GoodsReceivedNotes",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_GRN_SupplierId",
                table: "GoodsReceivedNotes",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_GRN_WarehouseId",
                table: "GoodsReceivedNotes",
                column: "WarehouseId");

            // ------------------------------------------------- khoá nghiệp vụ của tồn kho
            // Chỉ mục duy nhất cũ (IX_Inventory_Product_Variant_Warehouse_Unique) chỉ áp dụng
            // cho dòng có VariantId IS NOT NULL, và trong PostgreSQL NULL không bao giờ "bằng"
            // NULL, nên hai dòng (ProductId, NULL, NULL) vẫn tạo trùng được. COALESCE về UUID
            // rỗng đóng nốt lỗ hổng đó. Biểu thức nên không mô hình hoá được bằng EF -> SQL thuần.
            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS ""uq_inventory_items_product_variant_warehouse""
                    ON public.""InventoryItems"" (
                        ""ProductId"",
                        COALESCE(""VariantId"",   '00000000-0000-0000-0000-000000000000'::uuid),
                        COALESCE(""WarehouseId"", '00000000-0000-0000-0000-000000000000'::uuid));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.""uq_inventory_items_product_variant_warehouse"";");

            migrationBuilder.Sql(@"
                ALTER TABLE public.""PurchaseOrderItem""
                    DROP CONSTRAINT IF EXISTS ""CK_PurchaseOrderItem_Quantity_Positive"";
                ALTER TABLE public.""PurchaseOrderItem""
                    DROP CONSTRAINT IF EXISTS ""CK_PurchaseOrderItem_UnitPrice_NonNegative"";");
            migrationBuilder.DropIndex(
                name: "IX_Warehouse_Default",
                table: "Warehouses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Warehouses_Capacity_NonNegative",
                table: "Warehouses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StockReservations_Quantity_NonNegative",
                table: "StockReservations");

            migrationBuilder.DropIndex(
                name: "IX_StockMovement_InventoryItemId",
                table: "StockMovements");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseOrders_TotalAmount_NonNegative",
                table: "PurchaseOrders");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LandedCosts_Amount_NonNegative",
                table: "LandedCosts");

            migrationBuilder.DropIndex(
                name: "IX_Inventory_WarehouseId",
                table: "InventoryItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InventoryItems_AverageCost_NonNegative",
                table: "InventoryItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InventoryItems_QuantityOnHand_NonNegative",
                table: "InventoryItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InventoryItems_ReorderQuantity_NonNegative",
                table: "InventoryItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InventoryItems_Reserved_LteOnHand",
                table: "InventoryItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InventoryItems_ReservedQuantity_NonNegative",
                table: "InventoryItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_GRNItems_AcceptedQty_NonNegative",
                table: "GRNItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_GRNItems_Inspected_LteQuantity",
                table: "GRNItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_GRNItems_Quantity_Positive",
                table: "GRNItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_GRNItems_RejectedQty_NonNegative",
                table: "GRNItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_GRNItems_UnitCost_NonNegative",
                table: "GRNItems");

            migrationBuilder.DropIndex(
                name: "IX_GRN_PurchaseOrderId",
                table: "GoodsReceivedNotes");

            migrationBuilder.DropIndex(
                name: "IX_GRN_SupplierId",
                table: "GoodsReceivedNotes");

            migrationBuilder.DropIndex(
                name: "IX_GRN_WarehouseId",
                table: "GoodsReceivedNotes");

            migrationBuilder.CreateIndex(
                name: "IX_Warehouse_Default",
                table: "Warehouses",
                column: "IsDefault");
        }
    }
}
