using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Combo: dòng giỏ/dòng đơn thuộc nhóm combo (<c>BundleId</c>, <c>BundleName</c>). Giảm giá combo
    /// nằm ở cột có sẵn <c>OrderItem.LineDiscount</c>. [Migration]/[DbContext] gắn trực tiếp, không có
    /// Designer.cs — cùng quy ước với Content <c>20260926090000_AddUrlRedirects</c>; snapshot sửa tay.
    /// </summary>
    [DbContext(typeof(SalesDbContext))]
    [Migration("20260926100000_AddCartOrderBundleLines")]
    public partial class AddCartOrderBundleLines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in new[] { "CartItem", "OrderItem" })
            {
                migrationBuilder.AddColumn<Guid>(
                    name: "BundleId",
                    schema: "public",
                    table: table,
                    type: "uuid",
                    nullable: true);

                migrationBuilder.AddColumn<string>(
                    name: "BundleName",
                    schema: "public",
                    table: table,
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: true);
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in new[] { "CartItem", "OrderItem" })
            {
                migrationBuilder.DropColumn(name: "BundleName", schema: "public", table: table);
                migrationBuilder.DropColumn(name: "BundleId", schema: "public", table: table);
            }
        }
    }
}
