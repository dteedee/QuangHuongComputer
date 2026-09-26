using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Đánh giá: phản hồi của cửa hàng (ReplyText/RepliedBy/RepliedAt) + ưu/nhược điểm (Pros/Cons).
    /// Ảnh khách dùng lại cột jsonb <c>ImageUrls</c> có sẵn. [Migration]/[DbContext] gắn trực tiếp,
    /// không có Designer.cs — cùng quy ước với Content <c>20260926090000_AddUrlRedirects</c>.
    /// </summary>
    [DbContext(typeof(CatalogDbContext))]
    [Migration("20260926100100_AddReviewRepliesAndProsCons")]
    public partial class AddReviewRepliesAndProsCons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Pros", schema: "public", table: "ProductReviews",
                type: "character varying(500)", maxLength: 500, nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cons", schema: "public", table: "ProductReviews",
                type: "character varying(500)", maxLength: 500, nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReplyText", schema: "public", table: "ProductReviews",
                type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RepliedBy", schema: "public", table: "ProductReviews",
                type: "character varying(450)", maxLength: 450, nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RepliedAt", schema: "public", table: "ProductReviews",
                type: "timestamp without time zone", nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var column in new[] { "RepliedAt", "RepliedBy", "ReplyText", "Cons", "Pros" })
                migrationBuilder.DropColumn(name: column, schema: "public", table: "ProductReviews");
        }
    }
}
