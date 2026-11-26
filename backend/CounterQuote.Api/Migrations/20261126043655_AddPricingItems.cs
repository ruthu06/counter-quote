using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CounterQuote.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PricingItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Price = table.Column<decimal>(type: "TEXT", nullable: false),
                    Unit = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingItems", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "PricingItems",
                columns: new[] { "Id", "Category", "Name", "Price", "Unit" },
                values: new object[,]
                {
                    { 1, "Material", "Granite", 70m, "sqft" },
                    { 2, "Material", "Quartz", 80m, "sqft" },
                    { 3, "Material", "Marble", 85m, "sqft" },
                    { 4, "Edge", "Unfinished", 0m, "linearft" },
                    { 5, "Edge", "Eased", 0m, "linearft" },
                    { 6, "Edge", "Beveled", 10m, "linearft" },
                    { 7, "Edge", "Bullnose", 15m, "linearft" },
                    { 8, "Corner", "Square", 0m, "each" },
                    { 9, "Corner", "Rounded", 60m, "each" },
                    { 10, "Sink", "None", 0m, "each" },
                    { 11, "Sink", "Drop-in", 100m, "each" },
                    { 12, "Sink", "Undermount", 250m, "each" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PricingItems");
        }
    }
}
