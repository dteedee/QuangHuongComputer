using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W2_1CatalogApiUnitNamePriceHistoryMedia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_product_medias_primary",
                schema: "public",
                table: "ProductMedias");

            migrationBuilder.AddColumn<string>(
                name: "UnitName",
                schema: "public",
                table: "Products",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Chiếc");

            migrationBuilder.CreateTable(
                name: "ProductPriceChanges",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    OldPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NewPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OldCostPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NewCostPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Source = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ActorId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: true),
                    At = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductPriceChanges", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_price_changes_product_id",
                        column: x => x.ProductId,
                        principalSchema: "public",
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductReviewHelpfulVotes",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductReviewHelpfulVotes", x => x.Id);
                    table.ForeignKey(
                        name: "fk_product_review_helpful_votes_review_id",
                        column: x => x.ReviewId,
                        principalSchema: "public",
                        principalTable: "ProductReviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_product_medias_primary",
                schema: "public",
                table: "ProductMedias",
                column: "ProductId",
                unique: true,
                filter: "\"IsPrimary\" = true");

            migrationBuilder.CreateIndex(
                name: "ix_product_price_changes_product_id_at",
                schema: "public",
                table: "ProductPriceChanges",
                columns: new[] { "ProductId", "At" });

            migrationBuilder.CreateIndex(
                name: "uq_product_review_helpful_votes_review_user",
                schema: "public",
                table: "ProductReviewHelpfulVotes",
                columns: new[] { "ReviewId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductPriceChanges",
                schema: "public");

            migrationBuilder.DropTable(
                name: "ProductReviewHelpfulVotes",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "ix_product_medias_primary",
                schema: "public",
                table: "ProductMedias");

            migrationBuilder.DropColumn(
                name: "UnitName",
                schema: "public",
                table: "Products");

            migrationBuilder.CreateIndex(
                name: "ix_product_medias_primary",
                schema: "public",
                table: "ProductMedias",
                column: "ProductId",
                filter: "\"IsPrimary\" = true");
        }
    }
}
