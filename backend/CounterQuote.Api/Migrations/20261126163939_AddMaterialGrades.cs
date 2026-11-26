using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CounterQuote.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialGrades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Name", "Price" },
                values: new object[] { "Granite Level 1", 50m });

            migrationBuilder.UpdateData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Name", "Price" },
                values: new object[] { "Quartz Level 1", 60m });

            migrationBuilder.UpdateData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Name", "Price" },
                values: new object[] { "Marble Level 1", 70m });

            migrationBuilder.InsertData(
                table: "PricingItems",
                columns: new[] { "Id", "Category", "Name", "Price", "Unit" },
                values: new object[,]
                {
                    { 13, "Material", "Granite Level 2", 70m, "sqft" },
                    { 14, "Material", "Quartz Level 2", 80m, "sqft" },
                    { 15, "Material", "Marble Level 2", 100m, "sqft" },
                    { 16, "Material", "Granite Level 3", 100m, "sqft" },
                    { 17, "Material", "Quartz Level 3", 120m, "sqft" },
                    { 18, "Material", "Marble Level 3", 160m, "sqft" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.UpdateData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Name", "Price" },
                values: new object[] { "Granite", 70m });

            migrationBuilder.UpdateData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Name", "Price" },
                values: new object[] { "Quartz", 80m });

            migrationBuilder.UpdateData(
                table: "PricingItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Name", "Price" },
                values: new object[] { "Marble", 85m });
        }
    }
}
