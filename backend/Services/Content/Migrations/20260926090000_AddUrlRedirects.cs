using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Content.Infrastructure;

#nullable disable

namespace Content.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Bảng chuyển hướng URL (301/302/410) cho SEO shell — giữ thứ hạng Google khi chuyển từ web
    /// cũ và khi đổi slug sản phẩm/danh mục. [Migration]/[DbContext] gắn trực tiếp (không có
    /// Designer.cs) theo cùng quy ước của 20260918190000_AddFlashSalePromotionReward: qh-build.sh
    /// không có sub-command cho `dotnet ef`, model snapshot được cập nhật tay cho khớp.
    /// </summary>
    [DbContext(typeof(ContentDbContext))]
    [Migration("20260926090000_AddUrlRedirects")]
    public partial class AddUrlRedirects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UrlRedirects",
                schema: "content",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FromPath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ToPath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    StatusCode = table.Column<int>(type: "integer", nullable: false),
                    HitCount = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    LastHitAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Source = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UrlRedirects", x => x.Id);
                    table.CheckConstraint("CK_UrlRedirects_StatusCode", "\"StatusCode\" IN (301, 302, 410)");
                });

            migrationBuilder.CreateIndex(
                name: "IX_UrlRedirect_FromPath",
                schema: "content",
                table: "UrlRedirects",
                column: "FromPath",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UrlRedirect_IsActive",
                schema: "content",
                table: "UrlRedirects",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UrlRedirects",
                schema: "content");
        }
    }
}
