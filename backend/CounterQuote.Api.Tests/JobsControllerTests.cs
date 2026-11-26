using CounterQuote.Api.Controllers;
using CounterQuote.Api.Data;
using CounterQuote.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace CounterQuote.Api.Tests;

public class JobsControllerTests : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public JobsControllerTests()
    {
        _connection.Open();
        using AppDbContext db = CreateDb();
        db.Database.Migrate();
    }

    public void Dispose() => _connection.Dispose();

    private AppDbContext CreateDb() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    [Fact]
    public async Task Created_job_can_be_read_back()
    {
        using (AppDbContext db = CreateDb())
            await new JobsController(db).Create(new Job { CustomerName = "Rivera", Material = "Quartz" });

        using AppDbContext readDb = CreateDb();
        Job job = Assert.Single(await new JobsController(readDb).GetAll());
        Assert.Equal("Rivera", job.CustomerName);
        Assert.Equal("Quartz", job.Material);
    }

    [Fact]
    public async Task Saving_a_design_stores_its_title_drawing_and_total()
    {
        const string design = """{"shape":"L","length":120,"depth":24,"leftExtension":60,"material":"Quartz"}""";
        int id;
        using (AppDbContext db = CreateDb())
        {
            ActionResult<Job> created = await new JobsController(db).Create(new Job { CustomerName = "Rivera", Material = "Granite" });
            id = ((Job)((CreatedAtActionResult)created.Result!).Value!).Id;
        }

        using (AppDbContext db = CreateDb())
            await new JobsController(db).Update(id, new Job
            {
                CustomerName = "Rivera",
                Material = "Quartz",
                Title = "Kitchen countertop",
                DesignJson = design,
                QuoteTotal = 2845m,
            });

        using AppDbContext readDb = CreateDb();
        Job job = (await new JobsController(readDb).Get(id)).Value!;
        Assert.Equal("Kitchen countertop", job.Title);
        Assert.Equal(design, job.DesignJson);
        Assert.Equal(2845m, job.QuoteTotal);
        Assert.Equal("Quartz", job.Material);
    }

    [Fact]
    public async Task Deleting_a_job_removes_it_and_a_missing_job_is_not_found()
    {
        using AppDbContext db = CreateDb();
        db.Jobs.AddRange(new Job { CustomerName = "Rivera" }, new Job { CustomerName = "Chen" });
        db.SaveChanges();
        int riveraId = db.Jobs.Single(j => j.CustomerName == "Rivera").Id;

        Assert.IsType<NoContentResult>(await new JobsController(db).Delete(riveraId));
        Assert.IsType<NotFoundResult>(await new JobsController(db).Delete(riveraId));

        using AppDbContext readDb = CreateDb();
        Assert.Equal("Chen", Assert.Single(readDb.Jobs).CustomerName);
    }

    [Fact]
    public async Task Pricing_returns_the_seeded_price_list()
    {
        using AppDbContext db = CreateDb();
        List<PricingItem> items = await new PricingController(db).GetAll();

        Assert.Equal(18, items.Count);
        Assert.Equal(9, items.Count(p => p.Category == "Material"));
        PricingItem quartz = Assert.Single(items, p => p.Category == "Material" && p.Name == "Quartz Level 2");
        Assert.Equal(80m, quartz.Price);
        Assert.Equal("sqft", quartz.Unit);
    }

    [Fact]
    public async Task Updating_a_job_saves_the_changes_and_keeps_its_created_date()
    {
        using AppDbContext db = CreateDb();
        db.Jobs.Add(new Job { CustomerName = "Rivera", Material = "Quartz", CreatedDate = new DateTime(2026, 1, 2) });
        db.SaveChanges();
        int id = db.Jobs.Single().Id;

        await new JobsController(db).Update(id, new Job { CustomerName = "Rivera", Material = "Marble" });

        using AppDbContext readDb = CreateDb();
        Job job = readDb.Jobs.Single();
        Assert.Equal("Marble", job.Material);
        Assert.Equal(new DateTime(2026, 1, 2), job.CreatedDate);
    }
}
