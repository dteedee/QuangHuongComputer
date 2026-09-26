using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Repair.Infrastructure;

#nullable disable

namespace Repair.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Tiếp nhận máy: mức ưu tiên (mặc định Normal=1 cho phiếu cũ), loại/hãng thiết bị, phụ kiện
    /// nhận kèm và ảnh lúc nhận (text[]); ảnh trước/sau trên nhật ký phiếu; serial + linh kiện mua
    /// ngoài trên WorkOrderParts (InventoryItemId thành nullable, thêm giá vốn UnitCost). Mặc định
    /// cột chỉ dùng để điền dòng cũ rồi bỏ đi, để khớp model (model không khai báo default).
    /// </summary>
    [DbContext(typeof(RepairDbContext))]
    [Migration("20260927092000_AddWorkOrderIntakeDetails")]
    public partial class AddWorkOrderIntakeDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""WorkOrders""
                    ADD ""Priority"" integer NOT NULL DEFAULT 1,
                    ADD ""DeviceType"" character varying(100) NULL,
                    ADD ""DeviceBrand"" character varying(100) NULL,
                    ADD ""AccessoriesReceived"" text[] NOT NULL DEFAULT '{}',
                    ADD ""IntakePhotoUrls"" text[] NOT NULL DEFAULT '{}';
                ALTER TABLE ""WorkOrders""
                    ALTER COLUMN ""Priority"" DROP DEFAULT,
                    ALTER COLUMN ""AccessoriesReceived"" DROP DEFAULT,
                    ALTER COLUMN ""IntakePhotoUrls"" DROP DEFAULT;

                ALTER TABLE ""WorkOrderActivityLogs""
                    ADD ""PhotoStage"" integer NULL,
                    ADD ""PhotoUrls"" text[] NOT NULL DEFAULT '{}';
                ALTER TABLE ""WorkOrderActivityLogs"" ALTER COLUMN ""PhotoUrls"" DROP DEFAULT;

                ALTER TABLE ""WorkOrderParts""
                    ALTER COLUMN ""InventoryItemId"" DROP NOT NULL,
                    ADD ""SerialNumber"" character varying(100) NULL,
                    ADD ""UnitCost"" numeric(18,2) NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_Priority_Status",
                table: "WorkOrders",
                columns: new[] { "Priority", "Status" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_WorkOrderParts_BoughtIn_HasCost",
                table: "WorkOrderParts",
                sql: "\"InventoryItemId\" IS NOT NULL OR (\"UnitCost\" IS NOT NULL AND \"UnitCost\" >= 0)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(name: "CK_WorkOrderParts_BoughtIn_HasCost", table: "WorkOrderParts");
            migrationBuilder.DropIndex(name: "IX_WorkOrders_Priority_Status", table: "WorkOrders");
            migrationBuilder.Sql(@"
                DELETE FROM ""WorkOrderParts"" WHERE ""InventoryItemId"" IS NULL;
                ALTER TABLE ""WorkOrderParts"" ALTER COLUMN ""InventoryItemId"" SET NOT NULL,
                    DROP COLUMN ""SerialNumber"", DROP COLUMN ""UnitCost"";
                ALTER TABLE ""WorkOrderActivityLogs"" DROP COLUMN ""PhotoStage"", DROP COLUMN ""PhotoUrls"";
                ALTER TABLE ""WorkOrders"" DROP COLUMN ""Priority"", DROP COLUMN ""DeviceType"", DROP COLUMN ""DeviceBrand"",
                    DROP COLUMN ""AccessoriesReceived"", DROP COLUMN ""IntakePhotoUrls"";");
        }
    }
}
