using CollegeRating.DTOs;

namespace CollegeRating.Services;

public interface ICollegeSource
{
    string SourceName { get; }
    Task<IReadOnlyList<ExternalGroupDto>> GetGroupsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ExternalStudentDto>> GetStudentsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ExternalRatingDto>> GetRatingsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ExternalNominationDto>> GetNominationsAsync(CancellationToken ct = default);
}

