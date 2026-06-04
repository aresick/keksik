namespace CollegeRating.Models;

public class Nomination
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // motivating / fun
    public decimal Weight { get; set; }

    public string? ExternalId { get; set; }
    public DateTime SourceUpdatedAt { get; set; } = DateTime.MinValue;
    public DateTime LocalUpdatedAt { get; set; } = DateTime.UtcNow;
}

