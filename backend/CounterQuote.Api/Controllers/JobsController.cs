using CounterQuote.Api.Data;
using CounterQuote.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CounterQuote.Api.Controllers;

[ApiController]
[Route("api/jobs")]
public class JobsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<Job>> GetAll() => await db.Jobs.AsNoTracking().OrderByDescending(j => j.Id).ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Job>> Get(int id)
    {
        Job? job = await db.Jobs.FindAsync(id);
        return job is null ? NotFound() : job;
    }

    [HttpPost]
    public async Task<ActionResult<Job>> Create(Job job)
    {
        job.Id = 0;
        job.CreatedDate = DateTime.UtcNow;
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = job.Id }, job);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Job>> Update(int id, Job changes)
    {
        Job? job = await db.Jobs.FindAsync(id);
        if (job is null)
            return NotFound();

        changes.Id = id;
        changes.CreatedDate = job.CreatedDate;
        db.Entry(job).CurrentValues.SetValues(changes);
        await db.SaveChangesAsync();
        return job;
    }
}
