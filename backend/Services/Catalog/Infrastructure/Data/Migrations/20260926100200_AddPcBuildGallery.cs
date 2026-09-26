using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// "Cấu hình mẫu" (/cau-hinh-mau) dựng trên <c>SavedPcBuilds</c>: IsFeatured, IsPublic, UseCaseTag,
    /// SortOrder. Mặc định false/null ⇒ mọi build hiện có vẫn riêng tư. [Migration]/[DbContext] gắn
    /// trực tiếp, không có Designer.cs — cùng quy ước với Content <c>20260926090000_AddUrlRedirects</c>.
    /// </summary>
    [DbContext(typeof(CatalogDbContext))]
    [Migration("20260926100200_AddPcBuildGallery")]
    public partial class AddPcBuildGallery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFeatured", schema: "public", table: "SavedPcBuilds",
                type: "boolean", nullable: false, defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublic", schema: "public", table: "SavedPcBuilds",
                type: "boolean", nullable: false, defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "UseCaseTag", schema: "public", table: "SavedPcBuilds",
                type: "character varying(30)", maxLength: 30, nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder", schema: "public", table: "SavedPcBuilds",
                type: "integer", nullable: false, defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "ix_saved_pc_builds_public_sort", schema: "public", table: "SavedPcBuilds",
                columns: new[] { "IsPublic", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_saved_pc_builds_public_sort", schema: "public", table: "SavedPcBuilds");
            foreach (var column in new[] { "SortOrder", "UseCaseTag", "IsPublic", "IsFeatured" })
                migrationBuilder.DropColumn(name: column, schema: "public", table: "SavedPcBuilds");
        }
    }
}
