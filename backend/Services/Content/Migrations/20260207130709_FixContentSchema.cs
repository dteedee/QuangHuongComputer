using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Migrations
{
    /// <inheritdoc />
    public partial class FixContentSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Posts",
                schema: "content",
                table: "Posts");

            migrationBuilder.RenameTable(
                name: "Posts",
                schema: "content",
                newName: "posts",
                newSchema: "content");

            migrationBuilder.RenameIndex(
                name: "IX_Posts_Slug",
                schema: "content",
                table: "posts",
                newName: "IX_posts_Slug");

            migrationBuilder.AddPrimaryKey(
                name: "PK_posts",
                schema: "content",
                table: "posts",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "Banners",
                schema: "content",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    MobileImageUrl = table.Column<string>(type: "text", nullable: true),
                    LinkUrl = table.Column<string>(type: "text", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Device = table.Column<int>(type: "integer", nullable: false),
                    AltText = table.Column<string>(type: "text", nullable: true),
                    ButtonText = table.Column<string>(type: "text", nullable: true),
                    ButtonColor = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Banners", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Menus",
                schema: "content",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Location = table.Column<int>(type: "integer", nullable: false),
                    CssClass = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Menus", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Pages",
                schema: "content",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    MetaTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    MetaDescription = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MetaKeywords = table.Column<string>(type: "text", nullable: true),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UnpublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Template = table.Column<string>(type: "text", nullable: true),
                    FeaturedImageUrl = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    ShowInMenu = table.Column<bool>(type: "boolean", nullable: false),
                    MenuLabel = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MenuItem",
                schema: "content",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MenuId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: true),
                    Icon = table.Column<string>(type: "text", nullable: true),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    OpenInNewTab = table.Column<bool>(type: "boolean", nullable: false),
                    CssClass = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    PageId = table.Column<Guid>(type: "uuid", nullable: true),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenuItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MenuItem_Menus_MenuId",
                        column: x => x.MenuId,
                        principalSchema: "content",
                        principalTable: "Menus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Post_Status_PublishedAt",
                schema: "content",
                table: "posts",
                columns: new[] { "Status", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Coupon_Active_DateRange",
                schema: "content",
                table: "Coupons",
                columns: new[] { "IsActive", "ValidFrom", "ValidTo" });

            migrationBuilder.CreateIndex(
                name: "IX_Banner_DateRange",
                schema: "content",
                table: "Banners",
                columns: new[] { "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Banner_Position_Active_Order",
                schema: "content",
                table: "Banners",
                columns: new[] { "Position", "IsActive", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_MenuItem_MenuId",
                schema: "content",
                table: "MenuItem",
                column: "MenuId");

            migrationBuilder.CreateIndex(
                name: "IX_Menu_Location_Active_Order",
                schema: "content",
                table: "Menus",
                columns: new[] { "Location", "IsActive", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Menus_Code",
                schema: "content",
                table: "Menus",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Page_Parent_Order",
                schema: "content",
                table: "Pages",
                columns: new[] { "ParentId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Page_Published_Type",
                schema: "content",
                table: "Pages",
                columns: new[] { "IsPublished", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_Pages_Slug",
                schema: "content",
                table: "Pages",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Banners",
                schema: "content");

            migrationBuilder.DropTable(
                name: "MenuItem",
                schema: "content");

            migrationBuilder.DropTable(
                name: "Pages",
                schema: "content");

            migrationBuilder.DropTable(
                name: "Menus",
                schema: "content");

            migrationBuilder.DropPrimaryKey(
                name: "PK_posts",
                schema: "content",
                table: "posts");

            migrationBuilder.DropIndex(
                name: "IX_Post_Status_PublishedAt",
                schema: "content",
                table: "posts");

            migrationBuilder.DropIndex(
                name: "IX_Coupon_Active_DateRange",
                schema: "content",
                table: "Coupons");

            migrationBuilder.RenameTable(
                name: "posts",
                schema: "content",
                newName: "Posts",
                newSchema: "content");

            migrationBuilder.RenameIndex(
                name: "IX_posts_Slug",
                schema: "content",
                table: "Posts",
                newName: "IX_Posts_Slug");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Posts",
                schema: "content",
                table: "Posts",
                column: "Id");
        }
    }
}
