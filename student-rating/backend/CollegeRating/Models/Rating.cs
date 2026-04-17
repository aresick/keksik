namespace CollegeRating.Models
{
    public class Rating
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public Student Student { get; set; } = null!;
        public decimal TotalPoints { get; set; }
        public DateTime LastUpdated { get; set; }
    }
}