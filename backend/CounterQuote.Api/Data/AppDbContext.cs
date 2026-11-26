using CounterQuote.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CounterQuote.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<PricingItem> PricingItems => Set<PricingItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // SQLite doesn't store the time zone, so mark dates as UTC when reading.
        modelBuilder.Entity<Job>().Property(j => j.CreatedDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        // The shop's price list. Seeded by migration so every new database starts with the same prices.
        modelBuilder.Entity<PricingItem>().HasData(
            // Materials are priced by grade (Level 1 Standard, 2 Premium, 3 Luxury), installed, per sq ft.
            // Ids 1-3 were the single material prices; they became Level 1, and Levels 2-3 were added as 13-18.
            new PricingItem { Id = 1, Category = "Material", Name = "Granite Level 1", Price = 50m, Unit = "sqft" },
            new PricingItem { Id = 2, Category = "Material", Name = "Quartz Level 1", Price = 60m, Unit = "sqft" },
            new PricingItem { Id = 3, Category = "Material", Name = "Marble Level 1", Price = 70m, Unit = "sqft" },
            new PricingItem { Id = 13, Category = "Material", Name = "Granite Level 2", Price = 70m, Unit = "sqft" },
            new PricingItem { Id = 14, Category = "Material", Name = "Quartz Level 2", Price = 80m, Unit = "sqft" },
            new PricingItem { Id = 15, Category = "Material", Name = "Marble Level 2", Price = 100m, Unit = "sqft" },
            new PricingItem { Id = 16, Category = "Material", Name = "Granite Level 3", Price = 100m, Unit = "sqft" },
            new PricingItem { Id = 17, Category = "Material", Name = "Quartz Level 3", Price = 120m, Unit = "sqft" },
            new PricingItem { Id = 18, Category = "Material", Name = "Marble Level 3", Price = 160m, Unit = "sqft" },
            new PricingItem { Id = 4, Category = "Edge", Name = "Unfinished", Price = 0m, Unit = "linearft" },
            new PricingItem { Id = 5, Category = "Edge", Name = "Eased", Price = 0m, Unit = "linearft" },
            new PricingItem { Id = 6, Category = "Edge", Name = "Beveled", Price = 10m, Unit = "linearft" },
            new PricingItem { Id = 7, Category = "Edge", Name = "Bullnose", Price = 15m, Unit = "linearft" },
            new PricingItem { Id = 8, Category = "Corner", Name = "Square", Price = 0m, Unit = "each" },
            new PricingItem { Id = 9, Category = "Corner", Name = "Rounded", Price = 60m, Unit = "each" },
            new PricingItem { Id = 10, Category = "Sink", Name = "None", Price = 0m, Unit = "each" },
            new PricingItem { Id = 11, Category = "Sink", Name = "Drop-in", Price = 100m, Unit = "each" },
            new PricingItem { Id = 12, Category = "Sink", Name = "Undermount", Price = 250m, Unit = "each" });
    }
}
