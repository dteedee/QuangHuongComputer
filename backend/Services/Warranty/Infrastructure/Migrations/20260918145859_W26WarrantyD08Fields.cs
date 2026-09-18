using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Warranty.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class W26WarrantyD08Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ExtendedDays",
                table: "ProductWarranties",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ReplacedByWarrantyId",
                table: "ProductWarranties",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "Policies",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedBy",
                table: "Claims",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CommittedTurnaroundDays",
                table: "Claims",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeviceReceivedAt",
                table: "Claims",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeviceReturnedAt",
                table: "Claims",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ResolvedBy",
                table: "Claims",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Policies_CategoryId_Provider_Active",
                table: "Policies",
                columns: new[] { "CategoryId", "Provider" },
                unique: true,
                filter: "\"IsActive\" = true");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Policies_CategoryId_Provider_Active",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "ExtendedDays",
                table: "ProductWarranties");

            migrationBuilder.DropColumn(
                name: "ReplacedByWarrantyId",
                table: "ProductWarranties");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "CommittedTurnaroundDays",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "DeviceReceivedAt",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "DeviceReturnedAt",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "ResolvedBy",
                table: "Claims");
        }
    }
}
