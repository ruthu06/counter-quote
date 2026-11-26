using System.ComponentModel.DataAnnotations;

namespace CounterQuote.Api.Models;

/// <summary>One price the quote can use, e.g. Material / Quartz / 80 / sqft.</summary>
public class PricingItem
{
    public int Id { get; set; }

    /// <summary>Material, Edge, Corner or Sink.</summary>
    [Required]
    public string Category { get; set; } = "";

    [Required]
    public string Name { get; set; } = "";

    /// <summary>Dollars per unit. 0 means included at no extra charge.</summary>
    public decimal Price { get; set; }

    /// <summary>What the price is multiplied by: sqft (area), linearft (edge length) or each.</summary>
    [Required]
    public string Unit { get; set; } = "";
}
