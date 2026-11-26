using System.ComponentModel.DataAnnotations;

namespace CounterQuote.Api.Models;

public class Job
{
    public int Id { get; set; }

    [Required]
    public string CustomerName { get; set; } = "";

    public string Material { get; set; } = "";

    public DateTime CreatedDate { get; set; }

    /// <summary>What the job is, e.g. "Kitchen countertop", to tell a customer's jobs apart. Optional.</summary>
    [MaxLength(100)]
    public string Title { get; set; } = "";

    /// <summary>
    /// The drawing (shape, sizes, material, edges, corners, sink) as JSON, written and read by the frontend.
    /// Empty until the job is first saved. Stored whole because nothing needs to query inside it.
    /// </summary>
    public string DesignJson { get; set; } = "";

    /// <summary>The estimated total when the job was last saved, so lists can show it without re-pricing.</summary>
    [Range(0, 1_000_000)]
    public decimal QuoteTotal { get; set; }
}
