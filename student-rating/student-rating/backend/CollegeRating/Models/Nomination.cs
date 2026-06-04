namespace CollegeRating.Models
{
    public class Nomination
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "motivating" или "fun"
        public decimal Weight { get; set; }
    }
}