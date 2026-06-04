namespace CollegeRating.Models;

public class LuckyWheelSpin
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public string PrizeCode { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Value { get; set; }
    public string SpinDate { get; set; } = string.Empty; // yyyy-MM-dd
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
