using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Fix: migration 20260819040105_AddOrderAttributesJson chỉ thêm cột "Attributes" cho
    /// CartItem/OrderItem mà bỏ sót bảng "Orders" (snapshot có nhưng operation không được
    /// scaffold). Mọi INSERT vào "Orders" crash: column "Attributes" does not exist.
    /// IF NOT EXISTS để idempotent trên môi trường đã/chưa có cột.
    /// </summary>
    public partial class AddOrdersAttributesColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE public.""Orders"" ADD COLUMN IF NOT EXISTS ""Attributes"" jsonb NOT NULL DEFAULT '{}'::jsonb;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Attributes",
                schema: "public",
                table: "Orders");
        }
    }
}
