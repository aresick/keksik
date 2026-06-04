using System.Text.Json;
using CollegeRating.DTOs;

namespace CollegeRating.Services;

// Для учебной версии 1С:Предприятие 8.3 самый простой вариант — выгрузка данных из 1С в JSON.
// Бэкенд только читает эти файлы, а все новые изменения сайта пишет в SQLite.
public class OneCJsonFileSource : ICollegeSource
{
    private readonly IConfiguration _config;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    public OneCJsonFileSource(IConfiguration config) => _config = config;
    public string SourceName => "1C_JSON_EXPORT";

    public Task<IReadOnlyList<ExternalGroupDto>> GetGroupsAsync(CancellationToken ct = default) =>
        ReadAsync<ExternalGroupDto>("OneC:GroupsFile", ct);

    public Task<IReadOnlyList<ExternalStudentDto>> GetStudentsAsync(CancellationToken ct = default) =>
        ReadAsync<ExternalStudentDto>("OneC:StudentsFile", ct);

    public Task<IReadOnlyList<ExternalRatingDto>> GetRatingsAsync(CancellationToken ct = default) =>
        ReadAsync<ExternalRatingDto>("OneC:RatingsFile", ct);

    public Task<IReadOnlyList<ExternalNominationDto>> GetNominationsAsync(CancellationToken ct = default) =>
        ReadAsync<ExternalNominationDto>("OneC:NominationsFile", ct);

    private async Task<IReadOnlyList<T>> ReadAsync<T>(string configKey, CancellationToken ct)
    {
        var path = _config[configKey];
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            return Array.Empty<T>();

        await using var stream = File.OpenRead(path);

        var data = await JsonSerializer.DeserializeAsync<List<T>>(stream, _jsonOptions, ct);
        return data ?? new List<T>();
    }
}

