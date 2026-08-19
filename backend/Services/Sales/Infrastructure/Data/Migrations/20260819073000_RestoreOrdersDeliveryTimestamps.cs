using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Fix: migration 20260728073010_FixSalesSchemaAndIndexes vô tình DROP hai cột
    /// "ShippedAt"/"DeliveredAt" của bảng "Orders" (còn sót lại operations từ bản scaffold cũ,
    /// không đồng bộ với phần raw-SQL "ADD COLUMN IF NOT EXISTS" ở đầu migration đó).
    /// Order.cs (domain) + SalesDbContextModelSnapshot.cs vẫn khai báo 2 cột này → mọi INSERT
    /// vào "Orders" (checkout, guest-checkout, CheckoutOrchestrator...) crash 500:
    /// "column DeliveredAt of relation Orders does not exist".
    /// Dùng IF NOT EXISTS để an toàn idempotent trên mọi môi trường (đã áp hay chưa áp migration lỗi).
    /// </summary>
    public partial class RestoreOrdersDeliveryTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE public.""Orders"" ADD COLUMN IF NOT EXISTS ""ShippedAt"" timestamp with time zone NULL;
ALTER TABLE public.""Orders"" ADD COLUMN IF NOT EXISTS ""DeliveredAt"" timestamp with time zone NULL;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShippedAt",
                schema: "public",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveredAt",
                schema: "public",
                table: "Orders");
        }
    }
}
