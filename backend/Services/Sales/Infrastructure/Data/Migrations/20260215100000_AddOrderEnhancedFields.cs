using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderEnhancedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add enhanced fields to Orders table
            migrationBuilder.AddColumn<string>(
                name: "CustomerIp",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerUserAgent",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InternalNotes",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SourceId",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AffiliateId",
                table: "Orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscountReason",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryTrackingNumber",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryCarrier",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RetryCount",
                table: "Orders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "Orders",
                type: "text",
                nullable: false,
                defaultValue: "COD");

            migrationBuilder.AddColumn<bool>(
                name: "IsPickup",
                table: "Orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PickupStoreId",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PickupStoreName",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShippedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeliveredAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            // Add ProductSku to OrderItem
            migrationBuilder.AddColumn<string>(
                name: "ProductSku",
                table: "OrderItem",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CustomerIp", table: "Orders");
            migrationBuilder.DropColumn(name: "CustomerUserAgent", table: "Orders");
            migrationBuilder.DropColumn(name: "InternalNotes", table: "Orders");
            migrationBuilder.DropColumn(name: "SourceId", table: "Orders");
            migrationBuilder.DropColumn(name: "AffiliateId", table: "Orders");
            migrationBuilder.DropColumn(name: "DiscountReason", table: "Orders");
            migrationBuilder.DropColumn(name: "DeliveryTrackingNumber", table: "Orders");
            migrationBuilder.DropColumn(name: "DeliveryCarrier", table: "Orders");
            migrationBuilder.DropColumn(name: "RetryCount", table: "Orders");
            migrationBuilder.DropColumn(name: "FailureReason", table: "Orders");
            migrationBuilder.DropColumn(name: "PaymentMethod", table: "Orders");
            migrationBuilder.DropColumn(name: "IsPickup", table: "Orders");
            migrationBuilder.DropColumn(name: "PickupStoreId", table: "Orders");
            migrationBuilder.DropColumn(name: "PickupStoreName", table: "Orders");
            migrationBuilder.DropColumn(name: "ShippedAt", table: "Orders");
            migrationBuilder.DropColumn(name: "DeliveredAt", table: "Orders");
            migrationBuilder.DropColumn(name: "ProductSku", table: "OrderItem");
        }
    }
}
