using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Repair.Infrastructure;

#nullable disable

namespace Repair.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Danh mục dịch vụ sửa chữa sửa được (<c>RepairServiceTypes</c>) thay cho enum cứng
    /// <c>ServiceType</c> (InShop=0 / OnSite=1). Seed đúng 2 dòng có Id cố định ứng với 2 giá trị
    /// enum cũ, rồi gắn <c>ServiceTypeId</c> cho mọi lịch hẹn (bắt buộc) và phiếu sửa (khi phiếu có
    /// ServiceType) theo đúng giá trị enum đang lưu — dữ liệu cũ map 1-1, không dòng nào mồ côi.
    /// Cột enum <c>ServiceType</c> được GIỮ làm cột suy ra (tại cửa hàng / tận nơi) cho truy vấn cũ.
    /// </summary>
    [DbContext(typeof(RepairDbContext))]
    [Migration("20260927090000_AddRepairServiceTypes")]
    public partial class AddRepairServiceTypes : Migration
    {
        private const string InShopId = "5e7a1c00-0000-4000-8000-000000000001";
        private const string OnSiteId = "5e7a1c00-0000-4000-8000-000000000002";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RepairServiceTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    BasePrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    EstimatedMinutes = table.Column<int>(type: "integer", nullable: false),
                    IsOnSite = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepairServiceTypes", x => x.Id);
                    table.CheckConstraint("CK_RepairServiceTypes_BasePrice_NonNegative", "\"BasePrice\" >= 0");
                    table.CheckConstraint("CK_RepairServiceTypes_EstimatedMinutes_NonNegative", "\"EstimatedMinutes\" >= 0");
                });

            migrationBuilder.CreateIndex(name: "IX_RepairServiceTypes_Code", table: "RepairServiceTypes", column: "Code", unique: true);
            migrationBuilder.CreateIndex(name: "IX_RepairServiceTypes_IsActive_SortOrder", table: "RepairServiceTypes", columns: new[] { "IsActive", "SortOrder" });

            migrationBuilder.Sql($@"
                INSERT INTO ""RepairServiceTypes"" (""Id"", ""Code"", ""Name"", ""Description"", ""BasePrice"", ""EstimatedMinutes"", ""IsOnSite"", ""SortOrder"", ""IsActive"", ""CreatedAt"", ""CreatedBy"")
                VALUES
                  ('{InShopId}', 'IN_SHOP', 'Sửa chữa tại cửa hàng', 'Mang máy tới cửa hàng để kỹ thuật viên kiểm tra và báo giá.', 0, 60, false, 10, true, now(), 'migration:AddRepairServiceTypes'),
                  ('{OnSiteId}', 'ON_SITE', 'Sửa chữa tận nơi', 'Kỹ thuật viên tới nhà, văn phòng hoặc trường học. Phí tận nơi theo cấu hình.', 0, 90, true, 20, true, now(), 'migration:AddRepairServiceTypes')
                ON CONFLICT (""Id"") DO NOTHING;");

            migrationBuilder.AddColumn<Guid>(name: "ServiceTypeId", table: "ServiceBookings", type: "uuid", nullable: true);
            migrationBuilder.Sql($@"
                UPDATE ""ServiceBookings"" SET ""ServiceTypeId"" =
                    CASE WHEN ""ServiceType"" = 1 THEN '{OnSiteId}'::uuid ELSE '{InShopId}'::uuid END;");
            migrationBuilder.AlterColumn<Guid>(
                name: "ServiceTypeId", table: "ServiceBookings", type: "uuid", nullable: false,
                oldClrType: typeof(Guid), oldType: "uuid", oldNullable: true);

            migrationBuilder.AddColumn<Guid>(name: "ServiceTypeId", table: "WorkOrders", type: "uuid", nullable: true);
            migrationBuilder.Sql($@"
                UPDATE ""WorkOrders"" SET ""ServiceTypeId"" =
                    CASE WHEN ""ServiceType"" = 1 THEN '{OnSiteId}'::uuid ELSE '{InShopId}'::uuid END
                WHERE ""ServiceType"" IS NOT NULL;");

            migrationBuilder.CreateIndex(name: "IX_ServiceBookings_ServiceTypeId", table: "ServiceBookings", column: "ServiceTypeId");
            migrationBuilder.CreateIndex(name: "IX_WorkOrders_ServiceTypeId", table: "WorkOrders", column: "ServiceTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceBookings_RepairServiceTypes_ServiceTypeId", table: "ServiceBookings",
                column: "ServiceTypeId", principalTable: "RepairServiceTypes", principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_RepairServiceTypes_ServiceTypeId", table: "WorkOrders",
                column: "ServiceTypeId", principalTable: "RepairServiceTypes", principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_ServiceBookings_RepairServiceTypes_ServiceTypeId", table: "ServiceBookings");
            migrationBuilder.DropForeignKey(name: "FK_WorkOrders_RepairServiceTypes_ServiceTypeId", table: "WorkOrders");
            migrationBuilder.DropIndex(name: "IX_ServiceBookings_ServiceTypeId", table: "ServiceBookings");
            migrationBuilder.DropIndex(name: "IX_WorkOrders_ServiceTypeId", table: "WorkOrders");
            migrationBuilder.DropColumn(name: "ServiceTypeId", table: "ServiceBookings");
            migrationBuilder.DropColumn(name: "ServiceTypeId", table: "WorkOrders");
            migrationBuilder.DropTable(name: "RepairServiceTypes");
        }
    }
}
