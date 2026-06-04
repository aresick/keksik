using System.Globalization;
using CollegeRating.DTOs;

namespace CollegeRating.Services;

public sealed class OneCComSource : ICollegeSource
{
    private readonly IConfiguration _config;

    public OneCComSource(IConfiguration config)
    {
        _config = config;
    }

    public string SourceName => "1C_COM";

    public Task<IReadOnlyList<ExternalGroupDto>> GetGroupsAsync(CancellationToken ct = default)
    {
        dynamic connection = Connect();
        var result = new List<ExternalGroupDto>();

        dynamic query = connection.NewObject("Query");
        query.Text = """
        ВЫБРАТЬ
            УчебныеГруппы.Ссылка КАК Ссылка,
            УчебныеГруппы.Наименование КАК Наименование
        ИЗ
            Справочник.УчебныеГруппы КАК УчебныеГруппы
        ГДЕ
            НЕ УчебныеГруппы.ПометкаУдаления
        """;

        dynamic selection = query.Execute().Choose();
        var updatedAt = DateTime.UtcNow;

        while (selection.Next())
        {
            result.Add(new ExternalGroupDto(
                ExternalId: RefId(selection.Ссылка),
                Name: Convert.ToString(selection.Наименование) ?? string.Empty,
                UpdatedAt: updatedAt
            ));
        }

        return Task.FromResult<IReadOnlyList<ExternalGroupDto>>(result);
    }

    public Task<IReadOnlyList<ExternalStudentDto>> GetStudentsAsync(CancellationToken ct = default)
    {
        dynamic connection = Connect();
        var result = new List<ExternalStudentDto>();

        dynamic query = connection.NewObject("Query");
        query.Text = """
        ВЫБРАТЬ
            Студенты.Ссылка КАК Ссылка,
            Студенты.Фамилия КАК Фамилия,
            Студенты.Имя КАК Имя,
            Студенты.Отчество КАК Отчество,
            Студенты.Группа КАК Группа,
            Студенты.Логин КАК Логин
        ИЗ
            Справочник.Студенты КАК Студенты
        ГДЕ
            НЕ Студенты.ПометкаУдаления
        """;

        dynamic selection = query.Execute().Choose();
        var updatedAt = DateTime.UtcNow;

        while (selection.Next())
        {
            var surname = Convert.ToString(selection.Фамилия)?.Trim() ?? string.Empty;
            var name = Convert.ToString(selection.Имя)?.Trim() ?? string.Empty;
            var patronymic = Convert.ToString(selection.Отчество)?.Trim() ?? string.Empty;

            var fullName = $"{surname} {name} {patronymic}".Trim();
            if (string.IsNullOrWhiteSpace(fullName))
                fullName = "Студент без ФИО";

            var login = Convert.ToString(selection.Логин)?.Trim();
            var email = NormalizeLoginToEmail(login, "student.local");

            result.Add(new ExternalStudentDto(
                ExternalId: RefId(selection.Ссылка),
                FullName: fullName,
                Email: email,
                GroupExternalId: RefId(selection.Группа),
                RoleName: "Student",
                UpdatedAt: updatedAt
            ));
        }

        return Task.FromResult<IReadOnlyList<ExternalStudentDto>>(result);
    }

    public Task<IReadOnlyList<ExternalNominationDto>> GetNominationsAsync(CancellationToken ct = default)
    {
        dynamic connection = Connect();
        var result = new List<ExternalNominationDto>();

        dynamic query = connection.NewObject("Query");
        query.Text = """
        ВЫБРАТЬ
            Номинации.Ссылка КАК Ссылка,
            Номинации.Наименование КАК Наименование,
            Номинации.Тип КАК Тип,
            Номинации.ВесБаллов КАК ВесБаллов
        ИЗ
            Справочник.Номинации КАК Номинации
        ГДЕ
            НЕ Номинации.ПометкаУдаления
        """;

        dynamic selection = query.Execute().Choose();
        var updatedAt = DateTime.UtcNow;

        while (selection.Next())
        {
            var typeText = Convert.ToString(selection.Тип)?.Trim().ToLowerInvariant() ?? string.Empty;
            var type = typeText.Contains("шут") ? "fun" : "motivating";

            var weight = 1m;
            try
            {
                weight = Convert.ToDecimal(selection.ВесБаллов, CultureInfo.InvariantCulture);
            }
            catch
            {
                weight = 1m;
            }

            result.Add(new ExternalNominationDto(
                ExternalId: RefId(selection.Ссылка),
                Title: Convert.ToString(selection.Наименование) ?? string.Empty,
                Type: type,
                Weight: weight,
                UpdatedAt: updatedAt
            ));
        }

        return Task.FromResult<IReadOnlyList<ExternalNominationDto>>(result);
    }

    public Task<IReadOnlyList<ExternalRatingDto>> GetRatingsAsync(CancellationToken ct = default)
    {
        return Task.FromResult<IReadOnlyList<ExternalRatingDto>>(Array.Empty<ExternalRatingDto>());
    }

    private dynamic Connect()
    {
        var progId = _config["OneC:ComProgId"] ?? "V83.COMConnector";
        var connectionString = _config["OneC:ConnectionString"];

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Не заполнена строка подключения OneC:ConnectionString в appsettings.json.");

        var connectorType = Type.GetTypeFromProgID(progId);
        if (connectorType == null)
            throw new InvalidOperationException($"COMConnector '{progId}' не найден. Проверь установку 1С и разрядность backend.");

        dynamic connector = Activator.CreateInstance(connectorType)!;
        return connector.Connect(connectionString);
    }

    private static string RefId(dynamic reference)
    {
        if (reference == null)
            return string.Empty;

        try
        {
            return Convert.ToString(reference.UniqueIdentifier()) ?? string.Empty;
        }
        catch
        {
            try
            {
                return Convert.ToString(reference.УникальныйИдентификатор()) ?? string.Empty;
            }
            catch
            {
                return Convert.ToString(reference) ?? string.Empty;
            }
        }
    }

    private static string NormalizeLoginToEmail(string? login, string domain)
    {
        if (string.IsNullOrWhiteSpace(login))
            return $"{Guid.NewGuid():N}@{domain}";

        login = login.Trim();
        return login.Contains('@') ? login : $"{login}@{domain}";
    }
}