using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartWarehouse.API.Migrations
{
    /// <inheritdoc />
    public partial class AddZoneCapacity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Capacity",
                table: "WarehouseZones",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Capacity",
                table: "WarehouseZones");
        }
    }
}
