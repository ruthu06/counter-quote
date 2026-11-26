using CounterQuote.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CounterQuote.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Job> Jobs => Set<Job>();

    // SQLite doesn't store the time zone, so mark dates as UTC when reading.
    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.Entity<Job>().Property(j => j.CreatedDate)
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
