namespace CollegeRating.Models
{
    public class StudentNomination
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public Student Student { get; set; } = null!;
        public int NominationId { get; set; }
        public Nomination Nomination { get; set; } = null!;
        public DateTime AwardedAt { get; set; }
    }
}