using CounterQuote.Api.Data;
using CounterQuote.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CounterQuote.Api.Controllers;

[ApiController]
[Route("api/pricing")]
public class PricingController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<PricingItem>> GetAll() =>
        await db.PricingItems.AsNoTracking().OrderBy(p => p.Category).ThenBy(p => p.Id).ToListAsync();
}
