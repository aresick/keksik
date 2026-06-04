namespace CollegeRating.DTOs;

public record RatingRowDto(int Id, int Rank, string FullName, string Group, decimal Total);
public record AddPointsRequest(int StudentId, decimal Points);
public record AssignNominationRequest(int StudentId, int NominationId);

public class ApprovalRequestDto
{
    public string RequestType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? StudentId { get; set; }
    public int? NominationId { get; set; }
    public decimal? Points { get; set; }
    public string? NominationTitle { get; set; }
    public string? NominationType { get; set; }
    public decimal? NominationWeight { get; set; }
}

