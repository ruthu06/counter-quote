using System.ComponentModel.DataAnnotations;

namespace CounterQuote.Api.Models;

public class Job
{
    public int Id { get; set; }

    [Required]
    public string CustomerName { get; set; } = "";

    public string Material { get; set; } = "";

    public DateTime CreatedDate { get; set; }
}
