namespace CollegeRating.Models;

public class ApprovalRequest
{
    public int Id { get; set; }
    public string RequestType { get; set; } = string.Empty; // points-add / points-remove / nomination-add / nomination-delete
    public string Status { get; set; } = "pending";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int? StudentId { get; set; }
    public int? NominationId { get; set; }
    public decimal? Points { get; set; }
    public string? NominationTitle { get; set; }
    public string? NominationType { get; set; }
    public decimal? NominationWeight { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}

