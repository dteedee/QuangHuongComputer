using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Repair.Infrastructure;

#nullable disable

namespace Repair.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Lịch hẹn: số lịch hẹn dễ đọc <c>LH-yyyyMM-#####</c> từ bộ sinh số chứng từ chung
    /// (<c>IDocumentNumberService</c>, loại <c>lh</c> → sequence <c>public.docnum_lh_seq</c>, cùng chỗ
    /// với 13 sequence của W1-11 để <c>nextval</c> không kèm schema tìm thấy). Lịch hẹn cũ được đánh
    /// số theo thứ tự tạo, tháng lấy theo giờ VN của ngày tạo; sequence được đẩy qua số lớn nhất.
    /// Trạng thái NoShow = 4 không cần đổi schema (cột Status là int); thêm NoShowAt và chỉ mục
    /// (PreferredDate, PreferredTimeSlot, Status) cho phép đếm sức chứa khung giờ.
    /// </summary>
    [DbContext(typeof(RepairDbContext))]
    [Migration("20260927093000_AddBookingNumberAndNoShow")]
    public partial class AddBookingNumberAndNoShow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE SEQUENCE IF NOT EXISTS public.docnum_lh_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- LH-yyyyMM-#####

                ALTER TABLE ""ServiceBookings""
                    ADD ""BookingNumber"" character varying(30) NULL,
                    ADD ""NoShowAt"" timestamp with time zone NULL;

                WITH numbered AS (
                    SELECT ""Id"", ""CreatedAt"", row_number() OVER (ORDER BY ""CreatedAt"", ""Id"") AS rn
                    FROM ""ServiceBookings"")
                UPDATE ""ServiceBookings"" b
                SET ""BookingNumber"" = 'LH-' || to_char(n.""CreatedAt"" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMM') || '-' || lpad(n.rn::text, 5, '0')
                FROM numbered n WHERE n.""Id"" = b.""Id"";

                SELECT setval('public.docnum_lh_seq', GREATEST((SELECT count(*) FROM ""ServiceBookings""), 1),
                              (SELECT count(*) FROM ""ServiceBookings"") > 0);

                ALTER TABLE ""ServiceBookings"" ALTER COLUMN ""BookingNumber"" SET NOT NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_BookingNumber",
                table: "ServiceBookings",
                column: "BookingNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_PreferredDate_PreferredTimeSlot_Status",
                table: "ServiceBookings",
                columns: new[] { "PreferredDate", "PreferredTimeSlot", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_ServiceBookings_PreferredDate_PreferredTimeSlot_Status", table: "ServiceBookings");
            migrationBuilder.DropIndex(name: "IX_ServiceBookings_BookingNumber", table: "ServiceBookings");
            migrationBuilder.DropColumn(name: "BookingNumber", table: "ServiceBookings");
            migrationBuilder.DropColumn(name: "NoShowAt", table: "ServiceBookings");
            migrationBuilder.Sql("UPDATE \"ServiceBookings\" SET \"Status\" = 2 WHERE \"Status\" = 4;"); // NoShow -> Rejected
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS public.docnum_lh_seq;");
        }
    }
}
