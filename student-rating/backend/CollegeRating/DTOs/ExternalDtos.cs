namespace CollegeRating.DTOs;

public record ExternalGroupDto(string ExternalId, string Name, DateTime UpdatedAt);
public record ExternalStudentDto(string ExternalId, string FullName, string Email, string GroupExternalId, string RoleName, DateTime UpdatedAt);
public record ExternalRatingDto(string StudentExternalId, decimal TotalPoints, DateTime UpdatedAt);
public record ExternalNominationDto(string ExternalId, string Title, string Type, decimal Weight, DateTime UpdatedAt);

public record SyncResult(int Groups, int Students, int Ratings, int Nominations, string Source);

