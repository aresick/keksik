namespace CollegeRating.Models
{
    public class ActivityEvent
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string EventType { get; set; } = string.Empty;
    }
}