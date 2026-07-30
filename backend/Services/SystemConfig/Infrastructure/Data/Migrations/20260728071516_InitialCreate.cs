using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SystemConfig.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "config");

            migrationBuilder.CreateTable(
                name: "BackofficeMenuGroups",
                schema: "config",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IconName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ColorClass = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BackofficeMenuGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Configurations",
                schema: "config",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Module = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Global"),
                    ValueType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "String"),
                    JsonValue = table.Column<string>(type: "jsonb", nullable: true),
                    IsSystem = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    LastUpdated = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Configurations", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "ReportDefinitions",
                schema: "config",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DataSourceEndpoint = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AvailableColumns = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    AvailableFilters = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    DefaultSortColumn = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DefaultSortDirection = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false, defaultValue: "desc"),
                    AllowedRoles = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[\"Admin\",\"Manager\"]'::jsonb"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BackofficeMenuItems",
                schema: "config",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IconName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Path = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AllowedRoles = table.Column<List<string>>(type: "jsonb", nullable: false, defaultValueSql: "'[\"Admin\"]'::jsonb"),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    BadgeSource = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OpenInNewTab = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BackofficeMenuItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BackofficeMenuItems_BackofficeMenuGroups_GroupId",
                        column: x => x.GroupId,
                        principalSchema: "config",
                        principalTable: "BackofficeMenuGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SavedReportPresets",
                schema: "config",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReportDefinitionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisibleColumns = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    ColumnOrder = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    FilterValues = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    SortColumn = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SortDirection = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsShared = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedReportPresets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SavedReportPresets_ReportDefinitions_ReportDefinitionId",
                        column: x => x.ReportDefinitionId,
                        principalSchema: "config",
                        principalTable: "ReportDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BackofficeMenuItems_GroupId_DisplayOrder",
                schema: "config",
                table: "BackofficeMenuItems",
                columns: new[] { "GroupId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Configurations_Module_Category",
                schema: "config",
                table: "Configurations",
                columns: new[] { "Module", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_ReportDefinitions_Code",
                schema: "config",
                table: "ReportDefinitions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedReportPresets_ReportDefinitionId_UserId",
                schema: "config",
                table: "SavedReportPresets",
                columns: new[] { "ReportDefinitionId", "UserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BackofficeMenuItems",
                schema: "config");

            migrationBuilder.DropTable(
                name: "Configurations",
                schema: "config");

            migrationBuilder.DropTable(
                name: "SavedReportPresets",
                schema: "config");

            migrationBuilder.DropTable(
                name: "BackofficeMenuGroups",
                schema: "config");

            migrationBuilder.DropTable(
                name: "ReportDefinitions",
                schema: "config");
        }
    }
}
