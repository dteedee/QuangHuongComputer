using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Repair.Infrastructure;

#nullable disable

namespace Repair.Migrations
{
    /// <summary>
    /// W0-11: technician endpoints compared WorkOrder.TechnicianId (a
    /// Technician.Id) directly against the caller's Identity user id -> every
    /// technician action returned 403 or an empty list. Additive nullable
    /// column + filtered unique index links a Technician row to the Identity
    /// user who logs in as them.
    ///
    /// Applied to quanghuongdb_test by hand (reports/w0-11-schema.sql, incl.
    /// the seeded technician@quanghuong.com link and this file's history row)
    /// because the TEST API is not restarted by this track (D12). Dev receives
    /// it from AutoMigrate the next time the gate restarts :5000.
    /// </summary>
    [DbContext(typeof(RepairDbContext))]
    [Migration("20260918140000_AddTechnicianUserId")]
    public partial class AddTechnicianUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Technicians",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Technicians_UserId",
                table: "Technicians",
                column: "UserId",
                unique: true,
                filter: "\"UserId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Technicians_UserId",
                table: "Technicians");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Technicians");
        }
    }
}
