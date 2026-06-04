namespace CollegeRating.Models;

public class Group
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    // Заполняется при импорте/синхронизации из 1С. Для локальных записей может быть null.
    public string? ExternalId { get; set; }
    public DateTime SourceUpdatedAt { get; set; } = DateTime.MinValue; // дата изменения в 1С
    public DateTime LocalUpdatedAt { get; set; } = DateTime.UtcNow;    // дата изменения в SQLite

    public ICollection<Student> Students { get; set; } = new List<Student>();
}

